let draggedElement = null;
let isDragging = false;
let dragStartX = 0;
let dragStartY = 0;

// Инициализация перетаскивания для конкретного элемента
function initDragForElement(element) {
    const dragHandle = element.querySelector('.drag-handle');
    
    if (!dragHandle) {
        console.warn('Drag handle not found for element:', element);
        return;
    }
    
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
    });
    
    // Предотвращаем перетаскивание за сам блок (только за ручку)
    element.addEventListener('mousedown', function(e) {
        if (!e.target.closest('.drag-handle') && 
            !e.target.closest('[contenteditable="true"]') &&
            !e.target.closest('.block-actions') &&
            !e.target.closest('.block-settings') &&
            !e.target.closest('.settings-panel')) {
            e.preventDefault();
            e.stopPropagation();
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
    const nestedAreas = element.querySelectorAll('.nested-content, .nested-editor, .warning-content-area, .success-content-area, .note-content-area');
    
    nestedAreas.forEach(area => {
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

// Начать перетаскивание - БЕЗ ВИЗУАЛЬНОГО ПРИЗРАКА
function startDrag(element, e) {
    draggedElement = element;
    isDragging = true;
    dragStartX = e.clientX;
    dragStartY = e.clientY;
    
    // Сохраняем ссылку на перетаскиваемый блок для вложенных областей
    window.currentDraggedBlock = element;
    
    // Минимальные визуальные эффекты
    element.classList.add('dragging');
    element.style.opacity = '0.8';
    element.style.zIndex = '1000';
    
    // Добавляем глобальные обработчики
    document.addEventListener('mousemove', handleDrag);
    document.addEventListener('touchmove', handleTouchMove);
    document.addEventListener('mouseup', stopDrag);
    document.addEventListener('touchend', stopDrag);
    
    // Предотвращаем выделение текста во время перетаскивания
    document.body.style.userSelect = 'none';
}

// Обработка перемещения мыши
function handleDrag(e) {
    if (!isDragging || !draggedElement) return;
    
    e.preventDefault();
    updateDragPosition(e.clientX, e.clientY);
}

// Обработка перемещения touch
function handleTouchMove(e) {
    if (!isDragging || !draggedElement) return;
    
    e.preventDefault();
    if (e.touches.length > 0) {
        updateDragPosition(e.touches[0].clientX, e.touches[0].clientY);
    }
}

// Обновление позиции перетаскивания - СОХРАНЯЕМ ТРАНСФОРМАЦИИ
function updateDragPosition(clientX, clientY) {
    if (!draggedElement) return;
    
    const deltaX = clientX - dragStartX;
    const deltaY = clientY - dragStartY;
    
    // Перемещаем элемент с трансформацией
    draggedElement.style.transform = `translate(${deltaX}px, ${deltaY}px)`;
    draggedElement.style.cursor = 'grabbing';
    
    // Обновляем визуальные подсказки для других блоков и вложенных областей
    updateDropZones(clientX, clientY);
}

// Обновление зон сброса - СОХРАНЯЕМ ВЛОЖЕННЫЕ ОБЛАСТИ
function updateDropZones(clientX, clientY) {
    // Сбрасываем все предыдущие состояния
    document.querySelectorAll('.block').forEach(block => {
        block.classList.remove('drag-over', 'drop-above', 'drop-below', 'drop-inside');
    });
    
    document.querySelectorAll('.nested-content, .nested-editor').forEach(area => {
        area.classList.remove('drag-over-nested');
    });
    
    // Находим элементы под курсором
    const elementsUnderCursor = document.elementsFromPoint(clientX, clientY);
    
    // Сначала проверяем вложенные области
    const nestedArea = elementsUnderCursor.find(el => 
        el.classList.contains('nested-content') || 
        el.classList.contains('nested-editor') ||
        el.classList.contains('warning-content-area') ||
        el.classList.contains('success-content-area') ||
        el.classList.contains('note-content-area')
    );
    
    if (nestedArea && !nestedArea.contains(draggedElement)) {
        nestedArea.classList.add('drag-over-nested');
        return;
    }
    
    // Затем проверяем обычные блоки
    const targetBlock = elementsUnderCursor.find(el => 
        el.classList.contains('block') && 
        el !== draggedElement &&
        !el.contains(draggedElement)
    );
    
    if (targetBlock) {
        const rect = targetBlock.getBoundingClientRect();
        const midpoint = rect.top + rect.height / 2;
        const isNearTop = clientY < rect.top + rect.height * 0.3;
        const isNearBottom = clientY > rect.top + rect.height * 0.7;
        
        targetBlock.classList.add('drag-over');
        
        if (isNearTop) {
            targetBlock.classList.add('drop-above');
        } else if (isNearBottom) {
            targetBlock.classList.add('drop-below');
        } else {
            targetBlock.classList.add('drop-inside');
        }
    }
}

// Остановка перетаскивания - ВАЖНО: сбрасываем трансформацию
function stopDrag(e) {
    if (!isDragging || !draggedElement) return;
    
    isDragging = false;
    
    // ВАЖНО: Сбрасываем трансформацию
    draggedElement.style.transform = '';
    
    // Восстанавливаем стили
    draggedElement.classList.remove('dragging');
    draggedElement.style.opacity = '';
    draggedElement.style.zIndex = '';
    draggedElement.style.cursor = '';
    
    // Убираем визуальные подсказки
    document.querySelectorAll('.block').forEach(block => {
        block.classList.remove('drag-over', 'drop-above', 'drop-below', 'drop-inside');
    });
    
    document.querySelectorAll('.nested-content, .nested-editor').forEach(area => {
        area.classList.remove('drag-over-nested');
    });
    
    // Находим конечную позицию
    const clientX = e.clientX || (e.changedTouches && e.changedTouches[0].clientX);
    const clientY = e.clientY || (e.changedTouches && e.changedTouches[0].clientY);
    
    if (clientX && clientY) {
        performDrop(clientX, clientY);
    }
    
    // Убираем глобальные обработчики
    document.removeEventListener('mousemove', handleDrag);
    document.removeEventListener('touchmove', handleTouchMove);
    document.removeEventListener('mouseup', stopDrag);
    document.removeEventListener('touchend', stopDrag);
    
    // Восстанавливаем выделение текста
    document.body.style.userSelect = '';
    
    window.currentDraggedBlock = null;
    draggedElement = null;
}

// Выполнить сброс элемента - СОХРАНЯЕМ ЛОГИКУ ВЛОЖЕННЫХ ОБЛАСТЕЙ
function performDrop(clientX, clientY) {
    const elementsUnderCursor = document.elementsFromPoint(clientX, clientY);
    
    // Сначала проверяем вложенные области
    const nestedArea = elementsUnderCursor.find(el => 
        el.classList.contains('nested-content') || 
        el.classList.contains('nested-editor') ||
        el.classList.contains('warning-content-area') ||
        el.classList.contains('success-content-area') ||
        el.classList.contains('note-content-area')
    );
    
    if (nestedArea && !nestedArea.contains(draggedElement)) {
        // Вставляем во вложенную область
        nestedArea.appendChild(draggedElement);
        showNotification('Блок перемещен во вложенную область', 'success');
        return;
    }
    
    // Затем проверяем обычные блоки
    const targetBlock = elementsUnderCursor.find(el => 
        el.classList.contains('block') && 
        el !== draggedElement &&
        !el.contains(draggedElement)
    );
    
    const editor = document.getElementById('editor');
    
    if (targetBlock && editor) {
        const rect = targetBlock.getBoundingClientRect();
        const isNearTop = clientY < rect.top + rect.height * 0.3;
        const isNearBottom = clientY > rect.top + rect.height * 0.7;
        
        if (isNearTop) {
            // Вставляем выше целевого блока
            editor.insertBefore(draggedElement, targetBlock);
            showNotification('Блок перемещен выше', 'success');
        } else if (isNearBottom) {
            // Вставляем ниже целевого блока
            editor.insertBefore(draggedElement, targetBlock.nextSibling);
            showNotification('Блок перемещен ниже', 'success');
        } else {
            // Вставляем внутрь (если это поддерживается)
            const contentArea = targetBlock.querySelector('.nested-content, .nested-editor, .warning-content-area, .success-content-area, .note-content-area');
            if (contentArea) {
                contentArea.appendChild(draggedElement);
                showNotification('Блок перемещен внутрь', 'success');
            } else {
                // По умолчанию вставляем ниже
                editor.insertBefore(draggedElement, targetBlock.nextSibling);
                showNotification('Блок перемещен', 'success');
            }
        }
    } else if (editor) {
        // Если перетащили в пустое место редактора, добавляем в конец
        editor.appendChild(draggedElement);
        showNotification('Блок перемещен в конец', 'success');
    }
}

// Инициализация перетаскивания блоков
function initDragAndDrop() {
    const editor = document.getElementById('editor');
    
    if (!editor) {
        console.warn('Editor not found');
        return;
    }
    
    // Обработчики для элементов с классом block
    document.querySelectorAll('.block').forEach(block => {
        initDragForElement(block);
    });
    
    // Автоматическая переинициализация при добавлении новых блоков
    setupDragObserver();
}

// Наблюдатель за добавлением новых блоков
function setupDragObserver() {
    const observer = new MutationObserver(function(mutations) {
        mutations.forEach(function(mutation) {
            mutation.addedNodes.forEach(function(node) {
                if (node.nodeType === 1 && node.classList && node.classList.contains('block')) {
                    initDragForElement(node);
                }
            });
        });
    });
    
    const editor = document.getElementById('editor');
    if (editor) {
        observer.observe(editor, {
            childList: true,
            subtree: true
        });
    }
}

// Инициализация при загрузке
document.addEventListener('DOMContentLoaded', function() {
    initDragAndDrop();
    setupDragObserver();
});