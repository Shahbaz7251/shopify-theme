(() => {
  if (!window.FTP) return;

  const countUp = (el, gsap, delay) => {
    const original = el.textContent;
    const match = original.match(/^([^\d]*)([\d,]*\.?\d+)(.*)$/);
    if (!match) return () => {};
    const [, pre, num, post] = match;
    const end = parseFloat(num.replace(/,/g, ''));
    const decimals = (num.split('.')[1] || '').length;
    const commas = num.includes(',');
    const format = (v) => {
      const fixed = v.toFixed(decimals);
      return commas ? Number(fixed).toLocaleString('en-US', { minimumFractionDigits: decimals }) : fixed;
    };
    const o = { v: 0 };
    el.textContent = pre + format(0) + post;
    gsap.to(o, {
      v: end,
      duration: 1.1,
      delay,
      ease: 'expo.out',
      onUpdate() {
        el.textContent = pre + format(o.v) + post;
      },
      onComplete() {
        el.textContent = original;
      },
    });
    return () => {
      el.textContent = original;
    };
  };

  window.FTP.register('hero-peek', (el, env) => {
    const { gsap, $, $$, calm, fine, scenes } = env;
    const off = [];
    const on = (target, type, fn) => {
      target.addEventListener(type, fn);
      off.push(() => target.removeEventListener(type, fn));
    };

    const opener = $('[data-video-open]', el);
    const dialog = $('[data-video-dialog]', el);
    if (opener && dialog) {
      const video = $('video', dialog);
      const closer = $('[data-video-close]', dialog);
      on(opener, 'click', () => {
        dialog.showModal();
        if (video) {
          const playing = video.play();
          if (playing && playing.catch) playing.catch(() => {});
        }
      });
      if (closer) on(closer, 'click', () => dialog.close());
      on(dialog, 'click', (e) => {
        if (e.target === dialog) dialog.close();
      });
      on(dialog, 'close', () => {
        if (video) video.pause();
        opener.focus({ preventScroll: true });
      });
    }

    if (!calm) {
      $$('[data-count]', el).forEach((figure) => off.push(countUp(figure, gsap, 0.35)));
    }

    if (!calm && fine) {
      const leans = $$('[data-lean]', el).map((lean) => ({
        lean,
        rotate: gsap.quickTo(lean, 'rotation', { duration: 0.7, ease: 'power3.out' }),
        shift: gsap.quickTo(lean, 'x', { duration: 0.7, ease: 'power3.out' }),
        centre: 0,
      }));
      const measure = () =>
        leans.forEach((item) => {
          const box = item.lean.parentElement.getBoundingClientRect();
          item.centre = box.left + box.width / 2;
        });
      on(el, 'pointerenter', measure);
      on(el, 'pointermove', (e) =>
        leans.forEach((item) => {
          const d = (e.clientX - item.centre) / innerWidth;
          item.rotate(d * 8);
          item.shift(d * 26);
        }),
      );
      on(el, 'pointerleave', () =>
        leans.forEach((item) => {
          item.rotate(0);
          item.shift(0);
        }),
      );
    }

    if (scenes) {
      const duck = gsap.timeline({
        scrollTrigger: { trigger: el, start: 'bottom 72%', end: 'bottom 12%', scrub: true, invalidateOnRefresh: true },
      });
      duck.to($$('[data-duck]', el), { yPercent: 70, ease: 'none', stagger: 0.05, duration: 1 }, 0);
      $$('[data-peek]', el).forEach((peek) => {
        const lap = () => -parseFloat(getComputedStyle(peek).marginBottom) || 0;
        duck.fromTo(
          peek,
          { clipPath: 'inset(0px 0px 0px 0px)' },
          { clipPath: () => `inset(0px 0px ${lap()}px 0px)`, ease: 'none', duration: 0.12 },
          0,
        );
      });
    }

    return () => off.forEach((fn) => fn());
  });

  window.FTP.register('quotes-marquee', (el, env) => {
    const { gsap, ScrollTrigger, $, calm, fine } = env;
    if (calm) return undefined;
    const track = $('[data-track]', el);
    const group = $('[data-group]', el);
    if (!track || !group || !group.children.length) return undefined;

    el.classList.add('is-moving');
    const clones = [];
    let tween = null;
    let dir = 1;
    let inView = true;
    let hovering = false;
    let alive = true;

    const build = () => {
      if (!alive) return;
      if (tween) tween.kill();
      gsap.set(track, { x: 0 });
      const width = group.getBoundingClientRect().width;
      if (!width) return;
      while (clones.length < 1 || track.scrollWidth < innerWidth * 2 || track.scrollWidth < width + innerWidth) {
        const clone = group.cloneNode(true);
        clone.removeAttribute('data-group');
        clone.setAttribute('aria-hidden', 'true');
        clone.querySelectorAll('[data-shopify-editor-block]').forEach((n) => n.removeAttribute('data-shopify-editor-block'));
        track.append(clone);
        clones.push(clone);
      }
      const duration = width / 60;
      tween = gsap.to(track, { x: -width, duration, ease: 'none', repeat: -1 });
      tween.totalTime(duration * 100);
      if (hovering) tween.timeScale(0);
      else tween.timeScale(dir);
      if (!inView) tween.pause();
    };
    build();

    ScrollTrigger.create({
      trigger: el,
      start: 'top bottom',
      end: 'bottom top',
      onUpdate(self) {
        const v = self.getVelocity();
        if (!tween || hovering || Math.abs(v) < 5) return;
        dir = v < 0 ? -1 : 1;
        tween.timeScale(dir * (1 + Math.min(Math.abs(v) / 220, 7)));
        gsap.to(tween, { timeScale: dir, duration: 0.9, ease: 'power2.out', overwrite: true });
      },
    });

    const observer = new IntersectionObserver(([entry]) => {
      inView = entry.isIntersecting;
      if (!tween) return;
      if (inView) tween.play();
      else tween.pause();
    });
    observer.observe(el);

    const enter = () => {
      hovering = true;
      if (tween) gsap.to(tween, { timeScale: 0, duration: 0.3, overwrite: true });
    };
    const leave = () => {
      hovering = false;
      if (tween) gsap.to(tween, { timeScale: dir, duration: 0.3, overwrite: true });
    };
    if (fine) {
      el.addEventListener('pointerenter', enter);
      el.addEventListener('pointerleave', leave);
    }

    let lastWidth = innerWidth;
    let timer;
    const onResize = () => {
      if (innerWidth === lastWidth) return;
      lastWidth = innerWidth;
      clearTimeout(timer);
      timer = setTimeout(build, 200);
    };
    addEventListener('resize', onResize);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(build);

    return () => {
      alive = false;
      clearTimeout(timer);
      removeEventListener('resize', onResize);
      observer.disconnect();
      el.removeEventListener('pointerenter', enter);
      el.removeEventListener('pointerleave', leave);
      if (tween) tween.kill();
      clones.forEach((clone) => clone.remove());
      el.classList.remove('is-moving');
    };
  });

  window.FTP.register('label-scene', (el, env) => {
    const { gsap, $, $$, scenes } = env;
    if (!scenes) return undefined;
    const others = $$('[data-other]', el);
    const keep = $('[data-keep]', el);
    const body = $('[data-body]', el);
    const foot = $('[data-foot]', el);
    const inner = $('[data-inner]', el);
    const start = $('[data-start]', el);
    const done = $('[data-done]', el);
    if (!others.length || !keep) return undefined;

    el.classList.add('is-live');

    const order = others
      .map((item, i) => [(i * 7) % others.length, i, item])
      .sort((a, b) => a[0] - b[0] || a[1] - b[1])
      .map((row) => row[2]);
    const target = () => {
      const W = body.clientWidth;
      const w = keep.offsetWidth;
      const h = keep.offsetHeight;
      const s = Math.min((W * 0.98) / w, 3.6);
      return { s, x: (w * s) / 2 - (keep.offsetLeft + w / 2), y: (h * s) / 2 - (keep.offsetTop + h / 2) };
    };
    const lift = () => body.offsetTop + keep.offsetHeight * target().s + 20 - foot.offsetTop;

    const tl = gsap.timeline({
      scrollTrigger: { trigger: el, start: 'top top', end: 'bottom bottom', scrub: 0.3, invalidateOnRefresh: true },
    });
    order.forEach((item, i) => {
      tl.to($('i', item), { scaleX: 1, duration: 0.4, ease: 'none' }, i * 0.2);
      tl.to(item, { opacity: 0.4, duration: 0.2, ease: 'none' }, i * 0.2 + 0.25);
    });
    const end = order.length * 0.2 + 0.5;
    tl.to(others, { opacity: 0, duration: 0.5, ease: 'none' }, end);
    tl.to(
      keep,
      {
        x: () => target().x,
        y: () => target().y,
        scale: () => target().s,
        color: () => getComputedStyle(document.documentElement).getPropertyValue('--action').trim(),
        duration: 1,
        ease: 'power2.inOut',
      },
      end + 0.1,
    );
    tl.to(foot, { y: () => lift(), duration: 1, ease: 'power2.inOut' }, end + 0.1);
    tl.to(inner, { y: () => -lift() / 2, duration: 1, ease: 'power2.inOut' }, end + 0.1);
    tl.to(start, { opacity: 0, duration: 0.2 }, end);
    tl.to(done, { opacity: 1, duration: 0.3 }, end + 0.9);
    tl.to({}, { duration: 0.7 });

    return () => el.classList.remove('is-live');
  });
})();
