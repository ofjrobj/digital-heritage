const clamp = n => Math.max(0, Math.min(1, Number.isFinite(n) ? n : 0));
const smooth = n => { const t = clamp(n); return t*t*(3-2*t); };
const townRoutes = new Set(['entry-merchant','merchant-farmer','farmer-cook','cook-trio']);

// Gains multiply already quiet, peak-limited files. Dialogue always wins.
export function ambienceTargets({scene, time=0, duration=0, moving=false, active=false,
  sound=false, paused=false, hidden=false, transition=false, finished=false,
  approach=1, endingGain=1, voiceActive=false}) {
  const zero = {forest:0, village:0, seasons:0, drum:0, bird:0, townDetail:0, lionDetail:0};
  if (!active || !sound || paused || hidden || finished) return zero;
  if (scene?.id==='seasons') return {...zero, seasons:.72*clamp(endingGain)};
  if (scene?.id==='intro') return {...zero,forest:.22};
  // Only the dialogue has a soft duck. Loading a frame or releasing the wheel
  // does not stop, seek or modulate the ongoing environmental recording.
  if (scene?.mode==='dialogue') return {...zero,forest:.035};
  if (scene?.mode!=='scroll') return zero;
  return {...zero,forest:.22,village:townRoutes.has(scene.id)?.10:0};
}

export function createQuietAmbience(stage) {
  const sources={forest:'../v28/forest-continuous.mp3',village:'../v28/village-continuous.mp3',seasons:'seasons.mp3'};
  const tracks=Object.fromEntries(Object.entries(sources).map(([key,file])=>{
    const audio=document.createElement('audio');
    audio.id='quietAmbience-'+key;audio.preload='auto';audio.loop=['forest','village','townDetail','lionDetail'].includes(key);audio.volume=0;
    audio.setAttribute('aria-hidden','true');
    audio.src=new URL('../../gongju-mok/media/v24/'+file,import.meta.url).href;stage.append(audio);
    const track={audio,target:0,pending:false,blocked:false,error:null,serial:0,unlocked:false};
    audio.addEventListener('error',()=>{track.error='MediaError';track.blocked=true;});
    return [key,track];
  }));
  let previousScene=null,sessionElapsed=0;
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
      if(state.scene?.id==='intro'&&previousScene!=='intro')sessionElapsed=0;
      if(state.active)sessionElapsed+=dt;
      previousScene=state.scene?.id;
      for(const [key,t] of Object.entries(tracks)) {
        t.target=target[key]*(key==='forest'?smooth(sessionElapsed/6):1);
        const a=t.audio,tau=t.target<a.volume ? 1.0 : key==='village'?2.4:1.5;
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
