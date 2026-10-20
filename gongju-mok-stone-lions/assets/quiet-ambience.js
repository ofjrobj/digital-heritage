const clamp = n => Math.max(0, Math.min(1, Number.isFinite(n) ? n : 0));
const smooth = n => { const t = clamp(n); return t*t*(3-2*t); };
// The approved opening reveals the two misty mountain ridges at source 3.2s.
const INTRO_AMBIENCE_START = 3.2;
const SEASON_CROSSFADE_SECONDS = 2.4;
const townRoutes = new Set(['entry-merchant','merchant-farmer','farmer-cook','cook-trio']);

// Gains multiply already quiet, peak-limited files. Dialogue always wins.
export function ambienceTargets({scene, time=0, duration=0, moving=false, active=false,
  sound=false, paused=false, hidden=false, transition=false, finished=false,
  approach=1, endingGain=1, voiceActive=false}) {
  const zero = {forest:0, village:0, seasons:0, drum:0, bird:0, townDetail:0, lionDetail:0};
  if (!active || !sound || paused || hidden || finished) return zero;
  if (scene?.id==='seasons') return {...zero, seasons:.72*clamp(endingGain)};
  if (scene?.id==='intro') return time<INTRO_AMBIENCE_START?zero:{...zero,forest:.22};
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
    audio.src=new URL('../media/v24/'+file,import.meta.url).href;stage.append(audio);
    const track={audio,target:0,gainTarget:0,rise:null,pending:false,blocked:false,error:null,serial:0,unlocked:false};
    audio.addEventListener('error',()=>{track.error='MediaError';track.blocked=true;});
    return [key,track];
  }));
  let previousScene=null,seasonHandoff=null;
  function ensure(track,prime=false) {
    const a=track.audio;
    if(track.pending||track.blocked||(!prime&&track.target<=0)||!a.paused||document.hidden)return;
    const serial=track.serial;track.pending=true;
    if(prime&&track.target<=0)a.volume=0;
    a.play().then(()=>{track.unlocked=true;}).catch(e=>{if(serial===track.serial){track.blocked=true;track.error=e.name||'AudioError';}})
      .finally(()=>{if(serial===track.serial){track.pending=false;if(track.target<=0)a.pause();}});
  }
  function stop() {
    seasonHandoff=null;
    for(const t of Object.values(tracks)){t.serial++;t.pending=false;t.target=0;t.gainTarget=0;t.rise=null;t.audio.volume=0;t.audio.pause();}
  }
  return {
    // Unlock each element silently during a real click/key gesture. Safari can
    // require this per element even when a different track played earlier.
    retry(){for(const t of Object.values(tracks)){if(t.error!=='MediaError'){
      if(t.blocked){t.audio.volume=0;if(t.rise){t.rise.from=0;t.rise.elapsed=0;}}
      t.blocked=false;t.error=null;ensure(t,!t.unlocked&&!!navigator.userActivation?.isActive);
    }}},
    stop,
    tick(state) {
      if(!state.sound||state.paused||state.hidden||state.finished||
        state.scene?.id==='intro'&&(state.time||0)<INTRO_AMBIENCE_START||
        state.scene?.id==='seasons'&&(state.endingGain??1)<=0){stop();return;}
      const target=ambienceTargets(state),dt=Math.min(.1,Math.max(0,state.dt||0));
      const isSeasons=state.scene?.id==='seasons';
      if(isSeasons){
        // Hand the sound over once the film actually plays, not while it waits.
        if(!seasonHandoff)seasonHandoff={elapsed:0,from:{forest:tracks.forest.audio.volume,village:tracks.village.audio.volume}};
        if(state.active&&state.moving)seasonHandoff.elapsed+=dt;
      }else seasonHandoff=null;
      const seasonal=tracks.seasons.audio;
      if(state.scene?.id==='seasons' && seasonal.readyState>=1 &&
        (previousScene!=='seasons'||Math.abs(seasonal.currentTime-state.time)>.30)) {
        seasonal.currentTime=Math.max(0,Math.min(state.time,19.98));
      }
      if(state.scene?.id==='intro'&&previousScene!=='intro'){
        tracks.forest.audio.volume=0;tracks.forest.gainTarget=0;tracks.forest.rise=null;
      }
      previousScene=state.scene?.id;
      for(const [key,t] of Object.entries(tracks)) {
        t.target=target[key];
        const a=t.audio;
        if(isSeasons&&key!=='seasons'){
          // Finish the old forest bed completely; leave only the film's sound.
          t.target=0;t.gainTarget=0;t.rise=null;
          a.volume=clamp((seasonHandoff.from[key]||0)*(1-smooth(seasonHandoff.elapsed/SEASON_CROSSFADE_SECONDS))*clamp(state.endingGain??1));
          if(a.volume===0)a.pause();
          continue;
        }
        if(isSeasons&&(!state.active||!state.moving)){a.pause();continue;}
        if(t.target>t.gainTarget+.000001){
          // Count the fade from audible playback, never while autoplay is blocked.
          t.rise={from:a.volume,elapsed:0,duration:isSeasons?SEASON_CROSSFADE_SECONDS:state.scene?.id==='intro'?10:6};
        }else if(t.target<t.gainTarget-.000001)t.rise=null;
        t.gainTarget=t.target;
        if(t.rise){
          if(!a.paused&&!t.blocked&&a.readyState>=3)t.rise.elapsed+=dt;
          a.volume=clamp(t.rise.from+(t.target-t.rise.from)*smooth(t.rise.elapsed/t.rise.duration));
          if(t.rise.elapsed>=t.rise.duration)t.rise=null;
        }else{
          a.volume=clamp(a.volume+(t.target-a.volume)*(1-Math.exp(-dt)));
        }
        // The final gain is a ceiling: smoothing may never delay the picture's fade.
        if(key==='seasons'&&state.scene?.id==='seasons')a.volume=Math.min(a.volume,.72*clamp(state.endingGain));
        if(!t.target&&a.volume<.0001){a.volume=0;a.pause();}else ensure(t);
      }
    },
    proof(){return Object.fromEntries(Object.entries(tracks).map(([key,t])=>[key,{
      source:t.audio.currentSrc||t.audio.src,volume:t.audio.volume,target:t.target,
      paused:t.audio.paused,blocked:t.blocked,error:t.error,time:t.audio.currentTime,
      rise:t.rise?{elapsed:t.rise.elapsed,duration:t.rise.duration}:null
    }]));},
    blocked(){return Object.values(tracks).some(t=>t.target>0&&t.blocked);}
  };
}
