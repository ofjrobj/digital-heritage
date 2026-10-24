// Reveal a drawing only once, without blocking access when motion is reduced.
(() => {
  if (!('IntersectionObserver' in window) || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const figures = document.querySelectorAll('.material-figure, .research-study, .ux-sketch, .case-study-illustration');
  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('is-visible');
      observer.unobserve(entry.target);
    });
  }, {threshold: 0.08});
  figures.forEach(figure => {
    figure.classList.add('case-study-reveal');
    observer.observe(figure);
  });
})();
