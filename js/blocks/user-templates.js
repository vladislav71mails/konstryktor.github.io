/**
 * user-templates.js — Пользовательские блоки (сохранение, палитра, импорт/экспорт)
 * Без программирования: «Сохранить как шаблон» с любого блока в редакторе.
 * Хранение: localStorage konstructor_user_templates_v1
 */
(function () {
    'use strict';

    const STORAGE_KEY = 'konstructor_user_templates_v1';
    const USER_PREFIX = 'user:';

    function uid() {
        return 'utpl_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8);
    }

    function loadList() {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (!raw) return [];
            const list = JSON.parse(raw);
            return Array.isArray(list) ? list : [];
        } catch (e) {
            return [];
        }
    }

    function saveList(list) {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
            return true;
        } catch (e) {
            if (typeof showNotification === 'function') {
                showNotification('Не удалось сохранить шаблоны (localStorage переполнен?)', 'warning');
            }
            return false;
        }
    }

    function getById(id) {
        return loadList().find(t => t.id === id) || null;
    }

    /**
     * Очистка клона блока перед сохранением как шаблон:
     * убираем выделение, открытые панели, временные UI, data-sidebar attrs.
     */
    function serializeBlockForTemplate(blockEl) {
        if (!blockEl || !blockEl.classList.contains('block')) return null;
        const clone = blockEl.cloneNode(true);
        clone.classList.remove('selected', 'dragging', 'drag-over', 'block-locked');
        clone.removeAttribute('draggable');
        clone.setAttribute('draggable', 'false');
        clone.querySelectorAll('.block-select').forEach(el => el.remove());
        clone.querySelectorAll('.settings-panel').forEach(p => {
            p.classList.remove('active', 'open');
            p.style.display = '';
        });
        clone.querySelectorAll('[contenteditable]').forEach(el => {
            // оставляем как есть — при вставке снова повесим слушатели
        });
        // Убираем inline-стили, которые мешают темам (опционально оставляем пользовательские цвета из настроек)
        clone.querySelectorAll('.nested-editor').forEach(n => {
            if (!n.innerHTML.trim()) n.innerHTML = '';
        });
        return clone.outerHTML;
    }

    function ensureBlockChrome(html) {
        const wrap = document.createElement('div');
        wrap.innerHTML = html.trim();
        let block = wrap.querySelector('.block') || wrap.firstElementChild;
        if (!block) {
            // сырой HTML → content-custom
            return null;
        }
        if (!block.classList.contains('block')) {
            block.classList.add('block');
        }
        if (!block.querySelector('.drag-handle') || !block.querySelector('.block-actions')) {
            // если сохранили только контент — обернём минимальным chrome
            const actions = (typeof BLOCK_ACTIONS_HTML === 'string') ? BLOCK_ACTIONS_HTML : `
        <div class="drag-handle">≡</div>
        <div class="block-actions">
            <button class="copy-block" type="button" title="Копировать">Копировать</button>
            <button class="settings-block" type="button" title="Настройки">⚙</button>
            <button class="delete-block" type="button" title="Удалить">✕</button>
        </div>`;
            block.insertAdjacentHTML('afterbegin', actions);
        }
        if (!block.querySelector('.settings-panel') && typeof universalSettingsHTML === 'string') {
            const sp = document.createElement('div');
            sp.className = 'settings-panel';
            sp.innerHTML = universalSettingsHTML;
            const ec = block.querySelector('.editable-content');
            if (ec) block.insertBefore(sp, ec);
            else block.appendChild(sp);
        }
        block.setAttribute('draggable', 'false');
        block.classList.remove('selected', 'dragging');
        return block;
    }

    function insertUserTemplate(templateId, beforeNode) {
        const tpl = getById(templateId);
        if (!tpl || !tpl.html) {
            if (typeof showNotification === 'function') {
                showNotification('Шаблон не найден', 'warning');
            }
            return;
        }
        const editor = document.getElementById('editor');
        if (!editor) return;

        if (typeof snapshotEditor === 'function') snapshotEditor('before-insert-user-template');

        const initialDropZone = document.getElementById('initial-drop-zone');
        if (initialDropZone) initialDropZone.remove();

        const block = ensureBlockChrome(tpl.html);
        if (!block) {
            // fallback: как custom HTML
            if (typeof insertCustomHTML === 'function') {
                insertCustomHTML(tpl.html);
            }
            return;
        }

        // Пометить как user-template instance
        block.setAttribute('data-user-template-id', tpl.id);
        block.setAttribute('data-user-template-name', tpl.name || '');

        if (beforeNode && beforeNode.parentNode === editor) {
            editor.insertBefore(block, beforeNode);
        } else {
            editor.appendChild(block);
        }

        if (typeof addBlockEventListeners === 'function') addBlockEventListeners(block);
        if (typeof initDragForElement === 'function') initDragForElement(block);
        if (typeof ensureBlockSelectControl === 'function') ensureBlockSelectControl(block);

        // setup специализированных блоков
        if (block.classList.contains('content-video') && typeof setupVideoBlock === 'function') {
            setupVideoBlock(block);
        }
        if (block.classList.contains('content-download-file') && typeof setupDownloadFileBlock === 'function') {
            setupDownloadFileBlock(block);
        }
        if ((block.classList.contains('content-image') || block.classList.contains('content-image-caption')) && typeof setupImageBlock === 'function') {
            setupImageBlock(block);
        }

        // кнопка «Сохранить как шаблон» на новом экземпляре
        attachSaveAsTemplateButton(block);

        block.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        if (typeof updateEditorEmptyState === 'function') updateEditorEmptyState();
        if (typeof showNotification === 'function') {
            showNotification('Вставлен шаблон «' + (tpl.name || 'Без имени') + '»', 'success');
        }
    }

    function saveBlockAsTemplate(blockEl, nameOpt, descOpt) {
        if (!blockEl || !blockEl.classList.contains('block')) {
            if (typeof showNotification === 'function') {
                showNotification('Выберите блок в редакторе', 'warning');
            }
            return null;
        }
        const html = serializeBlockForTemplate(blockEl);
        if (!html) return null;

        let name = nameOpt;
        if (!name) {
            name = window.prompt('Название пользовательского блока:', guessNameFromBlock(blockEl));
            if (name === null) return null; // cancel
            name = (name || '').trim() || 'Мой блок';
        }
        const desc = descOpt != null ? descOpt : (window.prompt('Краткое описание (необязательно):', '') || '').trim();

        const list = loadList();
        const item = {
            id: uid(),
            name: name,
            description: desc,
            html: html,
            sourceClasses: Array.from(blockEl.classList).filter(c => c.startsWith('content-') || c === 'block').join(' '),
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        list.push(item);
        if (!saveList(list)) return null;

        refreshUserPalette();
        if (typeof showNotification === 'function') {
            showNotification('Шаблон «' + name + '» сохранён в «Пользовательские»', 'success');
        }
        return item;
    }

    function guessNameFromBlock(blockEl) {
        const title = blockEl.querySelector('.spoiler-title, .warning-title, .note-title, .success-title, h1, h2, h3, .block-title, strong');
        if (title && title.textContent.trim()) {
            const t = title.textContent.trim().slice(0, 40);
            return t;
        }
        const cls = Array.from(blockEl.classList).find(c => c.startsWith('content-') && c !== 'content-custom');
        if (cls) return cls.replace('content-', '').replace(/-/g, ' ');
        return 'Мой блок';
    }

    function deleteTemplate(id) {
        const list = loadList().filter(t => t.id !== id);
        saveList(list);
        refreshUserPalette();
    }

    function renameTemplate(id, newName, newDesc) {
        const list = loadList();
        const t = list.find(x => x.id === id);
        if (!t) return false;
        if (newName != null) t.name = String(newName).trim() || t.name;
        if (newDesc != null) t.description = String(newDesc).trim();
        t.updatedAt = new Date().toISOString();
        saveList(list);
        refreshUserPalette();
        return true;
    }

    function exportLibraryJSON() {
        const list = loadList();
        const payload = {
            version: 1,
            type: 'konstructor-user-templates',
            exportedAt: new Date().toISOString(),
            templates: list
        };
        return JSON.stringify(payload, null, 2);
    }

    function importLibraryJSON(jsonText, mode) {
        // mode: 'merge' | 'replace'
        let data;
        try {
            data = JSON.parse(jsonText);
        } catch (e) {
            if (typeof showNotification === 'function') showNotification('Некорректный JSON', 'error');
            return 0;
        }
        let incoming = [];
        if (Array.isArray(data)) incoming = data;
        else if (data && Array.isArray(data.templates)) incoming = data.templates;
        else {
            if (typeof showNotification === 'function') showNotification('В JSON нет массива templates', 'error');
            return 0;
        }

        const normalized = incoming.map(t => ({
            id: t.id && String(t.id).startsWith('utpl_') ? t.id : uid(),
            name: (t.name || 'Импортированный блок').slice(0, 120),
            description: (t.description || '').slice(0, 300),
            html: t.html || '',
            sourceClasses: t.sourceClasses || '',
            createdAt: t.createdAt || new Date().toISOString(),
            updatedAt: new Date().toISOString()
        })).filter(t => t.html);

        if (!normalized.length) {
            if (typeof showNotification === 'function') showNotification('Нет шаблонов для импорта', 'warning');
            return 0;
        }

        let list = mode === 'replace' ? [] : loadList();
        const byId = new Map(list.map(t => [t.id, t]));
        let added = 0;
        normalized.forEach(t => {
            if (byId.has(t.id)) {
                // обновить
                Object.assign(byId.get(t.id), t);
            } else {
                list.push(t);
                byId.set(t.id, t);
                added++;
            }
        });
        // если replace — list = normalized
        if (mode === 'replace') list = normalized;
        else {
            // merge: list already has updates via byId objects (same refs)
            list = Array.from(byId.values());
        }
        saveList(list);
        refreshUserPalette();
        if (typeof showNotification === 'function') {
            showNotification('Импортировано шаблонов: ' + (mode === 'replace' ? list.length : added), 'success');
        }
        return list.length;
    }

    function downloadLibrary() {
        const blob = new Blob([exportLibraryJSON()], { type: 'application/json;charset=utf-8' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = 'konstructor-user-templates.json';
        a.click();
        setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    }

    // ——— Палитра ———

    function createUserTemplateItem(tpl) {
        const icon = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>`;
        return `
        <div class="template-item template-item-user" data-template="${USER_PREFIX}${tpl.id}" data-user-id="${tpl.id}" draggable="false">
            <span class="template-item-icon" aria-hidden="true">${icon}</span>
            <div class="template-item-body">
                <strong>${escapeHtml(tpl.name || 'Без имени')}</strong>
                <div class="template-preview">${escapeHtml(tpl.description || 'Пользовательский шаблон')}</div>
            </div>
        </div>`;
    }

    function escapeHtml(s) {
        return String(s)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }

    function refreshUserPalette() {
        const sidebar = document.querySelector('.sidebar .templates');
        if (!sidebar) return;

        // Найти категорию «Пользовательские»
        let customCat = null;
        sidebar.querySelectorAll('.template-category').forEach(cat => {
            const h = cat.querySelector('.category-header h4');
            if (h && /Пользовательск/i.test(h.textContent)) customCat = cat;
        });

        if (!customCat) return;

        const list = loadList();
        const container = customCat.querySelector('.category-templates');
        if (!container) return;

        // Сохраняем built-in «custom» item и toolbar
        const builtinCustom = container.querySelector('[data-template="custom"]');
        const toolbar = container.querySelector('.user-templates-toolbar');

        // Удаляем старые user items
        container.querySelectorAll('.template-item-user').forEach(el => el.remove());

        // Toolbar если нет
        if (!toolbar) {
            const tb = document.createElement('div');
            tb.className = 'user-templates-toolbar';
            tb.innerHTML = `
                <button type="button" class="btn-sm user-tpl-manage" title="Управление шаблонами">Управление</button>
                <button type="button" class="btn-sm user-tpl-save-selected" title="Сохранить выделенный блок как шаблон">+ Из блока</button>
            `;
            container.appendChild(tb);
            tb.querySelector('.user-tpl-manage').addEventListener('click', openManageModal);
            tb.querySelector('.user-tpl-save-selected').addEventListener('click', function () {
                const selected = document.querySelector('#editor .block.selected') || document.querySelector('#editor .block');
                if (!selected) {
                    if (typeof showNotification === 'function') showNotification('Нет блоков в редакторе', 'warning');
                    return;
                }
                saveBlockAsTemplate(selected);
            });
        }

        // Вставляем user items в конец категории (после custom + toolbar)
        list.forEach(tpl => {
            const div = document.createElement('div');
            div.innerHTML = createUserTemplateItem(tpl);
            const item = div.firstElementChild;
            container.appendChild(item);
            item.addEventListener('click', function () {
                if (item.dataset.dragMoved === '1') {
                    item.dataset.dragMoved = '0';
                    return;
                }
                insertUserTemplate(tpl.id, null);
            });
        });

        // Re-bind drag for new items if available
        if (typeof initSidebarTemplateDrag === 'function') {
            try { initSidebarTemplateDrag(); } catch (e) { /* ok */ }
        }
    }

    // ——— Modal управления ———

    function openManageModal() {
        let modal = document.getElementById('user-templates-modal');
        if (!modal) {
            modal = document.createElement('div');
            modal.className = 'modal';
            modal.id = 'user-templates-modal';
            modal.innerHTML = `
            <div class="modal-content user-templates-modal-content">
                <div class="modal-header">
                    <h2>Пользовательские блоки</h2>
                    <button class="close-modal" type="button">&times;</button>
                </div>
                <p class="user-tpl-hint">Сохраняйте любые блоки из редактора как шаблоны — они появятся в палитре «Пользовательские». Подходят для повторного использования в импорте/экспорте статей. Тема (светлая/тёмная) подхватывается автоматически через CSS-переменные редактора.</p>
                <div class="user-tpl-actions-bar">
                    <button type="button" class="btn btn-sm" id="user-tpl-export">Экспорт JSON</button>
                    <label class="btn btn-sm user-tpl-import-label">
                        Импорт JSON
                        <input type="file" id="user-tpl-import-file" accept=".json,application/json" hidden>
                    </label>
                    <button type="button" class="btn btn-sm" id="user-tpl-import-merge">Импорт (слияние)</button>
                    <button type="button" class="btn btn-sm btn-danger-outline" id="user-tpl-clear">Очистить все</button>
                </div>
                <div class="user-tpl-list" id="user-tpl-list"></div>
                <div class="user-tpl-empty" id="user-tpl-empty" style="display:none;">Нет сохранённых шаблонов. Выделите блок в редакторе и нажмите «+ Из блока» в сайдбаре или кнопку «☆ Шаблон» на блоке.</div>
            </div>`;
            document.body.appendChild(modal);

            modal.querySelector('.close-modal').addEventListener('click', () => modal.classList.remove('active'));
            modal.addEventListener('click', e => { if (e.target === modal) modal.classList.remove('active'); });

            modal.querySelector('#user-tpl-export').addEventListener('click', downloadLibrary);
            modal.querySelector('#user-tpl-import-file').addEventListener('change', function (e) {
                const file = e.target.files && e.target.files[0];
                if (!file) return;
                const reader = new FileReader();
                reader.onload = () => {
                    importLibraryJSON(String(reader.result || ''), 'merge');
                    renderManageList();
                };
                reader.readAsText(file);
                e.target.value = '';
            });
            modal.querySelector('#user-tpl-import-merge').addEventListener('click', () => {
                modal.querySelector('#user-tpl-import-file').click();
            });
            modal.querySelector('#user-tpl-clear').addEventListener('click', () => {
                if (!confirm('Удалить все пользовательские шаблоны?')) return;
                saveList([]);
                refreshUserPalette();
                renderManageList();
            });
        }
        renderManageList();
        modal.classList.add('active');
    }

    function renderManageList() {
        const listEl = document.getElementById('user-tpl-list');
        const emptyEl = document.getElementById('user-tpl-empty');
        if (!listEl) return;
        const list = loadList();
        if (!list.length) {
            listEl.innerHTML = '';
            if (emptyEl) emptyEl.style.display = 'block';
            return;
        }
        if (emptyEl) emptyEl.style.display = 'none';
        listEl.innerHTML = list.map(t => `
            <div class="user-tpl-row" data-id="${t.id}">
                <div class="user-tpl-row-main">
                    <strong class="user-tpl-name">${escapeHtml(t.name)}</strong>
                    <span class="user-tpl-desc">${escapeHtml(t.description || '')}</span>
                    <span class="user-tpl-meta">${escapeHtml((t.sourceClasses || '').slice(0, 60))}</span>
                </div>
                <div class="user-tpl-row-actions">
                    <button type="button" class="btn-sm ut-insert" title="Вставить в редактор">Вставить</button>
                    <button type="button" class="btn-sm ut-rename" title="Переименовать">Имя</button>
                    <button type="button" class="btn-sm ut-delete" title="Удалить">Удалить</button>
                </div>
            </div>
        `).join('');

        listEl.querySelectorAll('.user-tpl-row').forEach(row => {
            const id = row.getAttribute('data-id');
            row.querySelector('.ut-insert').addEventListener('click', () => {
                insertUserTemplate(id, null);
                document.getElementById('user-templates-modal').classList.remove('active');
            });
            row.querySelector('.ut-rename').addEventListener('click', () => {
                const t = getById(id);
                if (!t) return;
                const n = window.prompt('Название:', t.name);
                if (n === null) return;
                const d = window.prompt('Описание:', t.description || '');
                if (d === null) return;
                renameTemplate(id, n, d);
                renderManageList();
            });
            row.querySelector('.ut-delete').addEventListener('click', () => {
                if (!confirm('Удалить шаблон «' + (getById(id) || {}).name + '»?')) return;
                deleteTemplate(id);
                renderManageList();
            });
        });
    }

    // ——— Кнопка на блоке ———

    function attachSaveAsTemplateButton(block) {
        if (!block || block.querySelector('.save-as-template-block')) return;
        const actions = block.querySelector('.block-actions');
        if (!actions) return;
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'save-as-template-block';
        btn.title = 'Сохранить как пользовательский шаблон';
        btn.setAttribute('aria-label', 'Сохранить как шаблон');
        btn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>`;
        const del = actions.querySelector('.delete-block');
        if (del) actions.insertBefore(btn, del);
        else actions.appendChild(btn);
        btn.addEventListener('click', function (e) {
            e.preventDefault();
            e.stopPropagation();
            saveBlockAsTemplate(block);
        });
    }

    function attachSaveButtonsToAllBlocks() {
        document.querySelectorAll('#editor .block').forEach(attachSaveAsTemplateButton);
    }

    // ——— Интеграция с insertTemplate ———

    function tryHandleInsertTemplate(type, beforeNode) {
        if (typeof type === 'string' && type.startsWith(USER_PREFIX)) {
            const id = type.slice(USER_PREFIX.length);
            insertUserTemplate(id, beforeNode);
            return true;
        }
        return false;
    }

    // Patch insertTemplate after factories loaded
    function patchInsertTemplate() {
        if (typeof window.insertTemplate !== 'function') return;
        const orig = window.insertTemplate;
        if (orig._userTemplatesPatched) return;
        function wrapped(type, beforeNode) {
            if (tryHandleInsertTemplate(type, beforeNode)) return;
            return orig(type, beforeNode);
        }
        wrapped._userTemplatesPatched = true;
        window.insertTemplate = wrapped;
        // factories may hold local binding — also patch if on window only is enough for sidebar/slash
    }

    function getSlashEntries() {
        return loadList().map(t => ({
            id: USER_PREFIX + t.id,
            name: t.name || 'Шаблон',
            desc: t.description || 'Пользовательский блок',
            icon: '☆'
        }));
    }

    // Init
    function initUserTemplates() {
        patchInsertTemplate();
        refreshUserPalette();
        attachSaveButtonsToAllBlocks();

        // При добавлении блоков — вешать кнопку
        const editor = document.getElementById('editor');
        if (editor && !editor._userTplObserver) {
            const obs = new MutationObserver(function (mutations) {
                mutations.forEach(m => {
                    m.addedNodes.forEach(node => {
                        if (node.nodeType !== 1) return;
                        if (node.classList && node.classList.contains('block')) {
                            attachSaveAsTemplateButton(node);
                        }
                        node.querySelectorAll && node.querySelectorAll('.block').forEach(attachSaveAsTemplateButton);
                    });
                });
            });
            obs.observe(editor, { childList: true, subtree: true });
            editor._userTplObserver = obs;
        }
    }

    // Public API
    window.UserTemplates = {
        loadList,
        saveList,
        getById,
        saveBlockAsTemplate,
        insertUserTemplate,
        deleteTemplate,
        renameTemplate,
        exportLibraryJSON,
        importLibraryJSON,
        downloadLibrary,
        refreshUserPalette,
        openManageModal,
        attachSaveAsTemplateButton,
        attachSaveButtonsToAllBlocks,
        tryHandleInsertTemplate,
        getSlashEntries,
        init: initUserTemplates,
        USER_PREFIX
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function () {
            setTimeout(initUserTemplates, 50);
        });
    } else {
        setTimeout(initUserTemplates, 50);
    }
})();
