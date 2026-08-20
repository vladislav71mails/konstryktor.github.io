// Категории шаблонов
const templateCategories = {
    basic: {
        name: 'Основные блоки',
        templates: ['text', 'heading-h1', 'heading-h2', 'heading-h3', 'table', 'spoiler', 'warning', 'success', 'note', 'numbered', 'code']
    },
    content: {
        name: 'Контентные блоки',
        templates: ['image', 'quote']
    },
    useful: {
        name: 'Полезные блоки',
        templates: ['video', 'divider', 'download-file', 'faq', 'before-after', 'meta-author']
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
            if (item.dataset.dragMoved === '1') {
                item.dataset.dragMoved = '0';
                return;
            }
            const templateType = this.getAttribute('data-template');
            insertTemplate(templateType);
        });
    });

    if (typeof initSidebarTemplateDrag === 'function') {
        initSidebarTemplateDrag();
    }
}

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

// SVG-иконки для шаблонов (Feather-style, 18×18)
const TEMPLATE_ICONS = {
    'text': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>',
    'heading-h1': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12h8"/><path d="M4 18V6"/><path d="M12 18V6"/><path d="M17 12l3-2v8"/></svg>',
    'heading-h2': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12h8"/><path d="M4 18V6"/><path d="M12 18V6"/><path d="M21 18h-4c0-4 4-3 4-6 0-1.5-2-2.5-4-1"/></svg>',
    'heading-h3': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12h8"/><path d="M4 18V6"/><path d="M12 18V6"/><path d="M17.5 10.5c1.7-1 3.5 0 3.5 1.5a2 2 0 0 1-2 2"/><path d="M17 17.5c2 1.5 4 .3 4-1.5a2 2 0 0 0-2-2"/></svg>',
    'table': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18"/><path d="M3 15h18"/><path d="M9 3v18"/><path d="M15 3v18"/></svg>',
    'spoiler': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9l6 6 6-6"/></svg>',
    'warning': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>',
    'success': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>',
    'note': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>',
    'numbered': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>',
    'code': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>',
    'image': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>',
    'quote': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 21c3 0 7-1 7-8V5c0-1.25-.756-2.017-2-2H4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2 1 0 1 0 1 1v1c0 1-1 2-2 2s-1 .008-1 1.031V21z"/><path d="M15 21c3 0 7-1 7-8V5c0-1.25-.757-2.017-2-2h-4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2h.75c0 2.25.25 4-2.75 4v3z"/></svg>',
    'link-buttons': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>',
    '1c-configuration': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/></svg>',
    'glossary': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>',
    'image-caption': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/><line x1="3" y1="21" x2="21" y2="21"/></svg>',
    'type-comparison': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="18" rx="1"/><rect x="14" y="3" width="7" height="18" rx="1"/></svg>',
    'developer-note': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="4 17 10 11 4 5"/><line x1="12" y1="19" x2="20" y2="19"/></svg>',
    'custom': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/><line x1="12" y1="2" x2="12" y2="22"/></svg>',
    'video': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="4" width="20" height="16" rx="2"/><polygon points="10 9 16 12 10 15 10 9"/></svg>',
    'divider': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="3" y1="12" x2="21" y2="12"/></svg>',
    'download-file': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>',
    'faq': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>',
    'before-after': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="4" width="20" height="16" rx="2"/><line x1="12" y1="4" x2="12" y2="20"/><path d="M7 12h2"/><path d="M15 12h2"/></svg>',
    'meta-author': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>'
};

// Создание элемента шаблона
function createTemplateItem(templateId) {
    const templates = {
        'text': { name: 'Текст', desc: 'Обычный абзац — можно просто писать' },
        'heading-h1': { name: 'Заголовок H1', desc: 'Крупный заголовок первого уровня' },
        'heading-h2': { name: 'Заголовок H2', desc: 'Заголовок второго уровня' },
        'heading-h3': { name: 'Заголовок H3', desc: 'Заголовок третьего уровня' },
        'table': { name: 'Таблица', desc: 'Таблица 2×2–5×5, строки и столбцы' },
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
        'custom': { name: 'Пользовательский HTML', desc: 'Вставить свой HTML код' },
        'video': { name: 'Видео', desc: 'YouTube / RuTube embed' },
        'divider': { name: 'Разделитель', desc: 'Горизонтальная линия (hr)' },
        'download-file': { name: 'Скачать файл', desc: 'Кнопка для скачивания файла' },
        'faq': { name: 'FAQ / Аккордеон', desc: 'Вопросы и ответы (раскрывающиеся)' },
        'before-after': { name: 'До / После', desc: 'Сравнение двух вариантов' },
        'meta-author': { name: 'Автор / дата / теги', desc: 'Метаданные статьи' }
    };

    const template = templates[templateId];
    if (!template) return '';
    const icon = TEMPLATE_ICONS[templateId] || TEMPLATE_ICONS['text'];
    return `
        <div class="template-item" data-template="${templateId}">
            <span class="template-item-icon" aria-hidden="true">${icon}</span>
            <div class="template-item-body">
                <strong>${template.name}</strong>
                <div class="template-preview">${template.desc}</div>
            </div>
        </div>
    `;
}

// Вставка шаблона. beforeNode — опционально: вставить перед этим узлом (для drag из сайдбара)
function insertTemplate(type, beforeNode) {
    const editor = document.getElementById('editor');
    if (!editor) return;

    if (typeof snapshotEditor === 'function') snapshotEditor('before-insert-' + type);
    
    const initialDropZone = document.getElementById('initial-drop-zone');
    if (initialDropZone) {
        initialDropZone.remove();
    }
    
    let html = '';
    
    switch(type) {
        case 'text':
            if (typeof insertFreeTextBlock === 'function') {
                insertFreeTextBlock(beforeNode);
            }
            return;
        case 'heading-h1': html = createHeadingBlock('h1'); break;
        case 'heading-h2': html = createHeadingBlock('h2'); break;
        case 'heading-h3': html = createHeadingBlock('h3'); break;
        case 'table':
            if (typeof showTableSizePicker === 'function') {
                // Сохраняем позицию для вставки после выбора размера
                window._pendingTableInsertBefore = beforeNode || null;
                showTableSizePicker();
                return;
            }
            html = createTableBlock(3, 3);
            break;
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
        case 'video': html = createVideoBlock(); break;
        case 'divider': html = createDividerBlock(); break;
        case 'download-file': html = createDownloadFileBlock(); break;
        case 'faq': html = createFaqBlock(); break;
        case 'before-after': html = createBeforeAfterBlock(); break;
        case 'meta-author': html = createMetaAuthorBlock(); break;
        case 'custom':
            const customModal = document.getElementById('custom-html-modal');
            if (customModal) customModal.classList.add('active');
            return;
        default:
            console.warn('Неизвестный тип шаблона:', type);
            return;
    }
    
    if (!html) return;
    
    const div = document.createElement('div');
    div.innerHTML = html;
    const newBlock = div.firstElementChild;
    // Убираем кнопку-замочек, если осталась в старых шаблонах
    newBlock.querySelectorAll('.edit-block').forEach(btn => btn.remove());
    if (beforeNode && beforeNode.parentNode === editor) {
        editor.insertBefore(newBlock, beforeNode);
    } else {
        editor.appendChild(newBlock);
    }
    
    addBlockEventListeners(newBlock);
    initDragForElement(newBlock);
    if (type === 'video' && typeof setupVideoBlock === 'function') setupVideoBlock(newBlock);
    if (type === 'download-file' && typeof setupDownloadFileBlock === 'function') setupDownloadFileBlock(newBlock);
    newBlock.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    if (typeof updateEditorEmptyState === 'function') updateEditorEmptyState();
}

// Функции создания блоков с универсальными настройками
function createSpoilerBlock() {
    return `
    <div class="block content-spoiler" draggable="false">
        <div class="drag-handle">≡</div>
        <div class="block-actions">
            <button class="edit-block" type="button" title="Блокировать редактирование" aria-label="Блокировать редактирование">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 9.9-1"/></svg>
            </button>
            <button class="copy-block" type="button" title="Копировать" aria-label="Копировать">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
            </button>
            <button class="export-html-block" type="button" title="Экспорт HTML" aria-label="Экспорт HTML">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><path d="M12 18v-6"/><path d="M9 15l3 3 3-3"/></svg>
            </button>
            <button class="settings-block" type="button" title="Настройки" aria-label="Настройки">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
            </button>
            <button class="delete-block" type="button" title="Удалить" aria-label="Удалить">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
            </button>
        </div>
        <div class="block-settings">
            <button class="insert-macro-btn">+ Вставить макрос</button>
        </div>
        <div class="settings-panel">
            ${universalSettingsHTML}
        </div>
        <div class="editable-content" contenteditable="false">
            <details class="spoiler-container" style="margin-bottom: 20px; border: 1px solid var(--tpl-spoiler-border, #ccc); border-radius: 5px;">
                <summary class="spoiler-header" style="background: var(--tpl-spoiler-bg, #f5f5f5); padding: 12px 15px; cursor: pointer; font-weight: bold; color: var(--text-color, #333);">
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
    <div class="block content-warning" draggable="false">
        <div class="drag-handle">≡</div>
        <div class="block-actions">
            <button class="edit-block" type="button" title="Блокировать редактирование" aria-label="Блокировать редактирование">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 9.9-1"/></svg>
            </button>
            <button class="copy-block" type="button" title="Копировать" aria-label="Копировать">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
            </button>
            <button class="export-html-block" type="button" title="Экспорт HTML" aria-label="Экспорт HTML">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><path d="M12 18v-6"/><path d="M9 15l3 3 3-3"/></svg>
            </button>
            <button class="settings-block" type="button" title="Настройки" aria-label="Настройки">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
            </button>
            <button class="delete-block" type="button" title="Удалить" aria-label="Удалить">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
            </button>
        </div>
        <div class="block-settings">
            <button class="insert-macro-btn">+ Вставить макрос</button>
        </div>
        <div class="settings-panel">
            ${universalSettingsHTML}
        </div>
        <div class="editable-content" contenteditable="false">
            <div class="warning-container" style="background: var(--tpl-warning-bg, #ffd1d1); border: 2px solid var(--tpl-warning-border, #7a0000); padding: 15px; margin-bottom: 15px; border-radius: 4px; color: var(--text-color, #333);">
                <div class="warning-header" style="display: flex; align-items: center; margin-bottom: 10px;">
                    <div class="warning-icon" style="border: 2px solid var(--tpl-warning-border, #7a0000); background: var(--tpl-warning-icon-bg, #ffc6e3); color: var(--tpl-warning-text, #7a0000); width: 30px; height: 30px; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin-right: 10px; font-weight: bold;">!</div>
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
    <div class="block content-success" draggable="false">
        <div class="drag-handle">≡</div>
        <div class="block-actions">
            <button class="edit-block" type="button" title="Блокировать редактирование" aria-label="Блокировать редактирование">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 9.9-1"/></svg>
            </button>
            <button class="copy-block" type="button" title="Копировать" aria-label="Копировать">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
            </button>
            <button class="export-html-block" type="button" title="Экспорт HTML" aria-label="Экспорт HTML">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><path d="M12 18v-6"/><path d="M9 15l3 3 3-3"/></svg>
            </button>
            <button class="settings-block" type="button" title="Настройки" aria-label="Настройки">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
            </button>
            <button class="delete-block" type="button" title="Удалить" aria-label="Удалить">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
            </button>
        </div>
        <div class="block-settings">
            <button class="insert-macro-btn">+ Вставить макрос</button>
        </div>
        <div class="settings-panel">
            ${universalSettingsHTML}
        </div>
        <div class="editable-content" contenteditable="false">
            <div class="success-container" style="background: var(--tpl-success-bg, #eaf8db); border: 2px solid var(--tpl-success-border, #2e7d32); padding: 15px; margin-bottom: 15px; border-radius: 4px; color: var(--text-color, #333);">
                <div class="success-header" style="display: flex; align-items: center; margin-bottom: 10px;">
                    <div class="success-icon" style="border: 2px solid var(--tpl-success-border, #2e7d32); background: var(--tpl-success-icon-bg, #c8e6c9); color: var(--tpl-success-text, #2e7d32); width: 30px; height: 30px; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin-right: 10px; font-weight: bold;">✓</div>
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
    <div class="block content-note" draggable="false">
        <div class="drag-handle">≡</div>
        <div class="block-actions">
            <button class="edit-block" type="button" title="Блокировать редактирование" aria-label="Блокировать редактирование">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 9.9-1"/></svg>
            </button>
            <button class="copy-block" type="button" title="Копировать" aria-label="Копировать">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
            </button>
            <button class="export-html-block" type="button" title="Экспорт HTML" aria-label="Экспорт HTML">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><path d="M12 18v-6"/><path d="M9 15l3 3 3-3"/></svg>
            </button>
            <button class="settings-block" type="button" title="Настройки" aria-label="Настройки">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
            </button>
            <button class="delete-block" type="button" title="Удалить" aria-label="Удалить">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
            </button>
        </div>
        <div class="block-settings">
            <button class="insert-macro-btn">+ Вставить макрос</button>
        </div>
        <div class="settings-panel">
            ${universalSettingsHTML}
        </div>
        <div class="editable-content" contenteditable="false">
            <div class="note-container" style="background: var(--tpl-note-bg, #fffed1); border: 2px solid var(--tpl-note-border, #ffc107); padding: 15px; margin-bottom: 15px; border-radius: 4px; color: var(--text-color, #333);">
                <div class="note-header" style="display: flex; align-items: center; margin-bottom: 10px;">
                    <div class="note-icon" style="border: 2px solid var(--tpl-note-border, #ffc107); background: var(--tpl-note-icon-bg, #fff9c4); color: var(--tpl-note-text, #ffc107); width: 30px; height: 30px; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin-right: 10px; font-weight: bold;">📝</div>
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
    <div class="block content-numbered" draggable="false">
        <div class="drag-handle">≡</div>
        <div class="block-actions">
            <button class="edit-block" type="button" title="Блокировать редактирование" aria-label="Блокировать редактирование">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 9.9-1"/></svg>
            </button>
            <button class="copy-block" type="button" title="Копировать" aria-label="Копировать">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
            </button>
            <button class="export-html-block" type="button" title="Экспорт HTML" aria-label="Экспорт HTML">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><path d="M12 18v-6"/><path d="M9 15l3 3 3-3"/></svg>
            </button>
            <button class="settings-block" type="button" title="Настройки" aria-label="Настройки">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
            </button>
            <button class="delete-block" type="button" title="Удалить" aria-label="Удалить">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
            </button>
        </div>
        <div class="block-settings">
            <button class="insert-macro-btn">+ Вставить макрос</button>
        </div>
        <div class="settings-panel">
            ${universalSettingsHTML}
        </div>
        <div class="editable-content" contenteditable="false">
            <div class="numbered-container" style="background: var(--tpl-numbered-bg, #f8f9fa); border: 1px solid var(--tpl-numbered-border, #e9ecef); padding: 15px; margin-bottom: 15px; border-radius: 4px; color: var(--text-color, #333);">
                <div class="numbered-header" style="display: flex; align-items: center; margin-bottom: 10px;">
                    <div class="number-circle" style="background: var(--tpl-numbered-circle-bg, #222222); color: var(--tpl-numbered-circle-text, #fff); width: 30px; height: 30px; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin-right: 10px; font-weight: bold;">1</div>
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
    <div class="block content-code" draggable="false">
        <div class="drag-handle">≡</div>
        <div class="block-actions">
            <button class="edit-block" type="button" title="Блокировать редактирование" aria-label="Блокировать редактирование">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 9.9-1"/></svg>
            </button>
            <button class="copy-block" type="button" title="Копировать" aria-label="Копировать">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
            </button>
            <button class="export-html-block" type="button" title="Экспорт HTML" aria-label="Экспорт HTML">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><path d="M12 18v-6"/><path d="M9 15l3 3 3-3"/></svg>
            </button>
            <button class="settings-block" type="button" title="Настройки" aria-label="Настройки">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
            </button>
            <button class="delete-block" type="button" title="Удалить" aria-label="Удалить">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
            </button>
        </div>
        <div class="block-settings">
            <button class="insert-macro-btn">+ Вставить макрос</button>
        </div>
        <div class="settings-panel">
            ${universalSettingsHTML}
        </div>
        <div class="editable-content" contenteditable="false">
            <div class="code-container" style="background: var(--tpl-code-bg, #f8f8f8); padding: 5px; border: 1px solid var(--tpl-code-border, #ddd); border-radius: 5px; color: var(--tpl-code-text, #1e1e1e);">
                <code class="code-content">ТЕКСТ</code>
                <div class="nested-editor" contenteditable="true">
                </div>
            </div>
        </div>
    </div>`;
}




function createImageBlock() {
    return `
    <div class="block content-image" draggable="false">
        <div class="drag-handle">≡</div>
        <div class="block-actions">
            <button class="edit-block" type="button" title="Блокировать редактирование" aria-label="Блокировать редактирование">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 9.9-1"/></svg>
            </button>
            <button class="copy-block" type="button" title="Копировать" aria-label="Копировать">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
            </button>
            <button class="export-html-block" type="button" title="Экспорт HTML" aria-label="Экспорт HTML">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><path d="M12 18v-6"/><path d="M9 15l3 3 3-3"/></svg>
            </button>
            <button class="settings-block" type="button" title="Настройки" aria-label="Настройки">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
            </button>
            <button class="delete-block" type="button" title="Удалить" aria-label="Удалить">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
            </button>
        </div>
        <div class="block-settings">
            <button class="insert-macro-btn">+ Вставить макрос</button>
        </div>
        <div class="settings-panel">
            ${universalSettingsHTML}
        </div>
        <div class="editable-content" contenteditable="false">
            <div class="image-container" style="background: var(--tpl-image-bg, #f8f9fa); border: 1px solid var(--tpl-image-border, #e9ecef); padding: 15px; margin-bottom: 15px; border-radius: 4px; text-align: center;">
                <img src="https://via.placeholder.com/600x400" alt="Описание изображения" class="image-element" style="max-width: 100%; height: auto; border-radius: 4px; margin-bottom: 10px;">
                <div class="image-caption" style="color: var(--tpl-image-caption, #666); font-style: italic; font-size: 14px;">
                    Описание изображения
                </div>
            </div>
        </div>
    </div>`;
}

function createQuoteBlock() {
    return `
    <div class="block content-quote" draggable="false">
        <div class="drag-handle">≡</div>
        <div class="block-actions">
            <button class="edit-block" type="button" title="Блокировать редактирование" aria-label="Блокировать редактирование">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 9.9-1"/></svg>
            </button>
            <button class="copy-block" type="button" title="Копировать" aria-label="Копировать">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
            </button>
            <button class="export-html-block" type="button" title="Экспорт HTML" aria-label="Экспорт HTML">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><path d="M12 18v-6"/><path d="M9 15l3 3 3-3"/></svg>
            </button>
            <button class="settings-block" type="button" title="Настройки" aria-label="Настройки">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
            </button>
            <button class="delete-block" type="button" title="Удалить" aria-label="Удалить">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
            </button>
        </div>
        <div class="block-settings">
            <button class="insert-macro-btn">+ Вставить макрос</button>
        </div>
        <div class="settings-panel">
            ${universalSettingsHTML}
        </div>
        <div class="editable-content" contenteditable="false">
            <div class="quote-container" style="background: var(--tpl-quote-bg, #f0f8ff); border-left: 4px solid var(--tpl-quote-border, #4a90e2); padding: 15px 20px; margin-bottom: 15px; border-radius: 0 4px 4px 0;">
                <div class="quote-text" style="font-style: italic; color: var(--tpl-quote-text, #2c3e50); line-height: 1.6;">
                    "Важная цитата или ключевая мысль, которую нужно выделить в тексте"
                </div>
                <div class="quote-author" style="margin-top: 10px; text-align: right; color: var(--tpl-quote-author, #7f8c8d); font-size: 14px;">
                    — Автор или источник
                </div>
            </div>
        </div>
    </div>`;
}


function createLinkButtonsBlock() {
    const linkButtonsSettings = `
    <div class="settings-group">
        <div class="settings-group-title">Кнопки-ссылки</div>
        <div class="settings-row">
            <label class="settings-label">Количество кнопок:</label>
            <input type="number" class="settings-control buttons-count" min="1" max="12" value="3" style="width:70px">
        </div>
        <div class="settings-row">
            <label class="settings-label">Цвет всех кнопок:</label>
            <input type="color" class="settings-control button-color-setting" value="#20c997">
        </div>
        <div class="settings-row">
            <label class="settings-label">Цвет текста:</label>
            <input type="color" class="settings-control button-text-color-setting" value="#ffffff">
        </div>
        <div class="link-buttons-fields"></div>
    </div>
    ${universalSettingsHTML}
    `;

    return `
    <div class="block content-link-buttons" draggable="false">
        <div class="drag-handle">≡</div>
        <div class="block-actions">
            <button class="edit-block" type="button" title="Блокировать редактирование" aria-label="Блокировать редактирование">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 9.9-1"/></svg>
            </button>
            <button class="copy-block" type="button" title="Копировать" aria-label="Копировать">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
            </button>
            <button class="export-html-block" type="button" title="Экспорт HTML" aria-label="Экспорт HTML">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><path d="M12 18v-6"/><path d="M9 15l3 3 3-3"/></svg>
            </button>
            <button class="settings-block" type="button" title="Настройки" aria-label="Настройки">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
            </button>
            <button class="delete-block" type="button" title="Удалить" aria-label="Удалить">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
            </button>
        </div>
        <div class="block-settings">
            <button class="insert-macro-btn">+ Вставить макрос</button>
        </div>
        <div class="settings-panel">
            ${linkButtonsSettings}
        </div>
        <div class="editable-content" contenteditable="false">
            <div class="link-buttons-container" style="display: flex; flex-wrap: wrap; gap: 10px; margin-top: 10px;">
                <a class="link-button" contenteditable="true" style="padding: 8px 12px; background: #20c997; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: 500; display: inline-block;" href="https://example.com">Ссылка 1</a>
                <a class="link-button" contenteditable="true" style="padding: 8px 12px; background: #20c997; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: 500; display: inline-block;" href="https://example.com">Ссылка 2</a>
                <a class="link-button" contenteditable="true" style="padding: 8px 12px; background: #20c997; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: 500; display: inline-block;" href="https://example.com">Ссылка 3</a>
            </div>
        </div>
    </div>`;
}




function create1CConfigurationBlock() {
    // Фирменные цвета 1С: жёлтый бейдж, тёмный текст, янтарный акцент заголовков секций
    const c1cYellow = '#FFCC00';
    const c1cYellowDark = '#E6B800';
    const c1cText = '#1A1A1A';
    const c1cAccent = '#F5A623';
    const c1cBorder = '#E0C200';

    const oneCSettings = `
    <div class="settings-group">
        <div class="settings-group-title">Блок 1С</div>
        <div class="settings-row">
            <label class="settings-label">Цвет круга 1С:</label>
            <input type="color" class="settings-control config-icon-bg" value="${c1cYellow}">
        </div>
        <div class="settings-row">
            <label class="settings-label">Цвет текста в круге:</label>
            <input type="color" class="settings-control config-icon-color" value="${c1cText}">
        </div>
        <div class="settings-row">
            <label class="settings-label">Цвет заголовков секций:</label>
            <input type="color" class="settings-control config-summary-bg" value="${c1cAccent}">
        </div>
        <div class="settings-row">
            <label class="settings-label">Текст заголовков секций:</label>
            <input type="color" class="settings-control config-summary-color" value="#ffffff">
        </div>
        <div class="settings-row">
            <label class="settings-label">Число секций:</label>
            <input type="number" class="settings-control config-sections-count" min="1" max="10" value="2" style="width:70px">
        </div>
    </div>
    ${universalSettingsHTML}
    `;

    return `
    <div class="block content-1c-configuration" draggable="false">
        <div class="drag-handle">≡</div>
        <div class="block-actions">
            <button class="edit-block" type="button" title="Блокировать редактирование" aria-label="Блокировать редактирование">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 9.9-1"/></svg>
            </button>
            <button class="copy-block" type="button" title="Копировать" aria-label="Копировать">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
            </button>
            <button class="export-html-block" type="button" title="Экспорт HTML" aria-label="Экспорт HTML">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><path d="M12 18v-6"/><path d="M9 15l3 3 3-3"/></svg>
            </button>
            <button class="settings-block" type="button" title="Настройки" aria-label="Настройки">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
            </button>
            <button class="delete-block" type="button" title="Удалить" aria-label="Удалить">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
            </button>
        </div>
        <div class="block-settings">
            <button class="insert-macro-btn">+ Вставить макрос</button>
        </div>
        <div class="settings-panel">
            ${oneCSettings}
        </div>
        <div class="editable-content" contenteditable="false">
            <div class="config-container" style="background: var(--tpl-1c-bg, #FFFBEA); border: 1px solid ${c1cBorder}; padding: 15px; margin-bottom: 15px; border-radius: 6px;">
                <div class="config-header" style="display: flex; align-items: center; margin-bottom: 12px; gap: 10px;">
                    <div class="config-icon" contenteditable="false" style="background: ${c1cYellow}; color: ${c1cText}; width: 36px; height: 36px; min-width: 36px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 13px; border: 2px solid ${c1cYellowDark}; box-shadow: 0 1px 3px rgba(0,0,0,0.12); font-family: Arial, sans-serif;">1С</div>
                    <div class="config-title" contenteditable="true" style="font-size: 1.05rem; color: var(--tpl-1c-text, ${c1cText});"><strong>Настройка оборудования в 1С</strong></div>
                </div>

                <div class="config-sections">
                    <details class="config-details" open style="margin-bottom: 12px; border: 1px solid ${c1cBorder}; border-radius: 6px; overflow: hidden;">
                        <summary class="config-summary" contenteditable="true" style="background: ${c1cAccent}; padding: 10px 14px; cursor: pointer; font-weight: bold; color: #ffffff; list-style: none;">«Бухгалтерия предприятия»</summary>
                        <div class="config-content" contenteditable="true" style="padding: 14px; background: var(--tpl-1c-content-bg, #ffffff); color: var(--tpl-1c-text, ${c1cText}); min-height: 40px;">
                            <strong>Путь настройки:</strong><br>
                            «Администрирование» → «Поддержка оборудования» → «Подключаемое оборудование» → «Подключить новое»
                            <div class="nested-editor" contenteditable="true" style="min-height: 24px; margin-top: 8px;"></div>
                        </div>
                    </details>

                    <details class="config-details" style="margin-bottom: 12px; border: 1px solid ${c1cBorder}; border-radius: 6px; overflow: hidden;">
                        <summary class="config-summary" contenteditable="true" style="background: ${c1cAccent}; padding: 10px 14px; cursor: pointer; font-weight: bold; color: #ffffff; list-style: none;">«Управление нашей фирмой»</summary>
                        <div class="config-content" contenteditable="true" style="padding: 14px; background: var(--tpl-1c-content-bg, #ffffff); color: var(--tpl-1c-text, ${c1cText}); min-height: 40px;">
                            <strong>Путь настройки:</strong><br>
                            «Настройки» → «Поддержка оборудования» → «Подключаемое оборудование»
                            <div class="nested-editor" contenteditable="true" style="min-height: 24px; margin-top: 8px;"></div>
                        </div>
                    </details>
                </div>

                <div class="nested-editor config-root-nested" contenteditable="true" style="min-height: 28px; margin-top: 8px; padding: 6px; border: 1px dashed ${c1cBorder}; border-radius: 4px;" data-placeholder="Можно добавить спойлер или текст…"></div>
            </div>
        </div>
    </div>`;
}

function createGlossaryBlock() {
    return `
    <div class="block content-glossary" draggable="false">
        <div class="drag-handle">≡</div>
        <div class="block-actions">
            <button class="edit-block" type="button" title="Блокировать редактирование" aria-label="Блокировать редактирование">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 9.9-1"/></svg>
            </button>
            <button class="copy-block" type="button" title="Копировать" aria-label="Копировать">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
            </button>
            <button class="export-html-block" type="button" title="Экспорт HTML" aria-label="Экспорт HTML">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><path d="M12 18v-6"/><path d="M9 15l3 3 3-3"/></svg>
            </button>
            <button class="settings-block" type="button" title="Настройки" aria-label="Настройки">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
            </button>
            <button class="delete-block" type="button" title="Удалить" aria-label="Удалить">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
            </button>
        </div>
        <div class="block-settings">
            <button class="insert-macro-btn">+ Вставить макрос</button>
        </div>
        <div class="settings-panel">
            ${universalSettingsHTML}
        </div>
        <div class="editable-content" contenteditable="false">
            <div class="glossary-container" style="background: var(--tpl-glossary-bg, #e8f4fd); border-left: 4px solid var(--tpl-glossary-border, #2196F3); padding: 10px 15px; margin: 10px 0; color: var(--tpl-glossary-text, #1a1a1a);">
                <strong>ЦТО:</strong> Центр технологического обслуживания - отвечает за настройку оборудования
            </div>
        </div>
    </div>`;
}

function createImageCaptionBlock() {
    return `
    <div class="block content-image-caption" draggable="false">
        <div class="drag-handle">≡</div>
        <div class="block-actions">
            <button class="edit-block" type="button" title="Блокировать редактирование" aria-label="Блокировать редактирование">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 9.9-1"/></svg>
            </button>
            <button class="copy-block" type="button" title="Копировать" aria-label="Копировать">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
            </button>
            <button class="export-html-block" type="button" title="Экспорт HTML" aria-label="Экспорт HTML">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><path d="M12 18v-6"/><path d="M9 15l3 3 3-3"/></svg>
            </button>
            <button class="settings-block" type="button" title="Настройки" aria-label="Настройки">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
            </button>
            <button class="delete-block" type="button" title="Удалить" aria-label="Удалить">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
            </button>
        </div>
        <div class="block-settings">
            <button class="insert-macro-btn">+ Вставить макрос</button>
        </div>
        <div class="settings-panel">
            ${universalSettingsHTML}
        </div>
        <div class="editable-content" contenteditable="false">
            <div class="image-caption-container" style="text-align: center; margin: 15px 0;">
                <img class="image-element" style="max-width: 100%; height: auto; border: 1px solid var(--border-color, #ddd); border-radius: 4px; margin: 10px 0;" src="https://via.placeholder.com/800x400" alt="Описание изображения" />
                <div class="caption-text" style="color: var(--tpl-image-caption, #666); font-style: italic; font-size: 14px; margin-top: 5px;">
                    Описание изображения или скриншота
                </div>
            </div>
        </div>
    </div>`;
}

function createTypeComparisonBlock() {
    return `
    <div class="block content-type-comparison" draggable="false">
        <div class="drag-handle">≡</div>
        <div class="block-actions">
            <button class="edit-block" type="button" title="Блокировать редактирование" aria-label="Блокировать редактирование">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 9.9-1"/></svg>
            </button>
            <button class="copy-block" type="button" title="Копировать" aria-label="Копировать">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
            </button>
            <button class="export-html-block" type="button" title="Экспорт HTML" aria-label="Экспорт HTML">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><path d="M12 18v-6"/><path d="M9 15l3 3 3-3"/></svg>
            </button>
            <button class="settings-block" type="button" title="Настройки" aria-label="Настройки">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
            </button>
            <button class="delete-block" type="button" title="Удалить" aria-label="Удалить">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
            </button>
        </div>
        <div class="block-settings">
            <button class="insert-macro-btn">+ Вставить макрос</button>
        </div>
        <div class="settings-panel">
            ${universalSettingsHTML}
        </div>
        <div class="editable-content" contenteditable="false">
            <div class="type-comparison-container" style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin: 15px 0;">
                <div class="comparison-item" style="background: var(--tpl-comparison-bg, #f8f9fa); padding: 15px; border-radius: 4px; color: var(--text-color, #333);">
                    <strong>COM-порт</strong>
                    <ul class="comparison-features" style="margin: 10px 0; padding-left: 20px;">
                        <li>Физическое подключение через COM-порт</li>
                        <li>Требует настройки порта в системе</li>
                        <li>Стабильное соединение</li>
                    </ul>
                </div>
                <div class="comparison-item" style="background: var(--tpl-comparison-bg, #f8f9fa); padding: 15px; border-radius: 4px; color: var(--text-color, #333);">
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
    <div class="block content-developer-note" draggable="false">
        <div class="drag-handle">≡</div>
        <div class="block-actions">
            <button class="edit-block" type="button" title="Блокировать редактирование" aria-label="Блокировать редактирование">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 9.9-1"/></svg>
            </button>
            <button class="copy-block" type="button" title="Копировать" aria-label="Копировать">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
            </button>
            <button class="export-html-block" type="button" title="Экспорт HTML" aria-label="Экспорт HTML">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><path d="M12 18v-6"/><path d="M9 15l3 3 3-3"/></svg>
            </button>
            <button class="settings-block" type="button" title="Настройки" aria-label="Настройки">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
            </button>
            <button class="delete-block" type="button" title="Удалить" aria-label="Удалить">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
            </button>
        </div>
        <div class="block-settings">
            <button class="insert-macro-btn">+ Вставить макрос</button>
        </div>
        <div class="settings-panel">
            ${universalSettingsHTML}
        </div>
        <div class="editable-content" contenteditable="false">
            <div class="developer-note-container" style="background: var(--tpl-devnote-bg, #fff3cd); border: 1px solid var(--tpl-devnote-border, #ffeaa7); padding: 10px; margin: 10px 0; border-radius: 4px; color: var(--tpl-devnote-text, #5c4a00);">
                <strong>💡 Примечание разработчика:</strong> Техническая информация или важное замечание по реализации
            </div>
        </div>
    </div>`;
}

const BLOCK_ACTIONS_HTML = `
        <div class="drag-handle">≡</div>
        <div class="block-actions">
            <button class="copy-block" type="button" title="Копировать" aria-label="Копировать">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
            </button>
            <button class="export-html-block" type="button" title="Экспорт HTML" aria-label="Экспорт HTML">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><path d="M12 18v-6"/><path d="M9 15l3 3 3-3"/></svg>
            </button>
            <button class="settings-block" type="button" title="Настройки" aria-label="Настройки">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
            </button>
            <button class="delete-block" type="button" title="Удалить" aria-label="Удалить">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
            </button>
        </div>`;

function createHeadingBlock(level) {
    const tag = (level === 'h1' || level === 'h2' || level === 'h3') ? level : 'h2';
    const labels = { h1: 'Заголовок первого уровня', h2: 'Заголовок второго уровня', h3: 'Заголовок третьего уровня' };
    return `
    <div class="block content-heading content-heading-${tag}" draggable="false">
        ${BLOCK_ACTIONS_HTML}
        <div class="block-settings">
            <button class="insert-macro-btn">+ Вставить макрос</button>
        </div>
        <div class="settings-panel">
            ${universalSettingsHTML}
        </div>
        <div class="editable-content" contenteditable="false">
            <${tag} class="editor-heading" contenteditable="true" data-placeholder="${labels[tag]}">${labels[tag]}</${tag}>
        </div>
    </div>`;
}

function buildTableRowsHtml(rows, cols) {
    let html = '';
    for (let r = 0; r < rows; r++) {
        html += '<tr>';
        for (let c = 0; c < cols; c++) {
            const tag = r === 0 ? 'th' : 'td';
            const placeholder = r === 0 ? `Колонка ${c + 1}` : `Ячейка ${r},${c + 1}`;
            html += `<${tag} contenteditable="true">${placeholder}</${tag}>`;
        }
        html += '</tr>';
    }
    return html;
}

const tableStructureSettingsHTML = `
    <div class="settings-group table-structure-settings">
        <div class="settings-group-title">Структура таблицы</div>
        <div class="settings-row">
            <span class="settings-label">Размер:</span>
            <span class="table-size-label settings-control-static">—</span>
        </div>
        <div class="settings-row table-structure-actions">
            <button type="button" class="table-ctrl-btn" data-table-action="add-row" title="Добавить строку">+ Строка</button>
            <button type="button" class="table-ctrl-btn" data-table-action="del-row" title="Удалить строку">− Строка</button>
        </div>
        <div class="settings-row table-structure-actions">
            <button type="button" class="table-ctrl-btn" data-table-action="add-col" title="Добавить столбец">+ Столбец</button>
            <button type="button" class="table-ctrl-btn" data-table-action="del-col" title="Удалить столбец">− Столбец</button>
        </div>
        <p class="table-structure-hint">Мин. 2×2, макс. 10×10. Первая строка — заголовок.</p>
    </div>
`;

function createTableBlock(rows, cols) {
    rows = Math.max(2, Math.min(5, parseInt(rows, 10) || 3));
    cols = Math.max(2, Math.min(5, parseInt(cols, 10) || 3));
    const rowsHtml = buildTableRowsHtml(rows, cols);
    return `
    <div class="block content-table" draggable="false" data-table-rows="${rows}" data-table-cols="${cols}">
        ${BLOCK_ACTIONS_HTML}
        <div class="block-settings">
            <button class="insert-macro-btn">+ Вставить макрос</button>
        </div>
        <div class="settings-panel">
            ${tableStructureSettingsHTML}
            ${universalSettingsHTML}
        </div>
        <div class="editable-content" contenteditable="false">
            <div class="table-wrap">
                <table class="editor-table">
                    <tbody>
                        ${rowsHtml}
                    </tbody>
                </table>
            </div>
        </div>
    </div>`;
}

function showTableSizePicker() {
    const existing = document.getElementById('table-size-picker-modal');
    if (existing) existing.remove();

    const modal = document.createElement('div');
    modal.className = 'modal active';
    modal.id = 'table-size-picker-modal';
    let cells = '';
    for (let r = 2; r <= 5; r++) {
        for (let c = 2; c <= 5; c++) {
            cells += `<button type="button" class="table-size-btn" data-rows="${r}" data-cols="${c}">${r}×${c}</button>`;
        }
    }
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 360px;">
            <div class="modal-header">
                <h2>Размер таблицы</h2>
                <button class="close-modal" type="button">&times;</button>
            </div>
            <p class="table-size-hint">Выберите размер (позже — в настройках блока: ⚙)</p>
            <div class="table-size-grid">${cells}</div>
        </div>`;
    document.body.appendChild(modal);

    const close = () => modal.remove();
    modal.querySelector('.close-modal').addEventListener('click', close);
    modal.addEventListener('click', (e) => { if (e.target === modal) close(); });
    modal.querySelectorAll('.table-size-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const rows = parseInt(btn.getAttribute('data-rows'), 10);
            const cols = parseInt(btn.getAttribute('data-cols'), 10);
            close();
            insertTableBlock(rows, cols);
        });
    });
}

function insertTableBlock(rows, cols) {
    const editor = document.getElementById('editor');
    if (!editor) return;
    if (typeof snapshotEditor === 'function') snapshotEditor('before-insert-table');
    const initialDropZone = document.getElementById('initial-drop-zone');
    if (initialDropZone) initialDropZone.remove();

    const html = createTableBlock(rows, cols);
    const div = document.createElement('div');
    div.innerHTML = html;
    const newBlock = div.firstElementChild;
    newBlock.querySelectorAll('.edit-block').forEach(btn => btn.remove());
    const beforeNode = window._pendingTableInsertBefore || null;
    window._pendingTableInsertBefore = null;
    if (beforeNode && beforeNode.parentNode === editor) {
        editor.insertBefore(newBlock, beforeNode);
    } else {
        editor.appendChild(newBlock);
    }
    if (typeof addBlockEventListeners === 'function') addBlockEventListeners(newBlock);
    if (typeof initDragForElement === 'function') initDragForElement(newBlock);
    if (typeof setupTableControls === 'function') setupTableControls(newBlock);
    newBlock.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

// ——— Полезные блоки ———

function createVideoBlock() {
    return `
    <div class="block content-video" draggable="false">
        ${BLOCK_ACTIONS_HTML}
        <div class="block-settings">
            <button class="insert-macro-btn">+ Вставить макрос</button>
        </div>
        <div class="settings-panel">
            <div class="settings-group">
                <div class="settings-group-title">Видео (YouTube / RuTube)</div>
                <div class="settings-row settings-row-stack">
                    <label class="settings-label">Ссылка на видео:</label>
                    <input type="url" class="settings-control video-url-input" placeholder="https://youtu.be/... или rutube.ru/video/...">
                </div>
                <div class="settings-row">
                    <button type="button" class="settings-btn video-apply-btn">Вставить видео</button>
                </div>
            </div>
            ${universalSettingsHTML}
        </div>
        <div class="editable-content" contenteditable="false">
            <div class="video-embed-wrap">
                <div class="video-preview" data-empty="true">
                    <div class="video-placeholder">Откройте настройки блока (⚙) и вставьте ссылку YouTube или RuTube</div>
                </div>
            </div>
        </div>
    </div>`;
}

function createDividerBlock() {
    return `
    <div class="block content-divider" draggable="false">
        ${BLOCK_ACTIONS_HTML}
        <div class="block-settings">
            <button class="insert-macro-btn">+ Вставить макрос</button>
        </div>
        <div class="settings-panel">
            ${universalSettingsHTML}
        </div>
        <div class="editable-content" contenteditable="false">
            <hr class="editor-divider" />
        </div>
    </div>`;
}

function createDownloadFileBlock() {
    return `
    <div class="block content-download-file" draggable="false">
        ${BLOCK_ACTIONS_HTML}
        <div class="block-settings">
            <button class="insert-macro-btn">+ Вставить макрос</button>
        </div>
        <div class="settings-panel">
            <div class="settings-group">
                <div class="settings-group-title">Файл для скачивания</div>
                <div class="settings-row settings-row-stack">
                    <label class="settings-label">Текст кнопки:</label>
                    <input type="text" class="settings-control download-file-label-input" value="Скачать файл" placeholder="Скачать файл">
                </div>
                <div class="settings-row settings-row-stack">
                    <label class="settings-label">Ссылка на файл:</label>
                    <input type="url" class="settings-control download-file-url" placeholder="https://example.com/file.pdf">
                </div>
                <p class="settings-hint">Ссылка применится при «Применить настройки» или сразу при вводе.</p>
            </div>
            ${universalSettingsHTML}
        </div>
        <div class="editable-content" contenteditable="false">
            <div class="download-file-wrap">
                <a class="download-file-btn" href="#" download contenteditable="false">
                    <span class="download-file-icon" aria-hidden="true">⬇</span>
                    <span class="download-file-label">Скачать файл</span>
                </a>
            </div>
        </div>
    </div>`;
}

function createFaqBlock() {
    return `
    <div class="block content-faq" draggable="false">
        ${BLOCK_ACTIONS_HTML}
        <div class="block-settings">
            <button class="insert-macro-btn">+ Вставить макрос</button>
        </div>
        <div class="settings-panel">
            ${universalSettingsHTML}
        </div>
        <div class="editable-content" contenteditable="false">
            <div class="faq-list">
                <details class="faq-item" open>
                    <summary class="faq-question" contenteditable="true">Вопрос 1?</summary>
                    <div class="faq-answer" contenteditable="true">Ответ на первый вопрос.</div>
                </details>
                <details class="faq-item">
                    <summary class="faq-question" contenteditable="true">Вопрос 2?</summary>
                    <div class="faq-answer" contenteditable="true">Ответ на второй вопрос.</div>
                </details>
                <details class="faq-item">
                    <summary class="faq-question" contenteditable="true">Вопрос 3?</summary>
                    <div class="faq-answer" contenteditable="true">Ответ на третий вопрос.</div>
                </details>
            </div>
        </div>
    </div>`;
}

function createBeforeAfterBlock() {
    return `
    <div class="block content-before-after" draggable="false">
        ${BLOCK_ACTIONS_HTML}
        <div class="block-settings">
            <button class="insert-macro-btn">+ Вставить макрос</button>
        </div>
        <div class="settings-panel">
            ${universalSettingsHTML}
        </div>
        <div class="editable-content" contenteditable="false">
            <div class="before-after-grid">
                <div class="before-after-col before-col">
                    <div class="before-after-label" contenteditable="true">До</div>
                    <div class="before-after-body" contenteditable="true">Описание или скриншот «до»</div>
                </div>
                <div class="before-after-col after-col">
                    <div class="before-after-label" contenteditable="true">После</div>
                    <div class="before-after-body" contenteditable="true">Описание или скриншот «после»</div>
                </div>
            </div>
        </div>
    </div>`;
}

function createMetaAuthorBlock() {
    return `
    <div class="block content-meta-author" draggable="false">
        ${BLOCK_ACTIONS_HTML}
        <div class="block-settings">
            <button class="insert-macro-btn">+ Вставить макрос</button>
        </div>
        <div class="settings-panel">
            ${universalSettingsHTML}
        </div>
        <div class="editable-content" contenteditable="false">
            <div class="meta-author-wrap">
                <div class="meta-row">
                    <span class="meta-label">Автор:</span>
                    <span class="meta-value meta-author" contenteditable="true">Имя автора</span>
                </div>
                <div class="meta-row">
                    <span class="meta-label">Дата:</span>
                    <span class="meta-value meta-date" contenteditable="true">${new Date().toLocaleDateString('ru-RU')}</span>
                </div>
                <div class="meta-row">
                    <span class="meta-label">Теги:</span>
                    <span class="meta-value meta-tags" contenteditable="true">тег1, тег2</span>
                </div>
            </div>
        </div>
    </div>`;
}

/** Преобразует URL YouTube/RuTube в embed-src */
function parseVideoEmbedUrl(url) {
    if (!url || typeof url !== 'string') return null;
    url = url.trim();
    // YouTube: youtube.com/watch?v=, youtu.be/, youtube.com/embed/
    let m = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{6,})/);
    if (m) return 'https://www.youtube.com/embed/' + m[1];
    // RuTube: rutube.ru/video/ID/
    m = url.match(/rutube\.ru\/(?:video|play\/embed)\/([a-zA-Z0-9]+)/);
    if (m) return 'https://rutube.ru/play/embed/' + m[1];
    // Already embed-like
    if (/youtube\.com\/embed\//.test(url) || /rutube\.ru\/play\/embed\//.test(url)) return url;
    return null;
}

function setupVideoBlock(block) {
    if (!block || !block.classList.contains('content-video')) return;
    if (block.dataset.videoBound === '1') return;
    const input = block.querySelector('.video-url-input');
    const btn = block.querySelector('.video-apply-btn');
    const preview = block.querySelector('.video-preview');
    if (!input || !btn || !preview) return;
    block.dataset.videoBound = '1';

    const apply = () => {
        const embed = parseVideoEmbedUrl(input.value);
        if (!embed) {
            if (typeof showNotification === 'function') {
                showNotification('Не удалось распознать ссылку. Поддерживаются YouTube и RuTube.', 'error');
            }
            return;
        }
        preview.removeAttribute('data-empty');
        preview.innerHTML = `<iframe class="video-iframe" src="${embed}" title="Видео" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen loading="lazy"></iframe>`;
        if (typeof showNotification === 'function') showNotification('Видео вставлено', 'success');
        if (typeof snapshotEditor === 'function') snapshotEditor('video-embed');
    };

    btn.addEventListener('click', (e) => { e.preventDefault(); e.stopPropagation(); apply(); });
    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') { e.preventDefault(); apply(); }
    });
}

function setupDownloadFileBlock(block) {
    if (!block || !block.classList.contains('content-download-file')) return;
    if (block.dataset.downloadBound === '1') return;
    const urlInput = block.querySelector('.download-file-url');
    const labelInput = block.querySelector('.download-file-label-input');
    const link = block.querySelector('.download-file-btn');
    const labelEl = block.querySelector('.download-file-label');
    if (!urlInput || !link) return;
    block.dataset.downloadBound = '1';

    // синхронизация из текущей кнопки в поля настроек
    if (labelInput && labelEl && !labelInput.value) {
        labelInput.value = (labelEl.textContent || '').trim() || 'Скачать файл';
    }
    if (urlInput && link.getAttribute('href') && link.getAttribute('href') !== '#') {
        urlInput.value = link.getAttribute('href');
    }

    const sync = () => {
        const v = (urlInput.value || '').trim();
        if (v) {
            link.setAttribute('href', v);
            link.setAttribute('download', '');
        } else {
            link.setAttribute('href', '#');
        }
        if (labelInput && labelEl) {
            const t = (labelInput.value || '').trim() || 'Скачать файл';
            labelEl.textContent = t;
        }
    };
    urlInput.addEventListener('input', sync);
    urlInput.addEventListener('change', sync);
    if (labelInput) {
        labelInput.addEventListener('input', sync);
        labelInput.addEventListener('change', sync);
    }
    link.addEventListener('click', (e) => {
        if (!urlInput.value.trim() || link.getAttribute('href') === '#') {
            e.preventDefault();
            if (typeof showNotification === 'function') {
                showNotification('Откройте настройки блока (⚙) и укажите ссылку на файл', 'info');
            }
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
    <div class="block content-custom" draggable="false">
        <div class="drag-handle">≡</div>
        <div class="block-actions">
            <button class="edit-block" type="button" title="Блокировать редактирование" aria-label="Блокировать редактирование">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 9.9-1"/></svg>
            </button>
            <button class="copy-block" type="button" title="Копировать" aria-label="Копировать">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
            </button>
            <button class="export-html-block" type="button" title="Экспорт HTML" aria-label="Экспорт HTML">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><path d="M12 18v-6"/><path d="M9 15l3 3 3-3"/></svg>
            </button>
            <button class="settings-block" type="button" title="Настройки" aria-label="Настройки">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
            </button>
            <button class="delete-block" type="button" title="Удалить" aria-label="Удалить">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
            </button>
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