/**
 * ui/command-palette.js — палитра команд (Alt+K)
 * Зависит от: insertTemplate, templateCategories / createTemplateItem names,
 *             openPublishModal, undoEditor, redoEditor, showNotification (опц.)
 */
(function () {
    let activeIndex = 0;
    let filtered = [];

    const ACTION_COMMANDS = [
        { id: 'action:export', title: 'Экспорт', group: 'Документ', keys: '', run: function () {
            const btn = document.getElementById('export-btn');
            if (btn) btn.click();
        }},
        { id: 'action:import', title: 'Импорт', group: 'Документ', keys: 'Ctrl+Shift+I', run: function () {
            const btn = document.getElementById('import-btn');
            if (btn) btn.click();
        }},
        { id: 'action:publish', title: 'Передать материалы', group: 'Документ', keys: '', run: function () {
            if (typeof openPublishModal === 'function') openPublishModal();
            else {
                const btn = document.getElementById('publish-btn');
                if (btn) btn.click();
            }
        }},
        { id: 'action:undo', title: 'Отменить', group: 'История', keys: 'Ctrl+Z', run: function () {
            if (typeof undoEditor === 'function') undoEditor();
        }},
        { id: 'action:redo', title: 'Повторить', group: 'История', keys: 'Ctrl+Y', run: function () {
            if (typeof redoEditor === 'function') redoEditor();
        }},
        { id: 'action:versions', title: 'История версий', group: 'История', keys: '', run: function () {
            const btn = document.getElementById('versions-btn');
            if (btn) btn.click();
        }},
        { id: 'action:theme', title: 'Переключить тему', group: 'Вид', keys: '', run: function () {
            const btn = document.getElementById('theme-toggle');
            if (btn) btn.click();
        }},
        { id: 'action:wiki', title: 'Wiki / справка', group: 'Справка', keys: '', run: function () {
            const btn = document.getElementById('wiki-btn');
            if (btn) btn.click();
        }},
        { id: 'action:shortcuts', title: 'Горячие клавиши', group: 'Справка', keys: 'Ctrl+/', run: function () {
            const btn = document.getElementById('shortcuts-btn');
            if (btn) btn.click();
        }},
        { id: 'action:clear', title: 'Очистить редактор', group: 'Документ', keys: '', run: function () {
            const btn = document.getElementById('clear-btn');
            if (btn) btn.click();
        }},
        { id: 'action:select-all', title: 'Выделить все блоки', group: 'Блоки', keys: 'Ctrl+A', run: function () {
            if (typeof selectAllBlocks === 'function') selectAllBlocks();
            else {
                document.querySelectorAll('#editor > .block').forEach(function (b) {
                    b.classList.add('selected');
                    const cb = b.querySelector('.block-select');
                    if (cb) cb.checked = true;
                });
            }
        }}
    ];

    const TEMPLATE_LABELS = {
        'text': 'Текст',
        'heading-h1': 'Заголовок H1',
        'heading-h2': 'Заголовок H2',
        'heading-h3': 'Заголовок H3',
        'table': 'Таблица',
        'spoiler': 'Спойлер',
        'warning': 'Предупреждение',
        'success': 'Успех',
        'note': 'Примечание',
        'numbered': 'Нумерованный блок',
        'code': 'Код',
        'image': 'Изображение',
        'quote': 'Цитата',
        'video': 'Видео',
        'divider': 'Разделитель',
        'download-file': 'Файл для скачивания',
        'faq': 'FAQ',
        'before-after': 'До / После',
        'meta-author': 'Автор / мета',
        'link-buttons': 'Кнопки-ссылки',
        '1c-configuration': 'Секции по вариантам',
        'glossary': 'Термины',
        'image-caption': 'Изображение с подписью',
        'type-comparison': 'Сравнение',
        'developer-note': 'Примечание эксперта',
        'custom': 'Пользовательский HTML',
        'level-plan': 'План уровней',
        'variant-sections': 'Секции по вариантам',
        'expert-note': 'Примечание эксперта'
    };

    function collectCommands() {
        const list = ACTION_COMMANDS.slice();
        const cats = (typeof templateCategories !== 'undefined' && templateCategories) ? templateCategories : {};
        const seen = {};
        Object.keys(cats).forEach(function (catId) {
            const cat = cats[catId];
            (cat.templates || []).forEach(function (tid) {
                if (seen[tid]) return;
                seen[tid] = true;
                list.push({
                    id: 'tpl:' + tid,
                    title: TEMPLATE_LABELS[tid] || tid,
                    group: cat.name || 'Блоки',
                    keys: '',
                    run: function () {
                        if (typeof insertTemplate === 'function') insertTemplate(tid);
                    }
                });
            });
        });
        // На случай алиасов вне категорий
        Object.keys(TEMPLATE_LABELS).forEach(function (tid) {
            if (seen[tid]) return;
            list.push({
                id: 'tpl:' + tid,
                title: TEMPLATE_LABELS[tid],
                group: 'Блоки',
                keys: '',
                run: function () {
                    if (typeof insertTemplate === 'function') insertTemplate(tid);
                }
            });
        });
        return list;
    }

    function normalize(s) {
        return (s || '').toLowerCase().replace(/\s+/g, ' ').trim();
    }

    function filterCommands(query) {
        const all = collectCommands();
        const q = normalize(query);
        if (!q) return all;
        return all.filter(function (c) {
            const hay = normalize(c.title + ' ' + c.group + ' ' + c.id);
            return hay.indexOf(q) !== -1;
        });
    }

    function renderList() {
        const el = document.getElementById('command-palette-list');
        if (!el) return;
        if (!filtered.length) {
            el.innerHTML = '<div class="command-palette-empty">Ничего не найдено</div>';
            return;
        }
        el.innerHTML = filtered.map(function (c, i) {
            const active = i === activeIndex ? ' is-active' : '';
            const keys = c.keys ? '<span class="command-palette-item-keys">' + c.keys + '</span>' : '';
            return (
                '<div class="command-palette-item' + active + '" role="option" data-index="' + i + '">' +
                '<div class="command-palette-item-main">' +
                '<span class="command-palette-item-title">' + escapeHtml(c.title) + '</span>' +
                '<span class="command-palette-item-group">' + escapeHtml(c.group) + '</span>' +
                '</div>' + keys +
                '</div>'
            );
        }).join('');
        el.querySelectorAll('.command-palette-item').forEach(function (node) {
            node.addEventListener('click', function () {
                const idx = parseInt(node.getAttribute('data-index'), 10);
                runCommand(idx);
            });
            node.addEventListener('mouseenter', function () {
                activeIndex = parseInt(node.getAttribute('data-index'), 10);
                highlightActive();
            });
        });
        scrollActiveIntoView();
    }

    function escapeHtml(s) {
        return String(s)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }

    function highlightActive() {
        const el = document.getElementById('command-palette-list');
        if (!el) return;
        el.querySelectorAll('.command-palette-item').forEach(function (node, i) {
            node.classList.toggle('is-active', i === activeIndex);
        });
        scrollActiveIntoView();
    }

    function scrollActiveIntoView() {
        const el = document.getElementById('command-palette-list');
        if (!el) return;
        const item = el.querySelector('.command-palette-item.is-active');
        if (item && item.scrollIntoView) {
            item.scrollIntoView({ block: 'nearest' });
        }
    }

    function runCommand(idx) {
        const cmd = filtered[idx];
        closeCommandPalette();
        if (!cmd || typeof cmd.run !== 'function') return;
        try {
            cmd.run();
        } catch (e) {
            if (typeof showNotification === 'function') {
                showNotification('Ошибка команды: ' + (e.message || e), 'error');
            }
        }
    }

    function openCommandPalette() {
        const modal = document.getElementById('command-palette-modal');
        const input = document.getElementById('command-palette-input');
        if (!modal) return;
        modal.classList.add('active');
        modal.style.display = 'flex';
        filtered = filterCommands('');
        activeIndex = 0;
        renderList();
        if (input) {
            input.value = '';
            setTimeout(function () { input.focus(); }, 30);
        }
    }

    function closeCommandPalette() {
        const modal = document.getElementById('command-palette-modal');
        if (!modal) return;
        modal.classList.remove('active');
        modal.style.display = 'none';
    }

    function setupCommandPalette() {
        const modal = document.getElementById('command-palette-modal');
        const input = document.getElementById('command-palette-input');
        if (!modal) return;

        if (input) {
            input.addEventListener('input', function () {
                filtered = filterCommands(input.value);
                activeIndex = 0;
                renderList();
            });
            input.addEventListener('keydown', function (e) {
                if (e.key === 'ArrowDown') {
                    e.preventDefault();
                    if (!filtered.length) return;
                    activeIndex = (activeIndex + 1) % filtered.length;
                    highlightActive();
                } else if (e.key === 'ArrowUp') {
                    e.preventDefault();
                    if (!filtered.length) return;
                    activeIndex = (activeIndex - 1 + filtered.length) % filtered.length;
                    highlightActive();
                } else if (e.key === 'Enter') {
                    e.preventDefault();
                    runCommand(activeIndex);
                } else if (e.key === 'Escape') {
                    e.preventDefault();
                    closeCommandPalette();
                }
            });
        }

        modal.addEventListener('click', function (e) {
            if (e.target === modal) closeCommandPalette();
        });

        const cmdBtn = document.getElementById('command-palette-btn');
        if (cmdBtn) {
            cmdBtn.addEventListener('click', openCommandPalette);
        }

        // Esc на модалке
        document.addEventListener('keydown', function (e) {
            if (e.key === 'Escape' && modal.classList.contains('active')) {
                closeCommandPalette();
            }
        });
    }

    window.setupCommandPalette = setupCommandPalette;
    window.openCommandPalette = openCommandPalette;
    window.closeCommandPalette = closeCommandPalette;
})();
