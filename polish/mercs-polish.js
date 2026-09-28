/* MERCS Polish release (2026-09-28, from the approved 2026-09-26 proof). Wires kit motion, art and states into the existing app
   without changing any rules text or data. Loaded after app.js. */
(function(){
  var FAC = {"ccc":"#e8b818","eic":"#30b080","eu":"#2058a8","gcc":"#584860","house4":"#787880","house9":"#c05828",
             "iss":"#60b8c8","keizaiwaza":"#e07830","kemvar":"#90b038","sefadu":"#886828","texico":"#884020","uscr":"#782820"};
  /* white or dark ink on a faction color, whichever passes AA (4.5:1) */
  function lumOf(hex){ var n = parseInt(hex.slice(1),16); return [n>>16&255, n>>8&255, n&255].map(function(v){ v/=255; return v<=.03928?v/12.92:Math.pow((v+.055)/1.055,2.4); })
    .reduce(function(s,v,i){ return s + v*[.2126,.7152,.0722][i]; }, 0); }
  /* pick the band color and ink so text passes AA (4.5:1): dark ink on light factions, white on dark ones,
     and for mid-tone factions where neither passes, deepen the publisher color just enough for white */
  function paint(hex){
    var D = lumOf('#111a18'), L = lumOf(hex);
    if (1.05/(L+.05) >= 4.5) return {fac:hex, ink:'#fff'};
    if ((L+.05)/(D+.05) >= 4.5) return {fac:hex, ink:'#111a18'};
    var n = parseInt(hex.slice(1),16), c = [n>>16&255, n>>8&255, n&255];
    for (var k = 0; k < 20; k++) { c = c.map(function(v){ return Math.round(v*.93); });
      var h = '#' + c.map(function(v){ return ('0'+v.toString(16)).slice(-2); }).join('');
      if (1.05/(lumOf(h)+.05) >= 4.5) return {fac:h, ink:'#fff'}; }
    return {fac:'#1b332e', ink:'#fff'};
  }
  var key = function(f){ return String(f || '').toLowerCase().replace(/[^a-z0-9]/g,''); };
  var portrait = function(u){ return u && u.imgFront ? 'art/units/' + u.imgFront.split('/').pop().replace('-front.jpg','.webp') : ''; };

  PK.init({pressSelector:'.tile,.toolq,.item,.tab,.btn,.segb,.stat,.rback', offlineText:'Offline. Everything still works.', splashMaxMs:700, dockSelector:'#tabbar'});

  /* stat heat colors: keep the app's red-amber-green scale but nudge each value until it reads at 3:1
     against the stat tile (large bold numerals), in light and dark */
  var _heat = window.heatColor;
  if (_heat) window.heatColor = function(g){
    var c = _heat(g), m = /rgb\((\d+),(\d+),(\d+)\)/.exec(c); if (!m) return c;
    var dark = document.documentElement.getAttribute('data-theme') === 'dark';
    var bg = dark ? [27,51,46] : [242,246,245], rgb = [+m[1],+m[2],+m[3]];
    var L = function(a){ return a.map(function(v){ v/=255; return v<=.03928?v/12.92:Math.pow((v+.055)/1.055,2.4); }).reduce(function(s,v,i){ return s+v*[.2126,.7152,.0722][i]; },0); };
    var ratio = function(a){ var x=L(a), y=L(bg); return (Math.max(x,y)+.05)/(Math.min(x,y)+.05); };
    for (var k = 0; k < 20 && ratio(rgb) < 3.2; k++) rgb = rgb.map(function(v){ return Math.round(dark ? v + (255-v)*.12 : v*.9); });
    return 'rgb(' + rgb.join(',') + ')';
  };

  /* tab changes: slide in the direction of travel */
  var _nav = window.navTo;
  window.navTo = function(id, opts){
    var cur = (typeof CURRENT_TAB !== 'undefined' && CURRENT_TAB) || 'home';
    var from = TAB_IDS.indexOf(cur), to = TAB_IDS.indexOf(id);
    if (id === cur) return _nav(id, opts);
    return PK.go(function(){ _nav(id, opts); decorate(); }, {dir: to < from ? 'back' : 'forward'});
  };

  /* unit card: portrait header in the faction color, list-to-card transition */
  var _show = window.showUnit;
  window.showUnit = function(i){
    var row = document.querySelector('#megList .unititem[data-unit="' + i + '"] .thumb');
    return PK.go(function(){ _show(i); heroUnit(i); }, {morph: row, morphTarget: function(){ return document.querySelector('#megDetail .cardfig img'); }});
  };
  var _back = window.megBack;
  window.megBack = function(){ return PK.go(function(){ _back(); decorate(); }, {dir:'back'}); };

  function heroUnit(i){
    var u = DATA.units[i], card = document.querySelector('#megDetail .unitcard'); if (!card || !u) return;
    var pc = paint(FAC[key(u.faction)] || '#3f7a72'); card.style.setProperty('--fac', pc.fac);
    var h = document.createElement('div'); h.className = 'pk-unithero'; h.style.setProperty('--fac-ink', pc.ink);
        var box = document.createElement('div');
    var t = document.createElement('h3'); t.setAttribute('translate','no'); t.textContent = cap(u.name);
    var s = document.createElement('div'); s.className = 'pk-sub'; s.setAttribute('translate','no'); s.textContent = u.faction + '  ·  ' + u.archetype;
    box.append(t, s); h.append(box);
    var head = card.querySelector('.uhead'); head.after(h);
  }

  /* list decoration: portraits, faction color, faction band, entrance stagger */
  function decorate(){
    var list = document.getElementById('megList');
    if (list && list.querySelector('.unititem .thumb:not([data-pk])')) {
      var fsel = document.getElementById('megFac'), f = fsel ? fsel.value : '', col = FAC[key(f)] || '#3f7a72';
      list.style.setProperty('--fac', col);
      list.querySelectorAll('.unititem').forEach(function(r){
        var u = DATA.units[+r.dataset.unit], th = r.querySelector('.thumb');
        if (u && th) { th.dataset.pk = 1; th.src = portrait(u); th.alt = cap(u.name); }
      });
      var band = document.getElementById('pkFacBand');
      if (!band) { band = document.createElement('div'); band.id = 'pkFacBand'; band.className = 'pk-facband'; list.before(band); }
      var pb = paint(col); band.style.setProperty('--fac', pb.fac); band.style.setProperty('--fac-ink', pb.ink);
      var units = extByFaction(f).slice(0, 4);
      band.innerHTML = '<div><small>MegaCon</small><b translate="no"></b></div><div class="pk-crew"></div>';
      band.querySelector('b').textContent = f;
      units.forEach(function(u){ var im = document.createElement('img'); im.src = portrait(u); im.alt = ''; im.className = 'pk-skip'; band.querySelector('.pk-crew').appendChild(im); });
      PK.reveal(list);
    }
    var q = document.querySelector('#panel-home .qtiles'); if (q && !q.__pk) { q.__pk = 1; PK.reveal(q); }
  }
  new MutationObserver(function(){ if (document.querySelector('#megList .unititem .thumb:not([data-pk])')) decorate(); })
    .observe(document.body, {childList:true, subtree:true});
  decorate();

  /* section bands: cover art behind the title on each main screen (publisher art only) */
  var POS = {contingency:'20% 30%', corp:'80% 45%', operations:'50% 70%', rules:'35% 55%', modifiers:'65% 30%', keywords:'90% 60%'};
  function bands(){
    Object.keys(POS).forEach(function(id){
      var p = document.getElementById('panel-' + id); if (!p || p.querySelector('.pk-sectionband')) return;
      var h = p.querySelector(':scope > .vh'); if (!h) return;
      var sub = h.nextElementSibling && h.nextElementSibling.classList.contains('vsub') ? h.nextElementSibling : null;
      var b = document.createElement('div'); b.className = 'pk-sectionband'; b.style.setProperty('--pk-pos', POS[id]);
      h.before(b); b.appendChild(h); if (sub) b.appendChild(sub);
    });
    /* designed empty state for the unit filter */
    /* designed empty states everywhere the app shows a plain one (the app's own wording is kept as the title) */
    document.querySelectorAll('.empty:not([data-pk])').forEach(function(e){
      e.dataset.pk = 1;
      var panel = e.closest('.panel'), search = panel && panel.querySelector('input[type=search]');
      var box = document.createElement('div'); box.className = 'empty'; box.dataset.pk = 1;
      PK.empty(box, {
        icon: search ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3M8 11h6"/></svg>'
                     : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="4" y="3" width="16" height="18" rx="2"/><path d="M8 8h8M8 12h8M8 16h5"/></svg>',
        title: e.textContent.trim(),
        body: search ? 'Try a different word, or clear the search.' : '',
        action: search ? {label:'Clear search', run:function(){ search.value = ''; search.dispatchEvent(new Event('input', {bubbles:true})); }} : null });
      box.style.cssText = 'border:0;padding:0;background:none';
      e.replaceWith(box);
    });
  }
  new MutationObserver(bands).observe(document.body, {childList:true, subtree:true}); bands();
})();
