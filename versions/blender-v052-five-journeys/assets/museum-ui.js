const emit=name=>document.dispatchEvent(new CustomEvent(name));
const nav=document.createElement('nav');nav.id='storyIndexBar';nav.setAttribute('aria-label','Story와 Index 전환');
nav.innerHTML='<button id="navStory" aria-current="page">Story</button><button id="navIndex">Index</button>';
document.body.append(nav);
function enter(){if(document.body.classList.contains('choosing-experience'))document.querySelector('[data-experience="desktop"]').click();}
function story(){enter();if(document.body.classList.contains('archive-active'))emit('archive-story');}
function index(){enter();emit('archive-open');}
function selected(archive){nav.querySelector('#navStory').setAttribute('aria-current',archive?'false':'page');nav.querySelector('#navIndex').setAttribute('aria-current',archive?'page':'false');}
nav.querySelector('#navStory').onclick=story;nav.querySelector('#navIndex').onclick=index;
document.addEventListener('archive-open',()=>selected(true));document.addEventListener('archive-story',()=>selected(false));
