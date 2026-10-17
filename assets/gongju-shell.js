// Same quiet Story / Index shell as /gongju-mok/, with the native Blender journey.
for(const file of ['shared-nav.css','kopub-light.css','dialogue-responsive-compact.css']){const link=document.createElement('link');link.rel='stylesheet';link.href=new URL('../ink-review/assets/'+file+'?v=landscape-nav-1',import.meta.url);document.head.append(link);}
const link=document.createElement('link');link.rel='stylesheet';link.href=new URL('./gongju-shell.css?v=20261018-4',import.meta.url);document.head.append(link);
const frame=document.createElement('div');frame.className='gongju-corner-frame';frame.setAttribute('aria-hidden','true');frame.innerHTML='<i class="tl"></i><i class="tr"></i><i class="bl"></i><i class="br"></i>';document.body.append(frame);
