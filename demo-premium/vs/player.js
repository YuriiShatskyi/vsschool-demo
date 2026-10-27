/* VS School — «Преміум»: фоновий аудіоплеєр «Співає VS School».
   Треки й стартова гучність — у vs/content.js (music, musicVolume).

   • При кожному відкритті сайту починає з випадкової пісні.
   • Старт — плавне наростання (FADE_IN), між піснями — плавний перехід без пауз (CROSSFADE):
     дві «деки» audio, поки одна затихає, інша вже звучить.
   • Режими: «підряд» (по списку по колу) і «вперемішку» (кожна пісня по разу, потім нове коло).
   • Автозапуск: браузери забороняють сайтам вмикати звук без дії користувача, тому плеєр
     пробує заграти одразу, а якщо не дозволили — стартує від першого дотику / кліку / клавіші.
   • Гучність через Web Audio (GainNode), бо iPhone ігнорує audio.volume. */
(function () {
  var FADE_IN = 4;       // с — наростання при першому запуску
  var RESUME_IN = 1.2;   // с — наростання після паузи
  var CROSSFADE = 5;     // с — перехід між піснями наприкінці треку
  var SWITCH = 1.5;      // с — перехід, коли пісню перемкнули вручну
  var PAUSE_OUT = 0.4;   // с — затухання перед паузою

  var S = window.SITE || {};
  var list = (S.music || []).filter(function (t) { return t && t.src; });
  var box = document.getElementById('player');
  var el0 = document.getElementById('plAudio');
  if (!box || !el0 || !list.length) return;

  var $ = function (id) { return document.getElementById(id); };
  var btnPlay = $('plPlay'), btnMin = $('plMin'), btnList = $('plListBtn'), panel = $('plPanel'), ul = $('plList');
  var prevBtns = box.querySelectorAll('.pl-prev'), nextBtns = box.querySelectorAll('.pl-next'), modeBtns = box.querySelectorAll('.pl-mode');
  var bar = $('plBar'), fill = $('plFill'), title = $('plTitle'), time = $('plTime');

  var store = {
    get: function (k) { try { return localStorage.getItem('vs-music-' + k); } catch (e) { return null; } },
    set: function (k, v) { try { localStorage.setItem('vs-music-' + k, v); } catch (e) {} }
  };

  var level = typeof S.musicVolume === 'number' ? S.musicVolume : 0.2;
  var userPaused = store.get('paused') === '1';   // людина сама вимкнула — не вмикаємо наступного разу
  var shuffle = store.get('mode') === 'shuffle';
  var idx = 0, playing = false, started = false, xfading = false;
  var history = [], queue = [];
  var ctx = null, master = null;

  var el1 = new Audio(); el1.preload = 'auto';
  var decks = [{ el: el0, fade: 0, anim: null, g: null }, { el: el1, fade: 0, anim: null, g: null }];
  var cur = 0;
  var active = function () { return decks[cur]; };

  if (list.length < 2) box.classList.add('single');
  if (store.get('mini') === '1') setMini(true);

  /* ---------- Гучність і плавні переходи ---------- */
  // Рівнопотужна крива: на середині переходу обидві пісні звучать без провалу гучності
  function out(f) { return Math.sin(Math.max(0, Math.min(1, f)) * Math.PI / 2); }
  function apply(d) {
    var v = out(d.fade);
    if (d.g) d.g.gain.setTargetAtTime(v, ctx.currentTime, 0.02);
    else d.el.volume = Math.max(0, Math.min(1, v * level));
  }
  function fadeTo(d, to, sec, done) {
    d.anim = { from: d.fade, to: to, t0: Date.now(), ms: Math.max(1, sec * 1000), done: done };
    tick();
  }
  var timer = null;
  function tick() {
    var busy = false, now = Date.now();
    decks.forEach(function (d) {
      if (!d.anim) return;
      var a = d.anim, k = Math.min(1, (now - a.t0) / a.ms);
      d.fade = a.from + (a.to - a.from) * k;
      apply(d);
      if (k >= 1) { d.anim = null; if (a.done) a.done(); } else busy = true;
    });
    if (busy && !timer) timer = setInterval(tick, 40);
    if (!busy && timer) { clearInterval(timer); timer = null; }
  }

  /* Web Audio вмикаємо лише після дії користувача (інакше AudioContext «спить»).
     Тут же «розблоковуємо» другу деку — iPhone дозволяє грати лише тим audio,
     які хоч раз запускалися від дотику. */
  function unlock() {
    var AC = window.AudioContext || window.webkitAudioContext;
    if (!ctx && AC && location.protocol !== 'file:') {   // з диска Web Audio віддає тишу
      try {
        ctx = new AC();
        master = ctx.createGain(); master.gain.value = level; master.connect(ctx.destination);
        decks.forEach(function (d) {
          var src = ctx.createMediaElementSource(d.el);
          d.g = ctx.createGain(); d.g.gain.value = out(d.fade);
          src.connect(d.g); d.g.connect(master);
          d.el.volume = 1;
        });
      } catch (e) { ctx = null; master = null; decks.forEach(function (d) { d.g = null; }); }
    }
    if (ctx && ctx.state === 'suspended') ctx.resume();
    var o = decks[1 - cur];
    if (!o.primed && o.el.paused) {
      o.primed = true; o.priming = true;
      if (!o.el.getAttribute('src')) o.el.src = list[idx].src;
      o.fade = 0; apply(o);
      var p = o.el.play();
      var done = function () { o.priming = false; if (o !== active()) o.el.pause(); };
      if (p && p.then) p.then(done).catch(function () { o.priming = false; o.primed = false; });
      else done();
    }
  }

  /* ---------- Режим підряд / вперемішку ---------- */
  function refillQueue() {
    queue = list.map(function (_, i) { return i; }).filter(function (i) { return i !== idx; });
    for (var i = queue.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = queue[i]; queue[i] = queue[j]; queue[j] = t; }
  }
  function nextIndex() {
    if (list.length < 2) return idx;
    if (!shuffle) return (idx + 1) % list.length;
    if (!queue.length) refillQueue();
    return queue.shift();
  }
  function prevIndex() {
    if (shuffle && history.length) return history.pop();
    return (idx - 1 + list.length) % list.length;
  }
  function paintMode() {
    box.classList.toggle('shuffle', shuffle);
    var label = shuffle ? 'Режим: вперемішку. Перемкнути на підряд' : 'Режим: підряд. Перемкнути на вперемішку';
    modeBtns.forEach(function (b) { b.setAttribute('aria-label', label); b.title = shuffle ? 'Вперемішку' : 'Підряд'; });
  }
  modeBtns.forEach(function (b) {
    b.addEventListener('click', function () {
      shuffle = !shuffle; store.set('mode', shuffle ? 'shuffle' : 'order');
      if (shuffle) refillQueue();
      paintMode();
    });
  });

  /* ---------- Треклист ---------- */
  list.forEach(function (t, i) {
    var li = document.createElement('li');
    var b = document.createElement('button'); b.type = 'button';
    b.innerHTML = '<span class="n"><i></i><span class="pl-eq" aria-hidden="true"><i></i><i></i><i></i><i></i></span></span><span class="t"><b></b><span></span></span><span class="d"></span>';
    b.querySelector('.n > i').textContent = i + 1;
    b.querySelector('.t b').textContent = t.title || ('Пісня ' + (i + 1));
    b.querySelector('.t span').textContent = t.artist || '';
    b.querySelector('.d').textContent = t.time || '';
    b.addEventListener('click', function () {
      if (i === idx) { if (!playing) resume(true); return; }
      switchTo(i, SWITCH, true, true);
    });
    li.appendChild(b); ul.appendChild(li);
  });
  function setPanel(open) {
    panel.hidden = !open;
    btnList.setAttribute('aria-expanded', String(open));
    btnList.setAttribute('aria-label', open ? 'Сховати список пісень' : 'Показати список пісень');
    if (open) { var on = ul.querySelector('li.on'); if (on) on.scrollIntoView({ block: 'nearest' }); }
  }
  btnList.addEventListener('click', function () { setPanel(panel.hidden); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !panel.hidden) { setPanel(false); btnList.focus(); } });
  document.addEventListener('pointerdown', function (e) { if (!panel.hidden && !box.contains(e.target)) setPanel(false); });

  /* ---------- Відображення ---------- */
  function paintTrack() {
    var t = list[idx];
    title.textContent = t.title || ('Пісня ' + (idx + 1));
    if (t.artist) { var sm = document.createElement('small'); sm.textContent = ' · ' + t.artist; title.appendChild(sm); }
    fill.style.width = '0%';
    if (time) time.textContent = '0:00';
    Array.prototype.forEach.call(ul.children, function (li, i) {
      li.classList.toggle('on', i === idx);
      li.querySelector('button').setAttribute('aria-current', i === idx ? 'true' : 'false');
    });
    if ('mediaSession' in navigator) {
      try {
        navigator.mediaSession.metadata = new MediaMetadata({
          title: t.title || '', artist: t.artist || 'VS School', album: 'Співає VS School',
          artwork: [{ src: '../images/logo/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }]
        });
      } catch (e) {}
    }
  }
  function paintPlaying(on) {
    playing = on;
    box.classList.toggle('playing', on);
    if (on) box.classList.remove('wait');
    btnPlay.setAttribute('aria-label', on ? 'Пауза' : 'Увімкнути музику');
  }
  function fmt(s) { s = Math.max(0, Math.floor(s || 0)); return Math.floor(s / 60) + ':' + ('0' + s % 60).slice(-2); }

  /* ---------- Відтворення ---------- */
  function resume(fromUser) {
    if (fromUser) { userPaused = false; store.set('paused', '0'); unlock(); }
    var d = active();
    decks.forEach(function (x) { if (x !== d) { x.anim = null; x.fade = 0; apply(x); if (!x.priming) x.el.pause(); } });
    var p = d.el.play();
    var go = function () { paintPlaying(true); fadeTo(d, 1, started ? RESUME_IN : FADE_IN); started = true; };
    if (p && p.then) p.then(go).catch(function () { paintPlaying(false); if (!userPaused) waitForGesture(); });
    else go();
  }
  function pause(fromUser) {
    if (fromUser) { userPaused = true; store.set('paused', '1'); disarm(); box.classList.remove('wait'); }
    paintPlaying(false); xfading = false;
    decks.forEach(function (d) { if (!d.el.paused) fadeTo(d, 0, PAUSE_OUT, function () { if (!playing) d.el.pause(); }); });
  }
  /* Перехід на пісню i: нова дека наростає, стара затихає за sec секунд */
  function switchTo(i, sec, fromUser, remember) {
    if (fromUser) { userPaused = false; store.set('paused', '0'); unlock(); }
    if (remember !== false) { history.push(idx); if (history.length > 50) history.shift(); }
    queue = queue.filter(function (q) { return q !== i; });
    var old = active(), nd = decks[1 - cur];
    idx = i; cur = 1 - cur; paintTrack();
    nd.anim = null; nd.el.pause(); nd.el.src = list[i].src; nd.fade = 0; apply(nd);
    if (!playing && !fromUser && userPaused) return;
    xfading = true;
    fadeTo(old, 0, sec, function () { old.el.pause(); xfading = false; });
    var p = nd.el.play();
    var go = function () { paintPlaying(true); started = true; fadeTo(nd, 1, sec); };
    if (p && p.then) p.then(go).catch(function () { xfading = false; paintPlaying(false); if (!userPaused) waitForGesture(); });
    else go();
  }

  /* Різні браузери вважають «дією користувача» різні події (миша — pointerdown,
     дотик — touchend/click), тому слухаємо всі й пробуємо щоразу, доки не заграє. */
  var GESTURES = ['pointerdown', 'pointerup', 'touchend', 'click', 'keydown'];
  var armed = false;
  function onGesture(e) {
    if (box.contains(e.target) || userPaused || playing) return;   // клік по плеєру обробляє сам плеєр
    unlock(); resume(false);
  }
  function disarm() {
    if (!armed) return;
    armed = false;
    GESTURES.forEach(function (t) { document.removeEventListener(t, onGesture, true); });
  }
  function waitForGesture() {
    box.classList.add('wait');
    if (armed) return;
    armed = true;
    GESTURES.forEach(function (t) { document.addEventListener(t, onGesture, true); });
  }

  decks.forEach(function (d) {
    d.el.addEventListener('playing', function () { if (d === active()) disarm(); });
    d.el.addEventListener('timeupdate', function () {
      if (d !== active()) return;
      var dur = d.el.duration || 0, t = d.el.currentTime;
      var k = dur ? t / dur : 0;
      fill.style.width = (k * 100).toFixed(2) + '%';
      bar.setAttribute('aria-valuenow', String(Math.round(k * 100)));
      if (time) time.textContent = fmt(t) + (dur ? ' / ' + fmt(dur) : '');
      // наприкінці пісні — плавний перехід на наступну
      if (playing && !xfading && dur > CROSSFADE * 2 && dur - t <= CROSSFADE) switchTo(nextIndex(), Math.max(1, dur - t), false);
    });
    d.el.addEventListener('ended', function () {   // запасний шлях, якщо перехід не встиг стартувати
      if (d === active() && playing && !xfading) switchTo(nextIndex(), 0.5, false);
    });
    d.el.addEventListener('error', function () {
      if (d === active() && list.length > 1 && (d.errors = (d.errors || 0) + 1) < list.length) switchTo(nextIndex(), 0.3, false, false);
    });
    d.el.addEventListener('canplay', function () { d.errors = 0; });
  });

  /* ---------- Кнопки ---------- */
  btnPlay.addEventListener('click', function () { if (playing) pause(true); else resume(true); });
  prevBtns.forEach(function (b) {
    b.addEventListener('click', function () {
      var d = active();
      if (d.el.currentTime > 3 && playing) { d.el.currentTime = 0; return; }
      switchTo(prevIndex(), SWITCH, true, false);
    });
  });
  nextBtns.forEach(function (b) { b.addEventListener('click', function () { switchTo(nextIndex(), SWITCH, true); }); });
  function seek(e) {
    var d = active(), r = bar.getBoundingClientRect();
    var k = Math.min(1, Math.max(0, (e.clientX - r.left) / r.width));
    if (d.el.duration) d.el.currentTime = k * d.el.duration;
  }
  bar.addEventListener('click', seek);
  bar.addEventListener('keydown', function (e) {
    var a = active().el; if (!a.duration) return;
    if (e.key === 'ArrowRight') a.currentTime = Math.min(a.duration, a.currentTime + 5);
    if (e.key === 'ArrowLeft') a.currentTime = Math.max(0, a.currentTime - 5);
  });
  function setMini(on) {
    box.classList.toggle('mini', on);
    btnMin.setAttribute('aria-expanded', String(!on));
    btnMin.setAttribute('aria-label', on ? 'Розгорнути плеєр' : 'Згорнути плеєр');
    if (on && panel) setPanel(false);
  }
  btnMin.addEventListener('click', function () {
    var on = !box.classList.contains('mini'); setMini(on); store.set('mini', on ? '1' : '0');
  });

  /* Кнопки на заблокованому екрані / в шторці телефона */
  if ('mediaSession' in navigator) {
    try {
      navigator.mediaSession.setActionHandler('play', function () { resume(true); });
      navigator.mediaSession.setActionHandler('pause', function () { pause(true); });
      if (list.length > 1) {
        navigator.mediaSession.setActionHandler('previoustrack', function () { switchTo(prevIndex(), SWITCH, true, false); });
        navigator.mediaSession.setActionHandler('nexttrack', function () { switchTo(nextIndex(), SWITCH, true); });
      }
    } catch (e) {}
  }

  /* Вкладку сховали — пауза; повернулися — граємо далі */
  var resumeOnShow = false;
  document.addEventListener('visibilitychange', function () {
    if (document.hidden) {
      resumeOnShow = playing;
      if (playing) { paintPlaying(false); xfading = false; decks.forEach(function (d) { d.anim = null; d.el.pause(); }); }
    } else if (resumeOnShow) { resumeOnShow = false; active().fade = 0; resume(false); }
  });

  /* Над нижньою мобільною панеллю «Подзвонити / Записатися» — піднімаємось */
  var mcta = document.getElementById('mcta');
  if (mcta && 'MutationObserver' in window) {
    new MutationObserver(function () { box.classList.toggle('lifted', mcta.classList.contains('show')); })
      .observe(mcta, { attributes: true, attributeFilter: ['class'] });
  }

  /* ---------- Старт: випадкова пісня при кожному відкритті ---------- */
  idx = Math.floor(Math.random() * list.length);
  el0.src = list[idx].src;
  decks.forEach(apply);
  paintTrack(); paintMode();
  if (shuffle) refillQueue();
  box.hidden = false;
  var introMs = window.VS_INTRO_MS || 0;
  if (introMs) { box.classList.add('hide-intro'); setTimeout(function () { box.classList.remove('hide-intro'); }, introMs + 300); }
  if (!userPaused) resume(false);
})();
