/* VS School — варіант «Стандарт»: заставка, паралакс, лічильники, бігучий рядок, слайдер новин, плаваючі кнопки.
   Підключається після content.js і перед app.js. */
(function () {
  var S = window.SITE || { news: [], circles: [] };
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var body = document.body;

  /* ---------- Заставка: раз за візит, ~1.5 с ---------- */
  var intro = document.getElementById('intro');
  var seen = false;
  try { seen = sessionStorage.getItem('vs-intro') === '1'; } catch (e) {}
  if (!intro || seen || reduce) {
    window.VS_INTRO_MS = 0;
    if (intro) intro.classList.add('gone');
    body.classList.remove('is-loading');
  } else {
    window.VS_INTRO_MS = 1500;
    try { sessionStorage.setItem('vs-intro', '1'); } catch (e) {}
    setTimeout(function () {
      intro.classList.add('out');
      body.classList.remove('is-loading');
      setTimeout(function () { intro.classList.add('gone'); }, 950);
    }, 1400);
  }

  /* ---------- Слайдер новин (усі новини з content.js) ---------- */
  var slides = document.getElementById('news-slides');
  if (slides) {
    S.news.forEach(function (n) {
      var s = document.createElement('div'); s.className = 'swiper-slide';
      var a = document.createElement('a'); a.className = 'slide';
      a.href = n.link || '../news.html';
      if (n.link) { a.target = '_blank'; a.rel = 'noopener'; }
      var ph = document.createElement('div'); ph.className = 'ph';
      if (n.img) { var i = document.createElement('img'); i.src = n.img; i.alt = n.title; i.loading = 'lazy'; i.onerror = function () { this.remove(); }; ph.appendChild(i); }
      var t = document.createElement('div'); t.className = 't';
      var b = document.createElement('b'); b.textContent = n.title;
      var tm = document.createElement('time'); tm.textContent = n.date;
      t.appendChild(b); t.appendChild(tm); a.appendChild(ph); a.appendChild(t); s.appendChild(a); slides.appendChild(s);
    });
    if (window.Swiper) {
      new Swiper('.news-swiper', {
        slidesPerView: 1.15, spaceBetween: 14, speed: 600, grabCursor: true,
        navigation: { prevEl: '.snav.prev', nextEl: '.snav.next' },
        pagination: { el: '.slider-nav .swiper-pagination', clickable: true },
        breakpoints: { 640: { slidesPerView: 2.1, spaceBetween: 18 }, 1000: { slidesPerView: 3, spaceBetween: 22 } }
      });
    } else {
      document.querySelector('.slider-nav').hidden = true;
      slides.style.display = 'grid';
      slides.style.gridTemplateColumns = 'repeat(auto-fill,minmax(260px,1fr))';
      slides.style.gap = '18px';
    }
  }

  /* ---------- Бігучий рядок гуртків ---------- */
  var mq = document.getElementById('marquee');
  if (mq) {
    var names = S.circles.map(function (c) { return c.name; });
    [0, 1].forEach(function () {
      names.forEach(function (n) { var sp = document.createElement('span'); sp.textContent = n; mq.appendChild(sp); });
    });
  }

  /* ---------- Лічильники ---------- */
  var nums = document.querySelectorAll('[data-count]');
  function run(el) {
    var to = +el.dataset.count;
    if (reduce) { el.textContent = to; return; }
    var t0 = null, dur = 1400;
    (function step(t) {
      if (!t0) t0 = t;
      var k = Math.min(1, (t - t0) / dur);
      el.textContent = Math.round(to * (1 - Math.pow(1 - k, 3)));
      if (k < 1) requestAnimationFrame(step);
    })(performance.now());
  }
  if ('IntersectionObserver' in window && !reduce) {
    nums.forEach(function (n) { if (n.getBoundingClientRect().top > window.innerHeight) n.textContent = '0'; });
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { run(e.target); io.unobserve(e.target); } });
    }, { threshold: .6 });
    nums.forEach(function (n) { io.observe(n); });
  } else nums.forEach(function (n) { n.textContent = n.dataset.count; });

  /* ---------- Паралакс, прогрес, плаваючі кнопки ---------- */
  var heroImg = document.querySelector('.hero > img');
  var heroLogo = document.querySelector('.hero-logo');
  var bar = document.getElementById('progress');
  var top = document.getElementById('toTop');
  var mcta = document.getElementById('mcta');
  var ticking = false;
  function frame() {
    var y = window.scrollY, h = window.innerHeight;
    var max = document.documentElement.scrollHeight - h;
    if (bar) bar.style.transform = 'scaleX(' + (max > 0 ? y / max : 0) + ')';
    if (!reduce && y < h * 1.2) {
      if (heroImg) heroImg.style.translate = '0 ' + (y * 0.25).toFixed(1) + 'px';
      if (heroLogo) heroLogo.style.translate = '0 ' + (y * -0.12).toFixed(1) + 'px';
    }
    var past = y > h * 0.8;
    if (top) top.classList.toggle('show', past);
    if (mcta) mcta.classList.toggle('show', past);
    ticking = false;
  }
  window.addEventListener('scroll', function () { if (!ticking) { ticking = true; requestAnimationFrame(frame); } }, { passive: true });
  frame();
})();
