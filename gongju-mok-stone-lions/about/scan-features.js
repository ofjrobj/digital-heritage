// Each comparison uses the same scan geometry and camera in both surface modes.
document.querySelectorAll('.scan-feature-controls').forEach(group => {
  const figure = group.closest('figure');
  const image = figure.querySelector('img');
  const buttons = [...group.querySelectorAll('button[data-scan-mode]')];
  const baseAlt = image.alt.replace(/ (컬러|무채색)\.$/, '');
  let request = 0;
  const status = document.createElement('p');
  status.className = 'scan-feature-status'; status.setAttribute('role', 'status'); status.hidden = true;
  figure.append(status);
  buttons.forEach(button => button.addEventListener('click', async () => {
    const token = ++request;
    const mode = button.dataset.scanMode;
    const source = image.dataset[mode];
    const candidate = new Image(); candidate.src = source;
    group.setAttribute('aria-busy', 'true');
    try {
      await candidate.decode();
      if (token !== request) return;
      image.src = source;
      image.alt = `${baseAlt} ${mode === 'color' ? '컬러' : '무채색'}.`;
      buttons.forEach(item => item.setAttribute('aria-pressed', String(item === button)));
      figure.dataset.surfaceMode = mode;
      status.hidden = true;
    } catch {
      if (token !== request) return;
      status.textContent = '이미지를 불러오지 못했습니다. 다시 눌러 주세요.'; status.hidden = false;
    } finally {
      if (token === request) group.removeAttribute('aria-busy');
    }
  }));
});
