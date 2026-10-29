/**
 * Popup расширения: открыть редактор или Wiki во вкладке chrome-extension://
 */
(function () {
  function openInTab(path) {
    const url = chrome.runtime.getURL(path);
    chrome.tabs.create({ url: url });
    window.close();
  }

  document.getElementById('open-editor').addEventListener('click', function () {
    openInTab('index.html');
  });

  document.getElementById('open-wiki').addEventListener('click', function () {
    // Открываем редактор; Wiki — модалка внутри index.html
    openInTab('index.html#wiki');
  });
})();
