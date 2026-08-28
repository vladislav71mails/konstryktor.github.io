/**
 * core/autosave.js — Автосохранение сессии в localStorage
 * Зависит от: editorHistory, snapshotEditor, reinitEditorAfterHistory (history),
 *             showNotification (ui), markVersionDirty / tryAutoVersionSnapshot / setupVersionHistory / openVersionsModal (versions — пока в main)
 */

const AUTOSAVE_KEY = 'konstructor_editor_autosave_v1';
const AUTOSAVE_INTERVAL_MS = 7000;

let _autosaveTimer = null;
let _lastAutosavedHtml = null;
let _autosaveDirty = false;

function markAutosaveDirty() {
    _autosaveDirty = true;
    if (typeof markVersionDirty === 'function') markVersionDirty();
}

function getEditorHtmlForSave() {
    const editor = document.getElementById('editor');
    return editor ? editor.innerHTML : '';
}

function isEditorEffectivelyEmpty(html) {
    if (!html || !html.trim()) return true;
    const tmp = document.createElement('div');
    tmp.innerHTML = html;
    const text = (tmp.textContent || '').replace(/\u00a0/g, ' ').trim();
    const blocks = tmp.querySelectorAll('.block');
    // Один пустой free-text-блок считаем пустым
    if (blocks.length <= 1 && text === '') return true;
    return false;
}

function saveAutosaveNow(force) {
    const html = getEditorHtmlForSave();
    if (!force && html === _lastAutosavedHtml) {
        _autosaveDirty = false;
        return false;
    }
    // Не затираем хорошую сессию пустым редактором
    if (!force && isEditorEffectivelyEmpty(html)) {
        _autosaveDirty = false;
        setAutosaveStatus('');
        return false;
    }
    try {
        const payload = {
            html: html,
            savedAt: Date.now(),
            version: 1
        };
        localStorage.setItem(AUTOSAVE_KEY, JSON.stringify(payload));
        _lastAutosavedHtml = html;
        _autosaveDirty = false;
        const t = new Date(payload.savedAt);
        const timeStr = t.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        setAutosaveStatus('Сохранено ' + timeStr);
        updateRestoreButtonVisibility();
        return true;
    } catch (e) {
        setAutosaveStatus('Ошибка сохранения');
        console.warn('Autosave failed', e);
        return false;
    }
}

function loadAutosavePayload() {
    try {
        const raw = localStorage.getItem(AUTOSAVE_KEY);
        if (!raw) return null;
        const data = JSON.parse(raw);
        if (!data || typeof data.html !== 'string') return null;
        return data;
    } catch (e) {
        return null;
    }
}

function setAutosaveStatus(text) {
    const el = document.getElementById('autosave-status');
    if (el) el.textContent = text || '';
}

function updateRestoreButtonVisibility() {
    const btn = document.getElementById('restore-session-btn');
    if (!btn) return;
    const data = loadAutosavePayload();
    if (data && data.html && !isEditorEffectivelyEmpty(data.html)) {
        btn.style.display = '';
        const t = data.savedAt ? new Date(data.savedAt) : null;
        const tip = t
            ? 'Восстановить сессию от ' + t.toLocaleString('ru-RU')
            : 'Восстановить последнюю автосохранённую сессию';
        btn.title = tip;
    } else {
        btn.style.display = 'none';
    }
}

function restoreLastSession() {
    const data = loadAutosavePayload();
    if (!data || !data.html) {
        showNotification('Нет сохранённой сессии', 'warning');
        return;
    }
    const editor = document.getElementById('editor');
    if (!editor) return;

    if (!confirm('Восстановить последнюю автосохранённую сессию? Текущее содержимое будет заменено.')) {
        return;
    }

    snapshotEditor('before-restore');
    if (window.editorHistory) window.editorHistory.quiet = true;
    editor.innerHTML = data.html;
    reinitEditorAfterHistory();
    if (window.editorHistory) {
        window.editorHistory.quiet = false;
        window.editorHistory.lastSnapshotHtml = data.html;
    }
    _lastAutosavedHtml = data.html;
    _autosaveDirty = false;

    const t = data.savedAt ? new Date(data.savedAt).toLocaleString('ru-RU') : '';
    showNotification(t ? 'Сессия восстановлена (' + t + ')' : 'Сессия восстановлена', 'success');
    setAutosaveStatus('Восстановлено');
    if (typeof updateHistoryButtons === 'function') updateHistoryButtons();
}

function setupAutosave() {
    const editor = document.getElementById('editor');
    if (!editor) return;

    // Отслеживание правок текста для истории и автосохранения
    editor.addEventListener('input', function () {
        if (window.editorHistory && window.editorHistory.quiet) return;
        snapshotEditorDebounced();
    }, true);

    // Периодическое быстрое автосохранение сессии (crash recovery)
    if (_autosaveTimer) clearInterval(_autosaveTimer);
    _autosaveTimer = setInterval(function () {
        if (_autosaveDirty) saveAutosaveNow(false);
    }, AUTOSAVE_INTERVAL_MS);

    // Сохранение при уходе со страницы
    window.addEventListener('beforeunload', function () {
        if (_autosaveDirty) saveAutosaveNow(true);
        // при закрытии — по возможности зафиксировать версию, если были изменения
        if (typeof tryAutoVersionSnapshot === 'function') tryAutoVersionSnapshot(true);
    });
    document.addEventListener('visibilitychange', function () {
        if (document.visibilityState === 'hidden' && _autosaveDirty) {
            saveAutosaveNow(true);
        }
    });

    // Кнопки
    const undoBtn = document.getElementById('undo-btn');
    const redoBtn = document.getElementById('redo-btn');
    const restoreBtn = document.getElementById('restore-session-btn');
    const versionsBtn = document.getElementById('versions-btn');
    if (undoBtn) undoBtn.addEventListener('click', function () { undoEditor(); });
    if (redoBtn) redoBtn.addEventListener('click', function () { redoEditor(); });
    if (restoreBtn) restoreBtn.addEventListener('click', function () { restoreLastSession(); });
    if (versionsBtn) versionsBtn.addEventListener('click', function () { if (typeof openVersionsModal === 'function') openVersionsModal(); });

    updateRestoreButtonVisibility();
    if (typeof setupVersionHistory === 'function') setupVersionHistory();

    // Первое сохранение через интервал, если пользователь уже что-то менял
    setTimeout(function () {
        if (_autosaveDirty) saveAutosaveNow(false);
    }, 2000);
}

// Экспорт в глобальную область (переходный период)
window.markAutosaveDirty = markAutosaveDirty;
window.getEditorHtmlForSave = getEditorHtmlForSave;
window.isEditorEffectivelyEmpty = isEditorEffectivelyEmpty;
window.saveAutosaveNow = saveAutosaveNow;
window.loadAutosavePayload = loadAutosavePayload;
window.setAutosaveStatus = setAutosaveStatus;
window.updateRestoreButtonVisibility = updateRestoreButtonVisibility;
window.restoreLastSession = restoreLastSession;
window.setupAutosave = setupAutosave;
