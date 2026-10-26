/* VS School — варіант «Преміум». Підключається після premium.js і перед app.js. */
(function () {
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var fine = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  var lenis = null;

  /* ---------- Плавна прокрутка ---------- */
  if (window.Lenis && !reduce) {
    lenis = new Lenis({ lerp: 0.1, smoothWheel: true });
    (function raf(t) { lenis.raf(t); requestAnimationFrame(raf); })(performance.now());
    if (document.body.classList.contains('is-loading')) {
      lenis.stop();
      setTimeout(function () { lenis.start(); }, (window.VS_INTRO_MS || 0) + 50);
    }
    document.addEventListener('click', function (e) {
      var a = e.target.closest && e.target.closest('a[href^="#"]');
      if (!a) return;
      var id = a.getAttribute('href');
      var el = id === '#top' ? 0 : document.querySelector(id);
      if (el === null) return;
      e.preventDefault();
      lenis.scrollTo(el, { offset: id === '#top' ? 0 : -76, duration: 1.4 });
    });
  }
  window.VS_LENIS = lenis;

  /* ---------- Заголовки розкриваються по словах ---------- */
  window.VS_SPLIT = !reduce;
  if (window.VS_SPLIT) {
    var heads = document.querySelectorAll('main h2');
    heads.forEach(function (h) {
      (function walk(node) {
        Array.prototype.slice.call(node.childNodes).forEach(function (n) {
          if (n.nodeType === 3) {
            var frag = document.createDocumentFragment();
            n.textContent.split(/(\s+)/).forEach(function (part) {
              if (!part) return;
              if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(' ')); return; }
              var w = document.createElement('span'); w.className = 'sw';
              var i = document.createElement('i'); i.textContent = part; w.appendChild(i);
              frag.appendChild(w);
            });
            node.replaceChild(frag, n);
          } else if (n.nodeType === 1 && n.tagName !== 'BR') walk(n);
        });
      })(h);
      h.querySelectorAll('.sw > i').forEach(function (i, k) { i.style.transitionDelay = (k * 60) + 'ms'; });
    });
    if ('IntersectionObserver' in window) {
      var hio = new IntersectionObserver(function (es) {
        es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('split-in'); hio.unobserve(e.target); } });
      }, { threshold: 0.3, rootMargin: '0px 0px -8% 0px' });
      heads.forEach(function (h) { hio.observe(h); });
    } else heads.forEach(function (h) { h.classList.add('split-in'); });
  }

  /* ---------- Рівні навчання: горизонтальна прокрутка ---------- */
  var hs = document.querySelector('.hscroll');
  var track = hs && hs.querySelector('.hs-track');
  var vp = hs && hs.querySelector('.hs-viewport');
  var dist = 0;
  window.VS_PIN = false;
  function setupPin() {
    if (!hs) return;
    var on = window.innerWidth >= 1000 && !reduce;
    hs.classList.toggle('pinned', on);
    window.VS_PIN = on;
    if (!on) { hs.style.height = ''; track.style.transform = ''; return; }
    var cs = getComputedStyle(vp);
    var pad = parseFloat(cs.paddingLeft) + parseFloat(cs.paddingRight);
    dist = Math.max(0, track.scrollWidth + pad - vp.clientWidth);
    hs.style.height = (window.innerHeight + dist) + 'px';
    movePin();
  }
  function movePin() {
    if (!window.VS_PIN) return;
    var top = hs.getBoundingClientRect().top;
    var p = Math.min(1, Math.max(0, -top / (hs.offsetHeight - window.innerHeight || 1)));
    track.style.transform = 'translate3d(' + (-p * dist).toFixed(1) + 'px,0,0)';
  }
  setupPin();
  window.addEventListener('resize', setupPin);
  window.addEventListener('scroll', movePin, { passive: true });
  window.addEventListener('load', setupPin);

  /* ---------- Кроки вступу: номери для стопки ---------- */
  document.querySelectorAll('.step').forEach(function (s, i) { s.style.setProperty('--i', i); });

  /* ---------- Фотогалерея з переглядом ---------- */
  var items = Array.prototype.slice.call(document.querySelectorAll('.m-item'));
  var lb = document.getElementById('lightbox');
  var lbImg = lb && lb.querySelector('img');
  var cur = 0;
  items.forEach(function (b) {
    var img = b.querySelector('img');
    img.addEventListener('error', function () { b.remove(); items = items.filter(function (x) { return x !== b; }); });
  });
  function show(i) {
    if (!items.length) return;
    cur = (i + items.length) % items.length;
    lbImg.src = items[cur].dataset.src;
    lbImg.alt = items[cur].querySelector('img').alt;
  }
  function openLb(i) { show(i); lb.hidden = false; if (lenis) lenis.stop(); lb.querySelector('.lb-close').focus(); }
  function closeLb() { lb.hidden = true; if (lenis) lenis.start(); }
  if (lb) {
    document.getElementById('mosaic').addEventListener('click', function (e) {
      var b = e.target.closest('.m-item'); if (b) openLb(items.indexOf(b));
    });
    lb.querySelector('.lb-close').addEventListener('click', closeLb);
    lb.querySelector('.lb-prev').addEventListener('click', function () { show(cur - 1); });
    lb.querySelector('.lb-next').addEventListener('click', function () { show(cur + 1); });
    lb.addEventListener('click', function (e) { if (e.target === lb) closeLb(); });
    document.addEventListener('keydown', function (e) {
      if (lb.hidden) return;
      if (e.key === 'Escape') closeLb();
      if (e.key === 'ArrowLeft') show(cur - 1);
      if (e.key === 'ArrowRight') show(cur + 1);
    });
  }

  /* ---------- Покрокова форма ---------- */
  var sel = document.getElementById('f-grade');
  var choices = document.getElementById('f-choices');
  var s1 = document.getElementById('f-step1'), s2 = document.getElementById('f-step2');
  var marks = document.querySelectorAll('.f-steps span');
  function pick(val) {
    sel.value = val;
    choices.querySelectorAll('button').forEach(function (b) { b.setAttribute('aria-pressed', String(b.dataset.v === val)); });
  }
  function go(step) {
    s1.hidden = step !== 1; s2.hidden = step !== 2;
    marks[0].classList.toggle('on', step === 1); marks[1].classList.toggle('on', step === 2);
    if (step === 2) document.getElementById('f-name').focus();
  }
  if (sel && choices) {
    Array.prototype.forEach.call(sel.options, function (o) {
      var b = document.createElement('button'); b.type = 'button'; b.textContent = o.text; b.dataset.v = o.value || o.text;
      b.setAttribute('aria-pressed', 'false');
      b.addEventListener('click', function () { pick(b.dataset.v); });
      choices.appendChild(b);
    });
    pick(sel.value);
    document.getElementById('f-next').addEventListener('click', function () { go(2); });
    document.getElementById('f-back').addEventListener('click', function () { go(1); });
    document.querySelectorAll('[data-grade]').forEach(function (a) {
      a.addEventListener('click', function () { pick(a.dataset.grade); go(1); });
    });
  }

  /* ---------- «Магнітні» кнопки (лише миша) ---------- */
  if (fine && !reduce) {
    document.querySelectorAll('.pill').forEach(function (p) {
      p.addEventListener('mousemove', function (e) {
        var r = p.getBoundingClientRect();
        var dx = (e.clientX - r.left - r.width / 2) * 0.18, dy = (e.clientY - r.top - r.height / 2) * 0.3;
        p.style.translate = dx.toFixed(1) + 'px ' + dy.toFixed(1) + 'px';
      });
      p.addEventListener('mouseleave', function () { p.style.translate = ''; });
    });
  }
})();
