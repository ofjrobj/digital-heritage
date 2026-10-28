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

function simulate({magnitude = 100, interval = 250, inputMs = 10000, endMs = inputMs + 500, frameRate = 60, pixelRatio = 1} = {}) {
  const journey = createJourney({pixelRatio});
  const events = [];
  for (let time = 0; time < inputMs; time += interval) events.push([time, 'wheel']);
  for (let frame = 0; frame <= Math.ceil(endMs * frameRate / 1000); frame++) events.push([frame * 1000 / frameRate, 'frame']);
  events.sort((a, b) => a[0] - b[0] || (a[1] === 'wheel' ? -1 : 1));
  let minimumActiveRate = Infinity;
  for (const [time, kind] of events) {
    if (kind === 'wheel') journey.wheel(time, -magnitude);
    else {
      journey.frame(time, 1 / frameRate);
      const state = journey.snapshot();
      if (!state.paused) minimumActiveRate = Math.min(minimumActiveRate, state.rate);
    }
  }
  return {...journey.snapshot(), minimumActiveRate};
}

test('a mouse notch moves visibly, then stops without seeking or consuming the queued target', () => {
  const journey = createJourney();
  journey.wheel(0);
  journey.frame(239, .016);
  assert.equal(journey.snapshot().paused, false);
  journey.frame(240, .001);
  const stopped = journey.snapshot();
  assert.equal(stopped.paused, true);
  assert.ok(stopped.source >= .34 && stopped.source <= .37, `${stopped.source} source seconds`);
  assert.equal(stopped.target, stopped.source);
  assert.equal(stopped.seeks, 0);
  journey.frame(1000);
  assert.equal(journey.snapshot().source, stopped.source);
});

test('trackpad idle and explicit release retain the short stopping response', () => {
  const journey = createJourney();
  journey.wheel(0, -8);
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

test('ordinary mouse-wheel cadence advances at least three times the old baseline', () => {
  const result = simulate();
  assert.ok(result.source > 4.433 * 3, `${result.source} source seconds after ten seconds of input`);
  assert.ok(result.source <= walkingScene.scrollCruiseRate * 10.1);
  assert.equal(result.paused, true);
  assert.equal(result.seeks, 0);
});

test('repeated mouse notches stay in native playback instead of restarting on every notch', () => {
  for (const interval of [275, 300, 350, 400]) {
    const result = simulate({interval, inputMs: 5000});
    assert.ok(result.starts <= 2, `${interval}ms cadence restarted ${result.starts} times`);
    assert.ok(result.source > 7.4 && result.source < 8.1);
    assert.equal(result.paused, true);
    assert.equal(result.seeks, 0);
  }
});

test('Retina and zoom-scaled mouse notches retain continuous decoding and the same pace', () => {
  for (const pixelRatio of [1.25,1.5,2,3]) {
    const result=simulate({magnitude:100/pixelRatio,pixelRatio,interval:283,inputMs:5000});
    assert.ok(result.starts<=2,`${pixelRatio}x screen restarted ${result.starts} times`);
    assert.ok(result.source>7.4&&result.source<8.1,`${pixelRatio}x screen advanced ${result.source}s`);
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
    assert.ok(gentle.minimumActiveRate >= walkingScene.scrollCruiseRate * .95);
    assert.ok(gentle.source >= 14.9);
    assert.equal(gentle.paused, true);
    assert.equal(gentle.seeks, 0);
  }
});

test('a long momentum tail cannot restart a released frame', () => {
  const journey = createJourney();
  for (const [i, magnitude] of [40, 28, 20, 12, 7, 3, 1].entries()) {
    journey.wheel(i * 16, -magnitude);
    journey.frame(i * 16);
  }
  journey.frame(160);
  const stopped = journey.snapshot();
  assert.equal(stopped.paused, true);
  for (let time = 176; time <= 1000; time += 16) {
    journey.wheel(time, -1);
    journey.frame(time);
    assert.equal(journey.snapshot().source, stopped.source);
    assert.equal(journey.snapshot().paused, true);
  }
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
  assert.ok(journey.snapshot().source > 2.9);
  assert.equal(journey.snapshot().seeks, 0);
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
  journey.context.target = .17;
  journey.frame(100);
  const stopped = journey.snapshot();
  assert.equal(stopped.paused, true);
  assert.equal(stopped.seeks, 0);
  assert.ok(stopped.source < .17);
  assert.equal(journey.context.current.settledTarget, .17);
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
