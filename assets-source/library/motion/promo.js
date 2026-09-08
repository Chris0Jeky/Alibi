(() => {
  const root = document.querySelector('#root');
  const tl = gsap.timeline({ paused: true, defaults: { ease: 'power3.out' } });
  window.__timelines = window.__timelines || {};
  const scenes = [...root.querySelectorAll('.scene')];
  scenes.forEach((scene) => {
    const start = Number(scene.dataset.start || 0);
    const duration = Number(scene.dataset.duration || 1);
    const fadeInAt = start === 0 ? 0 : Math.max(0, start - 0.42);
    if (start === 0) tl.set(scene, { autoAlpha: 1 }, 0);
    else tl.fromTo(scene, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.42 }, fadeInAt);
    tl.to(scene, { autoAlpha: 0, duration: 0.38, ease: 'power2.in' }, Math.max(start + duration - 0.42, start + 0.1));
  });
  root.querySelectorAll('[data-enter]').forEach((el) => {
    const at = Number(el.dataset.at || 0);
    const from = el.dataset.enter === 'left' ? { x: -70, y: 10, autoAlpha: 0 } : el.dataset.enter === 'right' ? { x: 70, y: 10, autoAlpha: 0 } : el.dataset.enter === 'up' ? { y: 65, autoAlpha: 0 } : { y: 38, autoAlpha: 0 };
    tl.fromTo(el, from, { x: 0, y: 0, autoAlpha: 1, duration: 0.72, ease: el.dataset.ease || 'power3.out' }, at);
  });
  root.querySelectorAll('[data-drift]').forEach((el) => {
    const at = Number(el.dataset.at || 0);
    const end = Number(el.dataset.driftEnd || root.dataset.duration || 1);
    tl.fromTo(el, { x: 0, y: 0, rotation: -2, scale: 1 }, { x: Number(el.dataset.dx || 20), y: Number(el.dataset.dy || -12), rotation: Number(el.dataset.rotate || 2), scale: Number(el.dataset.scale || 1.03), duration: Math.max(.8, end - at), ease: 'sine.inOut' }, at);
  });
  root.querySelectorAll('[data-grow]').forEach((el) => {
    const at = Number(el.dataset.at || 0);
    tl.fromTo(el, { scaleX: 0, transformOrigin: 'left center' }, { scaleX: 1, duration: 0.75, ease: 'power2.out' }, at);
  });
  scenes.forEach((scene) => {
    const start = Number(scene.dataset.start || 0);
    tl.set(scene.querySelectorAll('[data-enter]'), { autoAlpha: 1, x: 0, y: 0 }, start);
  });
  window.__timelines[root.dataset.compositionId] = tl;
})();

