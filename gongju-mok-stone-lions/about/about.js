// Show once per tab session, including when a visitor returns from a detail page.
(() => {
  const notice = document.getElementById('preparation-notice');
  if (!notice) return;
  const seenKey = 'gongju-planning-notice-seen';
  try {
    if (sessionStorage.getItem(seenKey)) return;
    sessionStorage.setItem(seenKey, '1');
  } catch {
    // Storage can be disabled; history navigation must still remain quiet.
    if (performance.getEntriesByType('navigation')[0]?.type === 'back_forward') return;
  }

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

// Reveal a drawing only once, without blocking access when motion is reduced.
(() => {
  if (!('IntersectionObserver' in window) || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const figures = document.querySelectorAll('.material-figure, .research-study, .ux-sketch, .case-study-illustration');
  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('is-visible');
      observer.unobserve(entry.target);
    });
  }, {threshold: 0.08});
  figures.forEach(figure => {
    figure.classList.add('case-study-reveal');
    observer.observe(figure);
  });
})();
