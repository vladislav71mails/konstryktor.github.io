/**
 * core/idb-storage.js — IndexedDB для версий редактора и изображений + оценка места
 * DB: konstryktor_idb_v1
 * Stores: versions, images, meta
 *
 * API (window.KonstructorIDB):
 *   ready() → Promise
 *   getAllVersions() / putVersion / deleteVersion / clearVersions / replaceAllVersions
 *   putImage / getImage / deleteImage / listImages / clearImages
 *   estimate() / getUsageBreakdown() / formatBytes
 *   migrateVersionsFromLocalStorage()
 */
(function () {
    'use strict';

    const DB_NAME = 'konstryktor_idb_v1';
    const DB_VERSION = 1;
    const STORE_VERSIONS = 'versions';
    const STORE_IMAGES = 'images';
    const STORE_META = 'meta';
    const LEGACY_VERSIONS_KEY = 'konstructor_editor_versions_v1';

    let _db = null;
    let _openPromise = null;

    function openDb() {
        if (_db) return Promise.resolve(_db);
        if (_openPromise) return _openPromise;
        _openPromise = new Promise(function (resolve, reject) {
            if (typeof indexedDB === 'undefined') {
                reject(new Error('IndexedDB недоступен'));
                return;
            }
            const req = indexedDB.open(DB_NAME, DB_VERSION);
            req.onupgradeneeded = function (e) {
                const db = e.target.result;
                if (!db.objectStoreNames.contains(STORE_VERSIONS)) {
                    const vs = db.createObjectStore(STORE_VERSIONS, { keyPath: 'id' });
                    vs.createIndex('savedAt', 'savedAt', { unique: false });
                }
                if (!db.objectStoreNames.contains(STORE_IMAGES)) {
                    const is = db.createObjectStore(STORE_IMAGES, { keyPath: 'id' });
                    is.createIndex('createdAt', 'createdAt', { unique: false });
                }
                if (!db.objectStoreNames.contains(STORE_META)) {
                    db.createObjectStore(STORE_META, { keyPath: 'key' });
                }
            };
            req.onsuccess = function (e) {
                _db = e.target.result;
                _db.onversionchange = function () {
                    try { _db.close(); } catch (err) { /* ignore */ }
                    _db = null;
                    _openPromise = null;
                };
                resolve(_db);
            };
            req.onerror = function () {
                _openPromise = null;
                reject(req.error || new Error('IndexedDB open failed'));
            };
            req.onblocked = function () {
                console.warn('[IDB] open blocked');
            };
        });
        return _openPromise;
    }

    function txStore(storeName, mode) {
        return openDb().then(function (db) {
            const tx = db.transaction(storeName, mode || 'readonly');
            return tx.objectStore(storeName);
        });
    }

    function reqToPromise(req) {
        return new Promise(function (resolve, reject) {
            req.onsuccess = function () { resolve(req.result); };
            req.onerror = function () { reject(req.error); };
        });
    }

    function formatBytes(n) {
        n = Number(n) || 0;
        if (n < 1024) return n + ' Б';
        if (n < 1024 * 1024) return (n / 1024).toFixed(1).replace(/\.0$/, '') + ' КБ';
        if (n < 1024 * 1024 * 1024) return (n / (1024 * 1024)).toFixed(2).replace(/\.00$/, '').replace(/(\.\d)0$/, '$1') + ' МБ';
        return (n / (1024 * 1024 * 1024)).toFixed(2) + ' ГБ';
    }

    function approxStringSize(str) {
        if (!str) return 0;
        // UTF-16 ≈ 2 байта/символ; для data:URL это близко к реальному
        return String(str).length * 2;
    }

    function getAllVersions() {
        return txStore(STORE_VERSIONS, 'readonly').then(function (store) {
            return reqToPromise(store.getAll());
        }).then(function (list) {
            if (!Array.isArray(list)) return [];
            return list
                .filter(function (v) { return v && typeof v.html === 'string' && v.savedAt; })
                .sort(function (a, b) { return (b.savedAt || 0) - (a.savedAt || 0); });
        });
    }

    function putVersion(entry) {
        if (!entry || !entry.id) return Promise.reject(new Error('version id required'));
        const record = Object.assign({}, entry);
        if (record.size == null) record.size = approxStringSize(record.html);
        return txStore(STORE_VERSIONS, 'readwrite').then(function (store) {
            return reqToPromise(store.put(record));
        }).then(function () { return record; });
    }

    function deleteVersion(id) {
        return txStore(STORE_VERSIONS, 'readwrite').then(function (store) {
            return reqToPromise(store.delete(id));
        });
    }

    function clearVersions() {
        return txStore(STORE_VERSIONS, 'readwrite').then(function (store) {
            return reqToPromise(store.clear());
        });
    }

    /** Полная замена списка (после trim maxVersions) */
    function replaceAllVersions(list) {
        return openDb().then(function (db) {
            return new Promise(function (resolve, reject) {
                const tx = db.transaction(STORE_VERSIONS, 'readwrite');
                const store = tx.objectStore(STORE_VERSIONS);
                store.clear();
                (list || []).forEach(function (entry) {
                    if (!entry || !entry.id) return;
                    const record = Object.assign({}, entry);
                    if (record.size == null) record.size = approxStringSize(record.html);
                    store.put(record);
                });
                tx.oncomplete = function () { resolve(true); };
                tx.onerror = function () { reject(tx.error); };
            });
        });
    }

    function putImage(record) {
        if (!record || !record.id) return Promise.reject(new Error('image id required'));
        const rec = Object.assign({ createdAt: Date.now() }, record);
        if (rec.size == null) {
            if (rec.blob && rec.blob.size != null) rec.size = rec.blob.size;
            else if (rec.dataUrl) rec.size = approxStringSize(rec.dataUrl);
            else rec.size = 0;
        }
        return txStore(STORE_IMAGES, 'readwrite').then(function (store) {
            return reqToPromise(store.put(rec));
        }).then(function () { return rec; });
    }

    function getImage(id) {
        return txStore(STORE_IMAGES, 'readonly').then(function (store) {
            return reqToPromise(store.get(id));
        });
    }

    function deleteImage(id) {
        return txStore(STORE_IMAGES, 'readwrite').then(function (store) {
            return reqToPromise(store.delete(id));
        });
    }

    function listImages() {
        return txStore(STORE_IMAGES, 'readonly').then(function (store) {
            return reqToPromise(store.getAll());
        }).then(function (list) {
            return Array.isArray(list) ? list : [];
        });
    }

    function clearImages() {
        return txStore(STORE_IMAGES, 'readwrite').then(function (store) {
            return reqToPromise(store.clear());
        });
    }

    function estimate() {
        if (navigator.storage && typeof navigator.storage.estimate === 'function') {
            return navigator.storage.estimate().then(function (est) {
                return {
                    usage: est.usage || 0,
                    quota: est.quota || 0,
                    usageDetails: est.usageDetails || null
                };
            }).catch(function () {
                return { usage: 0, quota: 0, usageDetails: null };
            });
        }
        return Promise.resolve({ usage: 0, quota: 0, usageDetails: null });
    }

    function measureLocalStorage() {
        var total = 0;
        var keys = {};
        try {
            for (var i = 0; i < localStorage.length; i++) {
                var k = localStorage.key(i);
                if (!k) continue;
                var v = localStorage.getItem(k) || '';
                var sz = approxStringSize(k) + approxStringSize(v);
                total += sz;
                if (/konstructor/i.test(k)) {
                    keys[k] = sz;
                }
            }
        } catch (e) { /* ignore */ }
        return { total: total, keys: keys };
    }

    function getUsageBreakdown() {
        return Promise.all([
            estimate(),
            getAllVersions().catch(function () { return []; }),
            listImages().catch(function () { return []; })
        ]).then(function (results) {
            var est = results[0];
            var versions = results[1];
            var images = results[2];
            var versionsBytes = 0;
            versions.forEach(function (v) {
                versionsBytes += (v.size != null ? v.size : approxStringSize(v.html));
            });
            var imagesBytes = 0;
            images.forEach(function (img) {
                imagesBytes += (img.size != null ? img.size : 0);
            });
            var ls = measureLocalStorage();
            return {
                quota: est.quota || 0,
                usage: est.usage || 0,
                versionsBytes: versionsBytes,
                versionsCount: versions.length,
                imagesBytes: imagesBytes,
                imagesCount: images.length,
                localStorageBytes: ls.total,
                localStorageKeys: ls.keys,
                formatBytes: formatBytes
            };
        });
    }

    /**
     * Однократная миграция версий из localStorage → IndexedDB
     */
    function migrateVersionsFromLocalStorage() {
        return openDb().then(function () {
            var raw = null;
            try { raw = localStorage.getItem(LEGACY_VERSIONS_KEY); } catch (e) { return { migrated: 0 }; }
            if (!raw) return { migrated: 0 };
            var data;
            try { data = JSON.parse(raw); } catch (e) { return { migrated: 0 }; }
            if (!Array.isArray(data) || !data.length) {
                try { localStorage.removeItem(LEGACY_VERSIONS_KEY); } catch (e2) { /* ignore */ }
                return { migrated: 0 };
            }
            return getAllVersions().then(function (existing) {
                if (existing.length > 0) {
                    // уже есть в IDB — просто убираем legacy, чтобы не дублировать
                    try { localStorage.removeItem(LEGACY_VERSIONS_KEY); } catch (e3) { /* ignore */ }
                    return { migrated: 0, skipped: true };
                }
                var list = data.filter(function (v) {
                    return v && typeof v.html === 'string' && v.savedAt;
                }).map(function (v) {
                    return Object.assign({}, v, {
                        size: v.size != null ? v.size : approxStringSize(v.html)
                    });
                });
                return replaceAllVersions(list).then(function () {
                    try { localStorage.removeItem(LEGACY_VERSIONS_KEY); } catch (e4) { /* ignore */ }
                    return { migrated: list.length };
                });
            });
        }).catch(function (err) {
            console.warn('[IDB] migrate versions failed', err);
            return { migrated: 0, error: String(err && err.message || err) };
        });
    }

    /**
     * Сохранить dataURL изображения в IDB, вернуть id
     */
    function storeDataUrlImage(dataUrl, filename) {
        if (!dataUrl || !/^data:image\//i.test(dataUrl)) {
            return Promise.resolve(null);
        }
        var id = 'img_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 9);
        var mime = 'image/png';
        var m = dataUrl.match(/^data:(image\/[\w+.-]+);/i);
        if (m) mime = m[1];
        var size = approxStringSize(dataUrl);
        var rec = {
            id: id,
            dataUrl: dataUrl,
            filename: filename || 'image.png',
            mime: mime,
            createdAt: Date.now(),
            size: size
        };
        return putImage(rec).then(function () { return id; }).catch(function (err) {
            console.warn('[IDB] store image failed', err);
            return null;
        });
    }

    function ready() {
        return openDb().then(function () {
            return migrateVersionsFromLocalStorage();
        }).then(function (mig) {
            if (mig && mig.migrated > 0) {
                console.info('[IDB] migrated versions from localStorage:', mig.migrated);
            }
            return true;
        }).catch(function (err) {
            console.warn('[IDB] ready failed', err);
            return false;
        });
    }

    window.KonstructorIDB = {
        ready: ready,
        open: openDb,
        getAllVersions: getAllVersions,
        putVersion: putVersion,
        deleteVersion: deleteVersion,
        clearVersions: clearVersions,
        replaceAllVersions: replaceAllVersions,
        putImage: putImage,
        getImage: getImage,
        deleteImage: deleteImage,
        listImages: listImages,
        clearImages: clearImages,
        storeDataUrlImage: storeDataUrlImage,
        estimate: estimate,
        getUsageBreakdown: getUsageBreakdown,
        formatBytes: formatBytes,
        approxStringSize: approxStringSize,
        migrateVersionsFromLocalStorage: migrateVersionsFromLocalStorage
    };
})();
