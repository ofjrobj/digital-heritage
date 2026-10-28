import test from 'node:test';
import assert from 'node:assert/strict';
import {createWalkingInput} from '../assets/walking-input.js';

const wheel = (deltaY, extra = {}) => ({deltaY, deltaX: 0, deltaMode: 0, ...extra});
const gestureInput = () => createWalkingInput({oneStepPerGesture: true});

test('gentle sustained trackpad packets keep manual movement active', () => {
  for (const magnitude of [.5, 2, 8, 11]) {
    const input = gestureInput();
    assert.equal(input.wheelGestureSteps(wheel(-magnitude), 0), 1);
    for (let now = 16; now <= 1000; now += 16) {
      input.wheelGestureSteps(wheel(-magnitude), now);
      assert.equal(input.lastActiveAt(), now, `steady ${magnitude}px packet at ${now}ms`);
    }
  }
});

test('gentle movement preserves bounded steps instead of one step per packet', () => {
  const input = gestureInput();
  const accepted = [];
  for (let now = 0; now <= 1500; now += 16) {
    if (input.wheelGestureSteps(wheel(-2), now)) accepted.push(now);
  }
  assert.deepEqual(accepted, [0, 432, 864, 1296]);
});

test('sustained decay and its rounded tail stop renewing movement', () => {
  const input = gestureInput();
  assert.equal(input.wheelGestureSteps(wheel(-8), 0), 1);
  for (const [i, magnitude] of [7, 6, 5, 4, 3, 2, 1, 1, 1, 1].entries()) {
    assert.equal(input.wheelGestureSteps(wheel(-magnitude), (i + 1) * 16), 0);
    // Two falling packets may still be direct input; the third establishes decay.
    assert.equal(input.lastActiveAt(), Math.min((i + 1) * 16, 32));
  }
});

test('renewed direct input resumes within the old gesture after momentum', () => {
  const input = gestureInput();
  for (const [i, magnitude] of [12, 8, 4, 1].entries()) input.wheelGestureSteps(wheel(-magnitude), i * 16);
  assert.equal(input.lastActiveAt(), 32);
  assert.equal(input.wheelGestureSteps(wheel(-3), 64), 0);
  assert.equal(input.lastActiveAt(), 64);
  input.wheelGestureSteps(wheel(-3), 80);
  assert.equal(input.lastActiveAt(), 80);
});

test('direction reversal and a quiet interval each begin a new step', () => {
  const input = gestureInput();
  assert.equal(input.wheelGestureSteps(wheel(-2), 0), 1);
  assert.equal(input.wheelGestureSteps(wheel(2), 16), -1);
  assert.equal(input.wheelGestureSteps(wheel(2), 32), 0);
  assert.equal(input.wheelGestureSteps(wheel(2), 252), -1);
  assert.equal(input.lastActiveAt(), 252);
});

test('discrete mouse notches remain immediate and independent', () => {
  for (const event of [wheel(-100), wheel(-120), wheel(-3, {deltaMode: 1}), wheel(-1, {deltaMode: 2})]) {
    const input = gestureInput();
    for (const now of [0, 16, 32]) {
      assert.equal(input.wheelGestureSteps(event, now), 1);
      assert.equal(input.lastActiveAt(), now);
    }
  }
});

test('reset preserves the gesture and momentum guards across scene changes', () => {
  const input = gestureInput();
  for (const [i, magnitude] of [8, 6, 4, 2].entries()) input.wheelGestureSteps(wheel(-magnitude), i * 16);
  input.reset();
  assert.equal(input.lastActiveAt(), -Infinity);
  assert.equal(input.wheelGestureSteps(wheel(-2), 64), 0);
  assert.equal(input.lastActiveAt(), -Infinity);
  assert.equal(input.wheelGestureSteps(wheel(-2), 284), 1);
});

test('a small decrease followed by steady direct input does not latch momentum', () => {
  const input = gestureInput();
  input.wheelGestureSteps(wheel(-8), 0);
  for (let now = 16; now <= 1000; now += 16) {
    input.wheelGestureSteps(wheel(-7), now);
    assert.equal(input.lastActiveAt(), now);
  }
});

test('a long rounded momentum tail never spends a new timed step', () => {
  const input = gestureInput();
  for (const [i, magnitude] of [40, 28, 20, 12, 7, 3, 1].entries()) input.wheelGestureSteps(wheel(-magnitude), i * 16);
  for (let now = 112; now < 1000; now += 16) {
    assert.equal(input.wheelGestureSteps(wheel(-1), now), 0);
    assert.equal(input.lastActiveAt(), 32);
  }
});

test('discrete wheel and direct trackpad packets expose their own release windows', () => {
  const input = gestureInput();
  input.wheelGestureSteps(wheel(-100), 0);
  assert.equal(input.releaseDelayMs(), 240);
  input.wheelGestureSteps(wheel(-2), 250);
  assert.equal(input.releaseDelayMs(), 120);
  input.wheelGestureSteps(wheel(-3, {deltaMode: 1}), 500);
  assert.equal(input.releaseDelayMs(), 240);
  input.wheelGestureSteps(wheel(-2, {ctrlKey: true}), 510);
  assert.equal(input.releaseDelayMs(), 240);
});

test('repeated mouse notches learn a bounded cadence without extending isolated input', () => {
  const input = gestureInput();
  for (const [now, delay] of [[0, 240], [300, 360], [650, 410], [1050, 420], [2000, 240]]) {
    assert.equal(input.wheelGestureSteps(wheel(-100), now), 1);
    assert.equal(input.releaseDelayMs(), delay);
  }
  input.wheelGestureSteps(wheel(-2), 2016);
  assert.equal(input.releaseDelayMs(), 120, 'trackpad release remains immediate');
  input.wheelGestureSteps(wheel(-100), 2200);
  assert.equal(input.releaseDelayMs(), 240, 'another input device starts with an isolated notch');
});

test('a scene handoff clears the learned mouse cadence', () => {
  const input = gestureInput();
  input.wheelGestureSteps(wheel(-100), 0);
  input.wheelGestureSteps(wheel(-100), 350);
  assert.equal(input.releaseDelayMs(), 410);
  input.reset();
  input.wheelGestureSteps(wheel(-100), 700);
  assert.equal(input.releaseDelayMs(), 240);
});

test('zoom, horizontal and invalid packets do not consume or renew a gesture', () => {
  const input = gestureInput();
  for (const event of [wheel(-2, {ctrlKey: true}), wheel(-2, {deltaX: 3}), wheel(0), wheel(NaN), wheel(-2, {deltaMode: 3})]) {
    assert.equal(input.wheelGestureSteps(event, 0), 0);
    assert.equal(input.lastActiveAt(), -Infinity);
  }
  assert.equal(input.wheelGestureSteps(wheel(-2), NaN), 0);
  assert.equal(input.wheelGestureSteps(wheel(-2), 16), 1);
});

test('continuous input mode keeps proportional pixel, line and page distances', () => {
  const input = createWalkingInput();
  assert.equal(input.wheelGestureSteps(wheel(-2), 0), .02);
  assert.equal(input.wheelGestureSteps(wheel(-3, {deltaMode: 1}), 16), 1);
  assert.equal(input.wheelGestureSteps(wheel(-1, {deltaMode: 2}), 32), 6);
  assert.equal(input.lastActiveAt(), 32);
});

test('three minor decreases followed by a plateau remain direct input', () => {
  for (const start of [0.5, 6, 40]) {
    const input = gestureInput();
    for (let i = 0; i < 4; i++) {
      input.wheelGestureSteps(wheel(-start * (1 - i * .02)), i * 16);
      assert.equal(input.lastActiveAt(), i * 16);
    }
    for (let now = 64; now <= 1000; now += 16) {
      input.wheelGestureSteps(wheel(-start * .94), now);
      assert.equal(input.lastActiveAt(), now);
    }
  }
});
