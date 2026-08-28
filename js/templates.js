/**
 * templates.js — Палитра шаблонов в сайдбаре (категории, иконки, loadTemplates)
 * Фабрики блоков → js/blocks/factories.js
 * Setup интерактивных блоков → js/blocks/setup.js
 * Sidebar drag → js/drag/sidebar-drag.js
 */

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

    initSidebarTemplateDrag();
}

// initSidebarTemplateDrag → js/drag/sidebar-drag.js


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
// Экспорт в глобальную область (переходный период)
window.templateCategories = templateCategories;
window.initTemplateCategories = initTemplateCategories;
window.createTemplateItem = createTemplateItem;
window.loadTemplates = loadTemplates;
window.TEMPLATE_ICONS = TEMPLATE_ICONS;
