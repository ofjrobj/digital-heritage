// Wheel/drag bursts drive sound; camera easing and automatic scenes never do.
export function createScrollFootsteps(audio, allowed, clock=()=>performance.now()) {
  let deadline = 0, pending = false;
  audio.loop = true; audio.volume = .32;
  function stop() {
    deadline = 0;
    audio.pause();
    audio.dataset.active = 'false';
  }
  function tick() {
    if (!allowed() || clock() >= deadline) stop();
    else audio.volume = .32 * Math.min(1,(deadline-clock())/25);
  }
  function pulse() {
    if (!allowed()) { stop(); return; }
    deadline = clock() + 160; audio.volume = .32;
    if (audio.paused && !pending) {
      pending = true;
      // Each new gesture starts with a step; repeated wheel events never stack voices.
      audio.currentTime = 0;
      audio.play().then(() => {
        pending = false;
        if (!allowed() || clock() >= deadline) stop();
        else {audio.dataset.active = 'true';audio.dataset.starts=String(Number(audio.dataset.starts||0)+1);}
      }).catch(() => { pending = false; stop(); });
    }
  }
  return {pulse,tick,stop};
}
