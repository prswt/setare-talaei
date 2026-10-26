/* Setare Talaei — storefront behaviour */
(function () {
  'use strict';

  const { fa, toman, CATS, DESIGNS, SHANEH, products } = window.ST;
  const PAL = window.Loom.PALETTES;
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const byId = Object.fromEntries(products.map((p) => [p.id, p]));
  const DPR = Math.min(window.devicePixelRatio || 1, 2);
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const toEn = (s) => String(s).replace(/[۰-۹]/g, (d) => '۰۱۲۳۴۵۶۷۸۹'.indexOf(d)).replace(/[٠-٩]/g, (d) => '٠١٢٣٤٥٦٧٨٩'.indexOf(d));
  const icon = (id, cls) => `<svg${cls ? ` class="${cls}"` : ''}><use href="#i-${id}"/></svg>`;
  const T = (n) => `${toman(n)} <small>تومان</small>`;

  /* ---------------- state ---------------- */
  const KEY = 'setare-v1';
  const state = Object.assign({ cart: [], wish: [], compare: [], user: null, wallet: 0, tx: [], orders: [], stars: 0, coupon: null }, load());
  function load() { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) { return {}; } }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { /* storage unavailable: keep in memory */ } syncBadges(); }
  function ss(k, v) { try { if (v === undefined) return sessionStorage.getItem(k); sessionStorage.setItem(k, v); } catch (e) { return null; } }

  function syncBadges() {
    const n = { cart: state.cart.reduce((a, i) => a + i.qty, 0), wish: state.wish.length, compare: state.compare.length };
    $$('[data-count]').forEach((b) => { const v = n[b.dataset.count]; b.textContent = v ? fa(v) : ''; b.classList.toggle('is-on', !!v); });
    $$('[data-wallet]').forEach((el) => { el.textContent = toman(state.wallet); });
  }
  function bump(kind) { $$(`[data-count="${kind}"]`).forEach((b) => { b.classList.remove('bump'); void b.offsetWidth; b.classList.add('bump'); }); }

  function toast(msg, ic) {
    const t = document.createElement('div'); t.className = 'toast'; t.innerHTML = icon(ic || 'check') + `<span>${msg}</span>`;
    $('#toasts').appendChild(t);
    setTimeout(() => { t.classList.add('is-out'); setTimeout(() => t.remove(), 320); }, 2600);
  }

  /* ---------------- rug images ---------------- */
  function rugOpts(p, cssW, palette, extra) {
    const o = window.ST.imgOpts(p, Math.round(cssW * DPR), palette);
    return Object.assign(o, extra || {});
  }
  const lazy = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (!e.isIntersecting) return;
      const img = e.target; lazy.unobserve(img);
      const p = byId[img.dataset.rug]; if (!p) return;
      window.Loom.weaveInto(img, rugOpts(p, +img.dataset.w || 200, img.dataset.pal || null, img.hasAttribute('data-crop') ? { width: Math.round((+img.dataset.w) * DPR), height: Math.round((+img.dataset.w) * DPR * 1.5) } : null));
    });
  }, { rootMargin: '600px 0px' });
  function hydrate(root) { $$('img[data-rug]:not([src])', root).forEach((img) => lazy.observe(img)); }
  function rugImgHTML(p, w, palette, cls) { return `<img alt="${p.title}" data-rug="${p.id}" data-w="${w}"${palette ? ` data-pal="${palette}"` : ''}${cls ? ` class="${cls}"` : ''}>`; }

  /* ---------------- product card ---------------- */
  function card(p, o) {
    o = o || {};
    const wish = state.wish.includes(p.id);
    const tags = (p.off ? `<span class="tag tag--off">${fa(p.off)}٪</span>` : '') + (p.isNew ? '<span class="tag tag--new">تازه</span>' : '');
    const size = p.sizes[p.defaultSize];
    const meta = [p.shaneh ? `${fa(p.shaneh)} شانه` : CATS[p.cat].name, DESIGNS[p.design], `<span><i class="dot" style="background:${PAL[p.palette].field}"></i>${PAL[p.palette].name}</span>`];
    const stock = o.deal ? (() => { const pct = 52 + (p.seed % 41); return `<div class="stock"><i style="width:${pct}%"></i></div><p class="stock-l">${fa(pct)}٪ فروخته شده</p>`; })() : '';
    const html = `
      <article class="pcard" data-pid="${p.id}">
        <div class="pcard__img" data-act="open" role="button" tabindex="0" aria-label="${p.title}">
          ${rugImgHTML(p, 200)}
          <div class="pcard__tags">${tags}</div>
        </div>
        <button class="pcard__wish${wish ? ' is-on' : ''}" type="button" data-act="wish" aria-label="افزودن به علاقه‌مندی‌ها" aria-pressed="${wish}">${icon(wish ? 'heart-fill' : 'heart')}</button>
        <h3 class="pcard__name" data-act="open">${p.title}</h3>
        <div class="pcard__meta">${meta.join('<span aria-hidden="true">/</span>')}</div>
        <div class="pcard__row">
          <div class="price">${p.off ? `<s>${toman(p.price())}</s>` : ''}<b>${T(p.finalPrice())}</b></div>
          <span class="rating">${icon('star')}${fa(p.rating)}</span>
        </div>
        <small style="color:var(--ink-3);font-size:12px;margin-top:-6px">${size.nick || size.label}</small>
        ${stock}
      </article>`;
    if (!o.rank) return html;
    return `<div class="rank"><span class="rank__n" aria-hidden="true">${fa(o.rank)}</span>${html}</div>`;
  }

  document.addEventListener('click', (e) => {
    const act = e.target.closest('[data-act]');
    if (!act) return;
    const host = act.closest('[data-pid]');
    const p = host && byId[host.dataset.pid];
    if (!p) return;
    if (act.dataset.act === 'open') openProduct(p.id);
    if (act.dataset.act === 'wish') toggleWish(p.id);
  });
  document.addEventListener('keydown', (e) => {
    if ((e.key === 'Enter' || e.key === ' ') && e.target.matches('.pcard__img')) { e.preventDefault(); openProduct(e.target.closest('[data-pid]').dataset.pid); }
  });

  function toggleWish(id) {
    const i = state.wish.indexOf(id);
    if (i >= 0) state.wish.splice(i, 1); else state.wish.push(id);
    save(); bump('wish');
    const on = i < 0;
    $$(`[data-pid="${id}"] .pcard__wish, [data-wish-btn="${id}"]`).forEach((b) => { b.classList.toggle('is-on', on); b.setAttribute('aria-pressed', on); b.innerHTML = icon(on ? 'heart-fill' : 'heart'); });
    toast(on ? 'به علاقه‌مندی‌ها اضافه شد' : 'از علاقه‌مندی‌ها حذف شد', 'heart');
    if (!$('#wish').hidden) renderWish();
  }

  /* ---------------- HERO ---------------- */
  const heroEl = $('#hero');
  let entered = false;
  function enter() {
    if (entered) return; entered = true;
    document.body.classList.add('is-entered');
    scheduleWelcome();
  }
  const hero = new window.SetareHero({ root: heroEl, glCanvas: $('#hero-gl'), overlay: $('#hero-stars'), onTitle: enter });
  $('#hero-skip').addEventListener('click', () => { hero.skip(); enter(); });
  $('#hero-stars').addEventListener('dblclick', () => hero.replay());

  const sky = $('.hero__sky'), nav = $('#nav');
  let ticking = false;
  function onScroll() {
    if (ticking) return; ticking = true;
    requestAnimationFrame(() => {
      ticking = false;
      const y = scrollY, h = heroEl.offsetHeight;
      const k = Math.min(1, y / h);
      sky.style.transform = `scale(${1 + k * 0.06}) translateY(${k * -4}%)`;
      sky.style.opacity = String(1 - k * 0.65);
      nav.classList.toggle('nav--light', y > h - 70);
      if (y > 40 && !entered) { hero.skip(); enter(); }
    });
  }
  addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* ---------------- countdowns ---------------- */
  function endOfWeek() { const d = new Date(); const add = (5 - d.getDay() + 7) % 7; d.setDate(d.getDate() + add); d.setHours(23, 59, 59, 0); return d; }
  function endOfDay() { const d = new Date(); d.setHours(23, 59, 59, 0); return d; }
  const pad = (n) => String(n).padStart(2, '0');
  function tick() {
    const now = Date.now();
    $$('[data-countdown]').forEach((el) => {
      const end = el.dataset.countdown === 'campaign' ? endOfWeek() : endOfDay();
      let s = Math.max(0, Math.floor((end - now) / 1000));
      const d = Math.floor(s / 86400); s -= d * 86400;
      const hms = `${pad(Math.floor(s / 3600))}:${pad(Math.floor((s % 3600) / 60))}:${pad(s % 60)}`;
      el.textContent = fa(d > 0 ? `${d} روز و ${hms}` : hms);
    });
  }
  tick(); setInterval(tick, 1000);

  /* ---------------- promo slider ---------------- */
  (function promo() {
    const slides = $$('.slide'), dots = $$('#promo-dots button'), dotsWrap = $('#promo-dots');
    const MS = 6500; document.documentElement.style.setProperty('--slide-ms', MS + 'ms');
    let i = 0, timer = null, paused = false;
    function go(n) {
      slides[i].classList.remove('is-active'); dots[i].classList.remove('is-active');
      i = (n + slides.length) % slides.length;
      slides[i].classList.add('is-active');
      dots[i].classList.remove('is-active'); void dots[i].offsetWidth; dots[i].classList.add('is-active');
      dots.forEach((d, k) => d.setAttribute('aria-selected', k === i));
      schedule();
    }
    function schedule() { clearTimeout(timer); if (!paused) timer = setTimeout(() => go(i + 1), MS); }
    dots.forEach((d, k) => d.addEventListener('click', () => go(k)));
    $('#promo-pause').addEventListener('click', (e) => {
      paused = !paused; dotsWrap.classList.toggle('is-paused', paused);
      e.currentTarget.innerHTML = icon(paused ? 'play' : 'pause');
      e.currentTarget.setAttribute('aria-label', paused ? 'پخش اسلایدر' : 'توقف اسلایدر');
      if (paused) clearTimeout(timer); else go(i + 1);
    });
    let sx = null;
    const track = $('#promo-track');
    track.addEventListener('pointerdown', (e) => { sx = e.clientX; });
    track.addEventListener('pointerup', (e) => { if (sx == null) return; const dx = e.clientX - sx; sx = null; if (Math.abs(dx) > 50) go(i + (dx > 0 ? 1 : -1)); });
    document.addEventListener('visibilitychange', () => { if (document.hidden) clearTimeout(timer); else schedule(); });
    schedule();
  })();
  $$('[data-collection]').forEach((a) => a.addEventListener('click', () => { filters.collection = a.dataset.collection; renderShop(true); }));

  /* ---------------- rails ---------------- */
  function renderRail(el, list, o) { el.innerHTML = list.map((p, k) => card(p, o && o.rank ? { rank: k + 1 } : o)).join(''); hydrate(el); }
  renderRail($('#deals-rail'), products.filter((p) => p.off).sort((a, b) => b.off - a.off).slice(0, 8), { deal: true });
  renderRail($('#best-rail'), products.slice().sort((a, b) => b.sold - a.sold).slice(0, 8), { rank: true });

  function seg(el, onPick) {
    const pill = document.createElement('span'); pill.className = 'seg__pill'; el.prepend(pill);
    const btns = $$('button', el);
    function place(b) { pill.style.left = b.offsetLeft + 'px'; pill.style.width = b.offsetWidth + 'px'; }
    btns.forEach((b) => b.addEventListener('click', () => {
      btns.forEach((x) => { x.classList.toggle('is-active', x === b); x.setAttribute('aria-selected', x === b); });
      place(b); onPick(b);
    }));
    const init = () => place(btns.find((b) => b.classList.contains('is-active')) || btns[0]);
    requestAnimationFrame(init); document.fonts && document.fonts.ready.then(init); addEventListener('resize', init);
  }
  const catRail = $('#cat-rail');
  seg($('#cat-tabs'), (b) => { renderRail(catRail, products.filter((p) => p.cat === b.dataset.cat)); catRail.scrollTo({ left: 0 }); });
  renderRail(catRail, products.filter((p) => p.cat === 'farsh'));
  $$('.rail-wrap').forEach((w) => {
    const r = $('.rail', w);
    $('.rail-btn--prev', w).addEventListener('click', () => r.scrollBy({ left: 260, behavior: 'smooth' }));
    $('.rail-btn--next', w).addEventListener('click', () => r.scrollBy({ left: -260, behavior: 'smooth' }));
  });

  // static [data-rug] images in slides, popups, journal
  hydrate(document);

  /* ---------------- shop ---------------- */
  const filters = { cat: new Set(), size: new Set(), shaneh: new Set(), design: new Set(), palette: new Set(), priceMax: 60, off: false, collection: null, q: '' };
  let shopPage = 1;
  const sizeLabels = Array.from(new Set(products.flatMap((p) => p.sizes.map((s) => s.label))));
  function chipBtns(el, items, key) {
    el.innerHTML = items.map((it) => `<button type="button" data-v="${it.v}">${it.t}</button>`).join('');
    $$('button', el).forEach((b) => b.addEventListener('click', () => {
      const set = filters[key]; const v = key === 'shaneh' ? +b.dataset.v : b.dataset.v;
      set.has(v) ? set.delete(v) : set.add(v); renderShop(true);
    }));
  }
  chipBtns($('[data-f=cat]'), Object.keys(CATS).map((k) => ({ v: k, t: CATS[k].name })), 'cat');
  chipBtns($('[data-f=size]'), sizeLabels.map((l) => ({ v: l, t: l })), 'size');
  chipBtns($('[data-f=shaneh]'), Object.keys(SHANEH).map((k) => ({ v: k, t: fa(k) })), 'shaneh');
  chipBtns($('[data-f=design]'), Object.keys(DESIGNS).map((k) => ({ v: k, t: DESIGNS[k] })), 'design');
  const swEl = $('[data-f=palette]');
  swEl.innerHTML = Object.keys(PAL).map((k) => `<button type="button" data-v="${k}" style="--c:${PAL[k].field}" aria-label="${PAL[k].name}" title="${PAL[k].name}"></button>`).join('');
  $$('button', swEl).forEach((b) => b.addEventListener('click', () => { const s = filters.palette; s.has(b.dataset.v) ? s.delete(b.dataset.v) : s.add(b.dataset.v); renderShop(true); }));
  const priceMax = $('#price-max');
  priceMax.addEventListener('input', () => { filters.priceMax = +priceMax.value; renderShop(true); });
  $('#f-off').addEventListener('change', (e) => { filters.off = e.target.checked; renderShop(true); });
  $('#sort').addEventListener('change', () => renderShop(true));
  $('#filter-reset').addEventListener('click', () => resetFilters());
  $('#shop-more').addEventListener('click', () => { shopPage++; renderShop(false); });
  $('#filter-toggle').addEventListener('click', () => { $('#filters').classList.add('is-open'); showScrim(true, () => $('#filters').classList.remove('is-open')); });
  $('#filter-close').addEventListener('click', () => { $('#filters').classList.remove('is-open'); showScrim(false); });

  function resetFilters() {
    ['cat', 'size', 'shaneh', 'design', 'palette'].forEach((k) => filters[k].clear());
    filters.priceMax = 60; priceMax.value = 60; filters.off = false; $('#f-off').checked = false; filters.collection = null; filters.q = ''; $('#search').value = '';
    renderShop(true);
  }
  function minPrice(p) { return Math.min.apply(null, p.sizes.map((s, i) => p.finalPrice(i))); }
  function matches(p) {
    const f = filters;
    if (f.cat.size && !f.cat.has(p.cat)) return false;
    if (f.size.size && !p.sizes.some((s) => f.size.has(s.label))) return false;
    if (f.shaneh.size && !f.shaneh.has(p.shaneh)) return false;
    if (f.design.size && !f.design.has(p.design)) return false;
    if (f.palette.size && !f.palette.has(p.palette)) return false;
    if (f.priceMax < 60 && minPrice(p) > f.priceMax * 1e6) return false;
    if (f.off && !p.off) return false;
    if (f.collection && p.collection !== f.collection) return false;
    if (f.q && !searchText(p).includes(f.q)) return false;
    return true;
  }
  function searchText(p) { return [p.title, p.name, CATS[p.cat].name, DESIGNS[p.design], PAL[p.palette].name, p.shaneh ? fa(p.shaneh) : '', p.collection || ''].join(' '); }
  function renderShop(reset) {
    if (reset) shopPage = 1;
    const sort = $('#sort').value;
    let list = products.filter(matches);
    const sorters = { best: (a, b) => b.sold - a.sold, new: (a, b) => (b.isNew - a.isNew) || (b.seed - a.seed), cheap: (a, b) => minPrice(a) - minPrice(b), exp: (a, b) => minPrice(b) - minPrice(a), off: (a, b) => b.off - a.off };
    list.sort(sorters[sort]);
    const per = 12, shown = list.slice(0, shopPage * per);
    const grid = $('#shop-grid');
    grid.innerHTML = shown.length ? shown.map((p) => card(p)).join('') : '<p class="empty">با این فیلترها چیزی پیدا نشد. یکی دو فیلتر را بردارید یا <button type="button" class="link" id="empty-reset">همه را پاک کنید</button>.</p>';
    const er = $('#empty-reset'); if (er) er.addEventListener('click', resetFilters);
    hydrate(grid);
    $('#shop-more').hidden = shown.length >= list.length;
    $('#shop-h').textContent = filters.collection ? `کلکسیون ${filters.collection}` : filters.cat.size === 1 ? `همه ${CATS[Array.from(filters.cat)[0]].plural}` : 'همه فرش‌ها';
    // reflect filter UI
    ['cat', 'size', 'shaneh', 'design'].forEach((k) => $$(`[data-f=${k}] button`).forEach((b) => b.classList.toggle('is-on', filters[k].has(k === 'shaneh' ? +b.dataset.v : b.dataset.v))));
    $$('[data-f=palette] button').forEach((b) => b.classList.toggle('is-on', filters.palette.has(b.dataset.v)));
    $('#price-out').textContent = filters.priceMax >= 60 ? 'بدون محدودیت' : `${fa(filters.priceMax)} میلیون تومان`;
    const act = [];
    const lab = { cat: (v) => CATS[v].name, size: (v) => v, shaneh: (v) => `${fa(v)} شانه`, design: (v) => DESIGNS[v], palette: (v) => PAL[v].name };
    Object.keys(lab).forEach((k) => filters[k].forEach((v) => act.push({ t: lab[k](v), k, v })));
    if (filters.collection) act.push({ t: `کلکسیون ${filters.collection}`, k: 'collection' });
    if (filters.q) act.push({ t: `«${filters.q}»`, k: 'q' });
    if (filters.off) act.push({ t: 'تخفیف‌دار', k: 'off' });
    const box = $('#shop-active');
    box.innerHTML = act.length ? `<span>${fa(list.length)} محصول</span>` + act.map((a, i) => `<button type="button" data-i="${i}">${a.t}${icon('close')}</button>`).join('') : '';
    $$('button', box).forEach((b) => b.addEventListener('click', () => {
      const a = act[+b.dataset.i];
      if (a.k === 'collection') filters.collection = null; else if (a.k === 'q') { filters.q = ''; $('#search').value = ''; } else if (a.k === 'off') { filters.off = false; $('#f-off').checked = false; } else filters[a.k].delete(a.v);
      renderShop(true);
    }));
  }
  renderShop(true);
  $$('a[data-cat]').forEach((a) => a.addEventListener('click', () => { filters.cat.clear(); filters.cat.add(a.dataset.cat); filters.collection = null; renderShop(true); }));

  /* ---------------- search ---------------- */
  (function search() {
    const input = $('#search'), pop = $('#search-pop');
    let hot = -1, results = [];
    function render() {
      const q = input.value.trim();
      if (!q) { pop.classList.remove('is-open'); return; }
      results = products.filter((p) => searchText(p).includes(q) || toEn(searchText(p)).includes(toEn(q))).slice(0, 6);
      pop.innerHTML = results.length
        ? results.map((p, i) => `<button type="button" role="option" data-i="${i}" class="${i === hot ? 'is-hot' : ''}">${rugImgHTML(p, 34)}<span><b>${p.title}</b><small>${p.subtitle.join('، ')}</small></span></button>`).join('') + `<button type="button" data-all style="justify-content:center;color:var(--gold-ink);font-size:14px">همه نتایج برای «${q}»</button>`
        : `<p class="empty">برای «${q}» چیزی نداریم. «افشان»، «کناره» یا «سرمه‌ای» را امتحان کنید.</p>`;
      pop.classList.add('is-open'); hydrate(pop);
    }
    function all() { filters.q = input.value.trim(); pop.classList.remove('is-open'); renderShop(true); $('#shop').scrollIntoView({ behavior: reduced ? 'auto' : 'smooth' }); }
    input.addEventListener('input', () => { hot = -1; render(); });
    input.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowDown') { hot = Math.min(results.length - 1, hot + 1); render(); e.preventDefault(); }
      else if (e.key === 'ArrowUp') { hot = Math.max(-1, hot - 1); render(); e.preventDefault(); }
      else if (e.key === 'Enter') { if (hot >= 0) { openProduct(results[hot].id); pop.classList.remove('is-open'); } else all(); }
      else if (e.key === 'Escape') pop.classList.remove('is-open');
    });
    pop.addEventListener('click', (e) => {
      const b = e.target.closest('button'); if (!b) return;
      if (b.hasAttribute('data-all')) all(); else { openProduct(results[+b.dataset.i].id); pop.classList.remove('is-open'); }
    });
    document.addEventListener('click', (e) => { if (!e.target.closest('.nav__search')) pop.classList.remove('is-open'); });
  })();

  /* ---------------- overlays ---------------- */
  const stack = [];
  let scrimCb = null;
  function showScrim(on, cb) {
    const s = $('#scrim');
    if (on) { scrimCb = cb || null; s.hidden = false; requestAnimationFrame(() => s.classList.add('is-open')); document.documentElement.style.overflow = 'hidden'; }
    else { s.classList.remove('is-open'); setTimeout(() => { if (!s.classList.contains('is-open')) s.hidden = true; }, 350); document.documentElement.style.overflow = ''; scrimCb = null; }
  }
  $('#scrim').addEventListener('click', () => { if (stack.length) close(stack[stack.length - 1]); else if (scrimCb) { scrimCb(); showScrim(false); } });
  function open(id) {
    const el = document.getElementById(id);
    if (!el) return;
    if (stack.includes(id)) return;
    const prev = document.activeElement;
    el._return = prev;
    el.hidden = false;
    requestAnimationFrame(() => requestAnimationFrame(() => el.classList.add('is-open')));
    stack.push(id);
    const modalish = id !== 'chat' || innerWidth <= 820;
    if (modalish) showScrim(true);
    setTimeout(() => { const f = el.querySelector('[autofocus], input:not([type=hidden]), button:not(.modal__x):not([data-close])'); if (f && id !== 'product') f.focus({ preventScroll: true }); else el.setAttribute('tabindex', '-1'), el.focus({ preventScroll: true }); }, 60);
  }
  function close(id) {
    const el = document.getElementById(id);
    if (!el || el.hidden) return;
    el.classList.remove('is-open');
    const i = stack.indexOf(id); if (i >= 0) stack.splice(i, 1);
    setTimeout(() => { if (!el.classList.contains('is-open')) el.hidden = true; }, 420);
    if (!stack.some((s) => s !== 'chat' || innerWidth <= 820)) showScrim(false);
    if (el._return && el._return.focus) el._return.focus({ preventScroll: true });
    if (id === 'product') { const mv = $('model-viewer', el); if (mv) mv.remove(); }
  }
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && stack.length) close(stack[stack.length - 1]); });
  document.addEventListener('click', (e) => {
    const c = e.target.closest('[data-close]');
    if (c) { const host = c.closest('.modal, .drawer, .popup, .chat-panel'); if (host) close(host.id); return; }
    const o = e.target.closest('[data-open]');
    if (!o) return;
    e.preventDefault();
    const what = o.dataset.open;
    if (what === 'cart') { renderCart(); open('cart'); }
    else if (what === 'wish') { renderWish(); open('wish'); }
    else if (what === 'compare') { if (state.compare.length) { renderCompare(); open('compare'); } else toast('هنوز محصولی برای مقایسه انتخاب نکرده‌اید', 'compare'); }
    else if (what === 'account') requireUser(() => { renderAccount(o.dataset.tab || 'home'); open('account'); });
    else if (what === 'chat') openChat();
  });
  $$('[data-go]').forEach((b) => b.addEventListener('click', () => document.getElementById(b.dataset.go).scrollIntoView({ behavior: reduced ? 'auto' : 'smooth' })));

  /* ---------------- product sheet ---------------- */
  const REVIEWS = [
    ['مریم، شیراز', 'رنگش دقیقاً همانی بود که در عکس دیدم. پرزها نرم است و بوی نامطبوعی نداشت.'],
    ['حمید، تبریز', 'سه روزه رسید و بسته‌بندی محکم بود. قبلش با «دیدن در فضا» اندازه را امتحان کردیم و درست درآمد.'],
    ['نرگس، تهران', 'برای پذیرایی گرفتم؛ کنار مبل طوسی خیلی خوب نشسته. قسطی خریدم و راحت بود.'],
  ];
  let pdState = null;
  function openProduct(id, o) {
    const p = byId[id]; if (!p) return;
    o = o || {};
    pdState = { p, size: o.size != null ? o.size : p.defaultSize, pal: o.palette || p.palette, qty: 1, tab: o.tab || 'img' };
    renderProduct();
    open('product');
  }
  function renderProduct() {
    const { p, size, pal, tab } = pdState;
    const el = $('#product');
    const s = p.sizes[size];
    const price = p.price(size), fin = p.finalPrice(size);
    const wish = state.wish.includes(p.id), cmp = state.compare.includes(p.id);
    el.innerHTML = `
      <button class="icon-btn modal__x" type="button" data-close aria-label="بستن">${icon('close')}</button>
      <div class="pd">
        <div class="pd__gallery">
          <div class="pd__tabs"><div class="seg" role="tablist" id="pd-tabs">
            <button type="button" role="tab" data-t="img" class="${tab === 'img' ? 'is-active' : ''}">تصویر</button>
            <button type="button" role="tab" data-t="3d" class="${tab === '3d' ? 'is-active' : ''}">سه‌بعدی و AR</button>
            <button type="button" role="tab" data-t="room">در اتاق من</button>
          </div></div>
          <div class="pd__view" id="pd-view"></div>
        </div>
        <div class="pd__info">
          <p class="crumbs">${CATS[p.cat].plural}${p.collection ? ` / کلکسیون ${p.collection}` : ''}</p>
          <div>
            <h2 class="pd__title" id="pd-title">${p.title}</h2>
            <div class="pd__line"><span class="rating">${icon('star')}${fa(p.rating)} از ${fa(p.reviews)} نظر</span><span>${fa(p.sold.toLocaleString('en-US').replace(/,/g, '٬'))} خرید موفق</span>${p.shaneh ? `<span>${fa(p.shaneh)} شانه، تراکم ${fa(p.density)}</span>` : ''}</div>
          </div>
          <div><p class="pd__label">رنگ زمینه <span>${PAL[pal].name}</span></p>
            <div class="variants">${p.colors.map((c) => `<button type="button" data-pal="${c}" class="${c === pal ? 'is-on' : ''}" aria-label="${PAL[c].name}">${rugImgHTML(p, 50, c)}</button>`).join('')}</div></div>
          <div><p class="pd__label">ابعاد <span>${s.label} سانتی‌متر${s.nick ? `، ${s.nick}` : ''}</span></p>
            <div class="sizes">${p.sizes.map((z, i) => `<button type="button" data-size="${i}" class="${i === size ? 'is-on' : ''}">${z.label}<small>${toman(p.finalPrice(i))}</small></button>`).join('')}</div></div>
          <div class="pd__price">${p.off ? `<span class="tag tag--off">${fa(p.off)}٪</span><s>${toman(price)}</s>` : ''}<b>${T(fin)}</b></div>
          <p class="installment">یا <b>۴ قسط ${toman(Math.ceil(fin / 4 / 1000) * 1000)} تومانی</b> با اسنپ‌پی یا دی‌جی‌پی، بدون ضامن</p>
          <div class="pd__buy">
            <div class="stepper" style="margin:0"><button type="button" data-q="1" aria-label="یکی بیشتر">${icon('plus')}</button><span id="pd-qty">${fa(pdState.qty)}</span><button type="button" data-q="-1" aria-label="یکی کمتر">${icon('minus')}</button></div>
            <button class="btn btn--gold" type="button" id="pd-add">${icon('bag')}افزودن به سبد</button>
            <button class="icon-btn${wish ? ' is-on' : ''}" type="button" data-wish-btn="${p.id}" aria-label="علاقه‌مندی" aria-pressed="${wish}">${icon(wish ? 'heart-fill' : 'heart')}</button>
            <button class="icon-btn${cmp ? ' is-on' : ''}" type="button" id="pd-cmp" aria-label="مقایسه" aria-pressed="${cmp}">${icon('compare')}</button>
          </div>
          <button class="btn btn--navy" type="button" id="pd-buy">خرید فوری</button>
          <p class="ship-note">${icon('truck')}${fin >= 5e6 ? 'ارسال رایگان' : 'ارسال با پست پیشتاز'}؛ تهران فردا، شهرهای دیگر ۲ تا ۴ روز کاری</p>
          <dl class="specs">
            ${p.shaneh ? `<div><dt>شانه</dt><dd>${fa(p.shaneh)}</dd></div><div><dt>تراکم</dt><dd>${fa(p.density)}</dd></div>` : ''}
            <div><dt>طرح</dt><dd>${DESIGNS[p.design]}</dd></div><div><dt>رنگ زمینه</dt><dd>${PAL[pal].name}</dd></div>
            <div><dt>جنس</dt><dd>${p.material}</dd></div><div><dt>محل تولید</dt><dd>کاشان</dd></div>
            ${p.cat === 'farsh' || p.cat === 'kenare' ? '<div><dt>ارتفاع پرز</dt><dd>۱۰ میلی‌متر</dd></div><div><dt>پشت فرش</dt><dd>ضدحساسیت</dd></div>' : ''}
            ${p.cat === 'rufarshi' ? '<div><dt>شست‌وشو</dt><dd>ماشین لباسشویی</dd></div>' : ''}
          </dl>
          <div class="reviews"><p class="pd__label">نظر خریداران <span>نمونه</span></p>${REVIEWS.map((r) => `<div class="review"><b>${r[0]}</b> <span class="rating">${icon('star')}${fa(5)}</span><p>${r[1]}</p></div>`).join('')}</div>
        </div>
      </div>`;
    hydrate(el);
    renderView();
    seg($('#pd-tabs', el), (b) => {
      if (b.dataset.t === 'room') { close('product'); roomPick(p.id, size); $('#room').scrollIntoView({ behavior: reduced ? 'auto' : 'smooth' }); return; }
      pdState.tab = b.dataset.t; renderView();
    });
    $$('.variants button', el).forEach((b) => b.addEventListener('click', () => { pdState.pal = b.dataset.pal; renderProduct(); }));
    $$('.sizes button', el).forEach((b) => b.addEventListener('click', () => { pdState.size = +b.dataset.size; renderProduct(); }));
    $$('[data-q]', el).forEach((b) => b.addEventListener('click', () => { pdState.qty = Math.max(1, Math.min(9, pdState.qty + +b.dataset.q)); $('#pd-qty').textContent = fa(pdState.qty); }));
    $('[data-wish-btn]', el).addEventListener('click', () => toggleWish(p.id));
    $('#pd-cmp', el).addEventListener('click', () => toggleCompare(p.id));
    $('#pd-add', el).addEventListener('click', (e) => { addToCart(p.id, pdState.size, pdState.pal, pdState.qty, $('.pd__img', el) || e.currentTarget); });
    $('#pd-buy', el).addEventListener('click', () => { addToCart(p.id, pdState.size, pdState.pal, pdState.qty, null, true); close('product'); startCheckout(); });
  }
  function renderView() {
    const { p, size, pal, tab } = pdState;
    const v = $('#pd-view');
    if (tab === 'img') {
      v.innerHTML = `<img class="pd__img" alt="${p.title}"><div class="loupe" id="loupe"></div>`;
      const img = $('.pd__img', v);
      img.src = window.Loom.rugURL(rugOpts(p, 340, pal));
      const big = window.Loom.rugURL(rugOpts(p, 1000, pal));
      const lp = $('#loupe', v);
      const move = (e) => {
        const r = img.getBoundingClientRect(), vr = v.getBoundingClientRect();
        const x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
        if (x < 0 || y < 0 || x > 1 || y > 1) { lp.style.display = 'none'; return; }
        const z = 3.2;
        lp.style.display = 'block'; lp.style.left = (e.clientX - vr.left) + 'px'; lp.style.top = (e.clientY - vr.top) + 'px';
        lp.style.backgroundImage = `url(${big})`; lp.style.backgroundSize = `${r.width * z}px ${r.height * z}px`;
        lp.style.backgroundPosition = `${-(x * r.width * z - 90)}px ${-(y * r.height * z - 90)}px`;
      };
      img.addEventListener('pointermove', move); img.addEventListener('pointerleave', () => { lp.style.display = 'none'; });
    } else if (tab === '3d') {
      const s = p.sizes[size];
      v.innerHTML = `<div class="spinner"></div>`;
      const cv = window.Loom.weaveRug(Object.assign(rugOpts(p, 300, pal), { width: 512, height: Math.round(512 * s.l / s.w), fringe: false }));
      Promise.all([window.Loom.rugGLB(cv, s.w / 100, s.l / 100), loadModelViewer()]).then(([url]) => {
        if (pdState.tab !== '3d') return;
        v.innerHTML = `<model-viewer src="${url}" alt="مدل سه‌بعدی ${p.title} در ابعاد ${s.label}" ar ar-modes="webxr quick-look" ar-placement="floor" ar-scale="fixed" camera-controls touch-action="pan-y" shadow-intensity="1" shadow-softness="0.8" exposure="1.05" environment-image="neutral" camera-orbit="20deg 58deg auto" interaction-prompt="none">
          <button slot="ar-button" class="btn btn--navy ar-btn">${icon('cube')}دیدن در خانه با دوربین</button>
        </model-viewer>
        <p class="ar-note">با انگشت بچرخانید. روی گوشی، دکمه دوربین فرش را با ابعاد واقعی ${s.label} روی کف خانه می‌گذارد.</p>`;
      });
    }
  }

  // model-viewer is ~1 MB, so it loads the first time someone opens the 3D tab
  let mvPromise = null;
  function loadModelViewer() {
    if (!mvPromise) {
      mvPromise = new Promise((resolve) => {
        const sc = document.createElement('script'); sc.type = 'module';
        sc.src = 'https://cdnjs.cloudflare.com/ajax/libs/model-viewer/4.0.0/model-viewer.min.js';
        sc.onerror = () => { mvPromise = null; resolve(false); };
        document.head.appendChild(sc);
        customElements.whenDefined('model-viewer').then(() => resolve(true));
      });
    }
    return mvPromise;
  }

  /* ---------------- cart ---------------- */
  function addToCart(id, size, pal, qty, fromEl, silent) {
    const p = byId[id];
    const ex = state.cart.find((i) => i.id === id && i.size === size && i.pal === pal);
    if (ex) ex.qty = Math.min(9, ex.qty + qty); else state.cart.push({ id, size, pal, qty });
    save(); bump('cart');
    if (fromEl && !reduced) flyToCart(fromEl);
    if (!silent) toast(`${p.title} (${p.sizes[size].label}) به سبد اضافه شد`, 'bag');
  }
  function flyToCart(fromEl) {
    const target = $$('[data-open=cart]').find((b) => b.offsetParent !== null);
    if (!target) return;
    const a = fromEl.getBoundingClientRect(), b = target.getBoundingClientRect();
    const img = document.createElement('img'); img.className = 'fly';
    img.src = fromEl.src || ''; if (!img.src) return;
    img.style.left = (a.left + a.width / 2 - 30) + 'px'; img.style.top = (a.top + a.height / 2 - 45) + 'px';
    document.body.appendChild(img);
    requestAnimationFrame(() => { img.style.transform = `translate(${b.left + b.width / 2 - (a.left + a.width / 2)}px, ${b.top + b.height / 2 - (a.top + a.height / 2)}px) scale(.2)`; img.style.opacity = '.4'; });
    setTimeout(() => img.remove(), 850);
  }
  function lineTotal(i) { return byId[i.id].finalPrice(i.size) * i.qty; }
  function totals() {
    const listTotal = state.cart.reduce((a, i) => a + byId[i.id].price(i.size) * i.qty, 0);
    const sub = state.cart.reduce((a, i) => a + lineTotal(i), 0);
    const coupon = state.coupon ? Math.round(sub * 0.15 / 1000) * 1000 : 0;
    const after = sub - coupon;
    const ship = !state.cart.length ? 0 : (after >= 5e6 || !state.orders.length) ? 0 : 180000;
    return { listTotal, sub, coupon, ship, total: after + ship, save: listTotal - sub + coupon, stars: Math.floor((after) / 1e5) };
  }
  function renderCart() {
    const el = $('#cart');
    const t = totals();
    el.innerHTML = `
      <div class="drawer__head"><h2>سبد خرید</h2><button class="icon-btn" type="button" data-close aria-label="بستن">${icon('close')}</button></div>
      <div class="drawer__body">${state.cart.length ? state.cart.map((i, k) => {
        const p = byId[i.id];
        return `<div class="line-item"><img alt="" src="${window.Loom.rugURL(rugOpts(p, 64, i.pal))}">
          <div><b>${p.title}</b><small>${p.sizes[i.size].label}، ${PAL[i.pal].name}${p.shaneh ? `، ${fa(p.shaneh)} شانه` : ''}</small>
          <div class="stepper"><button type="button" data-ci="${k}" data-d="1" aria-label="یکی بیشتر">${icon('plus')}</button><span>${fa(i.qty)}</span><button type="button" data-ci="${k}" data-d="-1" aria-label="یکی کمتر">${icon('minus')}</button></div>
          <button type="button" class="remove" data-rm="${k}">حذف</button></div>
          <div class="price">${p.off ? `<s>${toman(p.price(i.size) * i.qty)}</s>` : ''}<b>${toman(lineTotal(i))}</b></div></div>`;
      }).join('') : `<div class="empty-state">${icon('bag')}<p>سبد خرید خالی است.</p><a class="btn btn--navy btn--small" href="#shop" data-close>رفتن به فروشگاه</a></div>`}</div>
      ${state.cart.length ? `<div class="drawer__foot">
        <form class="coupon" id="coupon-form"><input placeholder="کد تخفیف" aria-label="کد تخفیف" value="${state.coupon || ''}" class="ltr-input"><button class="btn btn--ghost btn--small" type="submit">${state.coupon ? 'حذف' : 'اعمال'}</button></form>
        <div class="sum">
          <div><span>جمع کالاها</span><span>${toman(t.listTotal)} تومان</span></div>
          ${t.save ? `<div class="save"><span>سود شما از این خرید</span><span>${toman(t.save)} تومان</span></div>` : ''}
          <div><span>هزینه ارسال</span><span>${t.ship ? toman(t.ship) + ' تومان' : 'رایگان'}</span></div>
          <div class="total"><span>مبلغ قابل پرداخت</span><span>${toman(t.total)} تومان</span></div>
        </div>
        <p class="points-note">${icon('star')}با این خرید ${fa(t.stars)} ستاره به باشگاه شما اضافه می‌شود</p>
        <button class="btn btn--gold btn--block" type="button" id="to-checkout">ادامه و پرداخت</button>
      </div>` : ''}`;
    $$('[data-ci]', el).forEach((b) => b.addEventListener('click', () => { const i = state.cart[+b.dataset.ci]; i.qty = Math.max(1, Math.min(9, i.qty + +b.dataset.d)); save(); renderCart(); }));
    $$('[data-rm]', el).forEach((b) => b.addEventListener('click', () => { state.cart.splice(+b.dataset.rm, 1); save(); renderCart(); }));
    const cf = $('#coupon-form', el);
    if (cf) cf.addEventListener('submit', (e) => {
      e.preventDefault();
      if (state.coupon) { state.coupon = null; save(); renderCart(); return; }
      const v = toEn($('input', cf).value.trim()).toUpperCase();
      if (v === 'STAR15') { state.coupon = 'STAR15'; save(); renderCart(); toast('کد تخفیف ۱۵٪ اعمال شد'); }
      else toast('این کد معتبر نیست. کد هدیه اولین خرید را از پنجره خوش‌آمد بگیرید.', 'close');
    });
    const tc = $('#to-checkout', el); if (tc) tc.addEventListener('click', () => { close('cart'); startCheckout(); });
  }
  function renderWish() {
    const el = $('#wish');
    el.innerHTML = `<div class="drawer__head"><h2>علاقه‌مندی‌ها</h2><button class="icon-btn" type="button" data-close aria-label="بستن">${icon('close')}</button></div>
      <div class="drawer__body">${state.wish.length ? state.wish.map((id) => { const p = byId[id]; return `<div class="line-item"><img alt="" src="${window.Loom.rugURL(rugOpts(p, 64))}"><div><b>${p.title}</b><small>${p.subtitle.join('، ')}</small><button type="button" class="remove" data-wrm="${id}">حذف</button></div><button class="btn btn--navy btn--small" type="button" data-wadd="${id}">افزودن به سبد</button></div>`; }).join('') : `<div class="empty-state">${icon('heart')}<p>هنوز فرشی را نشان نکرده‌اید. روی قلب هر محصول بزنید تا این‌جا بماند.</p></div>`}</div>`;
    $$('[data-wrm]', el).forEach((b) => b.addEventListener('click', () => toggleWish(b.dataset.wrm)));
    $$('[data-wadd]', el).forEach((b) => b.addEventListener('click', () => { const p = byId[b.dataset.wadd]; addToCart(p.id, p.defaultSize, p.palette, 1); }));
  }

  /* ---------------- compare ---------------- */
  function toggleCompare(id) {
    const i = state.compare.indexOf(id);
    if (i >= 0) state.compare.splice(i, 1);
    else { if (state.compare.length >= 3) { toast('حداکثر سه محصول را می‌شود هم‌زمان مقایسه کرد', 'compare'); return; } state.compare.push(id); }
    save(); bump('compare'); renderTray();
    const b = $('#pd-cmp'); if (b) { b.classList.toggle('is-on', i < 0); b.setAttribute('aria-pressed', i < 0); }
    toast(i < 0 ? 'به فهرست مقایسه اضافه شد' : 'از مقایسه حذف شد', 'compare');
  }
  function renderTray() {
    const tr = $('#compare-tray');
    if (!state.compare.length) { tr.hidden = true; return; }
    tr.hidden = false;
    tr.innerHTML = state.compare.map((id) => `<img alt="${byId[id].title}" src="${window.Loom.rugURL(rugOpts(byId[id], 34))}">`).join('') + Array(3 - state.compare.length).fill('<span class="ct-slot" aria-hidden="true"></span>').join('') +
      `<span>${fa(state.compare.length)} از ۳</span><button class="btn btn--gold btn--small" type="button" data-open="compare">مقایسه</button><button class="icon-btn icon-btn--small" type="button" id="cmp-clear" aria-label="پاک کردن مقایسه">${icon('close')}</button>`;
    $('#cmp-clear').addEventListener('click', () => { state.compare = []; save(); renderTray(); });
  }
  function renderCompare() {
    const ps = state.compare.map((id) => byId[id]);
    const bestPrice = Math.min.apply(null, ps.map((p) => minPrice(p)));
    const bestRate = Math.max.apply(null, ps.map((p) => p.rating));
    const row = (h, f) => `<tr><th>${h}</th>${ps.map((p) => `<td>${f(p)}</td>`).join('')}</tr>`;
    $('#compare').innerHTML = `<button class="icon-btn modal__x" type="button" data-close aria-label="بستن">${icon('close')}</button>
      <div class="cmp"><h2>مقایسه</h2><div style="overflow-x:auto"><table>
      ${row('', (p) => `<img alt="" src="${window.Loom.rugURL(rugOpts(p, 100))}">`)}
      ${row('نام', (p) => `<b>${p.title}</b>`)}
      ${row('شروع قیمت', (p) => `<span class="${minPrice(p) === bestPrice ? 'best-val' : ''}">${toman(minPrice(p))} تومان</span>`)}
      ${row('شانه', (p) => p.shaneh ? fa(p.shaneh) : '-')}
      ${row('تراکم', (p) => p.density ? fa(p.density) : '-')}
      ${row('طرح', (p) => DESIGNS[p.design])}
      ${row('رنگ', (p) => PAL[p.palette].name)}
      ${row('جنس', (p) => p.material)}
      ${row('امتیاز', (p) => `<span class="${p.rating === bestRate ? 'best-val' : ''}">${fa(p.rating)}</span>`)}
      ${row('ابعاد موجود', (p) => p.sizes.map((s) => s.label).join('، '))}
      ${row('', (p) => `<button class="btn btn--navy btn--small" type="button" data-cmp-open="${p.id}">مشاهده</button>`)}
      </table></div></div>`;
    $$('[data-cmp-open]').forEach((b) => b.addEventListener('click', () => { close('compare'); openProduct(b.dataset.cmpOpen); }));
  }
  renderTray();

  /* ---------------- auth: mobile + OTP ---------------- */
  let afterAuth = null;
  function requireUser(cb) { if (state.user) cb(); else { afterAuth = cb; renderAuth(1); open('auth'); } }
  function normMobile(v) { v = toEn(v).replace(/\D/g, ''); if (v.startsWith('98')) v = '0' + v.slice(2); if (v.length === 10 && v[0] === '9') v = '0' + v; return v; }
  function renderAuth(step, mobile) {
    const el = $('#auth');
    if (step === 1) {
      el.innerHTML = `<button class="icon-btn modal__x" type="button" data-close aria-label="بستن">${icon('close')}</button>
        <form class="auth" id="auth-1"><svg class="auth__logo"><use href="#i-logo"/></svg><h2>ورود یا ثبت‌نام</h2>
        <p>فقط شماره موبایل. رمز عبور لازم نیست.</p>
        <label class="field"><span class="sr">شماره موبایل</span><input id="auth-m" inputmode="numeric" autocomplete="tel" placeholder="۰۹۱۲ ۳۴۵ ۶۷۸۹" class="ltr-input" required autofocus><small id="auth-err"></small></label>
        <button class="btn btn--navy btn--block" type="submit">دریافت کد تأیید</button>
        <p class="timer-line">با ورود، <a class="link" href="#pay" data-close>شرایط استفاده</a> را می‌پذیرید.</p></form>`;
      $('#auth-1').addEventListener('submit', (e) => {
        e.preventDefault();
        const m = normMobile($('#auth-m').value);
        if (!/^09\d{9}$/.test(m)) { $('#auth-err').textContent = 'شماره باید ۱۱ رقم باشد و با ۰۹ شروع شود.'; return; }
        renderAuth(2, m);
      });
    } else {
      const code = String(10000 + Math.floor(Math.random() * 89999));
      el.innerHTML = `<button class="icon-btn modal__x" type="button" data-close aria-label="بستن">${icon('close')}</button>
        <form class="auth" id="auth-2"><svg class="auth__logo"><use href="#i-logo"/></svg><h2>کد تأیید</h2>
        <p>کد پنج‌رقمی به <span dir="ltr">${fa(mobile)}</span> پیامک شد. <button type="button" class="link" id="auth-back">ویرایش شماره</button></p>
        <div class="otp">${[0, 1, 2, 3, 4].map((i) => `<input inputmode="numeric" maxlength="1" aria-label="رقم ${fa(i + 1)}" autocomplete="${i ? 'off' : 'one-time-code'}">`).join('')}</div>
        <p class="demo-code">نسخه نمایشی: کد شما ${fa(code)} است</p>
        <small id="otp-err" style="color:var(--lacquer)"></small>
        <button class="btn btn--navy btn--block" type="submit">ورود</button>
        <p class="timer-line" id="otp-timer"></p></form>`;
      const ins = $$('.otp input', el);
      ins[0].focus();
      ins.forEach((inp, i) => {
        inp.addEventListener('input', () => {
          inp.value = toEn(inp.value).replace(/\D/g, '').slice(-1);
          if (inp.value && i < 4) ins[i + 1].focus();
          if (ins.every((x) => x.value)) $('#auth-2').requestSubmit();
        });
        inp.addEventListener('keydown', (e) => { if (e.key === 'Backspace' && !inp.value && i) ins[i - 1].focus(); });
        inp.addEventListener('paste', (e) => {
          const t = toEn((e.clipboardData || window.clipboardData).getData('text')).replace(/\D/g, '').slice(0, 5);
          if (t.length) { e.preventDefault(); t.split('').forEach((d, k) => { if (ins[k]) ins[k].value = d; }); if (t.length === 5) $('#auth-2').requestSubmit(); }
        });
      });
      let left = 45;
      const tl = $('#otp-timer');
      const iv = setInterval(() => {
        if (!document.body.contains(tl)) return clearInterval(iv);
        left--;
        if (left <= 0) { clearInterval(iv); tl.innerHTML = '<button type="button" class="link" id="otp-resend">ارسال دوباره کد</button>'; $('#otp-resend').addEventListener('click', () => renderAuth(2, mobile)); }
        else tl.textContent = `ارسال دوباره کد تا ${fa('0:' + pad(left))}`;
      }, 1000);
      tl.textContent = `ارسال دوباره کد تا ${fa('0:45')}`;
      $('#auth-back').addEventListener('click', () => renderAuth(1));
      $('#auth-2').addEventListener('submit', (e) => {
        e.preventDefault();
        const v = ins.map((x) => x.value).join('');
        if (v !== code) { $('#otp-err').textContent = 'کد درست نیست. دوباره امتحان کنید.'; ins.forEach((x) => { x.value = ''; }); ins[0].focus(); return; }
        clearInterval(iv);
        state.user = { mobile, name: '', address: null };
        if (!state.tx.length) { state.wallet += 250000; state.tx.unshift({ t: 'هدیه عضویت در باشگاه', a: 250000, d: Date.now() }); }
        save(); close('auth');
        toast('خوش آمدید! ۲۵۰ هزار تومان هدیه عضویت به کیف پول‌تان اضافه شد', 'gift');
        const cb = afterAuth; afterAuth = null; if (cb) setTimeout(cb, 380);
      });
    }
  }

  /* ---------------- checkout ---------------- */
  let co = null;
  function startCheckout() {
    if (!state.cart.length) { toast('سبد خرید خالی است', 'bag'); return; }
    requireUser(() => {
      co = { step: state.user.address ? 2 : 1, ship: 'post', pay: 'gateway', useWallet: false, addr: state.user.address || { name: state.user.name || '', prov: '', city: '', line: '', post: '' } };
      renderCheckout(); open('checkout');
    });
  }
  function shipCost(t) { return co.ship === 'courier' ? 250000 : co.ship === 'freight' ? 0 : t.ship; }
  function renderCheckout() {
    const el = $('#checkout');
    const t = totals();
    const ship = shipCost(t);
    const total = t.total - t.ship + ship;
    const side = `<aside class="co__side"><b>سفارش شما</b><div class="co__items">${state.cart.map((i) => { const p = byId[i.id]; return `<div><img alt="" src="${window.Loom.rugURL(rugOpts(p, 34, i.pal))}"><span>${p.title} ${p.sizes[i.size].label} × ${fa(i.qty)}</span></div>`; }).join('')}</div>
      <div class="sum"><div><span>کالاها</span><span>${toman(t.sub)}</span></div>${t.coupon ? `<div class="save"><span>کد تخفیف</span><span>${toman(t.coupon)}-</span></div>` : ''}<div><span>ارسال</span><span>${ship ? toman(ship) : 'رایگان'}</span></div><div class="total"><span>جمع</span><span>${toman(total)} تومان</span></div></div>
      <p class="points-note">${icon('star')}${fa(t.stars)} ستاره باشگاه</p></aside>`;
    const steps = `<ol class="steps"><li class="${co.step >= 1 ? 'is-on' : ''}">۱. نشانی</li><li class="${co.step >= 2 ? 'is-on' : ''}">۲. ارسال</li><li class="${co.step >= 3 ? 'is-on' : ''}">۳. پرداخت</li></ol>`;
    let body = '';
    if (co.step === 1) {
      const a = co.addr;
      body = `<p style="color:var(--ink-2);margin:-8px 0 16px;font-size:14px">اولین خرید است؛ نشانی را یک بار بنویسید، دفعه بعد آماده است.</p>
        <form class="form-grid" id="co-1" novalidate>
          <label class="field full">نام و نام خانوادگی<input name="name" required value="${a.name}" autocomplete="name"><small></small></label>
          <label class="field">استان<select name="prov" required><option value="">انتخاب کنید</option>${window.ST.PROVINCES.map((p) => `<option${a.prov === p ? ' selected' : ''}>${p}</option>`).join('')}</select><small></small></label>
          <label class="field">شهر<input name="city" required value="${a.city}"><small></small></label>
          <label class="field full">نشانی کامل<input name="line" required value="${a.line}" autocomplete="street-address"><small></small></label>
          <label class="field">کد پستی<input name="post" required inputmode="numeric" value="${a.post}" class="ltr-input" placeholder="۱۰ رقم بدون خط تیره"><small></small></label>
          <label class="field">موبایل<input value="${fa(state.user.mobile)}" disabled class="ltr-input"><small></small></label>
          <div class="full"><button class="btn btn--gold" type="submit">ادامه</button></div>
        </form>`;
    } else if (co.step === 2) {
      const a = co.addr;
      body = `<p style="font-size:14px;color:var(--ink-2);margin-bottom:16px">ارسال به: <b style="color:var(--ink)">${a.name}</b>، ${a.prov}، ${a.city}، ${a.line} <button type="button" class="link" id="co-edit">تغییر</button></p>
        <form id="co-2">
          <label class="pay-opt"><input type="radio" name="ship" value="post"${co.ship === 'post' ? ' checked' : ''}><b>پست پیشتاز</b><span class="pill">${t.ship ? toman(t.ship) : 'رایگان'}</span><small>۲ تا ۴ روز کاری، با کد رهگیری پیامکی</small></label>
          <label class="pay-opt"><input type="radio" name="ship" value="courier"${co.ship === 'courier' ? ' checked' : ''}><b>پیک ویژه</b><span class="pill">${toman(250000)}</span><small>فقط تهران و کرج؛ تحویل فردا در بازه دلخواه</small></label>
          <label class="pay-opt"><input type="radio" name="ship" value="freight"${co.ship === 'freight' ? ' checked' : ''}><b>باربری</b><span class="pill">پس‌کرایه</span><small>برای فرش‌های ۹ و ۱۲ متری و سفارش‌های چندتایی</small></label>
          <div style="margin-top:18px"><button class="btn btn--gold" type="submit">ادامه به پرداخت</button></div>
        </form>`;
    } else if (co.step === 3) {
      const canWallet = state.wallet >= total;
      body = `<form id="co-3">
          <label class="pay-opt"><input type="radio" name="pay" value="gateway"${co.pay === 'gateway' ? ' checked' : ''}><b>درگاه مستقیم بانکی</b><span class="pill">همه کارت‌ها</span><small>درگاه شاپرکی ستاره طلایی</small></label>
          <label class="pay-opt"><input type="radio" name="pay" value="wallet"${co.pay === 'wallet' ? ' checked' : ''}${canWallet ? '' : ' disabled'}><b>کیف پول</b><span class="pill">${toman(state.wallet)}</span><small>${canWallet ? 'پرداخت کامل از موجودی' : 'موجودی برای پرداخت کامل کافی نیست؛ پرداخت ترکیبی را انتخاب کنید'}</small></label>
          <label class="pay-opt"><input type="radio" name="pay" value="mix"${co.pay === 'mix' ? ' checked' : ''}${state.wallet > 0 ? '' : ' disabled'}><b>ترکیبی: کیف پول + درگاه</b><span class="pill">${state.wallet > 0 ? 'پیشنهادی' : 'موجودی صفر'}</span><small>${state.wallet > 0 ? `${toman(Math.min(state.wallet, total))} از کیف پول، ${toman(Math.max(0, total - state.wallet))} از درگاه` : 'ابتدا کیف پول را شارژ کنید'}</small></label>
          <label class="pay-opt"><input type="radio" name="pay" value="snapp"${co.pay === 'snapp' ? ' checked' : ''}><b>اسنپ‌پی</b><span class="pill">۴ قسط</span><small>قسط اول ${toman(Math.ceil(total / 4 / 1000) * 1000)} تومان امروز، بقیه ماهانه</small></label>
          <label class="pay-opt"><input type="radio" name="pay" value="digi"${co.pay === 'digi' ? ' checked' : ''}><b>دی‌جی‌پی</b><span class="pill">اقساطی</span><small>خرید اقساطی با اعتبار دی‌جی‌پی</small></label>
          <div style="margin-top:18px;display:flex;gap:8px;flex-wrap:wrap"><button class="btn btn--gold" type="submit">پرداخت ${toman(co.pay === 'snapp' ? Math.ceil(total / 4 / 1000) * 1000 : co.pay === 'mix' ? Math.max(0, total - state.wallet) : co.pay === 'wallet' ? 0 : total)} تومان</button><button class="btn btn--ghost" type="button" id="co-back">بازگشت</button></div>
        </form>`;
    }
    el.innerHTML = `<button class="icon-btn modal__x" type="button" data-close aria-label="بستن">${icon('close')}</button>
      <div class="modal__body"><h2 style="margin-bottom:12px">تکمیل خرید</h2>${steps}<div class="co"><div>${body}</div>${side}</div></div>`;
    if (co.step === 1) {
      $('#co-1').addEventListener('submit', (e) => {
        e.preventDefault();
        const f = e.target; let ok = true;
        $$('input[name], select[name]', f).forEach((inp) => {
          const v = inp.value.trim(); let msg = '';
          if (!v) msg = 'این قسمت را پر کنید.';
          else if (inp.name === 'post' && !/^\d{10}$/.test(toEn(v))) msg = 'کد پستی ۱۰ رقم است.';
          inp.parentElement.querySelector('small').textContent = msg; if (msg) ok = false;
        });
        if (!ok) return;
        co.addr = { name: f.name.value.trim(), prov: f.prov.value, city: f.city.value.trim(), line: f.line.value.trim(), post: toEn(f.post.value.trim()) };
        state.user.address = co.addr; state.user.name = co.addr.name; save();
        co.step = 2; renderCheckout();
      });
    } else if (co.step === 2) {
      $('#co-edit').addEventListener('click', () => { co.step = 1; renderCheckout(); });
      $$('[name=ship]').forEach((r) => r.addEventListener('change', () => { co.ship = r.value; renderCheckout(); }));
      $('#co-2').addEventListener('submit', (e) => { e.preventDefault(); co.step = 3; renderCheckout(); });
    } else if (co.step === 3) {
      $$('[name=pay]').forEach((r) => r.addEventListener('change', () => { co.pay = r.value; renderCheckout(); }));
      $('#co-back').addEventListener('click', () => { co.step = 2; renderCheckout(); });
      $('#co-3').addEventListener('submit', (e) => { e.preventDefault(); pay(total, t); });
    }
  }
  function pay(total, t) {
    const el = $('#checkout');
    const label = { gateway: 'درگاه بانکی', wallet: 'کیف پول', mix: 'درگاه بانکی', snapp: 'اسنپ‌پی', digi: 'دی‌جی‌پی' }[co.pay];
    el.innerHTML = `<div class="gateway"><div class="spinner"></div><b>در حال اتصال به ${label}…</b><p style="color:var(--ink-2);font-size:14px">نسخه نمایشی؛ پولی جابه‌جا نمی‌شود.</p></div>`;
    setTimeout(() => {
      const fromWallet = co.pay === 'wallet' ? total : co.pay === 'mix' ? Math.min(state.wallet, total) : 0;
      if (fromWallet) { state.wallet -= fromWallet; state.tx.unshift({ t: 'پرداخت سفارش', a: -fromWallet, d: Date.now() }); }
      const id = 'ST-' + fa(String(Date.now()).slice(-6));
      state.orders.unshift({ id, items: state.cart.slice(), total, d: Date.now(), status: 1, pay: label });
      state.stars += t.stars;
      state.cart = []; state.coupon = null; save();
      el.innerHTML = `<button class="icon-btn modal__x" type="button" data-close aria-label="بستن">${icon('close')}</button>
        <div class="success"><div class="success__mark">${icon('check')}</div><h2>سفارش ثبت شد</h2>
        <p style="color:var(--ink-2)">شماره سفارش <b style="color:var(--ink)">${id}</b>. هر مرحله را پیامک می‌کنیم.</p>
        <p class="points-note">${icon('star')}${fa(t.stars)} ستاره به باشگاه شما اضافه شد</p>
        <ol class="track"><li class="is-done">ثبت سفارش</li><li>آماده‌سازی</li><li>تحویل به پست</li><li>تحویل به شما</li></ol>
        <div style="display:flex;gap:8px;margin-top:16px"><button class="btn btn--navy" type="button" data-open="account" data-tab="orders">پیگیری سفارش</button><button class="btn btn--ghost" type="button" data-close>ادامه خرید</button></div></div>`;
      $('[data-open=account]', el).addEventListener('click', () => close('checkout'));
    }, 1700);
  }

  /* ---------------- account ---------------- */
  function tierOf(st) { return st >= 800 ? { n: 'ستاره طلایی', next: null, from: 800 } : st >= 200 ? { n: 'پروین', next: 800, nn: 'ستاره طلایی', from: 200 } : { n: 'سهیل', next: 200, nn: 'پروین', from: 0 }; }
  function orderStatus(o) { const mins = (Date.now() - o.d) / 60000; return Math.min(4, o.status + Math.floor(mins / 2)); }
  function trackHTML(o) { const s = orderStatus(o); return `<ol class="track">${['ثبت سفارش', 'آماده‌سازی', 'تحویل به پست', 'تحویل به شما'].map((l, i) => `<li class="${i < s ? 'is-done' : ''}">${l}</li>`).join('')}</ol>`; }
  function renderAccount(tab) {
    const el = $('#account');
    const tier = tierOf(state.stars);
    const tabs = [['home', 'پیشخوان', 'home'], ['orders', 'سفارش‌ها', 'truck'], ['wallet', 'کیف پول', 'wallet'], ['club', 'باشگاه', 'star'], ['gift', 'کارت هدیه', 'gift'], ['returns', 'مرجوعی', 'return']];
    const date = (d) => new Date(d).toLocaleDateString('fa-IR');
    let main = '';
    if (tab === 'home') {
      const inTransit = state.orders.filter((o) => orderStatus(o) < 4).length;
      main = `<h2>سلام${state.user.name ? '، ' + state.user.name.split(' ')[0] : ''}</h2>
        <div class="kpis"><div class="kpi"><small>سفارش در راه</small><b>${fa(inTransit)}</b></div><div class="kpi"><small>موجودی کیف پول</small><b>${toman(state.wallet)}</b></div><div class="kpi"><small>ستاره‌های باشگاه</small><b>${fa(state.stars)}</b></div></div>
        <div class="kpi"><small>سطح شما: <b style="font:inherit;color:var(--gold-ink)">${tier.n}</b></small>${tier.next ? `<div class="progress" style="margin:10px 0 6px"><i style="width:${Math.min(100, (state.stars - tier.from) / (tier.next - tier.from) * 100)}%"></i></div><small>${fa(tier.next - state.stars)} ستاره تا ${tier.nn}</small>` : '<small>بالاترین سطح باشگاه</small>'}</div>
        <div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn btn--ghost btn--small" type="button" data-t="wallet">افزایش موجودی</button><button class="btn btn--ghost btn--small" type="button" id="acc-wish">علاقه‌مندی‌ها (${fa(state.wish.length)})</button><button class="btn btn--ghost btn--small" type="button" id="acc-out">خروج از حساب</button></div>`;
    } else if (tab === 'orders') {
      main = `<h2>سفارش‌ها</h2>` + (state.orders.length ? state.orders.map((o) => `<div class="order"><div class="order__top"><b>${o.id}</b><span>${date(o.d)}</span><span>${toman(o.total)} تومان، ${o.pay}</span></div><small style="color:var(--ink-2)">${o.items.map((i) => byId[i.id].title + ' ' + byId[i.id].sizes[i.size].label).join('، ')}</small>${trackHTML(o)}</div>`).join('') : `<div class="empty-state">${icon('truck')}<p>هنوز سفارشی ثبت نکرده‌اید.</p></div>`);
    } else if (tab === 'wallet') {
      main = `<h2>کیف پول</h2><div class="wallet-card" style="color:var(--paper)"><div class="wallet-card__top"><svg class="wallet-card__logo"><use href="#i-logo"/></svg><span>کیف پول ستاره طلایی</span></div><p class="wallet-card__label">موجودی</p><p class="wallet-card__amount">${toman(state.wallet)} <small>تومان</small></p></div>
        <div><p class="pd__label">افزایش موجودی</p><div class="amounts">${[500000, 1000000, 2000000, 5000000].map((a) => `<button class="btn btn--ghost btn--small" type="button" data-topup="${a}">${toman(a)}</button>`).join('')}</div></div>
        <div><p class="pd__label">تراکنش‌ها</p>${state.tx.length ? state.tx.map((x) => `<div class="tx"><span>${x.t}<br><small style="color:var(--ink-3)">${date(x.d)}</small></span><span class="${x.a > 0 ? 'plus' : 'minus'}">${x.a > 0 ? '+' : '-'}${toman(Math.abs(x.a))}</span></div>`).join('') : '<p style="color:var(--ink-2)">تراکنشی نیست.</p>'}</div>`;
    } else if (tab === 'club') {
      main = `<h2>باشگاه ستاره طلایی</h2><div class="kpi"><small>سطح فعلی</small><b style="color:var(--gold-ink)">${tier.n}</b>${tier.next ? `<div class="progress" style="margin:10px 0 6px"><i style="width:${Math.min(100, (state.stars - tier.from) / (tier.next - tier.from) * 100)}%"></i></div><small>${fa(state.stars)} از ${fa(tier.next)} ستاره تا ${tier.nn}</small>` : ''}</div>
        <p style="color:var(--ink-2)">هر صد هزار تومان خرید یک ستاره است. ستاره‌ها منقضی نمی‌شوند و با هر سطح، مزایای تازه باز می‌شود.</p>
        <div class="kpi"><small>کد تخفیف تولد</small><b style="font-size:22px">تاریخ تولدتان را در پروفایل ثبت کنید تا هر سال یک کد اختصاصی بگیرید.</b></div>`;
    } else if (tab === 'gift') {
      main = `<h2>کارت هدیه</h2><p style="color:var(--ink-2)">مبلغ را انتخاب کنید و شماره گیرنده را بنویسید؛ کد کارت برایش پیامک می‌شود و می‌تواند به کیف پولش اضافه کند.</p>
        <form id="gift-form" style="display:grid;gap:12px;max-width:420px"><div class="amounts">${[500000, 1000000, 3000000, 5000000].map((a, i) => `<label class="btn btn--ghost btn--small"><input type="radio" name="ga" value="${a}"${i === 1 ? ' checked' : ''} style="accent-color:var(--navy)"> ${toman(a)}</label>`).join('')}</div>
        <input required inputmode="numeric" placeholder="موبایل گیرنده" class="ltr-input" aria-label="موبایل گیرنده"><button class="btn btn--navy" type="submit">پرداخت و ارسال کارت</button></form>
        <form id="redeem-form" style="display:flex;gap:8px;max-width:420px"><input placeholder="کد کارت هدیه، مثلاً GIFT-2025" class="ltr-input" aria-label="کد کارت هدیه"><button class="btn btn--ghost" type="submit">ثبت کد</button></form>`;
    } else if (tab === 'returns') {
      const done = state.orders.filter((o) => !o.returned);
      main = `<h2>مرجوعی</h2><p style="color:var(--ink-2)">تا هفت روز بعد از تحویل می‌توانید فرش را پس بفرستید. مبلغ همان لحظه به کیف پول برمی‌گردد.</p>` +
        (done.length ? done.map((o) => `<div class="order"><div class="order__top"><b>${o.id}</b><span>${toman(o.total)} تومان</span></div><button class="btn btn--ghost btn--small" type="button" data-ret="${o.id}" style="justify-self:start">درخواست بازگشت و استرداد به کیف پول</button></div>`).join('') : `<div class="empty-state">${icon('return')}<p>سفارشی برای بازگشت ندارید.</p></div>`);
    }
    el.innerHTML = `<button class="icon-btn modal__x" type="button" data-close aria-label="بستن">${icon('close')}</button>
      <div class="acc"><nav class="acc__nav"><div class="who"><b>${state.user.name || 'حساب من'}</b><small>${fa(state.user.mobile)}</small></div>${tabs.map((x) => `<button type="button" data-t="${x[0]}" class="${x[0] === tab ? 'is-on' : ''}">${icon(x[2])}${x[1]}</button>`).join('')}</nav><div class="acc__main">${main}</div></div>`;
    $$('[data-t]', el).forEach((b) => b.addEventListener('click', () => renderAccount(b.dataset.t)));
    $$('[data-topup]', el).forEach((b) => b.addEventListener('click', () => {
      const a = +b.dataset.topup; b.innerHTML = '<span class="spinner" style="width:18px;height:18px;border-width:2px"></span>';
      setTimeout(() => { state.wallet += a; state.tx.unshift({ t: 'افزایش موجودی از درگاه', a, d: Date.now() }); save(); renderAccount('wallet'); toast(`${toman(a)} تومان به کیف پول اضافه شد`, 'wallet'); }, 900);
    }));
    $$('[data-ret]', el).forEach((b) => b.addEventListener('click', () => {
      const o = state.orders.find((x) => x.id === b.dataset.ret); o.returned = true;
      state.wallet += o.total; state.tx.unshift({ t: `بازگشت وجه سفارش ${o.id}`, a: o.total, d: Date.now() }); save(); renderAccount('wallet'); toast('مبلغ سفارش به کیف پول برگشت', 'return');
    }));
    const gf = $('#gift-form', el);
    if (gf) gf.addEventListener('submit', (e) => {
      e.preventDefault(); const m = normMobile($('input[inputmode]', gf).value);
      if (!/^09\d{9}$/.test(m)) { toast('شماره گیرنده درست نیست', 'close'); return; }
      const a = +gf.ga.value; toast(`کارت هدیه ${toman(a)} تومانی برای ${fa(m)} ارسال شد (نمایشی)`, 'gift');
    });
    const rf = $('#redeem-form', el);
    if (rf) rf.addEventListener('submit', (e) => {
      e.preventDefault(); const v = toEn($('input', rf).value.trim()).toUpperCase();
      if (/^GIFT-\d{4}$/.test(v)) { state.wallet += 500000; state.tx.unshift({ t: `کارت هدیه ${v}`, a: 500000, d: Date.now() }); save(); renderAccount('wallet'); toast('۵۰۰ هزار تومان به کیف پول اضافه شد', 'gift'); }
      else toast('کد کارت هدیه پیدا نشد', 'close');
    });
    const out = $('#acc-out', el); if (out) out.addEventListener('click', () => { state.user = null; save(); close('account'); toast('از حساب خارج شدید', 'user'); });
    const aw = $('#acc-wish', el); if (aw) aw.addEventListener('click', () => { close('account'); renderWish(); open('wish'); });
  }

  /* ---------------- density lens ---------------- */
  (function density() {
    const cv = $('#den-canvas'), ctx = cv.getContext('2d');
    const S = 440 * DPR; cv.width = cv.height = S;
    const src = window.Loom.weaveRug({ design: 'toranj', palette: 'laki', seed: 11, width: 600, height: 900, texture: false, fringe: false });
    const levels = [700, 1000, 1200, 1500];
    const small = document.createElement('canvas'), sc = small.getContext('2d');
    function draw(idx) {
      const sh = levels[idx], n = Math.round(sh / 35);
      small.width = small.height = n;
      sc.imageSmoothingEnabled = true; sc.imageSmoothingQuality = 'high';
      // a 10×10 cm window onto the medallion's edge
      sc.drawImage(src, 215, 255, 170, 170, 0, 0, n, n);
      const d = sc.getImageData(0, 0, n, n).data;
      ctx.fillStyle = '#2a1c14'; ctx.fillRect(0, 0, S, S);
      const k = S / n, r = k * 0.28;
      for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
        const i = (y * n + x) * 4;
        const j = ((x * 7 + y * 13) % 9) - 4;
        ctx.fillStyle = `rgb(${d[i] + j},${d[i + 1] + j},${d[i + 2] + j})`;
        const px = x * k + k * 0.06, py = y * k + k * 0.06, w = k * 0.88;
        ctx.beginPath(); ctx.roundRect ? ctx.roundRect(px, py, w, w, r) : ctx.rect(px, py, w, w); ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,.10)'; ctx.fillRect(px + w * 0.2, py + w * 0.12, w * 0.6, w * 0.12);
        ctx.fillStyle = 'rgba(0,0,0,.14)'; ctx.fillRect(px + w * 0.1, py + w * 0.78, w * 0.8, w * 0.1);
      }
      const g = ctx.createRadialGradient(S / 2, S / 2, S * 0.3, S / 2, S / 2, S * 0.52);
      g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,.35)'); ctx.fillStyle = g; ctx.fillRect(0, 0, S, S);
      $('#den-shaneh').textContent = fa(sh); $('#den-tarakom').textContent = fa(SHANEH[sh]); $('#den-knots').textContent = fa(n);
      $('#den-shop').textContent = `فرش‌های ${fa(sh)} شانه`; $('#den-shop').dataset.sh = sh;
    }
    const range = $('#den-range');
    range.addEventListener('input', () => draw(+range.value));
    $('#den-shop').addEventListener('click', () => { filters.shaneh.clear(); filters.shaneh.add(+$('#den-shop').dataset.sh); filters.cat.clear(); renderShop(true); });
    draw(2);
  })();

  /* ---------------- room visualizer ---------------- */
  const room = { pid: 'st100', size: 2, mode: 'demo', ph: { x: 0, y: 0 } };
  const roomList = ['st100', 'st101', 'st102', 'st103', 'st104', 'st106', 'st107', 'st112', 'st114', 'st116'].map((id) => byId[id]);
  function roomPick(id, size) {
    const p = byId[id];
    if (!roomList.includes(p)) roomList.unshift(p);
    room.pid = id; room.size = size != null ? size : p.defaultSize;
    renderRoomPanel(); placeRug();
  }
  function renderRoomPanel() {
    const box = $('#room-rugs');
    box.innerHTML = roomList.slice(0, 10).map((p) => `<button type="button" data-rp="${p.id}" class="${p.id === room.pid ? 'is-on' : ''}" aria-label="${p.title}">${rugImgHTML(p, 40)}</button>`).join('');
    hydrate(box);
    $$('button', box).forEach((b) => b.addEventListener('click', () => roomPick(b.dataset.rp)));
    const p = byId[room.pid];
    const sz = $('#room-sizes');
    sz.innerHTML = p.sizes.map((s, i) => `<button type="button" data-rs="${i}" class="${i === room.size ? 'is-on' : ''}">${s.label}</button>`).join('');
    $$('button', sz).forEach((b) => b.addEventListener('click', () => { room.size = +b.dataset.rs; renderRoomPanel(); placeRug(); }));
  }
  function placeRug() {
    const p = byId[room.pid], s = p.sizes[room.size];
    const src = window.Loom.rugURL(rugOpts(p, 300));
    const stage = $('#room-stage');
    const img = $('#scene-rug');
    img.src = src;
    const Sw = stage.clientWidth;
    const m = Sw * 0.16; // pixels per metre at the back wall
    const ratio = p.cat === 'kenare' ? 3.4 : 1.5;
    // the floor plane shares the wall's scale at the skirting line, so metres map straight to pixels
    const bodyW = (s.w / 100) * m, imgH = bodyW * ratio;
    const depthM = 0.4 + s.w / 100 / 2; // laid lengthwise, tucked just under the sofa's front legs
    img.style.setProperty('--rug-w', bodyW + 'px');
    img.style.setProperty('--rug-rot', '90deg');
    img.style.top = (depthM * m - imgH / 2) + 'px';
    $('#photo-rug-img').src = src;
  }
  (function roomInit() {
    renderRoomPanel(); placeRug();
    addEventListener('resize', placeRug);
    $$('#sofa-colors button').forEach((b) => b.addEventListener('click', () => { $$('#sofa-colors button').forEach((x) => x.classList.toggle('is-active', x === b)); $('#scene').style.setProperty('--sofa', b.dataset.sofa); }));
    $$('#floor-types button').forEach((b) => b.addEventListener('click', () => { $$('#floor-types button').forEach((x) => x.classList.toggle('is-on', x === b)); $('#floor').dataset.floor = b.dataset.floor; }));
    seg($('#room-tabs'), (b) => setRoomMode(b.dataset.room));
    $('#room-buy').addEventListener('click', () => openProduct(room.pid, { size: room.size }));
    $('#room-ar').addEventListener('click', () => openProduct(room.pid, { size: room.size, tab: '3d' }));
    // window sky
    const ws = $('#window-sky'), wc = ws.getContext('2d');
    const g = wc.createLinearGradient(0, 0, 0, 150); g.addColorStop(0, '#060a22'); g.addColorStop(1, '#2a2b52'); wc.fillStyle = g; wc.fillRect(0, 0, 220, 150);
    for (let i = 0; i < 90; i++) { wc.fillStyle = `rgba(255,248,230,${Math.random() * 0.8 + 0.2})`; wc.fillRect(Math.random() * 220, Math.random() * 110, Math.random() < 0.1 ? 2 : 1, Math.random() < 0.1 ? 2 : 1); }
    wc.fillStyle = '#16121f'; wc.beginPath(); wc.moveTo(0, 150); wc.quadraticCurveTo(60, 105, 120, 128); wc.quadraticCurveTo(170, 140, 220, 112); wc.lineTo(220, 150); wc.fill();
    // photo mode
    const onFile = (f) => { if (!f) return; $('#photo-bg').src = URL.createObjectURL(f); $('#photo-empty').hidden = true; $('#photo-rug').hidden = false; applyPhoto(); };
    $('#photo-input').addEventListener('change', (e) => onFile(e.target.files[0]));
    $('#photo-input-2').addEventListener('change', (e) => { onFile(e.target.files[0]); });
    ['ph-scale', 'ph-tilt', 'ph-rot'].forEach((id) => $('#' + id).addEventListener('input', applyPhoto));
    const pr = $('#photo-rug');
    let drag = null;
    pr.addEventListener('pointerdown', (e) => { drag = { x: e.clientX - room.ph.x, y: e.clientY - room.ph.y }; pr.setPointerCapture(e.pointerId); });
    pr.addEventListener('pointermove', (e) => { if (!drag) return; room.ph.x = e.clientX - drag.x; room.ph.y = e.clientY - drag.y; applyPhoto(); });
    pr.addEventListener('pointerup', () => { drag = null; });
    // size finder
    ['room-l', 'room-w'].forEach((id) => $('#' + id).addEventListener('input', sizeFinder));
    $$('#room-type button').forEach((b) => b.addEventListener('click', () => { $$('#room-type button').forEach((x) => x.classList.toggle('is-on', x === b)); sizeFinder(); }));
  })();
  function applyPhoto() {
    const s = +$('#ph-scale').value / 100, tilt = +$('#ph-tilt').value, rot = +$('#ph-rot').value;
    $('#photo-rug').style.transform = `translate(-50%, -50%) translate(${room.ph.x}px, ${room.ph.y}px) perspective(900px) rotateX(${tilt}deg) rotateZ(${rot + 90}deg) scale(${s})`;
  }
  function setRoomMode(mode) {
    room.mode = mode;
    $('#scene').hidden = mode !== 'demo';
    $('#photo-stage').hidden = mode !== 'photo';
    $('#size-stage').hidden = mode !== 'size';
    $$('#room-panel [data-for]').forEach((g) => { g.hidden = !g.dataset.for.split(' ').includes(mode); });
    if (mode === 'size') sizeFinder();
    if (mode === 'photo') applyPhoto();
  }
  setRoomMode('demo');

  const STD = [[1, 1.5], [1.5, 2.25], [2, 3], [2.5, 3.5], [3, 4]];
  const STD_LABEL = ['۱×۱٫۵', '۱٫۵×۲٫۲۵', '۲×۳', '۲٫۵×۳٫۵', '۳×۴'];
  const STD_NICK = ['۱٫۵ متری', '۳ متری', '۶ متری', '۹ متری', '۱۲ متری'];
  function recommend(L, W, type) {
    if (L < W) { const t = L; L = W; W = t; }
    if (type === 'hall') { const len = L - 0.6 >= 4 ? 4 : L - 0.6 >= 3 ? 3 : 2; return { kind: 'kenare', l: len, w: 0.8, label: `۸۰×${fa(len * 100)}`, nick: `کناره ${fa(len)} متری`, idx: len === 4 ? 2 : len === 3 ? 1 : 0 }; }
    const margin = type === 'bed' ? [1.4, 1.0] : type === 'dining' ? [0.5, 0.5] : [0.8, 0.8];
    let best = 0;
    STD.forEach((s, i) => { if (s[1] <= L - margin[0] && s[0] <= W - margin[1]) best = i; });
    return { kind: 'farsh', l: STD[best][1], w: STD[best][0], label: STD_LABEL[best], nick: STD_NICK[best], idx: best };
  }
  function sizeFinder() {
    let L = parseFloat(toEn($('#room-l').value)) || 5, W = parseFloat(toEn($('#room-w').value)) || 4;
    L = Math.min(12, Math.max(2, L)); W = Math.min(10, Math.max(1.5, W));
    const type = ($('#room-type .is-on') || {}).dataset ? $('#room-type .is-on').dataset.type : 'living';
    const r = recommend(L, W, type);
    const RL = Math.max(L, W), RW = Math.min(L, W);
    const sc = Math.min(360 / RL, 260 / RW), ox = (420 - RL * sc) / 2, oy = (320 - RW * sc) / 2;
    const rx = ox + (RL - r.l) / 2 * sc, ry = oy + (RW - r.w) / 2 * sc + (type === 'living' ? 12 : 0);
    const p = byId[r.kind === 'kenare' ? 'st116' : 'st100'];
    const src = window.Loom.rugURL(Object.assign(rugOpts(p, 120), { fringe: false, width: 240, height: Math.round(240 * r.l / r.w) }));
    const cx = rx + r.l * sc / 2, cy = ry + r.w * sc / 2;
    let furn = '';
    if (type === 'living') furn = `<rect x="${ox + RL * sc / 2 - 1.1 * sc}" y="${oy + 6}" width="${2.2 * sc}" height="${0.85 * sc}" rx="8" fill="#8d9097"/><text x="${ox + RL * sc / 2}" y="${oy + 6 + 0.5 * sc}" fill="#fff" font-size="11" text-anchor="middle">مبل</text>`;
    if (type === 'bed') furn = `<rect x="${ox + 6}" y="${oy + RW * sc / 2 - 0.9 * sc}" width="${2 * sc}" height="${1.8 * sc}" rx="6" fill="#d8cbb3"/><text x="${ox + 6 + sc}" y="${oy + RW * sc / 2 + 4}" font-size="11" text-anchor="middle" fill="#171a33">تخت</text>`;
    if (type === 'dining') furn = `<rect x="${cx - 0.9 * sc}" y="${cy - 0.45 * sc}" width="${1.8 * sc}" height="${0.9 * sc}" rx="4" fill="#7b5236"/>`;
    $('#plan').innerHTML = `
      <rect x="${ox}" y="${oy}" width="${RL * sc}" height="${RW * sc}" fill="#efe7d8" stroke="#ecd093" stroke-width="3" rx="2"/>
      <g transform="translate(${cx} ${cy}) rotate(90) translate(${-r.w * sc / 2} ${-r.l * sc / 2})"><image href="${src}" width="${r.w * sc}" height="${r.l * sc}" preserveAspectRatio="none" opacity=".95"/></g>
      ${furn}
      <text x="${ox + RL * sc / 2}" y="${oy + RW * sc + 20}" fill="#ecd093" font-size="13" text-anchor="middle">${fa(RL)} متر</text>
      <text x="${ox - 10}" y="${oy + RW * sc / 2}" fill="#ecd093" font-size="13" text-anchor="middle" transform="rotate(-90 ${ox - 10} ${oy + RW * sc / 2})">${fa(RW)} متر</text>`;
    $('#size-result').innerHTML = `پیشنهاد ما<b>${r.nick} (${r.label})</b>${type === 'hall' ? 'دو طرف کناره حدود ۳۰ سانت جا می‌ماند.' : type === 'bed' ? 'دو سوم پایینی تخت روی فرش قرار می‌گیرد.' : type === 'dining' ? 'صندلی‌ها حتی وقتی عقب کشیده شوند، روی فرش می‌مانند.' : 'دور تا دور فرش حدود ۴۰ سانت تا دیوار فاصله می‌ماند.'}
      <button class="btn btn--gold btn--small btn--block" type="button" id="size-go">دیدن ${r.kind === 'kenare' ? 'کناره‌های' : 'فرش‌های'} ${r.label}</button>`;
    $('#size-go').addEventListener('click', () => {
      filters.cat.clear(); filters.cat.add(r.kind); filters.size.clear(); filters.size.add(r.kind === 'kenare' ? `۸۰×${fa(r.l * 100)}` : r.label);
      renderShop(true); $('#shop').scrollIntoView({ behavior: reduced ? 'auto' : 'smooth' });
    });
  }

  /* ---------------- AI advisor ---------------- */
  const SOFA = [
    [/طوسی|خاکستری|نقره/, ['sormei', 'kerem', 'laki'], 'طوسی'],
    [/کرم|بژ|شیری|سفید/, ['laki', 'sormei', 'gerdooi'], 'کرم'],
    [/قهوه|شکلات|گردو/, ['kerem', 'yashmi', 'sormei'], 'قهوه‌ای'],
    [/سرمه|آبی|سورمه/, ['kerem', 'laki', 'toosi'], 'سرمه‌ای'],
    [/سبز|یشم/, ['kerem', 'laki', 'gerdooi'], 'سبز'],
    [/مشکی|سیاه/, ['kerem', 'laki', 'fili'], 'مشکی'],
    [/قرمز|زرشکی|لاکی/, ['kerem', 'sormei', 'toosi'], 'قرمز'],
  ];
  const WANT = [[/سرمه/, 'sormei'], [/لاکی|قرمز|زرشکی/, 'laki'], [/کرم|روشن/, 'kerem'], [/فیلی|طوسی|خاکستری/, 'fili'], [/سبز|یشمی/, 'yashmi'], [/آبی|فیروزه/, 'abi'], [/قهوه|گردویی/, 'gerdooi']];
  function advise(raw) {
    const q = toEn(raw).replace(/ي/g, 'ی').replace(/ك/g, 'ک');
    const has = (re) => re.test(q);
    const out = { text: '', cards: [], chips: [] };
    if (has(/^(سلام|درود|hi|hello)/i) && q.length < 14) { out.text = 'سلام! بگویید فرش را برای کجا می‌خواهید؛ مثلاً «پذیرایی ۲۰ متری با مبل کرم». ابعاد و رنگ هماهنگ را پیشنهاد می‌دهم.'; out.chips = ['پذیرایی ۱۲ متری با مبل طوسی', 'کناره برای راهرو', 'خرید اقساطی چطوره؟']; return out; }
    if (has(/قسط|اقساط|اسنپ|دیجی|دی جی/)) { out.text = 'بله، با <strong>اسنپ‌پی</strong> و <strong>دی‌جی‌پی</strong> می‌توانید چهار قسطی بخرید: قسط اول هنگام خرید و سه قسط بعدی ماهانه، بدون ضامن. در صفحه پرداخت گزینه‌اش را می‌بینید.'; out.chips = ['هزینه ارسال چقدره؟', 'فرش ۶ متری سرمه‌ای']; return out; }
    if (has(/ارسال|پست|تحویل|کی میرسه|کی می‌رسه|پیک/)) { out.text = 'تهران و کرج با پیک ویژه فردا می‌رسد. شهرهای دیگر با پست پیشتاز ۲ تا ۴ روز کاری. ارسال اولین سفارش و همه خریدهای بالای ۵ میلیون تومان رایگان است و هر مرحله پیامک می‌شود.'; out.chips = ['شرایط مرجوعی', 'خرید اقساطی']; return out; }
    if (has(/مرجوع|بازگشت|پس بدم|پس بفرستم|عوض/)) { out.text = 'تا <strong>هفت روز</strong> بعد از تحویل اگر فرش به دل‌تان ننشست، از حساب کاربری درخواست بازگشت بدهید. مبلغ همان لحظه به کیف پول‌تان برمی‌گردد و می‌توانید فرش دیگری بردارید یا برداشت کنید.'; return out; }
    if (has(/شست|تمیز|لکه|نگهداری|جارو/)) { out.text = 'سه کار ساده: هفته‌ای یک بار جاروبرقی در جهت خواب پرز، لکه را فوری با دستمال سفید و آب ولرم «فشار دهید» (نمالید)، و سالی یک بار شست‌وشوی کارگاهی. روفرشی‌ها را هم می‌شود در ماشین لباسشویی با آب سرد شست.'; out.chips = ['روفرشی چیه؟', 'فرق شانه‌ها']; return out; }
    if (has(/روفرشی/)) { out.text = 'روفرشی یک رویه پارچه‌ای کش‌دار است که روی فرش قدیمی کشیده می‌شود و ظاهرش را نو می‌کند. قابل شست‌وشو با ماشین است و قیمتش کسری از فرش نو.'; out.cards = products.filter((p) => p.cat === 'rufarshi').slice(0, 3).map((p) => ({ p, size: 1 })); return out; }
    if (has(/شانه|تراکم/) && !has(/متر/)) { out.text = '<strong>شانه</strong> تعداد تارهای عرض فرش است و <strong>تراکم</strong> تعداد گره‌ها در طول. ۱۲۰۰ شانه (تراکم ۳۶۰۰) برای بیشتر خانه‌ها انتخاب متعادلی است؛ ۱۵۰۰ شانه (تراکم ۴۵۰۰) گره‌های ریزتر و نقش‌های دقیق‌تری دارد و کمی گران‌تر است. در بخش «شانه را با چشم خودتان ببینید» فرقش را می‌بینید.'; out.chips = ['فرش ۱۵۰۰ شانه پیشنهاد بده', 'فرش ۱۲۰۰ شانه زیر ۲۵ میلیون']; return out; }
    if (has(/کیف پول|اعتبار/)) { out.text = 'کیف پول ستاره طلایی را از حساب کاربری شارژ می‌کنید. هنگام خرید می‌شود کل مبلغ یا بخشی از آن را از کیف پول داد و بقیه را از درگاه. مرجوعی‌ها هم فوری به همین کیف پول برمی‌گردد.'; return out; }

    // ----- recommendation -----
    let area = null, dims = null;
    const dm = q.match(/(\d+(?:[.\/٫]\d+)?)\s*(?:در|×|x|\*)\s*(\d+(?:[.\/٫]\d+)?)/);
    if (dm) dims = [parseFloat(dm[1].replace(/[\/٫]/, '.')), parseFloat(dm[2].replace(/[\/٫]/, '.'))];
    const am = q.match(/(\d+(?:\.\d+)?)\s*(?:متر|متری)/);
    if (am) area = parseFloat(am[1]);
    let type = 'living';
    if (has(/راهرو|کریدور|هال باریک/)) type = 'hall';
    else if (has(/خواب/)) type = 'bed';
    else if (has(/ناهار/)) type = 'dining';
    else if (has(/آشپزخانه/)) type = 'kitchen';
    else if (has(/ورودی|جلوی در|دم در|پادری/)) type = 'door';
    const sofa = SOFA.find((s) => s[0].test(q) && has(/مبل|کاناپه|دیوار|پرده/));
    let pals = sofa ? sofa[1] : null;
    const want = WANT.filter((w) => w[0].test(q) && !(sofa && sofa[0].test(q))).map((w) => w[1]);
    if (want.length) pals = want;
    const modern = has(/مدرن|ساده|مینیمال|امروزی/), classic = has(/سنتی|کلاسیک|اصیل/), vintage = has(/وینتیج|کهنه|قدیمی/);
    const bm = q.match(/(\d+(?:\.\d+)?)\s*میلیون/);
    const budget = bm ? parseFloat(bm[1]) * 1e6 : null;
    const shM = q.match(/(700|1000|1200|1500)\s*شانه/);
    const sh = shM ? +shM[1] : null;

    let cat = 'farsh', sizeIdx = 2, sizeTxt = '';
    if (type === 'hall') {
      cat = 'kenare';
      const len = dims ? Math.max(dims[0], dims[1]) : area && area < 10 ? area : 3;
      sizeIdx = len - 0.6 >= 4 ? 2 : len - 0.6 >= 3 ? 1 : 0;
      sizeTxt = `برای راهرو، <strong>کناره ${['۸۰×۲۰۰', '۸۰×۳۰۰', '۸۰×۴۰۰'][sizeIdx]}</strong> مناسب است؛ دو سرش حدود ۳۰ سانت جا می‌ماند.`;
    } else if (type === 'door') {
      cat = 'padari'; sizeIdx = 0; sizeTxt = 'برای ورودی، <strong>پادری ۶۰×۹۰</strong> با پشت ضدلغزش کافی است.';
    } else if (type === 'kitchen') {
      cat = 'kenare'; sizeIdx = 0; sizeTxt = 'برای آشپزخانه، یک <strong>کناره ۸۰×۲۰۰</strong> جلوی کابینت‌ها راحت‌تر تمیز می‌شود.';
    } else {
      let idx;
      if (dims) idx = recommend(dims[0], dims[1], type).idx;
      else if (area) { const target = area * (type === 'bed' ? 0.42 : 0.5); idx = 0; STD.forEach((s, i) => { if (s[0] * s[1] <= target + 0.6) idx = i; }); }
      else idx = 2;
      sizeIdx = idx;
      const where = type === 'bed' ? 'اتاق خواب' : type === 'dining' ? 'ناهارخوری' : 'پذیرایی';
      sizeTxt = `${area ? `برای ${where} ${fa(area)} متری` : dims ? `برای ${where} ${fa(dims[0])} در ${fa(dims[1])}` : `برای ${where}`}، <strong>فرش ${STD_NICK[idx]} (${STD_LABEL[idx]})</strong> مناسب است${type === 'living' ? '؛ دور تا دورش حدود ۴۰ سانت تا دیوار فاصله می‌ماند' : ''}.`;
    }
    let pool = products.filter((p) => p.cat === cat && p.sizes[sizeIdx]);
    if (sh) pool = pool.filter((p) => p.shaneh === sh);
    if (budget) pool = pool.filter((p) => p.finalPrice(sizeIdx) <= budget);
    let scored = pool.map((p) => {
      let s = p.sold / 1000 + p.rating;
      if (pals && pals.includes(p.palette)) s += 6 - pals.indexOf(p.palette);
      if (modern && ['khesti', 'moharramat'].includes(p.design)) s += 3;
      if (modern && p.vintage) s += 2;
      if (classic && ['toranj', 'afshan', 'mahi'].includes(p.design)) s += 3;
      if (vintage && p.vintage) s += 5;
      return { p, s };
    }).sort((a, b) => b.s - a.s).slice(0, 3);
    let colorTxt = '';
    if (sofa) colorTxt = ` با مبل ${sofa[2]}، زمینه ${sofa[1].slice(0, 2).map((k) => PAL[k].name).join(' یا ')} خوب می‌نشیند.`;
    else if (want.length) colorTxt = ` از بین طرح‌های ${want.map((k) => PAL[k].name).join(' و ')} انتخاب کردم.`;
    if (!scored.length) {
      out.text = `${sizeTxt} ولی با${budget ? ` بودجه ${fa(budget / 1e6)} میلیون` : ''}${sh ? ` ${fa(sh)} شانه` : ''} در این اندازه چیزی موجود نداریم. بودجه را کمی بیشتر کنید یا شانه پایین‌تری را امتحان کنید.`;
      out.chips = ['فرش ۷۰۰ شانه', 'همه فرش‌های ۶ متری'];
      return out;
    }
    if (!area && !dims && type === 'living' && !pals && !modern && !classic && !budget && !sh && !has(/فرش|کناره|پادری|گلیم/)) {
      out.text = 'متوجه شدم! برای پیشنهاد دقیق‌تر بگویید فرش را برای کجا می‌خواهید، متراژ اتاق چقدر است و رنگ مبل یا پرده چیست. مثلاً: «اتاق خواب ۱۲ متری، دیوار کرم، سبک مدرن».';
      out.chips = ['پذیرایی ۲۰ متری با مبل کرم', 'اتاق خواب ۱۲ متری مدرن', 'زیر ۱۵ میلیون'];
      return out;
    }
    out.text = sizeTxt + colorTxt + ` ${scored.length === 1 ? 'این طرح' : `این ${fa(scored.length)} طرح`} را پیشنهاد می‌کنم:`;
    out.cards = scored.map((x) => ({ p: x.p, size: sizeIdx }));
    out.chips = ['ارزان‌تر هم داری؟', 'فرق شانه‌ها', 'خرید اقساطی'];
    return out;
  }

  const chats = [];
  function mountChat(root, withHead) {
    root.innerHTML = (withHead ? `<div class="chat__head">${icon('spark')}<div><b>دستیار هوشمند ستاره طلایی</b><small>آنلاین</small></div></div>` : '') +
      `<div class="chat__log" role="log"></div><div class="chat__quick"></div><form class="chat__form"><input placeholder="سؤال خود را بپرسید…" aria-label="پیام به مشاور"><button type="submit" aria-label="ارسال">${icon('send')}</button></form>`;
    const c = { root, log: $('.chat__log', root), quick: $('.chat__quick', root), input: $('input', root), last: null };
    $('form', root).addEventListener('submit', (e) => { e.preventDefault(); const v = c.input.value.trim(); if (v) { ask(c, v); c.input.value = ''; } });
    bot(c, { text: 'سلام! من مشاور ستاره طلایی هستم. متراژ اتاق، رنگ مبل و سلیقه‌تان را بگویید تا فرش مناسب را پیدا کنیم.', chips: ['پذیرایی ۱۲ متری با مبل طوسی', 'کناره برای راهروی ۳ متری', 'فرش مدرن زیر ۲۰ میلیون'] }, true);
    chats.push(c);
    return c;
  }
  function addMsg(c, html, who) { const m = document.createElement('div'); m.className = `msg msg--${who}`; m.innerHTML = html; c.log.appendChild(m); c.log.scrollTop = c.log.scrollHeight; }
  function bot(c, r, instant) {
    const show = () => {
      addMsg(c, r.text, 'bot');
      if (r.cards && r.cards.length) {
        const g = document.createElement('div'); g.className = 'msg-cards';
        g.innerHTML = r.cards.map((x) => `<div class="mcard">${rugImgHTML(x.p, 70)}<b>${x.p.title}</b><span>${toman(x.p.finalPrice(x.size))} ت</span><button type="button" class="link" data-room-try="${x.p.id}" data-s="${x.size}">دیدن در فضا</button><button type="button" class="link" data-open-p="${x.p.id}" data-s="${x.size}">مشاهده</button></div>`).join('');
        c.log.appendChild(g); hydrate(g);
        $$('[data-room-try]', g).forEach((b) => b.addEventListener('click', () => { if (!$('#chat').hidden) close('chat'); roomPick(b.dataset.roomTry, +b.dataset.s); setRoomMode('demo'); $('#room').scrollIntoView({ behavior: reduced ? 'auto' : 'smooth' }); }));
        $$('[data-open-p]', g).forEach((b) => b.addEventListener('click', () => openProduct(b.dataset.openP, { size: +b.dataset.s })));
      }
      c.quick.innerHTML = (r.chips || []).map((t) => `<button type="button">${t}</button>`).join('');
      $$('button', c.quick).forEach((b) => b.addEventListener('click', () => ask(c, b.textContent)));
      c.log.scrollTop = c.log.scrollHeight;
    };
    if (instant) return show();
    const t = document.createElement('div'); t.className = 'typing'; t.innerHTML = '<i></i><i></i><i></i>'; c.log.appendChild(t); c.log.scrollTop = c.log.scrollHeight;
    setTimeout(() => { t.remove(); show(); }, 650 + Math.random() * 500);
  }
  function ask(c, text) {
    addMsg(c, text.replace(/</g, '&lt;'), 'me');
    c.quick.innerHTML = '';
    let r;
    if (/ارزان/.test(text) && c.last) { r = Object.assign({}, c.last); r = advise(c.lastQ + ' زیر ' + Math.max(3, Math.round(Math.min.apply(null, c.last.cards.map((x) => x.p.finalPrice(x.size))) / 1e6) - 1) + ' میلیون'); }
    else r = advise(text);
    if (r.cards && r.cards.length) { c.last = r; c.lastQ = text; }
    bot(c, r);
  }
  const inlineChat = mountChat($('#chat-inline'), true);
  let panelChat = null;
  function openChat() { if (!panelChat) panelChat = mountChat($('#chat-panel-body'), false); open('chat'); setTimeout(() => panelChat.input.focus(), 100); }
  $$('[data-ask]').forEach((b) => b.addEventListener('click', () => { ask(inlineChat, b.dataset.ask); $('#chat-inline').scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'center' }); }));

  /* ---------------- popups ---------------- */
  function canPopup() { return !stack.length && $('#popup-welcome').hidden && $('#popup-exit').hidden; }
  function scheduleWelcome() {
    if (ss('st-welcome')) return;
    let fired = false;
    const fire = () => {
      if (fired) return;
      if (!canPopup()) { setTimeout(fire, 4000); return; }
      fired = true; ss('st-welcome', '1'); open('popup-welcome');
    };
    setTimeout(fire, 16000);
    const onS = () => { if (scrollY > document.body.scrollHeight * 0.32) { removeEventListener('scroll', onS); fire(); } };
    addEventListener('scroll', onS, { passive: true });
  }
  $('#popup-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const m = normMobile($('input', e.target).value);
    if (!/^09\d{9}$/.test(m)) { toast('شماره موبایل را درست وارد کنید', 'close'); return; }
    e.target.outerHTML = `<div class="code-box">STAR15</div><p>کد برای ${fa(m)} پیامک شد. در سبد خرید واردش کنید؛ تا پایان هفته اعتبار دارد.</p><button class="btn btn--navy" type="button" data-close>شروع خرید</button>`;
  });
  document.addEventListener('mouseout', (e) => {
    if (e.relatedTarget || e.clientY > 0 || !entered || innerWidth < 820 || ss('st-exit') || !canPopup()) return;
    ss('st-exit', '1');
    if (state.cart.length) { $('#pe-h').textContent = 'سبد خریدتان را نگه داشتیم'; $('#pe-text').textContent = 'هر وقت برگشتید، فرش‌هایی که انتخاب کرده‌اید سر جایشان است. ارسال اولین سفارش هم رایگان است.'; $('#pe-cta').textContent = 'تکمیل خرید'; $('#pe-cta').onclick = () => setTimeout(startCheckout, 300); }
    open('popup-exit');
  });

  /* ---------------- club sky ---------------- */
  (function clubSky() {
    const cv = $('#club-sky'), ctx = cv.getContext('2d');
    function draw() {
      const w = cv.clientWidth, h = cv.clientHeight; cv.width = w * DPR; cv.height = h * DPR; ctx.scale(DPR, DPR);
      let s = 7; const r = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
      for (let i = 0; i < w * h / 2600; i++) { ctx.fillStyle = `rgba(255,246,225,${0.15 + r() * 0.6})`; const z = r() < 0.08 ? 1.6 : 0.9; ctx.beginPath(); ctx.arc(r() * w, r() * h, z, 0, Math.PI * 2); ctx.fill(); }
      // three little constellations, one per tier
      ctx.strokeStyle = 'rgba(236,208,147,.35)'; ctx.lineWidth = 1;
      [[0.82, 0.18, 3], [0.5, 0.12, 5], [0.16, 0.2, 8]].forEach((c) => {
        const cx = c[0] * w, cy = c[1] * h, n = c[2], R = 26 + n * 2; ctx.beginPath();
        for (let i = 0; i <= n; i++) { const a = i / n * Math.PI * 2 - Math.PI / 2; const x = cx + Math.cos(a) * R, y = cy + Math.sin(a) * R * 0.7; i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }
        ctx.stroke();
        for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2 - Math.PI / 2; ctx.fillStyle = 'rgba(255,240,205,.9)'; ctx.beginPath(); ctx.arc(cx + Math.cos(a) * R, cy + Math.sin(a) * R * 0.7, 1.8, 0, Math.PI * 2); ctx.fill(); }
      });
    }
    draw(); addEventListener('resize', () => { ctx.setTransform(1, 0, 0, 1, 0, 0); draw(); });
  })();

  /* ---------------- small forms ---------------- */
  $('#trade-form').addEventListener('submit', (e) => { e.preventDefault(); e.target.reset(); toast('درخواست ثبت شد؛ همکاران فروش عمده تا یک روز کاری تماس می‌گیرند'); });
  $('#news-form').addEventListener('submit', (e) => { e.preventDefault(); e.target.reset(); toast('عضو شدید؛ خبر حراج‌ها را پیامک می‌کنیم'); });
  $$('.post').forEach((p) => p.addEventListener('click', () => { const q = p.querySelector('h3').textContent.includes('اندازه') ? 'size' : null; if (q) { $('#room').scrollIntoView({ behavior: 'smooth' }); $('#room-tabs [data-room=size]').click(); } else if (p.querySelector('h3').textContent.includes('شانه')) $('#density').scrollIntoView({ behavior: 'smooth' }); else { openChat(); setTimeout(() => ask(panelChat, 'فرش ماشینی رو چطور بشورم؟'), 300); } }));

  syncBadges();
})();
