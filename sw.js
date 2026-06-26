/* MERCS Companion — service worker. DigiRune Studios. */
const CACHE="mercs-v6";
const SHELL=[
  "./","index.html","data.js","app.js",
  "assets/logo_white.png","assets/logo_black.png","assets/cover.png","assets/opscover.png",
  "icons/icon-192.png","icons/icon-512.png","icons/apple-touch-icon.png",
  "https://fonts.googleapis.com/css2?family=Oswald:wght@500;600;700&family=Days+One&family=Barlow:wght@400;500;600;700&display=swap"
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
  // Critical: app shell must cache. Do NOT block install on the 28 MB of card images.
  e.waitUntil(caches.open(CACHE).then(c=>Promise.allSettled(SHELL.map(u=>c.add(u)))));
});

self.addEventListener("activate",e=>{
  e.waitUntil((async()=>{
    const keys=await caches.keys();
    await Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)));
    await self.clients.claim();
    // Self-start image precache on first activate (guarded so it runs once).
    precacheImages();
  })());
});

let PRECACHING=false;
async function precacheImages(){
  if(PRECACHING)return; PRECACHING=true;
  try{
    const cache=await caches.open(CACHE);
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
  const req=e.request;
  if(req.method!=="GET")return;
  const url=new URL(req.url);
  // cache-first for images (viewed cards persist offline)
  if(url.pathname.includes("/img/")||/\.(jpg|jpeg|png|webp)$/i.test(url.pathname)){
    e.respondWith(caches.open(CACHE).then(async c=>{
      const hit=await c.match(req);
      if(hit)return hit;
      try{const res=await fetch(req);if(res&&res.status===200)c.put(req,res.clone());return res;}
      catch(err){return hit||Response.error();}
    }));
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
  // app shell: cache-first with network fallback, then network-update
  e.respondWith(caches.match(req).then(hit=>hit||fetch(req).then(res=>{
    if(res&&res.status===200&&url.origin===location.origin){const cp=res.clone();caches.open(CACHE).then(c=>c.put(req,cp));}
    return res;
  }).catch(()=>caches.match("index.html"))));
});
