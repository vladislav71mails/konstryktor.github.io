/**
 * Интеграции: YouGile (задача + файлы) и Email (mailto + скачивание HTML)
 */
(function () {
    'use strict';

    const YG_API = 'https://ru.yougile.com/api-v2';
    const LS_KEY = 'konstructor_yg_settings_v1';
    const LS_COLUMNS = 'konstructor_yg_recent_columns_v1';
    const MAX_RECENT_COLUMNS = 12;

    // ——— localStorage helpers ———
    function loadSettings() {
        try {
            return JSON.parse(localStorage.getItem(LS_KEY) || '{}') || {};
        } catch (e) {
            return {};
        }
    }

    function saveSettings(partial) {
        const cur = loadSettings();
        Object.assign(cur, partial);
        localStorage.setItem(LS_KEY, JSON.stringify(cur));
    }

    function loadRecentColumns() {
        try {
            const list = JSON.parse(localStorage.getItem(LS_COLUMNS) || '[]');
            return Array.isArray(list) ? list : [];
        } catch (e) {
            return [];
        }
    }

    function saveRecentColumn(id, title) {
        if (!id) return;
        let list = loadRecentColumns().filter(function (c) {
            return c.id !== id;
        });
        list.unshift({ id: id, title: title || id, usedAt: Date.now() });
        list = list.slice(0, MAX_RECENT_COLUMNS);
        localStorage.setItem(LS_COLUMNS, JSON.stringify(list));
        renderRecentColumns();
    }

    // ——— UI helpers ———
    function $(id) {
        return document.getElementById(id);
    }

    function showResult(el, type, html) {
        if (!el) return;
        el.hidden = false;
        el.className = 'publish-result ' + (type || 'info');
        el.innerHTML = html;
    }

    function setBusy(btn, busy, label) {
        if (!btn) return;
        btn.disabled = !!busy;
        if (label) btn.textContent = label;
    }

    function getArticleHtml() {
        if (typeof buildCleanExportHTML === 'function' && typeof buildExportDocument === 'function') {
            const body = buildCleanExportHTML({ selectedOnly: false });
            if (!body) return '';
            const title = ($('yg-title') && $('yg-title').value.trim()) || 'Статья';
            return buildExportDocument(body, title, 'inline');
        }
        const editor = $('editor');
        return editor ? editor.innerHTML : '';
    }

    function getArticleFileName() {
        const title = ($('yg-title') && $('yg-title').value.trim()) || 'статья';
        const base = title
            .replace(/[^\wа-яА-ЯёЁ\- ]+/gi, '')
            .trim()
            .replace(/\s+/g, '_')
            .slice(0, 50) || 'article';
        return base + '.html';
    }

    // ——— YouGile API ———
    async function ygFetch(path, options) {
        const key = ($('yg-api-key') && $('yg-api-key').value.trim()) || '';
        if (!key) throw new Error('Укажите API-ключ YouGile');
        const opts = options || {};
        const headers = Object.assign(
            { Authorization: 'Bearer ' + key },
            opts.headers || {}
        );
        if (!(opts.body instanceof FormData) && !headers['Content-Type']) {
            headers['Content-Type'] = 'application/json';
        }
        const res = await fetch(YG_API + path, {
            method: opts.method || 'GET',
            headers: headers,
            body: opts.body
        });
        const text = await res.text();
        let data = null;
        try {
            data = text ? JSON.parse(text) : null;
        } catch (e) {
            data = { raw: text };
        }
        if (!res.ok) {
            const msg =
                (data && (data.error || data.message)) ||
                text ||
                res.statusText ||
                'Ошибка ' + res.status;
            throw new Error(msg);
        }
        return data;
    }

    async function ygUploadFile(file) {
        const form = new FormData();
        form.append('file', file, file.name || 'file.bin');
        const data = await ygFetch('/upload-file', {
            method: 'POST',
            headers: {}, // FormData — boundary выставит браузер
            body: form
        });
        return data;
    }

    async function ygGetColumn(columnId) {
        return ygFetch('/columns/' + encodeURIComponent(columnId));
    }

    async function ygCreateTask(payload) {
        return ygFetch('/tasks', {
            method: 'POST',
            body: JSON.stringify(payload)
        });
    }

    // ——— Recent columns UI ———
    function renderRecentColumns() {
        const wrap = $('yg-recent-columns');
        if (!wrap) return;
        const list = loadRecentColumns();
        if (!list.length) {
            wrap.innerHTML = '<span class="yg-recent-empty">Пока нет недавних колонок</span>';
            return;
        }
        wrap.innerHTML = list
            .map(function (c) {
                const title = (c.title || c.id).replace(/</g, '&lt;').replace(/"/g, '&quot;');
                const id = String(c.id).replace(/"/g, '&quot;');
                return (
                    '<button type="button" class="yg-recent-chip" data-column-id="' +
                    id +
                    '" data-column-title="' +
                    title +
                    '" title="' +
                    id +
                    '">' +
                    title +
                    '</button>'
                );
            })
            .join('');
    }

    function updateColumnNameHint(name, isError) {
        const el = $('yg-column-name');
        if (!el) return;
        if (!name) {
            el.textContent = '';
            el.className = 'yg-column-name';
            return;
        }
        el.textContent = isError ? name : 'Колонка: ' + name;
        el.className = 'yg-column-name' + (isError ? ' error' : ' ok');
    }

    let _resolveTimer = null;
    function scheduleResolveColumn() {
        clearTimeout(_resolveTimer);
        _resolveTimer = setTimeout(resolveColumnName, 450);
    }

    async function resolveColumnName() {
        const input = $('yg-column-id');
        if (!input) return;
        const id = input.value.trim();
        if (!id || id.length < 8) {
            updateColumnNameHint('');
            return;
        }
        const recent = loadRecentColumns().find(function (c) {
            return c.id === id;
        });
        if (recent && recent.title && recent.title !== id) {
            updateColumnNameHint(recent.title);
            return;
        }
        const key = $('yg-api-key') && $('yg-api-key').value.trim();
        if (!key) {
            updateColumnNameHint('Введите ключ, чтобы подтянуть название');
            return;
        }
        updateColumnNameHint('Загрузка…');
        try {
            const col = await ygGetColumn(id);
            const title = (col && (col.title || col.name)) || id;
            updateColumnNameHint(title);
            saveRecentColumn(id, title);
        } catch (e) {
            updateColumnNameHint('Не удалось найти колонку: ' + (e.message || e), true);
        }
    }

    // ——— Build task description ———
    function buildDescription(fileLinks) {
        const pubs = ($('yg-pubs') && $('yg-pubs').value.trim()) || '';
        const note = ($('yg-note') && $('yg-note').value.trim()) || '';
        const parts = [];
        if (note) {
            parts.push('<p>' + escapeHtml(note).replace(/\n/g, '<br>') + '</p>');
        }
        if (pubs) {
            parts.push('<p><strong>Ссылки на публикации:</strong></p><ul>');
            pubs.split(/\n+/).forEach(function (line) {
                line = line.trim();
                if (!line) return;
                const url = line.split(/\s+—\s+|\s+-\s+/)[0].trim();
                parts.push(
                    '<li><a href="' +
                        escapeAttr(url) +
                        '" target="_blank" rel="noopener">' +
                        escapeHtml(line) +
                        '</a></li>'
                );
            });
            parts.push('</ul>');
        }
        if (fileLinks && fileLinks.length) {
            parts.push('<p><strong>Прикреплённые файлы:</strong></p><ul>');
            fileLinks.forEach(function (f) {
                const url = f.fullUrl || f.url || '';
                const name = f.name || 'файл';
                if (!url) return;
                parts.push(
                    '<li><a href="' +
                        escapeAttr(url) +
                        '" target="_blank" rel="noopener">' +
                        escapeHtml(name) +
                        '</a></li>'
                );
            });
            parts.push('</ul>');
        }
        parts.push('<p><em>Создано из визуального HTML-редактора</em></p>');
        return parts.join('\n');
    }

    function escapeHtml(s) {
        return String(s)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }

    function escapeAttr(s) {
        return escapeHtml(s).replace(/'/g, '&#39;');
    }

    // ——— Create task flow ———
    async function createYouGileTask() {
        const resultEl = $('yg-result');
        const btn = $('yg-create-task');
        const columnId = ($('yg-column-id') && $('yg-column-id').value.trim()) || '';
        const title = ($('yg-title') && $('yg-title').value.trim()) || '';
        if (!columnId) {
            showResult(resultEl, 'error', 'Укажите ID колонки');
            return;
        }
        if (!title) {
            showResult(resultEl, 'error', 'Укажите название задачи');
            return;
        }

        setBusy(btn, true, 'Создание…');
        showResult(resultEl, 'info', 'Загрузка файлов и создание задачи…');

        try {
            const fileLinks = [];

            // 1) HTML статьи
            const html = getArticleHtml();
            if (html) {
                const htmlBlob = new Blob([html], { type: 'text/html;charset=utf-8' });
                const htmlFile = new File([htmlBlob], getArticleFileName(), {
                    type: 'text/html'
                });
                const up = await ygUploadFile(htmlFile);
                fileLinks.push({
                    name: getArticleFileName(),
                    url: up.url,
                    fullUrl: up.fullUrl || up.url
                });
            }

            // 2) Дополнительные файлы (скриншоты и т.п.)
            const extraInput = $('yg-extra-files');
            if (extraInput && extraInput.files && extraInput.files.length) {
                for (let i = 0; i < extraInput.files.length; i++) {
                    const f = extraInput.files[i];
                    const up = await ygUploadFile(f);
                    fileLinks.push({
                        name: f.name,
                        url: up.url,
                        fullUrl: up.fullUrl || up.url
                    });
                }
            }

            const description = buildDescription(fileLinks);
            const task = await ygCreateTask({
                title: title,
                columnId: columnId,
                description: description
            });

            // Запоминаем колонку с названием
            let colTitle = columnId;
            const nameEl = $('yg-column-name');
            if (nameEl && nameEl.classList.contains('ok') && nameEl.textContent) {
                colTitle = nameEl.textContent.replace(/^Колонка:\s*/, '');
            } else {
                try {
                    const col = await ygGetColumn(columnId);
                    colTitle = (col && (col.title || col.name)) || columnId;
                } catch (e) {
                    /* ignore */
                }
            }
            saveRecentColumn(columnId, colTitle);
            saveSettings({
                apiKey: ($('yg-api-key') && $('yg-api-key').value.trim()) || '',
                columnId: columnId
            });

            const taskId = task && (task.id || task);
            const linksHtml = fileLinks
                .map(function (f) {
                    return (
                        '<li><a href="' +
                        escapeAttr(f.fullUrl || f.url) +
                        '" target="_blank" rel="noopener">' +
                        escapeHtml(f.name) +
                        '</a></li>'
                    );
                })
                .join('');

            showResult(
                resultEl,
                'success',
                '<strong>Задача создана</strong>' +
                    (taskId ? ' <code>' + escapeHtml(String(taskId)) + '</code>' : '') +
                    (linksHtml ? '<br>Файлы:<ul style="margin:6px 0 0;padding-left:18px">' + linksHtml + '</ul>' : '')
            );
            if (typeof showNotification === 'function') {
                showNotification('Задача YouGile создана', 'success');
            }
        } catch (e) {
            showResult(resultEl, 'error', 'Ошибка: ' + escapeHtml(e.message || String(e)));
            if (typeof showNotification === 'function') {
                showNotification('Ошибка YouGile: ' + (e.message || e), 'error');
            }
        } finally {
            setBusy(btn, false, 'Создать задачу + файлы');
        }
    }

    function copyCurl() {
        const key = ($('yg-api-key') && $('yg-api-key').value.trim()) || 'YOUR_API_KEY';
        const columnId = ($('yg-column-id') && $('yg-column-id').value.trim()) || 'COLUMN_ID';
        const title = ($('yg-title') && $('yg-title').value.trim()) || 'Статья';
        const desc = buildDescription([]);
        const payload = JSON.stringify(
            { title: title, columnId: columnId, description: desc },
            null,
            2
        );
        const curl =
            "curl -X POST '" +
            YG_API +
            "/tasks' \\\n  -H 'Authorization: Bearer " +
            key +
            "' \\\n  -H 'Content-Type: application/json' \\\n  -d '" +
            payload.replace(/'/g, "'\\''") +
            "'";
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(curl).then(function () {
                showResult($('yg-result'), 'info', 'curl скопирован в буфер обмена');
            });
        } else {
            showResult($('yg-result'), 'info', '<pre style="white-space:pre-wrap;font-size:11px">' + escapeHtml(curl) + '</pre>');
        }
    }

    // ——— Email panel ———
    function downloadHtmlForEmail() {
        const html = getArticleHtml();
        if (!html) {
            showResult($('em-result'), 'error', 'Редактор пуст');
            return;
        }
        if (typeof downloadBlobFile === 'function') {
            downloadBlobFile(html, getArticleFileName(), 'text/html;charset=utf-8');
        } else {
            const a = document.createElement('a');
            a.href = URL.createObjectURL(new Blob([html], { type: 'text/html' }));
            a.download = getArticleFileName();
            a.click();
        }
        showResult($('em-result'), 'success', 'HTML скачан — прикрепите его к письму вручную');
    }

    function openMailto() {
        const to = ($('em-to') && $('em-to').value.trim()) || '';
        const subject = ($('em-subject') && $('em-subject').value.trim()) || 'Материал статьи';
        let body = ($('em-note') && $('em-note').value.trim()) || '';
        const pubs = ($('em-pubs') && $('em-pubs').value.trim()) || '';
        if (pubs) {
            body += (body ? '\n\n' : '') + 'Ссылки:\n' + pubs;
        }
        body +=
            (body ? '\n\n' : '') +
            'HTML-файл статьи прикрепите вручную (скачайте кнопкой «Скачать HTML статьи»).';
        const href =
            'mailto:' +
            encodeURIComponent(to).replace(/%40/g, '@') +
            '?subject=' +
            encodeURIComponent(subject) +
            '&body=' +
            encodeURIComponent(body);
        window.location.href = href;
        showResult($('em-result'), 'info', 'Открыт почтовый клиент');
        saveSettings({ emailTo: to });
    }

    // ——— Modal open / tabs ———
    function openPublishModal() {
        const modal = $('publish-modal');
        if (!modal) return;
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';

        const s = loadSettings();
        if ($('yg-api-key') && s.apiKey) $('yg-api-key').value = s.apiKey;
        if ($('yg-column-id') && s.columnId) $('yg-column-id').value = s.columnId;
        if ($('em-to') && s.emailTo) $('em-to').value = s.emailTo;

        if ($('yg-title') && !$('yg-title').value) {
            const h1 = document.querySelector('#editor h1, #editor .content-heading h1');
            if (h1 && h1.textContent.trim()) {
                $('yg-title').value = 'Статья: ' + h1.textContent.trim().slice(0, 80);
            } else {
                $('yg-title').value = 'Статья';
            }
        }
        if ($('em-subject') && !$('em-subject').value) {
            $('em-subject').value = ($('yg-title') && $('yg-title').value) || 'Материал статьи';
        }

        renderRecentColumns();
        scheduleResolveColumn();
        const resY = $('yg-result');
        const resE = $('em-result');
        if (resY) {
            resY.hidden = true;
            resY.innerHTML = '';
        }
        if (resE) {
            resE.hidden = true;
            resE.innerHTML = '';
        }
    }

    function closePublishModal() {
        const modal = $('publish-modal');
        if (!modal) return;
        modal.classList.remove('active');
        document.body.style.overflow = '';
    }

    function switchTab(tab) {
        document.querySelectorAll('.publish-tab').forEach(function (b) {
            b.classList.toggle('active', b.getAttribute('data-tab') === tab);
        });
        document.querySelectorAll('.publish-panel').forEach(function (p) {
            p.classList.toggle('active', p.id === 'panel-' + tab);
        });
    }

    // ——— Init ———
    function init() {
        const publishBtn = $('publish-btn');
        if (publishBtn) {
            publishBtn.addEventListener('click', openPublishModal);
        }

        const modal = $('publish-modal');
        if (modal) {
            modal.addEventListener('click', function (e) {
                if (e.target === modal) closePublishModal();
            });
            const closeBtn = modal.querySelector('.close-modal');
            if (closeBtn) {
                closeBtn.addEventListener('click', closePublishModal);
            }
        }

        document.querySelectorAll('.publish-tab').forEach(function (btn) {
            btn.addEventListener('click', function () {
                switchTab(btn.getAttribute('data-tab'));
            });
        });

        const createBtn = $('yg-create-task');
        if (createBtn) createBtn.addEventListener('click', createYouGileTask);
        const curlBtn = $('yg-copy-curl');
        if (curlBtn) curlBtn.addEventListener('click', copyCurl);

        const colInput = $('yg-column-id');
        if (colInput) {
            colInput.addEventListener('input', scheduleResolveColumn);
            colInput.addEventListener('change', scheduleResolveColumn);
            colInput.addEventListener('blur', resolveColumnName);
        }

        const recentWrap = $('yg-recent-columns');
        if (recentWrap) {
            recentWrap.addEventListener('click', function (e) {
                const chip = e.target.closest('.yg-recent-chip');
                if (!chip) return;
                const id = chip.getAttribute('data-column-id');
                const title = chip.getAttribute('data-column-title');
                if ($('yg-column-id')) $('yg-column-id').value = id;
                updateColumnNameHint(title || id);
                saveRecentColumn(id, title);
            });
        }

        const emDl = $('em-download-html');
        if (emDl) emDl.addEventListener('click', downloadHtmlForEmail);
        const emMail = $('em-open-mailto');
        if (emMail) emMail.addEventListener('click', openMailto);

        // Сохраняем ключ при уходе с поля
        const keyInput = $('yg-api-key');
        if (keyInput) {
            keyInput.addEventListener('change', function () {
                saveSettings({ apiKey: keyInput.value.trim() });
                scheduleResolveColumn();
            });
        }

        document.addEventListener('keydown', function (e) {
            if (e.key === 'Escape') {
                const m = $('publish-modal');
                if (m && m.classList.contains('active')) closePublishModal();
            }
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    // Экспорт для палитры команд
    window.openPublishModal = openPublishModal;
})();
