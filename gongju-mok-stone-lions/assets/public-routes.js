// Public navigation shares the existing story/scan assets.
// Derive the deployment prefix from this module so project Pages and local previews work.
import './fullscreen.js?v=fullscreen-entry-20261028';
import {previewRoute} from './ui-preview.js?v=requested-fixes-20261028-v7';
const nativePage=new URLSearchParams(location.search).get('native');
const nativeReturn=['blender-test','play','review'].includes(nativePage);
const storyURL = previewRoute(new URL(nativeReturn?'../blender-test/?start=intro':'../?start=intro', import.meta.url).href);
const storyReturnURL = new URL(storyURL);
storyReturnURL.searchParams.set('start','main');
const archiveURL = previewRoute(new URL('../archive/'+(nativeReturn?'?native=blender-test':''),import.meta.url).href);
const setLink = (element, href) => {
  if (element && element.href !== href) element.href = href;
};
function syncNavigation() {
  document.querySelectorAll('#storyLink').forEach(link => setLink(link, storyURL));
  document.querySelectorAll('[data-story-return]').forEach(link => setLink(link, storyReturnURL.href));
  document.querySelectorAll('#indexLink, .tr-archive-cta').forEach(link => setLink(link, archiveURL));
  document.querySelectorAll('#archiveStoryIndexBar [aria-current="page"], .archive .wordmark').forEach(link => setLink(link, archiveURL + '#top'));
}
syncNavigation();
// An Index return opens the first Story screen without repeating the invitation.
const navigationObserver = new MutationObserver(syncNavigation);
for (const nav of document.querySelectorAll('#storyIndexBar, #archiveStoryIndexBar')) {
  navigationObserver.observe(nav, { attributes: true, attributeFilter: ['href'], subtree: true });
}
// The story creates its ending CTA after the initial markup is parsed.
const stage = document.getElementById('stage');
if (stage) new MutationObserver(syncNavigation).observe(stage, { childList: true });
