(() => {
  const rise = (env, trigger, targets, vars = {}) => {
    if (env.calm || env.design || !targets.length) return;
    env.gsap.from(targets, {
      y: 24,
      opacity: 0,
      duration: 0.8,
      ease: 'power3.out',
      stagger: 0.07,
      clearProps: 'transform,opacity',
      ...vars,
      scrollTrigger: { trigger, start: 'top 82%', once: true },
    });
  };

  FTP.register('protein-picker', (el, env) => {
    const { $, $$, gsap: G, calm } = env;
    const flood = $('[data-flood]', el);
    const disc = $('[data-disc]', el);
    const names = $$('[data-name]', el);
    const bags = $$('[data-bag]', el);
    const facts = $$('[data-fact]', el);
    const ac = new AbortController();
    const signal = ac.signal;
    let cur = 0;
    let pending = null;
    let inkCall = null;

    const announce = () => document.dispatchEvent(new CustomEvent('ftp:chapter-change'));

    const swapInstant = (i, field, ink) => {
      if (G) {
        G.killTweensOf([flood, ...bags]);
        G.set(flood, { clipPath: 'circle(0px at 0px 0px)' });
        G.set(bags, { clearProps: 'transform,opacity' });
        if (inkCall) inkCall.kill();
      }
      pending = null;
      bags.forEach((b, k) => {
        b.hidden = k !== i;
      });
      el.style.setProperty('--c', field);
      el.style.setProperty('--i', ink);
      announce();
    };

    const swapAnimated = (i, prevIndex, field, ink) => {
      const prev = bags[prevIndex];
      const next = bags[i];
      G.killTweensOf(flood);
      if (pending) el.style.setProperty('--c', pending);
      pending = field;
      const r = el.getBoundingClientRect();
      const d = disc.getBoundingClientRect();
      const cx = d.left + d.width / 2 - r.left;
      const cy = d.top + d.height / 2 - r.top;
      const R = Math.hypot(Math.max(cx, r.width - cx), Math.max(cy, r.height - cy)) + 4;
      flood.style.background = field;
      G.fromTo(
        flood,
        { clipPath: `circle(0px at ${cx}px ${cy}px)` },
        {
          clipPath: `circle(${R}px at ${cx}px ${cy}px)`,
          duration: 0.75,
          ease: 'power3.inOut',
          onComplete() {
            el.style.setProperty('--c', field);
            pending = null;
            G.set(flood, { clipPath: 'circle(0px at 0px 0px)' });
            announce();
          },
        },
      );
      if (inkCall) inkCall.kill();
      inkCall = G.delayedCall(0.28, () => el.style.setProperty('--i', ink));
      G.killTweensOf(prev);
      G.to(prev, {
        xPercent: -24,
        rotation: -9,
        opacity: 0,
        duration: 0.22,
        ease: 'power2.in',
        onComplete() {
          prev.hidden = true;
          G.set(prev, { clearProps: 'transform,opacity' });
        },
      });
      next.hidden = false;
      G.killTweensOf(next);
      G.fromTo(
        next,
        { xPercent: 0, y: 46, rotation: 7, scale: 0.96, opacity: 0 },
        { xPercent: 0, y: 0, rotation: 0, scale: 1, opacity: 1, duration: 0.6, ease: 'expo.out', delay: 0.1 },
      );
    };

    const show = (i, instant) => {
      if (i === cur || !names[i]) return;
      const { field, ink } = names[i].dataset;
      const prevIndex = cur;
      names.forEach((n, k) => n.setAttribute('aria-pressed', String(k === i)));
      facts.forEach((f, k) => {
        f.hidden = k !== i;
      });
      cur = i;
      if (calm || instant) swapInstant(i, field, ink);
      else swapAnimated(i, prevIndex, field, ink);
    };

    names.forEach((n, i) => n.addEventListener('click', () => show(i), { signal }));
    document.addEventListener(
      'shopify:block:select',
      (e) => {
        if (!el.contains(e.target)) return;
        const i = names.findIndex((n) => n.dataset.blockId === e.detail.blockId);
        if (i >= 0) show(i, true);
      },
      { signal },
    );

    rise(env, el, $$('[data-rise]', el));
    return () => ac.abort();
  });

  FTP.register('product-rail', (el, env) => {
    const { $, $$, calm } = env;
    const row = $('[data-rail]', el);
    if (!row) return undefined;
    rise(env, el, $$('[data-rise]', el));
    rise(env, el, $$('[data-item]', el).slice(0, 6), { y: 28 });

    const ac = new AbortController();
    const signal = ac.signal;
    let down = false;
    let moved = false;
    let startX = 0;
    let startLeft = 0;
    let suppress = false;
    let settle = 0;

    const nearest = () => {
      const items = [...row.children];
      const pad = parseFloat(getComputedStyle(row).scrollPaddingLeft) || 0;
      let best = row.scrollLeft;
      let gap = Infinity;
      items.forEach((item) => {
        const left = item.offsetLeft - row.offsetLeft - pad;
        const d = Math.abs(left - row.scrollLeft);
        if (d < gap) {
          gap = d;
          best = left;
        }
      });
      return Math.max(0, best);
    };

    row.addEventListener(
      'pointerdown',
      (e) => {
        if (e.pointerType !== 'mouse' || e.button !== 0) return;
        if (e.target.closest('button, input, select, textarea')) return;
        clearTimeout(settle);
        row.classList.remove('is-dragging');
        down = true;
        moved = false;
        startX = e.clientX;
        startLeft = row.scrollLeft;
      },
      { signal },
    );
    row.addEventListener(
      'pointermove',
      (e) => {
        if (!down) return;
        const dx = e.clientX - startX;
        if (!moved && Math.abs(dx) > 6) {
          moved = true;
          row.classList.add('is-dragging');
          row.setPointerCapture(e.pointerId);
        }
        if (moved) row.scrollLeft = startLeft - dx;
      },
      { signal },
    );
    const release = (e) => {
      if (!down) return;
      down = false;
      if (!moved) return;
      if (row.hasPointerCapture(e.pointerId)) row.releasePointerCapture(e.pointerId);
      suppress = true;
      setTimeout(() => {
        suppress = false;
      }, 60);
      row.scrollTo({ left: nearest(), behavior: calm ? 'auto' : 'smooth' });
      settle = setTimeout(() => row.classList.remove('is-dragging'), calm ? 0 : 420);
    };
    row.addEventListener('pointerup', release, { signal });
    row.addEventListener('pointercancel', release, { signal });
    row.addEventListener(
      'click',
      (e) => {
        if (!suppress) return;
        e.preventDefault();
        e.stopPropagation();
        suppress = false;
      },
      { signal, capture: true },
    );
    row.addEventListener('dragstart', (e) => e.preventDefault(), { signal });

    return () => {
      clearTimeout(settle);
      ac.abort();
    };
  });

  FTP.register('fan-cards', (el, env) => {
    const { $, $$, gsap: G, scenes } = env;
    rise(env, el, $$('[data-rise]', el), { stagger: 0 });
    if (!scenes) return undefined;
    const cards = $$('[data-card]', el);
    const box = $('[data-cards]', el);
    if (cards.length < 2 || !box) return undefined;
    const mm = G.matchMedia();
    mm.add('(min-width: 1100px)', () => {
      el.classList.add('is-pinned');
      const count = cards.length;
      const cw = Math.min(340, innerWidth * 0.26);
      const step = cw * 0.735;
      const rot = [-2, 2.5, -1.5, 3, -2.5, 2];
      const total = cw + step * (count - 1);
      el.style.setProperty('--cw', `${cw}px`);
      cards.forEach((c, i) => G.set(c, { x: -total / 2 + step * i, rotation: rot[i % 6], zIndex: i + 1 }));
      G.set(box, { x: (step * (count - 1)) / 2 });
      const t = G.timeline({
        scrollTrigger: { trigger: el, start: 'top top', end: 'bottom bottom', scrub: 0.3, invalidateOnRefresh: true },
      });
      cards.slice(1).forEach((c, i) => {
        const r = rot[(i + 1) % 6];
        t.fromTo(c, { y: () => innerHeight, rotation: r * 4 }, { y: 0, rotation: r, duration: 1, ease: 'power2.out' }, i * 1.1);
      });
      t.to(box, { x: 0, duration: (count - 2) * 1.1 + 1, ease: 'none' }, 0);
      t.to({}, { duration: 0.5 });
      return () => {
        el.classList.remove('is-pinned');
        el.style.removeProperty('--cw');
        G.set(cards, { clearProps: 'transform,zIndex' });
        G.set(box, { clearProps: 'transform' });
      };
    });
    return () => mm.revert();
  });

  FTP.register('pet-split', (el, env) => {
    const { $$, gsap: G, calm, design } = env;
    if (calm || design) return;
    $$('.pet-split__panel', el).forEach((panel) => {
      rise(env, panel, $$('[data-rise]', panel));
      G.from($$('[data-pet-rise]', panel), {
        yPercent: 70,
        duration: 0.9,
        ease: 'expo.out',
        scrollTrigger: { trigger: panel, start: 'top 75%', once: true },
      });
    });
  });
})();
