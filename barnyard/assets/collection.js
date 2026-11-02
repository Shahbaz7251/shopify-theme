(() => {
  const FIELD = {
    chicken: ['var(--chicken)', 'var(--chicken-ink)'],
    turkey: ['var(--turkey)', 'var(--turkey-ink)'],
    beef: ['var(--beef)', 'var(--beef-ink)'],
    fish: ['var(--fish)', 'var(--fish-ink)'],
  };

  FTP.register('collection-page', (el, env) => {
    const { $, $$, gsap: G, ScrollTrigger: ST, calm, scenes } = env;
    const F = window.Flip;
    if (G && F) G.registerPlugin(F);
    const canFlip = !calm && !!F;
    const stop = new AbortController();
    const on = { signal: stop.signal };

    const head = $('[data-head]', el);
    const flood = $('[data-flood]', el);
    const title = $('[data-title]', el);
    const countEl = $('[data-count]', el);
    const bar = $('[data-bar]', el);
    const body = $('[data-body]', el);
    const sheet = $('[data-sheet]', el);
    const panel = $('[data-sheet-panel]', el);
    const nowEl = $('[data-filter-now]', el);
    const allPills = $$('[data-f]', el);
    const baseTitle = title.textContent;
    const baseField = [el.style.getPropertyValue('--c'), el.style.getPropertyValue('--i')];
    const allLabel = allPills.find((p) => p.dataset.f === 'all').textContent;
    let grid = $('[data-grid]', el);
    let current = 'all';
    let reveal = null;

    const items = () => (grid ? $$('[data-tile], [data-brand]', grid) : []);
    const matches = (item) => {
      if (current === 'all') return true;
      return item.dataset.protein === current;
    };
    const tagFlipIds = () => items().forEach((item) => {
      if (item.dataset.brand) {
        item.dataset.flipId = `brand-${item.dataset.brand}`;
        return;
      }
      const link = $('a', item);
      item.dataset.flipId = link ? link.getAttribute('href').split('?')[0] : '';
    });
    const applyDisplay = () => items().forEach((item) => {
      item.style.display = matches(item) ? '' : 'none';
    });
    const paintCount = () => {
      const n = items().filter((item) => item.dataset.tile !== undefined && matches(item)).length;
      countEl.textContent = countEl.dataset.template.replace('__N__', n);
    };
    const showPresentPills = () => {
      const present = new Set(items().map((item) => item.dataset.protein).filter(Boolean));
      allPills.forEach((pill) => {
        if (pill.dataset.f !== 'all') pill.hidden = !present.has(pill.dataset.f);
      });
    };
    showPresentPills();

    const flushReveal = () => {
      if (!reveal) return;
      reveal.forEach((trigger) => trigger.kill());
      reveal = null;
      G.set(items(), { clearProps: 'transform,opacity' });
    };
    if (scenes && grid) {
      const targets = items();
      G.set(targets, { opacity: 0, y: 24 });
      reveal = ST.batch(targets, {
        start: 'top 92%',
        once: true,
        onEnter: (batch) => G.to(batch, { opacity: 1, y: 0, duration: 0.7, ease: 'power3.out', stagger: 0.07, clearProps: 'transform,opacity' }),
      });
    }

    const wrapHeader = $('.site-header-wrap');
    const paintTop = () => {
      if (!wrapHeader) return;
      el.style.setProperty('--cp-top', wrapHeader.classList.contains('is-hidden') ? '0px' : `${wrapHeader.offsetHeight}px`);
    };
    let headerWatch = null;
    if (wrapHeader) {
      paintTop();
      headerWatch = new MutationObserver(paintTop);
      headerWatch.observe(wrapHeader, { attributes: true, attributeFilter: ['class'] });
      addEventListener('resize', paintTop, on);
    }

    const paintField = (bg, ink) => {
      el.style.setProperty('--c', bg);
      el.style.setProperty('--i', ink);
    };
    const chapterChanged = () => document.dispatchEvent(new CustomEvent('ftp:chapter-change'));

    const floodTo = (key, label, originX) => {
      const [bg, ink] = FIELD[key] || baseField;
      if (calm) {
        paintField(bg, ink);
        title.textContent = label;
        chapterChanged();
        return;
      }
      G.killTweensOf(flood);
      G.killTweensOf(title);
      const r = head.getBoundingClientRect();
      const x = originX - r.left;
      const y = r.height;
      const R = Math.hypot(Math.max(x, r.width - x), r.height) + 4;
      flood.style.background = bg;
      el.style.setProperty('--i', ink);
      G.fromTo(flood, { clipPath: `circle(0px at ${x}px ${y}px)` }, {
        clipPath: `circle(${R}px at ${x}px ${y}px)`,
        duration: 0.7,
        ease: 'power3.inOut',
        onComplete() {
          paintField(bg, ink);
          G.set(flood, { clipPath: 'circle(0px at 0px 0px)' });
          chapterChanged();
        },
      });
      G.to(title, {
        yPercent: -108,
        duration: 0.24,
        ease: 'power2.in',
        onComplete() {
          title.textContent = label;
          G.fromTo(title, { yPercent: 108 }, { yPercent: 0, duration: 0.6, ease: 'expo.out' });
        },
      });
    };

    const flipOptions = (done) => ({
      duration: 0.55,
      ease: 'power3.inOut',
      stagger: 0.02,
      absolute: true,
      onEnter: (els) => G.fromTo(els, { opacity: 0, scale: 0.94 }, { opacity: 1, scale: 1, duration: 0.4, ease: 'power3.out', delay: 0.12, clearProps: 'opacity,scale' }),
      onLeave: (els) => G.to(els, { opacity: 0, scale: 0.94, duration: 0.22, ease: 'power2.out' }),
      onComplete: done,
    });
    const settle = () => {
      if (grid) grid.style.minHeight = '';
      if (ST) ST.refresh();
    };
    const pullToTop = () => {
      const top = bar.getBoundingClientRect().top;
      const stuck = top <= parseFloat(getComputedStyle(bar).top) + 1;
      if (!stuck) return;
      const target = body.getBoundingClientRect().top + scrollY;
      if (env.lenis) env.lenis.scrollTo(target);
      else scrollTo({ top: target, behavior: calm ? 'auto' : 'smooth' });
    };

    const setFilter = (key, originX) => {
      if (key === current) return;
      if (G) flushReveal();
      current = key;
      allPills.forEach((pill) => pill.setAttribute('aria-pressed', String(pill.dataset.f === key)));
      const pill = allPills.find((p) => p.dataset.f === key);
      const label = key === 'all' ? baseTitle : pill.dataset.label;
      nowEl.textContent = key === 'all' ? allLabel : pill.dataset.label;
      floodTo(key, label, originX);
      if (!grid) return;
      if (!canFlip) {
        applyDisplay();
        paintCount();
        if (ST) ST.refresh();
        return;
      }
      tagFlipIds();
      grid.style.minHeight = `${grid.offsetHeight}px`;
      const state = F.getState(items());
      applyDisplay();
      paintCount();
      F.from(state, flipOptions(settle));
      pullToTop();
    };

    el.addEventListener('click', (e) => {
      const pill = e.target.closest('[data-f]');
      if (!pill) return;
      const inSheet = !!pill.closest('[data-sheet]');
      const box = head.getBoundingClientRect();
      const origin = inSheet ? box.left + box.width / 2 : e.clientX || pill.getBoundingClientRect().left + 20;
      if (inSheet) closeSheet();
      setFilter(pill.dataset.f, origin);
    }, on);

    let sortRequest = 0;
    const runSort = async (value) => {
      const params = new URLSearchParams(location.search);
      params.set('sort_by', value);
      params.delete('page');
      const url = `${location.pathname}?${params}`;
      const ticket = ++sortRequest;
      try {
        const res = await fetch(`${url}&section_id=${encodeURIComponent(el.dataset.sectionId)}`, { headers: { Accept: 'text/html' } });
        if (!res.ok) throw new Error(String(res.status));
        const doc = new DOMParser().parseFromString(await res.text(), 'text/html');
        if (ticket !== sortRequest) return;
        const next = $('[data-grid]', doc);
        if (!next || !grid) throw new Error('missing grid');
        if (G) flushReveal();
        const state = canFlip ? (tagFlipIds(), F.getState(items())) : null;
        grid.style.minHeight = `${grid.offsetHeight}px`;
        grid.innerHTML = next.innerHTML;
        const nextPaging = $('[data-pagination]', doc);
        const paging = $('[data-pagination]', el);
        if (paging) {
          if (nextPaging) paging.innerHTML = nextPaging.innerHTML;
          else paging.remove();
        }
        applyDisplay();
        paintCount();
        history.replaceState(history.state, '', url);
        if (state) {
          tagFlipIds();
          F.from(state, { ...flipOptions(settle), targets: items() });
        } else {
          settle();
        }
      } catch (err) {
        location.href = url;
      }
    };
    $$('[data-sort]', el).forEach((select) => select.addEventListener('change', () => {
      $$('[data-sort]', el).forEach((other) => {
        other.value = select.value;
      });
      if (select.closest('[data-sheet]')) closeSheet();
      runSort(select.value);
    }, on));
    const sortForm = $('[data-sort-form]', el);
    if (sortForm) sortForm.addEventListener('submit', (e) => {
      e.preventDefault();
      runSort($('[data-sort]', sortForm).value);
    }, on);

    let closing = null;
    function resetSheet() {
      sheet.classList.remove('is-dragging');
      sheet.style.transform = '';
    }
    function closeSheet() {
      if (!sheet.open) return;
      clearTimeout(closing);
      resetSheet();
      sheet.close();
    }
    const dismissSheet = () => {
      sheet.classList.remove('is-dragging');
      sheet.style.transform = 'translateY(100%)';
      clearTimeout(closing);
      closing = setTimeout(() => {
        sheet.close();
        sheet.style.transform = '';
      }, calm ? 0 : 320);
    };
    $('[data-sheet-open]', el).addEventListener('click', () => {
      sheet.showModal();
      if (env.lenis) env.lenis.stop();
    }, on);
    sheet.addEventListener('close', () => {
      if (env.lenis) env.lenis.start();
    }, on);
    sheet.addEventListener('click', (e) => {
      if (e.target === sheet) closeSheet();
      if (e.target.closest('[data-sheet-close]')) closeSheet();
    }, on);

    let drag = null;
    panel.addEventListener('pointerdown', (e) => {
      if (drag || !e.isPrimary) return;
      if (!e.target.closest('[data-sheet-handle], .cp-sheet__top') || e.target.closest('button')) return;
      panel.setPointerCapture(e.pointerId);
      sheet.classList.add('is-dragging');
      drag = { id: e.pointerId, y0: e.clientY, t0: performance.now(), dy: 0 };
    }, on);
    panel.addEventListener('pointermove', (e) => {
      if (!drag || e.pointerId !== drag.id) return;
      const raw = e.clientY - drag.y0;
      drag.dy = raw;
      const shown = raw >= 0 ? raw : -Math.sqrt(-raw) * 2;
      sheet.style.transform = `translateY(${shown}px)`;
    }, on);
    const endDrag = (e) => {
      if (!drag || e.pointerId !== drag.id) return;
      const { dy, t0 } = drag;
      drag = null;
      const velocity = dy / Math.max(1, performance.now() - t0);
      if (dy > sheet.offsetHeight * 0.3 || (velocity > 0.11 && dy > 12)) {
        dismissSheet();
      } else {
        resetSheet();
      }
    };
    panel.addEventListener('pointerup', endDrag, on);
    panel.addEventListener('pointercancel', endDrag, on);

    return () => {
      stop.abort();
      clearTimeout(closing);
      if (headerWatch) headerWatch.disconnect();
      if (sheet.open) sheet.close();
    };
  });

  FTP.register('word-tiles', (el, env) => {
    const { $$, scenes } = env;
    if (!scenes || !('IntersectionObserver' in window)) return undefined;
    const built = [];
    $$('[data-word]', el).forEach((word) => {
      const value = word.textContent.trim();
      if (!/\d/.test(value)) return;
      const said = Object.assign(document.createElement('span'), { className: 'sr-only', textContent: value });
      const shown = Object.assign(document.createElement('span'), { className: 'word-tiles__digits' });
      shown.setAttribute('aria-hidden', 'true');
      let i = 0;
      for (const ch of value) {
        if (!/\d/.test(ch)) {
          shown.append(ch);
          continue;
        }
        const col = Object.assign(document.createElement('span'), { className: 'word-tiles__col' });
        const strip = Object.assign(document.createElement('span'), { className: 'word-tiles__strip' });
        strip.style.setProperty('--d', ch);
        strip.style.setProperty('--i', i++);
        for (let n = 0; n < 10; n++) strip.append(Object.assign(document.createElement('span'), { textContent: n }));
        col.append(strip);
        shown.append(col);
      }
      word.replaceChildren(said, shown);
      built.push({ word, value, shown });
    });
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-in');
        io.unobserve(entry.target);
      });
    }, { rootMargin: '0px 0px -12% 0px' });
    built.forEach(({ shown }) => io.observe(shown));
    return () => {
      io.disconnect();
      built.forEach(({ word, value }) => {
        word.textContent = value;
      });
    };
  });
})();
