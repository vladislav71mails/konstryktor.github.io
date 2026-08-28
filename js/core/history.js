/**
 * core/history.js — Undo/Redo стек редактора
 * Зависит от: markAutosaveDirty (autosave), showNotification (ui),
 *             reinitializeBlocks / addBlockEventListeners / initDragForElement / bindFreeTextBlock
 * (пока через глобалы; позже — явный DI или import)
 */

const editorHistory = {
    stack: [],
    redoStack: [],
    max: 30,
    quiet: false,
    lastSnapshotHtml: null
};

const HISTORY_DEBOUNCE_MS = 600;
let _historyDebounceTimer = null;

/** Сохранить текущее состояние ПЕРЕД изменением (структурным) */
function snapshotEditor(label) {
    if (editorHistory.quiet) return;
    const editor = document.getElementById('editor');
    if (!editor) return;
    // Сбросить отложенный снимок текста — структурный важнее
    if (_historyDebounceTimer) {
        clearTimeout(_historyDebounceTimer);
        _historyDebounceTimer = null;
    }
    const html = editor.innerHTML;
    const last = editorHistory.stack.length
        ? editorHistory.stack[editorHistory.stack.length - 1]
        : editorHistory.lastSnapshotHtml;
    if (last === html) return;
    editorHistory.stack.push(html);
    if (editorHistory.stack.length > editorHistory.max) {
        editorHistory.stack.shift();
    }
    editorHistory.redoStack = [];
    editorHistory.lastSnapshotHtml = html;
    markAutosaveDirty();
    updateHistoryButtons();
}

/** Отложенный снимок при наборе текста (группирует правки) */
function snapshotEditorDebounced() {
    if (editorHistory.quiet) return;
    if (_historyDebounceTimer) clearTimeout(_historyDebounceTimer);
    _historyDebounceTimer = setTimeout(function () {
        _historyDebounceTimer = null;
        snapshotEditor('text-edit');
    }, HISTORY_DEBOUNCE_MS);
    markAutosaveDirty();
}

function reinitEditorAfterHistory() {
    const editor = document.getElementById('editor');
    if (!editor) return;
    if (typeof reinitializeBlocks === 'function') {
        reinitializeBlocks();
    } else {
        editor.querySelectorAll('.block').forEach(block => {
            if (typeof addBlockEventListeners === 'function') addBlockEventListeners(block);
            initDragForElement(block);
        });
    }
    editor.querySelectorAll('.free-text-block').forEach(b => {
        if (typeof bindFreeTextBlock === 'function') {
            b.dataset.bound = '';
            bindFreeTextBlock(b);
        }
    });
    markAutosaveDirty();
    updateHistoryButtons();
}

function undoEditor() {
    const editor = document.getElementById('editor');
    if (!editor) return;

    // Зафиксировать текущий текст, если был отложенный снимок
    if (_historyDebounceTimer) {
        clearTimeout(_historyDebounceTimer);
        _historyDebounceTimer = null;
        const cur = editor.innerHTML;
        if (editorHistory.lastSnapshotHtml !== cur) {
            editorHistory.stack.push(editorHistory.lastSnapshotHtml || cur);
            if (editorHistory.stack.length > editorHistory.max) editorHistory.stack.shift();
            editorHistory.lastSnapshotHtml = cur;
        }
    }

    if (editorHistory.stack.length === 0) {
        showNotification('Нечего отменять', 'info');
        return;
    }

    const current = editor.innerHTML;
    const prev = editorHistory.stack.pop();
    editorHistory.redoStack.push(current);
    if (editorHistory.redoStack.length > editorHistory.max) {
        editorHistory.redoStack.shift();
    }

    editorHistory.quiet = true;
    editor.innerHTML = prev;
    editorHistory.lastSnapshotHtml = prev;
    reinitEditorAfterHistory();
    editorHistory.quiet = false;

    showNotification('Отменено', 'info');
    updateHistoryButtons();
}

function redoEditor() {
    const editor = document.getElementById('editor');
    if (!editor) return;

    if (editorHistory.redoStack.length === 0) {
        showNotification('Нечего повторять', 'info');
        return;
    }

    const current = editor.innerHTML;
    const next = editorHistory.redoStack.pop();
    editorHistory.stack.push(current);
    if (editorHistory.stack.length > editorHistory.max) {
        editorHistory.stack.shift();
    }

    editorHistory.quiet = true;
    editor.innerHTML = next;
    editorHistory.lastSnapshotHtml = next;
    reinitEditorAfterHistory();
    editorHistory.quiet = false;

    showNotification('Повторено', 'info');
    updateHistoryButtons();
}

function updateHistoryButtons() {
    const undoBtn = document.getElementById('undo-btn');
    const redoBtn = document.getElementById('redo-btn');
    if (undoBtn) undoBtn.disabled = editorHistory.stack.length === 0;
    if (redoBtn) redoBtn.disabled = editorHistory.redoStack.length === 0;
}

function setupEditorHistory() {
    editorHistory.stack = [];
    editorHistory.redoStack = [];
    editorHistory.lastSnapshotHtml = null;
    const editor = document.getElementById('editor');
    if (editor) {
        editorHistory.lastSnapshotHtml = editor.innerHTML;
    }
    updateHistoryButtons();
}

// Экспорт в глобальную область (переходный период до ES modules)
window.editorHistory = editorHistory;
window.snapshotEditor = snapshotEditor;
window.snapshotEditorDebounced = snapshotEditorDebounced;
window.reinitEditorAfterHistory = reinitEditorAfterHistory;
window.undoEditor = undoEditor;
window.redoEditor = redoEditor;
window.updateHistoryButtons = updateHistoryButtons;
window.setupEditorHistory = setupEditorHistory;
