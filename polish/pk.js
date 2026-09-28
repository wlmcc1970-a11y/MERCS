/* DigiRune Polish Kit v1.0.1 (2026-09-26) - pk.js
   Small, dependency-free helpers for the Premium Polish Standard. Safe to load in any app:
   every feature checks support first and falls back to the app's current behavior. */
(function(){
  'use strict';
  var mq = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)');
  var reduce = !!(mq && mq.matches);
  if (mq && mq.addEventListener) mq.addEventListener('change', function(e){ reduce = e.matches; });
  var PK = window.PK = window.PK || {};
  PK.version = '1.0.1';

  /* ---- 6. Screen transitions. Wrap any DOM change that swaps a screen:
         PK.go(function(){ showTab('rules') }, {dir:'forward'|'back', morph:elementOrNull})
     Uses the View Transitions API when present; otherwise just runs the change. */
  PK.go = function(change, opts){
    opts = opts || {};
    if (reduce || !document.startViewTransition) { change(); if (PK._dock) PK._dock(); return Promise.resolve(); }
    document.documentElement.setAttribute('data-pk-dir', opts.dir === 'back' ? 'back' : 'forward');
    var src = opts.morph;
    if (src) src.style.viewTransitionName = 'pk-morph';
    var t = document.startViewTransition(function(){
      if (src) src.style.viewTransitionName = '';
      change();
      var dest = opts.morphTarget && (typeof opts.morphTarget === 'function' ? opts.morphTarget() : opts.morphTarget);
      if (dest) dest.style.viewTransitionName = 'pk-morph';
    });
    return t.finished.then(function(){
      if (PK._dock) PK._dock();
      var d = document.querySelector('[style*="pk-morph"]');
      if (d) d.style.viewTransitionName = '';
    }).catch(function(){});
  };

  /* ---- list entrance stagger: PK.reveal(container) ---- */
  PK.reveal = function(el){
    if (!el || reduce) return;
    el.classList.remove('pk-reveal');
    var kids = el.children;
    for (var i = 0; i < kids.length && i < 40; i++) kids[i].style.setProperty('--pk-i', i);
    void el.offsetWidth; el.classList.add('pk-reveal');
  };

  /* ---- 8. Haptics: PK.haptic('light'|'click'|'success'|'warn')
     Native wrappers expose one of these bridges; plain web on Android falls back to a tiny vibrate.
     iOS web has no vibrate, so nothing happens there, by design. */
  var lastBuzz = 0;
  PK.haptic = function(kind){
    var now = Date.now(); if (now - lastBuzz < 60) return; lastBuzz = now;
    kind = kind || 'light';
    try {
      if (window.webkit && webkit.messageHandlers && webkit.messageHandlers.haptic) { webkit.messageHandlers.haptic.postMessage(kind); return; }
      if (window.AndroidHaptics && AndroidHaptics.perform) { AndroidHaptics.perform(kind); return; }
      if (window.Capacitor && Capacitor.Plugins && Capacitor.Plugins.Haptics) {
        var H = Capacitor.Plugins.Haptics;
        if (kind === 'success' || kind === 'warn') H.notification({type: kind === 'success' ? 'SUCCESS' : 'WARNING'});
        else H.impact({style: kind === 'click' ? 'MEDIUM' : 'LIGHT'});
        return;
      }
      if (navigator.vibrate && /Android/i.test(navigator.userAgent)) navigator.vibrate(kind === 'click' ? 12 : 8);
    } catch (e) {}
  };

  /* ---- 10. Empty state: PK.empty(container, {icon:svgString, title, body, action:{label, run}}) ---- */
  PK.empty = function(el, o){
    if (!el) return;
    o = o || {};
    var box = document.createElement('div'); box.className = 'pk-empty';
    if (o.icon) { var ic = document.createElement('div'); ic.className = 'pk-empty-icon'; ic.innerHTML = o.icon; box.appendChild(ic); }
    var h = document.createElement('p'); h.className = 'pk-empty-title'; h.textContent = o.title || ''; box.appendChild(h);
    if (o.body) { var b = document.createElement('p'); b.className = 'pk-empty-body'; b.textContent = o.body; box.appendChild(b); }
    if (o.action) { var btn = document.createElement('button'); btn.type = 'button'; btn.className = 'pk-press'; btn.textContent = o.action.label; btn.onclick = o.action.run; box.appendChild(btn); }
    el.replaceChildren(box);
  };

  /* ---- 11. Offline notice (text is set by the app: PK.init({offlineText})) ---- */
  function offline(text){
    var n = document.createElement('div'); n.className = 'pk-offline'; n.setAttribute('role','status');
    n.textContent = text; document.body.appendChild(n);
    function upd(){ n.classList.toggle('on', navigator.onLine === false); }
    addEventListener('online', upd); addEventListener('offline', upd); upd();
  }

  /* ---- 13. Images: fade in when ready; if one fails, show a monogram instead of a broken icon ---- */
  function wireImg(img){
    if (img.__pk) return; img.__pk = 1;
    img.classList.add('pk-img');
    if (!img.hasAttribute('decoding')) img.decoding = 'async';
    function ok(){ img.classList.add('pk-loaded'); }
    function bad(){
      var label = (img.getAttribute('alt') || img.dataset.pkLabel || '').trim();
      var m = document.createElement('span'); m.className = 'pk-monogram'; m.setAttribute('aria-hidden','true');
      m.textContent = label ? label.replace(/[^A-Za-z0-9 ]/g,'').split(/\s+/).filter(Boolean).slice(0,2).map(function(w){return w[0];}).join('').toUpperCase() : '';
      m.style.width = (img.width || img.offsetWidth || 56) + 'px'; m.style.height = (img.height || img.offsetHeight || 56) + 'px';
      m.style.borderRadius = getComputedStyle(img).borderRadius;
      img.replaceWith(m);
    }
    if (img.complete) { if (img.naturalWidth) ok(); else if (img.getAttribute('src')) bad(); }
    else { img.addEventListener('load', ok, {once:true}); img.addEventListener('error', bad, {once:true}); }
  }
  PK.images = function(root){ (root || document).querySelectorAll('img:not(.pk-skip)').forEach(wireImg); };

  /* ---- 12. Branded opening: remove as soon as the app is ready, never later than maxMs ---- */
  PK.ready = function(){ var s = document.querySelector('.pk-splash'); if (s) { s.classList.add('done'); setTimeout(function(){ s.remove(); }, 600); } };

  /* ---- init ---- */
  PK.init = function(o){
    o = o || {};
    if (o.grain !== false) document.body.classList.add('pk-grain');
    if (o.offlineText) offline(o.offlineText);
    PK.images();
    if (window.MutationObserver) new MutationObserver(function(ms){
      for (var i = 0; i < ms.length; i++) ms[i].addedNodes.forEach(function(n){
        if (n.nodeType !== 1) return;
        if (n.tagName === 'IMG') wireImg(n); else if (n.querySelectorAll) n.querySelectorAll('img:not(.pk-skip)').forEach(wireImg);
      });
    }).observe(document.body, {childList:true, subtree:true});
    if (o.pressSelector) {
      /* press styling on touch start; the haptic fires on the click itself, so scrolling never buzzes */
      document.addEventListener('pointerdown', function(e){
        var t = e.target.closest && e.target.closest(o.pressSelector);
        if (t) t.classList.add('pk-press');
      }, {passive:true});
      if (o.haptics !== false) document.addEventListener('click', function(e){
        var t = e.target.closest && e.target.closest(o.pressSelector);
        if (t) PK.haptic(t.matches('input[type=checkbox],[role=switch],[aria-pressed]') ? 'click' : 'light');
      }, true);
    }
    /* keep notices clear of a bottom tab bar: set dockSelector to the app's fixed bottom bar */
    if (o.dockSelector) {
      var dock = function(){ var t = document.querySelector(o.dockSelector);
        var h = t && getComputedStyle(t).display !== 'none' ? t.offsetHeight : 0;
        document.documentElement.style.setProperty('--pk-dock', h + 'px'); };
      addEventListener('resize', dock); dock(); PK._dock = dock;
      var bar = document.querySelector(o.dockSelector);
      if (bar && window.ResizeObserver) new ResizeObserver(dock).observe(bar);
    }
    setTimeout(PK.ready, o.splashMaxMs || 900);
  };
})();
