// The renderer starts this invitation only after the first scene and fonts load.
export function createIntroEntry({body, welcome, recommendation, button}) {
  let phase = 'loading';
  let elapsed = 0;

  function reset() {
    phase = 'loading';
    elapsed = 0;
    body.dataset.introEntry = 'loading';
    welcome.hidden = true;
    welcome.inert = true;
    recommendation.hidden = true;
    button.hidden = true;
    button.disabled = true;
  }

  reset();
  return {
    reset,
    start() {
      if (phase !== 'loading') return;
      phase = 'recommendation';
      body.dataset.introEntry = phase;
      welcome.hidden = false;
      welcome.inert = false;
      recommendation.hidden = false;
    },
    advance(seconds) {
      if (phase !== 'recommendation' || !Number.isFinite(seconds) || seconds <= 0) return;
      elapsed += seconds;
      if (elapsed < 2) return;
      phase = 'ready';
      body.dataset.introEntry = phase;
      recommendation.hidden = true;
      button.hidden = false;
      button.disabled = false;
      button.focus({preventScroll: true});
    },
    accept() {
      if (phase !== 'ready' || button.disabled) return false;
      phase = 'accepted';
      button.disabled = true;
      body.dataset.introEntry = 'cover';
      welcome.inert = true;
      return true;
    },
  };
}
