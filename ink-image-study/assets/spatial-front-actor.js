// Composite the approved frontal illustration, rather than an arbitrary frame
// of a head-turning video. Only border-connected neutral backing is masked;
// internal dark hair, facial lines, and costume details remain untouched.
export async function createFrontActor(THREE,url,kind,height){
 const image=new Image();image.crossOrigin='anonymous';image.src=url;await image.decode();
 const canvas=document.createElement('canvas');canvas.width=image.width;canvas.height=image.height;
 const ctx=canvas.getContext('2d',{willReadFrequently:true});ctx.drawImage(image,0,0);
 const pixels=ctx.getImageData(0,0,canvas.width,canvas.height),p=pixels.data,w=canvas.width,h=canvas.height,n=w*h;
 const seen=new Uint8Array(n),queue=new Int32Array(n);let start=0,end=0;
 const add=i=>{if(i<0||i>=n||seen[i])return;const k=i*4,hi=Math.max(p[k],p[k+1],p[k+2]),lo=Math.min(p[k],p[k+1],p[k+2]);const backgroundCeiling=['merchant','farmer'].includes(kind)?48:88;const neutrality=['merchant','farmer'].includes(kind)?10:17;if(hi>backgroundCeiling||hi-lo>neutrality)return;seen[i]=1;queue[end++]=i;};
 for(let x=0;x<w;x++){add(x);add((h-1)*w+x);}for(let y=0;y<h;y++){add(y*w);add(y*w+w-1);}
 while(start<end){const i=queue[start++],x=i%w;if(x)add(i-1);if(x<w-1)add(i+1);add(i-w);add(i+w);}
 let left=w,right=0,top=h,bottom=0;
 for(let i=0;i<n;i++){if(seen[i])p[i*4+3]=0;else{const x=i%w,y=Math.floor(i/w);left=Math.min(left,x);right=Math.max(right,x);top=Math.min(top,y);bottom=Math.max(bottom,y);}}
 ctx.putImageData(pixels,0,0);const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;
 const metres=height/(bottom-top),geometry=new THREE.PlaneGeometry(w*metres,h*metres);
 geometry.translate((w/2-(left+right)/2)*metres,(bottom-h/2)*metres,0);
 const mesh=new THREE.Mesh(geometry,new THREE.MeshBasicMaterial({map:texture,transparent:true,alphaTest:.02,depthWrite:false,side:THREE.DoubleSide,toneMapped:false}));mesh.name=kind+' frontal illustration';
 return {mesh};
}
