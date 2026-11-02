(() => {
  const reveal = (env, items, trigger) => {
    const list = items.filter(Boolean);
    if (!env.scenes || !list.length) return;
    env.gsap.from(list, {
      y: 24,
      opacity: 0,
      duration: 0.8,
      ease: 'expo.out',
      stagger: 0.08,
      clearProps: 'transform,opacity',
      scrollTrigger: { trigger, start: 'top 88%', once: true },
    });
  };

  const AWAY = [
    [-8, -7, -9],
    [8, -6, 8],
    [7, 8, -7],
    [-7, 7, 10],
  ];

  FTP.register('chip-snap', (el, env) => {
    const { $, $$, gsap: G } = env;
    const copy = $('.chip-snap__copy', el);
    if (copy) reveal(env, [...copy.children], copy);
    if (!env.scenes) return undefined;
    el.classList.add('is-live');
    const tl = G.timeline({
      scrollTrigger: { trigger: el, start: 'top 62%', end: 'center 38%', scrub: 0.3 },
    });
    $$('.chip-snap__piece', el).forEach((piece, i) => {
      tl.fromTo(
        piece,
        { xPercent: 0, yPercent: 0, rotation: 0 },
        { xPercent: AWAY[i][0], yPercent: AWAY[i][1], rotation: AWAY[i][2], ease: 'none', duration: 1 },
        0
      );
    });
    return () => el.classList.remove('is-live');
  });

  FTP.register('held-story', (el, env) => {
    const { $, $$ } = env;
    const steps = $$('.held-story__step', el);
    if (!env.scenes || steps.length < 2 || !('IntersectionObserver' in window)) return undefined;
    const pictures = $('.held-story__pictures', el);
    const count = $('.held-story__count', el);
    const pics = steps.map((step) => $('.held-story__pic', step));
    const word = el.dataset.countWord || 'of';
    pics.forEach((pic) => pictures.append(pic));
    el.classList.add('is-live');
    const show = (index) => {
      steps.forEach((step, k) => step.classList.toggle('is-active', k === index));
      pics.forEach((pic, k) => pic.classList.toggle('is-on', k === index));
      count.textContent = `${index + 1} ${word} ${steps.length}`;
    };
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) show(steps.indexOf(entry.target));
        });
      },
      { rootMargin: '-45% 0px -45% 0px' }
    );
    steps.forEach((step) => observer.observe(step));
    show(0);
    return () => {
      observer.disconnect();
      el.classList.remove('is-live');
      pics.forEach((pic, k) => {
        pic.classList.remove('is-on');
        steps[k].prepend(pic);
        steps[k].classList.remove('is-active');
      });
      count.textContent = '';
    };
  });

  FTP.register('review-stack', (el, env) => {
    const { $, $$, gsap: G, ScrollTrigger: ST, calm } = env;
    const box = $('[data-stack]', el);
    const next = $('[data-next]', el);
    const queue = box ? $$('.review-stack__card', box) : [];
    const side = $('.review-stack__side', el);
    if (side) reveal(env, [...side.children, box], side);

    const score = $('[data-score]', el);
    if (env.scenes && score) {
      const raw = score.dataset.score;
      const end = parseFloat(raw);
      if (!Number.isNaN(end)) {
        const decimals = (raw.split('.')[1] || '').length;
        const counter = { v: 0 };
        ST.create({
          trigger: score,
          start: 'top 92%',
          once: true,
          onEnter: () => {
            G.to(counter, {
              v: end,
              duration: 1.1,
              ease: 'expo.out',
              onUpdate: () => {
                score.textContent = counter.v.toFixed(decimals);
              },
              onComplete: () => {
                score.textContent = raw;
              },
            });
          },
        });
      }
    }

    if (!queue.length) return undefined;

    const tiltFor = (k) => (k === 0 ? 0 : k % 2 ? 2.2 : -2.2);
    const pose = (k) => {
      const depth = Math.min(k, 2);
      return {
        y: depth * 14,
        scale: 1 - depth * 0.04,
        rotation: tiltFor(depth),
        opacity: k > 2 ? 0 : 1,
        zIndex: queue.length - k,
      };
    };
    const arrangeCalm = () => {
      queue.forEach((card, k) => {
        const depth = Math.min(k, 2);
        card.style.setProperty('--k', depth);
        card.style.setProperty('--r', `${tiltFor(depth)}deg`);
        card.style.zIndex = queue.length - k;
        card.style.opacity = k > 2 ? 0 : 1;
      });
      queue[0].animate([{ opacity: 0.4 }, { opacity: 1 }], { duration: 200, easing: 'ease' });
    };
    const arrangeLive = (animate) => {
      queue.forEach((card, k) => {
        const target = { x: 0, ...pose(k) };
        if (animate) G.to(card, { ...target, duration: 0.45, ease: 'expo.out', overwrite: true });
        else G.set(card, target);
      });
    };
    const dismiss = (sign) => {
      if (queue.length < 2) return;
      if (calm) {
        queue.push(queue.shift());
        arrangeCalm();
        return;
      }
      const card = queue[0];
      queue.push(queue.shift());
      G.to(card, {
        x: sign * Math.max(innerWidth * 0.7, 520),
        rotation: sign * 20,
        opacity: 0,
        duration: 0.32,
        ease: 'power2.out',
        overwrite: true,
        onComplete: () => {
          const target = pose(queue.indexOf(card));
          G.set(card, { x: 0, y: target.y, scale: target.scale, rotation: target.rotation, zIndex: target.zIndex });
          G.to(card, { opacity: target.opacity, duration: 0.3, ease: 'power2.out', overwrite: true });
        },
      });
      queue.forEach((other, k) => {
        if (other !== card) G.to(other, { x: 0, ...pose(k), duration: 0.45, ease: 'expo.out', overwrite: true });
      });
    };
    const onNext = () => dismiss(1);
    if (next) next.addEventListener('click', onNext);

    const onSelect = (e) => {
      const card = e.target.closest('.review-stack__card');
      if (!card) return;
      while (queue[0] !== card) queue.push(queue.shift());
      if (calm) arrangeCalm();
      else arrangeLive(false);
    };
    el.addEventListener('shopify:block:select', onSelect);

    let drag = null;
    const onDown = (e) => {
      const card = e.target.closest('.review-stack__card');
      if (drag || !card || card !== queue[0]) return;
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      card.setPointerCapture(e.pointerId);
      G.killTweensOf(card);
      drag = { card, id: e.pointerId, x0: e.clientX, y0: e.clientY, t0: performance.now(), dx: 0 };
    };
    const onMove = (e) => {
      if (!drag || e.pointerId !== drag.id) return;
      drag.dx = e.clientX - drag.x0;
      G.set(drag.card, { x: drag.dx, y: (e.clientY - drag.y0) * 0.15, rotation: drag.dx * 0.05 });
    };
    const onUp = (e) => {
      if (!drag || e.pointerId !== drag.id) return;
      const { card, dx, t0 } = drag;
      drag = null;
      const velocity = Math.abs(dx) / Math.max(1, performance.now() - t0);
      if (Math.abs(dx) > 110 || (velocity > 0.45 && Math.abs(dx) > 16)) dismiss(dx < 0 ? -1 : 1);
      else G.to(card, { x: 0, y: 0, rotation: 0, duration: 0.5, ease: 'back.out(1.6)', overwrite: true });
    };

    if (!calm) {
      arrangeLive(false);
      box.classList.add('is-draggable');
      box.addEventListener('pointerdown', onDown);
      box.addEventListener('pointermove', onMove);
      box.addEventListener('pointerup', onUp);
      box.addEventListener('pointercancel', onUp);
    }

    return () => {
      if (next) next.removeEventListener('click', onNext);
      el.removeEventListener('shopify:block:select', onSelect);
      box.classList.remove('is-draggable');
      box.removeEventListener('pointerdown', onDown);
      box.removeEventListener('pointermove', onMove);
      box.removeEventListener('pointerup', onUp);
      box.removeEventListener('pointercancel', onUp);
    };
  });

  FTP.register('panel-accordion', (el, env) => {
    const { $, $$ } = env;
    const panels = $$('.panel-accordion__panel', el);
    if (!panels.length) return undefined;
    const open = (panel) => {
      panels.forEach((other) => {
        const on = other === panel;
        other.classList.toggle('is-open', on);
        $('.panel-accordion__tab', other).setAttribute('aria-expanded', String(on));
      });
    };
    const onClick = (e) => {
      const tab = e.target.closest('.panel-accordion__tab');
      if (!tab) return;
      const panel = tab.closest('.panel-accordion__panel');
      open(panel);
      if (e.detail === 0) $('[data-panel-title]', panel).focus({ preventScroll: true });
    };
    const onSelect = (e) => {
      const panel = e.target.closest('.panel-accordion__panel');
      if (panel) open(panel);
    };
    const preload = new IntersectionObserver((entries) => {
      if (!entries.some((entry) => entry.isIntersecting)) return;
      $$('.panel-accordion__pic img', el).forEach((img) => {
        img.loading = 'eager';
      });
      preload.disconnect();
    }, { rootMargin: '800px 0px' });
    preload.observe(el);
    let timer = null;
    const onEnter = (e) => {
      if (e.pointerType !== 'mouse') return;
      const panel = e.currentTarget;
      clearTimeout(timer);
      timer = setTimeout(() => open(panel), 90);
    };
    const onLeave = () => clearTimeout(timer);
    if (env.fine) {
      panels.forEach((panel) => {
        panel.addEventListener('pointerenter', onEnter);
        panel.addEventListener('pointerleave', onLeave);
      });
    }
    el.addEventListener('click', onClick);
    el.addEventListener('shopify:block:select', onSelect);
    return () => {
      clearTimeout(timer);
      preload.disconnect();
      panels.forEach((panel) => {
        panel.removeEventListener('pointerenter', onEnter);
        panel.removeEventListener('pointerleave', onLeave);
      });
      el.removeEventListener('click', onClick);
      el.removeEventListener('shopify:block:select', onSelect);
    };
  });
})();
