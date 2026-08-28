// Добавление обработчиков событий для блока
function addBlockEventListeners(block) {
    // Нативный HTML5 drag мешает выделению текста — используем только ручку
    block.setAttribute('draggable', 'false');
    block.querySelectorAll('.edit-block').forEach(btn => btn.remove());

    // Кнопка удаления
    const deleteBtn = block.querySelector('.delete-block');
    if (deleteBtn) {
        deleteBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            if (confirm('Удалить этот блок?')) {
                snapshotEditor('before-delete-block');
                block.remove();
                showNotification('Блок удален', 'success');
                updateEditorEmptyState();
            }
        });
    }
    
    // Кнопка-замочек удалена из функционала — редактирование всегда доступно
    block.querySelectorAll('.edit-block').forEach(btn => btn.remove());
    
    // Кнопка копирования
    const copyBtn = block.querySelector('.copy-block');
    if (copyBtn) {
        copyBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            copyBlock(block);
        });
    }
    // Кнопка экспорта HTML - НОВАЯ
const exportBtn = block.querySelector('.export-html-block');
if (exportBtn) {
    exportBtn.addEventListener('click', function(e) {
        e.stopPropagation();
        exportBlockHTMLModal(block);
    });
}
    
    // Кнопка настроек - ПЕРЕРАБОТАННАЯ ВЕРСИЯ
    const settingsBtn = block.querySelector('.settings-block');
    if (settingsBtn) {
        settingsBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            e.preventDefault();
            
            const settingsPanel = block.querySelector('.settings-panel');
            
            // Скрываем все другие панели
            document.querySelectorAll('.settings-panel').forEach(panel => {
                if (panel !== settingsPanel) {
                    panel.style.display = 'none';
                }
            });
            
            // Переключаем текущую панель
            if (settingsPanel.style.display === 'block') {
                settingsPanel.style.display = 'none';
            } else {
                settingsPanel.style.display = 'block';
                setupSettingsPanel(block);
                // КЛЮЧЕВОЕ: Загружаем текущие цвета в инпуты!
                loadCurrentColorsToPanel(block);
                
                // Блокируем прокрутку body когда открыта панель
                document.body.style.overflow = 'hidden';
                
                // Добавляем обработчик для закрытия при клике вне панели
                setTimeout(() => {
                    const closeHandler = function(e) {
                        if (!settingsPanel.contains(e.target) && 
                            !e.target.closest('.settings-block') &&
                            settingsPanel.style.display === 'block') {
                            
                            settingsPanel.style.display = 'none';
                            document.body.style.overflow = '';
                            document.removeEventListener('click', closeHandler);
                        }
                    };
                    
                    document.addEventListener('click', closeHandler);
                }, 10);
            }
        });
    }
    
    // Кнопка вставки макроса - ИСПРАВЛЕННАЯ
    const insertMacroBtn = block.querySelector('.insert-macro-btn');
    if (insertMacroBtn) {
        insertMacroBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            e.preventDefault();
            showMacroSelection(block);
        });
    }
    
    // Применение настроек - ИСПРАВЛЕННАЯ (закрывает панель после применения)
    const applyBtn = block.querySelector('.apply-settings');
    if (applyBtn) {
        applyBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            applyBlockSettings(block); // Используем старую функцию для полного применения
            
            // Закрываем панель после применения
            const settingsPanel = block.querySelector('.settings-panel');
            if (settingsPanel) {
                settingsPanel.style.display = 'none';
                settingsPanel.classList.remove('always-visible');
            }
            
            showNotification('Настройки применены', 'success');
        });
    }

    // Добавляем обработчик для сброса по умолчанию
    const resetBtn = block.querySelector('.reset-defaults');
    if (resetBtn) {
        resetBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            resetToDefaultSettings(block); // Используем старую функцию сброса
        });
    }

    // Редактирование всегда включено — без замочка и protection-overlay
    const editableContent = block.querySelector('.editable-content');
    if (editableContent) {
        editableContent.removeAttribute('data-locked');
        enableContentEditing(editableContent);
        // Убираем возможные leftover-оверлеи защиты
        editableContent.querySelectorAll('.protection-overlay').forEach(el => el.remove());
        editableContent.querySelectorAll('.protected-element').forEach(el => {
            el.classList.remove('protected-element');
            el.style.userSelect = '';
            el.style.cursor = '';
        });
        
        // Клик по контенту — выделяем блок; текст выделяется нативно
        editableContent.addEventListener('mousedown', function(e) {
            // Не даём блоку «перехватить» выделение как картинку
            if (e.target.closest('.block-actions, .block-settings, .settings-panel, .drag-handle, .insert-macro-btn')) {
                return;
            }
            e.stopPropagation();
        });
        editableContent.addEventListener('click', function(e) {
            if (e.target.closest('.block-actions, .block-settings, .settings-panel, .drag-handle, .insert-macro-btn')) {
                return;
            }
            block.classList.add('selected');
            const target = e.target;
            const isEditableTarget = target.isContentEditable || target.closest('[contenteditable="true"]');
            if (!isEditableTarget) {
                focusSafeEditingArea(editableContent);
            }
        });
        
        editableContent.addEventListener('focus', function() {
            block.classList.add('selected');
        }, true);
    }
    
    // Обработчики для панелей
    setupBlockPanels(block);
    
    // Инициализация перетаскивания для блока
    initDragForElement(block);

    // Управление таблицей (строки/столбцы)
    if (typeof setupTableControls === 'function') {
        setupTableControls(block);
    }

    // Ресайз изображений в редакторе
    setupImageResizeForBlock(block);
}

// ВКЛЮЧИТЬ редактирование контента (всегда)
function enableContentEditing(editableContent) {
    editableContent.setAttribute('contenteditable', 'true');
    editableContent.style.outline = '';
    editableContent.style.outlineOffset = '';
    editableContent.style.cursor = 'text';
    editableContent.style.userSelect = 'text';
    editableContent.style.webkitUserSelect = 'text';
    
    // Разрешаем редактирование текстовых элементов (без protection-overlay)
    enableSafeEditing(editableContent);
}

// Оставлено для совместимости — больше не блокируем контент
function disableContentEditing(editableContent) {
    // no-op: редактирование всегда доступно
    enableContentEditing(editableContent);
}
// Экспорт HTML блока в модальное окно
function exportBlockHTMLModal(block) {
    // Получаем чистый HTML блока
    const cleanHTML = getCleanBlockHTML(block);
    
    // Создаем модальное окно
    const modal = document.createElement('div');
    modal.className = 'modal active';
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h2>Экспорт HTML</h2>
                <button class="close-modal">×</button>
            </div>
            <textarea class="export-area" id="export-area" readonly="">${escapeHTML(cleanHTML)}</textarea>
            <button class="btn" id="copy-btn">Копировать в буфер обмена</button>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Обработчик закрытия
    modal.querySelector('.close-modal').addEventListener('click', () => {
        modal.remove();
    });
    
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.remove();
        }
    });
    
    // Обработчик копирования
    modal.querySelector('#copy-btn').addEventListener('click', () => {
        const textarea = modal.querySelector('#export-area');
        textarea.select();
        
        try {
            navigator.clipboard.writeText(cleanHTML).then(() => {
                showNotification('HTML скопирован в буфер обмена', 'success');
            });
        } catch (err) {
            // Fallback для старых браузеров
            document.execCommand('copy');
            showNotification('HTML скопирован в буфер обмена', 'success');
        }
    });
    
    // Авто-выделение текста
    setTimeout(() => {
        const textarea = modal.querySelector('#export-area');
        if (textarea) {
            textarea.focus();
            textarea.select();
        }
    }, 100);
}

// Получение чистого HTML блока
function getCleanBlockHTML(block) {
    const blockClone = block.cloneNode(true);
    
    // Удаляем все элементы управления
    const elementsToRemove = blockClone.querySelectorAll(
        '.block-actions, .block-settings, .settings-panel, ' +
        '.drag-handle, .insert-macro-btn, .nested-editor, ' +
        '.protection-overlay, button, .block-controls, .table-toolbar, ' +
        '.image-resize-handle, .image-resize-size-label'
    );
    elementsToRemove.forEach(el => el.remove());

    // Разворачиваем image-resize-wrap: переносим ширину на img
    blockClone.querySelectorAll('.image-resize-wrap').forEach(function(wrap) {
        const img = wrap.querySelector('img');
        if (img && wrap.style.width) {
            img.style.width = wrap.style.width;
            img.style.maxWidth = '100%';
            img.style.height = 'auto';
        }
        while (wrap.firstChild) {
            wrap.parentNode.insertBefore(wrap.firstChild, wrap);
        }
        wrap.remove();
    });
    
    // Очищаем все data-атрибуты и стили редактора
    const allElements = blockClone.querySelectorAll('*');
    allElements.forEach(el => {
        // Удаляем атрибуты редактора
        el.removeAttribute('contenteditable');
        el.removeAttribute('data-original-display');
        el.removeAttribute('data-locked');
        el.removeAttribute('data-placeholder');
        el.removeAttribute('draggable');
        el.removeAttribute('tabindex');
        
        // Удаляем inline-стили редактора
        if (el.style.outline) el.style.outline = '';
        if (el.style.minHeight) el.style.minHeight = '';
        if (el.style.userSelect) el.style.userSelect = '';
        if (el.style.cursor) el.style.cursor = '';
        if (el.style.position === 'relative') {
            const hasOverlay = el.querySelector('.protection-overlay');
            if (!hasOverlay) el.style.position = '';
        }
        
        // Удаляем классы редактора
        el.classList.remove(
            'protected-element', 
            'selected',
            'dragging',
            'drag-over'
        );
    });
    
    // Очищаем атрибуты самого блока
    blockClone.removeAttribute('id');
    blockClone.removeAttribute('draggable');
    blockClone.removeAttribute('data-block-id');
    blockClone.classList.remove('selected', 'dragging', 'drag-over');
    
    // Форматируем HTML с отступами
    return formatHTML(blockClone.outerHTML);
}

// Форматирование HTML с отступами
function formatHTML(html) {
    let formatted = '';
    let indent = '';
    
    html.split(/>\s*</).forEach(node => {
        if (node.match(/^\/\w/)) {
            indent = indent.substring(2);
        }
        
        formatted += indent + '<' + node + '>\r\n';
        
        if (node.match(/^<?\w[^>]*[^\/]$/) && !node.startsWith('input') && !node.startsWith('br') && !node.startsWith('img')) {
            indent += '  ';
        }
    });
    
    return formatted.substring(1, formatted.length - 3);
}

// Экранирование HTML для textarea
function escapeHTML(html) {
    return html
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}
// РАЗРЕШИТЬ редактирование для безопасных элементов
function enableSafeEditing(editableContent) {
    // Безопасные элементы для редактирования - РАСШИРЕННЫЙ СПИСОК
    const safeSelectors = [
        '.spoiler-content', '.warning-text', '.success-text', '.note-text',
        '.numbered-content', '.steps-list', '.comparison-list',
        '.quote-text', '.code-content', '.link-text-container',
        '.image-caption', '.procedure-steps', '.checklist-description',
        '.system-paths-container', '.developer-note-container',
        
        // ДОБАВЛЕНО: Разрешаем редактировать заголовки
        '.spoiler-header', '.warning-header', '.success-header', '.note-header',
        '.spoiler-title', '.warning-title', '.success-title', '.note-title',
        '.numbered-title', '.steps-title', '.comparison-title',
        '.config-title', '.quote-author',
        
        // ДОБАВЛЕНО: Разрешаем редактировать нумерацию
        '.step-number', '.number-circle',
        
        // ДОБАВЛЕНО: Разрешаем редактировать текст в заголовках
        'summary', 'h3', 'h4', 'h5', 'h6',
        // Кнопки-ссылки
        '.link-button', 'a.link-button',
        // Блок 1С
        '.config-title', '.config-summary', '.config-content', '.config-sections'
    ];
    
    safeSelectors.forEach(selector => {
        const elements = editableContent.querySelectorAll(selector);
        elements.forEach(element => {
            element.setAttribute('contenteditable', 'true');
            element.style.userSelect = 'text';
            element.style.cursor = 'text';
            
            // Разрешаем редактирование для всех текстовых дочерних элементов
            const childElements = element.querySelectorAll('*');
            childElements.forEach(child => {
                // Разрешаем редактирование только для текстовых элементов
                if (!child.classList.contains('drag-handle') && 
                    !child.classList.contains('block-actions') &&
                    !child.classList.contains('block-settings') &&
                    !child.classList.contains('settings-panel')) {
                    child.setAttribute('contenteditable', 'true');
                    child.style.userSelect = 'text';
                    child.style.cursor = 'text';
                }
            });
        });
    });
    
    // Не навешиваем protection-overlay — редактирование свободное
    // Только UI-хром внутри блока не должен быть contenteditable
    editableContent.querySelectorAll('.drag-handle, .block-actions, .block-settings, .settings-panel, .protection-overlay').forEach(el => {
        if (el.classList.contains('protection-overlay')) {
            el.remove();
            return;
        }
        el.setAttribute('contenteditable', 'false');
    });
}

// Совместимость: защита отключена (без оверлеев-замочков)
function protectStructuralElements(editableContent) {
    if (!editableContent) return;
    editableContent.querySelectorAll('.protection-overlay').forEach(el => el.remove());
    editableContent.querySelectorAll('.protected-element').forEach(el => {
        el.classList.remove('protected-element');
        el.style.userSelect = '';
        el.style.cursor = '';
    });
}

// СНЯТИЕ защиты с элементов
function unprotectStructuralElements(editableContent) {
    const protectedElements = editableContent.querySelectorAll('.protected-element');
    protectedElements.forEach(element => {
        element.classList.remove('protected-element');
        element.style.userSelect = '';
        element.style.cursor = '';
        
        // Убираем индикаторы защиты
        const overlay = element.querySelector('.protection-overlay');
        if (overlay) {
            overlay.remove();
        }
    });
}

// Фокусировка на безопасной области для редактирования
function focusSafeEditingArea(editableContent) {
    // Ищем безопасные для редактирования элементы
    const safeElements = editableContent.querySelectorAll(
        '.spoiler-content, .warning-text, .success-text, .note-text, ' +
        '.numbered-content, .steps-list, .comparison-list, ' +
        '.quote-text, .code-content, .link-text-container, ' +
        '.image-caption, .procedure-steps, .checklist-description, ' +
        '.spoiler-header, .warning-header, .success-header, .note-header, ' +
        '.spoiler-title, .warning-title, .success-title, .note-title, ' +
        '.numbered-title, .steps-title, .comparison-title, ' +
        '.step-number, .number-circle, summary, h3, h4, h5, h6'
    );
    
    if (safeElements.length > 0) {
        const firstSafeElement = safeElements[0];
        setCaretToEnd(firstSafeElement);
    } else {
        // Если безопасных элементов нет, фокусируемся на основном контенте
        const range = document.createRange();
        const selection = window.getSelection();
        range.selectNodeContents(editableContent);
        range.collapse(false);
        selection.removeAllRanges();
        selection.addRange(range);
        editableContent.focus();
    }
}

// Установка курсора в конец элемента
function setCaretToEnd(element) {
    const range = document.createRange();
    const selection = window.getSelection();
    range.selectNodeContents(element);
    range.collapse(false);
    selection.removeAllRanges();
    selection.addRange(range);
    element.focus();
}

// УЛУЧШЕННАЯ защита при редактировании
// Защита отключена: редактирование текста свободное, без замочка и оверлеев
function setupProtectedEditing(editableContent) {
    if (!editableContent) return;
    editableContent.querySelectorAll('.protection-overlay').forEach(el => el.remove());
}

// Копирование блока
function copyBlock(originalBlock) {
    snapshotEditor('before-copy-block');
    const clone = originalBlock.cloneNode(true);
    
    if (clone.id) {
        clone.id = clone.id + '-copy-' + Date.now();
    }
    
    clone.classList.remove('selected');
    originalBlock.parentNode.insertBefore(clone, originalBlock.nextSibling);
    
    addBlockEventListeners(clone);
    initDragForElement(clone);
    
    showNotification('Блок скопирован', 'success');
}

// НОВАЯ ФУНКЦИЯ: Загрузка текущих цветов в панель при открытии
function loadCurrentColorsToPanel(block) {
    const settingsPanel = block.querySelector('.settings-panel');
    if (!settingsPanel) return;

    // Находим контейнер, к которому применяются стили (основной макрос)
    const contentContainer = block.querySelector('.editable-content > div') ||
                             block.querySelector('.editable-content') ||
                             block.querySelector('[class*="container"], [class*="content-"] > div');

    const bgInput = settingsPanel.querySelector('.bg-color-setting');
    const textInput = settingsPanel.querySelector('.text-color-setting');
    const borderInput = settingsPanel.querySelector('.border-color-setting');

    if (!contentContainer) return;

    // Получаем текущие inline-стили (или вычисленные, если inline нет)
    const computed = window.getComputedStyle(contentContainer);
    const currentBg = contentContainer.style.backgroundColor || computed.backgroundColor;
    const currentText = contentContainer.style.color || computed.color;
    const currentBorder = contentContainer.style.borderColor || computed.borderColor;

    // Конвертируем rgb в hex, если нужно
    function rgbToHex(rgb) {
        if (!rgb || rgb === 'transparent' || rgb.includes('var')) return '#ffffff';
        const match = rgb.match(/^rgb\((\d+),\s*(\d+),\s*(\d+)\)$/);
        if (!match) return '#ffffff';
        return "#" + [match[1], match[2], match[3]].map(x => {
            const hex = parseInt(x).toString(16);
            return hex.length === 1 ? "0" + hex : hex;
        }).join('');
    }

    if (bgInput) bgInput.value = rgbToHex(currentBg);
    if (textInput) textInput.value = rgbToHex(currentText);
    if (borderInput) borderInput.value = rgbToHex(currentBorder || '#cccccc');
}

// Live-обновление настроек
function applySettingsLive(block) {
    const settingsPanel = block.querySelector('.settings-panel');
    const contentDiv = block.querySelector('.editable-content > div') ||
        block.querySelector('.editable-content');
    
    if (contentDiv) {
        // Быстрое применение настроек
        const bgColor = settingsPanel.querySelector('.bg-color-setting');
        const textColor = settingsPanel.querySelector('.text-color-setting');
        const borderColor = settingsPanel.querySelector('.border-color-setting');
        
        // Управление видимостью в реальном времени
        const showIcon = settingsPanel.querySelector('.show-icon');
        const showTitle = settingsPanel.querySelector('.show-title');
        const showContent = settingsPanel.querySelector('.show-content');
        
        if (bgColor && bgColor.value) {
            contentDiv.style.backgroundColor = bgColor.value;
        }
        if (textColor && textColor.value) {
            contentDiv.style.color = textColor.value;
        }
        if (borderColor && borderColor.value) {
            contentDiv.style.borderColor = borderColor.value;
        }
        
        // ИСПРАВЛЕНО: Live-обновление видимости иконок
        if (showIcon) {
            const icons = contentDiv.querySelectorAll('[class*="-icon"], .spoiler-icon, .warning-icon, .success-icon, .note-icon, .number-circle, .macro-icon');
            icons.forEach(icon => {
                // Сохраняем оригинальный display, если еще не сохранен
                if (!icon.dataset.originalDisplay) {
                    const computedStyle = window.getComputedStyle(icon);
                    icon.dataset.originalDisplay = icon.style.display || computedStyle.display;
                }
                icon.style.display = showIcon.checked ? icon.dataset.originalDisplay : 'none';
            });
        }
        
        // ИСПРАВЛЕНО: Live-обновление видимости заголовков
        if (showTitle) {
            const titles = contentDiv.querySelectorAll('[class*="-title"], [class*="-header"], summary, .spoiler-header, .warning-title, .success-title, .note-title, .numbered-title, .steps-title, .comparison-title, .config-title, .quote-author');
            titles.forEach(title => {
                // Сохраняем оригинальный display, если еще не сохранен
                if (!title.dataset.originalDisplay) {
                    const computedStyle = window.getComputedStyle(title);
                    title.dataset.originalDisplay = title.style.display || computedStyle.display;
                }
                title.style.display = showTitle.checked ? title.dataset.originalDisplay : 'none';
            });
        }
        
        // ИСПРАВЛЕНО: Live-обновление видимости контента
        if (showContent) {
            const contentElements = contentDiv.querySelectorAll('[class*="-content"], [class*="-text"], .spoiler-content, .warning-text, .success-text, .note-text, .numbered-content, .steps-list, .comparison-list, .quote-text, .code-content, .link-text-container, .image-caption, .procedure-steps');
            contentElements.forEach(content => {
                // Сохраняем оригинальный display, если еще не сохранен
                if (!content.dataset.originalDisplay) {
                    const computedStyle = window.getComputedStyle(content);
                    content.dataset.originalDisplay = content.style.display || computedStyle.display;
                }
                content.style.display = showContent.checked ? content.dataset.originalDisplay : 'none';
            });
        }
    }
}

// УНИВЕРСАЛЬНЫЕ НАСТРОЙКИ ДЛЯ ВСЕХ БЛОКОВ
function applyBlockSettings(block) {
    const settingsPanel = block.querySelector('.settings-panel');
    const contentDiv = block.querySelector('.editable-content > div') ||
        block.querySelector('.editable-content');
    
    if (contentDiv) {
        // Если сброс по умолчанию - используем цвета макета
        const isResetting = settingsPanel && settingsPanel.querySelector('.reset-defaults:focus');
        
        if (isResetting) {
            const blockType = Array.from(block.classList).find(cls => cls.startsWith('content-'));
            const templateColors = getTemplateColors(blockType);
            
            // Применяем цвета макета
            contentDiv.style.backgroundColor = templateColors.bgColor;
            contentDiv.style.color = templateColors.textColor;
            contentDiv.style.borderColor = templateColors.borderColor;
        } else {
            // Обычное применение настроек
            const bgColor = settingsPanel?.querySelector('.bg-color-setting');
            const textColor = settingsPanel?.querySelector('.text-color-setting');
            const borderColor = settingsPanel?.querySelector('.border-color-setting');
            
            if (bgColor && bgColor.value) {
                contentDiv.style.backgroundColor = bgColor.value;
            }
            if (textColor && textColor.value) {
                contentDiv.style.color = textColor.value;
            }
            if (borderColor && borderColor.value) {
                contentDiv.style.borderColor = borderColor.value;
            }
        }
        
        // УНИВЕРСАЛЬНЫЕ НАСТРОЙКИ ВИДИМОСТИ
        const showIcon = settingsPanel.querySelector('.show-icon');
        const showTitle = settingsPanel.querySelector('.show-title');
        const showContent = settingsPanel.querySelector('.show-content');
        
        // ИСПРАВЛЕНО: Управление видимостью иконок
        if (showIcon) {
            const icons = contentDiv.querySelectorAll('[class*="-icon"], .spoiler-icon, .warning-icon, .success-icon, .note-icon, .number-circle, .macro-icon');
            icons.forEach(icon => {
                // Сохраняем оригинальный display, если еще не сохранен
                if (!icon.dataset.originalDisplay) {
                    const computedStyle = window.getComputedStyle(icon);
                    icon.dataset.originalDisplay = icon.style.display || computedStyle.display;
                }
                icon.style.display = showIcon.checked ? icon.dataset.originalDisplay : 'none';
            });
        }
        
        // ИСПРАВЛЕНО: Управление видимостью заголовков
        if (showTitle) {
            const titles = contentDiv.querySelectorAll('[class*="-title"], [class*="-header"], summary, .spoiler-header, .warning-title, .success-title, .note-title, .numbered-title, .steps-title, .comparison-title, .config-title, .quote-author');
            titles.forEach(title => {
                // Сохраняем оригинальный display, если еще не сохранен
                if (!title.dataset.originalDisplay) {
                    const computedStyle = window.getComputedStyle(title);
                    title.dataset.originalDisplay = title.style.display || computedStyle.display;
                }
                title.style.display = showTitle.checked ? title.dataset.originalDisplay : 'none';
            });
        }
        
        // ИСПРАВЛЕНО: Управление видимостью контента
        if (showContent) {
            const contentElements = contentDiv.querySelectorAll('[class*="-content"], [class*="-text"], .spoiler-content, .warning-text, .success-text, .note-text, .numbered-content, .steps-list, .comparison-list, .quote-text, .code-content, .link-text-container, .image-caption, .procedure-steps');
            contentElements.forEach(content => {
                // Сохраняем оригинальный display, если еще не сохранен
                if (!content.dataset.originalDisplay) {
                    const computedStyle = window.getComputedStyle(content);
                    content.dataset.originalDisplay = content.style.display || computedStyle.display;
                }
                content.style.display = showContent.checked ? content.dataset.originalDisplay : 'none';
            });
        }
        
        // СПЕЦИФИЧНЫЕ НАСТРОЙКИ ДЛЯ РАЗНЫХ ТИПОВ БЛОКОВ
        
        // Настройки ссылки
        const linkUrl = settingsPanel.querySelector('.link-url');
        const linkText = settingsPanel.querySelector('.link-text');
        if (linkUrl && linkText) {
            const link = contentDiv.querySelector('a');
            if (link) {
                link.href = linkUrl.value;
                link.textContent = linkText.value;
            }
        }
        
        // Настройки изображения
        const imageUrl = settingsPanel.querySelector('.image-url');
        const imageAlt = settingsPanel.querySelector('.image-alt');
        const imageWidth = settingsPanel.querySelector('.image-width');
        const img = contentDiv.querySelector('img.image-element, img');
        if (img) {
            if (imageUrl && imageUrl.value.trim()) {
                img.src = imageUrl.value.trim();
                img.hidden = false;
                img.removeAttribute('hidden');
                img.removeAttribute('data-export-filename');
                const zone = contentDiv.querySelector('.image-upload-zone');
                if (zone) {
                    zone.removeAttribute('data-empty');
                    zone.classList.add('has-image');
                }
                const uploadBtn = contentDiv.querySelector('.image-upload-btn');
                if (uploadBtn) uploadBtn.hidden = true;
                const hint = contentDiv.querySelector('.image-upload-hint');
                if (hint) hint.hidden = true;
            }
            if (imageAlt) img.alt = imageAlt.value;
            if (imageWidth && imageWidth.value) img.style.maxWidth = imageWidth.value + 'px';
        }
        
        // Настройки цитаты
        const headerColor = settingsPanel.querySelector('.header-color-setting');
        if (headerColor && headerColor.value) {
            const header = contentDiv.querySelector('div[style*="background: #337ab7"]');
            if (header) {
                header.style.backgroundColor = headerColor.value;
            }
        }
        
        // Показать/скрыть номер (для нумерованных блоков)
        const showNumber = settingsPanel.querySelector('.show-number');
        if (showNumber) {
            const numberCircle = contentDiv.querySelector('.number-circle');
            if (numberCircle) {
                if (!numberCircle.dataset.originalDisplay) {
                    const computedStyle = window.getComputedStyle(numberCircle);
                    numberCircle.dataset.originalDisplay = numberCircle.style.display || computedStyle.display;
                }
                numberCircle.style.display = showNumber.checked ? numberCircle.dataset.originalDisplay : 'none';
            }
        }
        
        // Настройки даты
        const dateBgColor = settingsPanel.querySelector('.date-bg-color');
        const dateTextColor = settingsPanel.querySelector('.date-text-color');
        if (dateBgColor && dateTextColor) {
            const dateElements = contentDiv.querySelectorAll('.date-element, .time-element');
            dateElements.forEach(el => {
                el.style.backgroundColor = dateBgColor.value;
                el.style.color = dateTextColor.value;
                el.style.borderColor = dateTextColor.value;
            });
        }
        
        // Настройки кнопок-ссылок
        applyLinkButtonsSettings(block, settingsPanel, contentDiv);
        apply1CSettings(block, settingsPanel, contentDiv);
    }
}

function getLinkButtonsContainer(block, contentDiv) {
    if (contentDiv && contentDiv.classList.contains('link-buttons-container')) return contentDiv;
    if (contentDiv) {
        const inner = contentDiv.querySelector('.link-buttons-container');
        if (inner) return inner;
    }
    return block.querySelector('.link-buttons-container');
}

function applyLinkButtonsSettings(block, settingsPanel, contentDiv) {
    if (!block || !block.classList.contains('content-link-buttons')) return;
    if (!settingsPanel) settingsPanel = block.querySelector('.settings-panel');
    if (!settingsPanel) return;

    const container = getLinkButtonsContainer(block, contentDiv);
    if (!container) return;

    const countInput = settingsPanel.querySelector('.buttons-count');
    const colorInput = settingsPanel.querySelector('.button-color-setting');
    const textColorInput = settingsPanel.querySelector('.button-text-color-setting');
    const fields = settingsPanel.querySelectorAll('.link-btn-field');

    const bg = (colorInput && colorInput.value) ? colorInput.value : '#20c997';
    const fg = (textColorInput && textColorInput.value) ? textColorInput.value : '#ffffff';
    let count = countInput ? parseInt(countInput.value, 10) : 0;
    if (!count || count < 1) count = 1;
    if (count > 12) count = 12;
    if (countInput) countInput.value = count;

    const fieldData = [];
    fields.forEach(field => {
        const text = field.querySelector('.link-btn-text');
        const url = field.querySelector('.link-btn-url');
        fieldData.push({
            text: text ? text.value : 'Ссылка',
            url: url ? url.value : 'https://example.com'
        });
    });

    let buttons = Array.from(container.querySelectorAll('a.link-button, .link-button'));

    while (buttons.length < count) {
        const a = document.createElement('a');
        a.className = 'link-button';
        a.setAttribute('contenteditable', 'true');
        a.href = 'https://example.com';
        a.textContent = 'Ссылка ' + (buttons.length + 1);
        a.style.cssText = 'padding: 8px 12px; background: ' + bg + '; color: ' + fg + '; text-decoration: none; border-radius: 6px; font-weight: 500; display: inline-block;';
        container.appendChild(a);
        buttons.push(a);
    }
    while (buttons.length > count) {
        const last = buttons.pop();
        if (last) last.remove();
    }

    buttons = Array.from(container.querySelectorAll('a.link-button, .link-button'));
    buttons.forEach((btn, i) => {
        btn.style.backgroundColor = bg;
        btn.style.color = fg;
        btn.setAttribute('contenteditable', 'true');
        if (fieldData[i]) {
            if (fieldData[i].text !== undefined && fieldData[i].text !== '') {
                btn.textContent = fieldData[i].text;
            }
            if (fieldData[i].url) {
                btn.setAttribute('href', fieldData[i].url);
            }
        }
        if (!btn.dataset.navBlocked) {
            btn.dataset.navBlocked = '1';
            btn.addEventListener('click', function(e) {
                e.preventDefault();
            });
        }
    });
}

function syncLinkButtonsFields(block) {
    const settingsPanel = block.querySelector('.settings-panel');
    if (!settingsPanel || !block.classList.contains('content-link-buttons')) return;

    const container = getLinkButtonsContainer(block, block.querySelector('.editable-content > div'));
    const fieldsWrap = settingsPanel.querySelector('.link-buttons-fields');
    const countInput = settingsPanel.querySelector('.buttons-count');
    if (!container || !fieldsWrap) return;

    const buttons = Array.from(container.querySelectorAll('a.link-button, .link-button'));
    if (countInput) countInput.value = String(buttons.length || 1);

    fieldsWrap.innerHTML = buttons.map((btn, i) => {
        const text = (btn.textContent || '').trim();
        const href = btn.getAttribute('href') || 'https://example.com';
        const safeText = text.replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;');
        const safeHref = href.replace(/&/g,'&amp;').replace(/"/g,'&quot;');
        return `
        <div class="link-btn-field" data-index="${i}" style="border:1px solid var(--border-color,#ccc);border-radius:4px;padding:8px;margin:6px 0;">
            <div class="settings-row">
                <label class="settings-label">Текст ${i + 1}:</label>
                <input type="text" class="settings-control link-btn-text" value="${safeText}">
            </div>
            <div class="settings-row">
                <label class="settings-label">URL ${i + 1}:</label>
                <input type="text" class="settings-control link-btn-url" value="${safeHref}">
            </div>
        </div>`;
    }).join('');

    // Количество — сразу перестраивает кнопки и поля
    if (countInput) {
        countInput.onchange = function() {
            applyLinkButtonsSettings(block, settingsPanel, block.querySelector('.editable-content > div'));
            syncLinkButtonsFields(block);
        };
    }

    // Цвета — live
    const colorInput = settingsPanel.querySelector('.button-color-setting');
    const textColorInput = settingsPanel.querySelector('.button-text-color-setting');
    [colorInput, textColorInput].forEach(inp => {
        if (!inp) return;
        inp.oninput = function() {
            applyLinkButtonsSettings(block, settingsPanel, block.querySelector('.editable-content > div'));
        };
    });

    // Текст/URL — при вводе обновляем кнопки
    fieldsWrap.querySelectorAll('.link-btn-text, .link-btn-url').forEach(inp => {
        inp.oninput = function() {
            applyLinkButtonsSettings(block, settingsPanel, block.querySelector('.editable-content > div'));
        };
    });
}

function setup1CSettings(block) {
    const settingsPanel = block.querySelector('.settings-panel');
    if (!settingsPanel) return;

    const bindLive = (selector) => {
        const el = settingsPanel.querySelector(selector);
        if (!el) return;
        el.oninput = function() {
            apply1CSettings(block, settingsPanel);
        };
        el.onchange = function() {
            apply1CSettings(block, settingsPanel);
            if (selector === '.config-sections-count') {
                // после смены числа секций ничего доп. не нужно
            }
        };
    };
    bindLive('.config-icon-bg');
    bindLive('.config-icon-color');
    bindLive('.config-summary-bg');
    bindLive('.config-summary-color');
    bindLive('.config-sections-count');
}

function apply1CSettings(block, settingsPanel, contentDiv) {
    if (!block || !block.classList.contains('content-1c-configuration')) return;
    if (!settingsPanel) settingsPanel = block.querySelector('.settings-panel');
    if (!settingsPanel) return;

    const root = contentDiv || block.querySelector('.config-container') || block.querySelector('.editable-content > div');
    if (!root) return;

    const container = root.classList.contains('config-container') ? root : (root.querySelector('.config-container') || root);
    const icon = container.querySelector('.config-icon');
    const summaries = container.querySelectorAll('.config-summary');
    const sectionsWrap = container.querySelector('.config-sections');

    const iconBg = settingsPanel.querySelector('.config-icon-bg');
    const iconColor = settingsPanel.querySelector('.config-icon-color');
    const sumBg = settingsPanel.querySelector('.config-summary-bg');
    const sumColor = settingsPanel.querySelector('.config-summary-color');
    const countInput = settingsPanel.querySelector('.config-sections-count');

    if (icon) {
        if (iconBg && iconBg.value) {
            icon.style.background = iconBg.value;
            icon.style.borderColor = iconBg.value;
        }
        if (iconColor && iconColor.value) {
            icon.style.color = iconColor.value;
        }
    }

    const sBg = sumBg && sumBg.value ? sumBg.value : '#F5A623';
    const sFg = sumColor && sumColor.value ? sumColor.value : '#ffffff';
    summaries.forEach(s => {
        s.style.background = sBg;
        s.style.color = sFg;
    });

    if (!sectionsWrap || !countInput) return;

    let count = parseInt(countInput.value, 10) || 1;
    if (count < 1) count = 1;
    if (count > 10) count = 10;
    countInput.value = count;

    let sections = Array.from(sectionsWrap.querySelectorAll('.config-details'));
    const border = '#E0C200';
    const textColor = '#1A1A1A';

    while (sections.length < count) {
        const details = document.createElement('details');
        details.className = 'config-details';
        details.style.cssText = `margin-bottom: 12px; border: 1px solid ${border}; border-radius: 6px; overflow: hidden;`;
        details.innerHTML = `
            <summary class="config-summary" contenteditable="true" style="background: ${sBg}; padding: 10px 14px; cursor: pointer; font-weight: bold; color: ${sFg}; list-style: none;">Новая конфигурация</summary>
            <div class="config-content" contenteditable="true" style="padding: 14px; background: #ffffff; color: ${textColor}; min-height: 40px;">
                Текст настройки…
                <div class="nested-editor" contenteditable="true" style="min-height: 24px; margin-top: 8px;"></div>
            </div>
        `;
        sectionsWrap.appendChild(details);
        sections.push(details);
    }
    while (sections.length > count) {
        const last = sections.pop();
        if (last) last.remove();
    }

    // обновить цвета у всех summary после перестройки
    container.querySelectorAll('.config-summary').forEach(s => {
        s.style.background = sBg;
        s.style.color = sFg;
        s.setAttribute('contenteditable', 'true');
    });
    container.querySelectorAll('.config-content').forEach(c => {
        c.setAttribute('contenteditable', 'true');
    });
    container.querySelectorAll('.config-title').forEach(t => {
        t.setAttribute('contenteditable', 'true');
    });
}




// Настройка контролов видимости на основе содержимого блока
function setupVisibilityControls(settingsPanel, contentDiv) {
    const showIcon = settingsPanel.querySelector('.show-icon');
    const showTitle = settingsPanel.querySelector('.show-title');
    const showContent = settingsPanel.querySelector('.show-content');
    
    // Проверяем наличие иконок и настраиваем чекбокс
    if (showIcon) {
        const hasIcons = contentDiv.querySelectorAll('[class*="-icon"], .spoiler-icon, .warning-icon, .success-icon, .note-icon, .number-circle, .macro-icon').length > 0;
        if (hasIcons) {
            showIcon.checked = true;
            showIcon.parentElement.style.display = 'block';
        } else {
            showIcon.parentElement.style.display = 'none';
        }
    }
    
    // Проверяем наличие заголовков и настраиваем чекбокс
    if (showTitle) {
        const hasTitles = contentDiv.querySelectorAll('[class*="-title"], [class*="-header"], summary, .spoiler-header, .warning-title, .success-title, .note-title, .numbered-title, .steps-title, .comparison-title, .config-title, .quote-author').length > 0;
        if (hasTitles) {
            showTitle.checked = true;
            showTitle.parentElement.style.display = 'block';
        } else {
            showTitle.parentElement.style.display = 'none';
        }
    }
    
    // Проверяем наличие контента и настраиваем чекбокс
    if (showContent) {
        const hasContent = contentDiv.querySelectorAll('[class*="-content"], [class*="-text"], .spoiler-content, .warning-text, .success-text, .note-text, .numbered-content, .steps-list, .comparison-list, .quote-text, .code-content, .link-text-container, .image-caption, .procedure-steps').length > 0;
        if (hasContent) {
            showContent.checked = true;
            showContent.parentElement.style.display = 'block';
        } else {
            showContent.parentElement.style.display = 'none';
        }
    }
}

// Получение цветов по умолчанию для разных типов блоков
function getDefaultColors(blockType) {
    const defaults = {
        'content-warning': {
            bgColor: '#ffd1d1',
            textColor: '#000000',
            borderColor: '#7a0000'
        },
        'content-success': {
            bgColor: '#eaf8db',
            textColor: '#000000',
            borderColor: '#2e7d32'
        },
        'content-note': {
            bgColor: '#fffed1',
            textColor: '#000000',
            borderColor: '#ffc107'
        },
        'content-numbered': {
            bgColor: '#f8f9fa',
            textColor: '#000000',
            borderColor: '#e9ecef'
        },
        'content-code': {
            bgColor: '#f8f8f8',
            textColor: '#333333',
            borderColor: '#dddddd'
        },
        'content-spoiler': {
            bgColor: '#f5f5f5',
            textColor: '#000000',
            borderColor: '#cccccc'
        }
    };
    
    return getTemplateColors(blockType);
}

// Сброс настроек к значениям по умолчанию
function resetToDefaultSettings(block) {
    const blockType = Array.from(block.classList).find(cls => cls.startsWith('content-'));
    const contentDiv = block.querySelector('.editable-content > div');
    const settingsPanel = block.querySelector('.settings-panel');
    
    if (!contentDiv || !settingsPanel) return;
    
    const defaultColors = getDefaultColors(blockType);
    
    // Сбрасываем цвета в панели настроек
    const bgColorInput = settingsPanel.querySelector('.bg-color-setting');
    const textColorInput = settingsPanel.querySelector('.text-color-setting');
    const borderColorInput = settingsPanel.querySelector('.border-color-setting');
    
    // Устанавливаем значения по умолчанию ИЗ МАКЕТА
    if (bgColorInput) bgColorInput.value = defaultColors.bgColor;
    if (textColorInput) textColorInput.value = defaultColors.textColor;
    if (borderColorInput) borderColorInput.value = defaultColors.borderColor;
    
    // Сбрасываем чекбоксы
    const showIcon = settingsPanel.querySelector('.show-icon');
    const showTitle = settingsPanel.querySelector('.show-title');
    const showContent = settingsPanel.querySelector('.show-content');
    const showNumber = settingsPanel.querySelector('.show-number');
    
    if (showIcon) showIcon.checked = true;
    if (showTitle) showTitle.checked = true;
    if (showContent) showContent.checked = true;
    if (showNumber) showNumber.checked = true;
    
    // Сбрасываем сохраненные оригинальные display значения
    const allElements = contentDiv.querySelectorAll('[data-original-display]');
    allElements.forEach(el => {
        delete el.dataset.originalDisplay;
    });
    
    // ПРИМЕНЯЕМ настройки из макета (а не просто очищаем)
    applyBlockSettings(block);
    
    showNotification('Настройки сброшены по умолчанию', 'success');
}

// Получение цветов по макету для разных типов блоков
function getTemplateColors(blockType) {
    const templateDefaults = {
        'content-warning': {
            bgColor: '#ffd1d1',
            textColor: '#000000',
            borderColor: '#7a0000'
        },
        'content-success': {
            bgColor: '#eaf8db',
            textColor: '#000000',
            borderColor: '#2e7d32'
        },
        'content-note': {
            bgColor: '#fffed1',
            textColor: '#000000',
            borderColor: '#ffc107'
        },
        'content-numbered': {
            bgColor: '#f8f9fa',
            textColor: '#000000',
            borderColor: '#e9ecef'
        },
        'content-code': {
            bgColor: '#f8f8f8',
            textColor: '#333333',
            borderColor: '#dddddd'
        },
        'content-spoiler': {
            bgColor: '#f5f5f5',
            textColor: '#000000',
            borderColor: '#cccccc'
        },
        'content-steps': {
            bgColor: '#e9ecef',
            textColor: '#212529',
            borderColor: '#dee2e6'
        },
        'content-comparison': {
            bgColor: '#f8f9fa',
            textColor: '#212529',
            borderColor: '#e9ecef'
        },
        'content-config': {
            bgColor: '#f8f9fa',
            textColor: '#212529',
            borderColor: '#20c997'
        },
        'content-date': {
            bgColor: '#ffffff',
            textColor: '#212529',
            borderColor: '#6c757d'
        },
        'content-link': {
            bgColor: '#f8f9fa',
            textColor: '#0d6efd',
            borderColor: '#dee2e6'
        },
        'content-image': {
            bgColor: '#ffffff',
            textColor: '#6c757d',
            borderColor: '#dee2e6'
        },
        'content-quote': {
            bgColor: '#ffffff',
            textColor: '#212529',
            borderColor: '#dee2e6'
        }
    };
    
    return templateDefaults[blockType] || {
        bgColor: '#ffffff',
        textColor: '#000000',
        borderColor: '#cccccc'
    };
}

// Настройка панели настроек
function setupSettingsPanel(block) {
    const settingsPanel = block.querySelector('.settings-panel');
    // Универсальный контейнер стилей: div внутри editable, либо сам editable-content
    const contentDiv = block.querySelector('.editable-content > div') ||
        block.querySelector('.editable-content');
    
    if (!settingsPanel) return;
    
    // Кнопки-ссылки: поля текста/URL
    if (block.classList.contains('content-link-buttons')) {
        syncLinkButtonsFields(block);
    }
    // Блок 1С
    if (block.classList.contains('content-1c-configuration')) {
        setup1CSettings(block);
    }
    // FAQ: кнопка «добавить вопрос» если есть
    if (block.classList.contains('content-faq')) {
        setupFaqSettings(block, settingsPanel);
    }
    // Видео
    if (block.classList.contains('content-video')) {
        setupVideoBlock(block);
    }
    // Скачать файл
    if (block.classList.contains('content-download-file')) {
        setupDownloadFileBlock(block);
    }
    // Изображение из файла
    if (block.classList.contains('content-image') || block.classList.contains('content-image-caption')) {
        if (typeof setupImageBlock === 'function') setupImageBlock(block);
    }

    if (!contentDiv) return;
    
    // Автоматически определяем наличие элементов и настраиваем чекбоксы
    setupVisibilityControls(settingsPanel, contentDiv);
    
    // Устанавливаем live-обработчики для инпутов
    const colorInputs = settingsPanel.querySelectorAll('.bg-color-setting, .text-color-setting, .border-color-setting');
    colorInputs.forEach(input => {
        // Убираем старые обработчики
        const newInput = input.cloneNode(true);
        input.parentNode.replaceChild(newInput, input);
        
        // Добавляем новый обработчик
        newInput.addEventListener('input', function(e) {
            e.stopPropagation();
            applySettingsLive(block);
        });
    });
    
    // Обработчики для чекбоксов видимости
    const visibilityInputs = settingsPanel.querySelectorAll('.show-icon, .show-title, .show-content, .show-number');
    visibilityInputs.forEach(input => {
        if (input.parentElement.style.display !== 'none') {
            const newInput = input.cloneNode(true);
            input.parentNode.replaceChild(newInput, input);
            
            newInput.addEventListener('change', function(e) {
                e.stopPropagation();
                applySettingsLive(block);
            });
        }
    });
    
    // Обработчик для кнопки "Применить"
    const applyBtn = settingsPanel.querySelector('.apply-settings');
    if (applyBtn) {
        // Убираем старый обработчик
        const newApplyBtn = applyBtn.cloneNode(true);
        applyBtn.parentNode.replaceChild(newApplyBtn, applyBtn);
        
        // Добавляем новый обработчик
        newApplyBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            e.preventDefault();
            applyBlockSettings(block);
            settingsPanel.style.display = 'none';
            showNotification('Настройки применены', 'success');
        });
    }
    
    // Обработчик для кнопки "Вернуть по умолчанию"
    const resetBtn = settingsPanel.querySelector('.reset-defaults');
    if (resetBtn) {
        resetBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            e.preventDefault();
            resetToDefaultSettings(block);
        });
    }
    
    // Обработчик для кнопки закрытия
    const closeBtn = settingsPanel.querySelector('.close-settings');
    if (closeBtn) {
        closeBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            settingsPanel.style.display = 'none';
        });
    }
    
    // ВАЖНО: Предотвращаем закрытие панели при клике внутри неё
    settingsPanel.addEventListener('click', function(e) {
        e.stopPropagation();
    });
}

/** Настройки FAQ: добавить/удалить пункты */
function setupFaqSettings(block, settingsPanel) {
    if (!settingsPanel || settingsPanel.dataset.faqSetup === '1') return;
    settingsPanel.dataset.faqSetup = '1';

    let group = settingsPanel.querySelector('.faq-structure-settings');
    if (!group) {
        group = document.createElement('div');
        group.className = 'settings-group faq-structure-settings';
        group.innerHTML = `
            <div class="settings-group-title">Структура FAQ</div>
            <div class="settings-row">
                <button type="button" class="settings-btn faq-add-item">+ Добавить вопрос</button>
            </div>
            <p class="settings-hint">Клик по вопросу или ответу — редактирование. «Применить» сохраняет цвета.</p>
        `;
        const first = settingsPanel.querySelector('.settings-group');
        if (first) settingsPanel.insertBefore(group, first);
        else settingsPanel.insertBefore(group, settingsPanel.firstChild);
    }

    const addBtn = group.querySelector('.faq-add-item');
    if (addBtn && !addBtn.dataset.bound) {
        addBtn.dataset.bound = '1';
        addBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            const list = block.querySelector('.faq-list');
            if (!list) return;
            const n = list.querySelectorAll('.faq-item').length + 1;
            const item = document.createElement('details');
            item.className = 'faq-item';
            item.innerHTML = `
                <summary class="faq-question" contenteditable="true">Вопрос ${n}?</summary>
                <div class="faq-answer" contenteditable="true">Ответ на вопрос ${n}.</div>
            `;
            list.appendChild(item);
            showNotification('Вопрос добавлен', 'success');
        });
    }
}

// Убираем ВСЕ обработчики mouseleave из setupBlockPanels
function setupBlockPanels(block) {
    const blockSettings = block.querySelector('.block-settings');
    const blockActions = block.querySelector('.block-actions');
    
    // Только для block-settings оставляем базовую логику
    if (blockSettings) {
        blockSettings.addEventListener('mouseenter', function() {
            this.style.display = 'flex';
        });
    }
    
    // Для block-actions оставляем обычную логику
    if (blockActions) {
        blockActions.addEventListener('mouseenter', function() {
            this.style.display = 'flex';
        });
        
        blockActions.addEventListener('mouseleave', function(e) {
            setTimeout(() => {
                if (!this.matches(':hover')) {
                    this.style.display = 'none';
                }
            }, 500);
        });
    }
    
    block.addEventListener('mouseenter', function() {
        const blockSettings = this.querySelector('.block-settings');
        const blockActions = this.querySelector('.block-actions');
        
        if (blockSettings) blockSettings.style.display = 'flex';
        if (blockActions) blockActions.style.display = 'flex';
    });
    
    block.addEventListener('mouseleave', function(e) {
        const relatedTarget = e.relatedTarget;
        const blockActions = this.querySelector('.block-actions');
        
        if (blockActions && !blockActions.contains(relatedTarget)) {
            setTimeout(() => {
                if (!blockActions.matches(':hover')) {
                    blockActions.style.display = 'none';
                }
            }, 500);
        }
    });
}

// Уведомления
// showNotification → js/ui/notifications.js

// Показать выбор макроса для вставки
function showMacroSelection(block) {
    // SVG-иконки (24x24, stroke) + актуальный список шаблонов из templates.js
    const I = {
        spoiler: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/><polyline points="9 14 12 17 15 14"/><line x1="12" y1="10" x2="12" y2="17"/></svg>',
        warning: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>',
        success: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>',
        note: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>',
        numbered: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="10" y1="6" x2="21" y2="6"/><line x1="10" y1="12" x2="21" y2="12"/><line x1="10" y1="18" x2="21" y2="18"/><path d="M4 6h1v4"/><path d="M4 10h2"/><path d="M6 18H4c0-1 2-2 2-3s-1-1.5-2-1"/></svg>',
        code: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>',
        image: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>',
        quote: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 21c3 0 7-1 7-8V5c0-1.25-.756-2.017-2-2H4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2 1 0 1 0 1 1v1c0 1-1 2-2 2s-1 .008-1 1.031V21"/><path d="M15 21c3 0 7-1 7-8V5c0-1.25-.757-2.017-2-2h-4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2h.75c0 2.25.25 4-2.75 4v3"/></svg>',
        'link-buttons': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>',
        '1c-configuration': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>',
        glossary: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/><line x1="8" y1="7" x2="16" y2="7"/><line x1="8" y1="11" x2="14" y2="11"/></svg>',
        'image-caption': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="14" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 13 16 8 9 15"/><line x1="4" y1="21" x2="20" y2="21"/></svg>',
        'type-comparison': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="18" rx="1"/><rect x="14" y="3" width="7" height="18" rx="1"/><line x1="6.5" y1="8" x2="6.5" y2="8.01"/><line x1="17.5" y1="8" x2="17.5" y2="8.01"/></svg>',
        'developer-note': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/><line x1="12" y1="2" x2="12" y2="22"/></svg>'
    };

    const macroTypes = [
        { name: 'Спойлер', value: 'spoiler', group: 'Основные' },
        { name: 'Предупреждение', value: 'warning', group: 'Основные' },
        { name: 'Успех', value: 'success', group: 'Основные' },
        { name: 'Примечание', value: 'note', group: 'Основные' },
        { name: 'Нумерованный блок', value: 'numbered', group: 'Основные' },
        { name: 'Код', value: 'code', group: 'Основные' },
        { name: 'Изображение', value: 'image', group: 'Контент' },
        { name: 'Цитата', value: 'quote', group: 'Контент' },
        { name: 'Кнопки-ссылки', value: 'link-buttons', group: 'Технические' },
        { name: 'Конфигурация 1С', value: '1c-configuration', group: 'Технические' },
        { name: 'Термины', value: 'glossary', group: 'Документация' },
        { name: 'Изображение с подписью', value: 'image-caption', group: 'Документация' },
        { name: 'Сравнение типов', value: 'type-comparison', group: 'Документация' },
        { name: 'Примечание разработчика', value: 'developer-note', group: 'Документация' }
    ];

    const groups = {};
    macroTypes.forEach(m => {
        if (!groups[m.group]) groups[m.group] = [];
        groups[m.group].push(m);
    });

    const sectionsHtml = Object.entries(groups).map(([groupName, items]) => `
        <div class="macro-group">
            <div class="macro-group-title">${groupName}</div>
            <div class="macros-grid">
                ${items.map(macro => `
                    <button type="button" class="macro-type-btn" data-type="${macro.value}" title="${macro.name}">
                        <div class="macro-icon">${I[macro.value] || ''}</div>
                        <div class="macro-name">${macro.name}</div>
                    </button>
                `).join('')}
            </div>
        </div>
    `).join('');

    const modal = document.createElement('div');
    modal.className = 'modal active';
    modal.innerHTML = `
        <div class="modal-content macro-modal-content">
            <div class="modal-header">
                <h2>Выберите макрос для вставки</h2>
                <button type="button" class="close-modal">&times;</button>
            </div>
            <div class="macro-modal-body">
                ${sectionsHtml}
            </div>
        </div>
    `;

    document.body.appendChild(modal);

    modal.querySelector('.close-modal').addEventListener('click', () => modal.remove());
    modal.addEventListener('click', (e) => {
        if (e.target === modal) modal.remove();
    });

    modal.querySelectorAll('.macro-type-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const macroType = btn.getAttribute('data-type');
            insertMacroIntoBlock(block, macroType);
            modal.remove();
        });
    });
}

// Вставить макрос в блок
function insertMacroIntoBlock(parentBlock, macroType) {
    let targetEditor = parentBlock.querySelector('.nested-editor');
    
    if (!targetEditor) {
        // Создаем вложенный редактор если его нет
        const editableContent = parentBlock.querySelector('.editable-content > div');
        if (editableContent) {
            targetEditor = document.createElement('div');
            targetEditor.className = 'nested-editor';
            targetEditor.setAttribute('contenteditable', 'true');
            editableContent.appendChild(targetEditor);
        } else {
            console.warn('Editable content not found in block');
            return;
        }
    }
    
    let macroHTML = '';
    
    switch(macroType) {
        case 'spoiler':
            macroHTML = createSpoilerBlock();
            break;
        case 'warning':
            macroHTML = createWarningBlock();
            break;
        case 'success':
            macroHTML = createSuccessBlock();
            break;
        case 'note':
            macroHTML = createNoteBlock();
            break;
        case 'numbered':
            macroHTML = createNumberedBlock();
            break;
        case 'code':
            macroHTML = createCodeBlock();
            break;
        case 'image':
            macroHTML = createImageBlock();
            break;
        case 'quote':
            macroHTML = createQuoteBlock();
            break;
        case 'link-buttons':
            macroHTML = createLinkButtonsBlock();
            break;
        case '1c-configuration':
            macroHTML = create1CConfigurationBlock();
            break;
        case 'glossary':
            macroHTML = createGlossaryBlock();
            break;
        case 'image-caption':
            macroHTML = createImageCaptionBlock();
            break;
        case 'type-comparison':
            macroHTML = createTypeComparisonBlock();
            break;
        case 'developer-note':
            macroHTML = createDeveloperNoteBlock();
            break;
        default:
            console.warn('Unknown macro type:', macroType);
            return;
    }
    
    if (!macroHTML) return;
    
    const div = document.createElement('div');
    div.innerHTML = macroHTML;
    const newBlock = div.firstElementChild;
    
    // Убираем вложенный редактор из вложенного макроса чтобы избежать бесконечной рекурсии
    const nestedNestedEditor = newBlock.querySelector('.nested-editor');
    if (nestedNestedEditor) {
        nestedNestedEditor.remove();
    }
    
    targetEditor.appendChild(newBlock);
    addBlockEventListeners(newBlock);
    initDragForElement(newBlock);
    
    // Прокручиваем к новому блоку
    newBlock.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    
    showNotification('Макрос вставлен', 'success');
}

// Функция для повторной инициализации всех блоков
function reinitializeBlocks() {
    document.querySelectorAll('.block').forEach(block => {
        addBlockEventListeners(block);
        initDragForElement(block);
        delete block.dataset.videoBound;
        delete block.dataset.downloadBound;
        delete block.dataset.imageBound;
        setupVideoBlock(block);
        setupDownloadFileBlock(block);
        if (typeof setupImageBlock === 'function') setupImageBlock(block);
        if (typeof setupTableControls === 'function' && block.classList.contains('content-table')) {
            setupTableControls(block);
        }
    });
}

// ========== Ресайз изображений прямо в редакторе ==========
function setupImageResizeForBlock(block) {
    if (!block) return;
    const imgs = block.querySelectorAll('img.image-element, .image-container img, .editable-content img');
    imgs.forEach(function(img) {
        if (img.dataset.resizeBound === '1') return;
        if (img.closest('.block-actions, .drag-handle')) return;
        img.dataset.resizeBound = '1';
        wrapImageForResize(img);
    });
}

function wrapImageForResize(img) {
    if (!img || img.closest('.image-resize-wrap')) return;

    const wrap = document.createElement('div');
    wrap.className = 'image-resize-wrap';
    const currentW = img.style.width || img.getAttribute('width');
    if (currentW) {
        wrap.style.width = (typeof currentW === 'string' && currentW.indexOf('px') >= 0)
            ? currentW
            : (parseInt(currentW, 10) ? parseInt(currentW, 10) + 'px' : '');
    }
    if (img.style.maxWidth) wrap.style.maxWidth = img.style.maxWidth;

    img.parentNode.insertBefore(wrap, img);
    wrap.appendChild(img);

    img.style.maxWidth = '100%';
    img.style.width = '100%';
    img.style.height = 'auto';
    img.style.display = 'block';

    const handles = ['nw', 'ne', 'sw', 'se', 'e', 'w'];
    handles.forEach(function(pos) {
        const h = document.createElement('div');
        h.className = 'image-resize-handle ' + pos;
        h.dataset.dir = pos;
        h.title = 'Изменить размер';
        wrap.appendChild(h);
        h.addEventListener('mousedown', function(e) {
            e.preventDefault();
            e.stopPropagation();
            startImageResize(wrap, img, pos, e);
        });
    });

    wrap.addEventListener('mouseenter', function() {
        wrap.classList.add('is-resizing');
    });
    wrap.addEventListener('mouseleave', function() {
        if (!wrap.dataset.resizing) wrap.classList.remove('is-resizing');
    });
}

function startImageResize(wrap, img, dir, e) {
    snapshotEditor('before-image-resize');

    const startX = e.clientX;
    const startWidth = wrap.offsetWidth || img.offsetWidth || 300;
    const naturalMax = img.naturalWidth || 2000;
    const minW = 40;
    const parent = wrap.parentElement;
    const parentMax = parent ? parent.clientWidth : 1200;

    wrap.dataset.resizing = '1';
    wrap.classList.add('is-resizing');

    let label = wrap.querySelector('.image-resize-size-label');
    if (!label) {
        label = document.createElement('div');
        label.className = 'image-resize-size-label';
        wrap.appendChild(label);
    }
    label.textContent = Math.round(startWidth) + ' px';

    function onMove(ev) {
        const dx = ev.clientX - startX;
        let next;
        if (dir === 'e' || dir === 'ne' || dir === 'se') {
            next = startWidth + dx;
        } else if (dir === 'w' || dir === 'nw' || dir === 'sw') {
            next = startWidth - dx;
        } else {
            next = startWidth + dx;
        }
        next = Math.max(minW, Math.min(next, Math.max(parentMax, naturalMax)));
        wrap.style.width = Math.round(next) + 'px';
        wrap.style.maxWidth = '100%';
        img.style.width = '100%';
        const block = wrap.closest('.block');
        if (block) {
            const widthInput = block.querySelector('.image-width');
            if (widthInput) widthInput.value = Math.round(next);
        }
        label.textContent = Math.round(next) + ' px';
    }

    function onUp() {
        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('mouseup', onUp);
        delete wrap.dataset.resizing;
        wrap.classList.remove('is-resizing');
        if (label && label.parentNode) label.remove();
        markAutosaveDirty();
        snapshotEditorDebounced();
    }

    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
}

document.addEventListener('DOMContentLoaded', function() {
    document.querySelectorAll('.block').forEach(setupImageResizeForBlock);
});

// create*Block factories loaded from js/blocks/factories.js