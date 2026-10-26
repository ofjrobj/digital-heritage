import test from 'node:test';
import assert from 'node:assert/strict';
import {setPlaybackRate, holdPresentedFrame} from '../assets/video-playback.js';

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
