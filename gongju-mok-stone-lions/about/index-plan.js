(() => {
  const features = {
    mane: ['갈기', '정수리와 목 뒤', 'scan-feature-mane-color-20261030.webp'],
    whiskers: ['수염', '입 주변', 'scan-feature-whiskers-color-20261030.webp'],
    pattern: ['등무늬', '목 뒤와 등', 'scan-feature-pattern-color-20261030.webp'],
    face: ['이목구비', '얼굴 전체', 'scan-feature-face-color-20261030.webp'],
    eyes: ['눈매', '눈 주변', 'scan-feature-eyes-color-20261030.webp']
  };
  const detail = document.querySelector('[data-detail-example]');
  const detailImage = detail?.querySelector('img');
  detail?.querySelectorAll('[data-feature]').forEach(button => {
    button.addEventListener('click', () => {
      const [name, angle, source] = features[button.dataset.feature];
      detailImage.src = `./assets/${source}`;
      detailImage.alt = `두 석사자의 ${name} 비교. 왼쪽 수사자, 오른쪽 암사자.`;
      detail.querySelector('.plan-detail-caption').textContent = `${name} · ${angle}`;
      detail.querySelectorAll('[data-feature]').forEach(control => control.setAttribute('aria-pressed', String(control === button)));
    });
  });
  const surface = document.querySelector('[data-surface-example]');
  surface?.querySelectorAll('[data-surface]').forEach(button => {
    button.addEventListener('click', () => {
      const mode = button.dataset.surface;
      const image = surface.querySelector('img');
      image.src = `./assets/scan-feature-pattern-${mode}-20261030.webp`;
      image.alt = `${mode === 'color' ? '컬러로' : '무채색으로'} 본 두 석사자의 등무늬. 왼쪽 수사자, 오른쪽 암사자.`;
      surface.querySelectorAll('[data-surface]').forEach(control => control.setAttribute('aria-pressed', String(control === button)));
    });
  });
})();
