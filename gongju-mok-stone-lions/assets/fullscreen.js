const fullscreenButton = document.getElementById('fullscreenToggle');
if (fullscreenButton) {
 if (!document.fullscreenEnabled) fullscreenButton.hidden = true;
 const syncFullscreenButton = () => {
  const active = !!document.fullscreenElement;
  const label = active ? '전체 화면 종료' : '전체 화면';
  fullscreenButton.setAttribute('aria-label', label);
  fullscreenButton.setAttribute('aria-pressed', String(active));
  fullscreenButton.title = label;
 };
 fullscreenButton.addEventListener('click', async () => {
  try {
   if (document.fullscreenElement) await document.exitFullscreen();
   else await document.documentElement.requestFullscreen();
   syncFullscreenButton();
  } catch (error) { console.warn('전체 화면을 사용할 수 없습니다.', error); }
 });
 document.addEventListener('fullscreenchange', syncFullscreenButton);
 document.addEventListener('keydown', event => {
  if (event.key !== 'Escape' || !document.fullscreenElement) return;
  document.exitFullscreen().catch(() => {});
 });
 syncFullscreenButton();
}
