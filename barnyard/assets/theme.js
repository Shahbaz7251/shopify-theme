(() => {
  const root = document.documentElement;
  const G = window.gsap;
  const ST = window.ScrollTrigger;
  if (G && ST) {
    G.registerPlugin(ST);
    ST.config({ ignoreMobileResize: true });
  }
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const design = !!(window.Shopify && window.Shopify.designMode);
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const calm = reduced || root.hasAttribute('data-calm') || !G || !ST;
  const fine = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const env = { $, $$, gsap: G, ScrollTrigger: ST, calm, design, fine, scenes: !calm && !design };
  const registry = new Map();

  const mountOne = (el) => {
    const init = registry.get(el.dataset.section);
    if (!init || el.__ftpMounted) return;
    el.__ftpMounted = true;
    if (G) {
      el.__ftpContext = G.context(() => {
        el.__ftpCleanup = init(el, env);
      }, el);
    } else {
      el.__ftpCleanup = init(el, env);
    }
  };
  const unmountOne = (el) => {
    if (typeof el.__ftpCleanup === 'function') el.__ftpCleanup();
    if (el.__ftpContext) el.__ftpContext.revert();
    el.__ftpMounted = false;
  };
  const mount = (scope = document) => {
    if (scope.matches && scope.matches('[data-section]')) mountOne(scope);
    $$('[data-section]', scope).forEach(mountOne);
  };
  const unmount = (scope = document) => {
    if (scope.matches && scope.matches('[data-section]')) unmountOne(scope);
    $$('[data-section]', scope).forEach(unmountOne);
  };
  const refresh = () => {
    if (ST) ST.refresh();
  };

  window.FTP = {
    env,
    register(name, init) {
      registry.set(name, init);
    },
    mount,
    unmount,
    refresh,
  };

  const startSmoothScroll = () => {
    if (calm || design || !fine || root.dataset.smooth !== 'true' || !window.Lenis) return;
    const lenis = new window.Lenis({ lerp: 0.12, smoothWheel: true, anchors: true });
    lenis.on('scroll', ST.update);
    G.ticker.add((t) => lenis.raf(t * 1000));
    G.ticker.lagSmoothing(0);
    env.lenis = lenis;
  };

  const openDialog = (dialog) => {
    if (!dialog || dialog.open) return;
    dialog.showModal();
    if (env.lenis) env.lenis.stop();
  };
  const closeDialog = (dialog) => {
    if (dialog && dialog.open) dialog.close();
  };
  const wireDialog = (dialog) => {
    if (!dialog || dialog.__ftpWired) return;
    dialog.__ftpWired = true;
    dialog.addEventListener('close', () => {
      if (env.lenis) env.lenis.start();
    });
    dialog.addEventListener('click', (e) => {
      if (e.target === dialog) closeDialog(dialog);
    });
  };

  const startHeader = () => {
    const wrap = $('.site-header-wrap');
    if (!wrap) return;
    const header = $('[data-site-header]', wrap);
    const menu = $('[data-site-menu]', wrap);
    wireDialog(menu);
    wrap.addEventListener('click', (e) => {
      if (e.target.closest('[data-menu-open]')) openDialog(menu);
      if (e.target.closest('[data-menu-close]')) closeDialog(menu);
    });
    if (menu) menu.addEventListener('click', (e) => {
      if (e.target.closest('a')) closeDialog(menu);
    });

    const paint = (section) => {
      const chapter = (section && $('.chapter', section)) || section;
      if (!chapter) return;
      const style = getComputedStyle(chapter);
      const bg = style.backgroundColor;
      const clear = bg === 'transparent' || bg === 'rgba(0, 0, 0, 0)';
      header.style.setProperty('--header-bg', clear ? 'var(--paper)' : bg);
      header.style.setProperty('--header-ink', clear ? 'var(--ink)' : style.color);
    };
    let current = null;
    let io = null;
    const watch = () => {
      if (io) io.disconnect();
      const group = $$('.shopify-section-group-header-group');
      const h = group.reduce((sum, el) => sum + el.offsetHeight, 0) || wrap.offsetHeight;
      io = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          current = entry.target;
          paint(current);
        });
      }, { rootMargin: `-${h}px 0px -${Math.max(0, innerHeight - h - 2)}px 0px` });
      $$('main > .shopify-section').forEach((s) => io.observe(s));
    };
    watch();
    let width = innerWidth;
    addEventListener('resize', () => {
      if (innerWidth === width) return;
      width = innerWidth;
      watch();
    });
    document.addEventListener('ftp:chapter-change', () => paint(current));
    document.addEventListener('shopify:section:load', watch);

    if (design) return;
    let last = scrollY;
    let queued = false;
    const onScroll = () => {
      queued = false;
      const y = scrollY;
      if (y < wrap.offsetHeight * 2 || y < last - 6) wrap.classList.remove('is-hidden');
      else if (y > last + 6) wrap.classList.add('is-hidden');
      if (Math.abs(y - last) > 6) last = y;
    };
    addEventListener('scroll', () => {
      if (queued) return;
      queued = true;
      requestAnimationFrame(onScroll);
    }, { passive: true });
  };

  const startSearch = () => {
    const sheet = $('[data-search-sheet]');
    if (!sheet) return;
    wireDialog(sheet);
    const input = $('[data-search-input]', sheet);
    const output = $('[data-search-output]', sheet);
    const starter = output.innerHTML;
    const rootUrl = (window.Shopify && window.Shopify.routes && window.Shopify.routes.root) || '/';
    let timer = null;
    let request = null;
    const run = () => {
      const q = input.value.trim();
      if (request) request.abort();
      if (!q) {
        output.innerHTML = starter;
        return;
      }
      request = new AbortController();
      const params = new URLSearchParams({ q, section_id: 'predictive-search', 'resources[type]': 'product', 'resources[limit]': '5' });
      fetch(`${rootUrl}search/suggest?${params}`, { signal: request.signal })
        .then((res) => (res.ok ? res.text() : Promise.reject(new Error('search'))))
        .then((html) => {
          const next = new DOMParser().parseFromString(html, 'text/html').querySelector('[data-search-results]');
          if (next) output.replaceChildren(...next.childNodes);
        })
        .catch(() => {});
    };
    input.addEventListener('input', () => {
      clearTimeout(timer);
      timer = setTimeout(run, 220);
    });
    document.addEventListener('click', (e) => {
      if (e.target.closest('[data-search-open]')) {
        e.preventDefault();
        openDialog(sheet);
        input.focus();
      }
      if (e.target.closest('[data-search-close]')) closeDialog(sheet);
    });
  };

  const startCart = () => {
    const sectionId = 'cart-drawer';
    const drawer = document.getElementById(sectionId);
    if (!drawer) return;
    wireDialog(drawer);
    const rootUrl = (window.Shopify && window.Shopify.routes && window.Shopify.routes.root) || '/';
    const jsonHeaders = { 'Content-Type': 'application/json', Accept: 'application/json', 'X-Requested-With': 'XMLHttpRequest' };

    const render = (html) => {
      const next = new DOMParser().parseFromString(html, 'text/html').querySelector('[data-cart-inner]');
      const inner = $('[data-cart-inner]', drawer);
      if (!next || !inner) return;
      const before = inner.dataset.pct || '0';
      inner.replaceWith(next);
      $$('[data-cart-count]').forEach((el) => {
        el.textContent = next.dataset.count;
      });
      const track = $('[data-ship-track]', next);
      if (track && before !== next.dataset.pct) {
        track.style.setProperty('--pct', before);
        track.getBoundingClientRect();
        requestAnimationFrame(() => track.style.setProperty('--pct', next.dataset.pct));
      }
    };

    const showHeader = () => {
      const wrap = $('.site-header-wrap');
      if (!wrap) return;
      wrap.style.transition = 'none';
      wrap.classList.remove('is-hidden');
      wrap.getBoundingClientRect();
      wrap.style.transition = '';
    };

    const fly = (source) => new Promise((resolve) => {
      const target = $('.cart-pill');
      if (calm || !source || !target) {
        resolve();
        return;
      }
      showHeader();
      const from = source.getBoundingClientRect();
      const to = target.getBoundingClientRect();
      if (!from.width) {
        resolve();
        return;
      }
      const clone = source.cloneNode(true);
      clone.removeAttribute('style');
      clone.setAttribute('aria-hidden', 'true');
      clone.style.cssText = `position:fixed;z-index:60;left:${from.left}px;top:${from.top}px;width:${from.width}px;height:${from.height}px;margin:0;pointer-events:none`;
      document.body.append(clone);
      G.timeline({ onComplete() { clone.remove(); resolve(); } })
        .to(clone, { x: to.left + to.width / 2 - (from.left + from.width / 2), duration: 0.7, ease: 'power1.inOut' }, 0)
        .to(clone, { y: to.top + to.height / 2 - (from.top + from.height / 2), duration: 0.7, ease: 'back.in(1.5)' }, 0)
        .to(clone, { scale: 0.14, rotation: 22, duration: 0.7, ease: 'power2.in' }, 0)
        .fromTo(target, { scale: 1 }, { scale: 1.1, duration: 0.14, ease: 'power2.out', yoyo: true, repeat: 1 }, 0.62);
    });

    const openWithLine = () => {
      openDialog(drawer);
      const line = $('.cart-line', drawer);
      if (!calm && line) G.fromTo(line, { x: 26, opacity: 0 }, { x: 0, opacity: 1, duration: 0.5, ease: 'power3.out', delay: 0.14, clearProps: 'all' });
    };

    document.addEventListener('click', (e) => {
      const opener = e.target.closest('[data-cart-open]');
      if (opener && !document.body.classList.contains('template-cart')) {
        e.preventDefault();
        openDialog(drawer);
      }
      if (e.target.closest('[data-cart-close]')) closeDialog(drawer);
    });

    drawer.addEventListener('click', async (e) => {
      const change = e.target.closest('[data-line-change]');
      if (!change || change.disabled) return;
      const line = Number(change.dataset.lineChange);
      const quantity = Number(change.dataset.qty);
      change.disabled = true;
      try {
        const res = await fetch(`${rootUrl}cart/change.js`, {
          method: 'POST',
          headers: jsonHeaders,
          body: JSON.stringify({ line, quantity, sections: [sectionId], sections_url: location.pathname }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.description || data.message);
        render(data.sections[sectionId]);
      } catch (err) {
        change.disabled = false;
        const box = $('[data-cart-error]', drawer);
        if (box) {
          box.textContent = err.message;
          box.hidden = false;
        }
      }
    });

    document.addEventListener('submit', async (e) => {
      const form = e.target;
      if (!form.matches || !form.matches('[data-add-form]')) return;
      e.preventDefault();
      const submit = $('[type="submit"]', form);
      if (submit && submit.getAttribute('aria-disabled') === 'true') return;
      if (submit) submit.setAttribute('aria-disabled', 'true');
      const label = $('[data-add-label]', form);
      const rest = label ? label.textContent : '';
      const error = $('[data-form-error]', form);
      if (error) error.hidden = true;
      const scope = form.closest('[data-tile], [data-product-root]');
      const source = scope && $('[data-fly-source]', scope);
      const body = new FormData(form);
      body.append('sections', sectionId);
      body.append('sections_url', location.pathname);
      try {
        const res = await fetch(`${rootUrl}cart/add.js`, { method: 'POST', headers: { Accept: 'application/json', 'X-Requested-With': 'XMLHttpRequest' }, body });
        const data = await res.json();
        if (!res.ok) throw new Error(data.description || data.message);
        await fly(source);
        render(data.sections[sectionId]);
        if (label) label.textContent = window.FTP.strings.added;
        setTimeout(() => {
          if (label) label.textContent = rest;
        }, 1200);
        openWithLine();
      } catch (err) {
        if (error) {
          error.textContent = err.message;
          error.hidden = false;
        } else if (label) {
          label.textContent = window.FTP.strings.soldOut;
          setTimeout(() => {
            label.textContent = rest;
          }, 1800);
        }
      } finally {
        if (submit) submit.removeAttribute('aria-disabled');
      }
    });
  };

  document.addEventListener('DOMContentLoaded', () => {
    window.FTP.strings = window.__ftpStrings || { added: 'Added', soldOut: 'Sold out' };
    startSmoothScroll();
    startHeader();
    startSearch();
    startCart();
    mount();
    window.FTP.ready = true;
    document.dispatchEvent(new CustomEvent('ftp:ready'));
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(refresh);
  });
  window.addEventListener('load', refresh);
  document.addEventListener('shopify:section:load', (e) => {
    mount(e.target);
    refresh();
  });
  document.addEventListener('shopify:section:unload', (e) => unmount(e.target));
  document.addEventListener('shopify:section:reorder', refresh);
})();
