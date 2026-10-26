import test from 'node:test';
import assert from 'node:assert/strict';
import {setPlaybackRate, holdPresentedFrame, reverseFrameStep, createPresentedFrameClock} from '../assets/video-playback.js';

test('release holds forward playback without seeking or rounding backwards', () => {
  let time = 2.087, seeks = 0, paused = false;
  const video = {seeking:false, pause(){paused=true;},
    get currentTime(){return time;}, set currentTime(value){time=value;seeks++;}};
  const record = {video, clipIn:1, lastDecodedTime:2.05};
  assert.ok(Math.abs(holdPresentedFrame(record, 10) - 1.087) < 1e-12);
  assert.equal(time, 2.087);
  assert.equal(seeks, 0);
  assert.equal(paused, true);
});

test('release cancels an in-flight reverse seek at the last visible source frame', () => {
  const video = {seeking:true, currentTime:4, pause(){}};
  const record = {video, clipIn:1, lastDecodedTime:5.1};
  assert.equal(holdPresentedFrame(record, 10), 4.1);
  assert.equal(video.currentTime, 5.1);
});

test('stable native cadence makes no redundant playback rate writes', () => {
  let rate=1, writes=0;
  const video = {get playbackRate(){return rate;}, set playbackRate(value){rate=value;writes++;}};
  for(let i=0;i<600;i++)setPlaybackRate(video,1);
  assert.equal(writes,0);
  setPlaybackRate(video,.9);
  assert.equal(writes,1);
  for(let i=0;i<60;i++)setPlaybackRate(video,.901);
  assert.equal(writes,1);
  setPlaybackRate(video,.995);
  assert.equal(rate,1);
  setPlaybackRate(video,0);
  setPlaybackRate(video,NaN);
  assert.equal(writes,2);
});

test('reverse pacing preserves the intended source speed across display refresh rates', () => {
  for (const hz of [30, 60, 120]) {
    let time = 10, remaining = 0, seeks = 0;
    for (let i = 0; i < hz; i++) {
      const step = reverseFrameStep(time, 0, remaining + 1 / hz, 1.5, 24);
      if (step.time !== time) seeks++;
      time = step.time; remaining = step.remaining;
    }
    assert.ok(Math.abs(time - 8.5) < 1e-8, `${hz}Hz: ${time}`);
    assert.ok(seeks <= 36);
  }
});

test('a slow reverse decoder cannot catch up by skipping a large camera segment', () => {
  const step = reverseFrameStep(10, 0, .25, 1.5, 24);
  assert.ok(Math.abs(step.time - (10 - 2 / 24)) < 1e-8);
  assert.ok(step.remaining < 1 / (24 * 1.5));
  assert.deepEqual(reverseFrameStep(10, 0, 0, 1.5, 24), {time: 10, remaining: 0});
});

test('the presentation key changes for decoded frames and seeks, not the playback clock', () => {
  const events = new Map(); let next = 1; const callbacks = new Map();
  const video = {currentTime: 0,
    addEventListener(name, callback) {events.set(name, callback);},
    requestVideoFrameCallback(callback) {const id=next++;callbacks.set(id,callback);return id;},
    cancelVideoFrameCallback(id) {callbacks.delete(id);},
  };
  const clock = createPresentedFrameClock();
  assert.equal(clock.key(video), 0);
  for (let i=0;i<10;i++) {video.currentTime+=.005;assert.equal(clock.key(video),0);}
  const [id, callback] = callbacks.entries().next().value; callbacks.delete(id);callback();
  assert.equal(clock.key(video), 1);
  assert.equal(callbacks.size, 1);
  events.get('seeked')(); assert.equal(clock.key(video), 2);
  events.get('emptied')(); assert.equal(clock.key(video), 3); assert.equal(callbacks.size, 0);
  events.get('loadeddata')(); assert.equal(clock.key(video), 4); assert.equal(callbacks.size, 1);
});

test('video implementations without presentation callbacks retain their playback clock fallback', () => {
  const video={currentTime:2},clock=createPresentedFrameClock();
  assert.equal(clock.key(video),2);video.currentTime=2.1;assert.equal(clock.key(video),2.1);
});
