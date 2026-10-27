/* VS School — «Преміум»: фоновий аудіоплеєр.
   Треки й стартова гучність — у vs/content.js (music, musicVolume).

   Як працює автозапуск:
   браузери забороняють сайтам вмикати звук без дії користувача. Тому плеєр
   пробує заграти одразу, а якщо браузер не дозволив — стартує від першого
   дотику / кліку / натискання клавіші будь-де на сторінці.
   Гучність керується через Web Audio (GainNode), бо iPhone ігнорує audio.volume. */
(function () {
  var S = window.SITE || {};
  var list = (S.music || []).filter(function (t) { return t && t.src; });
  var box = document.getElementById('player');
  var audio = document.getElementById('plAudio');
  if (!box || !audio || !list.length) return;

  var $ = function (id) { return document.getElementById(id); };
  var btnPlay = $('plPlay'), btnPrev = $('plPrev'), btnNext = $('plNext'), btnMute = $('plMute'), btnMin = $('plMin');
  var vol = $('plVol'), bar = $('plBar'), fill = $('plFill'), title = $('plTitle'), time = $('plTime');

  var store = {
    get: function (k) { try { return localStorage.getItem('vs-music-' + k); } catch (e) { return null; } },
    set: function (k, v) { try { localStorage.setItem('vs-music-' + k, v); } catch (e) {} }
  };

  var level = parseFloat(store.get('volume'));
  if (isNaN(level)) level = typeof S.musicVolume === 'number' ? S.musicVolume : 0.2;
  var muted = store.get('muted') === '1';
  var userPaused = store.get('paused') === '1';   // людина сама вимкнула — не вмикаємо наступного разу
  var idx = 0, ctx = null, gain = null, fadeTimer = null, wantPlay = false;

  if (list.length < 2) box.classList.add('single');
  if (store.get('mini') === '1') setMini(true);

  /* ---------- Гучність ---------- */
  function applyVolume(v, smooth) {
    var target = muted ? 0 : v;
    if (gain) {
      var now = ctx.currentTime;
      gain.gain.cancelScheduledValues(now);
      gain.gain.setValueAtTime(gain.gain.value, now);
      gain.gain.linearRampToValueAtTime(target, now + (smooth ? 1.5 : 0.05));
      audio.volume = 1;
    } else {
      clearInterval(fadeTimer);
      if (!smooth) { audio.volume = target; return; }
      audio.volume = 0;
      var t0 = Date.now();
      fadeTimer = setInterval(function () {
        var k = Math.min(1, (Date.now() - t0) / 1500);
        audio.volume = target * k;
        if (k >= 1) clearInterval(fadeTimer);
      }, 50);
    }
  }
  /* Web Audio вмикаємо лише після дії користувача (інакше AudioContext «спить») */
  function setupGain() {
    if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return; }
    var AC = window.AudioContext || window.webkitAudioContext;
    if (!AC || location.protocol === 'file:') return;   // з диска Web Audio віддає тишу
    try {
      ctx = new AC();
      var src = ctx.createMediaElementSource(audio);
      gain = ctx.createGain();
      gain.gain.value = audio.volume;
      src.connect(gain); gain.connect(ctx.destination);
      if (ctx.state === 'suspended') ctx.resume();
    } catch (e) { ctx = null; gain = null; }
  }
  function paintVol() {
    vol.value = Math.round(level * 100);
    vol.style.setProperty('--v', vol.value + '%');
    box.classList.toggle('muted', muted || level === 0);
    btnMute.setAttribute('aria-pressed', String(muted));
    btnMute.setAttribute('aria-label', muted ? 'Увімкнути звук' : 'Вимкнути звук');
  }

  /* ---------- Треки ---------- */
  function load(i) {
    idx = (i + list.length) % list.length;
    audio.src = list[idx].src;
    title.textContent = list[idx].title || ('Трек ' + (idx + 1));
    fill.style.width = '0%';
    time.textContent = '0:00';
    if ('mediaSession' in navigator) {
      try {
        navigator.mediaSession.metadata = new MediaMetadata({
          title: title.textContent, artist: 'VS School',
          artwork: [{ src: '../images/logo/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }]
        });
      } catch (e) {}
    }
  }
  function fmt(s) { s = Math.max(0, Math.floor(s || 0)); return Math.floor(s / 60) + ':' + ('0' + s % 60).slice(-2); }

  /* ---------- Відтворення ---------- */
  function play(fromUser) {
    wantPlay = true;
    if (fromUser) setupGain();
    var p = audio.play();
    applyVolume(level, true);
    if (p && p.catch) p.catch(function () { wantPlay = false; if (!userPaused) waitForGesture(); });
  }
  function pause() { wantPlay = false; audio.pause(); }

  /* Різні браузери вважають «дією користувача» різні події (миша — pointerdown,
     дотик — touchend/click), тому слухаємо всі й пробуємо щоразу, доки не заграє. */
  var GESTURES = ['pointerdown', 'pointerup', 'touchend', 'click', 'keydown'];
  var armed = false;
  function onGesture(e) {
    if (box.contains(e.target) || userPaused || !audio.paused) return;   // клік по плеєру обробляє сам плеєр
    play(true);
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

  audio.addEventListener('playing', disarm);
  audio.addEventListener('play', function () { box.classList.add('playing'); box.classList.remove('wait'); btnPlay.setAttribute('aria-label', 'Пауза'); });
  audio.addEventListener('pause', function () { box.classList.remove('playing'); btnPlay.setAttribute('aria-label', 'Увімкнути музику'); });
  audio.addEventListener('ended', function () { load(idx + 1); play(false); });   // після останнього — знову перший
  audio.addEventListener('timeupdate', function () {
    var d = audio.duration || 0;
    var k = d ? audio.currentTime / d : 0;
    fill.style.width = (k * 100).toFixed(2) + '%';
    bar.setAttribute('aria-valuenow', String(Math.round(k * 100)));
    time.textContent = fmt(audio.currentTime) + (d ? ' / ' + fmt(d) : '');
  });
  audio.addEventListener('error', function () { if (list.length > 1) { load(idx + 1); if (wantPlay) play(false); } });

  /* ---------- Кнопки ---------- */
  btnPlay.addEventListener('click', function () {
    if (audio.paused) { userPaused = false; store.set('paused', '0'); play(true); }
    else { userPaused = true; store.set('paused', '1'); pause(); disarm(); box.classList.remove('wait'); }
  });
  btnPrev.addEventListener('click', function () {
    if (audio.currentTime > 3) { audio.currentTime = 0; return; }
    load(idx - 1); userPaused = false; play(true);
  });
  btnNext.addEventListener('click', function () { load(idx + 1); userPaused = false; play(true); });
  btnMute.addEventListener('click', function () {
    setupGain();
    muted = !muted; store.set('muted', muted ? '1' : '0');
    if (!muted && level === 0) level = 0.2;
    paintVol(); applyVolume(level, false);
  });
  vol.addEventListener('input', function () {
    setupGain();
    level = vol.value / 100; muted = false;
    store.set('volume', String(level)); store.set('muted', '0');
    paintVol(); applyVolume(level, false);
  });
  function seek(e) {
    var r = bar.getBoundingClientRect();
    var k = Math.min(1, Math.max(0, (e.clientX - r.left) / r.width));
    if (audio.duration) audio.currentTime = k * audio.duration;
  }
  bar.addEventListener('click', seek);
  bar.addEventListener('keydown', function (e) {
    if (!audio.duration) return;
    if (e.key === 'ArrowRight') audio.currentTime = Math.min(audio.duration, audio.currentTime + 5);
    if (e.key === 'ArrowLeft') audio.currentTime = Math.max(0, audio.currentTime - 5);
  });
  function setMini(on) {
    box.classList.toggle('mini', on);
    btnMin.setAttribute('aria-expanded', String(!on));
    btnMin.setAttribute('aria-label', on ? 'Розгорнути плеєр' : 'Згорнути плеєр');
  }
  btnMin.addEventListener('click', function () {
    var on = !box.classList.contains('mini'); setMini(on); store.set('mini', on ? '1' : '0');
  });

  /* Кнопки на заблокованому екрані / в шторці телефона */
  if ('mediaSession' in navigator) {
    try {
      navigator.mediaSession.setActionHandler('play', function () { userPaused = false; play(true); });
      navigator.mediaSession.setActionHandler('pause', function () { userPaused = true; store.set('paused', '1'); pause(); });
      if (list.length > 1) {
        navigator.mediaSession.setActionHandler('previoustrack', function () { load(idx - 1); play(true); });
        navigator.mediaSession.setActionHandler('nexttrack', function () { load(idx + 1); play(true); });
      }
    } catch (e) {}
  }

  /* Вкладку сховали — пауза; повернулися — граємо далі */
  var resumeOnShow = false;
  document.addEventListener('visibilitychange', function () {
    if (document.hidden) { resumeOnShow = !audio.paused; if (resumeOnShow) audio.pause(); }
    else if (resumeOnShow) { resumeOnShow = false; play(false); }
  });

  /* Над нижньою мобільною панеллю «Подзвонити / Записатися» — піднімаємось */
  var mcta = document.getElementById('mcta');
  if (mcta && 'MutationObserver' in window) {
    new MutationObserver(function () { box.classList.toggle('lifted', mcta.classList.contains('show')); })
      .observe(mcta, { attributes: true, attributeFilter: ['class'] });
  }

  /* ---------- Старт ---------- */
  load(0); paintVol();
  box.hidden = false;
  var introMs = window.VS_INTRO_MS || 0;
  if (introMs) { box.classList.add('hide-intro'); setTimeout(function () { box.classList.remove('hide-intro'); }, introMs + 300); }
  if (userPaused) return;
  audio.volume = 0;
  play(false);
})();
