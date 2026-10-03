/* MERCS Companion — service worker. DigiRune Studios. */
const CACHE="mercs-v32";
const MEDIA="mercs-media-v1";   // card images live here — a STABLE cache the shell version bump never purges, so a code update no longer wipes/re-downloads the ~28 MB of images
const SHELL=[
  "./","index.html","manifest.json","data.js","app.js","auth.js","privacy.html",
  "polish/pk.css","polish/pk.js","polish/mercs-polish.css","polish/mercs-polish.js",
  "assets/logo_white.png","assets/logo_black.png","assets/cover.png","assets/opscover.png",
  "icons/icon-192.png","icons/icon-512.png","icons/apple-touch-icon.png",
  "https://fonts.googleapis.com/css2?family=Black+Ops+One&family=Bungee&family=DM+Sans:wght@400;500;600;700&display=swap"
];
const IMG_ASSETS=[
  "img/cards/ccc/ccc-breacher-back.jpg",
  "img/cards/ccc/ccc-breacher-front.jpg",
  "img/cards/ccc/ccc-demo-back.jpg",
  "img/cards/ccc/ccc-demo-front.jpg",
  "img/cards/ccc/ccc-gunner-back.jpg",
  "img/cards/ccc/ccc-gunner-front.jpg",
  "img/cards/ccc/ccc-heavy-back.jpg",
  "img/cards/ccc/ccc-heavy-front.jpg",
  "img/cards/ccc/ccc-incinerator-back.jpg",
  "img/cards/ccc/ccc-incinerator-front.jpg",
  "img/cards/ccc/ccc-jammer-back.jpg",
  "img/cards/ccc/ccc-jammer-front.jpg",
  "img/cards/ccc/ccc-leader-back.jpg",
  "img/cards/ccc/ccc-leader-front.jpg",
  "img/cards/ccc/ccc-medic-back.jpg",
  "img/cards/ccc/ccc-medic-front.jpg",
  "img/cards/ccc/ccc-sniper-back.jpg",
  "img/cards/ccc/ccc-sniper-front.jpg",
  "img/cards/ccc/ccc-spotter-back.jpg",
  "img/cards/ccc/ccc-spotter-front.jpg",
  "img/cards/eic/eic-assimilator-back.jpg",
  "img/cards/eic/eic-assimilator-front.jpg",
  "img/cards/eic/eic-breacher-back.jpg",
  "img/cards/eic/eic-breacher-front.jpg",
  "img/cards/eic/eic-demo-back.jpg",
  "img/cards/eic/eic-demo-front.jpg",
  "img/cards/eic/eic-engineer-back.jpg",
  "img/cards/eic/eic-engineer-front.jpg",
  "img/cards/eic/eic-heavy-back.jpg",
  "img/cards/eic/eic-heavy-front.jpg",
  "img/cards/eic/eic-jammer-back.jpg",
  "img/cards/eic/eic-jammer-front.jpg",
  "img/cards/eic/eic-leader-back.jpg",
  "img/cards/eic/eic-leader-front.jpg",
  "img/cards/eic/eic-pathfinder-back.jpg",
  "img/cards/eic/eic-pathfinder-front.jpg",
  "img/cards/eic/eic-shock-back.jpg",
  "img/cards/eic/eic-shock-front.jpg",
  "img/cards/eic/eic-sniper-back.jpg",
  "img/cards/eic/eic-sniper-front.jpg",
  "img/cards/eu/eu-analyst-back.jpg",
  "img/cards/eu/eu-analyst-front.jpg",
  "img/cards/eu/eu-demo-back.jpg",
  "img/cards/eu/eu-demo-front.jpg",
  "img/cards/eu/eu-heavy-back.jpg",
  "img/cards/eu/eu-heavy-front.jpg",
  "img/cards/eu/eu-leader-back.jpg",
  "img/cards/eu/eu-leader-front.jpg",
  "img/cards/eu/eu-medic-back.jpg",
  "img/cards/eu/eu-medic-front.jpg",
  "img/cards/eu/eu-sergeant-back.jpg",
  "img/cards/eu/eu-sergeant-front.jpg",
  "img/cards/eu/eu-shock-back.jpg",
  "img/cards/eu/eu-shock-front.jpg",
  "img/cards/eu/eu-sniper-back.jpg",
  "img/cards/eu/eu-sniper-front.jpg",
  "img/cards/eu/eu-spotter-back.jpg",
  "img/cards/eu/eu-spotter-front.jpg",
  "img/cards/eu/eu-wrench-back.jpg",
  "img/cards/eu/eu-wrench-front.jpg",
  "img/cards/gcc/gcc-agent-back.jpg",
  "img/cards/gcc/gcc-agent-front.jpg",
  "img/cards/gcc/gcc-breacher-back.jpg",
  "img/cards/gcc/gcc-breacher-front.jpg",
  "img/cards/gcc/gcc-chief-back.jpg",
  "img/cards/gcc/gcc-chief-front.jpg",
  "img/cards/gcc/gcc-demo-back.jpg",
  "img/cards/gcc/gcc-demo-front.jpg",
  "img/cards/gcc/gcc-drone-back.jpg",
  "img/cards/gcc/gcc-drone-front.jpg",
  "img/cards/gcc/gcc-heavy-back.jpg",
  "img/cards/gcc/gcc-heavy-front.jpg",
  "img/cards/gcc/gcc-jammer-back.jpg",
  "img/cards/gcc/gcc-jammer-front.jpg",
  "img/cards/gcc/gcc-judge-back.jpg",
  "img/cards/gcc/gcc-judge-front.jpg",
  "img/cards/gcc/gcc-recorder-back.jpg",
  "img/cards/gcc/gcc-recorder-front.jpg",
  "img/cards/gcc/gcc-sniper-back.jpg",
  "img/cards/gcc/gcc-sniper-front.jpg",
  "img/cards/gcc/gcc-tribunal-back.jpg",
  "img/cards/gcc/gcc-tribunal-front.jpg",
  "img/cards/house4/house4-breacher-back.jpg",
  "img/cards/house4/house4-breacher-front.jpg",
  "img/cards/house4/house4-demo-back.jpg",
  "img/cards/house4/house4-demo-front.jpg",
  "img/cards/house4/house4-engineer-back.jpg",
  "img/cards/house4/house4-engineer-front.jpg",
  "img/cards/house4/house4-heavy-back.jpg",
  "img/cards/house4/house4-heavy-front.jpg",
  "img/cards/house4/house4-medic-back.jpg",
  "img/cards/house4/house4-medic-front.jpg",
  "img/cards/house4/house4-priest-back.jpg",
  "img/cards/house4/house4-priest-front.jpg",
  "img/cards/house4/house4-shock-back.jpg",
  "img/cards/house4/house4-shock-front.jpg",
  "img/cards/house4/house4-sniper-back.jpg",
  "img/cards/house4/house4-sniper-front.jpg",
  "img/cards/house4/house4-steward-back.jpg",
  "img/cards/house4/house4-steward-front.jpg",
  "img/cards/house4/house4-survivalist-back.jpg",
  "img/cards/house4/house4-survivalist-front.jpg",
  "img/cards/house9/house9-bedouin-back.jpg",
  "img/cards/house9/house9-bedouin-front.jpg",
  "img/cards/house9/house9-boomer-back.jpg",
  "img/cards/house9/house9-boomer-front.jpg",
  "img/cards/house9/house9-engineer-back.jpg",
  "img/cards/house9/house9-engineer-front.jpg",
  "img/cards/house9/house9-jammer-back.jpg",
  "img/cards/house9/house9-jammer-front.jpg",
  "img/cards/house9/house9-liason-back.jpg",
  "img/cards/house9/house9-liason-front.jpg",
  "img/cards/house9/house9-master-back.jpg",
  "img/cards/house9/house9-master-front.jpg",
  "img/cards/house9/house9-medic-back.jpg",
  "img/cards/house9/house9-medic-front.jpg",
  "img/cards/house9/house9-saboteur-back.jpg",
  "img/cards/house9/house9-saboteur-front.jpg",
  "img/cards/house9/house9-shock-back.jpg",
  "img/cards/house9/house9-shock-front.jpg",
  "img/cards/house9/house9-spy-back.jpg",
  "img/cards/house9/house9-spy-front.jpg",
  "img/cards/iss/iss-calypso-back.jpg",
  "img/cards/iss/iss-calypso-front.jpg",
  "img/cards/iss/iss-demo-back.jpg",
  "img/cards/iss/iss-demo-front.jpg",
  "img/cards/iss/iss-heavy-back.jpg",
  "img/cards/iss/iss-heavy-front.jpg",
  "img/cards/iss/iss-jammer-back.jpg",
  "img/cards/iss/iss-jammer-front.jpg",
  "img/cards/iss/iss-leader-back.jpg",
  "img/cards/iss/iss-leader-front.jpg",
  "img/cards/iss/iss-shock-back.jpg",
  "img/cards/iss/iss-shock-front.jpg",
  "img/cards/iss/iss-sniper-back.jpg",
  "img/cards/iss/iss-sniper-front.jpg",
  "img/cards/iss/iss-spy-back.jpg",
  "img/cards/iss/iss-spy-front.jpg",
  "img/cards/iss/iss-turret-back.jpg",
  "img/cards/iss/iss-turret-front.jpg",
  "img/cards/iss/iss-wavefinder-back.jpg",
  "img/cards/iss/iss-wavefinder-front.jpg",
  "img/cards/iss/iss-wrench-back.jpg",
  "img/cards/iss/iss-wrench-front.jpg",
  "img/cards/keizaiwaza/keizaiwaza-daimyo-back.jpg",
  "img/cards/keizaiwaza/keizaiwaza-daimyo-front.jpg",
  "img/cards/keizaiwaza/keizaiwaza-demo-back.jpg",
  "img/cards/keizaiwaza/keizaiwaza-demo-front.jpg",
  "img/cards/keizaiwaza/keizaiwaza-heavy-back.jpg",
  "img/cards/keizaiwaza/keizaiwaza-heavy-front.jpg",
  "img/cards/keizaiwaza/keizaiwaza-jammer-back.jpg",
  "img/cards/keizaiwaza/keizaiwaza-jammer-front.jpg",
  "img/cards/keizaiwaza/keizaiwaza-observer-back.jpg",
  "img/cards/keizaiwaza/keizaiwaza-observer-front.jpg",
  "img/cards/keizaiwaza/keizaiwaza-pathfinder-back.jpg",
  "img/cards/keizaiwaza/keizaiwaza-pathfinder-front.jpg",
  "img/cards/keizaiwaza/keizaiwaza-sniper-back.jpg",
  "img/cards/keizaiwaza/keizaiwaza-sniper-front.jpg",
  "img/cards/keizaiwaza/keizaiwaza-spotter-back.jpg",
  "img/cards/keizaiwaza/keizaiwaza-spotter-front.jpg",
  "img/cards/keizaiwaza/keizaiwaza-spy-back.jpg",
  "img/cards/keizaiwaza/keizaiwaza-spy-front.jpg",
  "img/cards/keizaiwaza/keizaiwaza-wrench-back.jpg",
  "img/cards/keizaiwaza/keizaiwaza-wrench-front.jpg",
  "img/cards/kemvar/kemvar-assassin-back.jpg",
  "img/cards/kemvar/kemvar-assassin-front.jpg",
  "img/cards/kemvar/kemvar-demo-back.jpg",
  "img/cards/kemvar/kemvar-demo-front.jpg",
  "img/cards/kemvar/kemvar-engineer-back.jpg",
  "img/cards/kemvar/kemvar-engineer-front.jpg",
  "img/cards/kemvar/kemvar-heavy-back.jpg",
  "img/cards/kemvar/kemvar-heavy-front.jpg",
  "img/cards/kemvar/kemvar-jammer-back.jpg",
  "img/cards/kemvar/kemvar-jammer-front.jpg",
  "img/cards/kemvar/kemvar-leader-back.jpg",
  "img/cards/kemvar/kemvar-leader-front.jpg",
  "img/cards/kemvar/kemvar-shock-back.jpg",
  "img/cards/kemvar/kemvar-shock-front.jpg",
  "img/cards/kemvar/kemvar-sniper-back.jpg",
  "img/cards/kemvar/kemvar-sniper-front.jpg",
  "img/cards/kemvar/kemvar-spy-back.jpg",
  "img/cards/kemvar/kemvar-spy-front.jpg",
  "img/cards/kemvar/kemvar-wrench-back.jpg",
  "img/cards/kemvar/kemvar-wrench-front.jpg",
  "img/cards/sefadu/sefadu-berserker-back.jpg",
  "img/cards/sefadu/sefadu-berserker-front.jpg",
  "img/cards/sefadu/sefadu-demo-back.jpg",
  "img/cards/sefadu/sefadu-demo-front.jpg",
  "img/cards/sefadu/sefadu-engineer-back.jpg",
  "img/cards/sefadu/sefadu-engineer-front.jpg",
  "img/cards/sefadu/sefadu-gunner-back.jpg",
  "img/cards/sefadu/sefadu-gunner-front.jpg",
  "img/cards/sefadu/sefadu-heavy-back.jpg",
  "img/cards/sefadu/sefadu-heavy-front.jpg",
  "img/cards/sefadu/sefadu-leader-back.jpg",
  "img/cards/sefadu/sefadu-leader-front.jpg",
  "img/cards/sefadu/sefadu-medic-back.jpg",
  "img/cards/sefadu/sefadu-medic-front.jpg",
  "img/cards/sefadu/sefadu-pathfinder-back.jpg",
  "img/cards/sefadu/sefadu-pathfinder-front.jpg",
  "img/cards/sefadu/sefadu-shock-back.jpg",
  "img/cards/sefadu/sefadu-shock-front.jpg",
  "img/cards/sefadu/sefadu-sniper-back.jpg",
  "img/cards/sefadu/sefadu-sniper-front.jpg",
  "img/cards/texico/texico-breacher-back.jpg",
  "img/cards/texico/texico-breacher-front.jpg",
  "img/cards/texico/texico-demo-back.jpg",
  "img/cards/texico/texico-demo-front.jpg",
  "img/cards/texico/texico-dog-back.jpg",
  "img/cards/texico/texico-dog-front.jpg",
  "img/cards/texico/texico-eagle-back.jpg",
  "img/cards/texico/texico-eagle-front.jpg",
  "img/cards/texico/texico-engineer-back.jpg",
  "img/cards/texico/texico-engineer-front.jpg",
  "img/cards/texico/texico-heavy-back.jpg",
  "img/cards/texico/texico-heavy-front.jpg",
  "img/cards/texico/texico-jaguar-back.jpg",
  "img/cards/texico/texico-jaguar-front.jpg",
  "img/cards/texico/texico-leader-back.jpg",
  "img/cards/texico/texico-leader-front.jpg",
  "img/cards/texico/texico-marshal-back.jpg",
  "img/cards/texico/texico-marshal-front.jpg",
  "img/cards/texico/texico-ranger-back.jpg",
  "img/cards/texico/texico-ranger-front.jpg",
  "img/cards/texico/texico-sniper-back.jpg",
  "img/cards/texico/texico-sniper-front.jpg",
  "img/cards/uscr/uscr-behemoth-back.jpg",
  "img/cards/uscr/uscr-behemoth-front.jpg",
  "img/cards/uscr/uscr-commissar-back.jpg",
  "img/cards/uscr/uscr-commissar-front.jpg",
  "img/cards/uscr/uscr-engineer-back.jpg",
  "img/cards/uscr/uscr-engineer-front.jpg",
  "img/cards/uscr/uscr-gunner-back.jpg",
  "img/cards/uscr/uscr-gunner-front.jpg",
  "img/cards/uscr/uscr-heavy-back.jpg",
  "img/cards/uscr/uscr-heavy-front.jpg",
  "img/cards/uscr/uscr-jammer-back.jpg",
  "img/cards/uscr/uscr-jammer-front.jpg",
  "img/cards/uscr/uscr-medic-back.jpg",
  "img/cards/uscr/uscr-medic-front.jpg",
  "img/cards/uscr/uscr-pathfinder-back.jpg",
  "img/cards/uscr/uscr-pathfinder-front.jpg",
  "img/cards/uscr/uscr-sniper-back.jpg",
  "img/cards/uscr/uscr-sniper-front.jpg",
  "img/cards/uscr/uscr-wrench-back.jpg",
  "img/cards/uscr/uscr-wrench-front.jpg",
  "img/contingency/3-oclock-high.jpg",
  "img/contingency/all-banged-up.jpg",
  "img/contingency/bang-youre-dead.jpg",
  "img/contingency/best-served-cold.jpg",
  "img/contingency/bloodied-and-broken.jpg",
  "img/contingency/bulletproof.jpg",
  "img/contingency/caught-like-a-rabbit.jpg",
  "img/contingency/ccc-nano-nano.jpg",
  "img/contingency/check-your-six.jpg",
  "img/contingency/eic-hard-target.jpg",
  "img/contingency/eu-served-cold.jpg",
  "img/contingency/first-strike.jpg",
  "img/contingency/gcc-not-so-fast.jpg",
  "img/contingency/grudge-match.jpg",
  "img/contingency/heads-up.jpg",
  "img/contingency/hide-in-the-shadows.jpg",
  "img/contingency/hiding-in-plain-sight.jpg",
  "img/contingency/high-ground.jpg",
  "img/contingency/house4-overrun.jpg",
  "img/contingency/house9-what-reinforcements.jpg",
  "img/contingency/iss-youve-got-potential.jpg",
  "img/contingency/keizaiwaza-last-ditch.jpg",
  "img/contingency/kemvar-plain-sight.jpg",
  "img/contingency/leap-of-faith.jpg",
  "img/contingency/no-escape.jpg",
  "img/contingency/sefadu-pack-hunters.jpg",
  "img/contingency/take-a-dive.jpg",
  "img/contingency/texico-concerted-effort.jpg",
  "img/contingency/the-backdoor.jpg",
  "img/contingency/the-patient-hunter.jpg",
  "img/contingency/uscr-winters-bite.jpg",
  "img/corp/ccc-corp.jpg",
  "img/corp/eic-corp.jpg",
  "img/corp/eu-corp.jpg",
  "img/corp/gcc-corp.jpg",
  "img/corp/house4-corp.jpg",
  "img/corp/house9-corp.jpg",
  "img/corp/iss-corp.jpg",
  "img/corp/keizaiwaza-corp.jpg",
  "img/corp/kemvar-corp.jpg",
  "img/corp/sefadu-corp.jpg",
  "img/corp/texico-corp.jpg",
  "img/corp/uscr-corp.jpg",
  "img/ops/brown-bag-map.jpg",
  "img/ops/shadow-dragon-map.jpg"
];

self.addEventListener("install",e=>{
  // NOTE: no skipWaiting() here on purpose — the new worker WAITS so the in-app
  // "New version available - tap to update" toast (which posts SKIP_WAITING) is what
  // activates it. Auto-skipping made the toast a dead button and could reload mid-action.
  // Critical: app shell must cache. Do NOT block install on the 28 MB of card images.
  e.waitUntil(caches.open(CACHE).then(c=>Promise.allSettled(SHELL.map(u=>c.add(u)))));
});

self.addEventListener("activate",e=>{
  e.waitUntil((async()=>{
    const keys=await caches.keys();
    // Rescue already-downloaded card images from any prior cache into the persistent MEDIA cache,
    // so moving images to their own cache costs existing users NO re-download.
    const media=await caches.open(MEDIA);
    for(const k of keys){
      if(k===CACHE||k===MEDIA)continue;
      const oc=await caches.open(k);
      for(const url of IMG_ASSETS){
        try{ if(await media.match(url))continue; const r=await oc.match(url); if(r)await media.put(url,r.clone()); }catch(err){}
      }
    }
    // Keep only the current shell (CACHE) and the persistent images (MEDIA); drop everything else.
    await Promise.all(keys.filter(k=>k!==CACHE&&k!==MEDIA&&k!==ART_CACHE).map(k=>caches.delete(k)));
    await self.clients.claim();
    // Fill any gaps in MEDIA (skips anything already rescued above — no needless re-download).
    precacheImages();
  })());
});

let PRECACHING=false;
async function precacheImages(){
  if(PRECACHING)return; PRECACHING=true;
  try{
    const cache=await caches.open(MEDIA);
    const total=IMG_ASSETS.length;
    let done=0;
    // Count anything already cached as done up front.
    for(const url of IMG_ASSETS){
      try{
        const have=await cache.match(url);
        if(have){done++;continue;}
        await cache.add(url);            // resilient: a single 404 won't abort the batch
        done++;
      }catch(err){ done++; }             // count failures so progress always completes
      post({type:"precache",done,total});
    }
    post({type:"precache-done",total});
  }finally{ PRECACHING=false; }
}
async function post(msg){
  const cs=await self.clients.matchAll({includeUncontrolled:true});
  cs.forEach(c=>c.postMessage(msg));
}

self.addEventListener("message",e=>{
  if(e.data==="SKIP_WAITING")self.skipWaiting();
  else if(e.data&&e.data.type==="start-precache")precacheImages();
});

self.addEventListener("fetch",e=>{
  if (pkArtResponse(e)) return;   /* Polish Kit art folder (F-190) */
  const req=e.request;
  if(req.method!=="GET")return;
  const url=new URL(req.url);
  // cache-first for images (viewed cards persist offline). Card images live in the persistent MEDIA
  // cache; small shell images (logos/icons) live in CACHE — caches.match() resolves either.
  if(url.pathname.includes("/img/")||/\.(jpg|jpeg|png|webp)$/i.test(url.pathname)){
    e.respondWith((async()=>{
      const hit=await caches.match(req);
      if(hit)return hit;
      try{const res=await fetch(req);if(res&&res.status===200){const c=await caches.open(MEDIA);c.put(req,res.clone());}return res;}
      catch(err){return Response.error();}
    })());
    return;
  }
  // fonts: cache-first
  if(url.hostname.includes("fonts.")){
    e.respondWith(caches.open(CACHE).then(async c=>{
      const hit=await c.match(req);if(hit)return hit;
      try{const res=await fetch(req);if(res&&(res.status===200||res.type==="opaque"))c.put(req,res.clone());return res;}catch(e){return hit||Response.error();}
    }));
    return;
  }
  // app shell: NETWORK-FIRST so online testers always get the latest deploy
  // (cache only as offline fallback). no manual cache-clearing needed.
  e.respondWith(
    fetch(new Request(req,{cache:"no-cache"})).then(res=>{
      if(res&&res.status===200&&url.origin===location.origin){const cp=res.clone();caches.open(CACHE).then(c=>c.put(req,cp));}
      return res;
    }).catch(()=>caches.match(req).then(hit=>{
      if(hit)return hit;
      // Only a NAVIGATION may fall back to the app shell. Returning index.html for a
      // failed script/style/image would hand back HTML where code was expected.
      if(req.mode==="navigate"||(req.headers.get("accept")||"").includes("text/html"))return caches.match("index.html");
      return Response.error();
    }))
  );
});


/* ===== Polish Kit art folder (F-190) ===== */
/* DigiRune Polish Kit v1.0.1 - pk-sw-art.js
   The art folder rule (Will, 2026-09-26): an app may keep a small art/ folder beside its single
   HTML file. Every file in it is precached at install so the app still works fully offline.
   Paste into the app's current service worker, sw-v[N].js (never importScripts: the manifest tool writes into
   that file). Create the new sw-v[N+1].js first, then run tools/pk-art-manifest.py, which writes ART_FILES and a
   content hash for ART_VERSION into the highest-numbered sw-v[N].js it finds.

   Rules:
   - The app's own activate handler deletes every cache except app-shell-v[N] AND the current ART_CACHE
     (chassis Gate 2.4 as amended by F-190): keep both, or the art is thrown away on every deploy.
   - ART_VERSION changes whenever any art file changes, so old art is dropped cleanly.
   - Art is cache-first (instant, offline); a missing file fails honestly, never returns HTML.
   - Precache bypasses the HTTP cache (cache:'reload'), so a changed file is never stored stale.
   - Keep the folder small: WebP/AVIF only, at most 400 KB a file, heroes about 1400px wide. */

const ART_VERSION = 'art-b3ca9a4c17';          // replaced by the build script
const ART_FILES = ["./art/hero-battle.webp", "./art/units/ccc-breacher.webp", "./art/units/ccc-demo.webp", "./art/units/ccc-gunner.webp", "./art/units/ccc-heavy.webp", "./art/units/ccc-incinerator.webp", "./art/units/ccc-jammer.webp", "./art/units/ccc-leader.webp", "./art/units/ccc-medic.webp", "./art/units/ccc-sniper.webp", "./art/units/ccc-spotter.webp", "./art/units/eic-assimilator.webp", "./art/units/eic-breacher.webp", "./art/units/eic-demo.webp", "./art/units/eic-engineer.webp", "./art/units/eic-heavy.webp", "./art/units/eic-jammer.webp", "./art/units/eic-leader.webp", "./art/units/eic-pathfinder.webp", "./art/units/eic-shock.webp", "./art/units/eic-sniper.webp", "./art/units/eu-analyst.webp", "./art/units/eu-demo.webp", "./art/units/eu-heavy.webp", "./art/units/eu-leader.webp", "./art/units/eu-medic.webp", "./art/units/eu-sergeant.webp", "./art/units/eu-shock.webp", "./art/units/eu-sniper.webp", "./art/units/eu-spotter.webp", "./art/units/eu-wrench.webp", "./art/units/gcc-agent.webp", "./art/units/gcc-breacher.webp", "./art/units/gcc-chief.webp", "./art/units/gcc-demo.webp", "./art/units/gcc-drone.webp", "./art/units/gcc-heavy.webp", "./art/units/gcc-jammer.webp", "./art/units/gcc-judge.webp", "./art/units/gcc-recorder.webp", "./art/units/gcc-sniper.webp", "./art/units/gcc-tribunal.webp", "./art/units/house4-breacher.webp", "./art/units/house4-demo.webp", "./art/units/house4-engineer.webp", "./art/units/house4-heavy.webp", "./art/units/house4-medic.webp", "./art/units/house4-priest.webp", "./art/units/house4-shock.webp", "./art/units/house4-sniper.webp", "./art/units/house4-steward.webp", "./art/units/house4-survivalist.webp", "./art/units/house9-bedouin.webp", "./art/units/house9-boomer.webp", "./art/units/house9-engineer.webp", "./art/units/house9-jammer.webp", "./art/units/house9-liason.webp", "./art/units/house9-master.webp", "./art/units/house9-medic.webp", "./art/units/house9-saboteur.webp", "./art/units/house9-shock.webp", "./art/units/house9-spy.webp", "./art/units/iss-calypso.webp", "./art/units/iss-demo.webp", "./art/units/iss-heavy.webp", "./art/units/iss-jammer.webp", "./art/units/iss-leader.webp", "./art/units/iss-shock.webp", "./art/units/iss-sniper.webp", "./art/units/iss-spy.webp", "./art/units/iss-turret.webp", "./art/units/iss-wavefinder.webp", "./art/units/iss-wrench.webp", "./art/units/keizaiwaza-daimyo.webp", "./art/units/keizaiwaza-demo.webp", "./art/units/keizaiwaza-heavy.webp", "./art/units/keizaiwaza-jammer.webp", "./art/units/keizaiwaza-observer.webp", "./art/units/keizaiwaza-pathfinder.webp", "./art/units/keizaiwaza-sniper.webp", "./art/units/keizaiwaza-spotter.webp", "./art/units/keizaiwaza-spy.webp", "./art/units/keizaiwaza-wrench.webp", "./art/units/kemvar-assassin.webp", "./art/units/kemvar-demo.webp", "./art/units/kemvar-engineer.webp", "./art/units/kemvar-heavy.webp", "./art/units/kemvar-jammer.webp", "./art/units/kemvar-leader.webp", "./art/units/kemvar-shock.webp", "./art/units/kemvar-sniper.webp", "./art/units/kemvar-spy.webp", "./art/units/kemvar-wrench.webp", "./art/units/sefadu-berserker.webp", "./art/units/sefadu-demo.webp", "./art/units/sefadu-engineer.webp", "./art/units/sefadu-gunner.webp", "./art/units/sefadu-heavy.webp", "./art/units/sefadu-leader.webp", "./art/units/sefadu-medic.webp", "./art/units/sefadu-pathfinder.webp", "./art/units/sefadu-shock.webp", "./art/units/sefadu-sniper.webp", "./art/units/texico-breacher.webp", "./art/units/texico-demo.webp", "./art/units/texico-dog.webp", "./art/units/texico-eagle.webp", "./art/units/texico-engineer.webp", "./art/units/texico-heavy.webp", "./art/units/texico-jaguar.webp", "./art/units/texico-leader.webp", "./art/units/texico-marshal.webp", "./art/units/texico-ranger.webp", "./art/units/texico-sniper.webp", "./art/units/uscr-behemoth.webp", "./art/units/uscr-commissar.webp", "./art/units/uscr-engineer.webp", "./art/units/uscr-gunner.webp", "./art/units/uscr-heavy.webp", "./art/units/uscr-jammer.webp", "./art/units/uscr-medic.webp", "./art/units/uscr-pathfinder.webp", "./art/units/uscr-sniper.webp", "./art/units/uscr-wrench.webp"];                   // e.g. ['./art/hero-rules.webp', './art/unit-sniper.webp']
const ART_CACHE = 'pk-' + ART_VERSION;

self.addEventListener('install', function(e){
  if (!ART_FILES.length) return;
  /* MERCS release note (2026-09-28): one file at a time, never addAll, so a single missing or slow art file
     can never block this update from installing (same rule as the app shell above). A file that misses here
     is fetched and cached the first time it is shown. */
  e.waitUntil(caches.open(ART_CACHE).then(function(c){
    return Promise.allSettled(ART_FILES.map(function(u){ return c.add(new Request(u, {cache:'reload'})); }));
  }));
});

self.addEventListener('activate', function(e){
  e.waitUntil(caches.keys().then(function(keys){
    return Promise.all(keys.filter(function(k){ return k.indexOf('pk-art-') === 0 && k !== ART_CACHE; })
      .map(function(k){ return caches.delete(k); }));
  }));
});

/* Call from the app's own fetch handler BEFORE its generic rule:
     if (pkArtResponse(e)) return;                                      */
function pkArtResponse(e){
  if (e.request.method !== 'GET') return false;
  var u = new URL(e.request.url);
  if (u.origin !== self.location.origin || !/\/art\//.test(u.pathname)) return false;
  e.respondWith(caches.open(ART_CACHE).then(function(c){
    return c.match(e.request, {ignoreSearch:true}).then(function(hit){
      return hit || fetch(e.request).then(function(res){
        if (res && res.status === 200) c.put(e.request, res.clone());
        return res;
      }).catch(function(){ return new Response('', {status:504, statusText:'Offline'}); });
    });
  }));
  return true;
}
