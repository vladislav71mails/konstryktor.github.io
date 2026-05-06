// Категории шаблонов
const templateCategories = {
    basic: {
        name: 'Основные блоки',
        templates: ['spoiler', 'warning', 'success', 'note', 'numbered', 'code']
    },
    content: {
        name: 'Контентные блоки',
        templates: ['image', 'quote']
    },
    technical: {
        name: 'Технические блоки',
        templates: ['link-buttons', '1c-configuration']
    },
    documentation: {
        name: 'Документация',
        templates: ['glossary', 'image-caption', 'type-comparison', 'developer-note']
    },
    custom: {
        name: 'Пользовательские',
        templates: ['custom']
    }
};

// УНИВЕРСАЛЬНЫЙ ШАБЛОН ДЛЯ НАСТРОЕК
const universalSettingsHTML = `
    <div class="settings-group">
        <div class="settings-group-title">Внешний вид</div>
        <div class="settings-row">
            <label class="settings-label">Цвет фона:</label>
            <input type="color" class="settings-control bg-color-setting">
        </div>
        <div class="settings-row">
            <label class="settings-label">Цвет текста:</label>
            <input type="color" class="settings-control text-color-setting">
        </div>
        <div class="settings-row">
            <label class="settings-label">Цвет границы:</label>
            <input type="color" class="settings-control border-color-setting">
        </div>
    </div>
    
    <div class="settings-group">
        <div class="settings-group-title">Видимость элементов</div>
        <div class="settings-row">
            <label class="settings-label">
                <input type="checkbox" class="settings-control show-icon" checked>
                Показывать иконки
            </label>
        </div>
        <div class="settings-row">
            <label class="settings-label">
                <input type="checkbox" class="settings-control show-title" checked>
                Показывать заголовки
            </label>
        </div>
        <div class="settings-row">
            <label class="settings-label">
                <input type="checkbox" class="settings-control show-content" checked>
                Показывать содержимое
            </label>
        </div>
    </div>
    
    <div class="settings-actions">
        <button class="settings-btn apply-settings" type="button">Применить настройки</button>
        <button class="settings-btn reset-defaults" type="button">Вернуть по умолчанию</button>
        <button class="settings-btn close-settings" type="button">Закрыть</button>
    </div>
`;

// Инициализация категорий в сайдбаре
function initTemplateCategories() {
    const sidebar = document.querySelector('.sidebar .templates');
    if (!sidebar) return;
    
    sidebar.innerHTML = '';

    for (const [categoryId, category] of Object.entries(templateCategories)) {
        const categoryElement = document.createElement('div');
        categoryElement.className = 'template-category';
        categoryElement.innerHTML = `
            <div class="category-header">
                <h4>${category.name}</h4>
                <span class="category-toggle">▼</span>
            </div>
            <div class="category-templates">
                ${category.templates.map(templateId => createTemplateItem(templateId)).join('')}
            </div>
        `;
        sidebar.appendChild(categoryElement);
    }

    document.querySelectorAll('.category-header').forEach(header => {
        header.addEventListener('click', function() {
            const category = this.parentElement;
            const templates = category.querySelector('.category-templates');
            const toggle = this.querySelector('.category-toggle');
            
            templates.style.display = templates.style.display === 'none' ? 'block' : 'none';
            toggle.textContent = templates.style.display === 'none' ? '►' : '▼';
        });
    });

    document.querySelectorAll('.template-item').forEach(item => {
        item.addEventListener('click', function() {
            const templateType = this.getAttribute('data-template');
            insertTemplate(templateType);
        });
    });
}

// Создание элемента шаблона
function createTemplateItem(templateId) {
    const templates = {
        'spoiler': { name: 'Спойлер', desc: 'Раскрывающийся блок с заголовком' },
        'warning': { name: 'Предупреждение', desc: 'Блок с предупреждающим сообщением' },
        'success': { name: 'Успех', desc: 'Блок с сообщением об успехе' },
        'note': { name: 'Примечание', desc: 'Блок с дополнительной информацией' },
        'numbered': { name: 'Нумерованный блок', desc: 'Блок с номером и заголовком' },
        'code': { name: 'Код', desc: 'Блок для выделения кода' },
        'image': { name: 'Изображение', desc: 'Блок для вставки изображений' },
        'quote': { name: 'Цитата', desc: 'Блок для выделения цитат' },
        'link-buttons': { name: 'Кнопки-ссылки', desc: 'Группа кнопок-ссылок' },
        '1c-configuration': { name: 'Конфигурация 1С', desc: 'Настройки для разных версий 1С' },
        'glossary': { name: 'Термины', desc: 'Блок с определениями терминов' },
        'image-caption': { name: 'Изображение с подписью', desc: 'Скриншот с описанием' },
        'type-comparison': { name: 'Сравнение типов', desc: 'Сравнение разных вариантов' },
        'developer-note': { name: 'Примечание разработчика', desc: 'Технические примечания' },
        'custom': { name: 'Пользовательский HTML', desc: 'Вставить свой HTML код' }
    };

    const template = templates[templateId];
    return `
        <div class="template-item" data-template="${templateId}">
            <strong>${template.name}</strong>
            <div class="template-preview">${template.desc}</div>
        </div>
    `;
}

// Вставка шаблона
function insertTemplate(type) {
    const editor = document.getElementById('editor');
    if (!editor) return;
    
    const initialDropZone = document.getElementById('initial-drop-zone');
    if (initialDropZone) {
        initialDropZone.remove();
    }
    
    let html = '';
    
    switch(type) {
        case 'spoiler': html = createSpoilerBlock(); break;
        case 'warning': html = createWarningBlock(); break;
        case 'success': html = createSuccessBlock(); break;
        case 'note': html = createNoteBlock(); break;
        case 'numbered': html = createNumberedBlock(); break;
        case 'code': html = createCodeBlock(); break;
        case 'image': html = createImageBlock(); break;
        case 'quote': html = createQuoteBlock(); break;
        case 'link-buttons': html = createLinkButtonsBlock(); break;
        case '1c-configuration': html = create1CConfigurationBlock(); break;
        case 'glossary': html = createGlossaryBlock(); break;
        case 'image-caption': html = createImageCaptionBlock(); break;
        case 'type-comparison': html = createTypeComparisonBlock(); break;
        case 'developer-note': html = createDeveloperNoteBlock(); break;
        case 'custom':
            document.getElementById('custom-html-modal').style.display = 'flex';
            return;
        default:
            console.warn('Неизвестный тип шаблона:', type);
            return;
    }
    
    if (!html) return;
    
    const div = document.createElement('div');
    div.innerHTML = html;
    const newBlock = div.firstElementChild;
    editor.appendChild(newBlock);
    
    addBlockEventListeners(newBlock);
    initDragForElement(newBlock);
}

// Функции создания блоков с универсальными настройками
function createSpoilerBlock() {
    return `
    <div class="block content-spoiler" draggable="true">
        <div class="drag-handle">≡</div>
        <div class="block-actions">
            <button class="edit-block" title="Редактировать">✏️</button>
            <button class="copy-block" title="Копировать">📋</button>
              <button class="export-html-block" title="Экспорт HTML">🚀</button>
            <button class="settings-block" title="Настройки">⚙️</button>
            <button class="delete-block" title="Удалить">🗑️</button>
        </div>
        <div class="block-settings">
            <button class="insert-macro-btn">+ Вставить макрос</button>
        </div>
        <div class="settings-panel">
            ${universalSettingsHTML}
        </div>
        <div class="editable-content" contenteditable="false">
            <details class="spoiler-container" style="margin-bottom: 20px; border: 1px solid #ccc; border-radius: 5px;">
                <summary class="spoiler-header" style="background: #f5f5f5; padding: 12px 15px; cursor: pointer; font-weight: bold;">
                    <strong>Название спойлера</strong>
                </summary>
                <div class="spoiler-content" style="padding: 15px;">
                    Содержимое спойлера
                    <div class="nested-editor" contenteditable="true">
                    </div>
                </div>
            </details>
        </div>
    </div>`;
}

function createWarningBlock() {
    return `
    <div class="block content-warning" draggable="true">
        <div class="drag-handle">≡</div>
        <div class="block-actions">
            <button class="edit-block" title="Редактировать">✏️</button>
            <button class="copy-block" title="Копировать">📋</button>
            <button class="export-html-block" title="Экспорт HTML">🚀</button>
            <button class="settings-block" title="Настройки">⚙️</button>
            <button class="delete-block" title="Удалить">🗑️</button>
        </div>
        <div class="block-settings">
            <button class="insert-macro-btn">+ Вставить макрос</button>
        </div>
        <div class="settings-panel">
            ${universalSettingsHTML}
        </div>
        <div class="editable-content" contenteditable="false">
            <div class="warning-container" style="background: #ffd1d1; border: 2px solid #7a0000; padding: 15px; margin-bottom: 15px; border-radius: 4px;">
                <div class="warning-header" style="display: flex; align-items: center; margin-bottom: 10px;">
                    <div class="warning-icon" style="border: 2px solid #7a0000; background: #ffc6e3; color: #7a0000; width: 30px; height: 30px; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin-right: 10px; font-weight: bold;">!</div>
                    <div class="warning-title" contenteditable="true"><strong>Важно !</strong></div>
                </div>
                <div class="warning-content-area">
                    <div class="warning-text" contenteditable="true">
                        Текст предупреждения
                    </div>
                    <div class="nested-content" style="margin-top: 15px;">
                        <!-- Здесь будут вложенные макросы и текст -->
                    </div>
                </div>
            </div>
        </div>
    </div>`;
}
function createSuccessBlock() {
    return `
    <div class="block content-success" draggable="true">
        <div class="drag-handle">≡</div>
        <div class="block-actions">
            <button class="edit-block" title="Редактировать">✏️</button>
            <button class="copy-block" title="Копировать">📋</button>
            <button class="export-html-block" title="Экспорт HTML">🚀</button>
            <button class="settings-block" title="Настройки">⚙️</button>
            <button class="delete-block" title="Удалить">🗑️</button>
        </div>
        <div class="block-settings">
            <button class="insert-macro-btn">+ Вставить макрос</button>
        </div>
        <div class="settings-panel">
            ${universalSettingsHTML}
        </div>
        <div class="editable-content" contenteditable="false">
            <div class="success-container" style="background: #eaf8db; border: 2px solid #2e7d32; padding: 15px; margin-bottom: 15px; border-radius: 4px;">
                <div class="success-header" style="display: flex; align-items: center; margin-bottom: 10px;">
                    <div class="success-icon" style="border: 2px solid #2e7d32; background: #c8e6c9; color: #2e7d32; width: 30px; height: 30px; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin-right: 10px; font-weight: bold;">✓</div>
                    <div class="success-title"><strong>Успешно !</strong></div>
                </div>
                <div class="success-text">
                    Текст успешного действия
                    <div class="nested-editor" contenteditable="true">
                    </div>
                </div>
            </div>
        </div>
    </div>`;
}

function createNoteBlock() {
    return `
    <div class="block content-note" draggable="true">
        <div class="drag-handle">≡</div>
        <div class="block-actions">
            <button class="edit-block" title="Редактировать">✏️</button>
            <button class="copy-block" title="Копировать">📋</button>
            <button class="export-html-block" title="Экспорт HTML">🚀</button>
            <button class="settings-block" title="Настройки">⚙️</button>
            <button class="delete-block" title="Удалить">🗑️</button>
        </div>
        <div class="block-settings">
            <button class="insert-macro-btn">+ Вставить макрос</button>
        </div>
        <div class="settings-panel">
            ${universalSettingsHTML}
        </div>
        <div class="editable-content" contenteditable="false">
            <div class="note-container" style="background: #fffed1; border: 2px solid #ffc107; padding: 15px; margin-bottom: 15px; border-radius: 4px;">
                <div class="note-header" style="display: flex; align-items: center; margin-bottom: 10px;">
                    <div class="note-icon" style="border: 2px solid #ffc107; background: #fff9c4; color: #ffc107; width: 30px; height: 30px; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin-right: 10px; font-weight: bold;">📝</div>
                    <div class="note-title"><strong>Примечание</strong></div>
                </div>
                <div class="note-text">
                    Текст примечания
                    <div class="nested-editor" contenteditable="true">
                    </div>
                </div>
            </div>
        </div>
    </div>`;
}

function createNumberedBlock() {
    return `
    <div class="block content-numbered" draggable="true">
        <div class="drag-handle">≡</div>
        <div class="block-actions">
            <button class="edit-block" title="Редактировать">✏️</button>
            <button class="copy-block" title="Копировать">📋</button>
            <button class="export-html-block" title="Экспорт HTML">🚀</button>
            <button class="settings-block" title="Настройки">⚙️</button>
            <button class="delete-block" title="Удалить">🗑️</button>
        </div>
        <div class="block-settings">
            <button class="insert-macro-btn">+ Вставить макрос</button>
        </div>
        <div class="settings-panel">
            ${universalSettingsHTML}
        </div>
        <div class="editable-content" contenteditable="false">
            <div class="numbered-container" style="background: #f8f9fa; border: 1px solid #e9ecef; padding: 15px; margin-bottom: 15px; border-radius: 4px;">
                <div class="numbered-header" style="display: flex; align-items: center; margin-bottom: 10px;">
                    <div class="number-circle" style="background: #222222; color: white; width: 30px; height: 30px; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin-right: 10px; font-weight: bold;">1</div>
                    <div class="numbered-title"><strong>Заголовок</strong></div>
                </div>
                <div class="numbered-content">
                    Содержимое блока
                    <div class="nested-editor" contenteditable="true">
                    </div>
                </div>
            </div>
        </div>
    </div>`;
}

function createCodeBlock() {
    return `
    <div class="block content-code" draggable="true">
        <div class="drag-handle">≡</div>
        <div class="block-actions">
            <button class="edit-block" title="Редактировать">✏️</button>
            <button class="copy-block" title="Копировать">📋</button>
            <button class="export-html-block" title="Экспорт HTML">🚀</button>
            <button class="settings-block" title="Настройки">⚙️</button>
            <button class="delete-block" title="Удалить">🗑️</button>
        </div>
        <div class="block-settings">
            <button class="insert-macro-btn">+ Вставить макрос</button>
        </div>
        <div class="settings-panel">
            ${universalSettingsHTML}
        </div>
        <div class="editable-content" contenteditable="false">
            <div class="code-container" style="background: #f8f8f8; padding: 5px; border: 1px solid #ddd; border-radius: 5px;">
                <code class="code-content">ТЕКСТ</code>
                <div class="nested-editor" contenteditable="true">
                </div>
            </div>
        </div>
    </div>`;
}




function createImageBlock() {
    return `
    <div class="block content-image" draggable="true">
        <div class="drag-handle">≡</div>
        <div class="block-actions">
            <button class="edit-block" title="Редактировать">✏️</button>
            <button class="copy-block" title="Копировать">📋</button>
            <button class="export-html-block" title="Экспорт HTML">🚀</button>
            <button class="settings-block" title="Настройки">⚙️</button>
            <button class="delete-block" title="Удалить">🗑️</button>
        </div>
        <div class="block-settings">
            <button class="insert-macro-btn">+ Вставить макрос</button>
        </div>
        <div class="settings-panel">
            ${universalSettingsHTML}
        </div>
        <div class="editable-content" contenteditable="false">
            <div class="image-container" style="background: #f8f9fa; border: 1px solid #e9ecef; padding: 15px; margin-bottom: 15px; border-radius: 4px; text-align: center;">
                <img src="https://via.placeholder.com/600x400" alt="Описание изображения" class="image-element" style="max-width: 100%; height: auto; border-radius: 4px; margin-bottom: 10px;">
                <div class="image-caption" style="color: #666; font-style: italic; font-size: 14px;">
                    Описание изображения
                </div>
            </div>
        </div>
    </div>`;
}

function createQuoteBlock() {
    return `
    <div class="block content-quote" draggable="true">
        <div class="drag-handle">≡</div>
        <div class="block-actions">
            <button class="edit-block" title="Редактировать">✏️</button>
            <button class="copy-block" title="Копировать">📋</button>
     <button class="export-html-block" title="Экспорт HTML">🚀</button>
            <button class="settings-block" title="Настройки">⚙️</button>
            <button class="delete-block" title="Удалить">🗑️</button>
        </div>
        <div class="block-settings">
            <button class="insert-macro-btn">+ Вставить макрос</button>
        </div>
        <div class="settings-panel">
            ${universalSettingsHTML}
        </div>
        <div class="editable-content" contenteditable="false">
            <div class="quote-container" style="background: #f0f8ff; border-left: 4px solid #4a90e2; padding: 15px 20px; margin-bottom: 15px; border-radius: 0 4px 4px 0;">
                <div class="quote-text" style="font-style: italic; color: #2c3e50; line-height: 1.6;">
                    "Важная цитата или ключевая мысль, которую нужно выделить в тексте"
                </div>
                <div class="quote-author" style="margin-top: 10px; text-align: right; color: #7f8c8d; font-size: 14px;">
                    — Автор или источник
                </div>
            </div>
        </div>
    </div>`;
}


function createLinkButtonsBlock() {
    return `
    <div class="block content-link-buttons" draggable="true">
        <div class="drag-handle">≡</div>
        <div class="block-actions">
            <button class="edit-block" title="Редактировать">✏️</button>
            <button class="copy-block" title="Копировать">📋</button>
        <button class="export-html-block" title="Экспорт HTML">🚀</button>
            <button class="settings-block" title="Настройки">⚙️</button>
            <button class="delete-block" title="Удалить">🗑️</button>
        </div>
        <div class="block-settings">
            <button class="insert-macro-btn">+ Вставить макрос</button>
        </div>
        <div class="settings-panel">
            ${universalSettingsHTML}
        </div>
        <div class="editable-content" contenteditable="false">
            <div class="link-buttons-container" style="display: flex; flex-wrap: wrap; gap: 10px; margin-top: 10px;">
                <a class="link-button" style="padding: 8px 12px; background: #20c997; color: white; text-decoration: none; border-radius: 6px; font-weight: 500;" href="https://example.com">Ссылка 1</a>
                <a class="link-button" style="padding: 8px 12px; background: #20c997; color: white; text-decoration: none; border-radius: 6px; font-weight: 500;" href="https://example.com">Ссылка 2</a>
                <a class="link-button" style="padding: 8px 12px; background: #20c997; color: white; text-decoration: none; border-radius: 6px; font-weight: 500;" href="https://example.com">Ссылка 3</a>
            </div>
        </div>
    </div>`;
}




function create1CConfigurationBlock() {
    return `
    <div class="block content-1c-configuration" draggable="true">
        <div class="drag-handle">≡</div>
        <div class="block-actions">
            <button class="edit-block" title="Редактировать">✏️</button>
            <button class="copy-block" title="Копировать">📋</button>
            <button class="export-html-block" title="Экспорт HTML">🚀</button>
            <button class="settings-block" title="Настройки">⚙️</button>
            <button class="delete-block" title="Удалить">🗑️</button>
        </div>
        <div class="block-settings">
            <button class="insert-macro-btn">+ Вставить макрос</button>
        </div>
        <div class="settings-panel">
            ${universalSettingsHTML}
        </div>
        <div class="editable-content" contenteditable="false">
            <div class="config-container" style="background: #f8f9fa; border: 1px solid #e9ecef; padding: 15px; margin-bottom: 15px; border-radius: 4px;">
                <div class="config-header" style="display: flex; align-items: center; margin-bottom: 10px;">
                    <div class="config-icon" style="background: #337ab7; color: white; width: 30px; height: 30px; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin-right: 10px; font-weight: bold;">1С</div>
                    <div class="config-title"><strong>Настройка оборудования в 1С</strong></div>
                </div>
                
                <details class="config-details" style="margin-bottom: 15px; border: 1px solid #ccc; border-radius: 5px;">
                    <summary class="config-summary" style="background: #337ab7; padding: 12px 15px; cursor: pointer; font-weight: bold; color: white;">"Бухгалтерии предприятия"</summary>
                    <div class="config-content" style="padding: 15px; background: #ffffff;">
                        <strong>Путь настройки:</strong><br>
                        «Администрирование» → «Поддержка оборудования» → «Подключаемое оборудование» → «Подключить новое»
                    </div>
                </details>
                
                <details class="config-details" style="margin-bottom: 15px; border: 1px solid #ccc; border-radius: 5px;">
                    <summary class="config-summary" style="background: #337ab7; padding: 12px 15px; cursor: pointer; font-weight: bold; color: white;">"Управления нашей фирмой"</summary>
                    <div class="config-content" style="padding: 15px; background: #ffffff;">
                        <strong>Путь настройки:</strong><br>
                        «Настройки» → «Поддержка оборудования» → «Подключаемое оборудование»
                    </div>
                </details>
            </div>
        </div>
    </div>`;
}

function createGlossaryBlock() {
    return `
    <div class="block content-glossary" draggable="true">
        <div class="drag-handle">≡</div>
        <div class="block-actions">
            <button class="edit-block" title="Редактировать">✏️</button>
            <button class="copy-block" title="Копировать">📋</button>
            <button class="export-html-block" title="Экспорт HTML">🚀</button>
            <button class="settings-block" title="Настройки">⚙️</button>
            <button class="delete-block" title="Удалить">🗑️</button>
        </div>
        <div class="block-settings">
            <button class="insert-macro-btn">+ Вставить макрос</button>
        </div>
        <div class="settings-panel">
            ${universalSettingsHTML}
        </div>
        <div class="editable-content" contenteditable="false">
            <div class="glossary-container" style="background: #e8f4fd; border-left: 4px solid #2196F3; padding: 10px 15px; margin: 10px 0;">
                <strong>ЦТО:</strong> Центр технологического обслуживания - отвечает за настройку оборудования
            </div>
        </div>
    </div>`;
}

function createImageCaptionBlock() {
    return `
    <div class="block content-image-caption" draggable="true">
        <div class="drag-handle">≡</div>
        <div class="block-actions">
            <button class="edit-block" title="Редактировать">✏️</button>
            <button class="copy-block" title="Копировать">📋</button>
          <button class="export-html-block" title="Экспорт HTML">🚀</button>
            <button class="settings-block" title="Настройки">⚙️</button>
            <button class="delete-block" title="Удалить">🗑️</button>
        </div>
        <div class="block-settings">
            <button class="insert-macro-btn">+ Вставить макрос</button>
        </div>
        <div class="settings-panel">
            ${universalSettingsHTML}
        </div>
        <div class="editable-content" contenteditable="false">
            <div class="image-caption-container" style="text-align: center; margin: 15px 0;">
                <img class="image-element" style="max-width: 100%; height: auto; border: 1px solid #ddd; border-radius: 4px; margin: 10px 0;" src="https://via.placeholder.com/800x400" alt="Описание изображения" />
                <div class="caption-text" style="color: #666; font-style: italic; font-size: 14px; margin-top: 5px;">
                    Описание изображения или скриншота
                </div>
            </div>
        </div>
    </div>`;
}

function createTypeComparisonBlock() {
    return `
    <div class="block content-type-comparison" draggable="true">
        <div class="drag-handle">≡</div>
        <div class="block-actions">
            <button class="edit-block" title="Редактировать">✏️</button>
            <button class="copy-block" title="Копировать">📋</button>
            <button class="export-html-block" title="Экспорт HTML">🚀</button>
            <button class="settings-block" title="Настройки">⚙️</button>
            <button class="delete-block" title="Удалить">🗑️</button>
        </div>
        <div class="block-settings">
            <button class="insert-macro-btn">+ Вставить макрос</button>
        </div>
        <div class="settings-panel">
            ${universalSettingsHTML}
        </div>
        <div class="editable-content" contenteditable="false">
            <div class="type-comparison-container" style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin: 15px 0;">
                <div class="comparison-item" style="background: #f8f9fa; padding: 15px; border-radius: 4px;">
                    <strong>COM-порт</strong>
                    <ul class="comparison-features" style="margin: 10px 0; padding-left: 20px;">
                        <li>Физическое подключение через COM-порт</li>
                        <li>Требует настройки порта в системе</li>
                        <li>Стабильное соединение</li>
                    </ul>
                </div>
                <div class="comparison-item" style="background: #f8f9fa; padding: 15px; border-radius: 4px;">
                    <strong>IP-подключение</strong>
                    <ul class="comparison-features" style="margin: 10px 0; padding-left: 20px;">
                        <li>Сетевое подключение по TCP/IP</li>
                        <li>Требует настройки сетевых параметров</li>
                        <li>Удобно для удаленного доступа</li>
                    </ul>
                </div>
            </div>
        </div>
    </div>`;
}



function createDeveloperNoteBlock() {
    return `
    <div class="block content-developer-note" draggable="true">
        <div class="drag-handle">≡</div>
        <div class="block-actions">
            <button class="edit-block" title="Редактировать">✏️</button>
            <button class="copy-block" title="Копировать">📋</button>
            <button class="export-html-block" title="Экспорт HTML">🚀</button>
            <button class="settings-block" title="Настройки">⚙️</button>
            <button class="delete-block" title="Удалить">🗑️</button>
        </div>
        <div class="block-settings">
            <button class="insert-macro-btn">+ Вставить макрос</button>
        </div>
        <div class="settings-panel">
            ${universalSettingsHTML}
        </div>
        <div class="editable-content" contenteditable="false">
            <div class="developer-note-container" style="background: #fff3cd; border: 1px solid #ffeaa7; padding: 10px; margin: 10px 0; border-radius: 4px;">
                <strong>💡 Примечание разработчика:</strong> Техническая информация или важное замечание по реализации
            </div>
        </div>
    </div>`;
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
           <button class="export-html-block" title="Экспорт HTML">🚀</button>
            <button class="settings-block" title="Настройки">⚙️</button>
            <button class="delete-block" title="Удалить">🗑️</button>
        </div>
        <div class="block-settings">
            <button class="insert-macro-btn">+ Вставить макрос</button>
        </div>
        <div class="settings-panel">
            ${universalSettingsHTML}
        </div>
        <div class="editable-content" contenteditable="true">
            ${html}
            <div class="nested-editor" contenteditable="true">
            </div>
        </div>
    </div>`;
    
    const newBlock = div.firstElementChild;
    editor.appendChild(newBlock);
    addBlockEventListeners(newBlock);
    initDragForElement(newBlock);
}

// Обновляем функцию загрузки шаблонов
function loadTemplates() {
      // Добавляем небольшую задержку чтобы DOM точно был готов
    setTimeout(() => {
        initTemplateCategories();
    }, 100);
}

document.addEventListener('DOMContentLoaded', function() {
    console.log('Templates.js loaded, initializing categories...');
    initTemplateCategories();
});