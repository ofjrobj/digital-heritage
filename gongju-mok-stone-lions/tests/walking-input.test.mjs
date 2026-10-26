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
  assert.deepEqual(accepted, [0, 1440]);
});

test('decaying momentum and its rounded tail do not renew movement', () => {
  const input = gestureInput();
  assert.equal(input.wheelGestureSteps(wheel(-8), 0), 1);
  for (const [i, magnitude] of [7, 6, 5, 4, 3, 2, 1, 1, 1, 1].entries()) {
    assert.equal(input.wheelGestureSteps(wheel(-magnitude), (i + 1) * 16), 0);
    assert.equal(input.lastActiveAt(), 0);
  }
});

test('renewed direct input resumes within the old gesture after momentum', () => {
  const input = gestureInput();
  input.wheelGestureSteps(wheel(-8), 0);
  input.wheelGestureSteps(wheel(-4), 16);
  input.wheelGestureSteps(wheel(-1), 32);
  assert.equal(input.wheelGestureSteps(wheel(-3), 48), 0);
  assert.equal(input.lastActiveAt(), 48);
  input.wheelGestureSteps(wheel(-3), 64);
  assert.equal(input.lastActiveAt(), 64);
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
  input.wheelGestureSteps(wheel(-8), 0);
  input.wheelGestureSteps(wheel(-4), 16);
  input.reset();
  assert.equal(input.lastActiveAt(), -Infinity);
  assert.equal(input.wheelGestureSteps(wheel(-4), 32), 0);
  assert.equal(input.lastActiveAt(), -Infinity);
  assert.equal(input.wheelGestureSteps(wheel(-4), 252), 1);
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
