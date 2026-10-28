// Render the interface immediately; reveal paired scans after both models decode.
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
    // Share the loader's existing per-model status during transfer and decoding.
    // A second overlay label would show alongside its percentage progress.
    const modelLabels = ['male', 'female'].map(side => {
      const label = document.getElementById(`${side}-loading`);
      label.setAttribute('role', 'status');
      label.setAttribute('aria-live', 'polite');
      if (/^OBJECT \d+ LOADING$/.test(label.textContent)) label.textContent = 'Loading...';
      return label;
    });
    const retry = document.createElement('button');
    retry.type = 'button';
    retry.textContent = '다시 불러오기';
    retry.hidden = true;
    retry.addEventListener('click', () => location.reload());
    gate.append(retry);
    document.body.append(gate);
    const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
    root.dataset.archiveUi = 'entering';
    // One-second entrances; retain the last label's .72s stagger before cleanup.
    setTimeout(() => { root.dataset.archiveUi = 'ready'; }, reducedMotion.matches ? 0 : 1720);
    let revealing = false;
    const fail = (delayed, moduleFailed = false) => {
      if (revealing) return;
      root.dataset.archiveState = delayed ? 'delayed' : 'error';
      modelLabels.forEach((label, index) => {
        const loaded = document.getElementById(index === 0 ? 'male-scene' : 'female-scene')?.dataset.loaded;
        if (!delayed && loaded !== 'true' && (loaded === 'error' || moduleFailed)) label.textContent = '3D 자료를 불러오지 못했습니다.';
      });
      retry.hidden = false;
    };
    const reveal = () => {
      if (revealing) return;
      revealing = true;
      clearTimeout(slowTimer);
      requestAnimationFrame(() => requestAnimationFrame(() => {
        root.dataset.archiveState = 'positioning';
        gate.setAttribute('aria-hidden', 'true');
        setTimeout(() => {
          root.dataset.archiveState = 'revealing';
          archive.setAttribute('aria-busy', 'false');
          setTimeout(() => {
            root.dataset.archiveState = 'ready';
            gate.remove();
            observer.disconnect();
          }, reducedMotion.matches ? 0 : 1700);
        }, 0);
      }));
    };
    const inspect = () => {
      const male = document.getElementById('male-scene');
      const female = document.getElementById('female-scene');
      modelLabels[0].hidden = male?.dataset.loaded === 'true';
      modelLabels[1].hidden = female?.dataset.loaded === 'true';
      if (male?.dataset.loaded === 'true' && female?.dataset.loaded === 'true') reveal();
      else if (male?.dataset.loaded === 'error' || female?.dataset.loaded === 'error') fail(false);
    };
    const observer = new MutationObserver(inspect);
    observer.observe(archive, { subtree: true, attributes: true, attributeFilter: ['data-loaded'] });
    const slowTimer = setTimeout(() => fail(true), 45000);
    addEventListener('error', event => {
      if (/\/archive\/app\.js(?:[?#]|$)/.test(String(event.filename || event.target?.src || ''))) fail(false, true);
    }, true);
    inspect();
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', begin, { once: true });
  else begin();
})();
