// Sparse pentatonic glass bells; no continuous noise or low drone.
const toggle=document.querySelector('#soundToggle');
let context,master,active=false,timer=null,note=0;
const voices=new Set();
const phrase=[0,3,1,4,2,1,3,0];
const pitches=[523.251,587.330,659.255,783.991,880];
function audible(){return active&&!document.hidden&&toggle?.getAttribute('aria-pressed')==='true';}
function initialize(){
 if(context)return;
 context=new AudioContext();master=context.createGain();master.gain.value=0;master.connect(context.destination);
}
function bell(){
 if(!audible()||context.state!=='running')return;
 const now=context.currentTime,base=pitches[phrase[note%phrase.length]],pan=context.createStereoPanner();
 pan.pan.value=Math.sin(note*2.4)*.55;pan.connect(master);
 // Discrete fading echoes leave silence between gestures, without a noise bed.
 const echo=context.createDelay(2),feedback=context.createGain(),wet=context.createGain();
 echo.delayTime.value=.47;feedback.gain.value=.27;wet.gain.value=.32;
 pan.connect(echo);echo.connect(feedback);feedback.connect(echo);echo.connect(wet);wet.connect(master);
 const nodes=[pan,echo,feedback,wet];
 for(const [ratio,level,decay] of [[1,.105,3.4],[2.001,.019,1.8],[3.998,.004,.7]]){
  const osc=context.createOscillator(),env=context.createGain();osc.type='sine';osc.frequency.value=base*ratio;
  env.gain.setValueAtTime(0,now);env.gain.linearRampToValueAtTime(level,now+.045);
  env.gain.exponentialRampToValueAtTime(.00001,now+decay);osc.connect(env);env.connect(pan);
  osc.start(now);osc.stop(now+decay+.1);nodes.push(osc,env);
 }
 voices.add(nodes);setTimeout(()=>{nodes.forEach(n=>n.disconnect());voices.delete(nodes);},6500);note++;
 timer=setTimeout(bell,3100+(note%3)*650);
}
function sync(){
 const on=audible();
 if(!on){clearTimeout(timer);timer=null;}
 if(on)initialize();if(!context)return;
 const t=context.currentTime;master.gain.cancelScheduledValues(t);master.gain.setValueAtTime(master.gain.value,t);
 master.gain.linearRampToValueAtTime(on?.38:0,t+(on?1.2:.45));
 if(on&&timer===null){timer=setTimeout(()=>{timer=null;context.resume().then(()=>{if(audible())bell();}).catch(()=>{});},120);}
}
document.addEventListener('archive-open',()=>{active=true;sync();});
for(const name of ['archive-story','story-home','story-restart'])document.addEventListener(name,()=>{active=false;sync();});
if(toggle)new MutationObserver(sync).observe(toggle,{attributes:true,attributeFilter:['aria-pressed']});
document.addEventListener('visibilitychange',sync);
document.addEventListener('pointerdown',()=>{if(active)sync();});
