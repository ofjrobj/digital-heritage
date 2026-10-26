import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const source = readFileSync(new URL('../assets/test-render-media.js', import.meta.url), 'utf8');
function between(start, end) {
  const from = source.indexOf(start), to = source.indexOf(end, from + start.length);
  assert.ok(from >= 0 && to > from, `missing runtime boundary: ${start}`);
  return source.slice(from, to);
}

test('only the embedded dialogue permits direct scene navigation after arrival', () => {
  const requests = [];
  const context = vm.createContext({
    embeddedStory: true, entryAccepted: true, current: {loaded: true, scene: {mode: 'dialogue'}, startElapsed: 1.05},
    transition: null, paused: false, compare: false, finished: false, index: 1, scenes: [{}, {}, {}],
    sceneArrivalDelay: () => 1.05, requestScene(index) { requests.push(index); },
  });
  vm.runInContext(between('function canNavigateEmbeddedScene()', 'function scrollPositionAt('), context);
  assert.equal(context.navigateEmbeddedScene(1), true);
  assert.equal(context.navigateEmbeddedScene(-1), true);
  assert.deepEqual(requests, [2, 0]);
  for (const change of [
    () => {context.embeddedStory = false;},
    () => {context.entryAccepted = false;},
    () => {context.transition = {};},
    () => {context.paused = true;},
    () => {context.current.startElapsed = 1;},
    () => {context.current.scene.mode = 'scroll';},
  ]) {
    context.embeddedStory = true;context.entryAccepted = true;context.transition = null;context.paused = false;
    context.current.startElapsed = 1.05;context.current.scene.mode = 'dialogue';
    change();
    assert.equal(context.navigateEmbeddedScene(1), false);
  }
  assert.deepEqual(requests, [2, 0]);
});

test('wheel input is contained inside the preview even during automatic scenes, while zoom is preserved', () => {
  let handler;
  const context = vm.createContext({
    embeddedStory: true,
    stage: {addEventListener(type, callback) { if (type === 'wheel') handler = callback; }},
    performance: {now: () => 100},
    walkingInput: {wheelGestureSteps: () => 0, lastActiveAt: () => -Infinity},
    canWalk: () => false,
  });
  vm.runInContext(between("stage.addEventListener('wheel',", "canvas.addEventListener('pointerdown'"), context);
  let prevented = 0;
  const event = {deltaY: 2, ctrlKey: false, target: {closest: () => null}, preventDefault() { prevented++; }};
  handler(event);
  assert.equal(prevented, 1);
  handler({...event, ctrlKey: true});
  assert.equal(prevented, 1);
  context.embeddedStory = false;
  handler(event);
  assert.equal(prevented, 1);
});

test('the preview entry starts the real intro once, while the normal entry keeps its existing cover', () => {
  for (const embeddedStory of [true, false]) {
    let introStarts = 0, focused = 0;
    const button = {};
    const context = vm.createContext({
      $: () => button, embeddedStory, entryAccepted: false, transition: {phase: 'entry', record: {}},
      finished: false, sound: false, entryScreen: {accept: () => true},
      stage: {focus() { focused++; }}, enterFromIntro() { introStarts++; },
    });
    vm.runInContext(between("if($('introEnter'))", "if($('introWelcome'))"), context);
    button.onclick();button.onclick();
    assert.equal(context.entryAccepted, true);
    assert.equal(focused, 1);
    assert.equal(introStarts, embeddedStory ? 1 : 0);
  }
});

test('voice cannot be enabled by embedded scene updates', () => {
  const values = [];
  const context = vm.createContext({embeddedStory: true, lastVoiceEnable: null, voices: {setEnabled(value) { values.push(value); }}});
  vm.runInContext(between('function voiceEnabled(', 'function seasonUiInsets('), context);
  context.voiceEnabled(true);
  assert.deepEqual(values, [false]);
  context.embeddedStory = false;
  context.voiceEnabled(true);
  assert.deepEqual(values, [false, true]);
});

test('opening the embedded preview does not consume the main Story session state', () => {
  const touched = [];
  const context = vm.createContext({
    embeddedStory: true, entryGate: true, URLSearchParams, location: {search: '?embed=story'},
    sessionStorage: {getItem(key) { touched.push(key); }, removeItem(key) { touched.push(key); }},
  });
  vm.runInContext(between(' const freshIntro=', ' if(pendingIntroEntry&&'), context);
  assert.deepEqual(touched, []);
});

test('the embedded ending never creates or downloads the interactive Index frame', () => {
  let created = 0;
  const context = vm.createContext({embeddedStory: true, archiveFrame: null, document: {createElement() { created++; }}});
  vm.runInContext(between('function prepareArchive()', 'const videos='), context);
  context.prepareArchive();
  assert.equal(created, 0);
});
