import {UI_MOTION_MS} from './ui-motion.js?v=ui-motion-audit-20261028';

// The ending already preloads this same-origin Index. Reveal its decoded pair
// instead of throwing it away and loading both models again in a new document.
export function waitForArchiveReady(frame, win = window) {
  return new Promise((resolve, reject) => {
    let observer = null, settled = false;
    const finish = (error) => {
      if (settled) return;
      settled = true;
      win.clearTimeout(timer);
      observer?.disconnect();
      frame.removeEventListener('load', inspect);
      error ? reject(error) : resolve();
    };
    const inspect = () => {
      try {
        const root = frame.contentDocument?.documentElement;
        if (!root) return;
        const state = root.dataset.archiveState;
        if (state === 'ready') { finish(); return; }
        if (state === 'error' || state === 'delayed') { finish(new Error('archive unavailable')); return; }
        observer?.disconnect();
        observer = new win.MutationObserver(inspect);
        observer.observe(root, {attributes: true, attributeFilter: ['data-archive-state']});
      } catch (error) { finish(error); }
    };
    const timer = win.setTimeout(() => finish(new Error('archive preparation timeout')), 12000);
    frame.addEventListener('load', inspect);
    inspect();
  });
}

export function createStoryIndexTransition({link, stage, prepare, getFrame, remember, win = window, doc = document}) {
  const reduced = win.matchMedia('(prefers-reduced-motion: reduce)');
  const historyKey = 'gongjuArchiveOverlay';
  const oldTitle = doc.title;
  const previousInert = new Map();
  let shown = false, busy = false, timer = null;
  const duration = () => reduced.matches ? 0 : UI_MOTION_MS;
  const clearTimer = () => { if (timer !== null) win.clearTimeout(timer); timer = null; };

  function show(recordHistory) {
    const frame = getFrame();
    if (!frame || shown) return;
    clearTimer();
    shown = true;
    busy = false;
    link.removeAttribute('aria-busy');
    doc.body.dataset.archiveTransition = 'entering';
    for (const node of stage.children) {
      if (node === frame) continue;
      previousInert.set(node, node.inert);
      node.inert = true;
    }
    frame.inert = false;
    frame.removeAttribute('aria-hidden');
    if (recordHistory) win.history.pushState({...win.history.state, [historyKey]: true}, '', link.href);
    doc.title = frame.contentDocument?.title || '봉황동 석사자 — 3D 아카이브';
    timer = win.setTimeout(() => {
      timer = null;
      doc.body.dataset.archiveTransition = 'open';
      frame.focus({preventScroll: true});
    }, duration());
  }

  function hide() {
    const frame = getFrame();
    if (!frame || !shown) return;
    clearTimer();
    shown = false;
    doc.title = oldTitle;
    doc.body.dataset.archiveTransition = 'leaving';
    frame.inert = true;
    frame.setAttribute('aria-hidden', 'true');
    for (const [node, inert] of previousInert) node.inert = inert;
    previousInert.clear();
    link.focus({preventScroll: true});
    timer = win.setTimeout(() => {
      timer = null;
      delete doc.body.dataset.archiveTransition;
    }, duration());
  }

  link.addEventListener('click', async event => {
    if (event.defaultPrevented || event.button > 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    if (busy || shown) return;
    remember();
    prepare();
    const frame = getFrame();
    if (!frame) { win.location.assign(link.href); return; }
    busy = true;
    link.setAttribute('aria-busy', 'true');
    doc.body.dataset.archiveTransition = 'waiting';
    try {
      await waitForArchiveReady(frame, win);
      show(true);
    } catch {
      // The normal link remains the recovery path if the preloaded document fails.
      busy = false;
      link.removeAttribute('aria-busy');
      doc.body.dataset.archiveTransition = 'fallback';
      clearTimer();
      timer = win.setTimeout(() => win.location.assign(link.href), duration());
    }
  });
  win.addEventListener('popstate', event => {
    if (event.state?.[historyKey]) show(false);
    else hide();
  });
  return {visible: () => shown};
}
