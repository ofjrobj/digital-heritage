// Full interface previews keep the real interactions, but never play sound or
// hand a wheel gesture to the surrounding About document.
export const uiPreview = new URLSearchParams(location.search).get('preview') === 'ux';

export function previewRoute(value) {
  const url = new URL(value);
  if (uiPreview) url.searchParams.set('preview', 'ux');
  return url.href;
}

if (uiPreview) {
  document.documentElement.dataset.uiPreview = 'true';
  const style = document.createElement('link');
  style.rel = 'stylesheet';
  style.href = new URL('./ui-preview.css?v=requested-fixes-20261028-v7', import.meta.url).href;
  document.head.append(style);
  addEventListener('wheel', event => {
    // Preserve browser zoom. Do not stop propagation: the actual Story and
    // Index controllers still consume the same wheel input inside this frame.
    if (!event.ctrlKey) event.preventDefault();
  }, {passive:false});
}
