/**
 * core/autosave.js — быстрое автосохранение сессии (localStorage)
 * Зависит от: showNotification (опционально)
 * API: setupAutosave, markAutosaveDirty, restoreAutosaveSession, clearAutosaveSession
 */
(function () {
    const SESSION_KEY = 'konstructor_editor_session_v1';
    const DEBOUNCE_MS = 1200;
    let dirty = false;
    let timer = null;
    let lastSavedHtml = null;

    function getEditor() {
        return document.getElementById('editor');
    }

    function setAutosaveStatus(text) {
        const el = document.getElementById('autosave-status');
        if (!el) return;
        el.textContent = text || '';
    }

    function markAutosaveDirty() {
        dirty = true;
        setAutosaveStatus('Изменения…');
        if (timer) clearTimeout(timer);
        timer = setTimeout(flushAutosave, DEBOUNCE_MS);
    }

    function flushAutosave() {
        timer = null;
        if (!dirty) return;
        const editor = getEditor();
        if (!editor) return;
        const html = editor.innerHTML;
        if (html === lastSavedHtml) {
            dirty = false;
            return;
        }
        try {
            const payload = {
                html: html,
                savedAt: Date.now(),
                title: document.title || ''
            };
            localStorage.setItem(SESSION_KEY, JSON.stringify(payload));
            lastSavedHtml = html;
            dirty = false;
            updateRestoreButtonVisibility();
            setAutosaveStatus('Сохранено ' + new Date(payload.savedAt).toLocaleTimeString('ru-RU', {
                hour: '2-digit',
                minute: '2-digit'
            }));
        } catch (e) {
            setAutosaveStatus('Ошибка сохранения');
            if (typeof showNotification === 'function') {
                showNotification('Автосохранение сессии недоступно (хранилище)', 'warning');
            }
        }
    }

    function loadSessionPayload() {
        try {
            const raw = localStorage.getItem(SESSION_KEY);
            if (!raw) return null;
            const data = JSON.parse(raw);
            if (!data || typeof data.html !== 'string' || !data.html.trim()) return null;
            return data;
        } catch (e) {
            return null;
        }
    }

    function updateRestoreButtonVisibility() {
        const btn = document.getElementById('restore-session-btn');
        if (!btn) return;
        const data = loadSessionPayload();
        const editor = getEditor();
        const current = editor ? editor.innerHTML : '';
        // Показываем, если есть снимок и он отличается от текущего содержимого
        const hasUseful = data && data.html && data.html !== current;
        btn.style.display = hasUseful ? '' : 'none';
        if (hasUseful && data.savedAt) {
            const d = new Date(data.savedAt);
            btn.title = 'Восстановить сессию от ' + d.toLocaleString('ru-RU');
        }
    }

    function restoreAutosaveSession() {
        const data = loadSessionPayload();
        if (!data) {
            if (typeof showNotification === 'function') {
                showNotification('Нет сохранённой сессии', 'info');
            }
            return;
        }
        const editor = getEditor();
        if (!editor) return;
        if (typeof snapshotEditor === 'function') snapshotEditor('before-restore-session');
        editor.innerHTML = data.html;
        if (typeof reinitializeBlocks === 'function') {
            reinitializeBlocks();
        } else {
            editor.querySelectorAll('.block').forEach(function (block) {
                if (typeof addBlockEventListeners === 'function') addBlockEventListeners(block);
                if (typeof initDragForElement === 'function') initDragForElement(block);
            });
            editor.querySelectorAll('.free-text-block').forEach(function (b) {
                if (typeof bindFreeTextBlock === 'function') {
                    b.dataset.bound = '';
                    bindFreeTextBlock(b);
                }
            });
        }
        lastSavedHtml = data.html;
        dirty = false;
        updateRestoreButtonVisibility();
        if (typeof showNotification === 'function') {
            showNotification('Сессия восстановлена', 'success');
        }
    }

    function clearAutosaveSession() {
        try {
            localStorage.removeItem(SESSION_KEY);
        } catch (e) {}
        lastSavedHtml = null;
        dirty = false;
        updateRestoreButtonVisibility();
    }

    function setupAutosave() {
        const editor = getEditor();
        if (editor) {
            lastSavedHtml = editor.innerHTML;
        }
        updateRestoreButtonVisibility();

        const restoreBtn = document.getElementById('restore-session-btn');
        if (restoreBtn) {
            restoreBtn.addEventListener('click', function () {
                if (!confirm('Восстановить последнюю автосохранённую сессию? Текущее содержимое будет заменено.')) return;
                restoreAutosaveSession();
            });
        }

        // Сохранить при уходе со страницы
        window.addEventListener('beforeunload', function () {
            if (dirty) flushAutosave();
        });
        document.addEventListener('visibilitychange', function () {
            if (document.visibilityState === 'hidden' && dirty) flushAutosave();
        });

        // Периодический flush на случай долгой работы
        setInterval(function () {
            if (dirty) flushAutosave();
        }, 30000);
    }

    window.markAutosaveDirty = markAutosaveDirty;
    window.setupAutosave = setupAutosave;
    window.restoreAutosaveSession = restoreAutosaveSession;
    window.clearAutosaveSession = clearAutosaveSession;
})();
