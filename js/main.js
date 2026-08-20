// Основные переменные
let isDarkTheme = false;
let currentSelection = null;
/** Пользователь вручную переключил тему — больше не следовать системной */
let themeUserOverride = false;

// Инициализация редактора
document.addEventListener('DOMContentLoaded', function() {
    applyInitialTheme();
    initializeEditor();
    setupEventListeners();
    loadTemplates();
    initDragAndDrop();
    // initContentDragAndDrop removed — was undefined; drag is handled by dragDrop.js
    setupGroupOperations();
    setupKeyboardShortcuts();
    setupAutosave();
    if (typeof initSidebarTemplateDrag === 'function') initSidebarTemplateDrag();
});

/** Тема по системным настройкам браузера (prefers-color-scheme) */
function applyInitialTheme() {
    try {
        const saved = localStorage.getItem('konstructor_theme_v1');
        if (saved === 'dark' || saved === 'light') {
            themeUserOverride = true;
            isDarkTheme = saved === 'dark';
        } else {
            isDarkTheme = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
        }
    } catch (e) {
        isDarkTheme = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    document.body.classList.toggle('dark-theme', isDarkTheme);
    updateThemeToggleLabel();

    if (window.matchMedia) {
        const mq = window.matchMedia('(prefers-color-scheme: dark)');
        const onChange = (e) => {
            if (themeUserOverride) return;
            isDarkTheme = e.matches;
            document.body.classList.toggle('dark-theme', isDarkTheme);
            updateThemeToggleLabel();
        };
        if (mq.addEventListener) mq.addEventListener('change', onChange);
        else if (mq.addListener) mq.addListener(onChange);
    }
}

function updateThemeToggleLabel() {
    const themeToggle = document.getElementById('theme-toggle');
    if (!themeToggle) return;
    const label = themeToggle.querySelector('.theme-label');
    if (label) label.textContent = isDarkTheme ? 'Светлая тема' : 'Тёмная тема';
    else themeToggle.textContent = isDarkTheme ? 'Светлая тема' : 'Тёмная тема';
}

// Инициализация редактора
function initializeEditor() {
    const editor = document.getElementById('editor');
    if (!editor) return;

    // Empty-state / free-text
    updateEditorEmptyState();
    setupFreeTextEditing(editor);
    setupSlashMenu(editor);
    // Привязать уже существующие free-text-block из HTML
    editor.querySelectorAll('.free-text-block').forEach(bindFreeTextBlock);
    
    editor.addEventListener('click', function(e) {
        // Клик по empty-state — открыть slash или фокус
        if (e.target.closest('.editor-empty-state')) {
            if (!(e.ctrlKey || e.metaKey || e.shiftKey)) {
                document.querySelectorAll('.block').forEach(b => b.classList.remove('selected'));
            }
            openSlashMenuAt(e.clientX, e.clientY, null);
            return;
        }

        // Клик по пустому месту редактора — фокус в свободный текст
        if (e.target === editor || e.target.classList.contains('drop-zone') || e.target.classList.contains('free-text-placeholder')) {
            if (!(e.ctrlKey || e.metaKey || e.shiftKey)) {
                document.querySelectorAll('.block').forEach(b => b.classList.remove('selected'));
            }
            updateEditorEmptyState();
            const free = editor.querySelector('.free-text');
            if (free) {
                free.focus();
                placeCaretAtEnd(free);
            }
            return;
        }

        if (e.target.classList.contains('block') || e.target.closest('.block')) {
            const block = e.target.classList.contains('block') ?
                e.target : e.target.closest('.block');
            const multi = e.ctrlKey || e.metaKey || e.shiftKey;

            if (!multi) {
                document.querySelectorAll('.block').forEach(b => {
                    if (b !== block) b.classList.remove('selected');
                });
                document.querySelectorAll('.settings-panel').forEach(panel => {
                    panel.style.display = 'none';
                    panel.classList.remove('always-visible');
                });
                block.classList.add('selected');
            } else {
                // Ctrl/Cmd/Shift+клик — переключить выделение блока (мультивыбор)
                if (e.target.closest('[contenteditable="true"]') && !e.target.closest('.drag-handle')) {
                    // не мешаем выделению текста внутри, если клик по тексту без handle
                    // но по самому блоку / краю — ок
                }
                block.classList.toggle('selected');
            }
            return;
        }

        if (!(e.ctrlKey || e.metaKey || e.shiftKey)) {
            document.querySelectorAll('.block').forEach(b => b.classList.remove('selected'));
            document.querySelectorAll('.settings-panel').forEach(panel => {
                panel.style.display = 'none';
                panel.classList.remove('always-visible');
            });
        }
    });
    
    document.addEventListener('selectionchange', function() {
        currentSelection = window.getSelection();
    });
}

/**
 * Empty-state: когда блоков нет — понятная зона «перетащите блок или нажмите /»
 * Когда есть блоки — empty-state убирается.
 */
function updateEditorEmptyState() {
    const editor = document.getElementById('editor');
    if (!editor) return;

    // Реальные блоки (не empty-state, не placeholder)
    const realBlocks = Array.from(editor.querySelectorAll(':scope > .block')).filter(
        b => !b.classList.contains('block-drag-placeholder')
    );
    const hasBlocks = realBlocks.length > 0;

    let empty = editor.querySelector('.editor-empty-state');

    if (!hasBlocks) {
        // Убираем старые drop-zone / free-text, если они есть
        editor.querySelectorAll('#initial-drop-zone, .drop-zone').forEach(el => el.remove());

        if (!empty) {
            empty = document.createElement('div');
            empty.className = 'editor-empty-state';
            empty.innerHTML = `
                <div class="empty-icon" aria-hidden="true">📦</div>
                <div class="empty-title">Здесь пока нет блоков</div>
                <div class="empty-hint">
                    Перетащите блок из сайдбара<br>
                    или нажмите <kbd>/</kbd> для быстрой вставки
                </div>
            `;
            editor.appendChild(empty);
        }
        // Убираем пустые free-text, если они остались
        realBlocks.forEach(b => {
            if (b.classList.contains('free-text-block') && isEmptyFreeText(b.querySelector('.free-text'))) {
                b.remove();
            }
        });
    } else {
        if (empty) empty.remove();
    }
}

// Есть ли в редакторе хоть один свободный текстовый абзац
function ensureFreeTextArea(editor) {
    if (!editor) return;
    updateEditorEmptyState();
}

function createFreeTextParagraph(placeholderText) {
    const wrap = document.createElement('div');
    wrap.className = 'block free-text-block content-text';
    wrap.setAttribute('draggable', 'false');
    wrap.innerHTML = `
        <div class="drag-handle" title="Перетащить">≡</div>
        <div class="block-actions">
            <button class="delete-block" type="button" title="Удалить" aria-label="Удалить">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
            </button>
        </div>
        <div class="editable-content">
            <p class="free-text" contenteditable="true" data-placeholder="${placeholderText || 'Начните писать…'}"><br></p>
        </div>
    `;
    // обработчики сразу
    bindFreeTextBlock(wrap);
    return wrap;
}

function bindFreeTextBlock(wrap) {
    if (!wrap || wrap.dataset.bound === '1') return;
    wrap.dataset.bound = '1';

    const del = wrap.querySelector('.delete-block');
    if (del) {
        del.addEventListener('click', function(e) {
            e.stopPropagation();
            if (typeof snapshotEditor === 'function') snapshotEditor('before-delete-freetext');
            wrap.remove();
            showNotification('Абзац удалён', 'success');
            if (typeof updateEditorEmptyState === 'function') updateEditorEmptyState();
        });
    }

    const ft = wrap.querySelector('.free-text');
    if (ft) {
        ft.addEventListener('input', function() {
            if (this.textContent.trim() !== '') {
                this.classList.add('has-content');
            } else {
                this.classList.remove('has-content');
            }
        });
        ft.addEventListener('focus', function() {
            wrap.classList.add('selected');
        });
    }

    wrap.addEventListener('click', function(e) {
        if (e.target.closest('.block-actions, .drag-handle')) return;
        document.querySelectorAll('.block').forEach(b => b.classList.remove('selected'));
        wrap.classList.add('selected');
    });

    if (typeof initDragForElement === 'function') {
        initDragForElement(wrap);
    }
}

function placeCaretAtEnd(el) {
    if (!el) return;
    el.focus();
    const range = document.createRange();
    const sel = window.getSelection();
    range.selectNodeContents(el);
    range.collapse(false);
    sel.removeAllRanges();
    sel.addRange(range);
}

function setupFreeTextEditing(editor) {
    // Enter в свободном тексте — новый абзац-блок
    // / — открыть slash-меню
    editor.addEventListener('keydown', function(e) {
        const target = e.target.closest('[contenteditable="true"]');
        if (!target || !editor.contains(target)) return;

        // Slash-меню: / в начале пустого блока или после пробела
        if (e.key === '/' && !e.ctrlKey && !e.metaKey && !e.altKey) {
            const sel = window.getSelection();
            if (sel && sel.isCollapsed) {
                const text = target.textContent || '';
                const offset = sel.anchorOffset;
                // в начале или после пробела / переноса
                const before = text.slice(0, offset);
                if (before === '' || /[\s\n]$/.test(before) || isEmptyFreeText(target)) {
                    e.preventDefault();
                    const rect = sel.rangeCount ? sel.getRangeAt(0).getBoundingClientRect() : target.getBoundingClientRect();
                    const x = rect.left || rect.x || 100;
                    const y = (rect.bottom || rect.y + 20) || 100;
                    openSlashMenuAt(x, y, target.closest('.block'));
                    return;
                }
            }
        }

        const freeTarget = e.target.closest('.free-text');
        if (!freeTarget) return;

        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            if (typeof snapshotEditor === 'function') snapshotEditor('before-new-paragraph');
            const parentBlock = freeTarget.closest('.free-text-block');
            const newBlock = createFreeTextParagraph('Начните писать…');
            if (parentBlock && parentBlock.parentNode) {
                parentBlock.parentNode.insertBefore(newBlock, parentBlock.nextSibling);
            } else {
                editor.appendChild(newBlock);
            }
            const newFt = newBlock.querySelector('.free-text');
            placeCaretAtEnd(newFt);
            updateEditorEmptyState();
            return;
        }

        // Backspace в начале пустого абзаца — удалить абзац и перейти к предыдущему
        if (e.key === 'Backspace') {
            const sel = window.getSelection();
            if (!sel || !sel.isCollapsed) return;
            const parentBlock = freeTarget.closest('.free-text-block');
            if (!parentBlock) return;

            // курсор в начале?
            const range = sel.getRangeAt(0);
            if (range.startOffset === 0 && isEmptyFreeText(freeTarget)) {
                e.preventDefault();
                const prev = parentBlock.previousElementSibling;
                const all = editor.querySelectorAll('.block');
                if (all.length <= 1) {
                    freeTarget.innerHTML = '<br>';
                    updateEditorEmptyState();
                    return;
                }
                if (typeof snapshotEditor === 'function') snapshotEditor('before-merge-paragraph');
                parentBlock.remove();
                if (prev) {
                    const prevFt = prev.querySelector('.free-text') || prev.querySelector('[contenteditable="true"]');
                    if (prevFt) placeCaretAtEnd(prevFt);
                    prev.classList.add('selected');
                }
                updateEditorEmptyState();
            }
        }
    });

    // Вставка из буфера — как простой текст в free-text
    editor.addEventListener('paste', function(e) {
        const target = e.target.closest('.free-text');
        if (!target) return;
        e.preventDefault();
        const text = (e.clipboardData || window.clipboardData).getData('text/plain');
        document.execCommand('insertText', false, text);
    });
}

// ——— Slash-меню (Notion-style) ———
const SLASH_BLOCK_TYPES = [
    { id: 'text', name: 'Текст', desc: 'Обычный абзац', icon: '¶' },
    { id: 'heading-h1', name: 'Заголовок H1', desc: 'Крупный заголовок', icon: 'H1' },
    { id: 'heading-h2', name: 'Заголовок H2', desc: 'Заголовок 2 уровня', icon: 'H2' },
    { id: 'heading-h3', name: 'Заголовок H3', desc: 'Заголовок 3 уровня', icon: 'H3' },
    { id: 'spoiler', name: 'Спойлер', desc: 'Раскрывающийся блок', icon: '▸' },
    { id: 'warning', name: 'Предупреждение', desc: 'Важное сообщение', icon: '⚠' },
    { id: 'success', name: 'Успех', desc: 'Сообщение об успехе', icon: '✓' },
    { id: 'note', name: 'Примечание', desc: 'Доп. информация', icon: 'ℹ' },
    { id: 'code', name: 'Код', desc: 'Блок кода', icon: '</>' },
    { id: 'quote', name: 'Цитата', desc: 'Выделение цитаты', icon: '❝' },
    { id: 'table', name: 'Таблица', desc: 'Таблица 2×2–5×5', icon: '▦' },
    { id: 'image', name: 'Изображение', desc: 'Вставка картинки', icon: '🖼' },
    { id: 'divider', name: 'Разделитель', desc: 'Горизонтальная линия', icon: '—' },
    { id: 'faq', name: 'FAQ', desc: 'Вопросы и ответы', icon: '?' },
    { id: 'numbered', name: 'Нумерованный', desc: 'Блок с номером', icon: '①' },
    { id: 'video', name: 'Видео', desc: 'YouTube / RuTube', icon: '▶' },
];

let slashMenuEl = null;
let slashActiveIndex = 0;
let slashInsertBefore = null; // блок, перед которым вставлять (или null = в конец)
let slashFilter = '';

function setupSlashMenu(editor) {
    // Глобальный / когда фокус не в contenteditable, но редактор «активен»
    document.addEventListener('keydown', function(e) {
        if (e.key === '/' && !e.ctrlKey && !e.metaKey && !e.altKey) {
            const active = document.activeElement;
            const inEditor = active && editor.contains(active);
            const isEmptyState = editor.querySelector('.editor-empty-state');
            if ((!inEditor || active === editor) && isEmptyState) {
                e.preventDefault();
                const rect = isEmptyState.getBoundingClientRect();
                openSlashMenuAt(rect.left + rect.width / 2, rect.top + 40, null);
            }
        }
        if (e.key === 'Escape') {
            closeSlashMenu();
        }
    });
}

function openSlashMenuAt(x, y, beforeBlock) {
    closeSlashMenu();
    slashInsertBefore = beforeBlock || null;
    slashFilter = '';
    slashActiveIndex = 0;

    slashMenuEl = document.createElement('div');
    slashMenuEl.className = 'slash-menu';
    slashMenuEl.innerHTML = `
        <input type="text" class="slash-menu-search" placeholder="Поиск блока…" autocomplete="off" />
        <div class="slash-menu-list"></div>
    `;
    document.body.appendChild(slashMenuEl);

    // Позиционирование с учётом краёв экрана
    const menuW = 300;
    const menuH = 360;
    let left = x;
    let top = y + 4;
    if (left + menuW > window.innerWidth - 8) left = window.innerWidth - menuW - 8;
    if (left < 8) left = 8;
    if (top + menuH > window.innerHeight - 8) top = Math.max(8, y - menuH - 4);
    slashMenuEl.style.left = left + 'px';
    slashMenuEl.style.top = top + 'px';

    const search = slashMenuEl.querySelector('.slash-menu-search');
    const list = slashMenuEl.querySelector('.slash-menu-list');

    function renderList() {
        const q = slashFilter.trim().toLowerCase();
        const items = SLASH_BLOCK_TYPES.filter(t =>
            !q || t.name.toLowerCase().includes(q) || t.desc.toLowerCase().includes(q) || t.id.includes(q)
        );
        if (!items.length) {
            list.innerHTML = '<div class="slash-menu-empty">Ничего не найдено</div>';
            return;
        }
        if (slashActiveIndex >= items.length) slashActiveIndex = 0;
        list.innerHTML = items.map((t, i) => `
            <div class="slash-menu-item${i === slashActiveIndex ? ' is-active' : ''}" data-id="${t.id}" data-index="${i}">
                <div class="slash-icon">${t.icon}</div>
                <div class="slash-body">
                    <div class="slash-name">${t.name}</div>
                    <div class="slash-desc">${t.desc}</div>
                </div>
            </div>
        `).join('');
        list.querySelectorAll('.slash-menu-item').forEach(el => {
            el.addEventListener('mouseenter', () => {
                slashActiveIndex = parseInt(el.dataset.index, 10);
                list.querySelectorAll('.slash-menu-item').forEach(x => x.classList.remove('is-active'));
                el.classList.add('is-active');
            });
            el.addEventListener('mousedown', (ev) => {
                ev.preventDefault();
                chooseSlashItem(el.dataset.id);
            });
        });
    }

    renderList();
    search.focus();

    search.addEventListener('input', () => {
        slashFilter = search.value;
        slashActiveIndex = 0;
        renderList();
    });

    search.addEventListener('keydown', (e) => {
        const items = list.querySelectorAll('.slash-menu-item');
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            slashActiveIndex = Math.min(slashActiveIndex + 1, items.length - 1);
            renderList();
            items[slashActiveIndex] && items[slashActiveIndex].scrollIntoView({ block: 'nearest' });
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            slashActiveIndex = Math.max(slashActiveIndex - 1, 0);
            renderList();
            items[slashActiveIndex] && items[slashActiveIndex].scrollIntoView({ block: 'nearest' });
        } else if (e.key === 'Enter') {
            e.preventDefault();
            const active = list.querySelector('.slash-menu-item.is-active');
            if (active) chooseSlashItem(active.dataset.id);
        } else if (e.key === 'Escape') {
            e.preventDefault();
            closeSlashMenu();
        }
    });

    // Клик вне меню
    setTimeout(() => {
        document.addEventListener('mousedown', slashOutsideClick);
    }, 0);
}

function slashOutsideClick(e) {
    if (slashMenuEl && !slashMenuEl.contains(e.target)) {
        closeSlashMenu();
    }
}

function closeSlashMenu() {
    if (slashMenuEl && slashMenuEl.parentNode) {
        slashMenuEl.parentNode.removeChild(slashMenuEl);
    }
    slashMenuEl = null;
    document.removeEventListener('mousedown', slashOutsideClick);
}

function chooseSlashItem(typeId) {
    closeSlashMenu();
    if (!typeId) return;
    if (typeof snapshotEditor === 'function') snapshotEditor('before-slash-insert');

    // Если вставляем вместо пустого free-text — удаляем его
    if (slashInsertBefore && slashInsertBefore.classList.contains('free-text-block')) {
        const ft = slashInsertBefore.querySelector('.free-text');
        if (ft && isEmptyFreeText(ft)) {
            const next = slashInsertBefore.nextSibling;
            slashInsertBefore.remove();
            slashInsertBefore = next && next.classList && next.classList.contains('block') ? next : null;
        }
    }

    if (typeof insertTemplate === 'function') {
        insertTemplate(typeId, slashInsertBefore);
    }
    slashInsertBefore = null;
    updateEditorEmptyState();
}

function isEmptyFreeText(el) {
    const t = (el.textContent || '').replace(/\u00a0/g, ' ').trim();
    return t === '' || t === '\n';
}

function normalizeFreeTextNodes(editor) {
    // «голые» узлы браузера — оборачиваем в free-text-block
    Array.from(editor.children).forEach(child => {
        if (child.classList.contains('block') || child.classList.contains('free-text-block') || child.classList.contains('drop-zone')) {
            return;
        }
        if (child.tagName === 'DIV' || child.tagName === 'P') {
            const text = child.innerHTML;
            const block = createFreeTextParagraph('Начните писать…');
            const ft = block.querySelector('.free-text');
            if (ft) ft.innerHTML = text || '<br>';
            child.replaceWith(block);
        }
    });
}

// Вставить свободный текстовый абзац (из сайдбара или программно)
function insertFreeTextBlock(beforeNode) {
    const editor = document.getElementById('editor');
    if (!editor) return;

    if (typeof snapshotEditor === 'function') snapshotEditor('before-insert-text');

    const dropZone = document.getElementById('initial-drop-zone');
    if (dropZone) dropZone.remove();

    const block = createFreeTextParagraph('Начните писать…');
    if (beforeNode && beforeNode.parentNode === editor) {
        editor.insertBefore(block, beforeNode);
    } else {
        editor.appendChild(block);
    }
    const ft = block.querySelector('.free-text');
    placeCaretAtEnd(ft);
    showNotification('Текстовый абзац добавлен', 'success');
    if (typeof updateEditorEmptyState === 'function') updateEditorEmptyState();
}

// Настройка обработчиков событий
function setupEventListeners() {
    setupFormattingButtons();
    
    const themeToggle = document.getElementById('theme-toggle');
    if (themeToggle) {
        themeToggle.addEventListener('click', function() {
            themeUserOverride = true;
            isDarkTheme = !isDarkTheme;
            document.body.classList.toggle('dark-theme', isDarkTheme);
            try {
                localStorage.setItem('konstructor_theme_v1', isDarkTheme ? 'dark' : 'light');
            } catch (e) { /* ignore */ }
            updateThemeToggleLabel();
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
                    if (typeof snapshotEditor === 'function') snapshotEditor('before-clear');
                    editor.innerHTML = '';
                    ensureFreeTextArea(editor);
                    if (typeof markAutosaveDirty === 'function') markAutosaveDirty();
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
                const text = exportArea.value;
                if (navigator.clipboard && navigator.clipboard.writeText) {
                    navigator.clipboard.writeText(text).then(function() {
                        showNotification('HTML скопирован в буфер обмена!', 'success');
                    }).catch(function() {
                        exportArea.select();
                        document.execCommand('copy');
                        showNotification('HTML скопирован в буфер обмена!', 'success');
                    });
                } else {
                    exportArea.select();
                    document.execCommand('copy');
                    showNotification('HTML скопирован в буфер обмена!', 'success');
                }
            }
        });
    }

    const downloadHtmlBtn = document.getElementById('download-html-btn');
    if (downloadHtmlBtn) {
        downloadHtmlBtn.addEventListener('click', function() {
            downloadExportedHtml(false);
        });
    }
    const downloadHtmlCssBtn = document.getElementById('download-html-css-btn');
    if (downloadHtmlCssBtn) {
        downloadHtmlCssBtn.addEventListener('click', function() {
            downloadExportedHtml(true);
        });
    }

    // Пересборка превью при смене опций экспорта
    ['export-selected-only', 'export-full-document', 'export-title'].forEach(function(id) {
        const el = document.getElementById(id);
        if (el) {
            el.addEventListener('change', function() { refreshExportPreview(); });
            el.addEventListener('input', function() { refreshExportPreview(); });
        }
    });
    document.querySelectorAll('input[name="export-style-mode"]').forEach(function(radio) {
        radio.addEventListener('change', function() { refreshExportPreview(); });
    });
    
    const importConfirmBtn = document.getElementById('import-confirm-btn');
    if (importConfirmBtn) {
        importConfirmBtn.addEventListener('click', function() {
            const importArea = document.getElementById('import-area');
            const editor = document.getElementById('editor');
            const importModal = document.getElementById('import-modal');
            
            if (importArea && importArea.value.trim() && editor) {
                if (typeof snapshotEditor === 'function') snapshotEditor('before-import');
                smartImportHTML(importArea.value);
                if (importModal) importModal.classList.remove('active');
                if (typeof markAutosaveDirty === 'function') markAutosaveDirty();
                showNotification('HTML успешно импортирован! Блоки восстановлены как интерактивные.', 'success');
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

    // Быстрые кнопки заголовков H1–H3
    document.querySelectorAll('.toolbar-heading-btn').forEach(function(btn) {
        btn.addEventListener('click', function() {
            const tag = this.getAttribute('data-heading') || 'h2';
            applyHeadingFormat(tag);
        });
    });
    
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
    
    setupColorPalettes();
}

// Палитра цветов (как на сайте / TinyMCE)
const EDITOR_COLORS = [
    { color: '#FF6600', title: 'Scloud Orange' },
    { color: '#279F00', title: 'Scloud Green' },
    { color: '#000000', title: 'Black' },
    { color: '#FFFFFF', title: 'White' },
    { color: '#FF0000', title: 'Red' },
    { color: '#008000', title: 'Green' },
    { color: '#0000FF', title: 'Blue' },
    { color: '#FFFF00', title: 'Yellow' },
    { color: '#8B00FF', title: 'Purple' },
    { color: '#079438', title: 'Harlequin' },
    { color: '#48C448', title: 'Malachite' },
    { color: '#333333', title: 'Common Black' },
    { color: '#F4F5F6', title: 'Griddle Pearl' },
    { color: '#6F6F6F', title: 'Middle Gray' },
    { color: '#C0C0C0', title: 'Silver' },
    { color: '#999999', title: 'Common Gray' },
    { color: '#F4F4F4', title: 'Designers Crazy Gray' },
    { color: '#218700', title: 'Indian Green' },
    { color: '#CDF4DF', title: 'Magic Mint' },
    { color: '#FFE7D6', title: 'Papaya Shoot' },
    { color: 'transparent', title: 'Без цвета' }
];

const CUSTOM_COLORS_KEY = 'editorCustomColors';
const MAX_CUSTOM = 8;

function getCustomColors() {
    try {
        const raw = localStorage.getItem(CUSTOM_COLORS_KEY);
        const arr = raw ? JSON.parse(raw) : [];
        return Array.isArray(arr) ? arr.slice(0, MAX_CUSTOM) : [];
    } catch (e) {
        return [];
    }
}

function saveCustomColor(hex) {
    if (!hex || hex === 'transparent') return;
    let list = getCustomColors().filter(c => c.toLowerCase() !== hex.toLowerCase());
    list.unshift(hex);
    list = list.slice(0, MAX_CUSTOM);
    try { localStorage.setItem(CUSTOM_COLORS_KEY, JSON.stringify(list)); } catch (e) {}
}

function setupColorPalettes() {
    document.querySelectorAll('.color-picker-wrap').forEach(wrap => {
        const btn = wrap.querySelector('.color-picker-btn');
        if (!btn) return;
        btn.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            // закрыть другие палитры
            document.querySelectorAll('.color-palette-popover').forEach(p => p.remove());
            openColorPalette(wrap);
        });
    });

    document.addEventListener('click', function(e) {
        if (!e.target.closest('.color-picker-wrap') && !e.target.closest('.color-palette-popover')) {
            document.querySelectorAll('.color-palette-popover').forEach(p => p.remove());
        }
    });
}

function openColorPalette(wrap) {
    const type = wrap.getAttribute('data-color-type') || 'foreColor';
    const pop = document.createElement('div');
    pop.className = 'color-palette-popover';
    pop.setAttribute('role', 'listbox');

    const custom = getCustomColors();

    let cells = EDITOR_COLORS.map(item => {
        if (item.color === 'transparent') {
            return `<button type="button" class="color-cell color-cell-transparent" data-color="transparent" title="${item.title}" role="option">×</button>`;
        }
        return `<button type="button" class="color-cell" data-color="${item.color}" title="${item.title}" style="background-color:${item.color}" role="option"></button>`;
    }).join('');

    // добить ряд до 8, если нужно (уже 21 = 2*8 + 5, transparent занимает 21-ю)
    // сетка 8 колонок как в TinyMCE

    const customCells = Array.from({ length: MAX_CUSTOM }, (_, i) => {
        const c = custom[i];
        if (c) {
            return `<button type="button" class="color-cell" data-color="${c}" title="Произвольный: ${c}" style="background-color:${c}" role="option"></button>`;
        }
        return `<button type="button" class="color-cell color-cell-empty" data-color="" title="Произвольный цвет" role="option" disabled></button>`;
    }).join('');

    pop.innerHTML = `
        <div class="color-palette-grid">
            ${cells}
        </div>
        <button type="button" class="color-custom-btn">Произвольный...</button>
        <div class="color-palette-grid color-custom-grid">
            ${customCells}
        </div>
        <input type="color" class="color-native-hidden" tabindex="-1" aria-hidden="true">
    `;

    wrap.appendChild(pop);

    // позиция: не вылезать за край
    requestAnimationFrame(() => {
        const rect = wrap.getBoundingClientRect();
        const popRect = pop.getBoundingClientRect();
        if (rect.left + popRect.width > window.innerWidth - 8) {
            pop.style.right = '0';
            pop.style.left = 'auto';
        }
    });

    pop.querySelectorAll('.color-cell[data-color]').forEach(cell => {
        if (cell.disabled) return;
        cell.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            const color = this.getAttribute('data-color');
            applyEditorColor(type, color, wrap);
            pop.remove();
        });
    });

    const customBtn = pop.querySelector('.color-custom-btn');
    const native = pop.querySelector('.color-native-hidden');
    customBtn.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        native.value = '#000000';
        native.click();
    });
    native.addEventListener('input', function() {
        const hex = this.value;
        saveCustomColor(hex);
        applyEditorColor(type, hex, wrap);
        pop.remove();
    });
}

function applyEditorColor(type, color, wrap) {
    // type: foreColor | backColor
    if (color === 'transparent') {
        if (type === 'backColor') {
            // снять фон выделения
            document.execCommand('removeFormat', false, null);
            // более точечно: hiliteColor transparent
            document.execCommand('styleWithCSS', false, true);
            try {
                document.execCommand('hiliteColor', false, 'transparent');
            } catch (e) {}
            document.execCommand('backColor', false, 'transparent');
        } else {
            document.execCommand('foreColor', false, '#000000');
        }
    } else {
        document.execCommand('styleWithCSS', false, true);
        if (type === 'foreColor') {
            document.execCommand('foreColor', false, color);
        } else {
            try {
                document.execCommand('hiliteColor', false, color);
            } catch (e) {}
            document.execCommand('backColor', false, color);
        }
    }

    // обновить индикатор на кнопке
    const swatch = wrap.querySelector('.color-swatch');
    if (swatch) {
        if (color === 'transparent') {
            swatch.style.background = 'transparent';
            swatch.classList.add('is-transparent');
        } else {
            swatch.style.background = color;
            swatch.classList.remove('is-transparent');
        }
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
        if (typeof snapshotEditor === 'function') snapshotEditor('before-delete-selected');
        selectedBlocks.forEach(block => {
            block.remove();
        });
        showNotification(`Удалено блоков: ${selectedBlocks.length}`, 'success');
    }
}

// ========== Горячие клавиши ==========
const SHORTCUTS = [
    { keys: 'Alt+K', action: 'commandPalette', group: 'Справка', desc: 'Палитра команд' },
    { keys: 'Ctrl+Shift+Space', action: 'commandPalette', group: 'Справка', desc: 'Палитра команд' },
    { keys: 'Ctrl+B', action: 'bold', group: 'Форматирование', desc: 'Жирный' },
    { keys: 'Ctrl+I', action: 'italic', group: 'Форматирование', desc: 'Курсив' },
    { keys: 'Ctrl+U', action: 'underline', group: 'Форматирование', desc: 'Подчёркнутый' },
    { keys: 'Ctrl+Shift+S', action: 'strikethrough', group: 'Форматирование', desc: 'Зачёркнутый' },
    { keys: 'Ctrl+Shift+K', action: 'link', group: 'Форматирование', desc: 'Вставить ссылку' },
    { keys: 'Ctrl+Shift+L', action: 'unorderedList', group: 'Форматирование', desc: 'Маркированный список' },
    { keys: 'Ctrl+Shift+O', action: 'orderedList', group: 'Форматирование', desc: 'Нумерованный список' },
    { keys: 'Ctrl+E', action: 'export', group: 'Документ', desc: 'Экспорт HTML' },
    { keys: 'Ctrl+Shift+I', action: 'import', group: 'Документ', desc: 'Импорт HTML' },
    { keys: 'Ctrl+S', action: 'export', group: 'Документ', desc: 'Экспорт HTML (сохранить)' },
    { keys: 'Ctrl+A', action: 'selectAll', group: 'Блоки', desc: 'Выделить все блоки' },
    { keys: 'Ctrl+D', action: 'copySelected', group: 'Блоки', desc: 'Копировать выделенные блоки' },
    { keys: 'Delete', action: 'deleteSelected', group: 'Блоки', desc: 'Удалить выделенные блоки' },
    { keys: 'Escape', action: 'deselect', group: 'Блоки', desc: 'Снять выделение / закрыть панели' },
    { keys: 'Ctrl+Z', action: 'undo', group: 'История', desc: 'Отменить (в т.ч. добавление блоков)' },
    { keys: 'Ctrl+Y', action: 'redo', group: 'История', desc: 'Повторить' },
    { keys: 'Ctrl+Shift+Z', action: 'redo', group: 'История', desc: 'Повторить' },
    { keys: 'Ctrl+/', action: 'help', group: 'Справка', desc: 'Показать горячие клавиши' },
    { keys: '?', action: 'help', group: 'Справка', desc: 'Показать горячие клавиши' }
];

/** Команды для палитры (Ctrl+K) */
const COMMAND_PALETTE_ITEMS = [
    { id: 'insert-spoiler', title: 'Вставить спойлер', group: 'Вставка', keywords: 'spoiler скрытый', run: function() { if (typeof insertTemplate === 'function') insertTemplate('spoiler'); } },
    { id: 'insert-warning', title: 'Вставить предупреждение', group: 'Вставка', keywords: 'warning внимание', run: function() { if (typeof insertTemplate === 'function') insertTemplate('warning'); } },
    { id: 'insert-success', title: 'Вставить успех / зелёный блок', group: 'Вставка', keywords: 'success ok', run: function() { if (typeof insertTemplate === 'function') insertTemplate('success'); } },
    { id: 'insert-note', title: 'Вставить заметку', group: 'Вставка', keywords: 'note заметка', run: function() { if (typeof insertTemplate === 'function') insertTemplate('note'); } },
    { id: 'insert-code', title: 'Вставить код', group: 'Вставка', keywords: 'code код', run: function() { if (typeof insertTemplate === 'function') insertTemplate('code'); } },
    { id: 'insert-image', title: 'Вставить изображение', group: 'Вставка', keywords: 'image картинка фото', run: function() { if (typeof insertTemplate === 'function') insertTemplate('image'); } },
    { id: 'insert-image-caption', title: 'Вставить изображение с подписью', group: 'Вставка', keywords: 'image caption подпись', run: function() { if (typeof insertTemplate === 'function') insertTemplate('image-caption'); } },
    { id: 'insert-quote', title: 'Вставить цитату', group: 'Вставка', keywords: 'quote цитата', run: function() { if (typeof insertTemplate === 'function') insertTemplate('quote'); } },
    { id: 'insert-numbered', title: 'Вставить нумерованный блок', group: 'Вставка', keywords: 'numbered список', run: function() { if (typeof insertTemplate === 'function') insertTemplate('numbered'); } },
    { id: 'insert-h1', title: 'Вставить заголовок H1', group: 'Вставка', keywords: 'heading h1 заголовок', run: function() { if (typeof insertTemplate === 'function') insertTemplate('heading-h1'); } },
    { id: 'insert-h2', title: 'Вставить заголовок H2', group: 'Вставка', keywords: 'heading h2 заголовок', run: function() { if (typeof insertTemplate === 'function') insertTemplate('heading-h2'); } },
    { id: 'insert-h3', title: 'Вставить заголовок H3', group: 'Вставка', keywords: 'heading h3 заголовок', run: function() { if (typeof insertTemplate === 'function') insertTemplate('heading-h3'); } },
    { id: 'insert-table', title: 'Вставить таблицу', group: 'Вставка', keywords: 'table таблица', run: function() { if (typeof insertTemplate === 'function') insertTemplate('table'); } },
    { id: 'insert-text', title: 'Вставить текстовый абзац', group: 'Вставка', keywords: 'text текст абзац', run: function() { if (typeof insertTemplate === 'function') insertTemplate('text'); } },
    { id: 'insert-glossary', title: 'Вставить глоссарий', group: 'Вставка', keywords: 'glossary словарь', run: function() { if (typeof insertTemplate === 'function') insertTemplate('glossary'); } },
    { id: 'insert-developer-note', title: 'Вставить заметку разработчика', group: 'Вставка', keywords: 'developer note', run: function() { if (typeof insertTemplate === 'function') insertTemplate('developer-note'); } },
    { id: 'insert-link-buttons', title: 'Вставить кнопки-ссылки', group: 'Вставка', keywords: 'link buttons ссылки', run: function() { if (typeof insertTemplate === 'function') insertTemplate('link-buttons'); } },
    { id: 'insert-1c', title: 'Вставить конфигурацию 1С', group: 'Вставка', keywords: '1c конфигурация', run: function() { if (typeof insertTemplate === 'function') insertTemplate('1c-configuration'); } },
    { id: 'insert-comparison', title: 'Вставить сравнение типов', group: 'Вставка', keywords: 'comparison сравнение', run: function() { if (typeof insertTemplate === 'function') insertTemplate('type-comparison'); } },
    { id: 'insert-video', title: 'Вставить видео (YouTube / RuTube)', group: 'Вставка', keywords: 'video youtube rutube видео', run: function() { if (typeof insertTemplate === 'function') insertTemplate('video'); } },
    { id: 'insert-divider', title: 'Вставить разделитель', group: 'Вставка', keywords: 'divider hr линия разделитель', run: function() { if (typeof insertTemplate === 'function') insertTemplate('divider'); } },
    { id: 'insert-download-file', title: 'Вставить кнопку «Скачать файл»', group: 'Вставка', keywords: 'download скачать файл', run: function() { if (typeof insertTemplate === 'function') insertTemplate('download-file'); } },
    { id: 'insert-faq', title: 'Вставить FAQ / аккордеон', group: 'Вставка', keywords: 'faq accordion вопросы', run: function() { if (typeof insertTemplate === 'function') insertTemplate('faq'); } },
    { id: 'insert-before-after', title: 'Вставить сравнение До / После', group: 'Вставка', keywords: 'before after до после', run: function() { if (typeof insertTemplate === 'function') insertTemplate('before-after'); } },
    { id: 'insert-meta-author', title: 'Вставить блок Автор / дата / теги', group: 'Вставка', keywords: 'author meta теги дата', run: function() { if (typeof insertTemplate === 'function') insertTemplate('meta-author'); } },
    { id: 'export', title: 'Экспорт HTML', group: 'Документ', keywords: 'export сохранить save', keys: 'Ctrl+E', run: function() { if (typeof exportHTML === 'function') exportHTML(); } },
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
    { id: 'undo', title: 'Отменить', group: 'История', keywords: 'undo отмена', keys: 'Ctrl+Z', run: function() { if (typeof undoEditor === 'function') undoEditor(); } },
    { id: 'redo', title: 'Повторить', group: 'История', keywords: 'redo повтор', keys: 'Ctrl+Y', run: function() { if (typeof redoEditor === 'function') redoEditor(); } },
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
        if (typeof showNotification === 'function') showNotification('Ошибка команды: ' + item.title, 'error');
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

// ========== История отмены + автосохранение ==========
const editorHistory = {
    stack: [],
    redoStack: [],
    max: 30,
    quiet: false,
    lastSnapshotHtml: null
};

const AUTOSAVE_KEY = 'konstructor_editor_autosave_v1';
const AUTOSAVE_INTERVAL_MS = 7000;
const HISTORY_DEBOUNCE_MS = 600;
let _historyDebounceTimer = null;
let _autosaveTimer = null;
let _lastAutosavedHtml = null;
let _autosaveDirty = false;

/** Сохранить текущее состояние ПЕРЕД изменением (структурным) */
function snapshotEditor(label) {
    if (editorHistory.quiet) return;
    const editor = document.getElementById('editor');
    if (!editor) return;
    // Сбросить отложенный снимок текста — структурный важнее
    if (_historyDebounceTimer) {
        clearTimeout(_historyDebounceTimer);
        _historyDebounceTimer = null;
    }
    const html = editor.innerHTML;
    const last = editorHistory.stack.length
        ? editorHistory.stack[editorHistory.stack.length - 1]
        : editorHistory.lastSnapshotHtml;
    if (last === html) return;
    editorHistory.stack.push(html);
    if (editorHistory.stack.length > editorHistory.max) {
        editorHistory.stack.shift();
    }
    editorHistory.redoStack = [];
    editorHistory.lastSnapshotHtml = html;
    markAutosaveDirty();
    updateHistoryButtons();
}

/** Отложенный снимок при наборе текста (группирует правки) */
function snapshotEditorDebounced() {
    if (editorHistory.quiet) return;
    if (_historyDebounceTimer) clearTimeout(_historyDebounceTimer);
    _historyDebounceTimer = setTimeout(function () {
        _historyDebounceTimer = null;
        snapshotEditor('text-edit');
    }, HISTORY_DEBOUNCE_MS);
    markAutosaveDirty();
}

function reinitEditorAfterHistory() {
    const editor = document.getElementById('editor');
    if (!editor) return;
    if (typeof reinitializeBlocks === 'function') {
        reinitializeBlocks();
    } else {
        editor.querySelectorAll('.block').forEach(block => {
            if (typeof addBlockEventListeners === 'function') addBlockEventListeners(block);
            if (typeof initDragForElement === 'function') initDragForElement(block);
        });
    }
    editor.querySelectorAll('.free-text-block').forEach(b => {
        if (typeof bindFreeTextBlock === 'function') {
            b.dataset.bound = '';
            bindFreeTextBlock(b);
        }
    });
    markAutosaveDirty();
    updateHistoryButtons();
}

function undoEditor() {
    const editor = document.getElementById('editor');
    if (!editor) return;

    // Зафиксировать текущий текст, если был отложенный снимок
    if (_historyDebounceTimer) {
        clearTimeout(_historyDebounceTimer);
        _historyDebounceTimer = null;
        const cur = editor.innerHTML;
        if (editorHistory.lastSnapshotHtml !== cur) {
            editorHistory.stack.push(editorHistory.lastSnapshotHtml || cur);
            if (editorHistory.stack.length > editorHistory.max) editorHistory.stack.shift();
            editorHistory.lastSnapshotHtml = cur;
        }
    }

    if (editorHistory.stack.length === 0) {
        if (typeof showNotification === 'function') {
            showNotification('Нечего отменять', 'info');
        }
        return;
    }

    const current = editor.innerHTML;
    const prev = editorHistory.stack.pop();
    editorHistory.redoStack.push(current);
    if (editorHistory.redoStack.length > editorHistory.max) {
        editorHistory.redoStack.shift();
    }

    editorHistory.quiet = true;
    editor.innerHTML = prev;
    editorHistory.lastSnapshotHtml = prev;
    reinitEditorAfterHistory();
    editorHistory.quiet = false;

    if (typeof showNotification === 'function') {
        showNotification('Отменено', 'info');
    }
    updateHistoryButtons();
}

function redoEditor() {
    const editor = document.getElementById('editor');
    if (!editor) return;

    if (editorHistory.redoStack.length === 0) {
        if (typeof showNotification === 'function') {
            showNotification('Нечего повторять', 'info');
        }
        return;
    }

    const current = editor.innerHTML;
    const next = editorHistory.redoStack.pop();
    editorHistory.stack.push(current);
    if (editorHistory.stack.length > editorHistory.max) {
        editorHistory.stack.shift();
    }

    editorHistory.quiet = true;
    editor.innerHTML = next;
    editorHistory.lastSnapshotHtml = next;
    reinitEditorAfterHistory();
    editorHistory.quiet = false;

    if (typeof showNotification === 'function') {
        showNotification('Повторено', 'info');
    }
    updateHistoryButtons();
}

function updateHistoryButtons() {
    const undoBtn = document.getElementById('undo-btn');
    const redoBtn = document.getElementById('redo-btn');
    if (undoBtn) undoBtn.disabled = editorHistory.stack.length === 0;
    if (redoBtn) redoBtn.disabled = editorHistory.redoStack.length === 0;
}

function setupEditorHistory() {
    editorHistory.stack = [];
    editorHistory.redoStack = [];
    editorHistory.lastSnapshotHtml = null;
    const editor = document.getElementById('editor');
    if (editor) {
        editorHistory.lastSnapshotHtml = editor.innerHTML;
    }
    updateHistoryButtons();
}

// ——— Автосохранение в localStorage ———
function markAutosaveDirty() {
    _autosaveDirty = true;
    if (typeof markVersionDirty === 'function') markVersionDirty();
}

function getEditorHtmlForSave() {
    const editor = document.getElementById('editor');
    return editor ? editor.innerHTML : '';
}

function isEditorEffectivelyEmpty(html) {
    if (!html || !html.trim()) return true;
    const tmp = document.createElement('div');
    tmp.innerHTML = html;
    const text = (tmp.textContent || '').replace(/\u00a0/g, ' ').trim();
    const blocks = tmp.querySelectorAll('.block');
    // Один пустой free-text-блок считаем пустым
    if (blocks.length <= 1 && text === '') return true;
    return false;
}

function saveAutosaveNow(force) {
    const html = getEditorHtmlForSave();
    if (!force && html === _lastAutosavedHtml) {
        _autosaveDirty = false;
        return false;
    }
    // Не затираем хорошую сессию пустым редактором
    if (!force && isEditorEffectivelyEmpty(html)) {
        _autosaveDirty = false;
        setAutosaveStatus('');
        return false;
    }
    try {
        const payload = {
            html: html,
            savedAt: Date.now(),
            version: 1
        };
        localStorage.setItem(AUTOSAVE_KEY, JSON.stringify(payload));
        _lastAutosavedHtml = html;
        _autosaveDirty = false;
        const t = new Date(payload.savedAt);
        const timeStr = t.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        setAutosaveStatus('Сохранено ' + timeStr);
        updateRestoreButtonVisibility();
        return true;
    } catch (e) {
        setAutosaveStatus('Ошибка сохранения');
        console.warn('Autosave failed', e);
        return false;
    }
}

function loadAutosavePayload() {
    try {
        const raw = localStorage.getItem(AUTOSAVE_KEY);
        if (!raw) return null;
        const data = JSON.parse(raw);
        if (!data || typeof data.html !== 'string') return null;
        return data;
    } catch (e) {
        return null;
    }
}

function setAutosaveStatus(text) {
    const el = document.getElementById('autosave-status');
    if (el) el.textContent = text || '';
}

function updateRestoreButtonVisibility() {
    const btn = document.getElementById('restore-session-btn');
    if (!btn) return;
    const data = loadAutosavePayload();
    if (data && data.html && !isEditorEffectivelyEmpty(data.html)) {
        btn.style.display = '';
        const t = data.savedAt ? new Date(data.savedAt) : null;
        const tip = t
            ? 'Восстановить сессию от ' + t.toLocaleString('ru-RU')
            : 'Восстановить последнюю автосохранённую сессию';
        btn.title = tip;
    } else {
        btn.style.display = 'none';
    }
}

function restoreLastSession() {
    const data = loadAutosavePayload();
    if (!data || !data.html) {
        if (typeof showNotification === 'function') {
            showNotification('Нет сохранённой сессии', 'warning');
        }
        return;
    }
    const editor = document.getElementById('editor');
    if (!editor) return;

    if (!confirm('Восстановить последнюю автосохранённую сессию? Текущее содержимое будет заменено.')) {
        return;
    }

    snapshotEditor('before-restore');
    editorHistory.quiet = true;
    editor.innerHTML = data.html;
    reinitEditorAfterHistory();
    editorHistory.quiet = false;
    editorHistory.lastSnapshotHtml = data.html;
    _lastAutosavedHtml = data.html;
    _autosaveDirty = false;

    const t = data.savedAt ? new Date(data.savedAt).toLocaleString('ru-RU') : '';
    if (typeof showNotification === 'function') {
        showNotification(t ? 'Сессия восстановлена (' + t + ')' : 'Сессия восстановлена', 'success');
    }
    setAutosaveStatus('Восстановлено');
    updateHistoryButtons();
}

function setupAutosave() {
    const editor = document.getElementById('editor');
    if (!editor) return;

    // Отслеживание правок текста для истории и автосохранения
    editor.addEventListener('input', function () {
        if (editorHistory.quiet) return;
        snapshotEditorDebounced();
    }, true);

    // Периодическое быстрое автосохранение сессии (crash recovery)
    if (_autosaveTimer) clearInterval(_autosaveTimer);
    _autosaveTimer = setInterval(function () {
        if (_autosaveDirty) saveAutosaveNow(false);
    }, AUTOSAVE_INTERVAL_MS);

    // Сохранение при уходе со страницы
    window.addEventListener('beforeunload', function () {
        if (_autosaveDirty) saveAutosaveNow(true);
        // при закрытии — по возможности зафиксировать версию, если были изменения
        tryAutoVersionSnapshot(true);
    });
    document.addEventListener('visibilitychange', function () {
        if (document.visibilityState === 'hidden' && _autosaveDirty) {
            saveAutosaveNow(true);
        }
    });

    // Кнопки
    const undoBtn = document.getElementById('undo-btn');
    const redoBtn = document.getElementById('redo-btn');
    const restoreBtn = document.getElementById('restore-session-btn');
    const versionsBtn = document.getElementById('versions-btn');
    if (undoBtn) undoBtn.addEventListener('click', function () { undoEditor(); });
    if (redoBtn) redoBtn.addEventListener('click', function () { redoEditor(); });
    if (restoreBtn) restoreBtn.addEventListener('click', function () { restoreLastSession(); });
    if (versionsBtn) versionsBtn.addEventListener('click', function () { openVersionsModal(); });

    updateRestoreButtonVisibility();
    setupVersionHistory();

    // Первое сохранение через интервал, если пользователь уже что-то менял
    setTimeout(function () {
        if (_autosaveDirty) saveAutosaveNow(false);
    }, 2000);
}

// ========== История версий (долговременные снимки) ==========
const VERSIONS_KEY = 'konstructor_editor_versions_v1';
const VERSION_SETTINGS_KEY = 'konstructor_editor_version_settings_v1';
const DEFAULT_VERSION_INTERVAL_MIN = 15;
const DEFAULT_MAX_VERSIONS = 30;

let _versionTimer = null;
let _versionDirty = false;
let _lastVersionHtml = null;
let _lastVersionAt = 0;

function getVersionSettings() {
    try {
        const raw = localStorage.getItem(VERSION_SETTINGS_KEY);
        if (raw) {
            const s = JSON.parse(raw);
            const interval = parseInt(s.autoVersionIntervalMin, 10);
            const max = parseInt(s.maxVersions, 10);
            return {
                autoVersionIntervalMin: (interval >= 1 && interval <= 1440) ? interval : DEFAULT_VERSION_INTERVAL_MIN,
                maxVersions: (max >= 5 && max <= 100) ? max : DEFAULT_MAX_VERSIONS
            };
        }
    } catch (e) {}
    return {
        autoVersionIntervalMin: DEFAULT_VERSION_INTERVAL_MIN,
        maxVersions: DEFAULT_MAX_VERSIONS
    };
}

function saveVersionSettings(partial) {
    const cur = getVersionSettings();
    const next = { ...cur, ...partial };
    if (next.autoVersionIntervalMin < 1) next.autoVersionIntervalMin = 1;
    if (next.autoVersionIntervalMin > 1440) next.autoVersionIntervalMin = 1440;
    if (next.maxVersions < 5) next.maxVersions = 5;
    if (next.maxVersions > 100) next.maxVersions = 100;
    try {
        localStorage.setItem(VERSION_SETTINGS_KEY, JSON.stringify(next));
    } catch (e) {
        console.warn('Version settings save failed', e);
    }
    return next;
}

function loadVersions() {
    try {
        const raw = localStorage.getItem(VERSIONS_KEY);
        if (!raw) return [];
        const data = JSON.parse(raw);
        if (!Array.isArray(data)) return [];
        return data.filter(v => v && typeof v.html === 'string' && v.savedAt);
    } catch (e) {
        return [];
    }
}

function persistVersions(list) {
    try {
        localStorage.setItem(VERSIONS_KEY, JSON.stringify(list));
        return true;
    } catch (e) {
        console.warn('Versions persist failed', e);
        if (typeof showNotification === 'function') {
            showNotification('Не удалось сохранить версию (возможно, переполнен localStorage)', 'warning');
        }
        return false;
    }
}

function markVersionDirty() {
    _versionDirty = true;
}

function makeVersionId() {
    return 'v_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8);
}

function versionPreviewText(html) {
    const tmp = document.createElement('div');
    tmp.innerHTML = html || '';
    const text = (tmp.textContent || '').replace(/\s+/g, ' ').trim();
    if (!text) return '(пустой документ)';
    return text.length > 80 ? text.slice(0, 80) + '…' : text;
}

function formatVersionDate(ts) {
    try {
        return new Date(ts).toLocaleString('ru-RU', {
            day: '2-digit', month: '2-digit', year: 'numeric',
            hour: '2-digit', minute: '2-digit', second: '2-digit'
        });
    } catch (e) {
        return String(ts);
    }
}

/**
 * Создать версию, если документ изменился.
 * @param {object} opts
 * @param {boolean} [opts.force] — сохранить даже если интервал не вышел (ручное / beforeunload)
 * @param {boolean} [opts.ignoreInterval] — то же, что force для интервала
 * @param {string} [opts.source] — 'auto' | 'manual'
 * @param {string} [opts.label]
 */
function createVersionSnapshot(opts) {
    opts = opts || {};
    const source = opts.source || 'auto';
    const force = !!(opts.force || opts.ignoreInterval);
    const html = getEditorHtmlForSave();

    if (isEditorEffectivelyEmpty(html)) {
        if (source === 'manual' && typeof showNotification === 'function') {
            showNotification('Нечего сохранять: документ пуст', 'warning');
        }
        return null;
    }

    // Не дублируем идентичное содержимое
    const existing = loadVersions();
    if (_lastVersionHtml === html || (existing[0] && existing[0].html === html)) {
        if (source === 'manual' && typeof showNotification === 'function') {
            showNotification('Содержимое не изменилось с последней версии', 'info');
        }
        _versionDirty = false;
        return null;
    }

    if (!force && !_versionDirty && _lastVersionHtml != null) {
        return null;
    }

    const settings = getVersionSettings();
    const now = Date.now();
    if (!force && _lastVersionAt && (now - _lastVersionAt) < settings.autoVersionIntervalMin * 60 * 1000) {
        return null;
    }

    const entry = {
        id: makeVersionId(),
        savedAt: now,
        source: source,
        label: opts.label || (source === 'manual' ? 'Ручная версия' : 'Автосохранение'),
        html: html,
        preview: versionPreviewText(html)
    };

    let list = existing.slice();
    list.unshift(entry);
    if (list.length > settings.maxVersions) {
        list = list.slice(0, settings.maxVersions);
    }

    if (!persistVersions(list)) return null;

    _lastVersionHtml = html;
    _lastVersionAt = now;
    _versionDirty = false;

    if (source === 'manual' && typeof showNotification === 'function') {
        showNotification('Версия сохранена', 'success');
    }

    // обновить список, если модалка открыта
    const modal = document.getElementById('versions-modal');
    if (modal && modal.classList.contains('active')) {
        renderVersionsList();
    }

    return entry;
}

function tryAutoVersionSnapshot(isUnload) {
    if (!_versionDirty && !isUnload) return;
    const settings = getVersionSettings();
    const now = Date.now();
    const due = !_lastVersionAt || (now - _lastVersionAt) >= settings.autoVersionIntervalMin * 60 * 1000;
    if (isUnload) {
        // при закрытии — только если были изменения и прошло хотя бы 1 мин с последней версии
        // (чтобы не спамить), либо ещё не было ни одной
        if (!_versionDirty) return;
        const html = getEditorHtmlForSave();
        if (_lastVersionHtml === html) return;
        if (_lastVersionAt && (now - _lastVersionAt) < 60 * 1000) return;
        createVersionSnapshot({ force: true, source: 'auto', label: 'Автосохранение (закрытие)' });
        return;
    }
    if (due) {
        createVersionSnapshot({ force: true, source: 'auto' });
    }
}

function restoreVersionById(id) {
    const list = loadVersions();
    const entry = list.find(v => v.id === id);
    if (!entry) {
        if (typeof showNotification === 'function') {
            showNotification('Версия не найдена', 'warning');
        }
        return;
    }
    const editor = document.getElementById('editor');
    if (!editor) return;

    if (!confirm('Восстановить эту версию? Текущее содержимое будет заменено (его можно вернуть через Отменить).')) {
        return;
    }

    snapshotEditor('before-restore-version');
    editorHistory.quiet = true;
    editor.innerHTML = entry.html;
    reinitEditorAfterHistory();
    editorHistory.quiet = false;
    editorHistory.lastSnapshotHtml = entry.html;
    _lastAutosavedHtml = entry.html;
    _versionDirty = false;
    markAutosaveDirty();
    saveAutosaveNow(true);

    if (typeof showNotification === 'function') {
        showNotification('Версия восстановлена: ' + formatVersionDate(entry.savedAt), 'success');
    }

    const modal = document.getElementById('versions-modal');
    if (modal) modal.classList.remove('active');
}

function deleteVersionById(id) {
    let list = loadVersions();
    const before = list.length;
    list = list.filter(v => v.id !== id);
    if (list.length === before) return;
    persistVersions(list);
    renderVersionsList();
    if (typeof showNotification === 'function') {
        showNotification('Версия удалена', 'info');
    }
}

function clearAllVersions() {
    if (!confirm('Удалить всю историю версий? Это действие нельзя отменить.')) return;
    persistVersions([]);
    _lastVersionHtml = null;
    _lastVersionAt = 0;
    renderVersionsList();
    if (typeof showNotification === 'function') {
        showNotification('История версий очищена', 'info');
    }
}

let _versionCompareSelection = [];
let _lastComparePayload = null;
let _compareViewMode = 'visual';

function renderVersionsList() {
    const container = document.getElementById('versions-list');
    if (!container) return;
    const list = loadVersions();

    // убрать из выбора несуществующие id
    _versionCompareSelection = _versionCompareSelection.filter(function (id) {
        return list.some(function (v) { return v.id === id; });
    });

    if (list.length === 0) {
        container.innerHTML = '<p class="versions-empty">Пока нет сохранённых версий.</p>';
        updateCompareSelectedButton();
        return;
    }

    container.innerHTML = list.map(function (v) {
        const sourceLabel = v.source === 'manual' ? 'вручную' : 'авто';
        const safeId = String(v.id).replace(/"/g, '');
        const checked = _versionCompareSelection.indexOf(v.id) !== -1 ? ' checked' : '';
        return (
            '<div class="version-item" data-id="' + safeId + '">' +
            '<label class="version-check-wrap" title="Выбрать для сравнения">' +
            '<input type="checkbox" class="version-check" data-id="' + safeId + '"' + checked + '>' +
            '</label>' +
            '<div class="version-item-main">' +
            '<div class="version-item-title">' + formatVersionDate(v.savedAt) +
            ' <span class="version-badge">' + sourceLabel + '</span></div>' +
            '<div class="version-item-preview">' + escapeHtml(v.preview || versionPreviewText(v.html)) + '</div>' +
            '</div>' +
            '<div class="version-item-actions">' +
            '<button type="button" class="btn btn-secondary version-compare-current-btn" data-id="' + safeId + '" title="Сравнить с текущим документом">С текущим</button>' +
            '<button type="button" class="btn btn-secondary version-restore-btn" data-id="' + safeId + '">Восстановить</button>' +
            '<button type="button" class="btn btn-secondary version-delete-btn" data-id="' + safeId + '" title="Удалить">✕</button>' +
            '</div>' +
            '</div>'
        );
    }).join('');

    container.querySelectorAll('.version-check').forEach(function (cb) {
        cb.addEventListener('change', function () {
            const id = cb.getAttribute('data-id');
            if (cb.checked) {
                if (_versionCompareSelection.indexOf(id) === -1) {
                    _versionCompareSelection.push(id);
                }
                // максимум 2
                if (_versionCompareSelection.length > 2) {
                    const removed = _versionCompareSelection.shift();
                    const other = container.querySelector('.version-check[data-id="' + removed + '"]');
                    if (other) other.checked = false;
                }
            } else {
                _versionCompareSelection = _versionCompareSelection.filter(function (x) { return x !== id; });
            }
            updateCompareSelectedButton();
        });
    });

    container.querySelectorAll('.version-restore-btn').forEach(function (btn) {
        btn.addEventListener('click', function () {
            restoreVersionById(btn.getAttribute('data-id'));
        });
    });
    container.querySelectorAll('.version-delete-btn').forEach(function (btn) {
        btn.addEventListener('click', function () {
            if (confirm('Удалить эту версию?')) {
                deleteVersionById(btn.getAttribute('data-id'));
            }
        });
    });
    container.querySelectorAll('.version-compare-current-btn').forEach(function (btn) {
        btn.addEventListener('click', function () {
            compareVersionWithCurrent(btn.getAttribute('data-id'));
        });
    });

    updateCompareSelectedButton();
}

function updateCompareSelectedButton() {
    const btn = document.getElementById('versions-compare-selected');
    if (!btn) return;
    btn.disabled = _versionCompareSelection.length !== 2;
    btn.title = _versionCompareSelection.length === 2
        ? 'Сравнить две выбранные версии'
        : 'Отметьте две версии галочками';
}

function escapeHtml(str) {
    return String(str || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

/** Текст документа по блокам — для осмысленного diff */
function htmlToCompareLines(html) {
    const tmp = document.createElement('div');
    tmp.innerHTML = html || '';
    const lines = [];
    const blocks = tmp.querySelectorAll('.block');
    if (blocks.length) {
        blocks.forEach(function (block, idx) {
            const text = (block.textContent || '').replace(/\s+/g, ' ').trim();
            const cls = Array.from(block.classList || []).filter(function (c) {
                return c !== 'block' && c !== 'selected' && c !== 'dragging';
            }).join('.');
            const tag = cls ? '[' + cls + '] ' : '[block ' + (idx + 1) + '] ';
            lines.push(tag + (text || '(пусто)'));
        });
    } else {
        const text = (tmp.textContent || '').replace(/\s+/g, ' ').trim();
        if (text) {
            // разбить длинный текст на абзацы по предложениям/переносам
            text.split(/\n+/).forEach(function (p) {
                const t = p.trim();
                if (t) lines.push(t);
            });
            if (!lines.length) lines.push(text);
        }
    }
    if (!lines.length) lines.push('(пустой документ)');
    return lines;
}

function countBlocksInHtml(html) {
    const tmp = document.createElement('div');
    tmp.innerHTML = html || '';
    return tmp.querySelectorAll('.block').length;
}

/** Очистить блок от UI редактора для превью */
function cleanBlockHtmlForPreview(blockEl) {
    const clone = blockEl.cloneNode(true);
    clone.classList.remove('selected', 'dragging', 'drag-over', 'drop-above', 'drop-below', 'drop-inside');
    clone.querySelectorAll(
        '.block-actions, .drag-handle, .settings-panel, .settings-block, .edit-block, .copy-block, .export-html-block, .delete-block'
    ).forEach(function (el) { el.remove(); });
    clone.querySelectorAll('[contenteditable]').forEach(function (el) {
        el.removeAttribute('contenteditable');
        el.removeAttribute('data-placeholder');
    });
    clone.removeAttribute('draggable');
    clone.removeAttribute('data-bound');
    return clone.outerHTML;
}

function blockTypeLabel(blockEl) {
    const map = {
        'free-text-block': 'Текст',
        'content-text': 'Текст',
        'content-heading': 'Заголовок',
        'content-image': 'Картинка',
        'content-code': 'Код',
        'content-quote': 'Цитата',
        'content-list': 'Список',
        'content-table': 'Таблица',
        'content-warning': 'Внимание',
        'content-success': 'Успех',
        'content-note': 'Заметка',
        'content-spoiler': 'Спойлер',
        'content-button': 'Кнопка',
        'content-divider': 'Разделитель',
        'content-video': 'Видео',
        'content-download-file': 'Скачать файл',
        'content-faq': 'FAQ',
        'content-before-after': 'До / После',
        'content-meta-author': 'Автор / дата / теги'
    };
    const classes = Array.from(blockEl.classList || []);
    for (let i = 0; i < classes.length; i++) {
        if (map[classes[i]]) return map[classes[i]];
    }
    const c = classes.filter(function (x) { return x !== 'block'; })[0];
    return c || 'Блок';
}

function blockSignature(blockEl) {
    const type = blockTypeLabel(blockEl);
    const text = (blockEl.textContent || '').replace(/\s+/g, ' ').trim();
    return type + '::' + text;
}

function blockTextNorm(blockEl) {
    return (blockEl.textContent || '').replace(/\s+/g, ' ').trim();
}

/**
 * Извлечь блоки для визуального сравнения
 * @returns {{ type, text, sig, previewHtml, index }[]}
 */
function extractBlocksForCompare(html) {
    const tmp = document.createElement('div');
    tmp.innerHTML = html || '';
    const blocks = Array.from(tmp.querySelectorAll('.block'));
    if (!blocks.length) {
        const text = (tmp.textContent || '').replace(/\s+/g, ' ').trim();
        if (!text) return [];
        return [{
            type: 'Документ',
            text: text,
            sig: 'doc::' + text,
            previewHtml: '<div class="block compare-fallback-block"><div class="editable-content"><p>' + escapeHtml(text) + '</p></div></div>',
            index: 0
        }];
    }
    return blocks.map(function (b, i) {
        return {
            type: blockTypeLabel(b),
            text: blockTextNorm(b),
            sig: blockSignature(b),
            previewHtml: cleanBlockHtmlForPreview(b),
            index: i
        };
    });
}

/**
 * Сопоставить блоки left/right: equal | modified | deleted | added
 * modified = тот же «тип» и похожий текст, но не идентичны
 */
function alignBlocksForCompare(leftBlocks, rightBlocks) {
    const aSigs = leftBlocks.map(function (b) { return b.sig; });
    const bSigs = rightBlocks.map(function (b) { return b.sig; });
    const ops = diffLines(aSigs, bSigs);

    // Индексы для точного совпадения по sig
    const usedLeft = Object.create(null);
    const usedRight = Object.create(null);
    const pairs = [];

    // Сначала exact matches из LCS
    let li = 0, ri = 0;
    ops.forEach(function (op) {
        if (op.type === 'equal') {
            while (li < leftBlocks.length && leftBlocks[li].sig !== op.text) li++;
            while (ri < rightBlocks.length && rightBlocks[ri].sig !== op.text) ri++;
            if (li < leftBlocks.length && ri < rightBlocks.length) {
                pairs.push({ status: 'equal', left: leftBlocks[li], right: rightBlocks[ri] });
                usedLeft[li] = true;
                usedRight[ri] = true;
                li++;
                ri++;
            }
        }
    });

    // Оставшиеся — попытка сопоставить по типу (modified)
    const leftRest = leftBlocks.map(function (b, i) { return { b: b, i: i }; }).filter(function (x) { return !usedLeft[x.i]; });
    const rightRest = rightBlocks.map(function (b, i) { return { b: b, i: i }; }).filter(function (x) { return !usedRight[x.i]; });

    const rightByType = Object.create(null);
    rightRest.forEach(function (x) {
        if (!rightByType[x.b.type]) rightByType[x.b.type] = [];
        rightByType[x.b.type].push(x);
    });

    leftRest.forEach(function (lx) {
        const bucket = rightByType[lx.b.type];
        if (bucket && bucket.length) {
            // ближайший по длине текста
            let best = 0;
            let bestScore = Infinity;
            for (let k = 0; k < bucket.length; k++) {
                const score = Math.abs((bucket[k].b.text || '').length - (lx.b.text || '').length);
                if (score < bestScore) {
                    bestScore = score;
                    best = k;
                }
            }
            const rx = bucket.splice(best, 1)[0];
            pairs.push({ status: 'modified', left: lx.b, right: rx.b });
            usedLeft[lx.i] = true;
            usedRight[rx.i] = true;
        }
    });

    // Удалённые
    leftBlocks.forEach(function (b, i) {
        if (!usedLeft[i]) pairs.push({ status: 'deleted', left: b, right: null });
    });
    // Добавленные
    rightBlocks.forEach(function (b, i) {
        if (!usedRight[i]) pairs.push({ status: 'added', left: null, right: b });
    });

    // Порядок: по индексу в «новом» документе, удалённые — по старому индексу около соседей
    pairs.sort(function (p, q) {
        const pi = p.right ? p.right.index : (p.left ? p.left.index - 0.5 : 0);
        const qi = q.right ? q.right.index : (q.left ? q.left.index - 0.5 : 0);
        // для deleted без right — по left.index
        const pa = p.right ? p.right.index : (p.left ? p.left.index - 0.01 : 9999);
        const qa = q.right ? q.right.index : (q.left ? q.left.index - 0.01 : 9999);
        if (p.status === 'deleted' && q.status !== 'deleted') {
            return (p.left.index) - (q.right ? q.right.index : q.left.index);
        }
        return pa - qa;
    });

    return pairs;
}

function summarizeBlockPairs(pairs) {
    const s = { equal: 0, modified: 0, deleted: 0, added: 0 };
    pairs.forEach(function (p) {
        if (s[p.status] != null) s[p.status]++;
    });
    return s;
}

/** Простой line-diff на базе LCS */
function diffLines(aLines, bLines) {
    const n = aLines.length;
    const m = bLines.length;
    // Ограничение размера для LCS (защита от тяжёлых документов)
    if (n * m > 250000) {
        return diffLinesGreedy(aLines, bLines);
    }
    const dp = new Array(n + 1);
    for (let i = 0; i <= n; i++) {
        dp[i] = new Array(m + 1);
        dp[i][0] = 0;
    }
    for (let j = 0; j <= m; j++) dp[0][j] = 0;
    for (let i = 1; i <= n; i++) {
        for (let j = 1; j <= m; j++) {
            if (aLines[i - 1] === bLines[j - 1]) dp[i][j] = dp[i - 1][j - 1] + 1;
            else dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
        }
    }
    const ops = [];
    let i = n, j = m;
    while (i > 0 || j > 0) {
        if (i > 0 && j > 0 && aLines[i - 1] === bLines[j - 1]) {
            ops.push({ type: 'equal', text: aLines[i - 1] });
            i--; j--;
        } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
            ops.push({ type: 'add', text: bLines[j - 1] });
            j--;
        } else {
            ops.push({ type: 'del', text: aLines[i - 1] });
            i--;
        }
    }
    ops.reverse();
    return ops;
}

/** Упрощённый diff без полной LCS-матрицы */
function diffLinesGreedy(aLines, bLines) {
    const ops = [];
    const bSet = Object.create(null);
    bLines.forEach(function (line, idx) {
        if (bSet[line] == null) bSet[line] = [];
        bSet[line].push(idx);
    });
    const usedB = new Array(bLines.length);
    const matchedA = new Array(aLines.length);
    aLines.forEach(function (line, i) {
        const idxs = bSet[line];
        if (!idxs || !idxs.length) return;
        const j = idxs.shift();
        usedB[j] = true;
        matchedA[i] = j;
    });
    let ia = 0, ib = 0;
    while (ia < aLines.length || ib < bLines.length) {
        if (ia < aLines.length && matchedA[ia] != null && matchedA[ia] === ib) {
            ops.push({ type: 'equal', text: aLines[ia] });
            ia++; ib++;
        } else if (ia < aLines.length && matchedA[ia] == null) {
            ops.push({ type: 'del', text: aLines[ia] });
            ia++;
        } else if (ib < bLines.length && !usedB[ib]) {
            ops.push({ type: 'add', text: bLines[ib] });
            ib++;
        } else if (ia < aLines.length && matchedA[ia] != null && matchedA[ia] > ib) {
            ops.push({ type: 'add', text: bLines[ib] });
            ib++;
        } else if (ia < aLines.length) {
            ops.push({ type: 'del', text: aLines[ia] });
            ia++;
        } else if (ib < bLines.length) {
            ops.push({ type: 'add', text: bLines[ib] });
            ib++;
        } else {
            break;
        }
    }
    return ops;
}

function summarizeDiff(ops) {
    let added = 0, removed = 0, equal = 0;
    ops.forEach(function (op) {
        if (op.type === 'add') added++;
        else if (op.type === 'del') removed++;
        else equal++;
    });
    return { added: added, removed: removed, equal: equal, total: ops.length };
}

function openVersionCompare(left, right) {
    // left / right: { label, html, savedAt? }
    const leftBlocks = extractBlocksForCompare(left.html);
    const rightBlocks = extractBlocksForCompare(right.html);
    const pairs = alignBlocksForCompare(leftBlocks, rightBlocks);
    const blockStats = summarizeBlockPairs(pairs);

    const aLines = htmlToCompareLines(left.html);
    const bLines = htmlToCompareLines(right.html);
    const ops = diffLines(aLines, bLines);
    const stats = summarizeDiff(ops);

    _lastComparePayload = {
        left: left,
        right: right,
        leftBlocks: leftBlocks,
        rightBlocks: rightBlocks,
        pairs: pairs,
        blockStats: blockStats,
        aLines: aLines,
        bLines: bLines,
        ops: ops,
        stats: stats
    };

    const meta = document.getElementById('version-compare-meta');
    const statsEl = document.getElementById('version-compare-stats');
    if (meta) {
        meta.innerHTML =
            '<div class="compare-side-label compare-left-label"><span class="compare-role">Было</span> ' + escapeHtml(left.label) + '</div>' +
            '<div class="compare-side-label compare-right-label"><span class="compare-role">Стало</span> ' + escapeHtml(right.label) + '</div>';
    }
    if (statsEl) {
        const identical = blockStats.added === 0 && blockStats.deleted === 0 && blockStats.modified === 0;
        statsEl.innerHTML = identical
            ? '<span class="compare-stat compare-stat-ok">Документы совпадают</span>'
            : (
                (blockStats.added ? '<span class="compare-stat compare-stat-add">+' + blockStats.added + ' блоков</span>' : '') +
                (blockStats.deleted ? '<span class="compare-stat compare-stat-del">−' + blockStats.deleted + ' блоков</span>' : '') +
                (blockStats.modified ? '<span class="compare-stat compare-stat-mod">~' + blockStats.modified + ' изменено</span>' : '') +
                '<span class="compare-stat">без изменений: ' + blockStats.equal + '</span>' +
                '<span class="compare-stat">блоков: ' + leftBlocks.length + ' → ' + rightBlocks.length + '</span>'
            );
    }

    const legend = document.getElementById('version-compare-legend');
    if (legend) legend.style.display = (_compareViewMode === 'visual') ? '' : 'none';

    renderCompareBody();
    const modal = document.getElementById('version-compare-modal');
    if (modal) modal.classList.add('active');
}

function renderCompareBody() {
    const body = document.getElementById('version-compare-body');
    if (!body || !_lastComparePayload) return;
    const p = _lastComparePayload;
    const legend = document.getElementById('version-compare-legend');
    if (legend) legend.style.display = (_compareViewMode === 'visual') ? '' : 'none';

    if (_compareViewMode === 'visual') {
        body.className = 'version-compare-body compare-visual';
        const rows = p.pairs.map(function (pair) {
            const status = pair.status;
            const statusLabel = {
                equal: 'Без изменений',
                modified: 'Изменено',
                deleted: 'Удалено',
                added: 'Добавлено'
            }[status] || status;

            const leftInner = pair.left
                ? '<div class="compare-block-card">' +
                  '<div class="compare-block-meta"><span class="compare-block-type">' + escapeHtml(pair.left.type) + '</span></div>' +
                  '<div class="compare-block-preview editor-preview">' + pair.left.previewHtml + '</div>' +
                  '</div>'
                : '<div class="compare-block-empty">—</div>';

            const rightInner = pair.right
                ? '<div class="compare-block-card">' +
                  '<div class="compare-block-meta"><span class="compare-block-type">' + escapeHtml(pair.right.type) + '</span></div>' +
                  '<div class="compare-block-preview editor-preview">' + pair.right.previewHtml + '</div>' +
                  '</div>'
                : '<div class="compare-block-empty">—</div>';

            // Для modified — лёгкий word-hint в тексте
            let modHint = '';
            if (status === 'modified' && pair.left && pair.right) {
                const shortL = pair.left.text.length > 120 ? pair.left.text.slice(0, 120) + '…' : pair.left.text;
                const shortR = pair.right.text.length > 120 ? pair.right.text.slice(0, 120) + '…' : pair.right.text;
                if (shortL !== shortR) {
                    modHint = '<div class="compare-mod-hint"><span class="hint-old">' + escapeHtml(shortL || '(пусто)') +
                        '</span><span class="hint-arrow">→</span><span class="hint-new">' + escapeHtml(shortR || '(пусто)') + '</span></div>';
                }
            }

            return (
                '<div class="compare-row compare-row-' + status + '">' +
                '<div class="compare-row-badge">' + statusLabel + '</div>' +
                modHint +
                '<div class="compare-row-cols">' +
                '<div class="compare-col compare-col-left">' + leftInner + '</div>' +
                '<div class="compare-col compare-col-right">' + rightInner + '</div>' +
                '</div>' +
                '</div>'
            );
        }).join('');

        body.innerHTML =
            '<div class="compare-visual-header">' +
            '<div class="compare-col-head compare-col-head-left">Было</div>' +
            '<div class="compare-col-head compare-col-head-right">Стало</div>' +
            '</div>' +
            '<div class="compare-visual-rows">' +
            (rows || '<div class="versions-empty">Нечего сравнивать</div>') +
            '</div>';
        return;
    }

    // Текстовый diff
    body.className = 'version-compare-body compare-unified';
    const html = p.ops.map(function (op) {
        const cls = op.type === 'add' ? 'diff-add' : (op.type === 'del' ? 'diff-del' : 'diff-eq');
        const prefix = op.type === 'add' ? '+ ' : (op.type === 'del' ? '− ' : '  ');
        return '<div class="diff-line ' + cls + '">' + escapeHtml(prefix + op.text) + '</div>';
    }).join('');
    body.innerHTML = '<div class="diff-unified">' + (html || '<div class="diff-line diff-eq">Нет отличий</div>') + '</div>';
}

function compareVersionWithCurrent(id) {
    const list = loadVersions();
    const entry = list.find(function (v) { return v.id === id; });
    if (!entry) {
        if (typeof showNotification === 'function') showNotification('Версия не найдена', 'warning');
        return;
    }
    const currentHtml = getEditorHtmlForSave();
    openVersionCompare(
        { label: formatVersionDate(entry.savedAt) + ' (версия)', html: entry.html, savedAt: entry.savedAt },
        { label: 'Текущий документ', html: currentHtml }
    );
}

function compareSelectedVersions() {
    if (_versionCompareSelection.length !== 2) {
        if (typeof showNotification === 'function') {
            showNotification('Отметьте ровно две версии для сравнения', 'warning');
        }
        return;
    }
    const list = loadVersions();
    const a = list.find(function (v) { return v.id === _versionCompareSelection[0]; });
    const b = list.find(function (v) { return v.id === _versionCompareSelection[1]; });
    if (!a || !b) {
        if (typeof showNotification === 'function') showNotification('Версии не найдены', 'warning');
        return;
    }
    // Более старая слева (было), более новая справа (стало)
    let left = a, right = b;
    if ((a.savedAt || 0) > (b.savedAt || 0)) {
        left = b;
        right = a;
    }
    openVersionCompare(
        { label: formatVersionDate(left.savedAt), html: left.html, savedAt: left.savedAt },
        { label: formatVersionDate(right.savedAt), html: right.html, savedAt: right.savedAt }
    );
}

function openVersionsModal() {
    const modal = document.getElementById('versions-modal');
    if (!modal) return;
    const settings = getVersionSettings();
    const input = document.getElementById('version-interval-min');
    if (input) input.value = String(settings.autoVersionIntervalMin);
    renderVersionsList();
    modal.classList.add('active');
}

function restartVersionTimer() {
    if (_versionTimer) {
        clearInterval(_versionTimer);
        _versionTimer = null;
    }
    const settings = getVersionSettings();
    // Проверяем чаще, чем интервал (каждую минуту или 1/3 интервала), чтобы не промахнуться
    const checkMs = Math.min(60 * 1000, Math.max(15 * 1000, Math.floor(settings.autoVersionIntervalMin * 60 * 1000 / 3)));
    _versionTimer = setInterval(function () {
        tryAutoVersionSnapshot(false);
    }, checkMs);
}

function setupVersionHistory() {
    const settings = getVersionSettings();
    const versions = loadVersions();
    if (versions.length > 0) {
        _lastVersionHtml = versions[0].html;
        _lastVersionAt = versions[0].savedAt || 0;
    }

    restartVersionTimer();

    const intervalSave = document.getElementById('version-interval-save');
    const intervalInput = document.getElementById('version-interval-min');
    const saveNowBtn = document.getElementById('version-save-now');
    const clearBtn = document.getElementById('versions-clear-all');
    const compareSelectedBtn = document.getElementById('versions-compare-selected');
    const viewVisualBtn = document.getElementById('compare-view-visual');
    const viewUnifiedBtn = document.getElementById('compare-view-unified');

    if (intervalSave && intervalInput) {
        intervalSave.addEventListener('click', function () {
            let val = parseInt(intervalInput.value, 10);
            if (isNaN(val) || val < 1) val = DEFAULT_VERSION_INTERVAL_MIN;
            if (val > 1440) val = 1440;
            intervalInput.value = String(val);
            saveVersionSettings({ autoVersionIntervalMin: val });
            restartVersionTimer();
            if (typeof showNotification === 'function') {
                showNotification('Интервал автосохранения версий: ' + val + ' мин.', 'success');
            }
        });
    }

    if (saveNowBtn) {
        saveNowBtn.addEventListener('click', function () {
            createVersionSnapshot({ force: true, source: 'manual', label: 'Ручная версия' });
            renderVersionsList();
        });
    }

    if (clearBtn) {
        clearBtn.addEventListener('click', clearAllVersions);
    }

    if (compareSelectedBtn) {
        compareSelectedBtn.addEventListener('click', compareSelectedVersions);
    }

    function setCompareView(mode) {
        _compareViewMode = mode === 'unified' ? 'unified' : 'visual';
        if (viewVisualBtn) viewVisualBtn.classList.toggle('active', _compareViewMode === 'visual');
        if (viewUnifiedBtn) viewUnifiedBtn.classList.toggle('active', _compareViewMode === 'unified');
        renderCompareBody();
    }
    if (viewVisualBtn) viewVisualBtn.addEventListener('click', function () { setCompareView('visual'); });
    if (viewUnifiedBtn) viewUnifiedBtn.addEventListener('click', function () { setCompareView('unified'); });

    // Синхронизировать input при открытии уже сделано в openVersionsModal
    if (intervalInput) {
        intervalInput.value = String(settings.autoVersionIntervalMin);
    }
}

function setupKeyboardShortcuts() {
    setupEditorHistory();
    setupCommandPalette();

    document.addEventListener('keydown', function(e) {
        const tag = (e.target && e.target.tagName) ? e.target.tagName.toLowerCase() : '';
        const inModal = !!(e.target.closest && e.target.closest('.modal'));
        const inCmdPalette = !!(e.target.closest && e.target.closest('#command-palette-modal'));
        const inModalField = inModal && (tag === 'textarea' || tag === 'input' || tag === 'select');
        // Палитра команд обрабатывает свои клавиши сама
        if (inCmdPalette) return;
        if (inModalField) return;

        const editor = document.getElementById('editor');
        const inEditor = !!(editor && (editor === e.target || editor.contains(e.target)));
        const inText = !!(e.target && (e.target.isContentEditable || (e.target.closest && e.target.closest('[contenteditable="true"]'))));

        const ctrl = e.ctrlKey || e.metaKey;
        const shift = e.shiftKey;
        const key = e.key;
        const code = e.code;

        function stopBrowser() {
            e.preventDefault();
            e.stopPropagation();
            if (typeof e.stopImmediatePropagation === 'function') e.stopImmediatePropagation();
        }

        // Палитра команд:
        // Alt+K — надёжно (Ctrl+K в Chrome/Edge отдаётся поиску браузера и страницей не перехватывается)
        // Ctrl+Shift+Space — запасной вариант
        // Ctrl+K — пробуем (в Firefox / части контекстов сработает)
        if (e.altKey && !ctrl && (key === 'k' || key === 'K' || code === 'KeyK')) {
            stopBrowser();
            openCommandPalette();
            return;
        }
        if (ctrl && shift && (key === ' ' || code === 'Space')) {
            stopBrowser();
            openCommandPalette();
            return;
        }
        if (ctrl && !shift && (key === 'k' || key === 'K')) {
            stopBrowser();
            openCommandPalette();
            return;
        }

        // Undo / Redo
        if (ctrl && !shift && (key === 'z' || key === 'Z')) {
            stopBrowser();
            undoEditor();
            return;
        }
        if (ctrl && ((shift && (key === 'z' || key === 'Z')) || (!shift && (key === 'y' || key === 'Y')))) {
            stopBrowser();
            redoEditor();
            return;
        }

        // Справка
        if ((ctrl && (key === '/' || code === 'Slash')) ||
            (key === '?' && !ctrl && !e.altKey && !inText && tag !== 'input' && tag !== 'textarea')) {
            stopBrowser();
            openShortcutsModal();
            return;
        }

        if (key === 'Escape') {
            deselectAllBlocks();
            document.querySelectorAll('.settings-panel').forEach(p => { p.style.display = 'none'; });
            document.querySelectorAll('.modal.active').forEach(m => { m.classList.remove('active'); });
            document.body.style.overflow = '';
            return;
        }

        // Экспорт / импорт — всегда
        if (ctrl && !shift && (key === 'e' || key === 'E' || key === 's' || key === 'S')) {
            stopBrowser();
            exportHTML();
            return;
        }
        if (ctrl && shift && (key === 'i' || key === 'I')) {
            stopBrowser();
            const importModal = document.getElementById('import-modal');
            if (importModal) importModal.classList.add('active');
            return;
        }

        // Ctrl+A
        if (ctrl && !shift && (key === 'a' || key === 'A')) {
            if (inEditor) {
                const selectedBlocks = document.querySelectorAll('.block.selected');
                if (!inText || selectedBlocks.length > 0) {
                    stopBrowser();
                    selectAllBlocks();
                    return;
                }
                stopBrowser();
                const editable = e.target.isContentEditable ? e.target : e.target.closest('[contenteditable="true"]');
                if (editable) {
                    const range = document.createRange();
                    range.selectNodeContents(editable);
                    const sel = window.getSelection();
                    sel.removeAllRanges();
                    sel.addRange(range);
                } else {
                    selectAllBlocks();
                }
                return;
            }
            return;
        }

        if (!inEditor && !inText) return;

        if (ctrl && !shift && (key === 'b' || key === 'B')) {
            stopBrowser();
            document.execCommand('bold', false, null);
            return;
        }
        if (ctrl && !shift && (key === 'i' || key === 'I')) {
            stopBrowser();
            document.execCommand('italic', false, null);
            return;
        }
        if (ctrl && !shift && (key === 'u' || key === 'U')) {
            stopBrowser();
            document.execCommand('underline', false, null);
            return;
        }
        if (ctrl && shift && (key === 's' || key === 'S')) {
            stopBrowser();
            document.execCommand('strikethrough', false, null);
            return;
        }
        // Ссылка: Ctrl+Shift+K (Ctrl+K занят палитрой)
        if (ctrl && shift && (key === 'k' || key === 'K')) {
            stopBrowser();
            const url = prompt('Введите URL:');
            if (url) document.execCommand('createLink', false, url);
            return;
        }
        if (ctrl && shift && (key === 'l' || key === 'L')) {
            stopBrowser();
            document.execCommand('insertUnorderedList', false, null);
            return;
        }
        if (ctrl && shift && (key === 'o' || key === 'O')) {
            stopBrowser();
            document.execCommand('insertOrderedList', false, null);
            return;
        }

        if (ctrl && !shift && (key === 'd' || key === 'D')) {
            const selectedBlocks = document.querySelectorAll('.block.selected');
            if (selectedBlocks.length > 0) {
                stopBrowser();
                copySelectedBlocks();
            }
            return;
        }

        if (key === 'Delete') {
            const selectedBlocks = document.querySelectorAll('.block.selected');
            if (selectedBlocks.length > 0 && !inText) {
                stopBrowser();
                deleteSelectedBlocks();
            }
            return;
        }
    }, true);

    const shortcutsBtn = document.getElementById('shortcuts-btn');
    if (shortcutsBtn) {
        shortcutsBtn.addEventListener('click', openShortcutsModal);
    }
    const cmdBtn = document.getElementById('command-palette-btn');
    if (cmdBtn) {
        cmdBtn.addEventListener('click', function(e) {
            e.preventDefault();
            openCommandPalette();
        });
    }
}




function openShortcutsModal() {
    const modal = document.getElementById('shortcuts-modal');
    const list = document.getElementById('shortcuts-list');
    if (!modal || !list) return;

    // Группируем
    const groups = {};
    SHORTCUTS.forEach(s => {
        if (!groups[s.group]) groups[s.group] = [];
        // не дублируем одинаковые action+desc
        if (!groups[s.group].some(x => x.desc === s.desc && x.keys === s.keys)) {
            groups[s.group].push(s);
        }
    });

    // Уникальные по desc внутри группы
    list.innerHTML = Object.entries(groups).map(([group, items]) => {
        const unique = [];
        const seen = new Set();
        items.forEach(item => {
            if (seen.has(item.desc)) return;
            seen.add(item.desc);
            unique.push(item);
        });
        return `
            <div class="shortcuts-group">
                <div class="shortcuts-group-title">${group}</div>
                ${unique.map(item => `
                    <div class="shortcut-row">
                        <span class="shortcut-desc">${item.desc}</span>
                        <kbd class="shortcut-keys">${formatShortcutKeys(item.keys)}</kbd>
                    </div>
                `).join('')}
            </div>
        `;
    }).join('');

    modal.classList.add('active');
}

function formatShortcutKeys(keys) {
    return keys
        .split('+')
        .map(k => `<span class="kbd-key">${k.trim()}</span>`)
        .join('<span class="kbd-plus">+</span>');
}


// Загрузка шаблонов
function loadTemplates() {
    // Обработчики добавляются в initTemplateCategories()
}

// ========== Умный импорт HTML (восстанавливает интерактивные блоки, в т.ч. вложенные) ==========

const KNOWN_CONTENT_CLASSES = [
    'content-spoiler', 'content-warning', 'content-success', 'content-note',
    'content-numbered', 'content-code', 'content-image', 'content-quote',
    'content-link-buttons', 'content-1c-configuration', 'content-glossary',
    'content-image-caption', 'content-type-comparison', 'content-developer-note',
    'content-custom', 'content-text',
    'content-video', 'content-divider', 'content-download-file', 'content-faq',
    'content-before-after', 'content-meta-author', 'content-heading', 'content-table'
];

function getBlockUIShell(contentClass, innerContentHTML, isFreeText = false) {
    if (isFreeText) {
        return `
    <div class="block free-text-block content-text" draggable="false">
        <div class="drag-handle" title="Перетащить">≡</div>
        <div class="block-actions">
            <button class="delete-block" type="button" title="Удалить" aria-label="Удалить">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
            </button>
        </div>
        <div class="editable-content">
            ${innerContentHTML}
        </div>
    </div>`;
    }

    const settingsHTML = (typeof universalSettingsHTML !== 'undefined')
        ? universalSettingsHTML
        : `
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
        <div class="settings-actions">
            <button class="settings-btn apply-settings" type="button">Применить настройки</button>
            <button class="settings-btn reset-defaults" type="button">Вернуть по умолчанию</button>
            <button class="settings-btn close-settings" type="button">Закрыть</button>
        </div>`;

    return `
    <div class="block ${contentClass}" draggable="true">
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
            ${settingsHTML}
        </div>
        <div class="editable-content" contenteditable="false">
            ${innerContentHTML}
        </div>
    </div>`;
}

/**
 * Очистка «грязного» HTML (скопированного из живого редактора или частично экспортированного):
 * - удаляет protection-overlay
 * - разворачивает лишние вложенные .editable-content
 * - убирает data-locked, contenteditable с обёрток, служебные стили
 */
function sanitizeImportedHTML(root) {
    // 1. Удаляем оверлеи защиты
    root.querySelectorAll('.protection-overlay').forEach(el => el.remove());

    // 2. Убираем служебные атрибуты
    root.querySelectorAll('[data-locked]').forEach(el => el.removeAttribute('data-locked'));
    root.querySelectorAll('[contenteditable]').forEach(el => {
        // оставляем contenteditable только на настоящих текстовых полях (free-text, title и т.п.)
        if (!el.classList.contains('free-text') &&
            !el.classList.contains('numbered-title') &&
            !el.classList.contains('warning-title') &&
            !el.classList.contains('success-title') &&
            !el.classList.contains('note-title') &&
            !el.classList.contains('spoiler-header') &&
            !el.classList.contains('code-content') &&
            !el.classList.contains('caption-text')) {
            el.removeAttribute('contenteditable');
        }
    });

    // 3. Разворачиваем лишние вложенные .editable-content (оставляем только один уровень)
    // Делаем несколько проходов, пока есть вложенность
    let changed = true;
    while (changed) {
        changed = false;
        root.querySelectorAll('.editable-content .editable-content').forEach(inner => {
            const parent = inner.parentElement;
            if (!parent) return;
            // Переносим детей внутреннего editable-content на место самого inner
            while (inner.firstChild) {
                parent.insertBefore(inner.firstChild, inner);
            }
            inner.remove();
            changed = true;
        });
    }

    // 4. Убираем пустые editable-content
    root.querySelectorAll('.editable-content').forEach(ec => {
        if (!ec.innerHTML.trim()) {
            ec.remove();
        }
    });

    // 5. Чистим лишние пробелы/переносы в тексте (не трогаем pre/code)
    root.querySelectorAll('div, span, p').forEach(el => {
        if (el.closest('pre, code, .code-container')) return;
        // ничего агрессивного не делаем
    });
}

/**
 * Рекурсивно превращает все content-* элементы в полноценные .block
 * (от самых глубоких к верхним, чтобы сохранить вложенность).
 */
function rebuildAllContentBlocks(root) {
    // Собираем все content-* элементы, сортируем по глубине (сначала самые глубокие)
    const candidates = Array.from(root.querySelectorAll('[class*="content-"]')).filter(el => {
        const cls = Array.from(el.classList).find(c => c.startsWith('content-'));
        return cls && KNOWN_CONTENT_CLASSES.includes(cls);
    });

    // Сортировка: чем больше предков content-*, тем глубже
    candidates.sort((a, b) => {
        const depth = (el) => {
            let d = 0;
            let p = el.parentElement;
            while (p && p !== root) {
                if (Array.from(p.classList || []).some(c => c.startsWith('content-'))) d++;
                p = p.parentElement;
            }
            return d;
        };
        return depth(b) - depth(a); // сначала глубокие
    });

    candidates.forEach(el => {
        // Если уже стал .block — пропускаем
        if (el.classList.contains('block')) return;

        const contentClass = Array.from(el.classList).find(c => c.startsWith('content-'));
        if (!contentClass) return;

        // Берём текущее внутреннее содержимое (уже очищенное)
        let innerHTML = el.innerHTML;

        // Если внутри уже есть .editable-content — берём его содержимое
        const existingEditable = el.querySelector(':scope > .editable-content');
        if (existingEditable) {
            innerHTML = existingEditable.innerHTML;
        }

        const shellHTML = getBlockUIShell(contentClass, innerHTML, contentClass === 'content-text');
        const wrapper = document.createElement('div');
        wrapper.innerHTML = shellHTML.trim();
        const newBlock = wrapper.firstElementChild;

        // Переносим style и дополнительные классы
        if (el.getAttribute('style')) {
            newBlock.setAttribute('style', el.getAttribute('style'));
        }
        Array.from(el.classList).forEach(cls => {
            if (!cls.startsWith('content-') && cls !== 'block') {
                newBlock.classList.add(cls);
            }
        });

        // Заменяем старый элемент на новый блок
        if (el.parentNode) {
            el.parentNode.replaceChild(newBlock, el);
        }
    });
}

/**
 * Умный импорт: восстанавливает интерактивные блоки (включая вложенные).
 * Работает как с чистым экспортом, так и с «грязным» HTML из живого редактора.
 */
function smartImportHTML(htmlString) {
    const editor = document.getElementById('editor');
    if (!editor) return;

    // Убираем стартовую drop-zone если есть
    const initialDropZone = document.getElementById('initial-drop-zone');
    if (initialDropZone) initialDropZone.remove();

    const temp = document.createElement('div');
    temp.innerHTML = htmlString.trim();

    // Если уже есть полноценные .block — просто вставляем
    if (temp.querySelector('.block') && !temp.querySelector('.content-spoiler:not(.block), .content-numbered:not(.block), .content-success:not(.block)')) {
        editor.innerHTML = temp.innerHTML;
        reinitializeBlocks();
        editor.querySelectorAll('.free-text-block').forEach(bindFreeTextBlock);
        return;
    }

    // 1. Очищаем мусор
    sanitizeImportedHTML(temp);

    // 2. Рекурсивно восстанавливаем все content-* (включая вложенные)
    rebuildAllContentBlocks(temp);

    // 3. Обрабатываем оставшиеся голые <p> как free-text
    Array.from(temp.children).forEach(child => {
        if (child.tagName === 'P' && !child.closest('.block')) {
            const block = rebuildFreeTextBlock(child);
            if (block && child.parentNode) {
                child.parentNode.replaceChild(block, child);
            }
        }
    });

    // 4. Вставляем результат
    editor.innerHTML = '';
    while (temp.firstChild) {
        editor.appendChild(temp.firstChild);
    }

    // Если ничего не получилось — fallback
    if (!editor.children.length && htmlString.trim()) {
        editor.innerHTML = htmlString;
    }

    reinitializeBlocks();
    editor.querySelectorAll('.free-text-block').forEach(bindFreeTextBlock);

    // Включаем редактирование для free-text
    editor.querySelectorAll('.free-text').forEach(el => {
        el.setAttribute('contenteditable', 'true');
    });
}

function rebuildInteractiveBlock(cleanElement, contentClass) {
    // Берём внутреннее содержимое (после экспорта UI уже удалён)
    let innerHTML = cleanElement.innerHTML;
    const existingEditable = cleanElement.querySelector(':scope > .editable-content');
    if (existingEditable) {
        innerHTML = existingEditable.innerHTML;
    }

    const shell = getBlockUIShell(contentClass, innerHTML, contentClass === 'content-text');
    const div = document.createElement('div');
    div.innerHTML = shell;
    const block = div.firstElementChild;

    // Переносим инлайн-стили с оригинального элемента (цвета и т.п.)
    if (cleanElement.getAttribute('style')) {
        block.setAttribute('style', cleanElement.getAttribute('style'));
    }
    // Сохраняем остальные классы кроме content-*
    Array.from(cleanElement.classList).forEach(cls => {
        if (!cls.startsWith('content-') && cls !== 'block') {
            block.classList.add(cls);
        }
    });

    return block;
}

function rebuildFreeTextBlock(pElement) {
    const inner = pElement.innerHTML.trim() || '<br>';
    const pHTML = `<p class="free-text has-content" contenteditable="true" data-placeholder="Начните писать…">${inner}</p>`;
    const shell = getBlockUIShell('content-text', pHTML, true);
    const div = document.createElement('div');
    div.innerHTML = shell;
    return div.firstElementChild;
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
        // сброс флагов, чтобы обработчики video/download повесились заново
        delete block.dataset.videoBound;
        delete block.dataset.downloadBound;
        if (typeof setupVideoBlock === 'function') setupVideoBlock(block);
        if (typeof setupDownloadFileBlock === 'function') setupDownloadFileBlock(block);
        if (typeof setupTableControls === 'function' && block.classList.contains('content-table')) {
            setupTableControls(block);
        }
    });
}

function applyHeadingFormat(tag) {
    const allowed = { h1: true, h2: true, h3: true };
    if (!allowed[tag]) tag = 'h2';
    const sel = window.getSelection();
    const inEditable = sel && sel.rangeCount && sel.anchorNode &&
        (sel.anchorNode.nodeType === 1 ? sel.anchorNode.closest('[contenteditable="true"]') :
            (sel.anchorNode.parentElement && sel.anchorNode.parentElement.closest('[contenteditable="true"]')));
    if (inEditable) {
        try {
            document.execCommand('formatBlock', false, tag);
            showNotification('Применён ' + tag.toUpperCase(), 'success');
            return;
        } catch (e) { /* fallback to block insert */ }
    }
    // Нет выделения в тексте — вставить блок заголовка
    if (typeof insertTemplate === 'function') {
        insertTemplate('heading-' + tag);
    }
}

function updateTableSizeLabel(block) {
    if (!block) return;
    const table = block.querySelector('table.editor-table');
    const label = block.querySelector('.table-size-label');
    if (!table || !label) return;
    const tbody = table.querySelector('tbody') || table;
    const rows = tbody.querySelectorAll('tr').length;
    const firstRow = tbody.querySelector('tr');
    const cols = firstRow ? firstRow.children.length : 0;
    label.textContent = rows + ' × ' + cols;
    block.setAttribute('data-table-rows', String(rows));
    block.setAttribute('data-table-cols', String(cols));
}

function setupTableControls(block) {
    if (!block || !block.classList.contains('content-table')) return;

    // Убрать старый toolbar из контента, если остался (импорт / старые блоки)
    const oldToolbar = block.querySelector('.editable-content > .table-toolbar');
    if (oldToolbar) oldToolbar.remove();

    // Если в settings-panel нет блока структуры — вставить
    const panel = block.querySelector('.settings-panel');
    if (panel && !panel.querySelector('.table-structure-settings')) {
        const html = (typeof tableStructureSettingsHTML !== 'undefined')
            ? tableStructureSettingsHTML
            : `
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
    </div>`;
        panel.insertAdjacentHTML('afterbegin', html);
    }

    updateTableSizeLabel(block);

    if (block.getAttribute('data-table-controls-bound') === '1') return;
    block.setAttribute('data-table-controls-bound', '1');

    block.addEventListener('click', function(e) {
        const btn = e.target.closest('[data-table-action]');
        if (!btn || !block.contains(btn)) return;
        e.preventDefault();
        e.stopPropagation();
        const action = btn.getAttribute('data-table-action');
        const table = block.querySelector('table.editor-table');
        if (!table) return;
        if (typeof snapshotEditor === 'function') snapshotEditor('table-' + action);
        if (action === 'add-row') tableAddRow(table);
        else if (action === 'del-row') tableDelRow(table);
        else if (action === 'add-col') tableAddCol(table);
        else if (action === 'del-col') tableDelCol(table);
        updateTableSizeLabel(block);
        if (typeof markAutosaveDirty === 'function') markAutosaveDirty();
    });
}

function tableAddRow(table) {
    const tbody = table.querySelector('tbody') || table;
    const rows = tbody.querySelectorAll('tr');
    if (rows.length >= 10) {
        showNotification('Максимум 10 строк', 'warning');
        return;
    }
    const cols = rows[0] ? rows[0].children.length : 2;
    const tr = document.createElement('tr');
    for (let i = 0; i < cols; i++) {
        const td = document.createElement('td');
        td.contentEditable = 'true';
        td.textContent = '';
        tr.appendChild(td);
    }
    tbody.appendChild(tr);
}

function tableDelRow(table) {
    const tbody = table.querySelector('tbody') || table;
    const rows = tbody.querySelectorAll('tr');
    if (rows.length <= 2) {
        showNotification('Минимум 2 строки', 'warning');
        return;
    }
    tbody.removeChild(rows[rows.length - 1]);
}

function tableAddCol(table) {
    const tbody = table.querySelector('tbody') || table;
    const rows = tbody.querySelectorAll('tr');
    if (!rows.length) return;
    if (rows[0].children.length >= 10) {
        showNotification('Максимум 10 столбцов', 'warning');
        return;
    }
    rows.forEach(function(tr, idx) {
        const cell = document.createElement(idx === 0 ? 'th' : 'td');
        cell.contentEditable = 'true';
        cell.textContent = idx === 0 ? 'Колонка' : '';
        tr.appendChild(cell);
    });
}

function tableDelCol(table) {
    const tbody = table.querySelector('tbody') || table;
    const rows = tbody.querySelectorAll('tr');
    if (!rows.length || rows[0].children.length <= 2) {
        showNotification('Минимум 2 столбца', 'warning');
        return;
    }
    rows.forEach(function(tr) {
        if (tr.lastElementChild) tr.removeChild(tr.lastElementChild);
    });
}

function getExportStyleMode() {
    const checked = document.querySelector('input[name="export-style-mode"]:checked');
    return checked ? checked.value : 'inline';
}

function getExportArticleCss() {
    return [
        'body { font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; line-height: 1.6; max-width: 800px; margin: 24px auto; padding: 0 16px; color: #222; }',
        'img { max-width: 100%; height: auto; }',
        'a { color: #0d9488; }',
        'h1, h2, h3 { line-height: 1.25; margin: 1.2em 0 0.5em; }',
        'h1 { font-size: 2em; }',
        'h2 { font-size: 1.5em; }',
        'h3 { font-size: 1.25em; }',
        'table.editor-table, table { border-collapse: collapse; width: 100%; margin: 1em 0; }',
        'table.editor-table th, table.editor-table td, table th, table td { border: 1px solid #ccc; padding: 8px 10px; text-align: left; }',
        'table.editor-table th, table th { background: #f5f5f5; font-weight: 600; }',
        '.content-warning, .warning-container { background: #ffd1d1; border: 2px solid #7a0000; padding: 15px; margin-bottom: 15px; border-radius: 4px; }',
        '.content-success, .success-container { background: #eaf8db; border: 2px solid #2e7d32; padding: 15px; margin-bottom: 15px; border-radius: 4px; }',
        '.content-note, .note-container { background: #fffed1; border: 2px solid #ffc107; padding: 15px; margin-bottom: 15px; border-radius: 4px; }',
        '.content-code, .code-container { background: #f8f8f8; padding: 5px; border: 1px solid #ddd; border-radius: 5px; }',
        'pre, code { font-family: "Roboto Mono", "Courier New", monospace; }',
        'blockquote { border-left: 4px solid #ccc; margin: 1em 0; padding-left: 1em; color: #555; }'
    ].join('\n');
}

function buildExportDocument(bodyHtml, title, styleMode) {
    const safeTitle = (title || 'Статья').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    let headExtra = '';
    if (styleMode === 'inline') {
        headExtra = '<style>\n' + getExportArticleCss() + '\n</style>';
    } else if (styleMode === 'external') {
        headExtra = '<link rel="stylesheet" href="article.css">';
    }
    return '<!DOCTYPE html>\n<html lang="ru">\n<head>\n<meta charset="UTF-8">\n<meta name="viewport" content="width=device-width, initial-scale=1.0">\n<title>' +
        safeTitle + '</title>\n' + headExtra + '\n</head>\n<body>\n' + bodyHtml + '\n</body>\n</html>';
}

function downloadBlobFile(content, filename, mime) {
    const blob = new Blob([content], { type: mime || 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(function() {
        URL.revokeObjectURL(url);
        a.remove();
    }, 1500);
}

function getCleanHTMLFromClone(contentClone) {
    contentClone.querySelectorAll('.nested-editor').forEach(nested => {
        const parent = nested.parentElement;
        if (parent) {
            while (nested.firstChild) parent.insertBefore(nested.firstChild, nested);
        }
    });

    contentClone.querySelectorAll(
        '.drag-handle, .block-actions, .block-settings, .settings-panel, .nested-editor, .insert-macro-btn, .drop-zone, .protection-overlay, .table-toolbar'
    ).forEach(el => el.remove());

    contentClone.querySelectorAll('.free-text-block').forEach(wrap => {
        const p = wrap.querySelector('.free-text') || wrap.querySelector('p');
        if (!p || !(p.textContent || '').trim()) {
            wrap.remove();
            return;
        }
        p.removeAttribute('contenteditable');
        p.removeAttribute('data-placeholder');
        p.removeAttribute('data-locked');
        p.classList.remove('free-text', 'has-content');
        if (!p.className) p.removeAttribute('class');
        wrap.replaceWith(p);
    });
    contentClone.querySelectorAll('.free-text').forEach(el => {
        el.removeAttribute('contenteditable');
        el.removeAttribute('data-placeholder');
        el.classList.remove('free-text', 'has-content');
        if (!el.className) el.removeAttribute('class');
        if (!(el.textContent || '').trim()) el.remove();
    });

    contentClone.querySelectorAll('[contenteditable], [draggable], [data-locked], [data-placeholder]').forEach(el => {
        el.removeAttribute('contenteditable');
        el.removeAttribute('draggable');
        el.removeAttribute('data-locked');
        el.removeAttribute('data-placeholder');
    });

    contentClone.querySelectorAll('.block').forEach(el => {
        const contentClass = Array.from(el.classList).find(cls => cls.startsWith('content-'));
        el.className = contentClass || '';
    });

    contentClone.querySelectorAll('.editable-content').forEach(content => {
        if (content.innerHTML.trim() === '') {
            content.remove();
        } else {
            const parentBlock = content.closest('.block');
            if (parentBlock) {
                while (content.firstChild) parentBlock.appendChild(content.firstChild);
                content.remove();
            }
        }
    });

    convertCssVarsToValues(contentClone, 'light');
    return contentClone.innerHTML.trim();
}

function buildCleanExportHTML(options) {
    options = options || {};
    const editor = document.getElementById('editor');
    if (!editor || !editor.innerHTML.trim()) return '';

    const selectedOnly = options.selectedOnly || (document.getElementById('export-selected-only') && document.getElementById('export-selected-only').checked);
    let contentClone;

    if (selectedOnly) {
        const selected = editor.querySelectorAll('.block.selected');
        if (!selected.length) return '';
        contentClone = document.createElement('div');
        selected.forEach(function(b) {
            contentClone.appendChild(b.cloneNode(true));
        });
    } else {
        contentClone = editor.cloneNode(true);
    }

    return getCleanHTMLFromClone(contentClone);
}

function refreshExportPreview() {
    const exportArea = document.getElementById('export-area');
    const exportModal = document.getElementById('export-modal');
    if (!exportArea || !exportModal || !exportModal.classList.contains('active')) return;

    const selectedOnly = document.getElementById('export-selected-only') && document.getElementById('export-selected-only').checked;
    const fullDoc = document.getElementById('export-full-document') && document.getElementById('export-full-document').checked;
    const titleEl = document.getElementById('export-title');
    const title = titleEl ? titleEl.value.trim() || 'Статья' : 'Статья';
    const styleMode = getExportStyleMode();

    let bodyHtml = buildCleanExportHTML({ selectedOnly: selectedOnly });
    if (!bodyHtml && selectedOnly) {
        exportArea.value = '<!-- Нет выделенных блоков. Снимите галочку или выделите блоки. -->';
        return;
    }
    if (fullDoc) {
        exportArea.value = buildExportDocument(bodyHtml, title, styleMode === 'external' ? 'external' : (styleMode === 'none' ? 'none' : 'inline'));
    } else {
        exportArea.value = bodyHtml;
    }
}

function downloadExportedHtml(withCssFile) {
    const selectedOnly = document.getElementById('export-selected-only') && document.getElementById('export-selected-only').checked;
    const fullDoc = document.getElementById('export-full-document') && document.getElementById('export-full-document').checked;
    const titleEl = document.getElementById('export-title');
    const title = titleEl ? titleEl.value.trim() || 'Статья' : 'Статья';
    let styleMode = getExportStyleMode();
    if (withCssFile) styleMode = 'external';

    const bodyHtml = buildCleanExportHTML({ selectedOnly: selectedOnly });
    if (!bodyHtml) {
        showNotification(selectedOnly ? 'Нет выделенных блоков' : 'Редактор пуст', 'warning');
        return;
    }

    const baseName = (title || 'article')
        .replace(/[^\wа-яА-ЯёЁ\- ]+/gi, '')
        .trim()
        .replace(/\s+/g, '_')
        .slice(0, 60) || 'article';

    let htmlContent;
    if (fullDoc || withCssFile) {
        htmlContent = buildExportDocument(bodyHtml, title, styleMode);
    } else if (styleMode === 'inline') {
        htmlContent = '<style>\n' + getExportArticleCss() + '\n</style>\n' + bodyHtml;
    } else {
        htmlContent = bodyHtml;
    }

    downloadBlobFile(htmlContent, baseName + '.html', 'text/html;charset=utf-8');

    if (withCssFile || styleMode === 'external') {
        setTimeout(function() {
            downloadBlobFile(getExportArticleCss(), 'article.css', 'text/css;charset=utf-8');
        }, 300);
        showNotification('Скачаны ' + baseName + '.html и article.css', 'success');
    } else {
        showNotification('Скачан ' + baseName + '.html', 'success');
    }
}

// Экспорт HTML
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

    const selectedCount = editor.querySelectorAll('.block.selected').length;
    const selectedOnlyCb = document.getElementById('export-selected-only');
    if (selectedOnlyCb) {
        selectedOnlyCb.checked = selectedCount > 0;
        selectedOnlyCb.disabled = false;
    }

    exportModal.classList.add('active');
    refreshExportPreview();
    showNotification('Экспорт готов. Можно скопировать или скачать файл.', 'success');
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
            <button class="edit-block" type="button" title="Блокировать редактирование" aria-label="Блокировать редактирование">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 9.9-1"/></svg>
            </button>
            <button class="copy-block" type="button" title="Копировать" aria-label="Копировать">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
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