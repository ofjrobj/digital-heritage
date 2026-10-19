// Public navigation shares the existing story/scan assets.
// Derive the deployment prefix from this module so project Pages and local previews work.
const nativePage=new URLSearchParams(location.search).get('native');
const nativeReturn=['play','review'].includes(nativePage);
const storyURL = new URL(nativeReturn?'../../'+nativePage+'.html':'../../gongju-mok/?start=intro', import.meta.url).href;
const archiveURL = new URL('../../gongju-mok/archive/'+(nativeReturn?'?native='+nativePage:''),import.meta.url).href;
const setLink = (element, href) => {
  if (element && element.href !== href) element.href = href;
};
function syncNavigation() {
  document.querySelectorAll('#storyLink, [data-story-return]').forEach(link => setLink(link, storyURL));
  document.querySelectorAll('#indexLink, .tr-archive-cta').forEach(link => setLink(link, archiveURL));
  document.querySelectorAll('#archiveStoryIndexBar [aria-current="page"], .archive .wordmark').forEach(link => setLink(link, archiveURL + '#top'));
}
syncNavigation();
// The shared archive app restores a legacy return path during startup. Keep the
// public link canonical; returning from Index explicitly starts at the intro.
const navigationObserver = new MutationObserver(syncNavigation);
for (const nav of document.querySelectorAll('#storyIndexBar, #archiveStoryIndexBar')) {
  navigationObserver.observe(nav, { attributes: true, attributeFilter: ['href'], subtree: true });
}
// The story creates its ending CTA after the initial markup is parsed.
const stage = document.getElementById('stage');
if (stage) new MutationObserver(syncNavigation).observe(stage, { childList: true });
