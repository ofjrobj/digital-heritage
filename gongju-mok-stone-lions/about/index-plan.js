import {measurements, overallMeasurements, originalNotation} from '../archive/measurements.js?v=requested-fixes-20261028-v11';

const features = {
  mane: ['갈기', '정수리와 목 뒤', 0, 450],
  whiskers: ['수염', '입 주변', 1, 330],
  pattern: ['등무늬', '목 뒤와 등', 2, 780],
  face: ['이목구비', '얼굴 전체', 3, 620],
  eyes: ['눈매', '눈 주변', 4, 230]
};
const detail = document.querySelector('[data-detail-example]');
const detailImage = detail?.querySelector('img');
const info = document.querySelector('.plan-info-example');
let selected = 'mane';

function updateMeasurements(key) {
  if (!info) return;
  const feature = key ? features[key] : null;
  const rows = feature ? measurements[feature[2]].rows : overallMeasurements;
  info.querySelector('.plan-info-caption').textContent = `${feature ? feature[0] : '전체 크기'} 측정 기록`;
  info.querySelectorAll('details[data-sex]').forEach(panel => {
    const sex = panel.dataset.sex;
    const column = sex === 'male' ? 2 : 1;
    const list = panel.querySelector('dl');
    list.replaceChildren();
    rows.forEach(row => {
      if (row[column] == null) return;
      const item = document.createElement('div');
      const label = document.createElement('dt');
      const value = document.createElement('dd');
      label.textContent = row[0];
      value.textContent = row[column];
      if (originalNotation[sex].includes(row[0])) {
        const note = document.createElement('small');
        note.textContent = ' (원문 표기)';
        value.append(note);
      }
      item.append(label, value);
      list.append(item);
    });
  });
}

detail?.querySelectorAll('[data-feature]').forEach(button => {
  button.addEventListener('click', () => {
    selected = selected === button.dataset.feature ? null : button.dataset.feature;
    const feature = selected ? features[selected] : null;
    detailImage.src = `./assets/scan-feature-${selected || 'overview'}-color-20261030.webp`;
    detailImage.height = feature ? feature[3] : 600;
    detailImage.alt = `두 석사자의 ${feature ? feature[0] : '전체 형태'} 비교. 왼쪽 수사자, 오른쪽 암사자.`;
    detail.querySelector('.plan-detail-caption').textContent = feature ? `${feature[0]} · ${feature[1]}` : '전체 모습';
    detail.querySelectorAll('[data-feature]').forEach(control => control.setAttribute('aria-pressed', String(control.dataset.feature === selected)));
    updateMeasurements(selected);
  });
});
updateMeasurements(selected);
