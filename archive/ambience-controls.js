import './assets/archive-ambience.js';
const b=document.querySelector('#soundToggle');b.onclick=()=>{const on=b.getAttribute('aria-pressed')!=='true';b.setAttribute('aria-pressed',String(on));b.setAttribute('aria-label',on?'공간 소리 끄기':'공간 소리 켜기');document.dispatchEvent(new CustomEvent('archive-open'));};
