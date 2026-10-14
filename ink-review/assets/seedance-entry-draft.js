import {createRouteFilm} from './spatial-route-film.js?v=background-ui-1';
export function createEntryDraft(stage){
 const film=createRouteFilm(new URL('./entry-ink-1736-48fps.mp4',import.meta.url).href,{duration:12.768});
 const video=film.video;
 video.id='seedanceEntryDraft';video.setAttribute('aria-hidden','true');
 video.style.cssText='position:absolute;inset:0;width:100%;height:100%;object-fit:cover;z-index:2;pointer-events:none;display:none';
 stage.append(video);
 return {ready:film.ready,update(time,dt){
  const visible=time>=30&&time<43.92;
  video.style.display=visible?'block':'none';
  video.style.opacity=String(Math.min(1,Math.max(0,(time-30)/.45)));
  film.update(Math.max(0,Math.min(12.768,time-30)),{active:visible,dt});
 },proof(){return {job:'162fb81b-d96e-43d9-aa8b-3e5c80100d21',model:'seedance_2_5',sourceFps:24,interpolatedFps:48,...film.proof()};}};
}
