// Open the exact shared Index as a full page so the two scan viewers own their WebGL contexts.
export function prepareArchive(){}
export function openArchive(){
 const page=location.pathname.endsWith('/review.html')?'review':'play';
 location.assign(new URL('../gongju-mok/archive/?native='+page,import.meta.url));
}
