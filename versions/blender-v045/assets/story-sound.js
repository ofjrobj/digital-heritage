// Quiet procedural stand-ins until field recordings and dialogue takes are ready.
let context,master,ambient,filter,lastStep=0;
const button=document.querySelector('#soundToggle');
function start(){
 if(context)return;
 context=new AudioContext();master=context.createGain();master.gain.value=0;master.connect(context.destination);
 const buffer=context.createBuffer(1,context.sampleRate*3,context.sampleRate),data=buffer.getChannelData(0);let previous=0;
 for(let i=0;i<data.length;i++){previous=(previous+Math.random()*.04-.02)/1.025;data[i]=previous;}
 ambient=context.createBufferSource();ambient.buffer=buffer;ambient.loop=true;
 filter=context.createBiquadFilter();filter.type='lowpass';filter.frequency.value=350;
 const gain=context.createGain();gain.gain.value=.18;ambient.connect(filter);filter.connect(gain);gain.connect(master);ambient.start();
}
function tone(frequency,duration,level){if(!context||master.gain.value===0)return;const now=context.currentTime,o=context.createOscillator(),g=context.createGain();o.type='sine';o.frequency.setValueAtTime(frequency,now);o.frequency.exponentialRampToValueAtTime(frequency*.55,now+duration);g.gain.setValueAtTime(.001,now);g.gain.linearRampToValueAtTime(level,now+.015);g.gain.exponentialRampToValueAtTime(.001,now+duration);o.connect(g);g.connect(master);o.start();o.stop(now+duration);}
button.addEventListener('click',()=>{start();context.resume();const on=button.getAttribute('aria-pressed')==='true';master.gain.setTargetAtTime(on?.4:0,context.currentTime,.25);});
document.addEventListener('episode-active',e=>{if(filter)filter.frequency.setTargetAtTime(e.detail?170:450,context.currentTime,.8);});
document.addEventListener('story-scan',()=>tone(420,.7,.035));
document.addEventListener('stage-navigate',e=>{tone(170,.8,.04);if(filter)filter.frequency.setTargetAtTime(e.detail==='memory'?600:350,context.currentTime,1);});
window.addEventListener('wheel',()=>{if(document.body.dataset.stage!=='village'||performance.now()-lastStep<450)return;lastStep=performance.now();tone(90,.16,.06);},{passive:true});
