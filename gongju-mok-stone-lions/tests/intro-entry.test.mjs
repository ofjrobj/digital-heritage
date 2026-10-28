import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {createIntroEntry} from '../assets/intro-entry.js';

test('a fresh intro URL still requires the invitation after the media-ready gate', () => {
  const runtime=readFileSync(new URL('../assets/test-render-media.js',import.meta.url),'utf8');
  const init=runtime.slice(runtime.indexOf('const embeddedStory='),runtime.indexOf('const walkingInput='));
  const screen=runtime.match(/const entryScreen=.*?;\n/)[0];
  for(const search of ['', '?start=intro', '?start=intro&preview=ux', '?embed=story&start=intro']){
    const nodes={introWelcome:{},introRecommendation:{},introEnter:{focus(){}}};
    const body={dataset:{},hasAttribute:name=>name==='data-intro-entry'};
    const context=vm.createContext({URLSearchParams,location:{search},document:{body,fonts:{ready:Promise.resolve()}},$:id=>nodes[id],createIntroEntry});
    vm.runInContext(init+screen+';globalThis.state={entryAccepted,entryScreen};',context);
    assert.equal(context.state.entryAccepted,false,search);
    assert.equal(nodes.introEnter.hidden,true,search);
    assert.equal(context.state.entryScreen.accept(),false,search);
    context.state.entryScreen.start();context.state.entryScreen.advance(2);
    assert.equal(nodes.introEnter.hidden,false,search);
    assert.equal(context.state.entryScreen.accept(),true,search);
  }
});

function invitation(options = {}) {
  const body = {dataset: {}};
  const welcome = {};
  const recommendation = {};
  const button = {focusCount: 0, focus() { this.focusCount++; }};
  const entry = createIntroEntry({body, welcome, recommendation, button, ...options});
  return {entry, body, welcome, recommendation, button};
}

test('loading cannot be skipped by clicks or elapsed time before media is ready', () => {
  const {entry, body, welcome, button} = invitation();
  entry.advance(10);
  assert.equal(entry.accept(), false);
  assert.equal(body.dataset.introEntry, 'loading');
  assert.equal(welcome.hidden, true);
  assert.equal(button.disabled, true);
  assert.equal(button.focusCount, 0);
});

test('embedded entry waits for readiness without taking focus from the containing page', () => {
  const {entry, body, welcome, recommendation, button} = invitation({recommendationSeconds: 0, focusOnReady: false});
  assert.equal(welcome.hidden, true);
  assert.equal(entry.accept(), false);
  entry.start();
  assert.equal(body.dataset.introEntry, 'ready');
  assert.equal(recommendation.hidden, true);
  assert.equal(button.disabled, false);
  assert.equal(button.focusCount, 0);
  assert.equal(entry.accept(), true);
});

test('ready media shows the recommendation for two visible seconds before enabling entry', () => {
  const {entry, body, welcome, recommendation, button} = invitation();
  entry.start();
  assert.equal(body.dataset.introEntry, 'recommendation');
  assert.equal(welcome.hidden, false);
  assert.equal(recommendation.hidden, false);
  assert.equal(button.hidden, true);
  entry.advance(1.99);
  assert.equal(entry.accept(), false);
  entry.advance(0); // Hidden tabs provide no visible frame time.
  assert.equal(body.dataset.introEntry, 'recommendation');
  entry.advance(.02);
  assert.equal(body.dataset.introEntry, 'ready');
  assert.equal(recommendation.hidden, true);
  assert.equal(button.hidden, false);
  assert.equal(button.disabled, false);
  assert.equal(button.focusCount, 1);
  entry.advance(10);
  assert.equal(button.focusCount, 1);
});

test('repeated ready notifications do not restart the recommendation', () => {
  const {entry, body} = invitation();
  entry.start();
  entry.advance(1);
  entry.start();
  entry.advance(1);
  assert.equal(body.dataset.introEntry, 'ready');
});

test('an accepted click is consumed only once and removes the invitation from interaction', () => {
  const {entry, body, welcome, button} = invitation();
  entry.start();
  entry.advance(2);
  assert.equal(entry.accept(), true);
  assert.equal(entry.accept(), false);
  assert.equal(body.dataset.introEntry, 'cover');
  assert.equal(welcome.inert, true);
  assert.equal(button.disabled, true);
  entry.start();
  entry.advance(10);
  assert.equal(body.dataset.introEntry, 'cover');
});

test('an error hides either invitation state and retry gets the complete recommendation', () => {
  for (const elapsed of [1, 2]) {
    const {entry, body, welcome, recommendation, button} = invitation();
    entry.start();
    entry.advance(elapsed);
    entry.reset();
    assert.equal(body.dataset.introEntry, 'loading');
    assert.equal(welcome.hidden, true);
    assert.equal(recommendation.hidden, true);
    assert.equal(button.hidden, true);
    assert.equal(entry.accept(), false);
    entry.start();
    entry.advance(1);
    assert.equal(body.dataset.introEntry, 'recommendation');
    entry.advance(1);
    assert.equal(body.dataset.introEntry, 'ready');
  }
});
