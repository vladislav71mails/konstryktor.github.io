/**
 * Popup расширения: редактор, база знаний, wiki + индикатор места
 */
(function () {
  function openInTab(path) {
    const url = chrome.runtime.getURL(path);
    chrome.tabs.create({ url: url });
    window.close();
  }

  var editorBtn = document.getElementById('open-editor');
  if (editorBtn) {
    editorBtn.addEventListener('click', function () {
      openInTab('index.html');
    });
  }

  var kbBtn = document.getElementById('open-kb');
  if (kbBtn) {
    kbBtn.addEventListener('click', function () {
      openInTab('kb.html');
    });
  }

  var wikiBtn = document.getElementById('open-wiki');
  if (wikiBtn) {
    wikiBtn.addEventListener('click', function () {
      openInTab('index.html#wiki');
    });
  }

  var newBtn = document.getElementById('open-editor-new');
  if (newBtn) {
    newBtn.addEventListener('click', function () {
      try {
        // сбросить привязку к статье БЗ в session — в контексте popup sessionStorage другой,
        // поэтому передаём query-флаг
        openInTab('index.html?new=1');
      } catch (e) {
        openInTab('index.html');
      }
    });
  }

  function renderStorage() {
    var el = document.getElementById('popup-storage');
    if (!el) return;
    var idb = window.KonstructorIDB;
    if (!idb || typeof idb.getUsageBreakdown !== 'function') {
      el.innerHTML = '<div class="storage-muted">IndexedDB недоступен</div>';
      return;
    }
    idb.ready().then(function () {
      return idb.getUsageBreakdown();
    }).then(function (b) {
      var fb = idb.formatBytes || function (n) { return n + ' Б'; };
      var pct = b.quota > 0 ? Math.min(100, Math.round((b.usage / b.quota) * 1000) / 10) : null;
      var barPct = pct != null ? Math.min(100, pct) : 0;
      var level = pct == null ? '' : (pct >= 90 ? ' critical' : (pct >= 70 ? ' warn' : ''));
      var totalText = pct != null
        ? fb(b.usage) + ' / ' + fb(b.quota) + ' (' + pct + '%)'
        : fb(b.usage || (b.versionsBytes + b.imagesBytes + b.localStorageBytes));

      el.innerHTML =
        '<div class="storage-card-head">' +
        '<span class="storage-card-title">Хранилище</span>' +
        '<span class="storage-card-total' + level + '">' + totalText + '</span>' +
        '</div>' +
        '<div class="storage-bar' + level + '"><div class="storage-bar-fill" style="width:' + barPct + '%"></div></div>' +
        '<ul class="storage-rows">' +
        '<li><span>Версии</span><strong>' + fb(b.versionsBytes) + '</strong></li>' +
        '<li><span>Изображения</span><strong>' + fb(b.imagesBytes) + '</strong></li>' +
        '<li><span>localStorage</span><strong>' + fb(b.localStorageBytes) + '</strong></li>' +
        '</ul>';
    }).catch(function () {
      el.innerHTML = '<div class="storage-muted">Не удалось оценить место</div>';
    });
  }

  renderStorage();
})();
