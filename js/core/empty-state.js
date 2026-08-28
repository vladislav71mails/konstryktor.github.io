/**
 * core/empty-state.js — Пустое состояние редактора
 * Зависит от: isEmptyFreeText (main / free-text helpers)
 */

function updateEditorEmptyState() {
    const editor = document.getElementById('editor');
    if (!editor) return;

    // Реальные блоки (не empty-state, не placeholder)
    const realBlocks = Array.from(editor.querySelectorAll(':scope > .block')).filter(
        b => !b.classList.contains('block-drag-placeholder')
    );
    const hasBlocks = realBlocks.length > 0;

    let empty = editor.querySelector('.editor-empty-state');

    if (!hasBlocks) {
        // Убираем старые drop-zone / free-text, если они есть
        editor.querySelectorAll('#initial-drop-zone, .drop-zone').forEach(el => el.remove());

        if (!empty) {
            empty = document.createElement('div');
            empty.className = 'editor-empty-state';
            empty.innerHTML = `
                <div class="empty-icon" aria-hidden="true">📦</div>
                <div class="empty-title">Здесь пока нет блоков</div>
                <div class="empty-hint">
                    Перетащите блок из сайдбара<br>
                    или нажмите <kbd>/</kbd> для быстрой вставки
                </div>
            `;
            editor.appendChild(empty);
        }
        // Убираем пустые free-text, если они остались
        realBlocks.forEach(b => {
            if (b.classList.contains('free-text-block') && typeof isEmptyFreeText === 'function' && isEmptyFreeText(b.querySelector('.free-text'))) {
                b.remove();
            }
        });
    } else {
        if (empty) empty.remove();
    }
}

function ensureFreeTextArea(editor) {
    if (!editor) return;
    updateEditorEmptyState();
}

window.updateEditorEmptyState = updateEditorEmptyState;
window.ensureFreeTextArea = ensureFreeTextArea;
