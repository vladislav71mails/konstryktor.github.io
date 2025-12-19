// Основные переменные
let isDarkTheme = false;
let currentSelection = null;

// Инициализация редактора
document.addEventListener('DOMContentLoaded', function() {
    initializeEditor();
    setupEventListeners();
    loadTemplates();
    initDragAndDrop();
    initContentDragAndDrop();
    setupGroupOperations(); // НОВОЕ: групповые операции
    setupKeyboardShortcuts(); // НОВОЕ: горячие клавиши
});

// Инициализация редактора
function initializeEditor() {
    const editor = document.getElementById('editor');
    if (!editor) return;
    
    editor.addEventListener('click', function(e) {
        document.querySelectorAll('.block').forEach(b => {
            b.classList.remove('selected');
        });
        
        document.querySelectorAll('.settings-panel').forEach(panel => {
            panel.style.display = 'none';
            panel.classList.remove('always-visible');
        });
        
        if (e.target.classList.contains('block') || e.target.closest('.block')) {
            const block = e.target.classList.contains('block') ? 
                e.target : e.target.closest('.block');
            block.classList.add('selected');
        }
    });
    
    document.addEventListener('selectionchange', function() {
        currentSelection = window.getSelection();
    });
}

// Настройка обработчиков событий
function setupEventListeners() {
    setupFormattingButtons();
    
    const themeToggle = document.getElementById('theme-toggle');
    if (themeToggle) {
        themeToggle.addEventListener('click', function() {
            isDarkTheme = !isDarkTheme;
            document.body.classList.toggle('dark-theme', isDarkTheme);
            this.textContent = isDarkTheme ? 'Светлая тема' : 'Темная тема';
        });
    }
    
    const exportBtn = document.getElementById('export-btn');
    if (exportBtn) {
        exportBtn.addEventListener('click', function() {
            exportHTML();
        });
    }
    
    const importBtn = document.getElementById('import-btn');
    if (importBtn) {
        importBtn.addEventListener('click', function() {
            const importModal = document.getElementById('import-modal');
            if (importModal) importModal.classList.add('active');
        });
    }
    
    const clearBtn = document.getElementById('clear-btn');
    if (clearBtn) {
        clearBtn.addEventListener('click', function() {
            if (confirm('Вы уверены, что хотите очистить редактор?')) {
                const editor = document.getElementById('editor');
                if (editor) {
                    editor.innerHTML = '<div class="drop-zone" id="initial-drop-zone">Перетащите блоки сюда или выберите шаблон из боковой панели</div>';
                    showNotification('Редактор очищен', 'success');
                }
            }
        });
    }
    
    document.querySelectorAll('.close-modal').forEach(btn => {
        btn.addEventListener('click', function() {
            const modal = this.closest('.modal');
            if (modal) modal.classList.remove('active');
        });
    });
    
    const copyBtn = document.getElementById('copy-btn');
    if (copyBtn) {
        copyBtn.addEventListener('click', function() {
            const exportArea = document.getElementById('export-area');
            if (exportArea) {
                exportArea.select();
                document.execCommand('copy');
                showNotification('HTML скопирован в буфер обмена!', 'success');
            }
        });
    }
    
    const importConfirmBtn = document.getElementById('import-confirm-btn');
    if (importConfirmBtn) {
        importConfirmBtn.addEventListener('click', function() {
            const importArea = document.getElementById('import-area');
            const editor = document.getElementById('editor');
            const importModal = document.getElementById('import-modal');
            
            if (importArea && importArea.value.trim() && editor) {
                editor.innerHTML = importArea.value;
                reinitializeBlocks();
                if (importModal) importModal.classList.remove('active');
                showNotification('HTML успешно импортирован!', 'success');
            }
        });
    }
    
    const insertCustomHtmlBtn = document.getElementById('insert-custom-html');
    if (insertCustomHtmlBtn) {
        insertCustomHtmlBtn.addEventListener('click', function() {
            const customHtmlArea = document.getElementById('custom-html-area');
            const customHtmlModal = document.getElementById('custom-html-modal');
            
            if (customHtmlArea && customHtmlArea.value.trim()) {
                insertCustomHTML(customHtmlArea.value);
                if (customHtmlModal) customHtmlModal.classList.remove('active');
                customHtmlArea.value = '';
            }
        });
    }
}

// Настройка кнопок форматирования
function setupFormattingButtons() {
    const commands = {
        'bold-btn': 'bold',
        'italic-btn': 'italic',
        'underline-btn': 'underline',
        'strikethrough-btn': 'strikethrough',
        'code-btn': 'formatBlock',
        'link-btn': 'createLink',
        'image-btn': 'insertImage',
        'align-left': 'justifyLeft',
        'align-center': 'justifyCenter',
        'align-right': 'justifyRight',
        'ordered-list': 'insertOrderedList',
        'unordered-list': 'insertUnorderedList'
    };
    
    for (const [id, command] of Object.entries(commands)) {
        const button = document.getElementById(id);
        if (button) {
            button.addEventListener('click', function() {
                if (command === 'createLink') {
                    const url = prompt('Введите URL:');
                    if (url) document.execCommand(command, false, url);
                } else if (command === 'insertImage') {
                    const url = prompt('Введите URL изображения:');
                    if (url) document.execCommand(command, false, url);
                } else if (command === 'formatBlock') {
                    document.execCommand(command, false, '<code>');
                } else {
                    document.execCommand(command, false, null);
                }
            });
        }
    }
    
    const fontSize = document.getElementById('font-size');
    if (fontSize) {
        fontSize.addEventListener('change', function() {
            const size = this.value;
            if (size) {
                document.execCommand('fontSize', false, '7');
                document.execCommand('styleWithCSS', false, true);
                document.execCommand('fontSize', false, size);
            }
        });
    }
    
    const fontFamily = document.getElementById('font-family');
    if (fontFamily) {
        fontFamily.addEventListener('change', function() {
            const font = this.value;
            if (font) document.execCommand('fontName', false, font);
        });
    }
    
    const textColor = document.getElementById('text-color');
    if (textColor) {
        textColor.addEventListener('change', function() {
            document.execCommand('foreColor', false, this.value);
        });
    }
    
    const bgColor = document.getElementById('bg-color');
    if (bgColor) {
        bgColor.addEventListener('change', function() {
            document.execCommand('backColor', false, this.value);
        });
    }
}

// Групповые операции с блоками
function setupGroupOperations() {
    const header = document.querySelector('.header');
    if (!header) return;
    
    const groupActions = document.createElement('div');
    groupActions.className = 'group-actions';
    groupActions.innerHTML = `
        <button id="select-all-btn">Выделить все</button>
        <button id="copy-selected-btn">Копировать выделенные</button>
        <button id="delete-selected-btn">Удалить выделенные</button>
    `;
    header.appendChild(groupActions);
    
    document.getElementById('select-all-btn').addEventListener('click', selectAllBlocks);
    document.getElementById('copy-selected-btn').addEventListener('click', copySelectedBlocks);
    document.getElementById('delete-selected-btn').addEventListener('click', deleteSelectedBlocks);
}

function selectAllBlocks() {
    document.querySelectorAll('.block').forEach(block => {
        block.classList.add('selected');
    });
    showNotification('Все блоки выделены', 'info');
}

function deselectAllBlocks() {
    document.querySelectorAll('.block').forEach(block => {
        block.classList.remove('selected');
    });
    showNotification('Выделение снято', 'info');
}

function copySelectedBlocks() {
    const selectedBlocks = document.querySelectorAll('.block.selected');
    if (selectedBlocks.length === 0) {
        showNotification('Нет выделенных блоков', 'warning');
        return;
    }
    
    selectedBlocks.forEach(block => {
        if (typeof copyBlock === 'function') {
            copyBlock(block);
        }
    });
    
    showNotification(`Скопировано блоков: ${selectedBlocks.length}`, 'success');
}

function deleteSelectedBlocks() {
    const selectedBlocks = document.querySelectorAll('.block.selected');
    if (selectedBlocks.length === 0) {
        showNotification('Нет выделенных блоков', 'warning');
        return;
    }
    
    if (confirm(`Удалить ${selectedBlocks.length} выделенных блоков?`)) {
        selectedBlocks.forEach(block => {
            block.remove();
        });
        showNotification(`Удалено блоков: ${selectedBlocks.length}`, 'success');
    }
}

// Горячие клавиши
function setupKeyboardShortcuts() {
    document.addEventListener('keydown', function(e) {
        // Ctrl/Cmd + A - выделить все блоки
        if ((e.ctrlKey || e.metaKey) && e.key === 'a') {
            e.preventDefault();
            selectAllBlocks();
        }
        
        // Ctrl/Cmd + C - копировать выделенные блоки
        if ((e.ctrlKey || e.metaKey) && e.key === 'c') {
            const selectedBlocks = document.querySelectorAll('.block.selected');
            if (selectedBlocks.length > 0) {
                e.preventDefault();
                copySelectedBlocks();
            }
        }
        
        // Delete - удалить выделенные блоки
        if (e.key === 'Delete') {
            const selectedBlocks = document.querySelectorAll('.block.selected');
            if (selectedBlocks.length > 0) {
                e.preventDefault();
                deleteSelectedBlocks();
            }
        }
        
        // Escape - снять выделение
        if (e.key === 'Escape') {
            deselectAllBlocks();
        }
    });
}

// Загрузка шаблонов
function loadTemplates() {
    // Обработчики добавляются в initTemplateCategories()
}

// Переинициализация всех блоков
function reinitializeBlocks() {
    document.querySelectorAll('.block').forEach(block => {
        // Используем функцию из editor.js, если она доступна
        if (typeof addBlockEventListeners === 'function') {
            addBlockEventListeners(block);
        }
        if (typeof initDragForElement === 'function') {
            initDragForElement(block);
        }
    });
}

// Экспорт HTML (ИСПРАВЛЕННАЯ ВЕРСИЯ)
function exportHTML() {
    const editor = document.getElementById('editor');
    const exportArea = document.getElementById('export-area');
    const exportModal = document.getElementById('export-modal');
    
    if (!editor || !exportArea || !exportModal) {
        showNotification('Ошибка: Не удалось найти элементы для экспорта', 'error');
        return;
    }
    
    if (editor.innerHTML.trim() === '') {
        showNotification('Редактор пуст. Нечего экспортировать.', 'warning');
        return;
    }
    
    // Клонируем контент
    const contentClone = editor.cloneNode(true);
    
    // Шаг 1: Сохраняем вложенный контент перед удалением nested-editor
    contentClone.querySelectorAll('.nested-editor').forEach(nested => {
        const parent = nested.parentElement; // Обычно .editable-content
        if (parent) {
            // Перемещаем детей nested-editor в parent
            while (nested.firstChild) {
                parent.insertBefore(nested.firstChild, nested);
            }
        }
    });
    
    // Шаг 2: Удаляем все UI-элементы (расширенный список, чтобы поймать всё скрытое)
    contentClone.querySelectorAll(
        '.drag-handle, .block-actions, .block-settings, .settings-panel, .nested-editor, .insert-macro-btn, .drop-zone'
    ).forEach(el => el.remove());
    
    // Шаг 3: Очищаем атрибуты
    contentClone.querySelectorAll('[contenteditable], [draggable]').forEach(el => {
        el.removeAttribute('contenteditable');
        el.removeAttribute('draggable');
    });
    
    // Шаг 4: Очищаем классы блоков
    contentClone.querySelectorAll('.block').forEach(el => {
        const contentClass = Array.from(el.classList).find(cls => cls.startsWith('content-'));
        el.className = contentClass || ''; // Только content-xxx
        el.removeAttribute('style'); // Удаляем style, если он пустой или ненужный (CSS vars конвертируем ниже)
    });
    
    // Шаг 5: Удаляем пустые контейнеры (например, editable-content без детей)
    contentClone.querySelectorAll('.editable-content').forEach(content => {
        if (content.innerHTML.trim() === '') {
            content.remove();
        } else {
            // Если есть дети, перемещаем их на уровень выше (в .block)
            const parentBlock = content.closest('.block');
            if (parentBlock) {
                while (content.firstChild) {
                    parentBlock.appendChild(content.firstChild);
                }
                content.remove();
            }
        }
    });
    
    // Шаг 6: Конвертируем CSS vars в значения (расширенный список, всегда light-версия)
    convertCssVarsToValues(contentClone, isDarkTheme ? 'light' : 'light'); // Всегда экспорт в light для consistency
    
    // Шаг 7: Получаем чистый HTML и показываем
    const cleanHTML = contentClone.innerHTML.trim();
    exportArea.value = cleanHTML;
    exportModal.classList.add('active');
    
    showNotification('Экспорт выполнен успешно! Лишний код удалён.', 'success');
}

// Конвертирует CSS переменные в реальные значения (ИСПРАВЛЕННАЯ: расширенный список, параметр theme)
function convertCssVarsToValues(element, theme = 'light') {
    const stylesToConvert = [
        { var: 'var(--primary-color)', light: '#337ab7', dark: '#4a90e2' },
        { var: 'var(--primary-hover)', light: '#2a6ba0', dark: '#3a7cc2' },
        { var: 'var(--secondary-color)', light: '#f5f5f5', dark: '#2d2d2d' },
        { var: 'var(--border-color)', light: '#ccc', dark: '#444' },
        { var: 'var(--success-color)', light: '#eaf8db', dark: '#2d4a2d' },
        { var: 'var(--warning-color)', light: '#fffed1', dark: '#4a4a2d' },
        { var: 'var(--danger-color)', light: '#ffd1d1', dark: '#4a2d2d' },
        { var: 'var(--text-color)', light: '#333', dark: '#e0e0e0' },
        { var: 'var(--bg-color)', light: '#fff', dark: '#1e1e1e' },
        { var: 'var(--border-radius)', light: '4px', dark: '4px' },
        { var: 'var(--border-radius-lg)', light: '8px', dark: '8px' },
        { var: 'var(--spacing-xs)', light: '5px', dark: '5px' },
        { var: 'var(--spacing-sm)', light: '10px', dark: '10px' },
        { var: 'var(--spacing-md)', light: '15px', dark: '15px' },
        { var: 'var(--spacing-lg)', light: '20px', dark: '20px' }
        // Добавьте больше, если нужно
    ];
    
    element.querySelectorAll('[style]').forEach(el => {
        let style = el.getAttribute('style') || '';
        stylesToConvert.forEach(styleVar => {
            const replacement = theme === 'light' ? styleVar.light : styleVar.dark;
            style = style.replace(new RegExp(styleVar.var.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&'), 'g'), replacement);
        });
        if (style.trim()) {
            el.setAttribute('style', style);
        } else {
            el.removeAttribute('style');
        }
    });
}

// Вставка пользовательского HTML
function insertCustomHTML(html) {
    const editor = document.getElementById('editor');
    if (!editor) return;
    
    const initialDropZone = document.getElementById('initial-drop-zone');
    if (initialDropZone) {
        initialDropZone.remove();
    }
    
    const div = document.createElement('div');
    div.innerHTML = `
    <div class="block content-custom" draggable="true">
        <div class="drag-handle">≡</div>
        <div class="block-actions">
            <button class="edit-block" title="Редактировать">✏️</button>
            <button class="copy-block" title="Копировать">📋</button>
            <button class="settings-block" title="Настройки">⚙️</button>
            <button class="delete-block" title="Удалить">🗑️</button>
        </div>
        <div class="block-settings">
            <button class="insert-macro-btn">+ Вставить макрос</button>
        </div>
        <div class="settings-panel">
            <label>Цвет фона: <input type="color" class="bg-color-setting"></label>
            <label>Цвет текста: <input type="color" class="text-color-setting"></label>
            <label>Цвет границы: <input type="color" class="border-color-setting"></label>
            <button class="apply-settings">Применить</button>
        </div>
        <div class="editable-content" contenteditable="true">
            ${html}
            <div class="nested-editor" contenteditable="true">
            </div>
        </div>
    </div>`;
    
    const newBlock = div.firstElementChild;
    editor.appendChild(newBlock);
    
    if (typeof addBlockEventListeners === 'function') {
        addBlockEventListeners(newBlock);
    }
    if (typeof initDragForElement === 'function') {
        initDragForElement(newBlock);
    }
    
    showNotification('Пользовательский HTML вставлен', 'success');
}

// Уведомления (если не определены в editor.js)
if (typeof showNotification === 'undefined') {
    function showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;
        notification.style.cssText = 'position: fixed; top: 20px; right: 20px; padding: 15px; border-radius: 4px; border: 1px solid transparent; z-index: 10000;';
        
        if (type === 'success') {
            notification.style.background = '#d4edda';
            notification.style.borderColor = '#c3e6cb';
            notification.style.color = '#155724';
        } else if (type === 'error') {
            notification.style.background = '#f8d7da';
            notification.style.borderColor = '#f5c6cb';
            notification.style.color = '#721c24';
        } else if (type === 'warning') {
            notification.style.background = '#fff3cd';
            notification.style.borderColor = '#ffeeba';
            notification.style.color = '#856404';
        } else {
            notification.style.background = '#d1ecf1';
            notification.style.borderColor = '#bee5eb';
            notification.style.color = '#0c5460';
        }
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            if (notification.parentNode) {
                notification.remove();
            }
        }, 3000);
    }
}