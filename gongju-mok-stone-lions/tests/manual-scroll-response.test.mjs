import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {createWalkingInput, walkingTargetDelta} from '../assets/walking-input.js';
import {continuousScrollRate, manualScrollHoldTime, nextScrollStop, boundedManualTarget} from '../assets/scroll-motion.js';
import {setPlaybackRate, holdPresentedFrame, reverseFrameStep} from '../assets/video-playback.js';

const runtime = readFileSync(new URL('../assets/test-render-media.js', import.meta.url), 'utf8');
const manifest = JSON.parse(readFileSync(new URL('../selected-media.json', import.meta.url), 'utf8'));
const walkingScene = manifest.scenes.find(scene => scene.id === 'entry-merchant');

function between(start, end, includeEnd = 0) {
  const from = runtime.indexOf(start);
  const to = runtime.indexOf(end, from + start.length);
  assert.ok(from >= 0 && to > from, `runtime boundary missing: ${start}`);
  return runtime.slice(from, to + includeEnd);
}

// Run the production input handler, release policy, and native-forward branch.
// The media clock below assumes ideal decoding; browser decode cost is separate.
const inputCode = [
  between('function holdManualFrame(', '// One forward gesture'),
  between('function manual(', "canvas.addEventListener('pointerdown'"),
].join('\n');
const forwardBranch = between(
  "if(s.scrollPlayback==='continuous'&&!previewAuto){",
  "}else if(s.scrollPlayback==='seek'&&!previewAuto){", 1,
);

function createJourney({scene = walkingScene, end = 1000, pixelRatio = 1} = {}) {
  let now = 0, mediaTime = 0, seeks = 0, starts = 0, stops = 0, wheelHandler;
  const video = {
    paused: true, seeking: false, readyState: 4, playbackRate: 1,
    get currentTime() { return mediaTime; },
    set currentTime(value) { mediaTime = value; seeks++; },
    pause() { if (!this.paused) stops++; this.paused = true; },
  };
  const current = {scene, video, clipIn: 0, loaded: true, manualHeld: true, settledTarget: 0};
  const context = vm.createContext({
    current, scenes: [scene], index: 0, replacementOpening: true, embeddedStory: false, transition: null,
    local: 0, target: 0, walkingRate: 0, walkingDirection: 1, reverseElapsed: 0,
    previewAuto: false, manualIdleMs: 120, lastManualInputAt: -Infinity,
    lastScrollAt: -Infinity, lastWheelMoveAt: -Infinity, lastDragMoveAt: -Infinity,
    sceneJoin: null, seamMatch: null,
    walkingInput: createWalkingInput({oneStepPerGesture: true,pixelRatio}),
    performance: {now: () => now},
    stage: {addEventListener(type, handler) { if (type === 'wheel') wheelHandler = handler; }},
    canWalk: () => true, enterFromIntro: () => false, scrollDriven: () => true,
    departureActive: () => false, duration: () => end, scrollLimit: () => end,
    walkingInputRange: () => scene.secondsPerScroll * 6,
    clamp: (value, min = 0, max = 1) => Math.max(min, Math.min(max, value)),
    footsteps: {stop() {}, pulse() {}}, draw() {},
    play(record) { if (record.video.paused) starts++; record.video.paused = false; },
    seekScrollPosition(record, time) { record.video.pause(); record.video.currentTime = time; },
    walkingTargetDelta, nextScrollStop, continuousScrollRate, manualScrollHoldTime, boundedManualTarget,
    setPlaybackRate, holdPresentedFrame, reverseFrameStep,
  });
  vm.runInContext(inputCode + `
    function updateFrame(dt, now) {
      holdManualFrame(false, now);
      const s=current.scene, v=current.video, d=duration(index);
      const pacedScene=s, departing=false, turnRate=1;
      local=v.currentTime;
      reverseElapsed=walkingDirection<0&&target-local<-.008?Math.min(.25,reverseElapsed+dt):0;
      const gap=target-local;
      ${forwardBranch}
    }
  `, context);
  function advance(time) {
    assert.ok(time >= now);
    if (!video.paused) mediaTime += video.playbackRate * (time - now) / 1000;
    now = time;
  }
  return {
    context, video, advance,
    wheel(time, deltaY = -100) {
      advance(time);
      wheelHandler({deltaY, deltaX: 0, deltaMode: 0, target: {closest: () => null}, preventDefault() {}});
    },
    frame(time, dt = 1 / 60) { advance(time); context.updateFrame(dt, time); },
    release(time) { advance(time); context.holdManualFrame(true, time); },
    snapshot() { return {time: now, source: mediaTime, target: context.target, rate: video.playbackRate, paused: video.paused, held: current.manualHeld, seeks, starts, stops}; },
  };
}

function simulate({magnitude = 100, interval = 250, inputMs = 10000, endMs = inputMs + 4000, frameRate = 60, pixelRatio = 1} = {}) {
  const journey = createJourney({pixelRatio});
  const events = [];
  for (let time = 0; time < inputMs; time += interval) events.push([time, 'wheel']);
  for (let frame = 0; frame <= Math.ceil(endMs * frameRate / 1000); frame++) events.push([frame * 1000 / frameRate, 'frame']);
  events.sort((a, b) => a[0] - b[0] || (a[1] === 'wheel' ? -1 : 1));
  let minimumActiveRate = Infinity, maximumActiveRate = 0;
  for (const [time, kind] of events) {
    if (kind === 'wheel') journey.wheel(time, -magnitude);
    else {
      journey.frame(time, 1 / frameRate);
      const state = journey.snapshot();
      if (!state.paused) {
        minimumActiveRate = Math.min(minimumActiveRate, state.rate);
        maximumActiveRate = Math.max(maximumActiveRate, state.rate);
      }
    }
  }
  return {...journey.snapshot(), minimumActiveRate, maximumActiveRate};
}

test('one mouse notch completes a bounded step with smooth acceleration and no decoder restarts', () => {
  const journey = createJourney();
  journey.wheel(0);
  assert.equal(journey.snapshot().rate, .5);
  for (let time = 16; time <= 240; time += 16) journey.frame(time, .016);
  assert.equal(journey.snapshot().paused, false, 'release deadline must not cut off the step');
  for (let time = 256; time <= 5000; time += 16) journey.frame(time, .016);
  const stopped = journey.snapshot();
  assert.equal(stopped.paused, true);
  assert.ok(stopped.source >= walkingScene.secondsPerScroll - .04 && stopped.source <= walkingScene.secondsPerScroll, `${stopped.source} source seconds`);
  assert.equal(stopped.target, walkingScene.secondsPerScroll);
  assert.equal(stopped.starts, 1);
  assert.equal(stopped.stops, 1);
  assert.equal(stopped.seeks, 0);
  journey.frame(6000);
  assert.equal(journey.snapshot().source, stopped.source);
});

test('direct drag idle and explicit release retain the short stopping response', () => {
  const journey = createJourney();
  journey.context.manual(1, true);
  journey.frame(119, .016);
  assert.equal(journey.snapshot().paused, false);
  journey.frame(120, .001);
  assert.equal(journey.snapshot().paused, true);
  journey.wheel(200, -9);
  journey.release(201);
  const stopped = journey.snapshot();
  assert.equal(stopped.paused, true);
  assert.equal(stopped.target, stopped.source);
  assert.equal(stopped.seeks, 0);
});

test('eight separated notches reach the merchant approach without dozens of repeated inputs', () => {
  const journey = createJourney({end: walkingScene.duration});
  let previous = 0;
  for (let step = 0; step < 8; step++) {
    const start = step * 4000;
    journey.wheel(start);
    for (let elapsed = 16; elapsed <= 4000; elapsed += 16) journey.frame(start + elapsed, .016);
    const state = journey.snapshot();
    assert.equal(state.paused, true);
    assert.ok(state.source - previous > 1.7 && state.source - previous <= 1.8);
    if (step === 6) assert.ok(state.source < walkingScene.dialogueApproach.start);
    previous = state.source;
  }
  const state = journey.snapshot();
  assert.ok(state.source >= walkingScene.dialogueApproach.start);
  assert.equal(state.starts, 8);
  assert.equal(state.seeks, 0);
});

test('ordinary mouse-wheel cadence advances continuously without exceeding native source speed', () => {
  const result = simulate();
  assert.ok(result.source > 10, `${result.source} source seconds including the final bounded step`);
  assert.ok(result.source <= walkingScene.scrollCruiseRate * 10 + walkingScene.secondsPerScroll);
  assert.ok(result.maximumActiveRate <= 1);
  assert.equal(result.paused, true);
  assert.equal(result.seeks, 0);
});

test('repeated mouse notches stay in native playback instead of restarting on every notch', () => {
  for (const interval of [275, 300, 350, 400]) {
    const result = simulate({interval, inputMs: 5000});
    assert.ok(result.starts <= 2, `${interval}ms cadence restarted ${result.starts} times`);
    assert.ok(result.source > 5 && result.source <= 5 + walkingScene.secondsPerScroll);
    assert.ok(result.maximumActiveRate <= 1);
    assert.equal(result.paused, true);
    assert.equal(result.seeks, 0);
  }
});

test('Retina and zoom-scaled mouse notches retain continuous decoding and the same pace', () => {
  for (const pixelRatio of [1.25,1.5,2,3]) {
    const result=simulate({magnitude:100/pixelRatio,pixelRatio,interval:283,inputMs:5000});
    assert.ok(result.starts<=2,`${pixelRatio}x screen restarted ${result.starts} times`);
    assert.ok(result.source>5&&result.source<=5+walkingScene.secondsPerScroll,`${pixelRatio}x screen advanced ${result.source}s`);
    assert.ok(result.maximumActiveRate<=1);
    assert.equal(result.paused,true);
    assert.equal(result.seeks,0);
  }
});

test('rapid input keeps a bounded runway and release discards the remaining queue', () => {
  const journey = createJourney();
  for (let i = 0; i < 120; i++) {
    journey.wheel(i * 16);
    journey.frame(i * 16);
    const state = journey.snapshot();
    assert.ok(state.target - state.source <= walkingScene.secondsPerScroll + 1e-8);
  }
  journey.release(1920);
  const stopped = journey.snapshot();
  journey.frame(3000);
  assert.equal(journey.snapshot().source, stopped.source);
  assert.equal(stopped.target, stopped.source);
  assert.equal(stopped.seeks, 0);
});

test('fine drag packets deliver a first frame without repeated decoder restarts', () => {
  const journey = createJourney();
  for (let i = 0; i < 120; i++) {
    const now = i * 1000 / 60;
    journey.advance(now);
    journey.context.manual(1 / 90, true);
    journey.frame(now);
  }
  const moving = journey.snapshot();
  assert.equal(moving.starts, 1);
  assert.equal(moving.stops, 0);
  assert.ok(moving.source > 1.8 && moving.source < 2.5);
  journey.release(2000);
  const stopped = journey.snapshot();
  journey.frame(2500);
  assert.equal(journey.snapshot().source, stopped.source);
  assert.equal(stopped.seeks, 0);
});

test('very gentle sustained input maintains the same continuous pace as strong input', () => {
  for (const frameRate of [30, 60, 120]) {
    const gentle = simulate({magnitude: .5, interval: 16, frameRate});
    const strong = simulate({magnitude: 40, interval: 16, frameRate});
    assert.ok(Math.abs(gentle.source - strong.source) < .05);
    assert.ok(gentle.source > 10);
    assert.ok(gentle.maximumActiveRate <= 1);
    assert.equal(gentle.paused, true);
    assert.equal(gentle.seeks, 0);
  }
});

test('a long momentum tail cannot extend or restart the one committed wheel step', () => {
  const journey = createJourney();
  for (const [i, magnitude] of [40, 28, 20, 12, 7, 3, 1].entries()) {
    journey.wheel(i * 16, -magnitude);
    journey.frame(i * 16);
  }
  const committedTarget = journey.snapshot().target;
  let stopped = null;
  for (let time = 112; time <= 6000; time += 16) {
    journey.wheel(time, -1);
    journey.frame(time);
    assert.equal(journey.snapshot().target, committedTarget);
    if (stopped) assert.equal(journey.snapshot().source, stopped.source);
    if (journey.snapshot().paused) stopped = journey.snapshot();
  }
  assert.ok(stopped, 'the finite step settles even while momentum events keep arriving');
  assert.equal(stopped.starts, 1);
  assert.equal(stopped.seeks, 0);
});

test('reversing direction discards the old forward queue before any new frame', () => {
  const journey = createJourney();
  journey.wheel(0);
  journey.frame(100);
  journey.wheel(110, 100);
  const state = journey.snapshot();
  assert.ok(state.source > 0);
  assert.equal(state.target, 0);
  assert.equal(state.paused, true);
  assert.equal(journey.context.walkingDirection, -1);
});

test('authored turns and approaches remain independent of manual release deadlines', () => {
  for (const idleMs of [120, 240]) {
    assert.equal(manualScrollHoldTime({scene: walkingScene, currentTime: 4, lastInputAt: 0, now: 1000, idleMs, automatic: true}), null);
    assert.equal(manualScrollHoldTime({scene: walkingScene, currentTime: 4, lastInputAt: 0, now: 1000, idleMs, automatic: true, released: true}), null);
  }
});

test('three small trackpad fluctuations do not freeze a continuing gesture', () => {
  const journey = createJourney();
  for (const [i, magnitude] of [6, 5.9, 5.8, 5.7].entries()) {
    journey.wheel(i * 16, -magnitude);
    journey.frame(i * 16);
  }
  for (let time = 64; time <= 2000; time += 16) {
    journey.wheel(time, -5.7);
    journey.frame(time);
    assert.equal(journey.snapshot().paused, false);
  }
  assert.ok(journey.snapshot().source > 1.8 && journey.snapshot().source <= 2);
  assert.equal(journey.snapshot().seeks, 0);
});

test('continuous decoding respects maxPlaybackRate even if an older cruise value is higher', () => {
  const scene={...walkingScene,scrollCruiseRate:2.4,maxPlaybackRate:1};
  let rate=2.4;
  for(let i=0;i<120;i++){
    rate=continuousScrollRate(10,1/60,rate,scene,100);
    assert.ok(rate<=1);
  }
  const journey=createJourney({scene});
  journey.context.manual(1,true);
  assert.ok(journey.video.playbackRate<=1,'the first input handler cannot bypass the cap');
});

test('a zero elapsed display frame cannot seek to a queued walking destination', () => {
  const journey = createJourney();
  journey.wheel(0);
  journey.frame(0, 0);
  assert.equal(journey.snapshot().source, 0);
  assert.equal(journey.snapshot().seeks, 0);
  assert.equal(journey.snapshot().paused, false);
  assert.equal(journey.context.current.settledTarget, null);
});

test('arriving within one source frame pauses without flushing the decoder', () => {
  const journey = createJourney();
  journey.wheel(0);
  journey.context.target = .08;
  journey.frame(100);
  const stopped = journey.snapshot();
  assert.equal(stopped.paused, true);
  assert.equal(stopped.seeks, 0);
  assert.ok(stopped.source < .08);
  assert.equal(journey.context.current.settledTarget, .08);
});

test('reverse seeks complete source frames instead of every display frame', () => {
  const journey = createJourney({scene: {...walkingScene, fps: 24}});
  journey.wheel(0);
  journey.frame(100);
  journey.context.local = 5;
  journey.video.currentTime = 5;
  journey.wheel(100, 100);
  const before = journey.snapshot();
  journey.frame(100 + 1000 / 120, 1 / 120);
  assert.equal(journey.snapshot().seeks, before.seeks);
  for (let n = 2; n <= 12; n++) journey.frame(100 + n * 1000 / 120, 1 / 120);
  const result = journey.snapshot();
  assert.ok(result.seeks - before.seeks >= 2 && result.seeks - before.seeks <= 4);
  assert.ok(result.source < 4.95 && result.source > 4.8);
});

test('a delayed reverse frame still finishes a destination just outside the frame tolerance', () => {
  const journey = createJourney({scene: {...walkingScene, fps: 24}});
  journey.wheel(0);
  journey.context.local = 5;
  journey.video.currentTime = 5;
  journey.wheel(0, 100);
  journey.context.target = 4.95;
  journey.context.reverseElapsed = .25;
  const before = journey.snapshot().seeks;
  journey.frame(16);
  assert.equal(journey.snapshot().seeks, before + 1);
  assert.ok(journey.snapshot().source < 5);
});
