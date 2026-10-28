// Content remains readable if motion is disabled or the observer is unavailable.
const motionPreference = matchMedia('(prefers-reduced-motion: reduce)');
if (!motionPreference.matches && 'IntersectionObserver' in window) {
 const sections = [...document.querySelectorAll('main > .hero, main > header, main > section')];
 const observer = new IntersectionObserver(entries => {
  entries.filter(entry => entry.isIntersecting).forEach((entry, index) => {
   entry.target.style.setProperty('--page-motion-delay', `${Math.min(index, 2) * 70}ms`);
   entry.target.classList.add('page-motion-in');
   observer.unobserve(entry.target);
  });
 }, {threshold: 0, rootMargin: '0px 0px -24px 0px'});
 sections.forEach(section => {
  section.classList.add('page-motion-ready');
  observer.observe(section);
 });
 motionPreference.addEventListener('change', event => {
  if (!event.matches) return;
  observer.disconnect();
  sections.forEach(section => section.classList.remove('page-motion-ready'));
 });
}
