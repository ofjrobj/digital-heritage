// Numbering remains on the comparison controls; the caption uses the feature name.
const title = document.querySelector('.archive .detail-card h3');
if (title) {
  const simplify = () => {
    const label = title.textContent.replace(/^\d+\.\s*/, '');
    if (label !== title.textContent) title.textContent = label;
  };
  new MutationObserver(simplify).observe(title, {childList: true, characterData: true, subtree: true});
  simplify();
}
