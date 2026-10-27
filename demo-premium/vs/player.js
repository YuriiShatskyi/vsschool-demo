/* VS School — «Преміум»: фоновий аудіоплеєр «Співає VS School».
   Треки й стартова гучність — у vs/content.js (music, musicVolume).

   • При кожному відкритті сайту починає з випадкової пісні.
   • Режими: «підряд» (по списку по колу) і «вперемішку» (кожна пісня по разу, потім нове коло).
   • Автозапуск: браузери забороняють сайтам вмикати звук без дії користувача, тому плеєр
     пробує заграти одразу, а якщо не дозволили — стартує від першого дотику / кліку / клавіші.
   • Гучність керується через Web Audio (GainNode), бо iPhone ігнорує audio.volume. */
(function () {
  var S = window.SITE || {};
  var list = (S.music || []).filter(function (t) { return t && t.src; });
  var box = document.getElementById('player');
  var audio = document.getElementById('plAudio');
  if (!box || !audio || !list.length) return;

  var $ = function (id) { return document.getElementById(id); };
  var btnPlay = $('plPlay'), btnMute = $('plMute'), btnMin = $('plMin');
  var prevBtns = box.querySelectorAll('.pl-prev'), nextBtns = box.querySelectorAll('.pl-next');   // у рядку плеєра і в шапці треклиста
  var btnList = $('plListBtn'), panel = $('plPanel'), ul = $('plList');
  var modeBtns = box.querySelectorAll('.pl-mode');
  var vol = $('plVol'), bar = $('plBar'), fill = $('plFill'), title = $('plTitle'), time = $('plTime');

  var store = {
    get: function (k) { try { return localStorage.getItem('vs-music-' + k); } catch (e) { return null; } },
    set: function (k, v) { try { localStorage.setItem('vs-music-' + k, v); } catch (e) {} }
  };

  var level = parseFloat(store.get('volume'));
  if (isNaN(level)) level = typeof S.musicVolume === 'number' ? S.musicVolume : 0.2;
  var muted = store.get('muted') === '1';
  var userPaused = store.get('paused') === '1';   // людина сама вимкнула — не вмикаємо наступного разу
  var shuffle = store.get('mode') === 'shuffle';
  var idx = 0, ctx = null, gain = null, fadeTimer = null;
  var history = [], queue = [];                     // для «вперемішку»: що вже грало і що попереду

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

  /* ---------- Режим підряд / вперемішку ---------- */
  function refillQueue() {
    queue = list.map(function (_, i) { return i; }).filter(function (i) { return i !== idx; });
    for (var i = queue.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = queue[i]; queue[i] = queue[j]; queue[j] = t; }
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
  function nextIndex() {
    if (!shuffle) return (idx + 1) % list.length;
    if (!queue.length) refillQueue();
    return queue.shift();
  }
  function prevIndex() {
    if (shuffle && history.length) return history.pop();
    return (idx - 1 + list.length) % list.length;
  }

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
      if (i === idx) { if (audio.paused) { userPaused = false; store.set('paused', '0'); play(true); } return; }
      go(i, true);
    });
    li.appendChild(b); ul.appendChild(li);
  });
  function paintList() {
    Array.prototype.forEach.call(ul.children, function (li, i) {
      li.classList.toggle('on', i === idx);
      li.querySelector('button').setAttribute('aria-current', i === idx ? 'true' : 'false');
    });
  }
  function setPanel(open) {
    panel.hidden = !open;
    btnList.setAttribute('aria-expanded', String(open));
    btnList.setAttribute('aria-label', open ? 'Сховати список пісень' : 'Показати список пісень');
    if (open) { var on = ul.querySelector('li.on'); if (on) on.scrollIntoView({ block: 'nearest' }); }
  }
  btnList.addEventListener('click', function () { setPanel(panel.hidden); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !panel.hidden) { setPanel(false); btnList.focus(); } });
  document.addEventListener('pointerdown', function (e) { if (!panel.hidden && !box.contains(e.target)) setPanel(false); });

  /* ---------- Треки ---------- */
  function load(i) {
    idx = i;
    var t = list[idx];
    audio.src = t.src;
    title.textContent = t.title || ('Пісня ' + (idx + 1));
    if (t.artist) { var sm = document.createElement('small'); sm.textContent = ' · ' + t.artist; title.appendChild(sm); }
    fill.style.width = '0%';
    time.textContent = '0:00';
    paintList();
    if ('mediaSession' in navigator) {
      try {
        navigator.mediaSession.metadata = new MediaMetadata({
          title: t.title || '', artist: t.artist || 'VS School', album: 'Співає VS School',
          artwork: [{ src: '../images/logo/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }]
        });
      } catch (e) {}
    }
  }
  function go(i, fromUser) {
    if (i === idx) return;
    history.push(idx); if (history.length > 50) history.shift();
    queue = queue.filter(function (q) { return q !== i; });
    load(i);
    if (fromUser) { userPaused = false; store.set('paused', '0'); }
    if (fromUser || !audio.paused || !userPaused) play(!!fromUser);
  }
  function fmt(s) { s = Math.max(0, Math.floor(s || 0)); return Math.floor(s / 60) + ':' + ('0' + s % 60).slice(-2); }

  /* ---------- Відтворення ---------- */
  function play(fromUser) {
    if (fromUser) setupGain();
    var p = audio.play();
    applyVolume(level, true);
    if (p && p.catch) p.catch(function () { if (!userPaused) waitForGesture(); });
  }
  function pause() { audio.pause(); }

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
  audio.addEventListener('ended', function () { go(nextIndex(), false); });
  audio.addEventListener('timeupdate', function () {
    var d = audio.duration || 0;
    var k = d ? audio.currentTime / d : 0;
    fill.style.width = (k * 100).toFixed(2) + '%';
    bar.setAttribute('aria-valuenow', String(Math.round(k * 100)));
    time.textContent = fmt(audio.currentTime) + (d ? ' / ' + fmt(d) : '');
  });
  var errors = 0;
  audio.addEventListener('error', function () {
    if (list.length > 1 && ++errors < list.length) go(nextIndex(), false);
  });
  audio.addEventListener('canplay', function () { errors = 0; });

  /* ---------- Кнопки ---------- */
  btnPlay.addEventListener('click', function () {
    if (audio.paused) { userPaused = false; store.set('paused', '0'); play(true); }
    else { userPaused = true; store.set('paused', '1'); pause(); disarm(); box.classList.remove('wait'); }
  });
  prevBtns.forEach(function (b) {
    b.addEventListener('click', function () {
      if (audio.currentTime > 3) { audio.currentTime = 0; return; }
      // крок назад не має потрапляти в історію знову
      load(prevIndex()); userPaused = false; store.set('paused', '0'); play(true);
    });
  });
  nextBtns.forEach(function (b) { b.addEventListener('click', function () { go(nextIndex(), true); }); });
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
    if (on && panel) setPanel(false);
  }
  btnMin.addEventListener('click', function () {
    var on = !box.classList.contains('mini'); setMini(on); store.set('mini', on ? '1' : '0');
  });

  /* Кнопки на заблокованому екрані / в шторці телефона */
  if ('mediaSession' in navigator) {
    try {
      navigator.mediaSession.setActionHandler('play', function () { userPaused = false; store.set('paused', '0'); play(true); });
      navigator.mediaSession.setActionHandler('pause', function () { userPaused = true; store.set('paused', '1'); pause(); });
      if (list.length > 1) {
        navigator.mediaSession.setActionHandler('previoustrack', function () { load(prevIndex()); play(true); });
        navigator.mediaSession.setActionHandler('nexttrack', function () { go(nextIndex(), true); });
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

  /* ---------- Старт: випадкова пісня при кожному відкритті ---------- */
  load(Math.floor(Math.random() * list.length));
  if (shuffle) refillQueue();
  paintVol(); paintMode();
  box.hidden = false;
  var introMs = window.VS_INTRO_MS || 0;
  if (introMs) { box.classList.add('hide-intro'); setTimeout(function () { box.classList.remove('hide-intro'); }, introMs + 300); }
  if (userPaused) return;
  audio.volume = 0;
  play(false);
})();
