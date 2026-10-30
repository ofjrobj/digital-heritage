(() => {
  // One live archive at a time: each owns two WebGL viewers.
  let active = null;
  const previews = document.querySelectorAll('.plan-preview');

  function stop({ restoreFocus = false } = {}) {
    if (!active) return;
    const { card, frame, timer, deadline, start, finish, cover, status } = active;
    clearInterval(timer);
    clearTimeout(deadline);
    frame.remove();
    card.dataset.state = 'idle';
    card.removeAttribute('aria-busy');
    cover.hidden = false;
    start.hidden = false;
    start.textContent = '직접 조작하기';
    start.setAttribute('aria-expanded', 'false');
    finish.hidden = true;
    status.textContent = '기능 미리보기';
    active = null;
    if (restoreFocus) start.focus({ preventScroll: true });
  }

  function setPreset(doc, preset) {
    const select = point => {
      const button = doc.querySelector(`.hotspot[data-point="${point}"]`);
      if (!button) throw new Error('Missing observation control');
      if (doc.documentElement.dataset.archivePoint !== point) button.click();
    };
    if (preset === 'detail' || preset === 'info') select('01');
    if (preset === 'surface') {
      select('03');
      const button = doc.querySelector('.surface-toggle');
      if (!button) throw new Error('Missing surface control');
      // This is the archive's own material toggle, including its transition.
      for (let i = 0; i < 3 && button.dataset.mode !== 'relief'; i++) button.click();
      if (button.dataset.mode !== 'relief') throw new Error('Surface preset unavailable');
    }
    if (preset === 'info') {
      const button = doc.querySelector('.right-panel .panel-toggle');
      if (!button) throw new Error('Missing information control');
      if (button.getAttribute('aria-expanded') !== 'true') button.click();
    }
    // Keep header links from replacing the demonstration with another page.
    doc.querySelectorAll('a[href]').forEach(link => {
      link.setAttribute('tabindex', '-1');
      link.setAttribute('aria-disabled', 'true');
    });
    doc.addEventListener('click', event => {
      if (event.target.closest?.('a[href]')) event.preventDefault();
    }, true);
  }

  function open(card) {
    stop();
    const start = card.querySelector('.plan-preview-start');
    const finish = card.querySelector('.plan-preview-finish');
    const cover = card.querySelector('.plan-preview-cover');
    const status = card.querySelector('.plan-preview-status');
    const viewport = card.querySelector('.plan-preview-window');
    const frame = document.createElement('iframe');
    const session = { card, frame, start, finish, cover, status, timer: null, deadline: null };
    active = session;
    card.dataset.state = 'loading';
    card.setAttribute('aria-busy', 'true');
    start.hidden = true;
    start.setAttribute('aria-expanded', 'true');
    finish.hidden = false;
    finish.focus({ preventScroll: true });
    status.textContent = '3D 모델을 불러오는 중…';
    frame.title = `${card.dataset.previewTitle} 직접 조작`;
    frame.tabIndex = -1;
    frame.setAttribute('aria-hidden', 'true');

    const fail = () => {
      if (active !== session) return;
      clearInterval(session.timer);
      clearTimeout(session.deadline);
      frame.remove();
      card.dataset.state = 'error';
      card.removeAttribute('aria-busy');
      status.textContent = '불러오지 못했습니다. 다시 시도해 주세요.';
      start.textContent = '다시 불러오기';
      start.hidden = false;
      start.setAttribute('aria-expanded', 'false');
    };

    const inspect = () => {
      if (active !== session) return;
      try {
        const doc = frame.contentDocument;
        const state = doc?.documentElement.dataset.archiveState;
        if (state === 'error') { fail(); return; }
        if (state !== 'ready') return;
        setPreset(doc, card.dataset.preview);
        clearInterval(session.timer);
        clearTimeout(session.deadline);
        card.dataset.state = 'ready';
        card.removeAttribute('aria-busy');
        cover.hidden = true;
        frame.removeAttribute('tabindex');
        frame.removeAttribute('aria-hidden');
        status.textContent = '조작 중';
      } catch { fail(); }
    };

    frame.addEventListener('error', fail, { once: true });
    frame.addEventListener('load', inspect);
    frame.src = '../archive/?preview=ux';
    viewport.append(frame);
    session.timer = setInterval(inspect, 250);
    session.deadline = setTimeout(fail, 60000);
  }

  previews.forEach(card => {
    const start = card.querySelector('.plan-preview-start');
    start.hidden = false;
    start.addEventListener('click', () => open(card));
    card.querySelector('.plan-preview-finish').addEventListener('click', () => {
      if (active?.card === card) stop({ restoreFocus: true });
    });
  });
  window.addEventListener('pagehide', () => stop());
})();
