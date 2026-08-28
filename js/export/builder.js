/**
 * export/builder.js — Сборка чистого HTML и скачивание
 * Зависит от: showNotification (ui/editor)
 */

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
        '.drag-handle, .block-actions, .block-settings, .settings-panel, .nested-editor, .insert-macro-btn, .drop-zone, .protection-overlay, .table-toolbar, .image-upload-btn, .image-upload-hint, .image-block-file-input, .image-resize-handle, .image-resize-size-label'
    ).forEach(el => el.remove());

    // Разворачиваем image-upload-zone / image-resize-wrap
    contentClone.querySelectorAll('.image-upload-zone').forEach(function(zone) {
        const parent = zone.parentNode;
        if (!parent) return;
        while (zone.firstChild) parent.insertBefore(zone.firstChild, zone);
        zone.remove();
    });
    contentClone.querySelectorAll('.image-resize-wrap').forEach(function(wrap) {
        const img = wrap.querySelector('img');
        if (img && wrap.parentNode) {
            if (wrap.style.width) img.style.width = wrap.style.width;
            wrap.parentNode.replaceChild(img, wrap);
        }
    });
    // Скрытые пустые img (без src) — убрать
    contentClone.querySelectorAll('img').forEach(function(img) {
        const src = img.getAttribute('src') || '';
        if (!src || img.hasAttribute('hidden')) {
            if (!src) img.remove();
            else img.removeAttribute('hidden');
        }
    });

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

/**
 * Собрать изображения из HTML, вынести data:/blob: в папку images/,
 * вернуть { html, files: [{ path, blob }] }
 */
function extractImagesForZip(html) {
    const files = [];
    const usedNames = Object.create(null);
    let counter = 0;

    function uniqueName(base) {
        let name = base || ('image_' + (++counter) + '.png');
        name = name.replace(/[^\w.\-а-яА-ЯёЁ]+/gi, '_');
        if (!/\.(png|jpe?g|gif|webp|svg)$/i.test(name)) name += '.png';
        let candidate = name;
        let i = 1;
        while (usedNames[candidate.toLowerCase()]) {
            const m = name.match(/^(.*)(\.[^.]+)$/);
            candidate = m ? (m[1] + '_' + i + m[2]) : (name + '_' + i);
            i++;
        }
        usedNames[candidate.toLowerCase()] = true;
        return candidate;
    }

    function dataUrlToBlob(dataUrl) {
        try {
            const parts = dataUrl.split(',');
            const meta = parts[0] || '';
            const b64 = parts[1] || '';
            const mimeMatch = meta.match(/data:([^;]+)/);
            const mime = (mimeMatch && mimeMatch[1]) || 'image/png';
            const bin = atob(b64);
            const arr = new Uint8Array(bin.length);
            for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
            return new Blob([arr], { type: mime });
        } catch (e) {
            return null;
        }
    }

    const rewritten = html.replace(
        /<img\b([^>]*?)src\s*=\s*(["'])(.*?)\2([^>]*)>/gi,
        function(full, before, quote, src, after) {
            const attrs = (before || '') + (after || '');
            let filename = null;
            const fnMatch = attrs.match(/data-export-filename\s*=\s*(["'])(.*?)\1/i);
            if (fnMatch) filename = fnMatch[2];

            if (/^data:image\//i.test(src)) {
                const blob = dataUrlToBlob(src);
                if (!blob) return full;
                // расширение из MIME, если имени нет
                if (!filename) {
                    const mimeMatch = (src.split(',')[0] || '').match(/data:image\/([\w+]+)/i);
                    let ext = (mimeMatch && mimeMatch[1] || 'png').toLowerCase().replace('jpeg', 'jpg');
                    if (ext === 'svg+xml') ext = 'svg';
                    filename = 'image_' + (++counter) + '.' + ext;
                }
                const name = uniqueName(filename);
                files.push({ path: 'images/' + name, blob: blob });
                let cleanBefore = (before || '').replace(/\s*data-export-filename\s*=\s*(["'])(.*?)\1/gi, '');
                let cleanAfter = (after || '').replace(/\s*data-export-filename\s*=\s*(["'])(.*?)\1/gi, '');
                return '<img' + cleanBefore + 'src=' + quote + 'images/' + name + quote + cleanAfter + '>';
            }

            if (/^blob:/i.test(src)) {
                return full;
            }

            // Внешние URL — оставляем, чистим служебный атрибут
            let cleanBefore = (before || '').replace(/\s*data-export-filename\s*=\s*(["'])(.*?)\1/gi, '');
            let cleanAfter = (after || '').replace(/\s*data-export-filename\s*=\s*(["'])(.*?)\1/gi, '');
            if (cleanBefore !== before || cleanAfter !== after) {
                return '<img' + cleanBefore + 'src=' + quote + src + quote + cleanAfter + '>';
            }
            return full;
        }
    );

    return { html: rewritten, files: files };
}

function downloadExportedZip() {
    if (typeof JSZip === 'undefined') {
        showNotification('JSZip не загружен', 'error');
        return;
    }

    const selectedOnly = document.getElementById('export-selected-only') && document.getElementById('export-selected-only').checked;
    const fullDoc = document.getElementById('export-full-document') && document.getElementById('export-full-document').checked;
    const titleEl = document.getElementById('export-title');
    const title = titleEl ? titleEl.value.trim() || 'Статья' : 'Статья';
    let styleMode = getExportStyleMode();

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
    if (fullDoc) {
        htmlContent = buildExportDocument(bodyHtml, title, styleMode === 'external' ? 'external' : (styleMode === 'none' ? 'none' : 'inline'));
    } else if (styleMode === 'inline') {
        htmlContent = '<style>\n' + getExportArticleCss() + '\n</style>\n' + bodyHtml;
    } else {
        htmlContent = bodyHtml;
    }

    const extracted = extractImagesForZip(htmlContent);
    const zip = new JSZip();
    zip.file(baseName + '.html', extracted.html);

    if (styleMode === 'external') {
        zip.file('article.css', getExportArticleCss());
    }

    extracted.files.forEach(function(f) {
        zip.file(f.path, f.blob);
    });

    zip.generateAsync({ type: 'blob' }).then(function(blob) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = baseName + '.zip';
        document.body.appendChild(a);
        a.click();
        setTimeout(function() {
            URL.revokeObjectURL(url);
            a.remove();
        }, 1500);
        const imgCount = extracted.files.length;
        showNotification(
            'Скачан ' + baseName + '.zip' + (imgCount ? ' (' + imgCount + ' изобр.)' : ''),
            'success'
        );
    }).catch(function(err) {
        console.error(err);
        showNotification('Ошибка создания ZIP', 'error');
    });
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


// Экспорт в глобальную область (переходный период)
window.getExportStyleMode = getExportStyleMode;
window.getExportArticleCss = getExportArticleCss;
window.buildExportDocument = buildExportDocument;
window.downloadBlobFile = downloadBlobFile;
window.getCleanHTMLFromClone = getCleanHTMLFromClone;
window.buildCleanExportHTML = buildCleanExportHTML;
window.refreshExportPreview = refreshExportPreview;
window.downloadExportedHtml = downloadExportedHtml;
window.exportHTML = exportHTML;
window.convertCssVarsToValues = convertCssVarsToValues;
