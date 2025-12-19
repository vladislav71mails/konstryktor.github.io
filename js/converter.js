// Конвертер старой статьи в новые макросы
class ArticleConverter {
    constructor() {
        this.macroPatterns = {
            spoiler: /<details[^>]*>[\s\S]*?<\/details>/gi,
            warning: /<div[^>]*background:[^>]*#ffd1d1[^>]*>[\s\S]*?<\/div>/gi,
            numbered: /<div[^>]*background:[^>]*#f8f9fa[^>]*>[\s\S]*?<\/div>/gi,
            code: /<div[^>]*background:[^>]*#ffffff[^>]*>[\s\S]*?<\/div>/gi,
            section: /<div[^>]*background:[^>]*#ebebeb[^>]*>[\s\S]*?<\/div>/gi,
            success: /<div[^>]*background:[^>]*#eaf8db[^>]*>[\s\S]*?<\/div>/gi,
            note: /<div[^>]*background:[^>]*#fffed1[^>]*>[\s\S]*?<\/div>/gi
        };
    }

    // Основная функция конвертации
    convertArticle(oldArticle) {
        let converted = oldArticle;
        
        // Конвертируем спойлеры
        converted = this.convertSpoilers(converted);
        
        // Конвертируем предупреждения
        converted = this.convertWarnings(converted);
        
        // Конвертируем блоки успеха
        converted = this.convertSuccessBlocks(converted);
        
        // Конвертируем примечания
        converted = this.convertNoteBlocks(converted);
        
        // Конвертируем нумерованные блоки
        converted = this.convertNumberedBlocks(converted);
        
        // Конвертируем блоки кода
        converted = this.convertCodeBlocks(converted);
        
        // Конвертируем секции
        converted = this.convertSections(converted);
        
        // Добавляем классы контента
        converted = this.addContentClasses(converted);
        
        return converted;
    }

    // Конвертация спойлеров
    convertSpoilers(html) {
        return html.replace(/<details([^>]*)>([\s\S]*?)<\/details>/gi, (match, attrs, content) => {
            const summaryMatch = content.match(/<summary[^>]*>([\s\S]*?)<\/summary>/i);
            const detailsContent = content.replace(/<summary[^>]*>[\s\S]*?<\/summary>/i, '').trim();
            
            let summary = 'Название спойлера';
            if (summaryMatch && summaryMatch[1]) {
                summary = summaryMatch[1].replace(/<[^>]*>/g, '').trim();
            }
            
            return this.createSpoilerBlock().replace('Название спойлера', summary).replace('Содержимое спойлера', detailsContent);
        });
    }

    // Конвертация предупреждений
    convertWarnings(html) {
        return html.replace(/<div[^>]*background:[^>]*#ffd1d1[^>]*>([\s\S]*?)<\/div>/gi, (match, content) => {
            const titleMatch = content.match(/<strong>([^<]*)<\/strong>/i);
            let title = 'Важно !';
            if (titleMatch && titleMatch[1]) {
                title = titleMatch[1];
            }
            
            const cleanContent = content.replace(/<div[^>]*display:\s*flex[^>]*>[\s\S]*?<\/div>/i, '').trim();
            
            return this.createWarningBlock().replace('Важно !', title).replace('Текст предупреждения', cleanContent);
        });
    }

    // Конвертация блоков успеха
    convertSuccessBlocks(html) {
        return html.replace(/<div[^>]*background:[^>]*#eaf8db[^>]*>([\s\S]*?)<\/div>/gi, (match, content) => {
            const titleMatch = content.match(/<strong>([^<]*)<\/strong>/i);
            let title = 'Успешно !';
            if (titleMatch && titleMatch[1]) {
                title = titleMatch[1];
            }
            
            const cleanContent = content.replace(/<div[^>]*display:\s*flex[^>]*>[\s\S]*?<\/div>/i, '').trim();
            
            return this.createSuccessBlock().replace('Успешно !', title).replace('Текст успешного действия', cleanContent);
        });
    }

    // Конвертация примечаний
    convertNoteBlocks(html) {
        return html.replace(/<div[^>]*background:[^>]*#fffed1[^>]*>([\s\S]*?)<\/div>/gi, (match, content) => {
            const titleMatch = content.match(/<strong>([^<]*)<\/strong>/i);
            let title = 'Примечание';
            if (titleMatch && titleMatch[1]) {
                title = titleMatch[1];
            }
            
            const cleanContent = content.replace(/<div[^>]*display:\s*flex[^>]*>[\s\S]*?<\/div>/i, '').trim();
            
            return this.createNoteBlock().replace('Примечание', title).replace('Текст примечания', cleanContent);
        });
    }

    // Конвертация нумерованных блоков
    convertNumberedBlocks(html) {
        let counter = 1;
        return html.replace(/<div[^>]*background:[^>]*#f8f9fa[^>]*>([\s\S]*?)<\/div>/gi, (match, content) => {
            // Пропускаем блоки, которые уже являются спойлерами или предупреждениями
            if (content.includes('content-spoiler') || content.includes('content-warning') || 
                content.includes('content-success') || content.includes('content-note')) {
                return match;
            }
            
            const titleMatch = content.match(/<strong>([^<]*)<\/strong>/i);
            let title = 'Заголовок';
            if (titleMatch && titleMatch[1]) {
                title = titleMatch[1];
            }
            
            const numberMatch = content.match(/<div[^>]*>(\d+|\*)<\/div>/);
            let number = counter.toString();
            
            if (numberMatch) {
                number = numberMatch[1];
            }
            
            counter++;
            
            const cleanContent = content.replace(/<div[^>]*display:\s*flex[^>]*>[\s\S]*?<\/div>/i, '').trim();
            
            return this.createNumberedBlock().replace('Заголовок', title).replace('Содержимое блока', cleanContent).replace('1', number);
        });
    }

    // Конвертация блоков кода
    convertCodeBlocks(html) {
        return html.replace(/<div[^>]*background:[^>]*#ffffff[^>]*>([\s\S]*?)<\/div>/gi, (match, content) => {
            const codeMatch = content.match(/<code>([\s\S]*?)<\/code>/i);
            let codeText = 'ТЕКСТ';
            if (codeMatch && codeMatch[1]) {
                codeText = codeMatch[1];
            }
            
            return this.createCodeBlock().replace('ТЕКСТ', codeText);
        });
    }

    // Конвертация секций
    convertSections(html) {
        return html.replace(/<div[^>]*background:[^>]*#ebebeb[^>]*>([\s\S]*?)<\/div>/gi, (match, content) => {
            const titleMatch = content.match(/<span[^>]*font-size:\s*24pt[^>]*>([\s\S]*?)<\/span>/i);
            let title = 'Заголовок секции';
            if (titleMatch && titleMatch[1]) {
                title = titleMatch[1].replace(/<[^>]*>/g, '').trim();
            }
            
            const cleanContent = content.replace(/<span[^>]*font-size:\s*24pt[^>]*>[\s\S]*?<\/span>/, '')
                                       .replace(/<hr[^>]*>/, '')
                                       .trim();
            
            return this.createCustomSectionBlock(title, cleanContent);
        });
    }

    // Добавление классов контента к существующим блокам
    addContentClasses(html) {
        let result = html;
        
        // Добавляем классы к спойлерам
        result = result.replace(/<div[^>]*class="([^"]*)"[^>]*>/g, (match, classes) => {
            if (classes.includes('block') && !classes.includes('content-')) {
                return match.replace(`class="${classes}"`, `class="${classes} content-custom"`);
            }
            return match;
        });
        
        return result;
    }

    // Функции создания блоков с классами для темной темы
    createSpoilerBlock() {
        return `
<div class="block content-spoiler" draggable="true">
    <div class="drag-handle">≡</div>
    <div class="block-actions">
        <button class="edit-block" title="Редактировать">✏️</button>
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

    createWarningBlock() {
        return `
<div class="block content-warning" draggable="true">
    <div class="drag-handle">≡</div>
    <div class="block-actions">
        <button class="edit-block" title="Редактировать">✏️</button>
        <button class="settings-block" title="Настройки">⚙️</button>
        <button class="delete-block" title="Удалить">🗑️</button>
    </div>
    <div class="block-settings">
        <button class="insert-macro-btn">+ Вставить макрос</button>
    </div>
    <div class="settings-panel">
        <label>Цвет фона: <input type="color" class="bg-color-setting" value="#ffd1d1"></label>
        <label>Цвет текста: <input type="color" class="text-color-setting"></label>
        <label>Цвет границы: <input type="color" class="border-color-setting" value="#7a0000"></label>
        <button class="apply-settings">Применить</button>
    </div>
    <div class="editable-content" contenteditable="true">
        <div class="warning-container" style="background: #ffd1d1; border: 2px solid #7a0000; padding: 15px; margin-bottom: 15px; border-radius: 4px;">
            <div class="warning-header" style="display: flex; align-items: center; margin-bottom: 10px;">
                <div class="warning-icon" style="border: 2px solid #7a0000; background: #ffc6e3; color: #7a0000; width: 30px; height: 30px; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin-right: 10px; font-weight: bold;">!</div>
                <div class="warning-title"><strong>Важно !</strong></div>
            </div>
            <div class="warning-text">
                Текст предупреждения
                <div class="nested-editor" contenteditable="true">
                </div>
            </div>
        </div>
    </div>
</div>`;
    }

    createSuccessBlock() {
        return `
<div class="block content-success" draggable="true">
    <div class="drag-handle">≡</div>
    <div class="block-actions">
        <button class="edit-block" title="Редактировать">✏️</button>
        <button class="settings-block" title="Настройки">⚙️</button>
        <button class="delete-block" title="Удалить">🗑️</button>
    </div>
    <div class="block-settings">
        <button class="insert-macro-btn">+ Вставить макрос</button>
    </div>
    <div class="settings-panel">
        <label>Цвет фона: <input type="color" class="bg-color-setting" value="#eaf8db"></label>
        <label>Цвет текста: <input type="color" class="text-color-setting"></label>
        <label>Цвет границы: <input type="color" class="border-color-setting" value="#2e7d32"></label>
        <button class="apply-settings">Применить</button>
    </div>
    <div class="editable-content" contenteditable="true">
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

    createNoteBlock() {
        return `
<div class="block content-note" draggable="true">
    <div class="drag-handle">≡</div>
    <div class="block-actions">
        <button class="edit-block" title="Редактировать">✏️</button>
        <button class="settings-block" title="Настройки">⚙️</button>
        <button class="delete-block" title="Удалить">🗑️</button>
    </div>
    <div class="block-settings">
        <button class="insert-macro-btn">+ Вставить макрос</button>
    </div>
    <div class="settings-panel">
        <label>Цвет фона: <input type="color" class="bg-color-setting" value="#fffed1"></label>
        <label>Цвет текста: <input type="color" class="text-color-setting"></label>
        <label>Цвет границы: <input type="color" class="border-color-setting" value="#ffc107"></label>
        <button class="apply-settings">Применить</button>
    </div>
    <div class="editable-content" contenteditable="true">
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

    createNumberedBlock() {
        return `
<div class="block content-numbered" draggable="true">
    <div class="drag-handle">≡</div>
    <div class="block-actions">
        <button class="edit-block" title="Редактировать">✏️</button>
        <button class="settings-block" title="Настройки">⚙️</button>
        <button class="delete-block" title="Удалить">🗑️</button>
    </div>
    <div class="block-settings">
        <button class="insert-macro-btn">+ Вставить макрос</button>
    </div>
    <div class="settings-panel">
        <label>Цвет фона: <input type="color" class="bg-color-setting" value="#f8f9fa"></label>
        <label>Цвет текста: <input type="color" class="text-color-setting"></label>
        <label>Цвет границы: <input type="color" class="border-color-setting" value="#e9ecef"></label>
        <label><input type="checkbox" class="show-number" checked> Показывать номер</label>
        <button class="apply-settings">Применить</button>
    </div>
    <div class="editable-content" contenteditable="true">
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

    createCodeBlock() {
        return `
<div class="block content-code" draggable="true">
    <div class="drag-handle">≡</div>
    <div class="block-actions">
        <button class="edit-block" title="Редактировать">✏️</button>
        <button class="settings-block" title="Настройки">⚙️</button>
        <button class="delete-block" title="Удалить">🗑️</button>
    </div>
    <div class="block-settings">
        <button class="insert-macro-btn">+ Вставить макрос</button>
    </div>
    <div class="settings-panel">
        <label>Цвет фона: <input type="color" class="bg-color-setting" value="#f8f8f8"></label>
        <label>Цвет текста: <input type="color" class="text-color-setting" value="#333"></label>
        <label>Цвет границы: <input type="color" class="border-color-setting" value="#ddd"></label>
        <button class="apply-settings">Применить</button>
    </div>
    <div class="editable-content" contenteditable="true">
        <div class="code-container" style="background: #f8f8f8; padding: 5px; border: 1px solid #ddd; border-radius: 5px;">
            <code class="code-content">ТЕКСТ</code>
            <div class="nested-editor" contenteditable="true">
            </div>
        </div>
    </div>
</div>`;
    }

    createCustomSectionBlock(title, content) {
        return `
<div class="block content-section" draggable="true">
    <div class="drag-handle">≡</div>
    <div class="block-actions">
        <button class="edit-block" title="Редактировать">✏️</button>
        <button class="settings-block" title="Настройки">⚙️</button>
        <button class="delete-block" title="Удалить">🗑️</button>
    </div>
    <div class="block-settings">
        <button class="insert-macro-btn">+ Вставить макрос</button>
    </div>
    <div class="settings-panel">
        <label>Цвет фона: <input type="color" class="bg-color-setting" value="#ebebeb"></label>
        <label>Цвет текста: <input type="color" class="text-color-setting"></label>
        <label>Цвет границы: <input type="color" class="border-color-setting" value="#ccc"></label>
        <button class="apply-settings">Применить</button>
    </div>
    <div class="editable-content" contenteditable="true">
        <div class="section-container" style="background: #ebebeb; padding: 5px; border: 1px solid #ccc;">
            <span class="section-title" style="font-size: 24pt;"><strong>${title}</strong></span>
            <hr class="section-divider">
            <div class="section-content">
                ${content}
                <div class="nested-editor" contenteditable="true">
                    <!-- Здесь можно вставлять другие макросы -->
                </div>
            </div>
        </div>
    </div>
</div>`;
    }
}

// Функция для загрузки и конвертации статьи
function convertOldArticle() {
    const converter = new ArticleConverter();
    
    // Создаем модальное окно для вставки старой статьи
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.style.display = 'flex';
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 90%; max-height: 90%;">
            <div class="modal-header">
                <h2>Конвертер старой статьи</h2>
                <button class="close-modal">&times;</button>
            </div>
            <div style="margin-bottom: 15px;">
                <p>Вставьте HTML код старой статьи в поле ниже и нажмите "Конвертировать"</p>
                <div class="converter-info">
                    <h4>Поддерживаемые блоки для конвертации:</h4>
                    <div class="converter-stats">
                        <div class="stat-item">
                            <strong>Спойлеры</strong>
                            <span>&lt;details&gt;&lt;summary&gt;</span>
                        </div>
                        <div class="stat-item">
                            <strong>Предупреждения</strong>
                            <span>background: #ffd1d1</span>
                        </div>
                        <div class="stat-item">
                            <strong>Успех</strong>
                            <span>background: #eaf8db</span>
                        </div>
                        <div class="stat-item">
                            <strong>Примечания</strong>
                            <span>background: #fffed1</span>
                        </div>
                        <div class="stat-item">
                            <strong>Нумерованные</strong>
                            <span>background: #f8f9fa</span>
                        </div>
                        <div class="stat-item">
                            <strong>Код</strong>
                            <span>background: #ffffff</span>
                        </div>
                        <div class="stat-item">
                            <strong>Секции</strong>
                            <span>background: #ebebeb</span>
                        </div>
                    </div>
                </div>
            </div>
            <textarea class="export-area" id="old-article-input" placeholder="Вставьте HTML код старой статьи здесь..." style="height: 400px;"></textarea>
            <div style="display: flex; gap: 10px; margin-top: 15px;">
                <button class="btn" id="convert-article-btn">Конвертировать</button>
                <button class="btn" id="load-example-btn">Загрузить пример</button>
                <button class="btn" id="close-converter-btn">Закрыть</button>
            </div>
            <div id="conversion-result" style="display: none; margin-top: 20px;">
                <h3>Результат конвертации:</h3>
                <textarea class="export-area" id="converted-article" style="height: 300px;" readonly></textarea>
                <button class="btn" id="import-converted-btn">Импортировать в редактор</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Обработчики событий для модального окна
    modal.querySelector('.close-modal').addEventListener('click', () => {
        modal.remove();
    });
    
    modal.querySelector('#close-converter-btn').addEventListener('click', () => {
        modal.remove();
    });
    
    modal.querySelector('#load-example-btn').addEventListener('click', () => {
        const exampleArticle = `
<div style="background: #f8f9fa; border: 1px solid #e9ecef; padding: 15px; margin-bottom: 15px; border-radius: 4px;">
<div style="display: flex; align-items: center; margin-bottom: 10px;">
<div><strong>Пример нумерованного блока</strong></div>
</div>
<ol>
    <li>Пункт 1</li>
    <li>Пункт 2</li>
    <li>Пункт 3</li>
</ol>
</div>

<div style="background: #ffd1d1; border: 2px solid #7a0000; padding: 15px; margin-bottom: 15px; border-radius: 4px;">
<div style="display: flex; align-items: center; margin-bottom: 10px;">
<div style="border: 2px solid #7a0000; background: #ffc6e3; color: #7a0000; width: 30px; height: 30px; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin-right: 10px; font-weight: bold;">!</div>
<div><strong>Важное предупреждение!</strong></div>
</div>
Текст предупреждения...
</div>

<div style="background: #eaf8db; border: 2px solid #7a0000; padding: 15px; margin-bottom: 15px; border-radius: 4px;">
<div style="display: flex; align-items: center; margin-bottom: 10px;">
<div style="border: 2px solid #7a0000; background: #ffc6e3; color: #7a0000; width: 30px; height: 30px; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin-right: 10px; font-weight: bold;">✓</div>
<div><strong>Успешное выполнение!</strong></div>
</div>
Текст успешного действия...
</div>

<details style="margin-bottom: 20px; border: 1px solid #ccc; border-radius: 5px;">
<summary style="background: #f5f5f5; padding: 12px 15px; cursor: pointer; font-weight: bold;">
<strong>Пример спойлера</strong></summary>
<div style="padding: 15px;">
Содержимое спойлера...
</div>
</details>`;
        
        modal.querySelector('#old-article-input').value = exampleArticle;
    });
    
    modal.querySelector('#convert-article-btn').addEventListener('click', () => {
        const oldArticle = modal.querySelector('#old-article-input').value;
        if (!oldArticle.trim()) {
            alert('Пожалуйста, вставьте HTML код статьи');
            return;
        }
        
        try {
            const convertedArticle = converter.convertArticle(oldArticle);
            modal.querySelector('#converted-article').value = convertedArticle;
            modal.querySelector('#conversion-result').style.display = 'block';
            
            // Показываем статистику конвертации
            showConversionStats(convertedArticle);
        } catch (error) {
            alert('Ошибка при конвертации: ' + error.message);
        }
    });
    
    modal.querySelector('#import-converted-btn').addEventListener('click', () => {
        const convertedArticle = modal.querySelector('#converted-article').value;
        if (convertedArticle.trim()) {
            document.getElementById('editor').innerHTML = convertedArticle;
            reinitializeBlocks();
            modal.remove();
            alert('Статья успешно импортирована в редактор!');
        }
    });
}

// Функция для показа статистики конвертации
function showConversionStats(convertedHtml) {
    const stats = {
        spoilers: (convertedHtml.match(/content-spoiler/g) || []).length,
        warnings: (convertedHtml.match(/content-warning/g) || []).length,
        success: (convertedHtml.match(/content-success/g) || []).length,
        notes: (convertedHtml.match(/content-note/g) || []).length,
        numbered: (convertedHtml.match(/content-numbered/g) || []).length,
        code: (convertedHtml.match(/content-code/g) || []).length,
        sections: (convertedHtml.match(/content-section/g) || []).length
    };
    
    const totalBlocks = Object.values(stats).reduce((sum, count) => sum + count, 0);
    
    let statsHtml = `
        <div class="converter-info" style="margin-top: 15px;">
            <h4>Статистика конвертации:</h4>
            <div class="converter-stats">
                <div class="stat-item">
                    <strong>Всего блоков</strong>
                    <span>${totalBlocks}</span>
                </div>
    `;
    
    for (const [type, count] of Object.entries(stats)) {
        if (count > 0) {
            const typeNames = {
                spoilers: 'Спойлеры',
                warnings: 'Предупреждения',
                success: 'Блоки успеха',
                notes: 'Примечания',
                numbered: 'Нумерованные',
                code: 'Блоки кода',
                sections: 'Секции'
            };
            statsHtml += `
                <div class="stat-item">
                    <strong>${typeNames[type]}</strong>
                    <span>${count}</span>
                </div>
            `;
        }
    }
    
    statsHtml += `</div></div>`;
    
    const resultDiv = document.querySelector('#conversion-result');
    const existingStats = resultDiv.querySelector('.converter-info');
    if (existingStats) {
        existingStats.remove();
    }
    resultDiv.insertAdjacentHTML('afterbegin', statsHtml);
}



// Инициализация конвертера при загрузке
document.addEventListener('DOMContentLoaded', function() {
    addConverterButton();
});