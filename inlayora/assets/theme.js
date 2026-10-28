(() => {
  const T = window.theme || { routes: {}, strings: {} };
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

  const money = (cents) => {
    const amount = cents / 100;
    return new Intl.NumberFormat(T.locale || 'en-IN', {
      style: 'currency',
      currency: (window.Shopify && Shopify.currency && Shopify.currency.active) || 'INR',
      minimumFractionDigits: amount % 1 ? 2 : 0,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  let toastTimer;
  const toast = (msg) => {
    const t = $('[data-toast]');
    if (!t) return;
    t.textContent = msg;
    t.classList.add('is-on');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove('is-on'), 2600);
  };

  /* panels: menu, search, cart, filters */
  let lastFocus = null;
  const panel = (name) => $(`[data-panel="${name}"]`);
  const openPanel = (name) => {
    const el = panel(name);
    if (!el) return false;
    closePanels(true);
    lastFocus = document.activeElement;
    el.removeAttribute('inert');
    el.classList.add('is-open');
    $('[data-scrim]')?.classList.add('is-open');
    document.body.style.overflow = 'hidden';
    const f = el.querySelector('input[type="search"], button, a, input');
    setTimeout(() => f && f.focus({ preventScroll: true }), 60);
    return true;
  };
  const closePanels = (silent) => {
    let any = false;
    $$('[data-panel].is-open').forEach((p) => { p.classList.remove('is-open'); p.setAttribute('inert', ''); any = true; });
    $('[data-scrim]')?.classList.remove('is-open');
    document.body.style.overflow = '';
    if (any && !silent && lastFocus) lastFocus.focus({ preventScroll: true });
  };

  document.addEventListener('click', (e) => {
    const opener = e.target.closest('[data-open]');
    if (opener && openPanel(opener.dataset.open)) { e.preventDefault(); return; }
    if (e.target.closest('[data-close]') || e.target.matches('[data-scrim]')) closePanels();
  });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') { closePanels(); closeLightbox(); } });

  const header = $('[data-header]');
  if (header) {
    const onScroll = () => header.classList.toggle('is-scrolled', scrollY > 8);
    addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  /* reveal on scroll */
  const io = 'IntersectionObserver' in window && document.documentElement.classList.contains('js-reveal') && !reduced
    ? new IntersectionObserver((entries) => entries.forEach((en) => { if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); } }), { rootMargin: '0px 0px -8% 0px' })
    : null;
  const watchReveal = (root = document) => $$('.rv:not(.in)', root).forEach((el) => (io ? io.observe(el) : el.classList.add('in')));
  watchReveal();

  /* cart */
  const updateCartUI = (sections) => {
    const html = sections && sections['cart-drawer'];
    if (!html) return;
    const doc = new DOMParser().parseFromString(html, 'text/html');
    const fresh = doc.querySelector('[data-cart-drawer]');
    const current = $('[data-cart-drawer]');
    if (!fresh || !current) return;
    const wasOpen = current.classList.contains('is-open');
    current.replaceWith(fresh);
    if (wasOpen) { fresh.removeAttribute('inert'); fresh.classList.add('is-open'); }
    const count = fresh.dataset.count;
    $$('[data-cart-count]').forEach((c) => { c.textContent = count; c.dataset.cartCount = count; });
  };

  const addToCart = async (body, button) => {
    button?.classList.add('is-loading');
    try {
      body.append('sections', 'cart-drawer');
      body.append('sections_url', location.pathname + location.search);
      const res = await fetch(T.routes.cartAdd, { method: 'POST', headers: { Accept: 'application/json' }, body });
      const data = await res.json();
      if (!res.ok || data.status) { toast(data.description || data.message || T.strings.error); return; }
      updateCartUI(data.sections);
      if (!openPanel('cart')) toast(T.strings.added);
    } catch { toast(T.strings.error); }
    finally { button?.classList.remove('is-loading'); }
  };

  const changeLine = async (line, quantity) => {
    const drawer = $('[data-cart-drawer]');
    drawer?.classList.add('is-updating');
    const mainCart = $('[data-main-cart]');
    const sections = ['cart-drawer'];
    if (mainCart) sections.push(mainCart.dataset.sectionId);
    try {
      const res = await fetch(T.routes.cartChange, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ line, quantity, sections, sections_url: location.pathname + location.search }),
      });
      const data = await res.json();
      if (!res.ok || data.status) { toast(data.description || data.message || T.strings.error); return; }
      updateCartUI(data.sections);
      if (mainCart && data.sections[mainCart.dataset.sectionId]) {
        const doc = new DOMParser().parseFromString(data.sections[mainCart.dataset.sectionId], 'text/html');
        const fresh = doc.querySelector('[data-main-cart]');
        if (fresh) mainCart.replaceWith(fresh);
      }
    } catch { toast(T.strings.error); }
    finally { $('[data-cart-drawer]')?.classList.remove('is-updating'); }
  };

  document.addEventListener('click', (e) => {
    const q = e.target.closest('[data-quick-add]');
    if (q) {
      e.preventDefault();
      const fd = new FormData();
      fd.append('id', q.dataset.quickAdd);
      fd.append('quantity', '1');
      addToCart(fd, q);
      return;
    }
    const lc = e.target.closest('[data-line-change]');
    if (lc) { e.preventDefault(); changeLine(+lc.dataset.lineChange, Math.max(0, +lc.dataset.qty)); }
  });
  document.addEventListener('change', (e) => {
    const inp = e.target.closest('[data-line-input]');
    if (inp) changeLine(+inp.dataset.lineInput, Math.max(0, parseInt(inp.value, 10) || 0));
  });

  /* predictive search */
  customElements.define('predictive-search', class extends HTMLElement {
    connectedCallback() {
      this.input = $('[data-search-input]', this);
      this.results = $('[data-search-results]', this);
      let timer;
      this.input.addEventListener('input', () => { clearTimeout(timer); timer = setTimeout(() => this.search(), 220); });
    }
    async search() {
      const q = this.input.value.trim();
      if (q.length < 2) { this.results.innerHTML = ''; return; }
      this.controller?.abort();
      this.controller = new AbortController();
      try {
        const url = `${T.routes.predictiveSearch}?q=${encodeURIComponent(q)}&resources[type]=product&resources[limit]=5&section_id=predictive-search`;
        const res = await fetch(url, { signal: this.controller.signal });
        const doc = new DOMParser().parseFromString(await res.text(), 'text/html');
        const found = doc.querySelector('[data-predictive-results]');
        this.results.innerHTML = found ? found.outerHTML : '';
      } catch {}
    }
  });

  /* product page */
  let lightbox = null;
  function closeLightbox() {
    if (!lightbox || !lightbox.classList.contains('is-open')) return;
    lightbox.classList.remove('is-open');
    document.body.style.overflow = '';
  }

  customElements.define('product-info', class extends HTMLElement {
    connectedCallback() {
      const json = $('[data-variants]', this);
      this.variants = json ? JSON.parse(json.textContent) : [];
      this.form = $('form[data-product-form]', this);
      this.idInput = this.form && $('input[name="id"]', this.form);
      this.atc = $('[data-atc]', this);
      this.sticky = $('[data-sticky-buy]');
      this.initGallery();
      this.initOptions();
      this.initQty();
      this.initPin();
      this.initSticky();
      if (this.form) {
        this.form.addEventListener('submit', (e) => { e.preventDefault(); addToCart(new FormData(this.form), this.atc); });
      }
      $('[data-sticky-atc]')?.addEventListener('click', () => this.form?.requestSubmit());
      $('[data-sticky-buynow]')?.addEventListener('click', (ev) => this.buyNow(ev.currentTarget));
      $$('[data-open-fit]').forEach((a) => a.addEventListener('click', (ev) => {
        const fit = $('#fit');
        if (!fit) return;
        ev.preventDefault();
        fit.open = true;
        fit.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' });
      }));
      $$('[data-eta]').forEach((el) => {
        const d = new Date();
        d.setDate(d.getDate() + (+el.dataset.days || T.deliveryDays || 7));
        el.textContent = d.toLocaleDateString(T.locale || 'en-IN', { weekday: 'short', day: 'numeric', month: 'short' });
      });
      this.sizeCheck(this.currentVariant());
    }

    currentVariant() {
      const id = this.idInput ? +this.idInput.value : 0;
      return this.variants.find((v) => v.id === id) || this.variants[0];
    }

    initOptions() {
      const picker = $('[data-variant-picker]', this);
      if (!picker) return;
      document.addEventListener('click', (ev) => {
        const pick = ev.target.closest('[data-pick-value]');
        if (!pick) return;
        const input = $$('input[type="radio"]', picker).find((i) => i.value === pick.dataset.pickValue);
        if (input && !input.checked) { input.checked = true; picker.dispatchEvent(new Event('change', { bubbles: true })); }
      });
      picker.addEventListener('change', () => {
        const selected = $$('fieldset', picker).map((fs) => $('input:checked', fs)?.value);
        const v = this.variants.find((x) => x.options.every((o, i) => o === selected[i]));
        $$('fieldset', picker).forEach((fs, i) => { const l = $('[data-selected-value]', fs); if (l) l.textContent = selected[i]; });
        this.applyVariant(v);
      });
    }

    applyVariant(v) {
      const price = $('[data-price]', this);
      if (!v) {
        if (this.atc) { this.atc.disabled = true; this.atc.textContent = T.strings.unavailable; }
        return;
      }
      this.idInput.value = v.id;
      if (price) {
        price.querySelector('[data-price-now]').textContent = money(v.price);
        const was = price.querySelector('[data-price-was]');
        if (was) { was.textContent = v.compare_at_price > v.price ? money(v.compare_at_price) : ''; was.hidden = !(v.compare_at_price > v.price); }
      }
      if (this.atc) { this.atc.disabled = !v.available; this.atc.textContent = v.available ? T.strings.addToCart : T.strings.soldOut; }
      $$('[data-sticky-atc], [data-sticky-buynow]').forEach((b) => { b.disabled = !v.available; });
      $$('[data-bind="price"]').forEach((el) => { el.textContent = money(v.price); });
      $$('[data-bind="variant"]').forEach((el) => { el.textContent = v.title; });
      $$('[data-pick-value]').forEach((b) => b.setAttribute('aria-checked', String(v.options.includes(b.dataset.pickValue))));
      const url = new URL(location.href);
      url.searchParams.set('variant', v.id);
      history.replaceState({}, '', url);
      if (v.featured_media) this.goToMedia(v.featured_media.id);
      this.sizeCheck(v);
    }

    sizeCheck(v) {
      if (!v) return;
      const inches = (s) => { const m = String(s).match(/([0-9]+(?:[.][0-9]+)?)[ ]*(?:"|”|in(?![a-z])|inch)/i); return m ? parseFloat(m[1]) : null; };
      const inch = v.options.map(inches).find(Boolean);
      $$('[data-fit-section]').forEach((box) => {
        if (!inch) { box.hidden = true; return; }
        box.hidden = false;
        const cm = Math.round(inch * 2.54);
        const surface = +box.dataset.surfaceCm || 60;
        $('[data-fit-tray]', box).style.setProperty('--w', `${Math.min(100, Math.round((cm / surface) * 100))}%`);
        $('[data-fit-cm]', box).textContent = T.strings.fitAcross.replace('[cm]', cm);
        $('[data-fit-note]', box).textContent = inch <= 13 ? T.strings.fitSmall : inch <= 18 ? T.strings.fitMedium : T.strings.fitLarge;
      });
    }

    initGallery() {
      this.track = $('[data-gallery-track]', this);
      if (!this.track) return;
      const count = $('[data-gallery-count]', this);
      const slides = $$('[data-media-id]', this.track);
      const thumbs = $$('[data-thumb]', this);
      const set = (i) => {
        if (count) count.textContent = `${i + 1} / ${slides.length}`;
        thumbs.forEach((t, j) => t.classList.toggle('is-on', j === i));
      };
      this.track.addEventListener('scroll', () => set(Math.round(this.track.scrollLeft / this.track.clientWidth)), { passive: true });
      thumbs.forEach((t, i) => t.addEventListener('click', () => this.track.scrollTo({ left: this.track.clientWidth * i, behavior: reduced ? 'auto' : 'smooth' })));
      set(0);

      lightbox = $('[data-lightbox]');
      const lbTrack = lightbox && $('[data-lightbox-track]', lightbox);
      const lbCount = lightbox && $('[data-lightbox-count]', lightbox);
      if (!lbTrack) return;
      this.track.addEventListener('click', (e) => {
        const b = e.target.closest('[data-zoom]');
        if (!b) return;
        const i = +b.dataset.zoom;
        lightbox.classList.add('is-open');
        document.body.style.overflow = 'hidden';
        lbTrack.scrollLeft = lbTrack.clientWidth * i;
        lbCount.textContent = `${i + 1} / ${slides.length}`;
        $('[data-lightbox-close]', lightbox).focus();
      });
      lbTrack.addEventListener('scroll', () => { lbCount.textContent = `${Math.round(lbTrack.scrollLeft / lbTrack.clientWidth) + 1} / ${slides.length}`; }, { passive: true });
      lbTrack.addEventListener('click', (e) => { const s = e.target.closest('.lb__slide'); if (s && e.target.tagName === 'IMG') s.classList.toggle('is-zoomed'); });
      $('[data-lightbox-close]', lightbox).addEventListener('click', closeLightbox);
    }

    goToMedia(id) {
      if (!this.track) return;
      const slides = $$('[data-media-id]', this.track);
      const i = slides.findIndex((s) => +s.dataset.mediaId === id);
      if (i > -1) this.track.scrollTo({ left: this.track.clientWidth * i, behavior: reduced ? 'auto' : 'smooth' });
    }

    initQty() {
      const input = $('input[name="quantity"]', this);
      if (!input) return;
      $$('[data-qty-step]', this).forEach((b) => b.addEventListener('click', () => {
        input.value = Math.min(99, Math.max(1, (parseInt(input.value, 10) || 1) + +b.dataset.qtyStep));
      }));
    }

    initPin() {
      const form = $('[data-pin-form]', this);
      if (!form) return;
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        const val = $('input', form).value.trim();
        const out = $('[data-pin-out]', this);
        if (!/^[1-9][0-9]{5}$/.test(val)) { out.textContent = T.strings.pinInvalid; return; }
        const d = new Date();
        d.setDate(d.getDate() + (T.deliveryDays || 7));
        const date = d.toLocaleDateString(T.locale || 'en-IN', { weekday: 'short', day: 'numeric', month: 'short' });
        out.innerHTML = T.strings.pinResult.replace('[pincode]', val).replace('[date]', date) + (T.codAvailable ? ` ${T.strings.cod}` : '');
      });
    }

    async buyNow(button) {
      if (!this.form) return;
      button.classList.add('is-loading');
      try {
        const res = await fetch(T.routes.cartAdd, { method: 'POST', headers: { Accept: 'application/json' }, body: new FormData(this.form) });
        const data = await res.json();
        if (!res.ok || data.status) { toast(data.description || data.message || T.strings.error); return; }
        location.href = `${T.routes.root.replace(/[/]$/, '')}/checkout`;
      } catch { toast(T.strings.error); }
      finally { button.classList.remove('is-loading'); }
    }

    initSticky() {
      const target = $('[data-main-ctas]', this) || this.atc;
      if (!this.sticky || !target || !('IntersectionObserver' in window)) return;
      const controls = $$('button', this.sticky);
      const set = (on) => {
        this.sticky.classList.toggle('is-on', on);
        this.sticky.setAttribute('aria-hidden', String(!on));
        document.body.classList.toggle('has-buybar', on);
        controls.forEach((b) => (b.tabIndex = on ? 0 : -1));
      };
      new IntersectionObserver(([en]) => set(!en.isIntersecting), { threshold: 0 }).observe(target);
    }
  });

  /* craft steps player */
  customElements.define('step-player', class extends HTMLElement {
    connectedCallback() {
      this.imgs = $$('.sp__img', this);
      this.items = $$('.sp__steps li', this);
      this.count = $('[data-step-n]', this);
      this.interval = +this.dataset.interval || 5000;
      this.i = 0;
      this.classList.add('is-ready');
      this.items.forEach((li, k) => $('button', li).addEventListener('click', () => this.go(k, true)));
      this.go(0);
      if (reduced || this.items.length < 2 || !('IntersectionObserver' in window)) return;
      new IntersectionObserver(([en]) => { this.inView = en.isIntersecting; if (this.inView) this.play(); else this.pause(); }, { threshold: 0.4 }).observe(this);
      document.addEventListener('visibilitychange', () => { if (document.hidden) this.pause(); else if (this.inView) this.play(); });
    }
    go(n, user) {
      this.i = (n + this.items.length) % this.items.length;
      this.imgs.forEach((im, k) => im.classList.toggle('is-on', k === this.i));
      this.items.forEach((li, k) => {
        li.classList.toggle('is-on', k === this.i);
        li.classList.toggle('is-done', k < this.i);
        const b = $('button', li);
        if (k === this.i) b.setAttribute('aria-current', 'step'); else b.removeAttribute('aria-current');
        const em = $('em', li);
        if (em) { em.style.animation = 'none'; void em.offsetWidth; em.style.animation = ''; }
      });
      if (this.count) this.count.textContent = this.i + 1;
      if (user && this.visible) this.play();
    }
    play() {
      this.visible = true;
      this.classList.add('is-playing');
      clearTimeout(this.timer);
      this.timer = setTimeout(() => this.go(this.i + 1, true), this.interval);
    }
    pause() {
      this.visible = false;
      this.classList.remove('is-playing');
      clearTimeout(this.timer);
    }
  });

  /* product recommendations */
  customElements.define('product-recommendations', class extends HTMLElement {
    connectedCallback() {
      const load = async () => {
        try {
          const res = await fetch(this.dataset.url);
          const doc = new DOMParser().parseFromString(await res.text(), 'text/html');
          const fresh = doc.querySelector('product-recommendations');
          if (fresh && fresh.innerHTML.trim()) { this.innerHTML = fresh.innerHTML; watchReveal(this); }
          else this.closest('.shopify-section')?.setAttribute('hidden', '');
        } catch {}
      };
      if (!('IntersectionObserver' in window)) { load(); return; }
      const obs = new IntersectionObserver(([en]) => { if (en.isIntersecting) { obs.disconnect(); load(); } }, { rootMargin: '0px 0px 400px 0px' });
      obs.observe(this);
    }
  });

  /* collection & search filters: submit on change */
  $$('[data-facets-form]').forEach((form) => {
    form.addEventListener('change', (e) => { if (!e.target.closest('[data-panel]')) form.requestSubmit(); });
  });
})();
