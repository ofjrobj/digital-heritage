// The renderer starts this invitation only after the first scene and fonts load.
export function createIntroEntry({body, welcome, recommendation, button, recommendationSeconds = 2, focusOnReady = true}) {
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

  function ready() {
    phase = 'ready';
    body.dataset.introEntry = phase;
    recommendation.hidden = true;
    button.hidden = false;
    button.disabled = false;
    if (focusOnReady) button.focus({preventScroll: true});
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
      if (recommendationSeconds <= 0) ready();
    },
    advance(seconds) {
      if (phase !== 'recommendation' || !Number.isFinite(seconds) || seconds <= 0) return;
      elapsed += seconds;
      if (elapsed < recommendationSeconds) return;
      ready();
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
