(() => {
 const bootstrap = document.currentScript || document.querySelector('script[src*="public-routes.js?v=requested-fixes-20261028-v7"]');
 const stylesheet = new URL('fullscreen.css?v=requested-fixes-20261028-v7', bootstrap?.src || new URL('assets/fullscreen.js?v=requested-fixes-20261028-v7', document.baseURI));
 const projectRoot = new URL('../', stylesheet);
 const addStyle = doc => {
  if (doc.getElementById('fullscreenControlsStyle')) return;
  const link = doc.createElement('link');
  link.id = 'fullscreenControlsStyle'; link.rel = 'stylesheet'; link.href = stylesheet.href;
  doc.head.append(link);
 };
 // The iframe belongs to the persistent parent document, so it stays fullscreen
 // when navigation replaces the preview's child document.
 const findHost = () => {
  let context = window, element = document.documentElement;
  try {
   while (context.frameElement) {
    const frame = context.frameElement;
    if (frame.matches('.ux-preview, [data-fullscreen-host]') || frame.allowFullscreen) element = frame;
    context = context.parent;
   }
  } catch { /* Cross-origin hosts keep the ordinary document fullscreen path. */ }
  return element;
 };
 const install = (doc, host, preview = false) => {
  let button = doc.getElementById('fullscreenToggle');
  if (!button && !preview && !doc.querySelector('.archive')) return;
  if (!button) {
   button = doc.createElement('button'); button.id = 'fullscreenToggle'; button.type = 'button';
   button.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9V4h5M15 4h5v5M20 15v5h-5M9 20H4v-5" fill="none" stroke="currentColor" stroke-width="1.3"/></svg>';
   doc.body.append(button);
  }
  if (button.dataset.fullscreenBound === 'true') return;
  button.dataset.fullscreenBound = 'true';
  const hostDoc = host.ownerDocument;
  addStyle(doc); addStyle(hostDoc);
  if (!hostDoc.fullscreenEnabled) button.hidden = true;
  const active = () => !!hostDoc.fullscreenElement && (hostDoc.fullscreenElement === host || hostDoc.fullscreenElement.contains(host));
  const sync = () => {
   const label = active() ? '전체 화면 종료' : '전체 화면';
   button.setAttribute('aria-label', label); button.setAttribute('aria-pressed', String(active()));
   button.dataset.tooltip = label; button.removeAttribute('title');
  };
  // A top-level fullscreen document must not unload during internal navigation.
  // Keep it as a quiet host; only subsequent pages move through the child frame.
  // The normal document URL is restored on exit, so this is not a site-wide router.
  if (doc === hostDoc && host === doc.documentElement && !doc.documentElement.dataset.fullscreenNavigationBound) {
   doc.documentElement.dataset.fullscreenNavigationBound = 'true';
   let navigationFrame = null, currentURL = null;
   const navigate = url => {
    if (!navigationFrame) {
     doc.dispatchEvent(new CustomEvent('fullscreen-navigation'));
     navigationFrame = doc.createElement('iframe');
     navigationFrame.className = 'fullscreen-navigation'; navigationFrame.dataset.fullscreenHost = 'navigation';
     navigationFrame.title = '봉황동 석사자 전체 화면'; navigationFrame.allowFullscreen = true;
     navigationFrame.allow = 'fullscreen; autoplay';
     navigationFrame.style.cssText = 'position:fixed;inset:0;width:100vw;height:100dvh;max-width:none;max-height:none;border:0;z-index:2147483646;background:#efefed';
     for (const child of doc.body.children) child.inert = true;
     navigationFrame.addEventListener('load', () => {
      try {
       const next = navigationFrame.contentWindow.location.href;
       if (!next.startsWith(projectRoot.href)) return;
       currentURL = next;
       doc.defaultView.history.replaceState(doc.defaultView.history.state, '', next);
       install(navigationFrame.contentDocument, navigationFrame, true);
       navigationFrame.focus({preventScroll:true});
      } catch { /* Only same-origin project pages are managed by this host. */ }
     });
     doc.body.append(navigationFrame);
    }
    currentURL = url.href; navigationFrame.src = currentURL;
   };
   doc.addEventListener('click', event => {
    const link = event.target.closest?.('a[href]');
    if (!active() || !link || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || link.hasAttribute('download') || link.target === '_blank') return;
    const url = new URL(link.href, doc.baseURI);
    if (!url.href.startsWith(projectRoot.href) || url.pathname === doc.location.pathname && url.search === doc.location.search) return;
    event.preventDefault(); event.stopImmediatePropagation(); navigate(url);
   }, true);
   hostDoc.addEventListener('fullscreenchange', () => {
    if (!hostDoc.fullscreenElement && navigationFrame && currentURL) doc.defaultView.location.replace(currentURL);
   });
  } else if (doc !== hostDoc) {
   // A legacy nested archive return link uses _top. In a fullscreen preview it
   // should replace the host's contents instead of discarding the host itself.
   doc.addEventListener('click', event => {
    const link = event.target.closest?.('a[href]');
    if (!active() || !link || !['_top','_parent'].includes(link.target) || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const url = new URL(link.href, doc.baseURI);
    if (!url.href.startsWith(projectRoot.href)) return;
    event.preventDefault(); event.stopImmediatePropagation(); host.src = url.href;
   }, true);
  }
  button.addEventListener('click', async () => {
   try {
    if (active()) await hostDoc.exitFullscreen();
    else await host.requestFullscreen();
    sync();
   } catch (error) { console.warn('전체 화면을 사용할 수 없습니다.', error); }
  });
  hostDoc.addEventListener('fullscreenchange', sync);
  doc.defaultView.addEventListener('pagehide', () => hostDoc.removeEventListener('fullscreenchange', sync), {once:true});
  sync();
 };
 install(document, findHost());
 for (const frame of document.querySelectorAll('iframe.ux-preview')) {
  if (frame.dataset.fullscreenBound === 'true') continue;
  frame.dataset.fullscreenBound = 'true';
  const connect = () => {
   try { if (frame.contentDocument?.body) install(frame.contentDocument, frame, true); } catch { /* External navigation retains browser Escape. */ }
  };
  frame.addEventListener('load', connect); connect();
 }
})();
