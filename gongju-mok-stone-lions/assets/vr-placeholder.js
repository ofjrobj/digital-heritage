const button=document.getElementById('projectVr');
const notice=document.getElementById('vrNotice');
const menu=document.getElementById('projectMenu');
const toggle=document.getElementById('projectMenuToggle');
const items=document.getElementById('projectMenuItems');
let dismissTimer;
function coverAvailable(){
  const state=document.body.dataset;
  return document.documentElement.dataset.storyEmbed!=='true'&&state.introEntry==='cover'&&state.journeyStarted==='false'&&state.leavingIntro!=='true';
}
function setOpen(open){
  if(!menu||!toggle||!items)return;
  const active=open&&coverAvailable();
  menu.dataset.open=String(active);
  toggle.setAttribute('aria-expanded',String(active));
  toggle.setAttribute('aria-label',active?'프로젝트 메뉴 닫기':'프로젝트 메뉴 열기');
  items.inert=!active;
  items.setAttribute('aria-hidden',String(!active));
  if(!active)dismiss();
}
function dismiss(){
  clearTimeout(dismissTimer);
  if(notice){notice.hidden=true;notice.textContent='';}
}
if(menu&&toggle&&items){
  toggle.addEventListener('click',event=>{
    const open=toggle.getAttribute('aria-expanded')!=='true';
    setOpen(open);
    if(open&&event.detail===0)items.querySelector('button,a')?.focus();
  });
  document.addEventListener('pointerdown',event=>{if(!menu.contains(event.target))setOpen(false);});
  document.addEventListener('keydown',event=>{
    if(event.key==='Escape'&&toggle.getAttribute('aria-expanded')==='true'){
      setOpen(false);toggle.focus();
    }
  });
  menu.addEventListener('focusout',event=>{if(!menu.contains(event.relatedTarget))setOpen(false);});
  new MutationObserver(()=>{if(!coverAvailable())setOpen(false);}).observe(document.body,{attributes:true,attributeFilter:['data-intro-entry','data-journey-started','data-leaving-intro']});
}
if(button&&notice){
  button.addEventListener('click',event=>{
    event.stopPropagation();
    if(button.inert||items?.inert||!coverAvailable())return;
    clearTimeout(dismissTimer);
    notice.hidden=false;notice.textContent='아직 준비 중입니다.';
    dismissTimer=setTimeout(dismiss,2800);
  });
  document.addEventListener('keydown',event=>{if(event.key==='Escape')dismiss();});
  document.addEventListener('visibilitychange',()=>{if(document.hidden)dismiss();});
}
