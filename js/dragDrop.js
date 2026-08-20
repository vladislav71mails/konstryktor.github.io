let draggedElement = null;
let draggedGroup = null; // массив блоков при multi-drag
let isDragging = false;
let dragStartX = 0;
let dragStartY = 0;
let blockGhost = null;
let placeholders = []; // placeholder'ы на месте перетаскиваемых блоков
let autoScrollRAF = null;
let lastClientX = 0;
let lastClientY = 0;

const CONTAINER_SELECTORS = '.nested-content, .nested-editor, .warning-content-area, .success-content-area, .note-content-area, .spoiler-content, .faq-items';

// Инициализация перетаскивания для конкретного элемента
function initDragForElement(element) {
    const dragHandle = element.querySelector('.drag-handle');
    
    if (!dragHandle) {
        console.warn('Drag handle not found for element:', element);
        return;
    }

    // Не вешаем обработчики повторно
    if (dragHandle.dataset.dragBound === '1') return;
    dragHandle.dataset.dragBound = '1';
    
    // Обработчики для ручки перетаскивания
    dragHandle.addEventListener('mousedown', function(e) {
        e.preventDefault();
        e.stopPropagation();
        startDrag(element, e);
    });
    
    dragHandle.addEventListener('touchstart', function(e) {
        e.preventDefault();
        e.stopPropagation();
        startDrag(element, e.touches[0]);
    }, { passive: false });
    
    // Предотвращаем перетаскивание за сам блок (только за ручку)
    element.addEventListener('mousedown', function(e) {
        if (!e.target.closest('.drag-handle') && 
            !e.target.closest('[contenteditable="true"]') &&
            !e.target.closest('.block-actions') &&
            !e.target.closest('.block-settings') &&
            !e.target.closest('.settings-panel') &&
            !e.target.closest('.image-resize-handle')) {
            // не блокируем Ctrl/Shift-клик для выделения
            if (e.ctrlKey || e.metaKey || e.shiftKey) return;
        }
    });
    
    element.addEventListener('dragstart', function(e) {
        e.preventDefault();
        return false;
    });
    
    // Добавляем возможность перетаскивания вложенных областей
    setupNestedDragAreas(element);
}

// Настройка перетаскивания для вложенных областей
function setupNestedDragAreas(element) {
    const nestedAreas = element.querySelectorAll(CONTAINER_SELECTORS);
    
    nestedAreas.forEach(area => {
        if (area.dataset.nestedDragBound === '1') return;
        area.dataset.nestedDragBound = '1';

        area.addEventListener('dragover', function(e) {
            e.preventDefault();
            this.classList.add('drag-over-nested');
        });
        
        area.addEventListener('dragleave', function(e) {
            if (!this.contains(e.relatedTarget)) {
                this.classList.remove('drag-over-nested');
            }
        });
        
        area.addEventListener('drop', function(e) {
            e.preventDefault();
            this.classList.remove('drag-over-nested');
            
            if (window.currentDraggedBlock) {
                this.appendChild(window.currentDraggedBlock);
                showNotification('Блок перемещен во вложенную область', 'success');
                window.currentDraggedBlock = null;
            }
        });
    });
}

function getSelectedBlocksInOrder() {
    const editor = document.getElementById('editor');
    if (!editor) return [];
    const all = Array.from(editor.querySelectorAll('.block'));
    const selected = all.filter(b => b.classList.contains('selected'));
    return selected;
}

function isContainerBlock(block) {
    if (!block) return false;
    return !!block.querySelector(CONTAINER_SELECTORS);
}

// ——— Ghost (как у сайдбара) ———
function createBlockGhost(sourceBlock, clientX, clientY) {
    removeBlockGhost();
    blockGhost = sourceBlock.cloneNode(true);
    blockGhost.classList.add('block-drag-ghost');
    blockGhost.classList.remove('dragging', 'dragging-multi', 'selected', 'drag-over', 'drop-above', 'drop-below', 'drop-inside');
    blockGhost.querySelectorAll('.settings-panel, .block-actions').forEach(el => el.remove());
    const rect = sourceBlock.getBoundingClientRect();
    blockGhost.style.cssText = `
        position: fixed;
        left: ${clientX + 12}px;
        top: ${clientY + 12}px;
        width: ${Math.min(rect.width, 480)}px;
        max-height: 200px;
        overflow: hidden;
        pointer-events: none;
        z-index: 10000;
        margin: 0;
        opacity: 0.92;
        box-shadow: 0 12px 32px rgba(0,0,0,0.22);
        transform: none !important;
    `;
    document.body.appendChild(blockGhost);
}

function updateBlockGhost(clientX, clientY) {
    if (!blockGhost) return;
    blockGhost.style.left = (clientX + 12) + 'px';
    blockGhost.style.top = (clientY + 12) + 'px';
}

function removeBlockGhost() {
    if (blockGhost && blockGhost.parentNode) blockGhost.parentNode.removeChild(blockGhost);
    blockGhost = null;
}

// ——— Placeholders той же высоты ———
function createPlaceholders() {
    removePlaceholders();
    if (!draggedGroup || !draggedGroup.length) return;

    draggedGroup.forEach(block => {
        const ph = document.createElement('div');
        ph.className = 'block-drag-placeholder';
        const h = block.offsetHeight;
        ph.style.height = h + 'px';
        ph.style.minHeight = h + 'px';
        ph.dataset.forBlock = block.dataset.blockId || '';
        block.parentNode.insertBefore(ph, block);
        placeholders.push(ph);
        // Убираем оригинал из потока
        block.style.display = 'none';
    });
}

function removePlaceholders() {
    placeholders.forEach(ph => {
        if (ph.parentNode) ph.parentNode.removeChild(ph);
    });
    placeholders = [];
    if (draggedGroup) {
        draggedGroup.forEach(b => {
            b.style.display = '';
        });
    }
}

// ——— Автоскролл у краёв editor-area ———
function handleAutoScroll(clientY) {
    const editorArea = document.querySelector('.editor-area') || document.getElementById('editor');
    if (!editorArea) return;

    const rect = editorArea.getBoundingClientRect();
    const edge = 56; // px от края
    const maxSpeed = 18;

    let dy = 0;
    if (clientY < rect.top + edge) {
        const t = 1 - (clientY - rect.top) / edge;
        dy = -Math.ceil(maxSpeed * Math.max(0, Math.min(1, t)));
    } else if (clientY > rect.bottom - edge) {
        const t = 1 - (rect.bottom - clientY) / edge;
        dy = Math.ceil(maxSpeed * Math.max(0, Math.min(1, t)));
    }

    if (dy !== 0) {
        editorArea.scrollTop += dy;
        // Также прокручиваем window, если editor-area не скроллится сам
        if (editorArea.scrollHeight <= editorArea.clientHeight) {
            window.scrollBy(0, dy);
        }
    }
}

function startAutoScrollLoop() {
    stopAutoScrollLoop();
    function tick() {
        if (!isDragging) return;
        handleAutoScroll(lastClientY);
        autoScrollRAF = requestAnimationFrame(tick);
    }
    autoScrollRAF = requestAnimationFrame(tick);
}

function stopAutoScrollLoop() {
    if (autoScrollRAF) {
        cancelAnimationFrame(autoScrollRAF);
        autoScrollRAF = null;
    }
}

// Начать перетаскивание
function startDrag(element, e) {
    // Если блок выделен вместе с другими — тащим группу
    const selected = getSelectedBlocksInOrder();
    const isMulti = selected.length > 1 && element.classList.contains('selected');

    draggedElement = element;
    draggedGroup = isMulti ? selected.slice() : [element];
    isDragging = true;
    dragStartX = e.clientX;
    dragStartY = e.clientY;
    lastClientX = e.clientX;
    lastClientY = e.clientY;
    
    window.currentDraggedBlock = element;
    
    // Создаём placeholder'ы и скрываем оригиналы
    createPlaceholders();

    // Ghost поверх курсора
    createBlockGhost(element, e.clientX, e.clientY);

    draggedGroup.forEach(b => {
        b.classList.add('dragging');
        if (draggedGroup.length > 1) b.classList.add('dragging-multi');
    });
    
    document.addEventListener('mousemove', handleDrag);
    document.addEventListener('touchmove', handleTouchMove, { passive: false });
    document.addEventListener('mouseup', stopDrag);
    document.addEventListener('touchend', stopDrag);
    
    document.body.style.userSelect = 'none';
    document.body.classList.add('is-block-dragging');

    startAutoScrollLoop();
}

function handleDrag(e) {
    if (!isDragging || !draggedElement) return;
    e.preventDefault();
    lastClientX = e.clientX;
    lastClientY = e.clientY;
    updateDragPosition(e.clientX, e.clientY);
}

function handleTouchMove(e) {
    if (!isDragging || !draggedElement) return;
    e.preventDefault();
    if (e.touches.length > 0) {
        lastClientX = e.touches[0].clientX;
        lastClientY = e.touches[0].clientY;
        updateDragPosition(e.touches[0].clientX, e.touches[0].clientY);
    }
}

function updateDragPosition(clientX, clientY) {
    if (!draggedElement) return;
    updateBlockGhost(clientX, clientY);
    updateDropZones(clientX, clientY);
}

function clearDropZoneClasses() {
    document.querySelectorAll('.block').forEach(block => {
        block.classList.remove('drag-over', 'drop-above', 'drop-below', 'drop-inside');
    });
    
    document.querySelectorAll(CONTAINER_SELECTORS).forEach(area => {
        area.classList.remove('drag-over-nested');
    });
}

function updateDropZones(clientX, clientY) {
    clearDropZoneClasses();
    
    const elementsUnderCursor = document.elementsFromPoint(clientX, clientY);
    const groupSet = new Set(draggedGroup || []);
    
    // Сначала проверяем nested-зоны (только контейнеры)
    const nestedArea = elementsUnderCursor.find(el => 
        el.matches && el.matches(CONTAINER_SELECTORS) &&
        !groupSet.has(el.closest('.block'))
    );
    
    if (nestedArea && draggedGroup && !draggedGroup.some(b => nestedArea.contains(b))) {
        nestedArea.classList.add('drag-over-nested');
        return;
    }
    
    // Ищем целевой блок (не из группы, не placeholder)
    const targetBlock = elementsUnderCursor.find(el => 
        el.classList && el.classList.contains('block') && 
        !el.classList.contains('block-drag-placeholder') &&
        !groupSet.has(el) &&
        !draggedGroup.some(b => b.contains(el) || el.contains(b))
    );
    
    if (targetBlock) {
        const rect = targetBlock.getBoundingClientRect();
        const isNearTop = clientY < rect.top + rect.height * 0.35;
        const isNearBottom = clientY > rect.top + rect.height * 0.65;
        
        targetBlock.classList.add('drag-over');
        
        if (isNearTop) {
            targetBlock.classList.add('drop-above');
        } else if (isNearBottom) {
            targetBlock.classList.add('drop-below');
        } else if (isContainerBlock(targetBlock)) {
            // drop-inside только у контейнеров
            targetBlock.classList.add('drop-inside');
        } else {
            // у обычного текста — считаем как drop-below
            targetBlock.classList.add('drop-below');
        }
    }
}

function stopDrag(e) {
    if (!isDragging || !draggedElement) return;
    
    isDragging = false;
    stopAutoScrollLoop();
    
    const clientX = e.clientX || (e.changedTouches && e.changedTouches[0] && e.changedTouches[0].clientX) || lastClientX;
    const clientY = e.clientY || (e.changedTouches && e.changedTouches[0] && e.changedTouches[0].clientY) || lastClientY;
    
    // Восстанавливаем оригиналы перед drop (чтобы insertBefore работал корректно)
    removePlaceholders();
    removeBlockGhost();

    draggedGroup.forEach(b => {
        b.style.transform = '';
        b.style.display = '';
        b.classList.remove('dragging', 'dragging-multi');
        b.style.opacity = '';
        b.style.zIndex = '';
        b.style.cursor = '';
    });
    
    clearDropZoneClasses();
    
    if (clientX != null && clientY != null) {
        performDrop(clientX, clientY);
    }
    
    document.removeEventListener('mousemove', handleDrag);
    document.removeEventListener('touchmove', handleTouchMove);
    document.removeEventListener('mouseup', stopDrag);
    document.removeEventListener('touchend', stopDrag);
    
    document.body.style.userSelect = '';
    document.body.classList.remove('is-block-dragging');
    
    window.currentDraggedBlock = null;
    draggedElement = null;
    draggedGroup = null;

    // Обновляем empty-state после перемещения
    if (typeof updateEditorEmptyState === 'function') {
        updateEditorEmptyState();
    }
}

function performDrop(clientX, clientY) {
    if (!draggedGroup || draggedGroup.length === 0) return;
    if (typeof snapshotEditor === 'function') snapshotEditor('before-drag-drop');

    const elementsUnderCursor = document.elementsFromPoint(clientX, clientY);
    const groupSet = new Set(draggedGroup);
    const editor = document.getElementById('editor');
    
    const nestedArea = elementsUnderCursor.find(el => 
        el.matches && el.matches(CONTAINER_SELECTORS) &&
        !groupSet.has(el.closest('.block'))
    );
    
    if (nestedArea && !draggedGroup.some(b => nestedArea.contains(b))) {
        draggedGroup.forEach(b => nestedArea.appendChild(b));
        showNotification(
            draggedGroup.length > 1
                ? `Перемещено блоков во вложенную область: ${draggedGroup.length}`
                : 'Блок перемещен во вложенную область',
            'success'
        );
        return;
    }
    
    const targetBlock = elementsUnderCursor.find(el => 
        el.classList && el.classList.contains('block') && 
        !el.classList.contains('block-drag-placeholder') &&
        !groupSet.has(el) &&
        !draggedGroup.some(b => b.contains(el) || el.contains(b))
    );
    
    if (targetBlock && editor) {
        const rect = targetBlock.getBoundingClientRect();
        const isNearTop = clientY < rect.top + rect.height * 0.35;
        const isNearBottom = clientY > rect.top + rect.height * 0.65;
        const canDropInside = isContainerBlock(targetBlock);
        
        if (isNearTop) {
            const ref = targetBlock;
            draggedGroup.forEach(b => {
                ref.parentNode.insertBefore(b, ref);
            });
            showNotification(
                draggedGroup.length > 1 ? `Перемещено блоков выше: ${draggedGroup.length}` : 'Блок перемещен выше',
                'success'
            );
        } else if (isNearBottom || !canDropInside) {
            let ref = targetBlock.nextSibling;
            draggedGroup.forEach(b => {
                if (ref) {
                    targetBlock.parentNode.insertBefore(b, ref);
                } else {
                    targetBlock.parentNode.appendChild(b);
                }
            });
            showNotification(
                draggedGroup.length > 1 ? `Перемещено блоков ниже: ${draggedGroup.length}` : 'Блок перемещен ниже',
                'success'
            );
        } else {
            // drop-inside только для контейнеров
            const contentArea = targetBlock.querySelector(CONTAINER_SELECTORS);
            if (contentArea) {
                draggedGroup.forEach(b => contentArea.appendChild(b));
                showNotification(
                    draggedGroup.length > 1 ? `Перемещено блоков внутрь: ${draggedGroup.length}` : 'Блок перемещен внутрь',
                    'success'
                );
            } else {
                let ref = targetBlock.nextSibling;
                draggedGroup.forEach(b => {
                    if (ref) {
                        targetBlock.parentNode.insertBefore(b, ref);
                    } else {
                        targetBlock.parentNode.appendChild(b);
                    }
                });
                showNotification(
                    draggedGroup.length > 1 ? `Перемещено блоков: ${draggedGroup.length}` : 'Блок перемещен',
                    'success'
                );
            }
        }
    } else if (editor) {
        draggedGroup.forEach(b => editor.appendChild(b));
        showNotification(
            draggedGroup.length > 1 ? `Перемещено блоков в конец: ${draggedGroup.length}` : 'Блок перемещен в конец',
            'success'
        );
    }
}

function initDragAndDrop() {
    const editor = document.getElementById('editor');
    
    if (!editor) {
        console.warn('Editor not found');
        return;
    }
    
    document.querySelectorAll('.block').forEach(block => {
        initDragForElement(block);
    });
    
    setupDragObserver();
}

function setupDragObserver() {
    const observer = new MutationObserver(function(mutations) {
        mutations.forEach(function(mutation) {
            mutation.addedNodes.forEach(function(node) {
                if (node.nodeType === 1 && node.classList && node.classList.contains('block')) {
                    initDragForElement(node);
                }
                if (node.nodeType === 1 && node.querySelectorAll) {
                    node.querySelectorAll('.block').forEach(initDragForElement);
                }
            });
        });
        // Обновляем empty-state при изменениях
        if (typeof updateEditorEmptyState === 'function') {
            updateEditorEmptyState();
        }
    });
    
    const editor = document.getElementById('editor');
    if (editor) {
        observer.observe(editor, {
            childList: true,
            subtree: true
        });
    }
}

document.addEventListener('DOMContentLoaded', function() {
    initDragAndDrop();
    setupDragObserver();
});
