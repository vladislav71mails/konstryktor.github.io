/**
 * ui/command-palette.js — Палитра команд (Ctrl/Alt+K)
 * Зависит от: insertTemplate, exportHTML, undo/redo, group ops, openShortcutsModal, …
 */

/** Команды для палитры (Ctrl+K) */
const COMMAND_PALETTE_ITEMS = [
    { id: 'insert-spoiler', title: 'Вставить спойлер', group: 'Вставка', keywords: 'spoiler скрытый', run: function() { insertTemplate('spoiler'); } },
    { id: 'insert-warning', title: 'Вставить предупреждение', group: 'Вставка', keywords: 'warning внимание', run: function() { insertTemplate('warning'); } },
    { id: 'insert-success', title: 'Вставить успех / зелёный блок', group: 'Вставка', keywords: 'success ok', run: function() { insertTemplate('success'); } },
    { id: 'insert-note', title: 'Вставить заметку', group: 'Вставка', keywords: 'note заметка', run: function() { insertTemplate('note'); } },
    { id: 'insert-code', title: 'Вставить код', group: 'Вставка', keywords: 'code код', run: function() { insertTemplate('code'); } },
    { id: 'insert-image', title: 'Вставить изображение', group: 'Вставка', keywords: 'image картинка фото', run: function() { insertTemplate('image'); } },
    { id: 'insert-image-caption', title: 'Вставить изображение с подписью', group: 'Вставка', keywords: 'image caption подпись', run: function() { insertTemplate('image-caption'); } },
    { id: 'insert-quote', title: 'Вставить цитату', group: 'Вставка', keywords: 'quote цитата', run: function() { insertTemplate('quote'); } },
    { id: 'insert-numbered', title: 'Вставить нумерованный блок', group: 'Вставка', keywords: 'numbered список', run: function() { insertTemplate('numbered'); } },
    { id: 'insert-h1', title: 'Вставить заголовок H1', group: 'Вставка', keywords: 'heading h1 заголовок', run: function() { insertTemplate('heading-h1'); } },
    { id: 'insert-h2', title: 'Вставить заголовок H2', group: 'Вставка', keywords: 'heading h2 заголовок', run: function() { insertTemplate('heading-h2'); } },
    { id: 'insert-h3', title: 'Вставить заголовок H3', group: 'Вставка', keywords: 'heading h3 заголовок', run: function() { insertTemplate('heading-h3'); } },
    { id: 'insert-table', title: 'Вставить таблицу', group: 'Вставка', keywords: 'table таблица', run: function() { insertTemplate('table'); } },
    { id: 'insert-text', title: 'Вставить текстовый абзац', group: 'Вставка', keywords: 'text текст абзац', run: function() { insertTemplate('text'); } },
    { id: 'insert-glossary', title: 'Вставить глоссарий', group: 'Вставка', keywords: 'glossary словарь', run: function() { insertTemplate('glossary'); } },
    { id: 'insert-developer-note', title: 'Вставить заметку разработчика', group: 'Вставка', keywords: 'developer note', run: function() { insertTemplate('developer-note'); } },
    { id: 'insert-link-buttons', title: 'Вставить кнопки-ссылки', group: 'Вставка', keywords: 'link buttons ссылки', run: function() { insertTemplate('link-buttons'); } },
    { id: 'insert-1c', title: 'Вставить конфигурацию 1С', group: 'Вставка', keywords: '1c конфигурация', run: function() { insertTemplate('1c-configuration'); } },
    { id: 'insert-comparison', title: 'Вставить сравнение типов', group: 'Вставка', keywords: 'comparison сравнение', run: function() { insertTemplate('type-comparison'); } },
    { id: 'insert-video', title: 'Вставить видео (YouTube / RuTube)', group: 'Вставка', keywords: 'video youtube rutube видео', run: function() { insertTemplate('video'); } },
    { id: 'insert-divider', title: 'Вставить разделитель', group: 'Вставка', keywords: 'divider hr линия разделитель', run: function() { insertTemplate('divider'); } },
    { id: 'insert-download-file', title: 'Вставить кнопку «Скачать файл»', group: 'Вставка', keywords: 'download скачать файл', run: function() { insertTemplate('download-file'); } },
    { id: 'insert-faq', title: 'Вставить FAQ / аккордеон', group: 'Вставка', keywords: 'faq accordion вопросы', run: function() { insertTemplate('faq'); } },
    { id: 'insert-before-after', title: 'Вставить сравнение До / После', group: 'Вставка', keywords: 'before after до после', run: function() { insertTemplate('before-after'); } },
    { id: 'insert-meta-author', title: 'Вставить блок Автор / дата / теги', group: 'Вставка', keywords: 'author meta теги дата', run: function() { insertTemplate('meta-author'); } },
    { id: 'export', title: 'Экспорт HTML', group: 'Документ', keywords: 'export сохранить save', keys: 'Ctrl+E', run: function() { exportHTML(); } },
    { id: 'import', title: 'Импорт HTML', group: 'Документ', keywords: 'import загрузить', keys: 'Ctrl+Shift+I', run: function() {
        const m = document.getElementById('import-modal');
        if (m) m.classList.add('active');
    }},
    { id: 'versions', title: 'История версий', group: 'Документ', keywords: 'versions история версий', run: function() {
        const btn = document.getElementById('versions-btn');
        if (btn) btn.click();
        else {
            const m = document.getElementById('versions-modal');
            if (m) m.classList.add('active');
        }
    }},
    { id: 'undo', title: 'Отменить', group: 'История', keywords: 'undo отмена', keys: 'Ctrl+Z', run: function() { undoEditor(); } },
    { id: 'redo', title: 'Повторить', group: 'История', keywords: 'redo повтор', keys: 'Ctrl+Y', run: function() { redoEditor(); } },
    { id: 'select-all', title: 'Выделить все блоки', group: 'Блоки', keywords: 'select all выделить', keys: 'Ctrl+A', run: function() { selectAllBlocks(); } },
    { id: 'deselect', title: 'Снять выделение', group: 'Блоки', keywords: 'deselect снять', keys: 'Esc', run: function() { deselectAllBlocks(); } },
    { id: 'copy-selected', title: 'Копировать выделенные блоки', group: 'Блоки', keywords: 'copy копировать', keys: 'Ctrl+D', run: function() { copySelectedBlocks(); } },
    { id: 'delete-selected', title: 'Удалить выделенные блоки', group: 'Блоки', keywords: 'delete удалить', keys: 'Delete', run: function() { deleteSelectedBlocks(); } },
    { id: 'palette-hint', title: 'Палитра команд', group: 'Справка', keywords: 'palette команды command', keys: 'Alt+K', run: function() { openCommandPalette(); } },
    { id: 'link', title: 'Вставить ссылку', group: 'Форматирование', keywords: 'link ссылка url', keys: 'Ctrl+Shift+K', run: function() {
        const url = prompt('Введите URL:');
        if (url) document.execCommand('createLink', false, url);
    }},
    { id: 'bold', title: 'Жирный', group: 'Форматирование', keywords: 'bold жирный', keys: 'Ctrl+B', run: function() { document.execCommand('bold', false, null); } },
    { id: 'italic', title: 'Курсив', group: 'Форматирование', keywords: 'italic курсив', keys: 'Ctrl+I', run: function() { document.execCommand('italic', false, null); } },
    { id: 'help', title: 'Показать горячие клавиши', group: 'Справка', keywords: 'help справка клавиши', keys: 'Ctrl+/', run: function() { openShortcutsModal(); } },
    { id: 'theme', title: 'Переключить тему', group: 'Интерфейс', keywords: 'theme тема dark light', run: function() {
        const btn = document.getElementById('theme-toggle') || document.querySelector('[data-theme-toggle], #theme-btn');
        if (btn) btn.click();
        else if (typeof toggleTheme === 'function') toggleTheme();
    }},
    { id: 'send-author', title: 'Передать материалы', group: 'Интеграции', keywords: 'автор yougile email передать материалы', run: function() {
        if (typeof openPublishModal === 'function') openPublishModal();
        else {
            const btn = document.getElementById('publish-btn');
            if (btn) btn.click();
        }
    }}
];

let _cmdPaletteActiveIndex = 0;
let _cmdPaletteFiltered = [];

function openCommandPalette() {
    const modal = document.getElementById('command-palette-modal');
    const input = document.getElementById('command-palette-input');
    if (!modal || !input) return;
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
    input.value = '';
    _cmdPaletteActiveIndex = 0;
    renderCommandPaletteList('');
    setTimeout(function() { input.focus(); }, 30);
}

function closeCommandPalette() {
    const modal = document.getElementById('command-palette-modal');
    if (!modal) return;
    modal.classList.remove('active');
    document.body.style.overflow = '';
}

function filterCommandPalette(query) {
    const q = (query || '').trim().toLowerCase();
    if (!q) return COMMAND_PALETTE_ITEMS.slice();
    return COMMAND_PALETTE_ITEMS.filter(function(item) {
        const hay = (item.title + ' ' + item.group + ' ' + (item.keywords || '') + ' ' + (item.keys || '')).toLowerCase();
        return q.split(/\s+/).every(function(part) { return hay.indexOf(part) !== -1; });
    });
}

function renderCommandPaletteList(query) {
    const list = document.getElementById('command-palette-list');
    if (!list) return;
    _cmdPaletteFiltered = filterCommandPalette(query);
    if (_cmdPaletteActiveIndex >= _cmdPaletteFiltered.length) _cmdPaletteActiveIndex = Math.max(0, _cmdPaletteFiltered.length - 1);

    if (_cmdPaletteFiltered.length === 0) {
        list.innerHTML = '<div class="command-palette-empty">Ничего не найдено</div>';
        return;
    }

    list.innerHTML = _cmdPaletteFiltered.map(function(item, i) {
        const keysHtml = item.keys
            ? '<span class="command-palette-item-keys">' + item.keys.replace(/\+/g, ' + ') + '</span>'
            : '';
        return '<div class="command-palette-item' + (i === _cmdPaletteActiveIndex ? ' is-active' : '') + '" data-idx="' + i + '" role="option">' +
            '<div class="command-palette-item-main">' +
            '<div class="command-palette-item-title">' + escapeHtmlCmd(item.title) + '</div>' +
            '<div class="command-palette-item-group">' + escapeHtmlCmd(item.group) + '</div>' +
            '</div>' + keysHtml +
            '</div>';
    }).join('');

    list.querySelectorAll('.command-palette-item').forEach(function(el) {
        el.addEventListener('mouseenter', function() {
            _cmdPaletteActiveIndex = parseInt(el.getAttribute('data-idx'), 10) || 0;
            list.querySelectorAll('.command-palette-item').forEach(function(x, j) {
                x.classList.toggle('is-active', j === _cmdPaletteActiveIndex);
            });
        });
        el.addEventListener('click', function() {
            runCommandPaletteItem(_cmdPaletteFiltered[_cmdPaletteActiveIndex]);
        });
    });

    const active = list.querySelector('.command-palette-item.is-active');
    if (active) active.scrollIntoView({ block: 'nearest' });
}

function escapeHtmlCmd(s) {
    return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function runCommandPaletteItem(item) {
    if (!item) return;
    closeCommandPalette();
    try {
        if (typeof item.run === 'function') item.run();
    } catch (err) {
        console.error('Command failed:', item.id, err);
        showNotification('Ошибка команды: ' + item.title, 'error');
    }
}

function setupCommandPalette() {
    const modal = document.getElementById('command-palette-modal');
    const input = document.getElementById('command-palette-input');
    if (!modal || !input) return;

    input.addEventListener('input', function() {
        _cmdPaletteActiveIndex = 0;
        renderCommandPaletteList(input.value);
    });

    input.addEventListener('keydown', function(e) {
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            if (_cmdPaletteFiltered.length === 0) return;
            _cmdPaletteActiveIndex = (_cmdPaletteActiveIndex + 1) % _cmdPaletteFiltered.length;
            renderCommandPaletteList(input.value);
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            if (_cmdPaletteFiltered.length === 0) return;
            _cmdPaletteActiveIndex = (_cmdPaletteActiveIndex - 1 + _cmdPaletteFiltered.length) % _cmdPaletteFiltered.length;
            renderCommandPaletteList(input.value);
        } else if (e.key === 'Enter') {
            e.preventDefault();
            runCommandPaletteItem(_cmdPaletteFiltered[_cmdPaletteActiveIndex]);
        } else if (e.key === 'Escape') {
            e.preventDefault();
            closeCommandPalette();
        }
    });

    modal.addEventListener('click', function(e) {
        if (e.target === modal) closeCommandPalette();
    });
}


window.COMMAND_PALETTE_ITEMS = COMMAND_PALETTE_ITEMS;
window.openCommandPalette = openCommandPalette;
window.closeCommandPalette = closeCommandPalette;
window.setupCommandPalette = setupCommandPalette;
window.runCommandPaletteItem = runCommandPaletteItem;
