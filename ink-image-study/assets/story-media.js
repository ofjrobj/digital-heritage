// Public play and review share the revised 720p media. The historical candidate
// link remains compatible but must never select a different opening again.
// The source Blender story's opening lasts 18 s.
export const opening = Object.freeze({
 file:'candidate-720p/intro.mp4', start:'cover.png', seconds:18,
 aerialStart:4/15, aerialEnd:7/15,
});
export function storyClips(){
 const travelPrefix='candidate-720p/';
 return {
  intro:opening,
  travel1:{file:travelPrefix+'walk-merchant.mp4',start:'entry.png'},
  travel2:{file:travelPrefix+'walk-farmer.mp4',start:'merchant.png'},
 };
}
export function openingPhase(progress){
 return progress<opening.aerialStart?'ink':progress<opening.aerialEnd?'aerial':'descent';
}
export function openingRate(mediaDuration){
 return Number.isFinite(mediaDuration)&&mediaDuration>0?mediaDuration/opening.seconds:1;
}
