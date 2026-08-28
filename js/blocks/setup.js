/**
 * blocks/setup.js — Инициализация интерактивных блоков после вставки
 * Зависит от: snapshotEditor (core)
 */

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
            showNotification('Не удалось распознать ссылку. Поддерживаются YouTube и RuTube.', 'error');
            return;
        }
        preview.removeAttribute('data-empty');
        preview.innerHTML = `<iframe class="video-iframe" src="${embed}" title="Видео" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen loading="lazy"></iframe>`;
        showNotification('Видео вставлено', 'success');
        snapshotEditor('video-embed');
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
            showNotification('Откройте настройки блока (⚙) и укажите ссылку на файл', 'info');
        }
    });
}


/**
 * Блок изображения: загрузка файла → data URL + data-export-filename для ZIP
 */
function setupImageBlock(block) {
    if (!block) return;
    if (!block.classList.contains('content-image') && !block.classList.contains('content-image-caption')) return;
    if (block.dataset.imageBound === '1') return;
    block.dataset.imageBound = '1';

    const img = block.querySelector('img.image-element, .image-container img, .image-caption-container img');
    const zone = block.querySelector('.image-upload-zone');
    const uploadBtn = block.querySelector('.image-upload-btn');
    const fileInput = block.querySelector('.image-block-file-input');
    const settingsFile = block.querySelector('.settings-panel .image-file-input');
    const settingsUrl = block.querySelector('.settings-panel .image-url');
    const settingsAlt = block.querySelector('.settings-panel .image-alt');

    function applyFile(file) {
        if (!file || !file.type || !file.type.startsWith('image/')) {
            if (typeof showNotification === 'function') {
                showNotification('Выберите файл изображения', 'warning');
            }
            return;
        }
        const safeName = (file.name || 'image.png').replace(/[^\w.\-а-яА-ЯёЁ]+/gi, '_');
        const reader = new FileReader();
        reader.onload = function() {
            const dataUrl = reader.result;
            if (!img) return;
            img.src = dataUrl;
            img.hidden = false;
            img.removeAttribute('hidden');
            img.setAttribute('data-export-filename', safeName);
            img.alt = safeName.replace(/_/g, ' ').replace(/\.[^.]+$/, '') || 'Изображение';
            if (zone) {
                zone.removeAttribute('data-empty');
                zone.classList.add('has-image');
            }
            if (uploadBtn) uploadBtn.hidden = true;
            const hint = block.querySelector('.image-upload-hint');
            if (hint) hint.hidden = true;
            if (settingsUrl) settingsUrl.value = '';
            if (settingsAlt && !settingsAlt.value) settingsAlt.value = img.alt;
            if (typeof showNotification === 'function') {
                showNotification('Изображение «' + safeName + '» загружено', 'success');
            }
            if (typeof snapshotEditor === 'function') snapshotEditor('image-file-upload');
        };
        reader.readAsDataURL(file);
    }

    function openPicker(inputEl) {
        if (inputEl) {
            inputEl.value = '';
            inputEl.click();
        }
    }

    if (uploadBtn && fileInput) {
        uploadBtn.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            openPicker(fileInput);
        });
        fileInput.addEventListener('change', function() {
            const f = fileInput.files && fileInput.files[0];
            if (f) applyFile(f);
        });
    }

    // Клик по пустой зоне / по картинке (замена)
    if (zone) {
        zone.addEventListener('click', function(e) {
            if (e.target.closest('.image-upload-btn')) return;
            if (e.target.closest('[contenteditable="true"]')) return;
            if (zone.getAttribute('data-empty') === '1' || e.target === img) {
                openPicker(fileInput || settingsFile);
            }
        });
        zone.addEventListener('dragover', function(e) {
            e.preventDefault();
            zone.classList.add('drag-over');
        });
        zone.addEventListener('dragleave', function() {
            zone.classList.remove('drag-over');
        });
        zone.addEventListener('drop', function(e) {
            e.preventDefault();
            zone.classList.remove('drag-over');
            const f = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
            if (f) applyFile(f);
        });
    }

    if (settingsFile) {
        settingsFile.addEventListener('change', function() {
            const f = settingsFile.files && settingsFile.files[0];
            if (f) applyFile(f);
        });
    }

    // Если уже есть валидный src (не placeholder) — скрыть зону загрузки
    if (img && img.getAttribute('src') && !/^https?:\/\/via\.placeholder/i.test(img.getAttribute('src'))) {
        img.hidden = false;
        img.removeAttribute('hidden');
        if (zone) {
            zone.removeAttribute('data-empty');
            zone.classList.add('has-image');
        }
        if (uploadBtn) uploadBtn.hidden = true;
        const hint = block.querySelector('.image-upload-hint');
        if (hint) hint.hidden = true;
    }
}

// Экспорт в глобальную область (переходный период)
window.parseVideoEmbedUrl = parseVideoEmbedUrl;
window.setupVideoBlock = setupVideoBlock;
window.setupDownloadFileBlock = setupDownloadFileBlock;
window.setupImageBlock = setupImageBlock;
