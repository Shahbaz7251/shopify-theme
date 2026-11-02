FTP.register('chip-rain', (el, env) => {
  if (!env.scenes) return undefined;
  const { $, $$, gsap } = env;
  const stage = $('[data-rain-stage]', el);
  el.classList.add('is-live');
  const tl = gsap.timeline({
    scrollTrigger: { trigger: el, start: 'top top', end: 'bottom bottom', scrub: 0.3, invalidateOnRefresh: true },
  });
  $$('[data-rain-chip]', el).forEach((chip, i) => {
    const seed = (i * 37) % 11;
    tl.fromTo(
      chip,
      { y: () => -(stage.clientHeight + chip.offsetHeight + seed * 26), rotation: -120 - seed * 40 },
      { y: 0, rotation: seed * 22 - 60, duration: 1, ease: 'none' },
      (i % 7) * 0.09
    );
  });
  tl.to({}, { duration: 0.2 });
  return () => el.classList.remove('is-live');
});

FTP.register('story-list', (el, env) => {
  const { $, $$, gsap } = env;
  const body = $('[data-story-body]', el);
  const frame = $('[data-story-frame]', el);
  const rows = $$('[data-story-row]', el);
  const wide = matchMedia('(hover: hover) and (pointer: fine) and (min-width: 900px)');
  const abort = new AbortController();
  const on = { signal: abort.signal };
  let current = null;

  const show = (row) => {
    if (!wide.matches || !frame || !row) return;
    if (row !== current) {
      const thumb = $('[data-story-thumb]', row);
      if (thumb) frame.innerHTML = thumb.innerHTML;
      current = row;
    }
    const y = row.offsetTop + row.offsetHeight / 2 - frame.offsetHeight / 2;
    const max = Math.max(0, body.offsetHeight - frame.offsetHeight);
    const opening = !frame.classList.contains('is-open');
    if (opening) frame.style.transitionProperty = 'clip-path';
    frame.style.transform = `translateY(${Math.min(max, Math.max(0, y))}px)`;
    if (opening) {
      frame.getBoundingClientRect();
      frame.style.transitionProperty = '';
    }
    frame.classList.add('is-open');
  };

  rows.forEach((row) => {
    row.addEventListener('pointerenter', () => show(row), on);
    row.addEventListener('focus', () => show(row), on);
  });
  window.addEventListener('resize', () => show(current || rows[0]), on);
  wide.addEventListener('change', () => show(current || rows[0]), on);
  show(rows[0]);

  if (env.scenes) {
    gsap.from($$('[data-story-item]', el), {
      y: 24,
      opacity: 0,
      duration: 0.8,
      ease: 'expo.out',
      stagger: 0.07,
      scrollTrigger: { trigger: body, start: 'top 88%', once: true },
    });
  }
  return () => abort.abort();
});

FTP.register('inverted-close', (el, env) => {
  if (!env.scenes) return undefined;
  const { $$, gsap } = env;
  const tl = gsap.timeline({ scrollTrigger: { trigger: el, start: 'top 78%', once: true } });
  tl.fromTo($$('.ln > span', el), { yPercent: 108 }, { yPercent: 0, duration: 0.9, ease: 'expo.out', stagger: 0.11 }, 0);
  tl.fromTo($$('[data-close-rise]', el), { y: 20, opacity: 0 }, { y: 0, opacity: 1, duration: 0.7, ease: 'power3.out', stagger: 0.08 }, 0.25);
  return undefined;
});

FTP.register('site-footer', (el, env) => {
  const { $$, gsap } = env;
  const wrap = el.closest('.site-footer-wrap');
  const space = matchMedia('(min-width: 900px) and (min-height: 700px)');
  const fit = () => {
    if (!wrap) return;
    wrap.classList.toggle('is-curtain', !env.design && space.matches && el.offsetHeight <= window.innerHeight);
  };
  const watcher = new ResizeObserver(fit);
  watcher.observe(el);
  window.addEventListener('resize', fit);
  space.addEventListener('change', fit);
  fit();

  if (!env.calm) {
    const blocks = $$('[data-mark-block]', el);
    if (blocks.length) {
      gsap.from(blocks, {
        yPercent: 100,
        duration: 0.8,
        ease: 'expo.out',
        stagger: 0.04,
        scrollTrigger: { trigger: document.querySelector('main') || el, start: 'bottom 85%', once: true },
      });
    }
  }

  return () => {
    watcher.disconnect();
    window.removeEventListener('resize', fit);
    space.removeEventListener('change', fit);
    if (wrap) wrap.classList.remove('is-curtain');
  };
});
