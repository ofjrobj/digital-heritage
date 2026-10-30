// Matched renders use the Index camera, geometry and surface materials.
document.querySelectorAll('[data-surface-cycle]').forEach(button => {
  const image = document.getElementById(button.getAttribute('aria-controls'));
  if (!image) return;
  const modes = ['color', 'relief', 'normal'];
  const labels = {color: '컬러맵', relief: '흑백맵', normal: '노멀맵'};
  const baseAlt = image.alt.replace(/ (컬러|무채색)\.$/, '').replace(/^(컬러로|무채색으로) 본 /, '');
  const status = document.createElement('span');
  status.className = 'scan-feature-status';
  status.setAttribute('role', 'status');
  status.hidden = true;
  button.parentElement.after(status);
  let request = 0, requested = button.dataset.surfaceCycle;
  button.addEventListener('click', async () => {
    const token = ++request;
    requested = modes[(modes.indexOf(requested) + 1) % modes.length];
    const mode = requested;
    const candidate = new Image();
    candidate.src = image.dataset[mode];
    button.setAttribute('aria-busy', 'true');
    try {
      await candidate.decode();
      if (token !== request) return;
      image.src = candidate.src;
      image.alt = `${baseAlt} ${labels[mode]}.`;
      button.dataset.surfaceCycle = mode;
      button.dataset.tooltip = labels[mode];
      button.setAttribute('aria-label', `현재 ${labels[mode]}. ${labels[modes[(modes.indexOf(mode) + 1) % modes.length]]}으로 전환`);
      button.querySelectorAll('[data-mode]').forEach(path => path.classList.toggle('is-selected', path.dataset.mode === mode));
      image.closest('figure')?.setAttribute('data-surface-mode', mode);
      status.hidden = true;
    } catch {
      if (token !== request) return;
      requested = button.dataset.surfaceCycle;
      status.textContent = '이미지를 불러오지 못했습니다. 다시 눌러 주세요.';
      status.hidden = false;
    } finally {
      if (token === request) button.removeAttribute('aria-busy');
    }
  });
});
