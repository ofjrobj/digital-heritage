// Open the exact shared Index as a full page so the two scan viewers own their WebGL contexts.
export function prepareArchive(){}
export function openArchive(){
 location.assign(new URL('../../archive/?native=blender-test',import.meta.url));
}
