/**
 * drag/sidebar-drag.js — Drag шаблонов из сайдбара в редактор
 * Зависит от: insertTemplate (templates/blocks)
 */

/** Drag шаблонов из сайдбара в редактор с визуальной позицией вставки и ghost-превью */
function initSidebarTemplateDrag() {
    const editor = document.getElementById('editor');
    if (!editor) return;

    let draggingType = null;
    let indicator = null;
    let insertBefore = null;
    let startY = 0;
    let startX = 0;
    let moved = false;
    let ghost = null;
    let sourceItem = null;

    function ensureIndicator() {
        if (!indicator) {
            indicator = document.createElement('div');
            indicator.className = 'template-drop-indicator';
        }
        return indicator;
    }

    function clearIndicator() {
        if (indicator && indicator.parentNode) indicator.parentNode.removeChild(indicator);
        insertBefore = null;
    }

    function createGhost(item, clientX, clientY) {
        removeGhost();
        ghost = item.cloneNode(true);
        ghost.classList.add('template-drag-ghost');
        ghost.classList.remove('template-dragging');
        ghost.removeAttribute('data-sidebar-drag-bound');
        ghost.style.position = 'fixed';
        ghost.style.left = (clientX + 12) + 'px';
        ghost.style.top = (clientY + 12) + 'px';
        ghost.style.width = Math.min(item.offsetWidth, 260) + 'px';
        ghost.style.pointerEvents = 'none';
        ghost.style.zIndex = '10000';
        ghost.style.margin = '0';
        document.body.appendChild(ghost);
    }

    function updateGhost(clientX, clientY) {
        if (!ghost) return;
        ghost.style.left = (clientX + 12) + 'px';
        ghost.style.top = (clientY + 12) + 'px';
    }

    function removeGhost() {
        if (ghost && ghost.parentNode) ghost.parentNode.removeChild(ghost);
        ghost = null;
    }

    function updateIndicator(clientY) {
        // Только прямые дочерние блоки редактора (не вложенные)
        const blocks = Array.from(editor.querySelectorAll(':scope > .block'));
        let before = null;
        for (const b of blocks) {
            const rect = b.getBoundingClientRect();
            const mid = rect.top + rect.height / 2;
            if (clientY < mid) {
                before = b;
                break;
            }
        }
        insertBefore = before;
        const ind = ensureIndicator();
        if (before) {
            editor.insertBefore(ind, before);
        } else {
            editor.appendChild(ind);
        }
    }

    function onMove(e) {
        if (!draggingType) return;
        if (e.cancelable) e.preventDefault();

        const clientX = e.clientX != null ? e.clientX : (e.touches && e.touches[0] && e.touches[0].clientX);
        const clientY = e.clientY != null ? e.clientY : (e.touches && e.touches[0] && e.touches[0].clientY);
        if (clientX == null || clientY == null) return;

        if (!moved && (Math.abs(clientY - startY) > 4 || Math.abs(clientX - startX) > 4)) {
            moved = true;
            if (sourceItem) {
                sourceItem.classList.add('template-dragging');
                createGhost(sourceItem, clientX, clientY);
            }
            document.body.classList.add('is-template-dragging');
            document.body.style.userSelect = 'none';
            document.body.style.cursor = 'grabbing';
        }

        if (!moved) return;

        updateGhost(clientX, clientY);

        const editorRect = editor.getBoundingClientRect();
        const overEditor =
            clientX >= editorRect.left &&
            clientX <= editorRect.right &&
            clientY >= editorRect.top &&
            clientY <= editorRect.bottom;

        if (overEditor) {
            updateIndicator(clientY);
        } else {
            clearIndicator();
        }
    }

    function onUp(e) {
        if (!draggingType) return;

        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('mouseup', onUp);
        document.removeEventListener('touchmove', onMove);
        document.removeEventListener('touchend', onUp);

        document.querySelectorAll('.template-item.template-dragging').forEach(el => el.classList.remove('template-dragging'));
        document.body.classList.remove('is-template-dragging');
        document.body.style.userSelect = '';
        document.body.style.cursor = '';
        removeGhost();

        const type = draggingType;
        draggingType = null;
        const before = insertBefore;
        const didMove = moved;
        sourceItem = null;
        moved = false;
        clearIndicator();

        if (!didMove) return; // клик обработает click-handler

        // Пометить item, чтобы click не сработал повторно
        document.querySelectorAll('.template-item').forEach(it => {
            if (it.getAttribute('data-template') === type) it.dataset.dragMoved = '1';
        });

        insertTemplate(type, before || null);
    }

    function startDragFromItem(item, clientX, clientY) {
        draggingType = item.getAttribute('data-template');
        if (!draggingType) return;
        startX = clientX;
        startY = clientY;
        moved = false;
        sourceItem = item;
        // Не добавляем template-dragging и ghost сразу — только после небольшого движения,
        // чтобы обычный клик оставался мгновенным
    }

    document.querySelectorAll('.template-item').forEach(item => {
        if (item.dataset.sidebarDragBound === '1') return;
        item.dataset.sidebarDragBound = '1';

        // Блокируем нативный HTML5 drag (иначе браузер тащит текст страницы)
        item.setAttribute('draggable', 'false');
        item.addEventListener('dragstart', function(e) {
            e.preventDefault();
            e.stopPropagation();
            return false;
        });

        item.addEventListener('mousedown', function(e) {
            if (e.button !== 0) return;
            // Важно: предотвращаем нативное выделение/перетаскивание текста страницы
            e.preventDefault();
            e.stopPropagation();
            startDragFromItem(item, e.clientX, e.clientY);
            document.addEventListener('mousemove', onMove);
            document.addEventListener('mouseup', onUp);
        });

        item.addEventListener('touchstart', function(e) {
            if (!e.touches || !e.touches[0]) return;
            // Не preventDefault здесь — иначе клик/тап может сломаться; блокируем в touchmove
            startDragFromItem(item, e.touches[0].clientX, e.touches[0].clientY);
            document.addEventListener('touchmove', onMove, { passive: false });
            document.addEventListener('touchend', onUp);
        }, { passive: true });
    });
}

// Экспорт в глобальную область (переходный период)
window.initSidebarTemplateDrag = initSidebarTemplateDrag;
