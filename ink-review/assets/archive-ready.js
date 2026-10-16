// Reveal the paired scan archive together after both decoded models are ready.
// Loaded in the head so one model cannot flash before the other appears.
(() => {
  const root = document.documentElement;
  root.dataset.archiveState = 'loading';
  const begin = () => {
    const archive = document.querySelector('.archive');
    if (!archive) { delete root.dataset.archiveState; return; }
    archive.setAttribute('aria-busy', 'true');
    const gate = document.createElement('div');
    gate.className = 'archive-ready-status';
    gate.setAttribute('role', 'status');
    gate.setAttribute('aria-live', 'polite');
    const label = document.createElement('p');
    label.textContent = 'Loading...';
    const retry = document.createElement('button');
    retry.type = 'button';
    retry.textContent = '다시 불러오기';
    retry.hidden = true;
    retry.addEventListener('click', () => location.reload());
    gate.append(label, retry);
    document.body.append(gate);
    const started = performance.now();
    let revealing = false, revealTimer = 0;
    const fail = delayed => {
      if (revealing) return;
      root.dataset.archiveState = delayed ? 'delayed' : 'error';
      label.textContent = delayed ? '석사자 자료를 불러오고 있습니다.' : '석사자 자료를 불러오지 못했습니다.';
      retry.hidden = false;
    };
    const reveal = () => {
      if (revealing) return;
      revealing = true;
      clearTimeout(slowTimer);
      const delay = Math.max(0, 500 - (performance.now() - started));
      revealTimer = setTimeout(() => requestAnimationFrame(() => requestAnimationFrame(() => {
        root.dataset.archiveState = 'revealing';
        archive.setAttribute('aria-busy', 'false');
        gate.setAttribute('aria-hidden', 'true');
        setTimeout(() => {
          root.dataset.archiveState = 'ready';
          gate.remove();
          observer.disconnect();
        }, 1000);
      })), delay);
    };
    const inspect = () => {
      const male = document.getElementById('male-scene');
      const female = document.getElementById('female-scene');
      if (male?.dataset.loaded === 'true' && female?.dataset.loaded === 'true') reveal();
      else if (male?.dataset.loaded === 'error' || female?.dataset.loaded === 'error') fail(false);
    };
    const observer = new MutationObserver(inspect);
    observer.observe(archive, { subtree: true, attributes: true, attributeFilter: ['data-loaded'] });
    const slowTimer = setTimeout(() => fail(true), 45000);
    addEventListener('error', event => {
      if (String(event.filename || event.target?.src || '').includes('/archive/app.js')) fail(false);
    }, true);
    inspect();
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', begin, { once: true });
  else begin();
})();
