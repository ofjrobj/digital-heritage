// Keep each original link usable when scripts are unavailable.
document.querySelectorAll('a.prompt-link').forEach((link, index) => {
  const source = new URL(link.href);
  if (source.hostname !== 'www.figma.com' || !source.pathname.startsWith('/board/')) return;

  const label = link.textContent.trim();
  const defaultOpen = link.hasAttribute('data-default-open');
  const id = `prompt-embed-${index + 1}`;
  const embed = new URL(source);
  embed.hostname = 'embed.figma.com';
  embed.searchParams.set('embed-host', 'gongju-mok-stone-lions');

  const container = document.createElement('div');
  container.className = 'prompt-embed';
  const toggle = document.createElement('button');
  toggle.type = 'button';
  toggle.className = 'prompt-link prompt-embed-toggle';
  toggle.id = `${id}-toggle`;
  toggle.setAttribute('aria-expanded', 'false');
  toggle.setAttribute('aria-controls', id);
  toggle.append(document.createTextNode(label));
  const chevron = document.createElement('span');
  chevron.className = 'prompt-embed-chevron';
  chevron.setAttribute('aria-hidden', 'true');
  toggle.append(chevron);

  const panel = document.createElement('div');
  panel.className = 'prompt-embed-panel';
  panel.id = id;
  panel.setAttribute('role', 'region');
  panel.setAttribute('aria-labelledby', toggle.id);
  panel.setAttribute('aria-hidden', 'true');
  panel.inert = true;
  const inner = document.createElement('div');
  inner.className = 'prompt-embed-inner';
  const toolbar = document.createElement('div');
  toolbar.className = 'prompt-embed-toolbar';
  const close = document.createElement('button');
  close.type = 'button';
  close.className = 'prompt-embed-close';
  close.setAttribute('aria-label', `${label} 닫기`);
  close.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18"/></svg>';
  const frame = document.createElement('iframe');
  frame.className = 'prompt-embed-frame';
  frame.title = label;
  frame.loading = 'lazy';
  frame.allowFullscreen = true;

  link.replaceWith(container);
  link.className = 'prompt-embed-original';
  link.textContent = '원문 열기';
  link.setAttribute('aria-label', `${label} 원문 열기 (새 탭)`);
  toolbar.append(link, close);
  inner.append(toolbar, frame);
  panel.append(inner);
  container.append(toggle, panel);

  function setOpen(open, restoreFocus = false) {
    if (open && !frame.hasAttribute('src')) frame.src = embed.href;
    if (!open && (restoreFocus || panel.contains(document.activeElement))) toggle.focus({ preventScroll: true });
    toggle.setAttribute('aria-expanded', String(open));
    panel.setAttribute('aria-hidden', String(!open));
    panel.inert = !open;
    container.classList.toggle('is-open', open);
  }

  toggle.addEventListener('click', () => setOpen(toggle.getAttribute('aria-expanded') !== 'true'));
  close.addEventListener('click', () => setOpen(false, true));
  container.addEventListener('keydown', event => {
    if (event.key !== 'Escape' || toggle.getAttribute('aria-expanded') !== 'true') return;
    event.preventDefault();
    setOpen(false, true);
  });
  if (defaultOpen) setOpen(true);
});
