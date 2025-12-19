// Добавление обработчиков событий для блока
function addBlockEventListeners(block) {
    // Кнопка удаления
    const deleteBtn = block.querySelector('.delete-block');
    if (deleteBtn) {
        deleteBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            if (confirm('Удалить этот блок?')) {
                block.remove();
                showNotification('Блок удален', 'success');
            }
        });
    }
    
    // Кнопка редактирования - ИСПРАВЛЕННАЯ
    const editBtn = block.querySelector('.edit-block');
    if (editBtn) {
        editBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            e.preventDefault();
            
            const editableContent = block.querySelector('.editable-content');
            if (editableContent) {
                const isCurrentlyEditable = editableContent.getAttribute('contenteditable') === 'true';
                const newState = !isCurrentlyEditable;
                
                if (newState) {
                    // ВКЛЮЧАЕМ редактирование
                    enableContentEditing(editableContent);
                    editBtn.innerHTML = '💾';
                    editBtn.title = 'Завершить редактирование';
                    showNotification('Режим редактирования включен. Изменяйте только текстовое содержимое.', 'info');
                } else {
                    // ВЫКЛЮЧАЕМ редактирование
                    disableContentEditing(editableContent);
                    editBtn.innerHTML = '✏️';
                    editBtn.title = 'Редактировать';
                    showNotification('Редактирование завершено', 'success');
                }
            }
        });
    }
    
    // Кнопка копирования
    const copyBtn = block.querySelector('.copy-block');
    if (copyBtn) {
        copyBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            copyBlock(block);
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

    // Изначально ВЫКЛЮЧАЕМ редактирование для всех блоков
    const editableContent = block.querySelector('.editable-content');
    if (editableContent) {
        // ВАЖНО: Устанавливаем contenteditable="false" по умолчанию
        editableContent.setAttribute('contenteditable', 'false');
        setupProtectedEditing(editableContent);
        
        editableContent.addEventListener('focus', function() {
            block.classList.add('selected');
        });
        
        editableContent.addEventListener('blur', function() {
            this.style.outline = 'none';
        });
    }
    
    // Обработчики для панелей
    setupBlockPanels(block);
    
    // Инициализация перетаскивания для блока
    initDragForElement(block);
}

// ВКЛЮЧИТЬ редактирование контента - ИСПРАВЛЕННАЯ
function enableContentEditing(editableContent) {
    editableContent.setAttribute('contenteditable', 'true');
    editableContent.style.outline = '2px solid var(--primary-color)';
    editableContent.style.outlineOffset = '2px';
    editableContent.style.minHeight = '60px';
    
    // Разрешаем редактирование для безопасных элементов
    enableSafeEditing(editableContent);
    
    // Фокусируемся на безопасной для редактирования области
    focusSafeEditingArea(editableContent);
}

// ВЫКЛЮЧИТЬ редактирование контента
function disableContentEditing(editableContent) {
    editableContent.setAttribute('contenteditable', 'false');
    editableContent.style.outline = 'none';
    editableContent.style.minHeight = '';
    
    // Снимаем защиту с элементов
    unprotectStructuralElements(editableContent);
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
        'summary', 'h3', 'h4', 'h5', 'h6'
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
    
    // Защищаем ТОЛЬКО реально структурные элементы
    protectStructuralElements(editableContent);
}

// ЗАЩИТА структурных элементов
function protectStructuralElements(editableContent) {
    // ТОЛЬКО элементы управления, которые нельзя редактировать
    const protectedSelectors = [
        '.block', '.nested-editor',
        '.drag-handle', '.block-actions', '.block-settings', '.settings-panel',
        '.status-badge', '.column-header', '.config-details',
        
        // УБРАНО: заголовки и иконки теперь можно редактировать
    ];
    
    protectedSelectors.forEach(selector => {
        const elements = editableContent.querySelectorAll(selector);
        elements.forEach(element => {
            element.setAttribute('contenteditable', 'false');
            element.classList.add('protected-element');
            element.style.userSelect = 'none';
            element.style.cursor = 'default';
        });
    });
}
    
    protectedSelectors.forEach(selector => {
        const elements = editableContent.querySelectorAll(selector);
        elements.forEach(element => {
            element.setAttribute('contenteditable', 'false');
            element.classList.add('protected-element');
            element.style.userSelect = 'none';
            element.style.cursor = 'default';
            
            // Добавляем визуальную индикацию защиты
            element.style.position = 'relative';
            if (!element.querySelector('.protection-overlay')) {
                const overlay = document.createElement('div');
                overlay.className = 'protection-overlay';
                overlay.innerHTML = '🔒';
                overlay.style.cssText = `
                    position: absolute;
                    top: 2px;
                    right: 2px;
                    background: rgba(255,193,7,0.9);
                    color: #000;
                    border-radius: 50%;
                    width: 20px;
                    height: 20px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 10px;
                    z-index: 10;
                    pointer-events: none;
                `;
                element.style.position = 'relative';
                element.appendChild(overlay);
            }
        });
    });


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
function setupProtectedEditing(editableContent) {
    let originalHTML = editableContent.innerHTML;
    let isEditing = false;
    
    editableContent.addEventListener('input', function(e) {
        if (!isEditing) return;
        
        // Проверяем, не удалены ли защищенные элементы
        const protectedElements = this.querySelectorAll(
            '[class*="-title"], [class*="-icon"], [class*="-header"], ' +
            '.spoiler-header, .warning-header, .success-header, .note-header'
        );
        
        if (protectedElements.length === 0) {
            // Восстанавливаем структуру если защищенные элементы удалены
            setTimeout(() => {
                this.innerHTML = originalHTML;
                protectStructuralElements(this);
                showNotification('Структурные элементы защищены от удаления', 'warning');
            }, 100);
        }
        
        // Обновляем оригинальный HTML, но сохраняем защищенные элементы
        originalHTML = this.innerHTML;
    });
    
    editableContent.addEventListener('keydown', function(e) {
        if (!isEditing) return;
        
        const selection = window.getSelection();
        if (selection.rangeCount === 0) return;
        
        const range = selection.getRangeAt(0);
        const startContainer = range.startContainer;
        
        // Проверяем, не пытаются ли редактировать защищенный элемент
        const protectedElement = startContainer.closest?.('.protected-element') || 
                               startContainer.parentElement?.closest('.protected-element');
        
        if (protectedElement) {
            e.preventDefault();
            showNotification('Этот элемент защищен от редактирования', 'warning');
            
            // Перемещаем фокус на безопасный элемент
            focusSafeEditingArea(this);
            return;
        }
        
        // Запрещаем удаление защищенных элементов через Backspace/Delete
        if ((e.key === 'Backspace' || e.key === 'Delete') && selection.toString().includes('protected-element')) {
            e.preventDefault();
            showNotification('Защищенные элементы нельзя удалять', 'warning');
        }
    });
    
    // Отслеживаем состояние редактирования
    editableContent.addEventListener('focus', function() {
        isEditing = this.getAttribute('contenteditable') === 'true';
    });
    
    editableContent.addEventListener('blur', function() {
        isEditing = false;
    });
}

// Копирование блока
function copyBlock(originalBlock) {
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
    const contentDiv = block.querySelector('.editable-content > div');
    
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
        
        // Live-обновление видимости
        if (showIcon) {
            const icons = contentDiv.querySelectorAll('[class*="-icon"], .spoiler-icon, .warning-icon, .success-icon, .note-icon, .number-circle, .macro-icon');
            icons.forEach(icon => {
                icon.style.display = showIcon.checked ? '' : 'none';
            });
        }
        
        if (showTitle) {
            const titles = contentDiv.querySelectorAll('[class*="-title"], [class*="-header"], summary, .spoiler-header, .warning-title, .success-title, .note-title, .numbered-title, .steps-title, .comparison-title, .config-title, .quote-author');
            titles.forEach(title => {
                title.style.display = showTitle.checked ? '' : 'none';
            });
        }
        
        if (showContent) {
            const contentElements = contentDiv.querySelectorAll('[class*="-content"], [class*="-text"], .spoiler-content, .warning-text, .success-text, .note-text, .numbered-content, .steps-list, .comparison-list, .quote-text, .code-content, .link-text-container, .image-caption, .procedure-steps');
            contentElements.forEach(content => {
                content.style.display = showContent.checked ? '' : 'none';
            });
        }
    }
}

// УНИВЕРСАЛЬНЫЕ НАСТРОЙКИ ДЛЯ ВСЕХ БЛОКОВ
function applyBlockSettings(block) {
    const settingsPanel = block.querySelector('.settings-panel');
    const contentDiv = block.querySelector('.editable-content > div');
    
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
        
        if (bgColor && bgColor.value) {
            contentDiv.style.backgroundColor = bgColor.value;
        }
        if (textColor && textColor.value) {
            contentDiv.style.color = textColor.value;
        }
        if (borderColor && borderColor.value) {
            contentDiv.style.borderColor = borderColor.value;
        }
        
        // УПРАВЛЕНИЕ ВИДИМОСТЬЮ ЭЛЕМЕНТОВ
        if (showIcon) {
            const icons = contentDiv.querySelectorAll('[class*="-icon"], .spoiler-icon, .warning-icon, .success-icon, .note-icon, .number-circle, .macro-icon');
            icons.forEach(icon => {
                icon.style.display = showIcon.checked ? '' : 'none';
            });
        }
        
        if (showTitle) {
            const titles = contentDiv.querySelectorAll('[class*="-title"], [class*="-header"], summary, .spoiler-header, .warning-title, .success-title, .note-title, .numbered-title, .steps-title, .comparison-title, .config-title, .quote-author');
            titles.forEach(title => {
                title.style.display = showTitle.checked ? '' : 'none';
            });
        }
        
        if (showContent) {
            const contentElements = contentDiv.querySelectorAll('[class*="-content"], [class*="-text"], .spoiler-content, .warning-text, .success-text, .note-text, .numbered-content, .steps-list, .comparison-list, .quote-text, .code-content, .link-text-container, .image-caption, .procedure-steps');
            contentElements.forEach(content => {
                content.style.display = showContent.checked ? '' : 'none';
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
        if (imageUrl) {
            const img = contentDiv.querySelector('img');
            if (img) {
                img.src = imageUrl.value;
                if (imageAlt) img.alt = imageAlt.value;
                if (imageWidth) img.style.maxWidth = imageWidth.value + 'px';
            }
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
                numberCircle.style.display = showNumber.checked ? 'flex' : 'none';
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
        
        // Настройки кнопок
        const buttonColor = settingsPanel.querySelector('.button-color-setting');
        if (buttonColor && buttonColor.value) {
            const buttons = contentDiv.querySelectorAll('a[style*="background: #20c997"]');
            buttons.forEach(btn => {
                btn.style.backgroundColor = buttonColor.value;
            });
        }
    }
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
    const contentDiv = block.querySelector('.editable-content > div');
    
    if (!settingsPanel || !contentDiv) return;
    
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
function showNotification(message, type = 'info') {
    // Удаляем существующие уведомления
    document.querySelectorAll('.notification').forEach(notif => notif.remove());
    
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    document.body.appendChild(notification);
    
    setTimeout(() => {
        if (notification.parentNode) {
            notification.remove();
        }
    }, 3000);
}

// Показать выбор макроса для вставки
function showMacroSelection(block) {
    const macroTypes = [
        {name: 'Спойлер', value: 'spoiler', icon: '📁'},
        {name: 'Предупреждение', value: 'warning', icon: '⚠️'},
        {name: 'Успех', value: 'success', icon: '✅'},
        {name: 'Примечание', value: 'note', icon: '📝'},
        {name: 'Нумерованный блок', value: 'numbered', icon: '🔢'},
        {name: 'Код', value: 'code', icon: '💻'},
        {name: 'Дата', value: 'date', icon: '📅'},
        {name: 'Ссылка', value: 'link', icon: '🔗'},
        {name: 'Изображение', value: 'image', icon: '🖼️'},
        {name: 'Цитата', value: 'quote', icon: '💬'}
    ];
    
    // Создаем модальное окно для выбора макроса
    const modal = document.createElement('div');
    modal.className = 'modal active';
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h2>Выберите макрос для вставки</h2>
                <button class="close-modal">&times;</button>
            </div>
            <div class="macros-grid">
                ${macroTypes.map(macro => `
                    <button class="macro-type-btn" data-type="${macro.value}">
                        <div class="macro-icon">${macro.icon}</div>
                        <div class="macro-name">${macro.name}</div>
                    </button>
                `).join('')}
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Обработчики для модального окна
    modal.querySelector('.close-modal').addEventListener('click', () => {
        modal.remove();
    });
    
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.remove();
        }
    });
    
    // Обработчики для кнопок выбора макроса
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
        case 'date':
            macroHTML = createDateBlock();
            break;
        case 'link':
            macroHTML = createLinkBlock();
            break;
        case 'image':
            macroHTML = createImageBlock();
            break;
        case 'quote':
            macroHTML = createQuoteBlock();
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
        if (typeof initDragForElement === 'function') {
            initDragForElement(block);
        }
    });
}

// Убедимся, что функции из templates.js доступны
if (typeof createSpoilerBlock === 'undefined') {
    console.warn('Template functions not loaded. Make sure templates.js is loaded before editor.js');
}