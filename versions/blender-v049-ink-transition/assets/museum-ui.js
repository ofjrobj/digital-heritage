const emit=name=>document.dispatchEvent(new CustomEvent(name));
const nav=document.createElement('nav');nav.id='storyIndexBar';nav.setAttribute('aria-label','Story와 Index 전환');
nav.innerHTML='<button id="navStory" aria-current="page">Story</button><button id="navIndex">Index</button>';
const home=document.createElement('a');home.id='museumHome';home.href='./story-complete.html';home.setAttribute('aria-label','처음으로');home.title='처음으로';home.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M3 10 12 3l9 7v11H3Z"/></svg>';
const menuButton=document.createElement('button');menuButton.id='museumMenu';menuButton.textContent='Menu';
const menu=document.createElement('dialog');menu.id='museumMenuDialog';menu.setAttribute('aria-labelledby','museumMenuTitle');menu.innerHTML='<form method="dialog"><button class="museum-close" aria-label="메뉴 닫기">×</button></form><h2 id="museumMenuTitle">Menu</h2><button data-menu="story">Story <span>이야기 이어보기</span></button><button data-menu="index">Index <span>석사자 살펴보기</span></button><button data-menu="sound">소리 <span id="menuSoundState"></span></button><button data-menu="settings">설정</button><button data-menu="about">About <span>전시 소개</span></button>';
document.body.append(nav,home,menuButton,menu);
function enter(){if(document.body.classList.contains('choosing-experience'))document.querySelector('[data-experience="desktop"]').click();}
function story(){enter();if(document.body.classList.contains('archive-active'))emit('archive-story');}
function index(){enter();emit('archive-open');}
function selected(archive){nav.querySelector('#navStory').setAttribute('aria-current',archive?'false':'page');nav.querySelector('#navIndex').setAttribute('aria-current',archive?'page':'false');}
nav.querySelector('#navStory').onclick=story;nav.querySelector('#navIndex').onclick=index;
document.addEventListener('archive-open',()=>selected(true));document.addEventListener('archive-story',()=>selected(false));
function showMenu(){menu.querySelector('#menuSoundState').textContent=document.querySelector('#soundState').textContent;menu.showModal();}
menuButton.onclick=showMenu;document.querySelector('#coverMenu').onclick=showMenu;document.querySelector('#coverAbout').onclick=()=>document.querySelector('#about').showModal();
menu.querySelectorAll('[data-menu]').forEach(b=>b.onclick=()=>{const action=b.dataset.menu;if(action==='sound'){document.querySelector('#soundToggle').click();menu.querySelector('#menuSoundState').textContent=document.querySelector('#soundState').textContent;return;}menu.close();if(action==='story')story();else if(action==='index')index();else if(action==='settings')document.querySelector('#settings').showModal();else document.querySelector('#about').showModal();});
