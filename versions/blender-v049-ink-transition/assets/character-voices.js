// Original character recordings supplied in the project's Google Drive folder.
const player=document.createElement('audio');
player.id='characterVoice';player.preload='metadata';document.body.append(player);
const button=document.querySelector('#soundToggle');
// Keep the existing sound control reachable after the menu was removed.
button.style.cssText='position:fixed;right:24px;bottom:22px;z-index:170;display:flex;gap:6px;background:transparent;border:0;color:#8a9e8c;font-size:12px';document.body.append(button);
let current=-1,unlocked=false,userSelectedSound=false;
function enabled(){return button.getAttribute('aria-pressed')==='true';}
document.addEventListener('experience-selected',()=>{if(!userSelectedSound&&!enabled())button.click();});
window.addEventListener('wheel',()=>{if(current>=0)tryPlay();},{passive:true});
function tryPlay(){if(current>=0&&enabled()&&!document.hidden)player.play().then(()=>{delete player.dataset.blocked;}).catch(()=>{player.dataset.blocked='true';});}
button.addEventListener('click',()=>{userSelectedSound=true;const on=enabled();button.setAttribute('aria-label',on?'소리 끄기':'소리 켜기');button.title=on?'소리 끄기':'소리 켜기';if(on)tryPlay();else player.pause();});
function unlock(event){if(event.target.closest?.('#soundToggle')){unlocked=true;return;}if(unlocked){tryPlay();return;}unlocked=true;if(!userSelectedSound&&!enabled())button.click();tryPlay();}
window.addEventListener('pointerdown',unlock,{capture:true});
window.addEventListener('keydown',unlock,{capture:true});
export function setCharacterVoice(index){
 if(index===current)return;
 player.pause();current=index;player.src=new URL(`voices/character-${index+1}.mp3`,import.meta.url).href;player.currentTime=0;player.dataset.character=String(index+1);tryPlay();
}
export function stopCharacterVoice(){if(current<0)return;player.pause();player.currentTime=0;current=-1;delete player.dataset.character;}
document.addEventListener('visibilitychange',()=>{if(document.hidden)player.pause();else if(!player.ended)tryPlay();});
for(const event of ['archive-open','story-home','cinema-release'])document.addEventListener(event,stopCharacterVoice);
export function voiceCaption(index,pages){
 if(current!==index||!enabled()||!Number.isFinite(player.duration))return null;
 const total=pages.reduce((sum,page)=>sum+page.text.length,0);
 let offset=Math.min(1,player.currentTime/player.duration)*total;
 for(const page of pages){if(offset<page.text.length)return page;offset-=page.text.length;}
 return pages.at(-1);
}
player.addEventListener('timeupdate',()=>document.dispatchEvent(new Event('character-voice-time')));
