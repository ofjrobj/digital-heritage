// Immersive viewport; camera projection adapts without stretching geometry.
export const FILM_ASPECT=16/9;
export function fitCinemaFrame(width,height,{review=false}={}){
 const dock=review?(width<600?106:62):0;
 return {width:Math.max(1,width),height:Math.max(1,height),x:0,y:0,stacked:false,dock};
}
export function syncCinemaFrame(){
 const f=fitCinemaFrame(innerWidth,innerHeight,{review:document.body.dataset.fullStory==='false'&&document.body.dataset.cleanPlay!=='true'});
 const root=document.documentElement.style;
 root.setProperty('--review-dock',f.dock+'px');
 for(const [key,value] of Object.entries({x:f.x,y:f.y,w:f.width,h:f.height,b:innerHeight-f.y-f.height,r:innerWidth-f.x-f.width}))root.setProperty('--film-'+key,value+'px');
 root.setProperty('--film-unit',f.width/100+'px');
 document.body.dataset.cinemaFrame=f.stacked?'stacked':'wide';
 return f;
}
if(typeof document!=='undefined'){
 const css=document.createElement('link');css.rel='stylesheet';css.href=new URL('./cinema-frame.css?v=71-39',import.meta.url);document.head.append(css);
 const matte=document.createElement('div');matte.id='cinemaMatte';matte.setAttribute('aria-hidden','true');document.body.append(matte);
 syncCinemaFrame();addEventListener('resize',syncCinemaFrame);
}

if(typeof document!=='undefined'){
 const mobilePortrait=matchMedia('(pointer:coarse) and (orientation:portrait) and (max-width:900px)').matches;
 if(mobilePortrait){
  const notice=document.createElement('div');notice.id='landscapeNotice';notice.setAttribute('role','status');notice.setAttribute('aria-live','polite');notice.innerHTML='<span aria-hidden="true">↻</span><p>화면을 가로로 돌려 주세요</p><small>잠시 후 공주목 이야기가 시작됩니다.</small>';document.body.append(notice);
  document.body.classList.add('orientation-intro');
  const block=e=>{e.preventDefault();e.stopImmediatePropagation();};
  ['wheel','touchmove','pointerdown','keydown'].forEach(type=>notice.addEventListener(type,block,{passive:false}));
  setTimeout(()=>{notice.remove();document.body.classList.remove('orientation-intro');},3000);
 }
}
