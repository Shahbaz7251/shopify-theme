(() => {
  if (window.__ftpProductJs || !window.FTP) return;
  window.__ftpProductJs = true;

  const decode = (text) => {
    const box = document.createElement('textarea');
    box.innerHTML = text;
    return box.value;
  };

  const makeRoller = (box, calm) => {
    let current = box.textContent.trim();
    const said = document.createElement('span');
    said.className = 'sr-only';
    const shown = document.createElement('span');
    shown.className = 'pp__roll';
    shown.setAttribute('aria-hidden', 'true');
    const shape = (text) => text.replace(/\d/g, '0');
    const build = (text) => {
      shown.replaceChildren();
      let column = 0;
      for (const ch of text) {
        if (!/\d/.test(ch)) {
          shown.append(ch);
          continue;
        }
        const col = document.createElement('span');
        col.className = 'pp__roll-col';
        const strip = document.createElement('span');
        strip.className = 'pp__roll-strip';
        strip.style.setProperty('--i', column);
        strip.style.transform = `translateY(-${Number(ch) * 10}%)`;
        for (let n = 0; n < 10; n += 1) {
          const digit = document.createElement('b');
          digit.textContent = n;
          strip.append(digit);
        }
        col.append(strip);
        shown.append(col);
        column += 1;
      }
    };
    said.textContent = current;
    build(current);
    box.replaceChildren(said, shown);
    return (text) => {
      if (text === current) return;
      const same = shape(text) === shape(current);
      current = text;
      said.textContent = text;
      if (calm || !same) {
        build(text);
        return;
      }
      const strips = [...shown.querySelectorAll('.pp__roll-strip')];
      const digits = text.match(/\d/g) || [];
      strips.forEach((strip, i) => {
        strip.style.transform = `translateY(-${Number(digits[i]) * 10}%)`;
      });
    };
  };

  const dragRow = (row, signal) => {
    let down = false;
    let moved = false;
    let startX = 0;
    let startLeft = 0;
    let suppress = false;
    row.addEventListener('pointerdown', (e) => {
      if (e.pointerType !== 'mouse' || e.button !== 0) return;
      if (e.target.closest('button, input, select, textarea')) return;
      down = true;
      moved = false;
      startX = e.clientX;
      startLeft = row.scrollLeft;
    }, { signal });
    addEventListener('pointermove', (e) => {
      if (!down) return;
      const dx = e.clientX - startX;
      if (!moved && Math.abs(dx) < 6) return;
      moved = true;
      row.classList.add('is-dragging');
      row.scrollLeft = startLeft - dx;
    }, { signal });
    const release = () => {
      if (!down) return;
      down = false;
      if (!moved) return;
      suppress = true;
      setTimeout(() => {
        suppress = false;
      }, 0);
      const left = row.scrollLeft;
      row.classList.remove('is-dragging');
      row.scrollLeft = left;
    };
    addEventListener('pointerup', release, { signal });
    addEventListener('pointercancel', release, { signal });
    row.addEventListener('click', (e) => {
      if (suppress) {
        e.preventDefault();
        e.stopPropagation();
      }
    }, { capture: true, signal });
    row.addEventListener('dragstart', (e) => e.preventDefault(), { signal });
  };

  const rise = (env, el, parts) => {
    const { gsap: G, calm, design, ScrollTrigger: ST } = env;
    if (calm || design || !parts.length) return;
    ST.create({
      trigger: el,
      start: 'top 85%',
      once: true,
      onEnter: () => G.fromTo(parts, { y: 24, opacity: 0 }, { y: 0, opacity: 1, duration: 0.8, ease: 'expo.out', stagger: 0.07, clearProps: 'transform,opacity' }),
    });
  };

  FTP.register('product-page', (el, env) => {
    const { $, $$, calm, fine, design } = env;
    const ac = new AbortController();
    const { signal } = ac;
    const form = $('[data-add-form]', el);
    const dataEl = $('[data-variants]', el);
    const variants = dataEl ? JSON.parse(dataEl.textContent) : [];
    const idInput = $('[data-variant-id]', el);
    const planInput = $('[data-plan-input]', el);
    const addButton = $('[data-add-button]', el);
    const addLabel = $('[data-add-label]', el);
    const barButton = $('[data-bar-button]', el);
    const barLabel = $('[data-bar-label]', el);
    const barPrice = $('[data-bar-price]', el);
    const compare = $('[data-compare]', el);
    const priceBox = $('[data-price]', el);
    const roll = priceBox ? makeRoller(priceBox, calm) : () => {};
    const gallery = $('[data-gallery]', el);
    const countEl = $('[data-gallery-count]', el);
    const optionButtons = $$('[data-opt]', el);
    const planButtons = $$('[data-plan]', el);

    let variant = variants.find((v) => String(v.id) === String(idInput && idInput.value)) || variants[0];
    let plan = planButtons.length && !planButtons.some((b) => b.dataset.plan === '') ? planButtons[0].dataset.plan : '';
    const selected = variant ? [...variant.options] : [];
    const barVariant = $('[data-bar-variant]', el);
    const nowButtons = $$('[data-buy-now]', el);
    const barNow = $('[data-bar-now]', el);
    const items = gallery ? $$('[data-media-item]', gallery) : [];
    const thumbs = $$('[data-thumb]', el);
    const thumbRow = $('[data-thumbs]', el);
    const prev = $('[data-gallery-prev]', el);
    const next = $('[data-gallery-next]', el);
    let active = 0;

    const setActive = (index) => {
      active = index;
      if (countEl) countEl.textContent = countEl.dataset.template.replace('__c__', index + 1);
      if (prev) prev.disabled = index === 0;
      if (next) next.disabled = index === items.length - 1;
      items.forEach((item, i) => item.toggleAttribute('data-fly-source', i === index));
      thumbs.forEach((thumb, i) => {
        if (i === index) {
          thumb.setAttribute('aria-current', 'true');
          if (thumbRow) thumbRow.scrollTo({ left: thumb.offsetLeft - thumbRow.offsetLeft - 80, behavior: calm ? 'auto' : 'smooth' });
        } else {
          thumb.removeAttribute('aria-current');
        }
      });
    };
    const goTo = (index, instant) => {
      const item = items[index];
      if (!item) return;
      gallery.scrollTo({ left: item.offsetLeft, behavior: calm || instant ? 'auto' : 'smooth' });
    };

    const paintOptions = () => {
      optionButtons.forEach((button) => {
        const index = Number(button.dataset.opt);
        const on = selected[index] === button.dataset.value;
        button.setAttribute('aria-pressed', String(on));
        const trial = [...selected];
        trial[index] = button.dataset.value;
        const match = variants.find((v) => v.options.every((o, i) => o === trial[i]));
        button.classList.toggle('is-off', !match || !match.available);
        if (on && button.dataset.pos !== undefined) {
          button.closest('[data-seg]').style.setProperty('--at', button.dataset.pos);
        }
      });
      planButtons.forEach((button) => button.setAttribute('aria-pressed', String(button.dataset.plan === plan)));
    };

    const showMedia = (mediaId, instant) => {
      if (!gallery || !mediaId) return;
      const index = items.findIndex((item) => item.dataset.mediaId === String(mediaId));
      if (index >= 0) goTo(index, instant);
    };

    const sync = (fromUser) => {
      const match = variants.find((v) => v.options.every((o, i) => o === selected[i]));
      paintOptions();
      const available = !!(match && match.available);
      const text = available ? el.dataset.addText : el.dataset.soldOut;
      [addButton, barButton, ...nowButtons].forEach((b) => {
        if (b) b.disabled = !available;
      });
      if (addLabel) addLabel.textContent = text;
      if (barLabel) barLabel.textContent = text;
      if (!match) return;
      variant = match;
      if (idInput) idInput.value = match.id;
      if (planInput) {
        planInput.value = plan;
        planInput.disabled = !plan;
      }
      const planPrice = plan && match.plans[plan];
      const price = decode(planPrice || match.price);
      roll(price);
      if (barPrice) barPrice.textContent = price;
      if (barVariant) barVariant.textContent = match.options.join(' / ');
      if (compare) {
        compare.hidden = !match.compare;
        compare.textContent = match.compare ? decode(match.compare) : '';
      }
      if (fromUser) {
        showMedia(match.media);
        if (!design) {
          const url = new URL(location.href);
          url.searchParams.set('variant', match.id);
          history.replaceState(history.state, '', url);
        }
      }
    };

    optionButtons.forEach((button) => button.addEventListener('click', () => {
      selected[Number(button.dataset.opt)] = button.dataset.value;
      sync(true);
    }, { signal }));
    planButtons.forEach((button) => button.addEventListener('click', () => {
      plan = button.dataset.plan;
      sync(true);
    }, { signal }));

    sync(false);
    if (variant && variant.media) showMedia(variant.media, true);

    if (prev) prev.addEventListener('click', () => goTo(active - 1), { signal });
    if (next) next.addEventListener('click', () => goTo(active + 1), { signal });
    thumbs.forEach((thumb) => thumb.addEventListener('click', () => goTo(Number(thumb.dataset.thumb)), { signal }));
    if (gallery) gallery.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowLeft') goTo(active - 1);
      if (e.key === 'ArrowRight') goTo(active + 1);
    }, { signal });

    nowButtons.forEach((button) => button.addEventListener('click', () => {
      if (!form || button.disabled) return;
      let target = $('input[name="return_to"]', form);
      if (!target) {
        target = document.createElement('input');
        target.type = 'hidden';
        target.name = 'return_to';
        form.append(target);
      }
      target.value = '/checkout';
      form.submit();
    }, { signal }));

    const qty = $('[data-qty]', el);
    $$('[data-qty-step]', el).forEach((button) => button.addEventListener('click', () => {
      qty.value = Math.max(1, (parseInt(qty.value, 10) || 1) + Number(button.dataset.qtyStep));
    }, { signal }));
    if (qty) qty.addEventListener('change', () => {
      qty.value = Math.max(1, parseInt(qty.value, 10) || 1);
    }, { signal });

    const accs = $$('[data-acc]', el);
    const setAcc = (acc, open) => {
      acc.classList.toggle('is-open', open);
      $('[data-acc-button]', acc).setAttribute('aria-expanded', String(open));
    };
    accs.forEach((acc) => $('[data-acc-button]', acc).addEventListener('click', () => {
      setAcc(acc, !acc.classList.contains('is-open'));
    }, { signal }));
    document.addEventListener('shopify:block:select', (e) => {
      if (accs.includes(e.target)) setAcc(e.target, true);
    }, { signal });

    const reviews = $('[data-reviews-link]', el);
    if (reviews) {
      const target = document.getElementById(reviews.getAttribute('href').slice(1));
      if (target) {
        reviews.addEventListener('click', (e) => {
          e.preventDefault();
          target.scrollIntoView({ behavior: calm ? 'auto' : 'smooth' });
        }, { signal });
      } else {
        reviews.hidden = true;
      }
    }

    if (fine && !calm && gallery) {
      gallery.addEventListener('pointermove', (e) => {
        const item = e.target.closest('.pp__media--image');
        if (!item) return;
        const img = $('img', item);
        const r = item.getBoundingClientRect();
        img.style.transformOrigin = `${((e.clientX - r.left) / r.width) * 100}% ${((e.clientY - r.top) / r.height) * 100}%`;
        item.classList.add('is-zoom');
      }, { signal });
      gallery.addEventListener('pointerout', (e) => {
        const item = e.target.closest('.pp__media--image');
        if (item && !item.contains(e.relatedTarget)) item.classList.remove('is-zoom');
      }, { signal });
    }

    const observers = [];
    if (items.length > 1) {
      const io = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) setActive(items.indexOf(entry.target));
        });
      }, { root: gallery, threshold: 0.6 });
      items.forEach((item) => io.observe(item));
      observers.push(io);
    }

    const details = $('[data-details]', el);
    if (details && window.ResizeObserver) {
      const place = () => {
        details.style.setProperty('--stick-top', `${Math.min(88, innerHeight - details.offsetHeight - 16)}px`);
      };
      const ro = new ResizeObserver(place);
      ro.observe(details);
      addEventListener('resize', place, { signal });
      observers.push(ro);
    }

    const bar = $('[data-buy-bar]', el);
    if (bar && addButton) {
      let past = false;
      let atEnd = false;
      const paint = () => {
        const up = past && !atEnd;
        bar.classList.toggle('is-up', up);
        bar.setAttribute('aria-hidden', String(!up));
        if (barButton) barButton.tabIndex = up ? 0 : -1;
        if (barNow) barNow.tabIndex = up ? 0 : -1;
      };
      const main = document.getElementById('main');
      if (main) {
        let marker = $('[data-buy-bar-end]', main);
        if (!marker) {
          marker = document.createElement('div');
          marker.setAttribute('data-buy-bar-end', '');
          marker.setAttribute('aria-hidden', 'true');
          main.append(marker);
        }
        let queued = false;
        const check = () => {
          queued = false;
          past = addButton.getBoundingClientRect().bottom < 0;
          atEnd = marker.getBoundingClientRect().top < innerHeight;
          paint();
        };
        const onScroll = () => {
          if (queued) return;
          queued = true;
          requestAnimationFrame(check);
        };
        addEventListener('scroll', onScroll, { passive: true, signal });
        addEventListener('resize', onScroll, { signal });
        check();
      }
    }

    if (form) form.setAttribute('data-ready', '');
    return () => {
      ac.abort();
      observers.forEach((o) => o.disconnect());
    };
  });

  FTP.register('product-chapter', (el, env) => {
    const { $, $$, gsap: G, scenes } = env;
    const line = $('[data-push]', el);
    const ac = new AbortController();
    const wide = () => matchMedia('(min-width: 721px)').matches;
    const fit = () => {
      if (!line) return;
      line.style.fontSize = '';
      if (!wide()) return;
      const room = line.parentElement.clientWidth - parseFloat(getComputedStyle(line.parentElement).paddingLeft) * 2;
      const range = document.createRange();
      range.selectNodeContents(line);
      const width = range.getBoundingClientRect().width;
      if (width > room) line.style.fontSize = `${(parseFloat(getComputedStyle(line).fontSize) * room) / width}px`;
    };
    fit();
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(fit);
    addEventListener('resize', fit, { signal: ac.signal });
    if (scenes && line) {
      const travel = wide() ? 12 : 4;
      G.fromTo(line, { xPercent: travel }, { xPercent: -travel, ease: 'none', scrollTrigger: { trigger: el, start: 'top bottom', end: 'bottom top', scrub: true } });
    }
    rise(env, el, $$('[data-rise]', el));
    return () => ac.abort();
  });

  FTP.register('faq-tiles', (el, env) => {
    rise(env, el, env.$$('[data-rise]', el).slice(0, 6));
  });

  FTP.register('folded-text', (el, env) => {
    const { $ } = env;
    const body = $('[data-fold-body]', el);
    const toggle = $('[data-fold-toggle]', el);
    if (!body || !toggle) return undefined;
    const ac = new AbortController();
    const folded = () => body.classList.contains('is-folded');
    const measure = () => {
      if (toggle.getAttribute('aria-expanded') === 'true') return;
      body.classList.add('is-folded');
      const needs = body.scrollHeight > body.clientHeight + 2;
      if (!needs) body.classList.remove('is-folded');
      toggle.hidden = !needs;
    };
    measure();
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(measure);
    addEventListener('resize', measure, { signal: ac.signal });
    toggle.addEventListener('click', () => {
      const open = folded();
      body.classList.toggle('is-folded', !open);
      toggle.setAttribute('aria-expanded', String(open));
      toggle.textContent = open ? toggle.dataset.less : toggle.dataset.more;
      if (window.FTP) window.FTP.refresh();
    }, { signal: ac.signal });
    return () => ac.abort();
  });

  FTP.register('product-recommendations', (el, env) => {
    const { $ } = env;
    const ac = new AbortController();
    const start = () => {
      const row = $('[data-recs-row]', el);
      if (row) dragRow(row, ac.signal);
    };
    if ($('[data-recs-row]', el)) {
      start();
    } else if (el.dataset.url) {
      fetch(el.dataset.url, { signal: ac.signal })
        .then((res) => (res.ok ? res.text() : ''))
        .then((html) => {
          const next = new DOMParser().parseFromString(html, 'text/html').querySelector('[data-recs-inner]');
          if (!next || !next.querySelector('[data-recs-row]')) return;
          $('[data-recs-inner]', el).replaceWith(next);
          el.hidden = false;
          start();
          window.FTP.refresh();
        })
        .catch(() => {});
    }
    return () => ac.abort();
  });
})();
