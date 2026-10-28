(() => {
 const bootstrap = document.currentScript || document.querySelector('script[src*="public-routes.js"],script[src*="fullscreen.js"]');
 const stylesheet = new URL('fullscreen.css?v=fullscreen-entry-20261028', bootstrap?.src || new URL('assets/fullscreen.js?v=requested-fixes-20261028-v7', document.baseURI));
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
  // Entry-only expansion remains available through loading and Enter. Once the
  // story has moved, returning to its first frame must not bring the icon back.
  const view = doc.defaultView;
  const offered = !!hostDoc.fullscreenEnabled && doc.body?.dataset.mediaProfile === 'selected-higgsfield';
  let journeyConsumed = doc.body?.dataset.journeyStarted === 'true';
  let desiredVisible = null, hideTimer = 0, showFrame = 0;
  const active = () => !!hostDoc.fullscreenElement && (hostDoc.fullscreenElement === host || hostDoc.fullscreenElement.contains(host));
  const hideCompletely = () => {
   button.hidden = true; button.inert = true; button.setAttribute('aria-hidden', 'true');
  };
  const setVisible = visible => {
   if (visible === desiredVisible) return;
   const firstSync = desiredVisible === null;
   desiredVisible = visible;
   view.clearTimeout(hideTimer); view.cancelAnimationFrame(showFrame);
   if (visible) {
    const wasHidden = button.hidden;
    button.hidden = false; button.inert = false; button.removeAttribute('aria-hidden');
    button.dataset.fullscreenVisibility = wasHidden && !firstSync ? 'fading' : 'visible';
    if (wasHidden && !firstSync) showFrame = view.requestAnimationFrame(() => {
     if (desiredVisible) button.dataset.fullscreenVisibility = 'visible';
    });
   } else {
    button.dataset.fullscreenVisibility = 'fading';
    const duration = view.getComputedStyle(button).getPropertyValue('--ui-motion-duration').trim() || '1s';
    const milliseconds = parseFloat(duration) * (duration.endsWith('ms') ? 1 : 1000);
    if (firstSync || view.matchMedia('(prefers-reduced-motion: reduce)').matches) hideCompletely();
    else hideTimer = view.setTimeout(() => { if (!desiredVisible) hideCompletely(); }, Number.isFinite(milliseconds) ? milliseconds : 1000);
   }
  };
  const sync = () => {
   journeyConsumed ||= doc.body?.dataset.journeyStarted === 'true';
   button.setAttribute('aria-label', '전체 화면'); button.setAttribute('aria-pressed', String(active()));
   button.removeAttribute('data-tooltip'); button.removeAttribute('title');
   setVisible(offered && !journeyConsumed && !active());
  };
  const journeyObserver = new view.MutationObserver(sync);
  journeyObserver.observe(doc.body, {attributes:true, attributeFilter:['data-journey-started']});
  // A top-level fullscreen document must not unload during internal navigation.
  // Keep it as a quiet host; only subsequent pages move through the child frame.
  // The normal document URL is restored on exit, so this is not a site-wide router.
  if (doc === hostDoc && host === doc.documentElement && !doc.documentElement.dataset.fullscreenNavigationBound) {
   doc.documentElement.dataset.fullscreenNavigationBound = 'true';
   let navigationFrame = null, currentURL = null;
   const navigationHistoryKey = 'gongjuFullscreenNavigation';
   const previousInert = new Map();
   let previousTitle = doc.title;
   const closeNavigation = () => {
    if (!navigationFrame) return;
    navigationFrame.remove(); navigationFrame = null; currentURL = null;
    for (const [child, inert] of previousInert) child.inert = inert;
    previousInert.clear(); doc.title = previousTitle;
    doc.dispatchEvent(new CustomEvent('fullscreen-navigation-end'));
   };
   const navigate = url => {
    if (!navigationFrame) {
     previousTitle = doc.title;
     doc.dispatchEvent(new CustomEvent('fullscreen-navigation'));
     navigationFrame = doc.createElement('iframe');
     navigationFrame.className = 'fullscreen-navigation'; navigationFrame.dataset.fullscreenHost = 'navigation';
     navigationFrame.title = '봉황동 석사자 전체 화면'; navigationFrame.allowFullscreen = true;
     navigationFrame.allow = 'fullscreen; autoplay';
     navigationFrame.style.cssText = 'position:fixed;inset:0;width:100vw;height:100dvh;max-width:none;max-height:none;border:0;z-index:2147483646;background:#efefed';
     for (const child of doc.body.children) { previousInert.set(child, child.inert); child.inert = true; }
     navigationFrame.addEventListener('load', () => {
      try {
       const next = navigationFrame.contentWindow.location.href;
       if (!next.startsWith(projectRoot.href)) return;
       currentURL = next;
       doc.defaultView.history.replaceState({...doc.defaultView.history.state, [navigationHistoryKey]: next}, '', next);
       doc.title = navigationFrame.contentDocument.title || previousTitle;
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
    if (link.hasAttribute('data-story-index-transition')) return;
    const url = new URL(link.href, doc.baseURI);
    if (!url.href.startsWith(projectRoot.href) || url.pathname === doc.location.pathname && url.search === doc.location.search) return;
    event.preventDefault(); event.stopImmediatePropagation(); navigate(url);
   }, true);
   doc.addEventListener('fullscreen-navigation-request', event => {
    if (!active() || !event.detail?.href) return;
    let url;
    try { url = new URL(event.detail.href, doc.baseURI); } catch { return; }
    if (!url.href.startsWith(projectRoot.href)) return;
    event.preventDefault(); navigate(url);
   });
   view.addEventListener('popstate', event => {
    const href = event.state?.[navigationHistoryKey];
    if (typeof href === 'string' && href.startsWith(projectRoot.href)) {
     if (active()) navigate(new URL(href));
     else view.location.replace(href);
    } else closeNavigation();
   });
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
   if (!offered || journeyConsumed || active() || !desiredVisible) return;
   try {
    await host.requestFullscreen();
    sync();
   } catch (error) { console.warn('전체 화면을 사용할 수 없습니다.', error); }
  });
  hostDoc.addEventListener('fullscreenchange', sync);
  view.addEventListener('pagehide', () => {
   hostDoc.removeEventListener('fullscreenchange', sync); journeyObserver.disconnect();
   view.clearTimeout(hideTimer); view.cancelAnimationFrame(showFrame);
  }, {once:true});
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
