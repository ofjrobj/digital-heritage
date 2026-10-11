/**
 * Actual independently playing character footage on a registered scene plane.
 * Input is ONE MP4: RGB in its top half, a grayscale alpha matte in its bottom
 * half. Packing both into one stream keeps their frames exactly synchronized.
 * The matte must be extracted offline; white costumes are never keyed here.
 * No pixels, vertices, limbs, or faces are procedurally warped in this module.
 */

const clamp = (value, lo = 0, hi = 1) => Math.min(hi, Math.max(lo, value));

/**
 * createVideoActor(THREE, url, {
 *   kind: 'merchant', height: 1.86,
 *   bounds: {left, top, right, bottom}, // normalized original RGB frame, Y down
 *   aspect, // optional original RGB width / height; otherwise read from MP4
 *   autoplay: true, loop: true, alphaTest: .015, playbackRate: 1,
 *   matteLevels: [0, 1], opacity: 1
 * })
 *
 * await actor.ready before swapping out the matching static portrait.
 * actor.mesh is local XY, feet Y=0, face forward +Z. Place it at the original
 * Blender character root and face it toward the registered reference camera.
 * actor.update() is intentionally a no-op: scroll NEVER seeks this footage.
 * actor.play()/pause() respond only to explicit ambient/playback controls.
 */
export function createVideoActor(THREE, url, options = {}) {
  const kind = options.kind ?? 'merchant';
  const height = options.height ?? 1.86;
  if (!(height > 0)) throw Error('Video actor height must be positive');
  const bounds = {...{left: 0, top: 0, right: 1, bottom: 1}, ...options.bounds};
  if (!(bounds.left >= 0 && bounds.right <= 1 && bounds.left < bounds.right &&
        bounds.top >= 0 && bounds.bottom <= 1 && bounds.top < bounds.bottom)) {
    throw Error('Video actor bounds must fit the unpacked RGB frame');
  }
  const video = document.createElement('video');
  video.crossOrigin = 'anonymous';
  video.muted = true;
  video.defaultMuted = true;
  video.loop = options.loop ?? true;
  video.playsInline = true;
  video.setAttribute('playsinline', '');
  video.setAttribute('webkit-playsinline', '');
  video.preload = 'auto';
  video.autoplay = options.autoplay ?? true;
  video.playbackRate = options.playbackRate ?? 1;

  const texture = new THREE.VideoTexture(video);
  // The grayscale half is linear alpha data. Decode ONLY the RGB half in the
  // shader; assigning sRGB to the packed texture would gamma-correct the matte.
  texture.colorSpace = THREE.NoColorSpace;
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.generateMipmaps = false;
  texture.wrapS = texture.wrapT = THREE.ClampToEdgeWrapping;
  const texel = {value: new THREE.Vector2(1 / 720, 1 / 2160)};
  const levels = options.matteLevels ?? [0, 1];
  const matteLevels = {value: new THREE.Vector2(levels[0], levels[1])};
  const material = new THREE.MeshBasicMaterial({
    map: texture,
    transparent: true,
    alphaTest: options.alphaTest ?? .015,
    opacity: options.opacity ?? 1,
    side: THREE.DoubleSide,
    depthTest: true,
    depthWrite: false,
    toneMapped: false
  });
  material.customProgramCacheKey = () => 'packed-character-video-rgb-top-alpha-bottom-v1';
  material.onBeforeCompile = shader => {
    shader.uniforms.actorVideoTexel = texel;
    shader.uniforms.actorMatteLevels = matteLevels;
    shader.fragmentShader = `uniform vec2 actorVideoTexel;
uniform vec2 actorMatteLevels;
` + shader.fragmentShader.replace('#include <map_fragment>', `
#ifdef USE_MAP
  vec2 rgbUV = vec2(vMapUv.x, .5 + .5 * vMapUv.y);
  vec2 alphaUV = vec2(vMapUv.x, .5 * vMapUv.y);
  rgbUV = clamp(rgbUV, vec2(.5 * actorVideoTexel.x, .5 + .5 * actorVideoTexel.y), vec2(1.) - .5 * actorVideoTexel);
  alphaUV = clamp(alphaUV, .5 * actorVideoTexel, vec2(1. - .5 * actorVideoTexel.x, .5 - .5 * actorVideoTexel.y));
  vec3 recordedRGB = texture2D(map, rgbUV).rgb;
  float recordedMatte = texture2D(map, alphaUV).r;
  float actorAlpha = clamp((recordedMatte - actorMatteLevels.x) / max(.0001, actorMatteLevels.y - actorMatteLevels.x), 0., 1.);
  diffuseColor.rgb *= sRGBTransferEOTF(vec4(recordedRGB, 1.)).rgb;
  diffuseColor.a *= actorAlpha;
#endif
`);
  };
  // Real video already provides motion: a single rigid quad is sufficient.
  let geometry = new THREE.PlaneGeometry(1, 1);
  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = kind + ' recorded motion layer';
  mesh.visible = false;
  mesh.userData.videoActor = {kind, height, bounds, method: 'recorded-rgb-alpha-video', scrollSeeking: false};
  let disposed = false, loaded = false, lastError = '', decodedFrames = 0;
  let presentedTime = 0, frameRequest = null, frameWidth = 0, frameHeight = 0;
  let unregisterReady = () => {};

  function registerDimensions() {
    frameWidth = video.videoWidth;
    frameHeight = video.videoHeight / 2;
    if (!frameWidth || !frameHeight) throw Error('Packed video has no decoded dimensions');
    const aspect = options.aspect ?? frameWidth / frameHeight;
    const frameMetres = height / (bounds.bottom - bounds.top);
    const widthMetres = frameMetres * aspect;
    geometry.dispose();
    geometry = new THREE.PlaneGeometry(widthMetres, frameMetres);
    geometry.translate((.5 - (bounds.left + bounds.right) / 2) * widthMetres,
      (bounds.bottom - .5) * frameMetres, 0);
    mesh.geometry = geometry;
    texel.value.set(1 / video.videoWidth, 1 / video.videoHeight);
    mesh.userData.videoActor.frame = {width: frameWidth, height: frameHeight, aspect};
  }
  function observeFrame(_now, metadata) {
    if (disposed) return;
    decodedFrames = metadata.presentedFrames;
    presentedTime = metadata.mediaTime;
    frameRequest = video.requestVideoFrameCallback(observeFrame);
  }
  async function play() {
    if (disposed) return false;
    try {
      await video.play();
      lastError = '';
      return true;
    } catch (error) {
      lastError = error?.message || String(error);
      // Caller can retry play() from the first pointer/touch event on browsers
      // that restrict autoplay. A denied attempt is not a successful playback.
      return false;
    }
  }
  function pause() { video.pause(); }
  const ready = new Promise((resolve, reject) => {
    const timer = setTimeout(() => fail(Error('Character video did not load within 30 seconds')), 30000);
    function cleanup() {
      clearTimeout(timer);
      video.removeEventListener('loadeddata', success);
      video.removeEventListener('error', fail);
    }
    function success() {
      try {
        registerDimensions();
        loaded = true;
        mesh.visible = true;
        cleanup();
        if (video.requestVideoFrameCallback) frameRequest = video.requestVideoFrameCallback(observeFrame);
        resolve(mesh);
      } catch (error) { fail(error); }
    }
    function fail(error) {
      cleanup();
      lastError = error instanceof Error ? error.message : (video.error?.message || 'Character video load failed');
      reject(Error(lastError));
    }
    unregisterReady = () => { cleanup(); if (!loaded) reject(Error('Video actor disposed before loading')); };
    video.addEventListener('loadeddata', success, {once: true});
    video.addEventListener('error', fail, {once: true});
  });
  video.src = String(url);
  video.load();
  if (video.autoplay) void play();

  return {
    mesh, video, texture, ready, play, pause,
    update() {},
    setOpacity(value) { material.opacity = clamp(value); },
    proof() {
      return {kind, method: 'recorded-rgb-alpha-video', loaded, videoTime: video.currentTime,
        presentedTime, decodedFrames, duration: Number.isFinite(video.duration) ? video.duration : null,
        paused: video.paused, playbackRate: video.playbackRate, frameWidth, frameHeight,
        bounds, height, rootSway: 0, proceduralArticulation: false,
        scrollSeeking: false, error: lastError || null};
    },
    dispose() {
      disposed = true;
      unregisterReady();
      if (frameRequest !== null && video.cancelVideoFrameCallback) video.cancelVideoFrameCallback(frameRequest);
      video.pause();
      video.removeAttribute('src');
      video.load();
      texture.dispose();
      geometry.dispose();
      material.dispose();
    }
  };
}
