const button=document.getElementById('projectVr');
const notice=document.getElementById('vrNotice');
let dismissTimer;
function dismiss(){
  clearTimeout(dismissTimer);
  if(notice){notice.hidden=true;notice.textContent='';}
}
if(button&&notice){
  button.addEventListener('click',event=>{
    event.stopPropagation();
    const state=document.body.dataset;
    if(button.inert||document.documentElement.dataset.storyEmbed==='true'||state.introEntry!=='cover'||state.journeyStarted!=='false'||state.leavingIntro==='true')return;
    clearTimeout(dismissTimer);
    notice.hidden=false;notice.textContent='아직 준비 중입니다.';
    dismissTimer=setTimeout(dismiss,2800);
  });
  document.addEventListener('keydown',event=>{if(event.key==='Escape')dismiss();});
  document.addEventListener('visibilitychange',()=>{if(document.hidden)dismiss();});
}
