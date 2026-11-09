/**
 * blocks/setup.js — Инициализация интерактивных блоков после вставки
 * Зависит от: snapshotEditor (core)
 */

function parseVideoEmbedUrl(url) {
    if (!url || typeof url !== 'string') return null;
    url = url.trim();
    // YouTube: youtube.com/watch?v=, youtu.be/, youtube.com/embed/
    let m = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{6,})/);
    if (m) return 'https://www.youtube.com/embed/' + m[1];
    // RuTube: rutube.ru/video/ID/
    m = url.match(/rutube\.ru\/(?:video|play\/embed)\/([a-zA-Z0-9]+)/);
    if (m) return 'https://rutube.ru/play/embed/' + m[1];
    // Already embed-like
    if (/youtube\.com\/embed\//.test(url) || /rutube\.ru\/play\/embed\//.test(url)) return url;
    return null;
}

function setupVideoBlock(block) {
    if (!block || !block.classList.contains('content-video')) return;
    if (block.dataset.videoBound === '1') return;
    const input = block.querySelector('.video-url-input');
    const btn = block.querySelector('.video-apply-btn');
    const preview = block.querySelector('.video-preview');
    if (!input || !btn || !preview) return;
    block.dataset.videoBound = '1';

    const apply = () => {
        const embed = parseVideoEmbedUrl(input.value);
        if (!embed) {
            if (typeof showNotification === 'function') {
                showNotification('Укажите ссылку YouTube или RuTube', 'warning');
            }
            return;
        }
        preview.removeAttribute('data-empty');
        preview.innerHTML = `<iframe class="video-iframe" src="${embed}" title="Видео" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen loading="lazy"></iframe>`;
        if (typeof snapshotEditor === 'function') snapshotEditor('video-url');
    };

    btn.addEventListener('click', function(e) {
        e.preventDefault();
        apply();
    });
    input.addEventListener('keydown', function(e) {
        if (e.key === 'Enter') {
            e.preventDefault();
            apply();
        }
    });

    // Восстановить iframe, если src уже есть
    const existing = preview.querySelector('iframe.video-iframe, iframe');
    if (existing && existing.getAttribute('src')) {
        preview.removeAttribute('data-empty');
        if (!input.value) input.value = existing.getAttribute('src');
    }
}

function setupDownloadFileBlock(block) {
    if (!block || !block.classList.contains('content-download-file')) return;
    if (block.dataset.downloadBound === '1') return;
    block.dataset.downloadBound = '1';

    const urlInput = block.querySelector('.download-file-url');
    const labelInput = block.querySelector('.download-file-label-input');
    const link = block.querySelector('a.download-file-btn');
    const labelEl = block.querySelector('.download-file-label');
    if (!urlInput || !link) return;

    const sync = () => {
        const url = (urlInput.value || '').trim();
        const name = labelInput ? (labelInput.value || '').trim() : '';
        if (url) {
            link.setAttribute('href', url);
        }
        if (name && labelEl) {
            labelEl.textContent = name;
        }
    };

    urlInput.addEventListener('input', sync);
    urlInput.addEventListener('change', sync);
    if (labelInput) {
        labelInput.addEventListener('input', sync);
        labelInput.addEventListener('change', sync);
    }
    // начальная синхронизация из уже заполненных полей
    sync();
}


/**
 * Имя файла из URL (для data-export-filename / alt)
 */
function filenameFromImageSrc(src, fallback) {
    fallback = fallback || 'image.png';
    if (!src) return fallback;
    try {
        if (/^data:image\//i.test(src)) {
            const mime = (src.match(/^data:image\/([\w+]+)/i) || [])[1] || 'png';
            const ext = mime === 'jpeg' ? 'jpg' : mime.replace('+xml', '');
            return 'image.' + ext;
        }
        const path = src.split('?')[0].split('#')[0];
        const base = path.split('/').pop() || fallback;
        const clean = base.replace(/[^\w.\-а-яА-ЯёЁ]+/gi, '_') || fallback;
        if (/\.(png|jpe?g|gif|webp|svg|bmp|avif)$/i.test(clean)) return clean;
        return clean + (/\./.test(clean) ? '' : '.png');
    } catch (e) {
        return fallback;
    }
}

/**
 * Показать картинку в блоке (скрыть upload-zone UI)
 */
function revealImageInBlock(block, img, src, opts) {
    opts = opts || {};
    if (!img || !src) return;
    img.src = src;
    img.hidden = false;
    img.removeAttribute('hidden');

    const safeName = opts.filename || filenameFromImageSrc(src);
    if (opts.setExportName !== false && !/^https?:\/\//i.test(src)) {
        img.setAttribute('data-export-filename', safeName);
    } else if (opts.setExportName === true) {
        img.setAttribute('data-export-filename', safeName);
    }

    if (opts.alt != null) {
        img.alt = opts.alt;
    } else if (!img.alt || img.alt === 'Описание изображения') {
        img.alt = safeName.replace(/_/g, ' ').replace(/\.[^.]+$/, '') || 'Изображение';
    }

    // Кэш data:image в IndexedDB + data-idb-image
    if (/^data:image\//i.test(src) && window.KonstructorIDB && typeof window.KonstructorIDB.storeDataUrlImage === 'function') {
        window.KonstructorIDB.storeDataUrlImage(src, safeName).then(function (id) {
            if (id && img.isConnected) {
                img.setAttribute('data-idb-image', id);
                if (typeof window.refreshStorageIndicator === 'function') {
                    window.refreshStorageIndicator();
                }
            }
        }).catch(function () { /* ignore */ });
    }

    const zone = block.querySelector('.image-upload-zone');
    if (zone) {
        zone.removeAttribute('data-empty');
        zone.classList.add('has-image');
    }
    const uploadBtn = block.querySelector('.image-upload-btn');
    if (uploadBtn) uploadBtn.hidden = true;
    const hint = block.querySelector('.image-upload-hint');
    if (hint) hint.hidden = true;

    const settingsUrl = block.querySelector('.settings-panel .image-url');
    if (settingsUrl && /^https?:\/\//i.test(src)) {
        settingsUrl.value = src;
    }
    const settingsAlt = block.querySelector('.settings-panel .image-alt');
    if (settingsAlt && img.alt && !settingsAlt.value) {
        settingsAlt.value = img.alt;
    }
}

/**
 * Блок изображения: файл / URL / drag-drop → data URL или внешний src
 */
function setupImageBlock(block) {
    if (!block) return;
    if (!block.classList.contains('content-image') && !block.classList.contains('content-image-caption')) return;
    if (block.dataset.imageBound === '1') return;
    block.dataset.imageBound = '1';

    const img = block.querySelector('img.image-element, .image-container img, .image-caption-container img');
    const zone = block.querySelector('.image-upload-zone');
    const uploadBtn = block.querySelector('.image-upload-btn');
    const fileInput = block.querySelector('.image-block-file-input');
    const settingsFile = block.querySelector('.settings-panel .image-file-input');
    const settingsUrl = block.querySelector('.settings-panel .image-url');
    const settingsAlt = block.querySelector('.settings-panel .image-alt');
    const settingsWidth = block.querySelector('.settings-panel .image-width');

    function applyFile(file) {
        if (!file || !file.type || !file.type.startsWith('image/')) {
            if (typeof showNotification === 'function') {
                showNotification('Выберите файл изображения', 'warning');
            }
            return;
        }
        const safeName = (file.name || 'image.png').replace(/[^\w.\-а-яА-ЯёЁ]+/gi, '_');
        const reader = new FileReader();
        reader.onload = function() {
            const dataUrl = reader.result;
            if (!img) return;
            revealImageInBlock(block, img, dataUrl, {
                filename: safeName,
                setExportName: true,
                alt: safeName.replace(/_/g, ' ').replace(/\.[^.]+$/, '') || 'Изображение'
            });
            if (settingsUrl) settingsUrl.value = '';
            if (typeof showNotification === 'function') {
                showNotification('Изображение «' + safeName + '» загружено', 'success');
            }
            if (typeof snapshotEditor === 'function') snapshotEditor('image-file-upload');
        };
        reader.readAsDataURL(file);
    }

    function applyUrl(raw) {
        const url = (raw || '').trim();
        if (!url) return false;
        if (!/^https?:\/\//i.test(url) && !/^data:image\//i.test(url) && !/^blob:/i.test(url)) {
            if (typeof showNotification === 'function') {
                showNotification('Укажите полный URL (https://…) или data:image/…', 'warning');
            }
            return false;
        }
        if (!img) return false;
        const fname = filenameFromImageSrc(url);
        revealImageInBlock(block, img, url, {
            filename: fname,
            setExportName: /^data:image\//i.test(url),
            alt: (settingsAlt && settingsAlt.value) || fname.replace(/_/g, ' ').replace(/\.[^.]+$/, '') || 'Изображение'
        });
        if (settingsUrl) settingsUrl.value = /^https?:\/\//i.test(url) ? url : '';
        if (typeof showNotification === 'function') {
            showNotification(
                /^https?:\/\//i.test(url) ? 'Подставлен URL изображения' : 'Изображение из data URL',
                'success'
            );
        }
        if (typeof snapshotEditor === 'function') snapshotEditor('image-url');
        return true;
    }

    function openPicker(inputEl) {
        if (inputEl) {
            inputEl.value = '';
            inputEl.click();
        }
    }

    if (uploadBtn && fileInput) {
        uploadBtn.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            openPicker(fileInput);
        });
        fileInput.addEventListener('change', function() {
            const f = fileInput.files && fileInput.files[0];
            if (f) applyFile(f);
        });
    }

    // Клик по пустой зоне / по картинке (замена)
    if (zone) {
        zone.addEventListener('click', function(e) {
            if (e.target.closest('.image-upload-btn')) return;
            if (e.target.closest('[contenteditable="true"]')) return;
            if (zone.getAttribute('data-empty') === '1' || e.target === img) {
                openPicker(fileInput || settingsFile);
            }
        });
        zone.addEventListener('dragover', function(e) {
            e.preventDefault();
            e.stopPropagation();
            zone.classList.add('drag-over');
        });
        zone.addEventListener('dragleave', function() {
            zone.classList.remove('drag-over');
        });
        zone.addEventListener('drop', function(e) {
            e.preventDefault();
            e.stopPropagation();
            zone.classList.remove('drag-over');
            const dt = e.dataTransfer;
            if (!dt) return;
            const f = dt.files && dt.files[0];
            if (f && f.type && f.type.startsWith('image/')) {
                applyFile(f);
                return;
            }
            // URI-list / plain URL
            const uri = (dt.getData('text/uri-list') || dt.getData('text/plain') || '').trim().split('\n')[0];
            if (uri && (/^https?:\/\//i.test(uri) || /^data:image\//i.test(uri))) {
                applyUrl(uri);
            }
        });
    }

    if (settingsFile) {
        settingsFile.addEventListener('change', function() {
            const f = settingsFile.files && settingsFile.files[0];
            if (f) applyFile(f);
        });
    }

    // URL из панели настроек
    if (settingsUrl) {
        const onUrlCommit = function() {
            const v = (settingsUrl.value || '').trim();
            if (!v) return;
            applyUrl(v);
        };
        settingsUrl.addEventListener('change', onUrlCommit);
        settingsUrl.addEventListener('keydown', function(e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                onUrlCommit();
            }
        });
    }

    // Alt
    if (settingsAlt && img) {
        settingsAlt.addEventListener('input', function() {
            img.alt = settingsAlt.value || '';
            const cap = block.querySelector('.image-caption, .caption-text');
            if (cap && (!(cap.textContent || '').trim() || /описание|подпись/i.test(cap.textContent))) {
                // не трогаем подпись автоматически при каждом символе
            }
        });
        settingsAlt.addEventListener('change', function() {
            if (typeof snapshotEditor === 'function') snapshotEditor('image-alt');
        });
    }

    // Ширина
    if (settingsWidth && img) {
        settingsWidth.addEventListener('change', function() {
            const w = parseInt(settingsWidth.value, 10);
            if (w > 0) {
                img.style.maxWidth = w + 'px';
                img.style.width = '100%';
                const wrap = img.closest('.image-resize-wrap');
                if (wrap) wrap.style.width = Math.min(w, wrap.parentElement ? wrap.parentElement.clientWidth : w) + 'px';
            } else {
                img.style.maxWidth = '100%';
                img.style.width = '';
            }
            if (typeof snapshotEditor === 'function') snapshotEditor('image-width');
        });
    }

    // Если уже есть валидный src (не placeholder) — скрыть зону загрузки
    if (img) {
        const src = img.getAttribute('src') || '';
        if (src && !/^https?:\/\/via\.placeholder/i.test(src)) {
            revealImageInBlock(block, img, src, {
                filename: img.getAttribute('data-export-filename') || filenameFromImageSrc(src),
                setExportName: !!img.getAttribute('data-export-filename'),
                alt: img.alt
            });
        }
    }

    // Публичные хелперы на блоке (для импорта / paste)
    block._applyImageFile = applyFile;
    block._applyImageUrl = applyUrl;
}

// Экспорт в глобальную область (переходный период)
window.parseVideoEmbedUrl = parseVideoEmbedUrl;
window.setupVideoBlock = setupVideoBlock;
window.setupDownloadFileBlock = setupDownloadFileBlock;
window.setupImageBlock = setupImageBlock;
window.filenameFromImageSrc = filenameFromImageSrc;
window.revealImageInBlock = revealImageInBlock;
