// Display-only white balance: identical on every still/video frame.
// UI, linework, geometry and original media files are not modified.
const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');
svg.setAttribute('aria-hidden','true');
svg.setAttribute('width','0');svg.setAttribute('height','0');
svg.style.cssText='position:absolute;pointer-events:none;overflow:hidden';
svg.innerHTML='<defs><filter id="inkPaperTone" color-interpolation-filters="sRGB"><feColorMatrix type="matrix" values=".97 0 0 0 0  0 .995 0 0 0  0 0 1.095 0 0  0 0 0 1 0"/><feColorMatrix type="saturate" values=".94"/></filter></defs>';
document.body.append(svg);
