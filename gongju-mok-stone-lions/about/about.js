// Show once on initial entry; returning from the history cache must not replay it.
(() => {
  const notice = document.getElementById('preparation-notice');
  if (!notice) return;

  function hide() {
    notice.hidden = true;
    notice.classList.remove('is-visible');
  }

  notice.hidden = false;
  notice.classList.add('is-visible');
  const timer = setTimeout(hide, 2000);
  window.addEventListener('pagehide', () => {
    clearTimeout(timer);
    hide();
  }, {once: true});
})();
