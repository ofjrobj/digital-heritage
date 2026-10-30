(() => {
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const turnDuration = 850;

  function collect(parent, selector, className) {
    if (!parent) return null;
    const items = [...parent.querySelectorAll(selector)];
    if (!items.length) return null;
    const collection = document.createElement('div');
    collection.className = className;
    items[0].before(collection);
    collection.append(...items);
    return collection;
  }

  function makeBook(book, label, mode) {
    if (!book) return;
    const pages = [...book.children];
    if (pages.length < 2) return;
    const shell = document.createElement('div');
    shell.className = 'asset-book-shell';
    book.before(shell);
    shell.append(book);
    book.classList.add('asset-book', `asset-book--${mode}`);
    book.tabIndex = 0;
    book.setAttribute('role', 'region');
    book.setAttribute('aria-label', `${label} 설정집`);
    pages.forEach(page => page.classList.add('asset-book-page'));

    const controls = document.createElement('nav');
    controls.className = 'asset-book-controls';
    controls.setAttribute('aria-label', `${label} 책장 넘기기`);
    const previous = document.createElement('button');
    const next = document.createElement('button');
    const count = document.createElement('span');
    previous.type = next.type = 'button';
    previous.textContent = '← 이전';
    next.textContent = '다음 →';
    previous.setAttribute('aria-label', `${label} 이전 페이지`);
    next.setAttribute('aria-label', `${label} 다음 페이지`);
    count.className = 'asset-book-count';
    count.setAttribute('aria-live', 'polite');
    count.setAttribute('aria-atomic', 'true');
    controls.append(previous, count, next);
    shell.append(controls);

    let current = 0;
    let turning = false;
    let queued = null;
    let leaf = null;
    let timer = 0;
    let pointerStart = null;
    let ignoreClickUntil = 0;
    let preloadReady = false;

    function warmImages(index) {
      if (!preloadReady) return;
      [index - 1, index, index + 1].forEach(i => {
        pages[i]?.querySelectorAll('img').forEach(img => { img.loading = 'eager'; });
      });
    }

    function updateControls() {
      count.textContent = `${String(current + 1).padStart(2, '0')} / ${String(pages.length).padStart(2, '0')}`;
      previous.disabled = current === 0;
      next.disabled = current === pages.length - 1;
      warmImages(current);
    }

    function finishTurn() {
      clearTimeout(timer);
      leaf?.remove();
      leaf = null;
      book.classList.remove('is-turning', 'is-forward', 'is-backward');
      pages.forEach((page, index) => {
        page.classList.remove('is-under-page', 'is-outgoing');
        page.hidden = index !== current;
        page.inert = index !== current;
        if (index === current) page.removeAttribute('aria-hidden');
        else page.setAttribute('aria-hidden', 'true');
      });
      turning = false;
      updateControls();
      const destination = queued;
      queued = null;
      if (destination !== null && destination !== current) show(destination);
    }

    function replica(page, side) {
      const face = document.createElement('div');
      face.className = `asset-book-face asset-book-face--${side}`;
      const copy = page.cloneNode(true);
      copy.hidden = false;
      copy.removeAttribute('id');
      copy.querySelectorAll('[id]').forEach(node => node.removeAttribute('id'));
      copy.removeAttribute('aria-hidden');
      copy.classList.remove('is-under-page', 'is-outgoing');
      copy.classList.add('asset-book-replica');
      copy.querySelectorAll('img').forEach(img => { img.loading = 'eager'; });
      face.append(copy);
      return face;
    }

    function show(index) {
      if (index < 0 || index >= pages.length) return;
      if (turning) { queued = index === current ? null : index; return; }
      if (index === current) return;
      preloadReady = true;
      const outgoing = pages[current];
      const incoming = pages[index];
      const forward = index > current;
      if (outgoing.contains(document.activeElement)) book.focus({ preventScroll: true });
      current = index;
      updateControls();
      if (reduceMotion.matches) { finishTurn(); return; }
      turning = true;
      incoming.hidden = false;
      incoming.inert = outgoing.inert = true;
      incoming.setAttribute('aria-hidden', 'true');
      outgoing.setAttribute('aria-hidden', 'true');
      outgoing.classList.add('is-outgoing');
      incoming.classList.add('is-under-page');
      leaf = document.createElement('div');
      leaf.className = 'asset-book-leaf';
      leaf.setAttribute('aria-hidden', 'true');
      leaf.inert = true;
      leaf.append(replica(outgoing, 'front'), replica(incoming, 'back'));
      book.append(leaf);
      book.classList.add(forward ? 'is-forward' : 'is-backward');
      // Let both sides render before the sheet rotates around the spine.
      void leaf.offsetWidth;
      book.classList.add('is-turning');
      leaf.addEventListener('animationend', event => {
        if (event.target === leaf) finishTurn();
      }, { once: true });
      timer = setTimeout(finishTurn, turnDuration + 100);
    }

    previous.addEventListener('click', () => show((queued ?? current) - 1));
    next.addEventListener('click', () => show((queued ?? current) + 1));
    shell.addEventListener('keydown', event => {
      if (event.altKey || event.ctrlKey || event.metaKey) return;
      const destination = {
        ArrowLeft: (queued ?? current) - 1,
        ArrowRight: (queued ?? current) + 1,
        Home: 0,
        End: pages.length - 1,
      }[event.key];
      if (destination === undefined) return;
      event.preventDefault();
      show(destination);
    });
    book.addEventListener('pointerdown', event => {
      if (!event.isPrimary || event.pointerType === 'mouse') return;
      pointerStart = { id: event.pointerId, x: event.clientX, y: event.clientY };
    });
    book.addEventListener('pointercancel', () => { pointerStart = null; });
    book.addEventListener('pointerup', event => {
      if (!pointerStart || pointerStart.id !== event.pointerId) return;
      const dx = event.clientX - pointerStart.x;
      const dy = event.clientY - pointerStart.y;
      pointerStart = null;
      if (Math.abs(dx) < 45 || Math.abs(dx) < Math.abs(dy) * 1.3) return;
      ignoreClickUntil = performance.now() + 400;
      show((queued ?? current) + (dx < 0 ? 1 : -1));
    });
    book.addEventListener('click', event => {
      if (performance.now() >= ignoreClickUntil) return;
      event.preventDefault();
      event.stopPropagation();
    }, true);
    reduceMotion.addEventListener('change', () => { queued = null; finishTurn(); });
    // Finishing immediately on resize keeps the two sides aligned.
    let width = book.clientWidth;
    if ('ResizeObserver' in window) new ResizeObserver(() => {
      const nextWidth = book.clientWidth;
      if (nextWidth !== width && turning) { queued = null; finishTurn(); }
      width = nextWidth;
    }).observe(book);
    if ('IntersectionObserver' in window) {
      const observer = new IntersectionObserver(entries => {
        if (!entries.some(entry => entry.isIntersecting)) return;
        preloadReady = true;
        warmImages(current);
        observer.disconnect();
      }, { rootMargin: '300px' });
      observer.observe(book);
    }
    finishTurn();
  }

  makeBook(document.querySelector('.cast-collection'), '인물', 'characters');
  makeBook(collect(document.querySelector('#asset-buildings'), ':scope > .architecture-study', 'architecture-collection'), '건축물', 'architecture');
  makeBook(document.querySelector('.architecture-model-grid'), '관아 주변 건물', 'sheets');
  makeBook(collect(document.querySelector('.architecture-houses'), ':scope > .house-study', 'house-collection'), '기와집과 초가', 'houses');
  makeBook(document.querySelector('.resident-grid'), '마을 주민', 'sheets');
  makeBook(document.querySelector('.landscape-collection'), '나무와 동물', 'sheets');
})();
