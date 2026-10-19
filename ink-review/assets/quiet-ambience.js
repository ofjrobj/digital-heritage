const clamp = n => Math.max(0, Math.min(1, Number.isFinite(n) ? n : 0));
const smooth = n => { const t = clamp(n); return t*t*(3-2*t); };
const townRoutes = new Set(['entry-merchant','merchant-farmer','farmer-cook','cook-trio']);

// Gains multiply already quiet, peak-limited files. Dialogue always wins.
export function ambienceTargets({scene, time=0, duration=0, moving=false, active=false,
  sound=false, paused=false, hidden=false, transition=false, finished=false,
  approach=1, endingGain=1, voiceActive=false}) {
  const zero = {forest:0, village:0, seasons:0, drum:0, bird:0};
  if (!active || !sound || paused || hidden || transition || finished || scene?.mode==='dialogue') return zero;
  if (scene?.id==='seasons') return {...zero, seasons:.72*clamp(endingGain)};
  if (scene?.id==='intro') {
    const duck=voiceActive?.32:1;
    return {...zero, forest:moving?.42*smooth((time-3.1)/1.1)*duck:0,
      drum:moving?.48*smooth(time/.65)*smooth((16.5-time)/3)*duck:0,
      village:moving?.40*smooth((time-10.5)/2.5)*duck:0,
      bird:moving&&time>=2.2&&time<8?.50*(voiceActive?.55:1):0};
  }
  if (scene?.mode!=='scroll') return zero;
  const forest = .50*(moving?1:.18)*clamp(approach);
  // Distant conversation only within the inhabited village, never on the mountain.
  const middle = smooth((time-.8)/1.4)*smooth((duration-3.2-time)/1.4);
  const village = scene.id==='entry-merchant' ? (moving?.40:.12)*smooth((duration-2-time)/1.5)*clamp(approach) : townRoutes.has(scene.id)&&moving?.50*middle*clamp(approach):0;
  return {forest,village,seasons:0,drum:0,bird:0};
}

export function createQuietAmbience(stage) {
  const sources={forest:'forest.mp3',village:'distant-village.mp3',seasons:'seasons.mp3',drum:'../v25/intro-drum.mp3',bird:'../v25/mountain-birds.mp3'};
  const tracks=Object.fromEntries(Object.entries(sources).map(([key,file])=>{
    const audio=document.createElement('audio');
    audio.id='quietAmbience-'+key;audio.preload='auto';audio.loop=key==='forest'||key==='village';audio.volume=0;
    audio.setAttribute('aria-hidden','true');
    audio.src=new URL('../../gongju-mok/media/v24/'+file,import.meta.url).href;stage.append(audio);
    const track={audio,target:0,pending:false,blocked:false,error:null,serial:0,unlocked:false};
    audio.addEventListener('error',()=>{track.error='MediaError';track.blocked=true;});
    return [key,track];
  }));
  let previousScene=null;
  function ensure(track,prime=false) {
    const a=track.audio;
    if(track.pending||track.blocked||(!prime&&track.target<=0)||!a.paused||document.hidden)return;
    const serial=track.serial;track.pending=true;
    if(prime&&track.target<=0)a.volume=0;
    a.play().then(()=>{track.unlocked=true;}).catch(e=>{if(serial===track.serial){track.blocked=true;track.error=e.name||'AudioError';}})
      .finally(()=>{if(serial===track.serial){track.pending=false;if(track.target<=0)a.pause();}});
  }
  function stop() {
    for(const t of Object.values(tracks)){t.serial++;t.pending=false;t.target=0;t.audio.volume=0;t.audio.pause();}
  }
  return {
    // Unlock each element silently during a real click/key gesture. Safari can
    // require this per element even when a different track played earlier.
    retry(){for(const t of Object.values(tracks)){if(t.error!=='MediaError'){t.blocked=false;t.error=null;ensure(t,!t.unlocked&&!!navigator.userActivation?.isActive);}}},
    stop,
    tick(state) {
      if(!state.sound||state.paused||state.hidden||state.finished){stop();return;}
      const target=ambienceTargets(state),dt=Math.min(.1,Math.max(0,state.dt||0));
      const seasonal=tracks.seasons.audio;
      if(state.scene?.id==='seasons' && seasonal.readyState>=1 &&
        (previousScene!=='seasons'||Math.abs(seasonal.currentTime-state.time)>.30)) {
        seasonal.currentTime=Math.max(0,Math.min(state.time,19.98));
      }
      // One-shot intro cues follow automatic playback and review seeks, not wheel ticks.
      for(const [key,end] of [['drum',16.48],['bird',8.48]]) {
        const cue=tracks[key].audio;
        if(state.scene?.id==='intro'&&cue.readyState>=1) {
          const cueTime=Math.min(end,Math.max(0,state.time));
          if(previousScene!=='intro'||Math.abs(cue.currentTime-cueTime)>.5)cue.currentTime=cueTime;
          cue.playbackRate=state.playbackRate||1;
        }
      }
      previousScene=state.scene?.id;
      for(const [key,t] of Object.entries(tracks)) {
        t.target=target[key];
        const a=t.audio,tau=t.target<a.volume ? .18 : 1.25;
        a.volume=clamp(a.volume+(t.target-a.volume)*(1-Math.exp(-dt/tau)));
        // The final gain is a ceiling: smoothing may never delay the picture's fade.
        if(key==='seasons'&&state.scene?.id==='seasons')a.volume=Math.min(a.volume,.72*clamp(state.endingGain));
        if(!t.target&&a.volume<.0001){a.volume=0;a.pause();}else ensure(t);
      }
    },
    proof(){return Object.fromEntries(Object.entries(tracks).map(([key,t])=>[key,{
      source:t.audio.currentSrc||t.audio.src,volume:t.audio.volume,target:t.target,
      paused:t.audio.paused,blocked:t.blocked,error:t.error,time:t.audio.currentTime
    }]));},
    blocked(){return Object.values(tracks).some(t=>t.target>0&&t.blocked);}
  };
}
