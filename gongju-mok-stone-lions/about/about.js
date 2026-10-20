// Numbered navigation follows the production stages without opening a new page.
(() => {
  const tabs = [...document.querySelectorAll('.timeline-tabs [role="tab"]')];
  const panels = [...document.querySelectorAll('.process-timeline')];
  const steps = [...document.querySelectorAll('.production-list > li[id]')];
  if (!tabs.length || !steps.length) return;

  function select(tab, focus = false) {
    tabs.forEach(item => {
      const selected = item === tab;
      item.setAttribute('aria-selected', String(selected));
      item.tabIndex = selected ? 0 : -1;
    });
    panels.forEach(panel => { panel.hidden = panel.id !== tab.getAttribute('aria-controls'); });
    if (focus) tab.focus();
  }

  tabs.forEach((tab, index) => {
    tab.addEventListener('click', () => select(tab));
    tab.addEventListener('keydown', event => {
      let next;
      if (event.key === 'ArrowRight') next = (index + 1) % tabs.length;
      if (event.key === 'ArrowLeft') next = (index + tabs.length - 1) % tabs.length;
      if (event.key === 'Home') next = 0;
      if (event.key === 'End') next = tabs.length - 1;
      if (next === undefined) return;
      event.preventDefault();
      select(tabs[next], true);
    });
  });

  const links = [...document.querySelectorAll('.process-timeline a')];
  let selectedStepId;
  function mark(id) {
    selectedStepId = id;
    links.forEach(link => {
      const active = link.getAttribute('href') === '#' + id;
      link.parentElement.classList.toggle('is-current', active);
      if (active) link.setAttribute('aria-current', 'step');
      else link.removeAttribute('aria-current');
    });
  }
  links.forEach(link => link.addEventListener('click', () => mark(link.hash.slice(1))));

  let scheduled = false;
  function update() {
    scheduled = false;
    const threshold = Math.min(220, window.innerHeight * .3);
    const visible = steps.filter(step => {
      const rect = step.getBoundingClientRect();
      return rect.bottom > 0 && rect.top < window.innerHeight;
    });
    const current = visible.find(step => step.getBoundingClientRect().bottom > threshold);
    if (current) {
      const rowTop = current.getBoundingClientRect().top;
      const selectedInRow = visible.find(step => step.id === selectedStepId &&
        Math.abs(step.getBoundingClientRect().top - rowTop) < 2);
      mark((selectedInRow || current).id);
    }
  }
  window.addEventListener('scroll', () => {
    if (!scheduled) { scheduled = true; requestAnimationFrame(update); }
  }, {passive: true});
  const hashed = steps.find(step => '#' + step.id === window.location.hash);
  if (hashed) select(tabs.find(tab => tab.id === 'timeline-tab-' + hashed.dataset.productionTrack));
  update();
})();

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
  const timer = setTimeout(hide, 5800);
  window.addEventListener('pagehide', () => {
    clearTimeout(timer);
    hide();
  }, {once: true});
})();
