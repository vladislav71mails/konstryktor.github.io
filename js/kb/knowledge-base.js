/**
 * knowledge-base.js — Локальная база знаний Konstryktor
 * Хранение: localStorage konstructor_kb_v1
 *
 * Режимы:
 *  - page (kb.html): полноценный просмотр/управление
 *  - editor (index.html): кнопка «База знаний» → kb.html, «В БЗ» → компактная модалка публикации
 */
(function () {
    'use strict';

    const STORAGE_KEY = 'konstructor_kb_v1';
    const CURRENT_ARTICLE_KEY = 'konstructor_kb_current_article';
    const OPEN_ARTICLE_KEY = 'konstructor_kb_open_article';

    var isPage = !!(document.body && document.body.classList.contains('kb-page'))
        || /kb\.html/i.test(location.pathname || '');

    function uid(prefix) {
        return (prefix || 'id') + '_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8);
    }

    function now() {
        return Date.now();
    }

    function notify(msg, type) {
        if (typeof showNotification === 'function') {
            showNotification(msg, type || 'info');
            return;
        }
        // minimal toast on kb page
        var host = document.getElementById('kb-toast-host');
        if (!host) {
            host = document.createElement('div');
            host.id = 'kb-toast-host';
            host.className = 'kb-toast-host';
            document.body.appendChild(host);
        }
        var t = document.createElement('div');
        t.className = 'kb-toast kb-toast-' + (type || 'info');
        t.textContent = msg;
        host.appendChild(t);
        setTimeout(function () {
            t.classList.add('out');
            setTimeout(function () { t.remove(); }, 250);
        }, 2800);
    }

    function defaultStore() {
        var kbId = uid('kb');
        return {
            version: 1,
            activeKbId: kbId,
            knowledgeBases: [{
                id: kbId,
                name: 'Моя база знаний',
                description: '',
                createdAt: now(),
                updatedAt: now(),
                tree: [],
                articles: {}
            }]
        };
    }

    function loadStore() {
        try {
            var raw = localStorage.getItem(STORAGE_KEY);
            if (!raw) return defaultStore();
            var data = JSON.parse(raw);
            if (!data || !Array.isArray(data.knowledgeBases)) return defaultStore();
            if (!data.activeKbId && data.knowledgeBases.length) {
                data.activeKbId = data.knowledgeBases[0].id;
            }
            return data;
        } catch (e) {
            return defaultStore();
        }
    }

    function saveStore(store) {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
            return true;
        } catch (e) {
            notify('Не удалось сохранить базу знаний (переполнен localStorage?)', 'warning');
            return false;
        }
    }

    function getActiveKb(store) {
        store = store || loadStore();
        return store.knowledgeBases.find(function (k) { return k.id === store.activeKbId; })
            || store.knowledgeBases[0]
            || null;
    }

    function findNode(nodes, id, parent) {
        for (var i = 0; i < nodes.length; i++) {
            if (nodes[i].id === id) return { node: nodes[i], parent: parent || null, index: i, siblings: nodes };
            if (nodes[i].children && nodes[i].children.length) {
                var found = findNode(nodes[i].children, id, nodes[i]);
                if (found) return found;
            }
        }
        return null;
    }

    function stripHtml(html) {
        var d = document.createElement('div');
        d.innerHTML = html || '';
        return (d.textContent || d.innerText || '').replace(/\s+/g, ' ').trim();
    }

    function escapeHtml(s) {
        return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }

    var API = {
        getStore: loadStore,
        getActiveKb: getActiveKb,

        listKnowledgeBases: function () {
            return loadStore().knowledgeBases.map(function (k) {
                return {
                    id: k.id,
                    name: k.name,
                    description: k.description || '',
                    articleCount: Object.keys(k.articles || {}).length,
                    updatedAt: k.updatedAt
                };
            });
        },

        createKnowledgeBase: function (name, description) {
            var store = loadStore();
            var kb = {
                id: uid('kb'),
                name: (name || 'Новая база знаний').trim(),
                description: (description || '').trim(),
                createdAt: now(),
                updatedAt: now(),
                tree: [],
                articles: {}
            };
            store.knowledgeBases.push(kb);
            store.activeKbId = kb.id;
            saveStore(store);
            return kb;
        },

        renameKnowledgeBase: function (kbId, name) {
            var store = loadStore();
            var kb = store.knowledgeBases.find(function (k) { return k.id === kbId; });
            if (!kb) return false;
            kb.name = (name || kb.name).trim();
            kb.updatedAt = now();
            saveStore(store);
            return true;
        },

        deleteKnowledgeBase: function (kbId) {
            var store = loadStore();
            if (store.knowledgeBases.length <= 1) {
                notify('Нельзя удалить единственную базу знаний', 'warning');
                return false;
            }
            store.knowledgeBases = store.knowledgeBases.filter(function (k) { return k.id !== kbId; });
            if (store.activeKbId === kbId) store.activeKbId = store.knowledgeBases[0].id;
            saveStore(store);
            return true;
        },

        setActiveKb: function (kbId) {
            var store = loadStore();
            if (!store.knowledgeBases.some(function (k) { return k.id === kbId; })) return false;
            store.activeKbId = kbId;
            saveStore(store);
            return true;
        },

        createFolder: function (title, parentFolderId) {
            var store = loadStore();
            var kb = getActiveKb(store);
            if (!kb) return null;
            var folder = {
                id: uid('fld'),
                type: 'folder',
                title: (title || 'Новая папка').trim(),
                children: [],
                expanded: true
            };
            if (parentFolderId) {
                var found = findNode(kb.tree, parentFolderId);
                if (found && found.node.type === 'folder') {
                    found.node.children = found.node.children || [];
                    found.node.children.push(folder);
                    found.node.expanded = true;
                } else {
                    kb.tree.push(folder);
                }
            } else {
                kb.tree.push(folder);
            }
            kb.updatedAt = now();
            saveStore(store);
            return folder;
        },

        renameNode: function (nodeId, title) {
            var store = loadStore();
            var kb = getActiveKb(store);
            if (!kb) return false;
            var found = findNode(kb.tree, nodeId);
            if (!found) return false;
            found.node.title = (title || found.node.title).trim();
            if (found.node.type === 'article' && found.node.articleId && kb.articles[found.node.articleId]) {
                kb.articles[found.node.articleId].title = found.node.title;
                kb.articles[found.node.articleId].updatedAt = now();
            }
            kb.updatedAt = now();
            saveStore(store);
            return true;
        },

        deleteNode: function (nodeId) {
            var store = loadStore();
            var kb = getActiveKb(store);
            if (!kb) return false;
            var found = findNode(kb.tree, nodeId);
            if (!found) return false;

            function removeArticles(node) {
                if (node.type === 'article' && node.articleId) delete kb.articles[node.articleId];
                if (node.children) node.children.forEach(removeArticles);
            }
            removeArticles(found.node);
            found.siblings.splice(found.index, 1);
            kb.updatedAt = now();
            saveStore(store);
            return true;
        },

        toggleFolder: function (folderId) {
            var store = loadStore();
            var kb = getActiveKb(store);
            if (!kb) return false;
            var found = findNode(kb.tree, folderId);
            if (!found || found.node.type !== 'folder') return false;
            found.node.expanded = !found.node.expanded;
            saveStore(store);
            return found.node.expanded;
        },

        saveArticle: function (opts) {
            opts = opts || {};
            var store = loadStore();
            var kb = getActiveKb(store);
            if (!kb) return null;

            var title = (opts.title || 'Без названия').trim();
            var html = opts.html || '';
            var articleId = opts.articleId;
            var article;

            if (articleId && kb.articles[articleId]) {
                article = kb.articles[articleId];
                // сохранить предыдущую версию в историю (до 20)
                if (article.html !== html || article.title !== title) {
                    if (!Array.isArray(article.history)) article.history = [];
                    article.history.unshift({
                        id: uid('rev'),
                        title: article.title,
                        html: article.html || '',
                        savedAt: article.updatedAt || now()
                    });
                    if (article.history.length > 20) article.history.length = 20;
                }
                article.title = title;
                article.html = html;
                article.updatedAt = now();
                if (typeof opts.favorite === 'boolean') article.favorite = opts.favorite;

                // найти узел, обновить title; при folderId — перенести в другую папку/корень
                var extracted = null;
                (function extract(nodes) {
                    for (var i = 0; i < nodes.length; i++) {
                        if (nodes[i].type === 'article' && nodes[i].articleId === articleId) {
                            extracted = nodes[i];
                            extracted.title = title;
                            nodes.splice(i, 1);
                            return true;
                        }
                        if (nodes[i].children && extract(nodes[i].children)) return true;
                    }
                    return false;
                })(kb.tree);

                if (!extracted) {
                    extracted = {
                        id: uid('node'),
                        type: 'article',
                        title: title,
                        articleId: articleId
                    };
                } else {
                    extracted.title = title;
                }

                var targetFolderId = opts.folderId !== undefined ? opts.folderId : null;
                if (targetFolderId) {
                    var f = findNode(kb.tree, targetFolderId);
                    if (f && f.node.type === 'folder') {
                        f.node.children = f.node.children || [];
                        f.node.children.push(extracted);
                        f.node.expanded = true;
                    } else {
                        kb.tree.push(extracted);
                    }
                } else {
                    kb.tree.push(extracted);
                }
            } else {
                articleId = uid('art');
                article = {
                    id: articleId,
                    title: title,
                    html: html,
                    favorite: !!opts.favorite,
                    createdAt: now(),
                    updatedAt: now(),
                    tags: opts.tags || [],
                    history: []
                };
                kb.articles[articleId] = article;
                var treeNode = {
                    id: uid('node'),
                    type: 'article',
                    title: title,
                    articleId: articleId
                };
                if (opts.folderId) {
                    var f2 = findNode(kb.tree, opts.folderId);
                    if (f2 && f2.node.type === 'folder') {
                        f2.node.children = f2.node.children || [];
                        f2.node.children.push(treeNode);
                        f2.node.expanded = true;
                    } else {
                        kb.tree.push(treeNode);
                    }
                } else {
                    kb.tree.push(treeNode);
                }
            }

            kb.updatedAt = now();
            saveStore(store);
            return article;
        },

        /** Текущая папка статьи (id папки или '' для корня) */
        getArticleFolderId: function (articleId) {
            var kb = getActiveKb();
            if (!kb) return '';
            var found = '';
            (function walk(nodes, parentId) {
                for (var i = 0; i < nodes.length; i++) {
                    if (nodes[i].type === 'article' && nodes[i].articleId === articleId) {
                        found = parentId || '';
                        return true;
                    }
                    if (nodes[i].children && walk(nodes[i].children, nodes[i].id)) return true;
                }
                return false;
            })(kb.tree, '');
            return found;
        },

        /** Очистить активную БЗ (дерево + статьи) */
        clearActiveKb: function () {
            var store = loadStore();
            var kb = getActiveKb(store);
            if (!kb) return false;
            kb.tree = [];
            kb.articles = {};
            kb.updatedAt = now();
            saveStore(store);
            return true;
        },

        getArticle: function (articleId) {
            var kb = getActiveKb();
            return kb && kb.articles ? (kb.articles[articleId] || null) : null;
        },

        /** Список ревизий статьи (новые сверху) */
        getArticleHistory: function (articleId) {
            var article = this.getArticle(articleId);
            if (!article || !Array.isArray(article.history)) return [];
            return article.history.slice();
        },

        /**
         * Восстановить ревизию: текущее содержимое уходит в историю,
         * выбранная ревизия становится текущей.
         */
        restoreArticleVersion: function (articleId, revisionId) {
            var store = loadStore();
            var kb = getActiveKb(store);
            if (!kb || !kb.articles[articleId]) return null;
            var article = kb.articles[articleId];
            if (!Array.isArray(article.history)) return null;
            var idx = -1;
            for (var i = 0; i < article.history.length; i++) {
                if (article.history[i].id === revisionId) { idx = i; break; }
            }
            if (idx < 0) return null;
            var rev = article.history[idx];
            article.history.unshift({
                id: uid('rev'),
                title: article.title,
                html: article.html || '',
                savedAt: article.updatedAt || now()
            });
            article.history.splice(idx + 1, 1);
            if (article.history.length > 20) article.history.length = 20;
            article.title = rev.title || article.title;
            article.html = rev.html || '';
            article.updatedAt = now();
            // обновить title в дереве
            (function walk(nodes) {
                for (var j = 0; j < nodes.length; j++) {
                    if (nodes[j].type === 'article' && nodes[j].articleId === articleId) {
                        nodes[j].title = article.title;
                        return true;
                    }
                    if (nodes[j].children && walk(nodes[j].children)) return true;
                }
                return false;
            })(kb.tree);
            kb.updatedAt = now();
            saveStore(store);
            return article;
        },

        toggleFavorite: function (articleId) {
            var store = loadStore();
            var kb = getActiveKb(store);
            if (!kb || !kb.articles[articleId]) return false;
            kb.articles[articleId].favorite = !kb.articles[articleId].favorite;
            kb.articles[articleId].updatedAt = now();
            kb.updatedAt = now();
            saveStore(store);
            return kb.articles[articleId].favorite;
        },

        search: function (query) {
            query = (query || '').trim().toLowerCase();
            var kb = getActiveKb();
            if (!kb) return [];
            var results = [];
            Object.keys(kb.articles).forEach(function (id) {
                var a = kb.articles[id];
                var title = (a.title || '').toLowerCase();
                var text = stripHtml(a.html).toLowerCase();
                var score = 0;
                if (!query) {
                    score = a.favorite ? 2 : 1;
                } else {
                    if (title.indexOf(query) !== -1) score += 10;
                    if (text.indexOf(query) !== -1) score += 3;
                    if (a.favorite) score += 1;
                }
                if (score > 0 || !query) {
                    var snippet = '';
                    if (query && text.indexOf(query) !== -1) {
                        var idx = text.indexOf(query);
                        snippet = text.substring(Math.max(0, idx - 40), Math.min(text.length, idx + query.length + 60));
                    } else {
                        snippet = text.substring(0, 140);
                    }
                    results.push({
                        id: a.id,
                        title: a.title,
                        favorite: !!a.favorite,
                        updatedAt: a.updatedAt,
                        snippet: snippet,
                        score: score
                    });
                }
            });
            results.sort(function (a, b) {
                if (b.score !== a.score) return b.score - a.score;
                return (b.updatedAt || 0) - (a.updatedAt || 0);
            });
            return results;
        },

        getFavorites: function () {
            var kb = getActiveKb();
            if (!kb) return [];
            return Object.keys(kb.articles)
                .map(function (id) { return kb.articles[id]; })
                .filter(function (a) { return a.favorite; })
                .sort(function (a, b) { return (b.updatedAt || 0) - (a.updatedAt || 0); });
        },

        exportKb: function (kbId) {
            var store = loadStore();
            var kb = store.knowledgeBases.find(function (k) { return k.id === (kbId || store.activeKbId); });
            if (!kb) return null;
            return JSON.stringify({
                format: 'konstryktor-kb',
                version: 1,
                exportedAt: new Date().toISOString(),
                knowledgeBase: kb
            }, null, 2);
        },

        importKb: function (jsonText) {
            var data;
            try {
                data = JSON.parse(jsonText);
            } catch (e) {
                notify('Некорректный JSON', 'error');
                return false;
            }
            var incoming = data.knowledgeBase || data;
            if (!incoming || !incoming.articles) {
                notify('Файл не похож на базу знаний Konstryktor', 'error');
                return false;
            }
            var store = loadStore();
            var newKb = {
                id: uid('kb'),
                name: incoming.name || 'Импортированная БЗ',
                description: incoming.description || '',
                createdAt: now(),
                updatedAt: now(),
                tree: JSON.parse(JSON.stringify(incoming.tree || [])),
                articles: JSON.parse(JSON.stringify(incoming.articles || {}))
            };
            var idMap = {};
            Object.keys(newKb.articles).forEach(function (oldId) {
                var n = uid('art');
                idMap[oldId] = n;
                newKb.articles[n] = newKb.articles[oldId];
                newKb.articles[n].id = n;
                delete newKb.articles[oldId];
            });
            (function remap(nodes) {
                nodes.forEach(function (n) {
                    n.id = uid(n.type === 'folder' ? 'fld' : 'node');
                    if (n.articleId && idMap[n.articleId]) n.articleId = idMap[n.articleId];
                    if (n.children) remap(n.children);
                });
            })(newKb.tree);
            store.knowledgeBases.push(newKb);
            store.activeKbId = newKb.id;
            saveStore(store);
            notify('База знаний импортирована', 'success');
            return true;
        },

        getCurrentArticleId: function () {
            try { return sessionStorage.getItem(CURRENT_ARTICLE_KEY) || null; } catch (e) { return null; }
        },
        setCurrentArticleId: function (id) {
            try {
                if (id) sessionStorage.setItem(CURRENT_ARTICLE_KEY, id);
                else sessionStorage.removeItem(CURRENT_ARTICLE_KEY);
            } catch (e) { /* ignore */ }
        },

        /** Request editor to open article (via session flag + navigation) */
        requestOpenInEditor: function (articleId) {
            try {
                sessionStorage.setItem(OPEN_ARTICLE_KEY, articleId || '');
                sessionStorage.setItem(CURRENT_ARTICLE_KEY, articleId || '');
            } catch (e) { /* ignore */ }
            location.href = 'index.html';
        }
    };

    // ——— shared DOM helpers ———
    function el(id) { return document.getElementById(id); }

    var selectedNodeId = null;
    var viewMode = 'tree';
    var activeArticleId = null;

    function populateFolderSelect(select) {
        if (!select) return;
        var kb = getActiveKb();
        select.innerHTML = '<option value="">— Корень —</option>';
        if (!kb) return;
        function walk(nodes, depth) {
            nodes.forEach(function (n) {
                if (n.type === 'folder') {
                    var opt = document.createElement('option');
                    opt.value = n.id;
                    opt.textContent = (depth ? '—'.repeat(depth) + ' ' : '') + n.title;
                    select.appendChild(opt);
                    if (n.children) walk(n.children, depth + 1);
                }
            });
        }
        walk(kb.tree, 0);
    }

    function guessTitleFromEditor() {
        var editor = document.getElementById('editor');
        if (!editor) return 'Новая статья';
        var h = editor.querySelector('h1, h2, .content-heading-h1, .content-heading-h2');
        if (h) {
            var t = (h.textContent || '').trim();
            if (t && t.length < 120) return t;
        }
        var text = (editor.textContent || '').trim().split('\n')[0];
        return (text || 'Новая статья').substring(0, 80);
    }

    // ——— PAGE UI (kb.html) ———
    function renderPageUi() {
        renderKbSelector();
        renderTree();
        renderSearchResults();
        renderFavorites();
        updateSidePanels();
        // restore article from URL hash
        var hash = (location.hash || '').replace(/^#/, '');
        if (hash && hash.indexOf('art_') === 0) {
            showArticle(hash);
        } else if (activeArticleId) {
            showArticle(activeArticleId);
        }
    }

    function renderKbSelector() {
        var select = el('kb-active-select');
        if (!select) return;
        var store = loadStore();
        select.innerHTML = '';
        store.knowledgeBases.forEach(function (k) {
            var opt = document.createElement('option');
            opt.value = k.id;
            opt.textContent = k.name + ' (' + Object.keys(k.articles || {}).length + ')';
            if (k.id === store.activeKbId) opt.selected = true;
            select.appendChild(opt);
        });
        var kb = getActiveKb(store);
    }

    function renderTree() {
        var container = el('kb-tree');
        if (!container) return;
        var kb = getActiveKb();
        container.innerHTML = '';
        if (!kb || !kb.tree.length) {
            container.innerHTML = '<div class="kb-empty">Дерево пусто. Опубликуйте статью из редактора («В БЗ») или создайте папку.</div>';
            return;
        }
        container.appendChild(buildTreeDom(kb.tree, 0));
    }

    function buildTreeDom(nodes, depth) {
        var ul = document.createElement('ul');
        ul.className = 'kb-tree-list';
        nodes.forEach(function (node) {
            var li = document.createElement('li');
            var isActive = (node.type === 'article' && node.articleId === activeArticleId)
                || selectedNodeId === node.id;
            li.className = 'kb-tree-item kb-tree-' + node.type + (isActive ? ' selected' : '');
            li.dataset.nodeId = node.id;

            var row = document.createElement('div');
            row.className = 'kb-tree-row';
            row.style.paddingLeft = (8 + depth * 14) + 'px';

            if (node.type === 'folder') {
                var twisty = document.createElement('button');
                twisty.type = 'button';
                twisty.className = 'kb-twisty' + (node.expanded ? ' open' : '');
                twisty.setAttribute('aria-label', 'Развернуть');
                twisty.innerHTML = '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>';
                twisty.addEventListener('click', function (e) {
                    e.stopPropagation();
                    API.toggleFolder(node.id);
                    renderTree();
                });
                row.appendChild(twisty);
                var icon = document.createElement('span');
                icon.className = 'kb-icon';
                icon.textContent = node.expanded ? '📂' : '📁';
                row.appendChild(icon);
            } else {
                var spacer = document.createElement('span');
                spacer.className = 'kb-twisty-spacer';
                row.appendChild(spacer);
                var iconA = document.createElement('span');
                iconA.className = 'kb-icon';
                iconA.textContent = '📄';
                row.appendChild(iconA);
            }

            var label = document.createElement('span');
            label.className = 'kb-tree-label';
            label.textContent = node.title || (node.type === 'folder' ? 'Папка' : 'Статья');
            row.appendChild(label);

            if (node.type === 'article' && node.articleId) {
                var art = API.getArticle(node.articleId);
                if (art && art.favorite) {
                    var star = document.createElement('span');
                    star.className = 'kb-fav-star';
                    star.title = 'Избранное';
                    star.textContent = '★';
                    row.appendChild(star);
                }
            }

            row.addEventListener('click', function () {
                selectedNodeId = node.id;
                if (node.type === 'article' && node.articleId) {
                    showArticle(node.articleId);
                } else if (node.type === 'folder') {
                    API.toggleFolder(node.id);
                    renderTree();
                } else {
                    renderTree();
                }
            });

            li.appendChild(row);
            if (node.type === 'folder' && node.expanded && node.children && node.children.length) {
                li.appendChild(buildTreeDom(node.children, depth + 1));
            }
            ul.appendChild(li);
        });
        return ul;
    }

    function showArticle(articleId) {
        var article = API.getArticle(articleId);
        var empty = el('kb-article-empty');
        var view = el('kb-article-view');
        if (!article) {
            if (empty) empty.hidden = false;
            if (view) view.hidden = true;
            return;
        }
        activeArticleId = articleId;
        try { history.replaceState(null, '', '#' + articleId); } catch (e) { /* ignore */ }

        if (empty) empty.hidden = true;
        if (view) view.hidden = false;

        var titleEl = el('kb-article-title');
        var metaEl = el('kb-article-meta');
        var bodyEl = el('kb-article-body');
        var favBtn = el('kb-article-fav');

        if (titleEl) titleEl.textContent = article.title;
        if (metaEl) {
            var d = article.updatedAt ? new Date(article.updatedAt).toLocaleString('ru-RU') : '';
            metaEl.textContent = (d ? 'Обновлено: ' + d : '') + (article.favorite ? ' · ★ В избранном' : '');
        }
        if (bodyEl) {
            bodyEl.innerHTML = article.html || '<p class="kb-muted">Пустая статья</p>';
            if (document.body.classList.contains('dark-theme')) {
                adaptArticleBodyForDark(bodyEl);
            }
            highlightCodeBlocks(bodyEl);
        }
        if (favBtn) {
            favBtn.classList.toggle('active', !!article.favorite);
            favBtn.dataset.articleId = articleId;
        }
        ['kb-article-edit', 'kb-article-rename', 'kb-article-delete', 'kb-article-history', 'kb-article-print'].forEach(function (id) {
            var b = el(id);
            if (b) b.dataset.articleId = articleId;
        });
        renderTree();
    }

    /**
     * Подправить inline-стили статьи под тёмную тему:
     * почти чёрный текст → светлый; очень светлый фон → приглушённый.
     * (Вызывается из showArticle; без этой функции падает избранное/переименование после открытия.)
     */
    function adaptArticleBodyForDark(root) {
        if (!root) return;
        var nodes = root.querySelectorAll('[style]');
        nodes.forEach(function (el) {
            var style = el.getAttribute('style') || '';
            if (!style) return;
            var colorMatch = style.match(/(?:^|;)\s*color\s*:\s*([^;]+)/i);
            if (colorMatch) {
                var c = colorMatch[1].trim().toLowerCase();
                if (isNearBlack(c)) el.style.color = '#e8e8e8';
            }
            var bgMatch = style.match(/(?:^|;)\s*background(?:-color)?\s*:\s*([^;]+)/i);
            if (bgMatch) {
                var bg = bgMatch[1].trim().toLowerCase();
                if (isNearWhite(bg)) el.style.backgroundColor = '#2a2a2a';
            }
        });
    }

    function isNearBlack(c) {
        if (!c) return false;
        if (c === '#000' || c === '#000000' || c === 'black') return true;
        if (c === '#111' || c === '#111111' || c === '#1a1a1a' || c === '#1e1e1e' ||
            c === '#222' || c === '#222222' || c === '#333' || c === '#333333') return true;
        var m = c.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);
        if (m) {
            var h = m[1];
            if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
            var r = parseInt(h.slice(0, 2), 16);
            var g = parseInt(h.slice(2, 4), 16);
            var b = parseInt(h.slice(4, 6), 16);
            return r < 80 && g < 80 && b < 80;
        }
        var rgb = c.match(/^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i);
        if (rgb) return +rgb[1] < 80 && +rgb[2] < 80 && +rgb[3] < 80;
        return false;
    }

    function isNearWhite(c) {
        if (!c) return false;
        if (c === '#fff' || c === '#ffffff' || c === 'white' || c === '#f8f8f8' ||
            c === '#f8f9fa' || c === '#f5f5f5' || c === '#fafafa' || c === '#eee' || c === '#eeeeee') return true;
        var m = c.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);
        if (m) {
            var h = m[1];
            if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
            var r = parseInt(h.slice(0, 2), 16);
            var g = parseInt(h.slice(2, 4), 16);
            var b = parseInt(h.slice(4, 6), 16);
            return r > 230 && g > 230 && b > 230;
        }
        var rgb = c.match(/^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i);
        if (rgb) return +rgb[1] > 230 && +rgb[2] > 230 && +rgb[3] > 230;
        return false;
    }

    /**
     * Лёгкая подсветка синтаксиса без CDN.
     * Работает с .code-content, code внутри .code-container, pre/code в статье.
     */
    function highlightCodeBlocks(root) {
        if (!root) return;
        var nodes = root.querySelectorAll('.code-content, .code-container > code, pre code, pre');
        nodes.forEach(function (node) {
            if (node.dataset.kbHl === '1') return;
            // не трогаем вложенный pre>code дважды
            if (node.tagName === 'PRE' && node.querySelector('code')) return;
            var text = node.textContent || '';
            if (!text.trim()) return;
            node.innerHTML = tokenizeCode(text);
            node.classList.add('kb-hl');
            node.dataset.kbHl = '1';
        });
    }

    function tokenizeCode(src) {
        var out = '';
        var i = 0;
        var len = src.length;
        var keywords = /^(function|return|var|let|const|if|else|for|while|do|switch|case|break|continue|try|catch|finally|throw|new|this|class|extends|import|export|from|default|typeof|instanceof|in|of|void|null|true|false|undefined|async|await|yield|static|get|set|super|delete|with|debugger|enum|interface|type|namespace|public|private|protected|package|implements|declare|module|require|exports|procedure|функция|процедура|конец|если|тогда|иначе|для|пока|цикл|перем|новый|возврат|истина|ложь|неопределено)\b/i;

        function esc(s) {
            return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        }

        while (i < len) {
            // line comment // or #
            if ((src[i] === '/' && src[i + 1] === '/') || (src[i] === '#' && (i === 0 || /\s/.test(src[i - 1])))) {
                var cEnd = src.indexOf('\n', i);
                if (cEnd < 0) cEnd = len;
                out += '<span class="kb-tok-cm">' + esc(src.slice(i, cEnd)) + '</span>';
                i = cEnd;
                continue;
            }
            // block comment /* */
            if (src[i] === '/' && src[i + 1] === '*') {
                var bEnd = src.indexOf('*/', i + 2);
                if (bEnd < 0) bEnd = len; else bEnd += 2;
                out += '<span class="kb-tok-cm">' + esc(src.slice(i, bEnd)) + '</span>';
                i = bEnd;
                continue;
            }
            // strings
            if (src[i] === '"' || src[i] === "'" || src[i] === '`') {
                var q = src[i];
                var j = i + 1;
                while (j < len) {
                    if (src[j] === '\\') { j += 2; continue; }
                    if (src[j] === q) { j++; break; }
                    j++;
                }
                out += '<span class="kb-tok-str">' + esc(src.slice(i, j)) + '</span>';
                i = j;
                continue;
            }
            // numbers
            if (/[0-9]/.test(src[i]) && (i === 0 || /[^\w$]/.test(src[i - 1]))) {
                var n = i;
                while (n < len && /[0-9._xXa-fA-F]/.test(src[n])) n++;
                out += '<span class="kb-tok-num">' + esc(src.slice(i, n)) + '</span>';
                i = n;
                continue;
            }
            // identifiers / keywords / functions
            if (/[A-Za-zа-яА-ЯёЁ_$]/.test(src[i])) {
                var idEnd = i + 1;
                while (idEnd < len && /[\w$а-яА-ЯёЁ]/.test(src[idEnd])) idEnd++;
                var word = src.slice(i, idEnd);
                var after = src.slice(idEnd).match(/^\s*\(/);
                if (keywords.test(word)) {
                    out += '<span class="kb-tok-kw">' + esc(word) + '</span>';
                } else if (after) {
                    out += '<span class="kb-tok-fn">' + esc(word) + '</span>';
                } else {
                    out += esc(word);
                }
                i = idEnd;
                continue;
            }
            // operators
            if (/[=+\-*/%<>!&|^~?:]/.test(src[i])) {
                var o = i + 1;
                while (o < len && /[=+\-*/%<>!&|^~?:]/.test(src[o])) o++;
                out += '<span class="kb-tok-op">' + esc(src.slice(i, o)) + '</span>';
                i = o;
                continue;
            }
            out += esc(src[i]);
            i++;
        }
        return out;
    }

    function renderSearchResults() {
        var list = el('kb-search-results');
        var input = el('kb-search-input');
        if (!list) return;
        var q = input ? input.value : '';
        if (viewMode !== 'search' && !(q && q.trim())) {
            list.hidden = true;
            return;
        }
        list.hidden = false;
        var results = API.search(q);
        if (!results.length) {
            list.innerHTML = '<div class="kb-empty">Ничего не найдено</div>';
            return;
        }
        list.innerHTML = results.map(function (r) {
            return '<button type="button" class="kb-search-item' + (r.favorite ? ' is-fav' : '') + (r.id === activeArticleId ? ' active' : '') + '" data-article-id="' + r.id + '">' +
                '<span class="kb-search-title">' + (r.favorite ? '★ ' : '') + escapeHtml(r.title) + '</span>' +
                (r.snippet ? '<span class="kb-search-snippet">' + escapeHtml(r.snippet) + '</span>' : '') +
                '</button>';
        }).join('');
        list.querySelectorAll('.kb-search-item').forEach(function (btn) {
            btn.addEventListener('click', function () {
                showArticle(btn.dataset.articleId);
            });
        });
    }

    function renderFavorites() {
        var list = el('kb-favorites-list');
        if (!list) return;
        if (viewMode !== 'favorites') {
            list.hidden = true;
            return;
        }
        list.hidden = false;
        var favs = API.getFavorites();
        if (!favs.length) {
            list.innerHTML = '<div class="kb-empty">Нет избранных. Отметьте ★ на статье.</div>';
            return;
        }
        list.innerHTML = favs.map(function (a) {
            return '<button type="button" class="kb-search-item is-fav' + (a.id === activeArticleId ? ' active' : '') + '" data-article-id="' + a.id + '">' +
                '<span class="kb-search-title">★ ' + escapeHtml(a.title) + '</span></button>';
        }).join('');
        list.querySelectorAll('.kb-search-item').forEach(function (btn) {
            btn.addEventListener('click', function () {
                showArticle(btn.dataset.articleId);
            });
        });
    }

    function updateSidePanels() {
        var treeWrap = el('kb-tree-wrap');
        var searchList = el('kb-search-results');
        var favList = el('kb-favorites-list');
        if (viewMode === 'tree') {
            if (treeWrap) treeWrap.hidden = false;
            if (searchList) searchList.hidden = true;
            if (favList) favList.hidden = true;
        } else if (viewMode === 'search') {
            if (treeWrap) treeWrap.hidden = true;
            renderSearchResults();
            if (favList) favList.hidden = true;
        } else if (viewMode === 'favorites') {
            if (treeWrap) treeWrap.hidden = true;
            if (searchList) searchList.hidden = true;
            renderFavorites();
        }
        document.querySelectorAll('.kb-view-tab').forEach(function (tab) {
            tab.classList.toggle('active', tab.dataset.view === viewMode);
        });
    }

    function exportActiveKb() {
        var json = API.exportKb();
        if (!json) return;
        var blob = new Blob([json], { type: 'application/json' });
        var url = URL.createObjectURL(blob);
        var a = document.createElement('a');
        a.href = url;
        var kb = getActiveKb();
        a.download = (kb ? kb.name.replace(/[^\wа-яё\-]+/gi, '_') : 'knowledge-base') + '.json';
        document.body.appendChild(a);
        a.click();
        setTimeout(function () { URL.revokeObjectURL(url); a.remove(); }, 1500);
        notify('База знаний экспортирована', 'success');
    }

    /**
     * Печать / «Сохранить как PDF» текущей статьи БЗ
     */
    function printKbArticle() {
        var id = activeArticleId || API.getCurrentArticleId();
        var art = id ? API.getArticle(id) : null;
        if (!art) {
            notify('Откройте статью для печати', 'warning');
            return;
        }
        var bodyHtml = art.html || '';
        if (!String(bodyHtml).trim()) {
            notify('Статья пуста', 'warning');
            return;
        }
        var meta = '';
        try {
            if (art.updatedAt) {
                meta = 'Обновлено: ' + new Date(art.updatedAt).toLocaleString('ru-RU');
            }
        } catch (e) { /* ignore */ }

        if (typeof printHtmlDocument === 'function') {
            printHtmlDocument(bodyHtml, art.title || 'Статья', { meta: meta });
            return;
        }
        // fallback без builder.js
        try {
            var w = window.open('', '_blank');
            if (!w) {
                notify('Разрешите всплывающие окна для печати', 'warning');
                return;
            }
            w.document.open();
            w.document.write(
                '<!DOCTYPE html><html lang="ru"><head><meta charset="UTF-8"><title>' +
                String(art.title || 'Статья').replace(/</g, '&lt;') +
                '</title><style>body{font-family:system-ui,sans-serif;line-height:1.6;max-width:800px;margin:24px auto;padding:0 16px;color:#222}img{max-width:100%}</style></head><body>' +
                '<h1>' + String(art.title || '').replace(/</g, '&lt;') + '</h1>' +
                (meta ? '<p style="color:#666">' + meta + '</p>' : '') +
                bodyHtml +
                '<script>window.onload=function(){setTimeout(function(){window.print()},200)}<\/script></body></html>'
            );
            w.document.close();
        } catch (err) {
            notify('Не удалось открыть печать', 'warning');
        }
    }

    function setupKbFileMenu() {
        var menus = document.querySelectorAll('.kb-page-header .header-menu');
        if (!menus.length) return;

        function closeAll(except) {
            menus.forEach(function (m) {
                if (except && m === except) return;
                m.classList.remove('is-open');
                var btn = m.querySelector('.header-menu-btn');
                var panel = m.querySelector('.header-menu-panel');
                if (btn) btn.setAttribute('aria-expanded', 'false');
                if (panel) panel.hidden = true;
            });
        }

        menus.forEach(function (menu) {
            var btn = menu.querySelector('.header-menu-btn');
            var panel = menu.querySelector('.header-menu-panel');
            if (!btn || !panel) return;
            btn.addEventListener('click', function (e) {
                e.stopPropagation();
                var open = menu.classList.contains('is-open');
                closeAll();
                if (!open) {
                    menu.classList.add('is-open');
                    btn.setAttribute('aria-expanded', 'true');
                    panel.hidden = false;
                }
            });
            panel.querySelectorAll('.header-menu-item').forEach(function (item) {
                item.addEventListener('click', function () {
                    setTimeout(function () { closeAll(); }, 0);
                });
            });
        });
        document.addEventListener('click', function () { closeAll(); });
        document.addEventListener('keydown', function (e) {
            if (e.key === 'Escape') closeAll();
        });
    }

    function setupPageUi() {
        applyThemeOnPage();
        setupKbFileMenu();

        var select = el('kb-active-select');
        if (select) {
            select.addEventListener('change', function () {
                API.setActiveKb(select.value);
                selectedNodeId = null;
                activeArticleId = null;
                var empty = el('kb-article-empty');
                var view = el('kb-article-view');
                if (empty) empty.hidden = false;
                if (view) view.hidden = true;
                try { history.replaceState(null, '', location.pathname); } catch (e) { /* ignore */ }
                renderPageUi();
            });
        }

        var newKbBtn = el('kb-new-kb-btn');
        if (newKbBtn) {
            newKbBtn.addEventListener('click', function () {
                var name = prompt('Название новой базы знаний:', 'Новая база знаний');
                if (name === null) return;
                API.createKnowledgeBase(name);
                activeArticleId = null;
                renderPageUi();
                notify('Создана база «' + name + '»', 'success');
            });
        }

        var renameKbBtn = el('kb-rename-kb-btn');
        if (renameKbBtn) {
            renameKbBtn.addEventListener('click', function () {
                var kb = getActiveKb();
                if (!kb) return;
                var name = prompt('Новое название базы знаний:', kb.name);
                if (name === null || !name.trim()) return;
                API.renameKnowledgeBase(kb.id, name.trim());
                renderPageUi();
            });
        }

        var deleteKbBtn = el('kb-delete-kb-btn');
        if (deleteKbBtn) {
            deleteKbBtn.addEventListener('click', function () {
                var kb = getActiveKb();
                if (!kb) return;
                if (!confirm('Удалить базу знаний «' + kb.name + '» со всеми статьями?')) return;
                if (API.deleteKnowledgeBase(kb.id)) {
                    activeArticleId = null;
                    renderPageUi();
                    notify('База знаний удалена', 'info');
                }
            });
        }

        var clearKbBtn = el('kb-clear-kb-btn');
        if (clearKbBtn) {
            clearKbBtn.addEventListener('click', function () {
                var kb = getActiveKb();
                if (!kb) return;
                if (!confirm('Очистить базу «' + kb.name + '»? Все статьи и папки будут удалены.')) return;
                if (API.clearActiveKb()) {
                    activeArticleId = null;
                    selectedNodeId = null;
                    var empty = el('kb-article-empty');
                    var view = el('kb-article-view');
                    if (empty) empty.hidden = false;
                    if (view) view.hidden = true;
                    renderPageUi();
                    notify('База очищена', 'info');
                }
            });
        }

        var newFolderBtn = el('kb-new-folder-btn');
        if (newFolderBtn) {
            newFolderBtn.addEventListener('click', function () {
                var title = prompt('Название папки:', 'Новая папка');
                if (title === null) return;
                var parentId = null;
                if (selectedNodeId) {
                    var store = loadStore();
                    var kb = getActiveKb(store);
                    var found = kb ? findNode(kb.tree, selectedNodeId) : null;
                    if (found && found.node.type === 'folder') parentId = found.node.id;
                }
                API.createFolder(title, parentId);
                renderTree();
            });
        }

        document.querySelectorAll('.kb-view-tab').forEach(function (tab) {
            tab.addEventListener('click', function () {
                viewMode = tab.dataset.view || 'tree';
                updateSidePanels();
            });
        });

        var searchInput = el('kb-search-input');
        if (searchInput) {
            var searchTimer = null;
            searchInput.addEventListener('input', function () {
                clearTimeout(searchTimer);
                searchTimer = setTimeout(function () {
                    if (searchInput.value.trim()) {
                        viewMode = 'search';
                    } else if (viewMode === 'search') {
                        viewMode = 'tree';
                    }
                    updateSidePanels();
                    renderSearchResults();
                }, 160);
            });
        }

        var favBtn = el('kb-article-fav');
        if (favBtn) {
            favBtn.addEventListener('click', function () {
                var id = favBtn.dataset.articleId;
                if (!id) return;
                API.toggleFavorite(id);
                showArticle(id);
                renderFavorites();
            });
        }

        var editBtn = el('kb-article-edit');
        if (editBtn) {
            editBtn.addEventListener('click', function () {
                var id = editBtn.dataset.articleId;
                if (id) API.requestOpenInEditor(id);
            });
        }

        var renameBtn = el('kb-article-rename');
        if (renameBtn) {
            renameBtn.addEventListener('click', function () {
                var id = renameBtn.dataset.articleId;
                var art = id ? API.getArticle(id) : null;
                if (!art) return;
                var title = prompt('Новое название:', art.title);
                if (title === null || !title.trim()) return;
                var store = loadStore();
                var kb = getActiveKb(store);
                var nodeId = null;
                if (kb) {
                    (function walk(nodes) {
                        for (var i = 0; i < nodes.length; i++) {
                            if (nodes[i].type === 'article' && nodes[i].articleId === id) {
                                nodeId = nodes[i].id;
                                return;
                            }
                            if (nodes[i].children) walk(nodes[i].children);
                        }
                    })(kb.tree);
                }
                if (nodeId) API.renameNode(nodeId, title.trim());
                else API.saveArticle({ articleId: id, title: title.trim(), html: art.html });
                showArticle(id);
            });
        }

        var delBtn = el('kb-article-delete');
        if (delBtn) {
            delBtn.addEventListener('click', function () {
                var id = delBtn.dataset.articleId;
                var art = id ? API.getArticle(id) : null;
                if (!art) return;
                if (!confirm('Удалить статью «' + art.title + '»?')) return;
                var store = loadStore();
                var kb = getActiveKb(store);
                var nodeId = null;
                if (kb) {
                    (function walk(nodes) {
                        for (var i = 0; i < nodes.length; i++) {
                            if (nodes[i].type === 'article' && nodes[i].articleId === id) {
                                nodeId = nodes[i].id;
                                return;
                            }
                            if (nodes[i].children) walk(nodes[i].children);
                        }
                    })(kb.tree);
                }
                if (nodeId) API.deleteNode(nodeId);
                if (API.getCurrentArticleId() === id) API.setCurrentArticleId(null);
                activeArticleId = null;
                selectedNodeId = null;
                var empty = el('kb-article-empty');
                var view = el('kb-article-view');
                if (empty) empty.hidden = false;
                if (view) view.hidden = true;
                try { history.replaceState(null, '', location.pathname); } catch (e) { /* ignore */ }
                renderPageUi();
                notify('Статья удалена', 'info');
            });
        }

        var historyBtn = el('kb-article-history');
        var historyModal = el('kb-history-modal');
        function openHistoryModal(articleId) {
            if (!historyModal || !articleId) return;
            var list = el('kb-history-list');
            var revs = API.getArticleHistory(articleId);
            if (!list) return;
            if (!revs.length) {
                list.innerHTML = '<div class="kb-history-empty">Пока нет сохранённых версий. История появляется при обновлении статьи через «В БЗ».</div>';
            } else {
                list.innerHTML = revs.map(function (r) {
                    var d = r.savedAt ? new Date(r.savedAt).toLocaleString('ru-RU') : '';
                    var preview = (r.title || 'Без названия');
                    return '<div class="kb-history-item" data-rev-id="' + escapeHtml(r.id) + '">' +
                        '<div class="kb-history-item-meta">' +
                        '<span class="kb-history-item-title">' + escapeHtml(preview) + '</span>' +
                        '<span class="kb-history-item-date">' + escapeHtml(d) + '</span>' +
                        '</div>' +
                        '<div class="kb-history-item-actions">' +
                        '<button type="button" class="btn btn-secondary btn-sm kb-history-preview" data-rev-id="' + escapeHtml(r.id) + '">Просмотр</button>' +
                        '<button type="button" class="btn btn-sm kb-history-restore" data-rev-id="' + escapeHtml(r.id) + '">Восстановить</button>' +
                        '</div></div>';
                }).join('');
                list.querySelectorAll('.kb-history-restore').forEach(function (btn) {
                    btn.addEventListener('click', function () {
                        var rid = btn.dataset.revId;
                        if (!rid) return;
                        if (!confirm('Восстановить эту версию? Текущее содержимое сохранится в историю.')) return;
                        var restored = API.restoreArticleVersion(articleId, rid);
                        if (restored) {
                            historyModal.classList.remove('active');
                            showArticle(articleId);
                            notify('Версия восстановлена', 'success');
                        }
                    });
                });
                list.querySelectorAll('.kb-history-preview').forEach(function (btn) {
                    btn.addEventListener('click', function () {
                        var rid = btn.dataset.revId;
                        var rev = revs.find(function (x) { return x.id === rid; });
                        if (!rev) return;
                        var w = window.open('', '_blank');
                        if (!w) {
                            notify('Разрешите всплывающие окна для просмотра', 'warning');
                            return;
                        }
                        w.document.write('<!DOCTYPE html><html><head><meta charset="utf-8"><title>' +
                            escapeHtml(rev.title || 'Версия') + '</title><style>body{font-family:system-ui,sans-serif;padding:24px;max-width:900px;margin:0 auto;line-height:1.5}pre,code{white-space:pre-wrap}</style></head><body><h1>' +
                            escapeHtml(rev.title || '') + '</h1><p style="color:#666">' +
                            escapeHtml(rev.savedAt ? new Date(rev.savedAt).toLocaleString('ru-RU') : '') +
                            '</p><hr>' + (rev.html || '') + '</body></html>');
                        w.document.close();
                    });
                });
            }
            historyModal.classList.add('active');
        }
        if (historyBtn) {
            historyBtn.addEventListener('click', function () {
                var id = historyBtn.dataset.articleId || activeArticleId;
                if (!id) {
                    notify('Сначала откройте статью', 'warning');
                    return;
                }
                openHistoryModal(id);
            });
        }
        if (historyModal) {
            historyModal.querySelectorAll('.close-modal').forEach(function (btn) {
                btn.addEventListener('click', function () {
                    historyModal.classList.remove('active');
                });
            });
            historyModal.addEventListener('click', function (e) {
                if (e.target === historyModal) historyModal.classList.remove('active');
            });
        }

        var exportBtn = el('kb-export-btn');
        if (exportBtn) exportBtn.addEventListener('click', exportActiveKb);

        var fileExportBtn = el('kb-file-export-btn');
        if (fileExportBtn) fileExportBtn.addEventListener('click', exportActiveKb);

        var printMenuBtn = el('kb-print-btn');
        if (printMenuBtn) printMenuBtn.addEventListener('click', printKbArticle);

        var articlePrintBtn = el('kb-article-print');
        if (articlePrintBtn) articlePrintBtn.addEventListener('click', printKbArticle);

        document.addEventListener('keydown', function (e) {
            if (!(e.ctrlKey || e.metaKey) || e.shiftKey) return;
            if (e.key !== 'p' && e.key !== 'P') return;
            var tag = (e.target && e.target.tagName) ? e.target.tagName.toLowerCase() : '';
            if (tag === 'input' || tag === 'textarea' || tag === 'select') return;
            e.preventDefault();
            printKbArticle();
        });

        function handleImportFile(file, inputEl) {
            if (!file) return;
            var reader = new FileReader();
            reader.onload = function () {
                if (API.importKb(String(reader.result || ''))) {
                    activeArticleId = null;
                    renderPageUi();
                }
                if (inputEl) inputEl.value = '';
            };
            reader.readAsText(file);
        }

        var fileImportInput = el('kb-file-import-input');
        if (fileImportInput) {
            fileImportInput.addEventListener('change', function () {
                var file = fileImportInput.files && fileImportInput.files[0];
                handleImportFile(file, fileImportInput);
            });
        }

        var importInput = el('kb-import-input');
        if (importInput) {
            importInput.addEventListener('change', function () {
                var file = importInput.files && importInput.files[0];
                if (!file) return;
                var reader = new FileReader();
                reader.onload = function () {
                    if (API.importKb(String(reader.result || ''))) {
                        activeArticleId = null;
                        renderPageUi();
                    }
                    importInput.value = '';
                };
                reader.readAsText(file);
            });
        }

        var themeBtn = el('kb-theme-toggle');
        if (themeBtn) {
            themeBtn.addEventListener('click', function () {
                var dark = document.body.classList.toggle('dark-theme');
                try { localStorage.setItem('konstructor_theme_v1', dark ? 'dark' : 'light'); } catch (e) { /* ignore */ }
                if (activeArticleId) showArticle(activeArticleId);
            });
        }

        var wikiBtn = el('kb-wiki-btn');
        var wikiModal = el('kb-wiki-modal');
        if (wikiBtn && wikiModal) {
            var wikiBody = wikiModal.querySelector('.wiki-body') || el('kb-wiki-body-scroll');
            var wikiNavLinks = Array.prototype.slice.call(wikiModal.querySelectorAll('.wiki-nav-link'));

            function setKbWikiNavActive(id) {
                wikiNavLinks.forEach(function (link) {
                    var href = link.getAttribute('href') || '';
                    var targetId = href.charAt(0) === '#' ? href.slice(1) : href;
                    link.classList.toggle('is-active', targetId === id);
                });
            }

            function scrollKbWikiTo(id) {
                if (!wikiBody || !id) return;
                var section = wikiBody.querySelector('#' + id);
                if (!section) return;
                wikiBody.scrollTo({ top: Math.max(0, section.offsetTop - 4), behavior: 'smooth' });
                setKbWikiNavActive(id);
            }

            function updateKbWikiNavFromScroll() {
                if (!wikiBody) return;
                var sections = wikiBody.querySelectorAll('.wiki-section[id]');
                if (!sections.length) return;
                var scrollTop = wikiBody.scrollTop;
                var current = sections[0].id;
                for (var i = 0; i < sections.length; i++) {
                    if (sections[i].offsetTop - 24 <= scrollTop) current = sections[i].id;
                }
                setKbWikiNavActive(current);
            }

            wikiBtn.addEventListener('click', function () {
                wikiModal.classList.add('active');
                if (wikiBody) {
                    wikiBody.scrollTop = 0;
                    setKbWikiNavActive(wikiNavLinks[0]
                        ? (wikiNavLinks[0].getAttribute('href') || '').replace(/^#/, '')
                        : 'kbw-about');
                }
            });
            wikiNavLinks.forEach(function (link) {
                link.addEventListener('click', function (e) {
                    e.preventDefault();
                    var href = link.getAttribute('href') || '';
                    scrollKbWikiTo(href.charAt(0) === '#' ? href.slice(1) : href);
                });
            });
            if (wikiBody) {
                wikiBody.addEventListener('scroll', function () {
                    window.requestAnimationFrame(updateKbWikiNavFromScroll);
                }, { passive: true });
            }
            wikiModal.querySelectorAll('.close-modal').forEach(function (btn) {
                btn.addEventListener('click', function () {
                    wikiModal.classList.remove('active');
                });
            });
            wikiModal.addEventListener('click', function (e) {
                if (e.target === wikiModal) wikiModal.classList.remove('active');
            });
        }

        var settingsBtn = el('kb-settings-btn');
        var settingsModal = el('kb-settings-modal');
        if (settingsBtn && settingsModal) {
            settingsBtn.addEventListener('click', function () {
                settingsModal.classList.add('active');
            });
            settingsModal.querySelectorAll('.close-modal').forEach(function (btn) {
                btn.addEventListener('click', function () {
                    settingsModal.classList.remove('active');
                });
            });
            settingsModal.addEventListener('click', function (e) {
                if (e.target === settingsModal) settingsModal.classList.remove('active');
            });
        }

        var writeBtn = el('kb-write-article-btn');
        if (writeBtn) {
            writeBtn.addEventListener('click', function () {
                try {
                    sessionStorage.removeItem(CURRENT_ARTICLE_KEY);
                    sessionStorage.removeItem(OPEN_ARTICLE_KEY);
                } catch (e) { /* ignore */ }
            });
        }

        document.addEventListener('keydown', function (e) {
            if (e.key !== 'Escape') return;
            if (wikiModal && wikiModal.classList.contains('active')) wikiModal.classList.remove('active');
            if (settingsModal && settingsModal.classList.contains('active')) settingsModal.classList.remove('active');
            var histModal = el('kb-history-modal');
            if (histModal && histModal.classList.contains('active')) histModal.classList.remove('active');
        });

        renderPageUi();
    }

    function applyThemeOnPage() {
        try {
            var t = localStorage.getItem('konstructor_theme_v1');
            if (t === 'dark') document.body.classList.add('dark-theme');
            else document.body.classList.remove('dark-theme');
        } catch (e) { /* ignore */ }
    }

    // ——— EDITOR UI (index.html): publish modal only + navigate to page ———
    function openKbPage() {
        location.href = 'kb.html';
    }

    function openPublishModal() {
        var editor = document.getElementById('editor');
        if (!editor || !editor.innerHTML.trim()) {
            notify('Редактор пуст — нечего публиковать', 'warning');
            return;
        }
        var modal = el('kb-publish-modal');
        if (!modal) {
            notify('Модалка публикации не найдена', 'error');
            return;
        }
        modal.classList.add('active');
        var titleInput = el('kb-publish-title');
        var currentId = API.getCurrentArticleId();
        var existing = currentId ? API.getArticle(currentId) : null;
        if (titleInput) {
            titleInput.value = existing ? existing.title : guessTitleFromEditor();
            setTimeout(function () { titleInput.focus(); titleInput.select(); }, 40);
        }
        var folderSelect = el('kb-publish-folder');
        populateFolderSelect(folderSelect);
        if (folderSelect && existing) {
            var folderId = API.getArticleFolderId(currentId);
            folderSelect.value = folderId || '';
        }
        var updateHint = el('kb-publish-update-hint');
        var asNewRow = el('kb-publish-as-new-row');
        var asNewCb = el('kb-publish-as-new');
        if (asNewCb) asNewCb.checked = false;
        if (asNewRow) asNewRow.hidden = !existing;
        if (updateHint) {
            updateHint.hidden = !existing;
            updateHint.textContent = existing
                ? 'Будет обновлена статья «' + existing.title + '». Можно сменить папку или отметить «как новую».'
                : '';
        }
        var favCb = el('kb-publish-favorite');
        if (favCb) favCb.checked = existing ? !!existing.favorite : false;
    }

    function closePublishModal() {
        var modal = el('kb-publish-modal');
        if (modal) modal.classList.remove('active');
    }

    function confirmPublish() {
        var titleInput = el('kb-publish-title');
        var folderSelect = el('kb-publish-folder');
        var favCb = el('kb-publish-favorite');
        var title = titleInput ? titleInput.value.trim() : '';
        if (!title) {
            notify('Укажите название статьи', 'warning');
            if (titleInput) titleInput.focus();
            return;
        }
        var html = '';
        if (typeof buildCleanExportHTML === 'function') {
            html = buildCleanExportHTML({ selectedOnly: false });
        } else {
            var editor = document.getElementById('editor');
            html = editor ? editor.innerHTML : '';
        }
        var currentId = API.getCurrentArticleId();
        var asNewCb = el('kb-publish-as-new');
        var forceNew = asNewCb && asNewCb.checked;
        if (forceNew) currentId = null;
        var article = API.saveArticle({
            title: title,
            html: html,
            folderId: folderSelect ? folderSelect.value : '',
            articleId: currentId || undefined,
            favorite: favCb ? favCb.checked : false
        });
        if (article) {
            API.setCurrentArticleId(article.id);
            notify('Статья «' + article.title + '» сохранена в базу знаний', 'success');
            closePublishModal();
            updateEditorKbBadge();
        }
    }

    function updateEditorKbBadge() {
        var badge = el('kb-current-badge');
        if (!badge) return;
        var id = API.getCurrentArticleId();
        var art = id ? API.getArticle(id) : null;
        if (art) {
            badge.hidden = false;
            badge.textContent = 'БЗ: ' + art.title;
            badge.title = 'Текущая статья базы знаний. «В БЗ» обновит её.';
        } else {
            badge.hidden = true;
        }
    }

    function tryOpenPendingArticle() {
        var pending = null;
        try {
            pending = sessionStorage.getItem(OPEN_ARTICLE_KEY);
            if (pending) sessionStorage.removeItem(OPEN_ARTICLE_KEY);
        } catch (e) { pending = null; }
        if (!pending) return;
        var article = API.getArticle(pending);
        if (!article) return;
        var editor = document.getElementById('editor');
        if (!editor) return;

        function doLoad() {
            if (typeof snapshotEditor === 'function') snapshotEditor('before-kb-open');
            if (typeof smartImportHTML === 'function') {
                smartImportHTML(article.html || '');
            } else {
                editor.innerHTML = article.html || '';
            }
            API.setCurrentArticleId(article.id);
            updateEditorKbBadge();
            notify('Открыта статья «' + article.title + '»', 'success');
        }

        // wait a tick for editor init
        setTimeout(doLoad, 80);
    }

    function setupEditorUi() {
        var openBtn = el('kb-btn');
        if (openBtn) {
            openBtn.addEventListener('click', function (e) {
                e.preventDefault();
                openKbPage();
            });
        }

        var publishKbBtn = el('kb-publish-btn');
        if (publishKbBtn) publishKbBtn.addEventListener('click', openPublishModal);

        var modal = el('kb-publish-modal');
        if (modal) {
            modal.querySelectorAll('.close-modal').forEach(function (btn) {
                btn.addEventListener('click', closePublishModal);
            });
            modal.addEventListener('click', function (e) {
                if (e.target === modal) closePublishModal();
            });
        }

        var pubCancel = el('kb-publish-cancel');
        if (pubCancel) pubCancel.addEventListener('click', closePublishModal);
        var pubConfirm = el('kb-publish-confirm');
        if (pubConfirm) pubConfirm.addEventListener('click', confirmPublish);

        var openKbFromPub = el('kb-publish-open-page');
        if (openKbFromPub) {
            openKbFromPub.addEventListener('click', function () {
                closePublishModal();
                openKbPage();
            });
        }

        document.addEventListener('keydown', function (e) {
            if (e.key === 'Escape') {
                var m = el('kb-publish-modal');
                if (m && m.classList.contains('active')) closePublishModal();
            }
        });

        updateEditorKbBadge();
        tryOpenPendingArticle();
    }

    window.KnowledgeBase = API;
    window.openKnowledgeBase = openKbPage;
    window.openPublishToKb = openPublishModal;

    function init() {
        if (isPage || el('kb-article-view') || el('kb-page-root')) {
            isPage = true;
            setupPageUi();
        } else {
            setupEditorUi();
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
