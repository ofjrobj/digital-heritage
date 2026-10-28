(() => {
  const book = document.querySelector('.cast-collection');
  if (!book) return;
  const pages = Array.from(book.querySelectorAll('.cast-study'));
  if (pages.length < 2) return;
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const controls = document.createElement('nav');
  controls.className = 'asset-book-controls';
  controls.setAttribute('aria-label', '인물 설정집 페이지');
  const previous = document.createElement('button');
  const next = document.createElement('button');
  const count = document.createElement('span');
  previous.type = next.type = 'button';
  previous.textContent = '← 이전';
  next.textContent = '다음 →';
  previous.setAttribute('aria-label', '이전 인물');
  next.setAttribute('aria-label', '다음 인물');
  count.className = 'asset-book-count';
  count.setAttribute('aria-live', 'polite');
  count.setAttribute('aria-atomic', 'true');
  controls.append(previous, count, next);
  book.before(controls);
  book.classList.add('asset-book');
  book.tabIndex = 0;
  book.setAttribute('role', 'region');
  book.setAttribute('aria-label', '인물 설정집');
  let current = 0;
  let turnTimer = 0;
  let pointerStart = null;
  let ignoreClickUntil = 0;

  function finishTurn() {
    clearTimeout(turnTimer);
    pages.forEach((page, index) => {
      page.classList.remove('is-entering', 'is-leaving');
      page.hidden = index !== current;
      page.inert = index !== current;
      if (index === current) page.removeAttribute('aria-hidden');
      else page.setAttribute('aria-hidden', 'true');
    });
  }

  function updateControls() {
    count.textContent = `${String(current + 1).padStart(2, '0')} / ${String(pages.length).padStart(2, '0')}`;
    previous.disabled = current === 0;
    next.disabled = current === pages.length - 1;
  }

  function show(index) {
    if (index < 0 || index >= pages.length || index === current) return;
    finishTurn();
    const outgoing = pages[current];
    const direction = Math.sign(index - current);
    if (outgoing.contains(document.activeElement)) book.focus({ preventScroll: true });
    current = index;
    updateControls();
    finishTurn();
    if (reducedMotion.matches) return;
    const incoming = pages[current];
    outgoing.hidden = false;
    outgoing.style.setProperty('--page-direction', direction);
    incoming.style.setProperty('--page-direction', direction);
    // Restart the finite transition cleanly when the reader turns pages quickly.
    void book.offsetWidth;
    outgoing.classList.add('is-leaving');
    incoming.classList.add('is-entering');
    turnTimer = setTimeout(finishTurn, 1000);
  }

  previous.addEventListener('click', () => show(current - 1));
  next.addEventListener('click', () => show(current + 1));
  const section = book.closest('.asset-section');
  section.addEventListener('keydown', (event) => {
    if (event.altKey || event.ctrlKey || event.metaKey) return;
    const destination = {
      ArrowLeft: current - 1,
      ArrowRight: current + 1,
      Home: 0,
      End: pages.length - 1,
    }[event.key];
    if (destination === undefined) return;
    event.preventDefault();
    show(destination);
  });
  book.addEventListener('pointerdown', (event) => {
    if (!event.isPrimary || event.pointerType === 'mouse') return;
    pointerStart = { id: event.pointerId, x: event.clientX, y: event.clientY };
  });
  book.addEventListener('pointercancel', () => { pointerStart = null; });
  book.addEventListener('pointerup', (event) => {
    if (!pointerStart || pointerStart.id !== event.pointerId) return;
    const dx = event.clientX - pointerStart.x;
    const dy = event.clientY - pointerStart.y;
    pointerStart = null;
    if (Math.abs(dx) < 45 || Math.abs(dx) < Math.abs(dy) * 1.3) return;
    ignoreClickUntil = performance.now() + 400;
    show(current + (dx < 0 ? 1 : -1));
  });
  book.addEventListener('click', (event) => {
    if (performance.now() >= ignoreClickUntil) return;
    event.preventDefault();
    event.stopPropagation();
  }, true);
  reducedMotion.addEventListener('change', finishTurn);
  updateControls();
  finishTurn();
})();
