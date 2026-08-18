/* ============================================================
   MERCS Companion — application logic
   DigiRune Studios. MERCS™ © Fifth Angel Studios — used under license.
   Reuses the Will-approved 5-tool engine logic, reorganized into the
   full multi-tab PWA. Inline SVG icons are hand-authored (no third-party
   icon license required).
   ============================================================ */
"use strict";
const $=(s,r=document)=>r.querySelector(s);
const $$=(s,r=document)=>[...r.querySelectorAll(s)];
const el=(t,c,h)=>{const e=document.createElement(t);if(c)e.className=c;if(h!=null)e.innerHTML=h;return e;};
const STAT_ORDER=["IM","RE","CR","MP","BL","AV","AF","IT"];
const TERM=DATA.terms;
/* MegaCon menus are presented A-Z (publisher request, Derek Osborne 2026-07-28).
   DERIVED copy, for DISPLAY and DEFAULTS ONLY. DATA.factions is never reordered:
   units, operations and saved state are addressed by ARRAY INDEX, so mutating a
   source array would silently repoint saved Strike Teams, Round Tracker rosters,
   Damage squads and Compare selections. Sorting a copy is index-safe. */
const FACTIONS_AZ=[...DATA.factions].sort((a,b)=>String(a).localeCompare(String(b),'en',{sensitivity:'base'}));
const SLUG=s=>String(s).toLowerCase().replace(/[^a-z0-9]+/g,"");

/* ---------- translate-safe rendering (protected terms never translated) ---------- */
function tn(t){return `<span translate="no">${esc(t)}</span>`;}
function esc(s){return String(s==null?"":s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");}
/* escape but keep already-safe; used for verbatim body text that may contain quotes */
function escText(s){return esc(s).replace(/\n/g,"<br>");}
/* escProse — for long-form PROSE body fields only (rules sections, recon add-ons,
   operation briefing/area/course, corporate trait text). Reflow source hard single
   line-breaks so paragraphs wrap naturally to the container, while preserving blank
   lines as paragraph breaks. Words are verbatim; only inter-word whitespace changes.
   NOT for stat blocks, tables, mission-parameter bullets, FAQ or keyword text. */
/* paragraphize — break a long reflowed run into readable paragraphs by grouping
   ~3 sentences (or ~300 chars) so prose reads like a book, not a wall. No regex
   lookbehind (older iOS Safari safe): mark sentence ends, then split. */
function paragraphize(text){
  const t=String(text==null?"":text).trim();
  if(!t) return [];
  const marked=t.replace(/([.!?\u2026])\s+(?=[A-Z0-9"\u201c'(\u2022])/g,"$1\u0001");
  const sents=marked.split("\u0001");
  const paras=[]; let cur="", n=0;
  for(let i=0;i<sents.length;i++){
    const s=sents[i].trim(); if(!s) continue;
    cur=cur?cur+" "+s:s; n++;
    if(n>=3 || cur.length>=300){ paras.push(cur); cur=""; n=0; }
  }
  if(cur) paras.push(cur);
  return paras;
}
const RULE_SUBHEADS=["WELCOME TO THE CAUSE","TABLETOP GAME RULES","WHAT YOU NEED","THE REFERENCE CARD FRONT","THE REFERENCE CARD BACK","REFERENCE CARDS","DEFINED TERMS","CONTINGENCY DECK","PLAYING AREA","PLAY AREA","KIT AREA","GAME RULES","PERSONAL ABILITIES","CORPORATE TRAITS","PREPARING THE OPERATION","DETERMINE MISSION","DRAW CONTINGENCY CARDS","RECRUITMENT PHASE","INITIATIVE PHASE","ACTION PHASE","REFRESH PHASE","MOVEMENT SYSTEM","BASE MARKINGS","MOVING UP AND DOWN","LADDER MOVEMENT","INVOLUNTARY MOVEMENT","COMBAT ACTIONS","MEASURING RANGE","RANGED COMBAT","SPECIAL RANGED RULES","MELEE COMBAT","NON-COMBAT ACTIONS","CHECK FOR VICTORY","SPECIAL ACTIONS","STATUS CONDITIONS","STATUS EFFECTS","ARMOR FAILURE","INTRODUCTION","DEDICATION","COUNTERS","DICE","GOAL","MINIATURES","TERRAIN","ELEVATION","JUMP","FALLING","TRAPS","MODIFIERS","HOLD","CLEANUP","KEYWORDS","BURNING","DISORIENTED","PINNED","SMOKE","SUPPRESSION","MOVEMENT","DEPLOYMENT","PHASES"].sort((a,b)=>b.length-a.length);
const RULE_SUBHEAD_RE=new RegExp("(^|[.!?:\\u2026]\\s+|\\s)("+RULE_SUBHEADS.map(x=>x.replace(/[.*+?^${}()|[\]\\\/]/g,"\\$&")).join("|")+")(?=\\s+[A-Z][a-z])","g");
/* ruleProse — like escProse but promotes known rule sub-headings (whitelist + a
   "followed by a Title-case word" guard so MERCS/faction codes/stats are never
   promoted) into <h4 class="rsub">, then sentence-groups the rest into paragraphs. */
function ruleProse(seg){
  const flowed=String(seg==null?"":seg).replace(/[ \t]*\n[ \t]*/g," ").replace(/\s+/g," ").trim();
  if(!flowed) return "";
  const marked=flowed.replace(RULE_SUBHEAD_RE,(m,pre,ph)=>pre+"\u0002"+ph+"\u0003");
  const chunks=marked.split(/\u0002(.+?)\u0003/);
  let html="";
  for(let i=0;i<chunks.length;i++){
    if(i%2===1){ html+="<h4 class=\"rsub\">"+esc(chunks[i].trim())+"</h4>"; }
    else { const txt=chunks[i].trim(); if(txt) html+=paragraphize(txt).map(pp=>"<p class=\"bodytext\">"+esc(pp)+"</p>").join(""); }
  }
  return html;
}
function escProse(s){
  const norm=String(s==null?"":s).replace(/\r\n?/g,"\n");
  // split on blank-line(s) => paragraphs; within a paragraph collapse single
  // newlines to one space (reflow ragged PDF wraps), then sentence-group into
  // readable paragraphs so long sections don't render as one wall of text.
  return norm.split(/\n[ \t]*\n+/).map(par=>{
    const flowed=par.replace(/[ \t]*\n[ \t]*/g," ").trim();
    if(!flowed) return "";
    return paragraphize(flowed).map(pp=>"<p class=\"bodytext\">"+esc(pp)+"</p>").join("");
  }).filter(Boolean).join("");
}
/* flowInline — same reflow as escProse but inline (paragraph breaks become <br><br>),
   for prose shown inside an existing <p> wrapper (e.g. the Operation Setup briefing). */
function flowInline(s){
  const norm=String(s==null?"":s).replace(/\r\n?/g,"\n");
  return norm.split(/\n[ \t]*\n+/).map(par=>esc(par.replace(/[ \t]*\n[ \t]*/g," ").trim()))
    .filter(Boolean).join("<br><br>");
}

/* ---------- persistence: clean-slate by default; optional device save or cloud sync ----------
   ACCOUNT: null (guest, in-memory only) | {mode:'device'} | {mode:'cloud',uid,provider,name,email,photo}
   Cloud sign-in (Google/Apple via Firebase Auth) mirrors the whole SESSION object to Firestore for
   cross-device sync; that layer lives in auth.js (window.__mercsSync) and loads right after this file.
   Every non-sync feature stays fully offline. ---------- */
let SESSION={}; let ACCOUNT=null;
const SAVE_LOCAL="mercs.v1.session";   // single local blob: device save + cloud mirror
const SAVE_MODE ="mercs.v1.mode";      // 'device' | 'cloud' — remembered to resume on next launch
const SAVE_DEVICE="mercs.v1.device";   // stable per-device id (live-sync echo guard)
const SAVE_ACCT ="mercs.v1.acct";      // cached cloud account label for offline display (S1)
const SAVE_BASE ="mercs.v1.base";      // last SESSION confirmed in sync with cloud — the 3-way merge base (S1/S2)
const SAVE_DV   ="mercs.v1.dv";        // data-schema version stamp guarding index-based saves (S4)
const DATA_VERSION=1;                  // bump when DATA arrays are reordered / units removed
function syncBaseGet(){ try{return JSON.parse(localStorage.getItem(SAVE_BASE)||'{}')||{};}catch(e){return {};} }
function syncBaseSet(o){ try{localStorage.setItem(SAVE_BASE,JSON.stringify(o||{}));}catch(e){} }
const Store={
  get(k,d){return (k in SESSION)?SESSION[k]:d;},
  set(k,v){SESSION[k]=v; persistLocal(); if(window.__mercsSync)window.__mercsSync.schedulePush();},
  del(k){ if(k in SESSION)delete SESSION[k]; persistLocal(); if(window.__mercsSync)window.__mercsSync.schedulePush();}
};
function persistLocal(){ if(ACCOUNT){ try{localStorage.setItem(SAVE_LOCAL,JSON.stringify(SESSION));localStorage.setItem(SAVE_DV,String(DATA_VERSION));}catch(e){} } }
function loadLocalSession(){ try{const raw=localStorage.getItem(SAVE_LOCAL);SESSION=(raw?JSON.parse(raw):null)||{};}catch(e){SESSION={};}
  /* S4: if the saved blob predates a DATA reorder/removal, drop index-addressed saves so they can't silently repoint. id-based favs are stable and kept. */
  try{const dv=localStorage.getItem(SAVE_DV); if(dv!=null && +dv!==DATA_VERSION){ ["strikeTeam","roundRoster","roundNo","dmgSquad","cmpSel","opBrowseIdx","opSetupIdx"].forEach(k=>{ if(k in SESSION)delete SESSION[k]; }); }}catch(e){} }
function hasLocalData(){ try{return !!(SESSION&&Object.keys(SESSION).length);}catch(e){return false;} }
/* resume the saved mode on launch (cloud is re-established async by auth.js onAuthStateChanged) */
function restoreSession(){ let m=null; try{m=localStorage.getItem(SAVE_MODE);}catch(e){}
  if(m==='device'){ ACCOUNT={mode:'device'}; loadLocalSession(); }
  else if(m==='cloud'){ /* S1: show the cloud mirror immediately (esp. offline); auth.js reconciles when Firebase loads */
    ACCOUNT={mode:'cloud',pending:true};
    try{const a=JSON.parse(localStorage.getItem(SAVE_ACCT)||'null'); if(a){ACCOUNT.name=a.name||'';ACCOUNT.email=a.email||'';ACCOUNT.photo=a.photo||'';}}catch(e){}
    loadLocalSession();
    try{ if(localStorage.getItem(SAVE_BASE)==null) syncBaseSet(SESSION); }catch(e){}  /* first run after this ships: assume the mirror was last in sync, so untouched keys defer to cloud */
  } }
/* device-only save (no cloud) — keeps any current in-memory guest selections */
function signInDevice(){ if(!hasLocalData())loadLocalSession(); ACCOUNT={mode:'device'};
  try{localStorage.setItem(SAVE_MODE,'device');}catch(e){} persistLocal(); updateAccountUI(); rebuildAll(); toast("Saving on this device"); }
/* sign out of whichever mode is active */
function signOut(){
  if(ACCOUNT&&ACCOUNT.mode==='cloud'){
    if(ACCOUNT.pending){ toast("Sign-out isn't ready yet — try again in a moment"); return; }  /* S1/F3: cloud not yet established this launch (offline or still loading) — don't silently no-op */
    if(window.__mercsSync){ window.__mercsSync.signOutCloud(); return; }
  }
  ACCOUNT=null; try{localStorage.removeItem(SAVE_MODE);}catch(e){}
  updateAccountUI(); toast("Signed out — this session won't be saved");
}
function updateAccountUI(){
  const b=$("#acctBtn");
  if(b){
    b.classList.remove("in","dev");
    let lbl="Sign in", aria="Sign in to sync";
    if(ACCOUNT&&ACCOUNT.mode==='cloud'){ lbl=esc(String(ACCOUNT.name||ACCOUNT.email||"Account").split(" ")[0]); b.classList.add("in"); aria="Signed in as "+lbl; }
    else if(ACCOUNT&&ACCOUNT.mode==='device'){ lbl="Saved"; b.classList.add("dev"); aria="Saved on this device"; }
    b.innerHTML='<span class="sdot" aria-hidden="true"></span><span class="albl">'+lbl+'</span>';
    b.setAttribute("aria-label",aria);
  }
  const nl=document.querySelector('#navActs [data-act="account"] span:last-child');
  if(nl){ nl.textContent = (ACCOUNT&&ACCOUNT.mode==='cloud') ? String(ACCOUNT.name||"Account").split(" ")[0] : (ACCOUNT&&ACCOUNT.mode==='device') ? "Saved on device" : "Sign In"; }
}

/* ---------- toast (3000ms, one at a time) ---------- */
function toast(m){const t=$("#toast");t.textContent=m;t.classList.add("show");clearTimeout(t._t);t._t=setTimeout(()=>t.classList.remove("show"),3000);}

/* ---------- misc ---------- */
function cap(s){return String(s).replace(/\b\w/g,c=>c.toUpperCase()).replace(/\bMercs\b/i,"MERCS");}
function shuffle(a){for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}
function d10(){return 1+Math.floor(Math.random()*10);}
function extByFaction(f){return DATA.units.filter(u=>u.faction===f);}
function unitIndex(u){return DATA.units.indexOf(u);}
function factionOptions(sel){return FACTIONS_AZ.map(f=>`<option ${f===sel?"selected":""}>${esc(f)}</option>`).join("");}

/* ---------- loading spinner overlay (>200ms ops) ---------- */
let _spinT=null;
function spin(on){const s=$("#spinner");if(!s)return;
  if(on){_spinT=setTimeout(()=>s.classList.add("show"),200);}else{clearTimeout(_spinT);s.classList.remove("show");}}

/* ---------- programmatic scroll: .wrap (overflow-x:hidden) is the real scroll container, so
   window.scrollTo() is a silent no-op; route every programmatic scroll through the live scroller ---------- */
function pageScroller(){const w=document.querySelector(".wrap");
  return (w&&w.scrollHeight>w.clientHeight+1)?w:(document.scrollingElement||document.documentElement);}
function scrollTop0(){const s=pageScroller();if(s)s.scrollTop=0;}
/* ---------- stat heatmap (across whole game; respects betterWhen) ---------- */
const RANGE={};
STAT_ORDER.forEach(k=>{let mn=99,mx=-99;DATA.units.forEach(u=>{const v=u.stats[k];if(/^-?\d+$/.test(v)){const n=+v;if(n<mn)mn=n;if(n>mx)mx=n;}});RANGE[k]={mn,mx};});
function goodness(k,v){if(!/^-?\d+$/.test(v))return null;const{mn,mx}=RANGE[k];if(mx===mn)return .5;let g=(+v-mn)/(mx-mn);if(TERM[k].betterWhen==="lower")g=1-g;return g;}
function heatColor(g){if(g==null)return "var(--muted)";
  const a=g<.5?[[192,57,43],[184,134,11]]:[[184,134,11],[47,125,50]];
  const t=g<.5?g/.5:(g-.5)/.5;const c=a[0].map((x,i)=>Math.round(x+(a[1][i]-x)*t));
  return `rgb(${c[0]},${c[1]},${c[2]})`;}

/* ---------- popover (.pop/.popcard) ---------- */
function popOpen(html){$("#popcard").innerHTML='<button class="popx" aria-label="Close" onclick="popClose()">&#10005;</button>'+html;const p=$("#pop");p.classList.add("open");
  if(!p._pushed){try{history.pushState({pop:true},"","#card");}catch(e){}p._pushed=true;}}   /* U2: own history entry so Back dismisses the popover, not the tab/tool under it */
function popClose(){const p=$("#pop");p.classList.remove("open");
  if(p._pushed){p._pushed=false; if(location.hash==="#card"){try{history.replaceState({tab:CURRENT_TAB},"","#"+(CURRENT_TAB||"home"));}catch(e){}}}}
function statPop(k){const t=TERM[k];
  popOpen(`<h4>${tn(t.term)} <span class="muted small" translate="no">(${k})</span></h4><div>${esc(t.def)}</div>
    <span class="bw">${t.betterWhen==="lower"?"&#9660; Lower is better":"&#9650; Higher is better"}</span>
    <p class="small muted" style="margin-top:.7rem">${esc(DATA.successRule)}</p>`);}
window.statPop=statPop; window.popClose=popClose;
/* keyword / personal-ability popover (used inline).
   Lookup is NORMALIZED so every printed chip variant resolves (live digits → (#), bare digits,
   case, straight/curly apostrophes, card-printed typos) while the chip DISPLAY stays verbatim.
   Last resort: the unit's own KIT definitions (e.g. Force, defined only on cards). */
const KW_ALIAS={"target acqusition":"target acquisition"}; /* CCC Spotter card typo (OQ-021) — display stays verbatim */
function kwNorm(s){return String(s).replace(/[\u2018\u2019]/g,"'").replace(/\s+/g," ").trim().toLowerCase();}
let _KWMAP=null;
function kwMap(){if(_KWMAP)return _KWMAP;_KWMAP={};
  [DATA.keywords,DATA.personalAbilities].forEach(src=>Object.keys(src).forEach(k=>{const n=kwNorm(k);if(!(n in _KWMAP))_KWMAP[n]=src[k];}));
  return _KWMAP;}
function kwEntry(name,uIdx){
  const m=kwMap();let n=kwNorm(name);if(KW_ALIAS[n])n=KW_ALIAS[n];
  if(m[n])return m[n];
  const h=n.replace(/\((\d+)\)/,"(#)").replace(/ (\d+)$/," (#)");if(m[h])return m[h];
  const b=n.replace(/\s*\(\d+\)\s*/g," ").replace(/\s+/g," ").trim();if(m[b])return m[b];
  if(uIdx!=null&&DATA.units[uIdx]){const kit=DATA.units[uIdx].kit||[];
    const hit=kit.find(x=>{const kn=kwNorm(x.name);return kn===n||kn===b;});if(hit)return hit;}
  return null;}
/* split compound kw cells into the separate stacked keywords the card prints (audit-verified stacks:
   "Blind"+"Template", "Penetrate (2)"+"Sniper", "Melee (2)"+"Scramble", and all "A / B" cells) */
function kwFrags(k){k=String(k);
  if(/^blind template$/i.test(k.trim()))return["Blind","Template"];
  if(k.indexOf("/")>=0)return k.split("/").map(s=>s.trim()).filter(Boolean);
  const m=k.match(/^(.+?\(\d+\))\s+(\S.+)$/);if(m)return[m[1].trim(),m[2].trim()];
  return[k.trim()];}
function kwChips(kwArr,uIdx){
  return (kwArr||[]).reduce((a,k)=>a.concat(kwFrags(k)),[]).map(k=>kwEntry(k,uIdx)
    ?`<button class="kw" onclick="termPop('${esc(k).replace(/'/g,"\\'")}',${uIdx})" translate="no">${esc(k)}</button>`
    :`<span class="kw plain" translate="no">${esc(k)}</span>`).join("");}
function termPop(name,uIdx){
  const kw=kwEntry(name,uIdx);
  if(!kw){return;}
  popOpen(`<h4>${tn(kw.name)}</h4><div>${escText(kw.text)}</div>`);}
window.termPop=termPop;

/* ---------- one-time attention cue: only the FIRST manual rendered per session gets a gentle pulse ---------- */
let _manualCued=false;
function manualCue(){ if(_manualCued)return ""; _manualCued=true; return "cue"; }
/* ---------- per-tab Field Manual ---------- */
const MANUAL={
 home:{steps:["This is your <b>operations dashboard</b>. Move between sections using the <b>tab bar</b> below (on tablet &amp; desktop) or the <b>menu button (&#9776;)</b> at the top-right (on phones).",
   "Tap a <b>quick-entry card</b> to jump straight into a section.",
   "Open the seven battlefield <b translate='no'>Tools</b> (plus your Favorites) from the Tools button &mdash; in the header on tablet &amp; desktop, or inside the <b>&#9776; menu</b> on phones &mdash; they overlay any section.",
   "<b translate='no'>Search</b> is always in the header (top-right) &mdash; find any unit, card, mission, rule, or keyword instantly."],
   tip:"Sign in (optional) &mdash; in the header on tablet &amp; desktop, or inside the <b>&#9776; menu</b> on phones &mdash; to keep teams, trackers and favorites across sessions."},
 megacons:{steps:["Pick a <b>MegaCon</b> (faction) to see its roster in card order.",
   "Tap a unit to open its full Reference Card — the real card front and back, plus a structured breakdown.",
   "The eight <b>stats</b> are color-coded across the whole game; tap any tile for its meaning.",
   "Search within a faction with the box at the top of the roster."],
   tip:"Tap the &#9733; on a unit to add it to Favorites."},
 contingency:{steps:["Pick a <b>MegaCon</b> — its deck is the 19 shared cards plus its one faction-unique card.",
   "Each card shows its <b>OP</b> value, the verbatim reveal text, and the printed card image.",
   "To deal and manage a live hand, open the <b>Contingency Draw</b> tool."],
   tip:"Tap the &#9733; on a card to favorite it."},
 corp:{steps:["Pick a <b>MegaCon</b> to read its Corporate Traits.",
   "Each trait shows its name and verbatim rules text.",
   "Some MegaCons add a reference table — it is rendered in full below the traits.",
   "The printed Corporate card image is shown for each MegaCon."],
   tip:"Corporate Traits always apply — they are not optional."},
 operations:{steps:["Choose an <b>Operation</b> to read its full mission package.",
   "Review the briefing, mission parameters, area of operations, course of action and environmental analysis.",
   "<b>Secured Objectives</b> list every way to score OP for the mission.",
   "Open <b>Operation Setup</b> (Tools) to score objectives live during play."],
   tip:"Tap the &#9733; on a mission to favorite it. Maps are shown where the operation provides one."},
 rules:{steps:["Read the <b>core 2.5 ruleset</b> section by section.",
   "Switch to <b>Recon</b> for the add-on: FAQ, add-on rules and revised rules.",
   "Figure callouts describe the diagrams from the printed rulebook.",
   "Use Search to jump to a rule by keyword."],
   tip:"Long-form typography — settle in and read."},
 modifiers:{steps:["These are the three combat <b>modifier tables</b> from the rulebook.",
   "Apply the listed modifiers to the relevant Ranged or Melee Combat rolls.",
   "Asterisked notes are reproduced verbatim beneath each table."],
   tip:"Positional and Elevation modifiers can stack — read each table's notes."},
 keywords:{steps:["A searchable <b>glossary</b> of every Keyword and Personal Ability.",
   "Type in the box to filter; results stay alphabetized.",
   "Switch between <b translate='no'>Keywords</b> and <b>Personal Abilities</b> with the toggle.",
   "Keyword names also appear on unit weapons — tap them there to pop the definition."],
   tip:"37 Keywords and 60 Personal Abilities, transcribed verbatim."}
};
function manual(id){const m=MANUAL[id];if(!m)return "";
  return `<details class="manual ${manualCue()}"><summary><span class="mico">${ICO.book}</span>Field Manual — How to use this PAGE<span class="tw">&#9656;</span></summary>
    <div class="mbody"><ol>${m.steps.map(s=>`<li>${s}</li>`).join("")}</ol>${m.tip?`<div class="tip">&#9733; ${m.tip}</div>`:""}</div></details>`;}

/* ---------- per-tool mini-tutorials (same .manual style, collapsed by default) ---------- */
const TOOL_MANUAL={
 codex:{steps:[
   "Pick a <b>MegaCon</b> from the dropdown to list all of its units.",
   "Type in the <b>Search name</b> box to filter that faction's roster.",
   "Tap any unit to open its stat card — each value is <b>heat-coloured</b> against the whole game (it knows low CR/IT/AF are good).",
   "Tap a coloured stat to pop its meaning; open the <b>MegaCons</b> tab for the full card."],
   tip:"A fast way to compare a unit's strengths and weaknesses at a glance."},
 round:{steps:[
   "Choose a MegaCon and unit, then <b>+ Add</b> each model — add both sides to track the whole table.",
   "Tap <b>Roll initiative</b> to roll a d10 for every model; use <b>-/+</b> to apply the model's IM modifier (clamped to its IM).",
   "Activate top-down: the highest total leads (<b>Quick</b> breaks ties on the same step).",
   "Tap <b>Activate</b> as each model acts, then <b>Next round</b> to reset rolls for the new round.",
   "<b>Clear page</b> empties the tracker and returns to Round 1."],
   tip:"Initiative, IM modifiers and Quick tie-breaks are handled for you."},
 opsetup:{steps:[
   "Pick a mission to load its <b>Contingency hand size</b> and <b>Live Contingency Round</b>.",
   "Read the briefing, then tap an objective to tick it <b>Secured</b> — the OP tally updates live.",
   "Use <b>Clear ticks</b> to reset objectives for a new game.",
   "Tap <b>Deal this hand in Contingency Draw</b> to carry the hand size straight into that tool."],
   tip:"Your ticks for each operation are saved separately on this device."},
 draw:{steps:[
   "Choose a MegaCon — the deck is 19 shared cards plus that faction's 1 unique card.",
   "Set the <b>Hand</b> size (or it arrives pre-filled from Operation Setup), then <b>Shuffle &amp; deal</b>.",
   "Tap <b>Set as Live</b> on one card to mark your Live Contingency Card (it can't be discarded).",
   "<b>Discard</b> returns a card to the deck; <b>+ Draw one</b> takes the next card.",
   "<b>Clear page</b> resets the hand and any carried-over operation settings."],
   tip:"The Live Contingency Card is protected from discarding, by the rules."},
 damage:{steps:[
   "Add each MERCS by MegaCon and unit — its Blood (BL) and Armor (AF) are loaded automatically.",
   "Use <b>-/+</b> to track <b>Blood</b> pips; a model is KILLED when Blood reaches its BL.",
   "Tap <b>Roll armor check</b> to roll a d10 — equal or higher than AF holds, lower fails (<b>AF 0 always fails</b>).",
   "Toggle status chips (Pinned, Burning, Armor Broken…) to flag conditions.",
   "<b>Clear page</b> wipes the squad to start fresh."],
   tip:"Armor Failure is resolved exactly by the book, including the AF 0 auto-fail."},
 strike:{steps:[
   "Pick one <b>MegaCon</b> and a <b>team size</b> (3-5 members).",
   "Add units from that faction — duplicate <b>archetypes</b> are disabled, since they aren't legal.",
   "Watch the status line: it confirms a <b>Legal Strike Team</b> or flags what's wrong.",
   "Tap the remove button to drop a member, or <b>Clear team</b> to start over.",
   "Changing MegaCon resets the roster. (MERCS has no point system.)"],
   tip:"Legality — one MegaCon, no repeated archetype — is enforced as you build."},
 favorites:{steps:[
   "Star (&#9733;) any unit, contingency card or operation elsewhere in the app to collect it here.",
   "Items are grouped by type: Units, Contingency Cards and Operations.",
   "Tap a unit or operation to jump straight to its full record.",
   "Tap the remove button on any entry to take it off your favorites."],
   tip:"Favorites are saved on this device and survive between sessions when signed in."},
 compare:{steps:[
   "Pick a <b>MegaCon</b> and a unit, then tap <b>+ Add</b> — you can stack up to <b>three</b>, even across factions.",
   "The table puts the eight stats (IM, RE, CR, MP, BL, AV, AF, IT) down the side and your units across the top.",
   "Values are <b>heat-coloured</b> the same way as the Codex, and the best value in each row is <b>starred</b>.",
   "Below the stats you'll see each unit's <b>archetype</b> and full <b>weapon</b> list (B/S/M/L).",
   "Tap a unit's <b>\u00d7</b> to drop it, or <b>Clear all</b> to start over."],
   tip:"Best-per-stat already accounts for the stats where lower is better (CR, IT, AF)."}
};
function toolManual(id){const m=TOOL_MANUAL[id];if(!m)return "";
  return `<details class="manual ${manualCue()}"><summary><span class="mico">${ICO.book}</span>How to use this TOOL<span class="tw">&#9656;</span></summary>
    <div class="mbody"><ol>${m.steps.map(s=>`<li>${s}</li>`).join("")}</ol>${m.tip?`<div class="tip">&#9733; ${m.tip}</div>`:""}</div></details>`;}

/* ---------- license footer (reused on every panel) ---------- */
const LICENSE=`<footer class="src">MERCS&trade; &copy; Fifth Angel Studios — used under license. App by <a href="https://digirunestudios.com" target="_blank" rel="noopener" class="dr-link"><b>DigiRune Studios</b></a>.<br>All stats, cards &amp; rules transcribed verbatim from the MERCS 2.5 source.</footer>`;

/* ---------- inline SVG icons (hand-authored) ---------- */
const ICO={
 home:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><path d="M4 11l8-7 8 7"/><path d="M6 10v9h12v-9"/></svg>',
 book:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><path d="M4 5a2 2 0 0 1 2-2h12a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1H6a2 2 0 0 0-2 2z"/><path d="M8 7h7M8 10h7"/></svg>',
 mega:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><path d="M12 3l7 3v5c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6z"/></svg>',
 cont:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><rect x="3" y="6" width="12" height="15" rx="2"/><path d="M8 6V5a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2h-1"/></svg>',
 corp:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><path d="M3 21h18"/><path d="M5 21V8l7-4 7 4v13"/><path d="M9 21v-5h6v5"/></svg>',
 ops:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="3.5"/><path d="M12 1v3M12 20v3M1 12h3M20 12h3"/></svg>',
 rules:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><path d="M4 5a2 2 0 0 1 2-2h6v18H6a2 2 0 0 0-2 2z"/><path d="M20 5a2 2 0 0 0-2-2h-6v18h6a2 2 0 0 1 2 2z"/></svg>',
 mods:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M4 6h16M4 12h16M4 18h16"/><circle cx="9" cy="6" r="2" fill="currentColor"/><circle cx="15" cy="12" r="2" fill="currentColor"/><circle cx="8" cy="18" r="2" fill="currentColor"/></svg>',
 kw:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><path d="M20.6 8.6L15 3 4 14l5.6 5.6a2 2 0 0 0 2.8 0L20.6 11a1.7 1.7 0 0 0 0-2.4z"/><circle cx="14.5" cy="8.5" r="1.2" fill="currentColor"/></svg>',
 shield:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 3l7 3v5c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6z"/></svg>',
 bolt:'<svg viewBox="0 0 24 24" fill="currentColor"><path d="M13 2L4 14h6l-1 8 9-12h-6z"/></svg>',
 target:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="3.5"/><path d="M12 1v3M12 20v3M1 12h3M20 12h3"/></svg>',
 cards:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="6" width="12" height="15" rx="2"/><path d="M8 6V5a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2h-1"/></svg>',
 heart:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 20s-7-4.5-7-9.5A3.5 3.5 0 0 1 12 7a3.5 3.5 0 0 1 7 3.5C19 15.5 12 20 12 20z"/></svg>',
 squad:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><circle cx="9" cy="8" r="3"/><path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6"/><circle cx="17" cy="7" r="2.3"/><path d="M16 14c2.8 0 5 2.2 5 5"/></svg>',
 star:'<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l2.9 6.3 6.9.7-5.2 4.6 1.5 6.8L12 17.8 5.9 20.4l1.5-6.8L2.2 9l6.9-.7z"/></svg>',
 search:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/></svg>',
 compare:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><rect x="3" y="4" width="7" height="16" rx="1.5"/><rect x="14" y="4" width="7" height="16" rx="1.5"/><path d="M6.5 9h0M6.5 12h0M17.5 9h0M17.5 12h0"/></svg>',
 tools:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><path d="M14.7 6.3a4 4 0 0 1-5.4 5.4L4 17v3h3l5.3-5.3a4 4 0 0 1 5.4-5.4l-2.3 2.3-1.4-1.4z"/></svg>',
 globe:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.5 2.5 2.5 15.5 0 18M12 3c-2.5 2.5-2.5 15.5 0 18"/></svg>',
 cart:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><path d="M3 4h2l2.4 12.5a2 2 0 0 0 2 1.5h7.6a2 2 0 0 0 2-1.6L21 8H6"/><circle cx="10" cy="20" r="1.4"/><circle cx="18" cy="20" r="1.4"/></svg>'
};

/* ============================================================
   ROUTER — 7 content tabs as lazy-built panels
   ============================================================ */
const TABS=[
 {id:"home",t:"Home",ico:ICO.home},
 {id:"megacons",t:"MegaCons",ico:ICO.mega},
 {id:"contingency",t:"Contingency",ico:ICO.cont},
 {id:"corp",t:"Corporate",ico:ICO.corp},
 {id:"operations",t:"Operations",ico:ICO.ops},
 {id:"rules",t:"Rules",ico:ICO.rules},
 {id:"modifiers",t:"Modifiers",ico:ICO.mods},
 {id:"keywords",t:"Keywords",ico:ICO.kw}
];
const TAB_IDS=TABS.map(t=>t.id);
const built={};
let CURRENT_TAB=null;
function rebuildAll(){Object.keys(built).forEach(k=>{delete built[k];});TAB_IDS.forEach(id=>{const p=$("#panel-"+id);if(p)p.innerHTML="";});if(CURRENT_TAB)ensureBuilt(CURRENT_TAB);
  /* S3: an open Field Tool holds its own closure state; refresh it from the (possibly just-synced) SESSION so a remote update can't be clobbered by a stale tool save */
  try{ if(TOOL_CUR && $("#tools") && $("#tools").classList.contains("open") && typeof openTool==="function") openTool(TOOL_CUR); }catch(e){} }
/* A deep link changes the stored selection (faction, operation, rules mode) and then
   navigates. ensureBuilt() is a build-ONCE cache, so without this the target panel keeps
   whatever it rendered earlier and the linked record is not in the DOM to reveal or scroll
   to. Discard the panel first so navTo() rebuilds it against the new selection. */
function rebuildPanel(id){delete built[id];const p=$("#panel-"+id);if(p)p.innerHTML="";}
function ensureBuilt(id){if(built[id])return;const fn=builders[id];if(fn){spin(true);fn($("#panel-"+id));spin(false);built[id]=true;}}
function navTo(id,opts){opts=opts||{};
  if(!TAB_IDS.includes(id))id="home";
  CURRENT_TAB=id;
  ensureBuilt(id);
  TAB_IDS.forEach(t=>{const p=$("#panel-"+t);if(p)p.classList.toggle("active",t===id);});
  $$("#tabbar .tab").forEach(b=>b.classList.toggle("on",b.dataset.tab===id));
  if(!opts.fromPopstate){history.pushState({tab:id},"","#"+id);}
  scrollTop0();
}
window.navTo=navTo;
window.addEventListener("popstate",e=>{
  if($("#navMenu")&&$("#navMenu").classList.contains("open")){closeNav();return;}
  if($("#pop").classList.contains("open")){popClose();return;}   /* U1: popover is topmost (z-index 80) — dismiss it before tools/search */
  if($("#search").classList.contains("open")){closeSearch();return;}
  if($("#tools").classList.contains("open")){closeTools();return;}
  const id=(location.hash||"#home").slice(1);navTo(id,{fromPopstate:true});
});

/* ============================================================
   BUILDERS
   ============================================================ */
const builders={};

/* ---- shared: favorites store ---- */
function favs(){const f=Store.get("favs",null)||{};const arr=k=>Array.isArray(f[k])?f[k]:[];
  /* legacy blobs stored a bare faction for contingency (pre-2026-07-28 key bug); an entry with
     no "|" can never resolve to a card, so drop it rather than let it ghost forever. */
  return{units:arr("units"),contingency:arr("contingency").filter(x=>String(x).indexOf("|")>0),operations:arr("operations")};}
function isFav(kind,key){return favs()[kind].includes(key);}
function toggleFav(kind,key,label){const f=favs();const arr=f[kind];const i=arr.indexOf(key);
  if(i>=0){arr.splice(i,1);toast("Removed from Favorites");}else{arr.push(key);toast((label||"Added")+" — favorited");}
  Store.set("favs",f);
  syncStars();
}
function starBtn(kind,key,label){const on=isFav(kind,key);
  return `<button class="star ${on?'on':''}" data-fav="${kind}|${esc(key)}" data-lbl="${esc(label||'')}" aria-label="Favorite" title="Favorite">${ICO.star}</button>`;}
/* role="button" list rows are DIVs (a <button> may not nest a <button> - the parser
   closes the outer one, which used to drop the star and chevron below the row).
   Divs are not natively keyboard-activatable, so Enter/Space are wired here. */
document.addEventListener("keydown",function(e){
  if(e.key!=="Enter"&&e.key!==" ")return;
  var t=e.target;
  if(t&&t.classList&&t.classList.contains("item")&&t.getAttribute("role")==="button"){e.preventDefault();t.click();}
});
function favParts(v){const s=String(v),i=s.indexOf("|");return i<0?[s,""]:[s.slice(0,i),s.slice(i+1)];}
/* Re-sync EVERY rendered star from the store. Stars for one record can exist in several
   places at once (list row, open detail card, Favorites tool) and on panels that are cached
   and will not rebuild, so toggling only the tapped element left the others lying. */
function syncStars(){$$("[data-fav]").forEach(b=>{const[k,key]=favParts(b.dataset.fav);b.classList.toggle("on",isFav(k,key));});}
function wireStars(root){$$("[data-fav]",root).forEach(b=>b.onclick=ev=>{ev.stopPropagation();
  const[kind,key]=favParts(b.dataset.fav);toggleFav(kind,key,b.dataset.lbl);});}

/* ===================== HOME ===================== */
builders.home=function(p){
  const quick=[
   {id:"megacons",t:"MegaCons",d:"12 factions, 123 units. Full reference cards.",ico:ICO.mega},
   {id:"contingency",t:"Contingency",d:"Every faction deck, card by card.",ico:ICO.cont},
   {id:"corp",t:"Corporate Traits",d:"Faction-wide rules & tables.",ico:ICO.corp},
   {id:"operations",t:"Operations",d:"10 missions with full briefings.",ico:ICO.ops},
   {id:"rules",t:"Rules",d:"The 2.5 ruleset + Recon add-on.",ico:ICO.rules},
   {id:"keywords",t:"Keywords",d:"Glossary of keywords & abilities.",ico:ICO.kw}
  ];
  const tools=[
   {id:"codex",t:"Codex",ico:ICO.shield},{id:"round",t:"Round Tracker",ico:ICO.bolt},
   {id:"opsetup",t:"Operation Setup",ico:ICO.target},{id:"draw",t:"Contingency Draw",ico:ICO.cards},
   {id:"damage",t:"Damage & Armor",ico:ICO.heart},{id:"strike",t:"Strike Team",ico:ICO.squad}
  ];
  p.innerHTML=`
   <div class="splash hero">
     <img class="logo" src="assets/logo_white.png" alt="MERCS" id="splashLogo">
     <div class="cause">Welcome to the <b>cause</b>.</div>
     <div class="kick">Companion</div>
     <div class="herotag" translate="no">Official Field Companion</div>
   </div>
   <div class="homewrap">
     <p class="vsub" style="text-align:center;margin:.9rem 0 .2rem">Your complete tactical reference for MERCS 2.5 — every unit, card, mission and rule, plus seven battlefield tools and your Favorites.</p>
     ${manual("home")}
     <h2 class="vh" style="margin-top:.6rem">Sections</h2>
     <div class="qtiles">${quick.map(q=>`<button class="tile" data-go="${q.id}"><span class="edge"></span><span class="ico">${q.ico}</span><h3 translate="no">${esc(q.t)}</h3><p>${esc(q.d)}</p><span class="go">Open &#8250;</span></button>`).join("")}</div>
     <h2 class="vh">Field Tools</h2>
     <div class="toolgrid">${tools.map(t=>`<button class="toolq" data-tool="${t.id}"><span class="ico">${t.ico}</span><span>${esc(t.t)}</span></button>`).join("")}</div>
     <div class="shoprow"><button class="btn shopbtn" id="homeShop"><span class="ico" style="width:20px;height:20px;display:inline-block;vertical-align:-4px">${ICO.cart}</span> Shop MERCS</button>
       <button class="btn ghost" id="homeAbout">About &amp; Privacy</button></div>
   </div>
   ${LICENSE}`;
  $$("[data-go]",p).forEach(b=>b.onclick=()=>navTo(b.dataset.go));
  $$("[data-tool]",p).forEach(b=>b.onclick=()=>openTool(b.dataset.tool));
  $("#homeShop",p).onclick=shopMercs;
  $("#homeAbout",p).onclick=openAbout;
  // shimmer once
  const lg=$("#splashLogo",p);if(lg){lg.classList.add("shimmer");setTimeout(()=>lg.classList.remove("shimmer"),1600);}
};

/* ===================== MEGACONS ===================== */
function unitListItem(u){const i=unitIndex(u);
  return `<div class="item unititem" role="button" tabindex="0" data-unit="${i}">
    <img class="thumb" loading="lazy" src="${esc(u.imgFront)}" alt="">
    <span class="grow"><span class="nm" translate="no">${esc(cap(u.name))}</span>
      <span class="meta"><span translate="no">${esc(u.archetype)}</span> &middot; BL ${esc(u.stats.BL)} &middot; AF ${esc(u.stats.AF)}</span></span>
    ${u.hasQuick?'<span class="chip q">Quick</span>':''}${u.deployable?'<span class="chip dep">Deploy</span>':''}
    ${starBtn("units",u.id,cap(u.name))}<span class="ar">&#8250;</span></div>`;}

builders.megacons=function(p){
  const fac=Store.get("megFac",FACTIONS_AZ[0]);
  p.innerHTML=`<h2 class="vh">MegaCons</h2><p class="vsub">12 factions, 123 units. Tap a unit for its full Reference Card.</p>
   ${manual("megacons")}
   <div class="row"><label class="small muted" translate="no">MegaCon</label><select id="megFac" translate="no">${factionOptions(fac)}</select>
     <input id="megSearch" type="search" placeholder="Search this faction…" style="flex:1;min-width:120px"></div>
   <div id="megList" class="list"></div>
   <div id="megDetail"></div>${LICENSE}`;
  const draw=()=>{const f=$("#megFac",p).value;Store.set("megFac",f);const q=$("#megSearch",p).value.trim().toLowerCase();
    const list=extByFaction(f).filter(u=>!q||u.name.toLowerCase().includes(q)||u.archetype.toLowerCase().includes(q));
    $("#megList",p).innerHTML=list.map(unitListItem).join("")||`<div class="empty">No units match.</div>`;
    $$("#megList .unititem",p).forEach(b=>b.onclick=()=>showUnit(+b.dataset.unit));
    wireStars($("#megList",p));
    $("#megDetail",p).innerHTML="";$("#megList",p).style.display="";};
  $("#megFac",p).onchange=draw;$("#megSearch",p).oninput=draw;draw();
};

function showUnit(i){const u=DATA.units[i];
  const stats=STAT_ORDER.map(k=>{const v=u.stats[k];const g=goodness(k,v);const col=heatColor(g);const w=g==null?0:Math.round(g*100);
    return `<button class="stat" onclick="statPop('${k}')"><div class="k" translate="no">${k}</div><div class="v" translate="no" style="color:${col}">${esc(v)}</div>
      <div class="bar"><i style="width:${w}%;background:${col}"></i></div></button>`;}).join("");
  const weapons=u.weapons.length?`<h4 class="usec">Weapons</h4><table class="wtable"><tr><th>Weapon</th><th>B</th><th>S</th><th>M</th><th>L</th><th>Keywords</th></tr>
    ${u.weapons.map(w=>`<tr><td class="wn" translate="no">${esc(w.name)}</td><td translate="no">${esc(w.bands.B||'–')}</td><td translate="no">${esc(w.bands.S||'–')}</td><td translate="no">${esc(w.bands.M||'–')}</td><td translate="no">${esc(w.bands.L||'–')}</td>
      <td>${kwChips(w.kw,i)||'<span class="muted">–</span>'}</td></tr>`).join("")}</table>`:"";
  const abil=u.abilities.length?`<h4 class="usec">Personal Abilities</h4><ul class="ablist">${u.abilities.map(a=>{const m=a.match(/^(.+?):\s*([\s\S]*)$/);return m?`<li><b translate="no">${esc(m[1])}</b>: ${esc(m[2])}</li>`:`<li>${esc(a)}</li>`;}).join("")}</ul>`:"";
  const kit=(u.kit&&u.kit.length)?`<h4 class="usec">Kit &amp; Keywords</h4><ul class="ablist">${u.kit.map(k=>`<li><b translate="no">${esc(k.name)}</b>: ${esc(k.text)}</li>`).join("")}</ul>`:"";
  const d=$("#megDetail");
  d.innerHTML=`<button class="rback" onclick="megBack()" style="margin:.1rem 0 .7rem">&#8249; Back</button><div class="unitcard" id="rec-unit-${esc(u.id)}"><div class="uhead"><span class="fac" translate="no">${esc(u.faction)}</span>
      <span class="chip" translate="no">${esc(u.archetype)}</span>
      ${u.hasQuick?'<span class="chip q">Quick</span>':''}${u.deployable?'<span class="chip dep">Deployable</span>':''}
      <span class="grow"></span>${starBtn("units",u.id,cap(u.name))}<button class="ucls" aria-label="Close card" title="Close" onclick="megBack()">&#10005;</button></div>
    <div class="cardimgs">
      <figure class="cardfig"><img loading="eager" src="${esc(u.imgFront)}" alt="${esc(cap(u.name))} card front"><figcaption>Front</figcaption></figure>
      <figure class="cardfig"><img loading="eager" src="${esc(u.imgBack)}" alt="${esc(cap(u.name))} card back"><figcaption>Back</figcaption></figure>
    </div>
    <div class="stats">${stats}</div>
    ${u.deployable?'<div class="rule"><span>Deployable — stats shown as <b translate="no">X</b> are not used (it does not roll initiative or take normal damage).</span></div>':''}
    ${weapons}${abil}${kit}
    <div class="divider"></div><div class="small muted">Tap a stat for its meaning; tap a keyword for its rule. Tap a card image to view full size.</div></div>`;
  wireStars(d);
  const _uh=d.querySelector(".uhead");if(_uh)_uh.onclick=megHeadClose;
  $$(".cardfig img",d).forEach(img=>img.onclick=()=>lightbox(img.src,img.alt));
  var _ml=$("#megList"); if(_ml) _ml.style.display="none";
  // Land with the TOP of the card just under the sticky header — not the page heading, not mid-card.
  const landTop=()=>{const hdr=document.querySelector("header.bar");const s=pageScroller();
    const hb=hdr?hdr.getBoundingClientRect().bottom:0;
    s.scrollTop=Math.max(0,s.scrollTop+d.getBoundingClientRect().top-hb-4);};
  landTop();requestAnimationFrame(landTop);
  // Re-assert once each card image has loaded so async image growth cannot shift the view mid-card.
  $$(".cardimgs img",d).forEach(img=>{if(!img.complete)img.addEventListener("load",landTop,{once:true});});
}
window.showUnit=showUnit;
function megBack(){const d=$("#megDetail");if(d)d.innerHTML="";const ml=$("#megList");if(ml)ml.style.display="";scrollTop0();}
window.megBack=megBack;
function megHeadClose(ev){if(ev.target.closest&&(ev.target.closest(".star")||ev.target.closest(".kw")||ev.target.closest(".stat")||ev.target.closest(".ucls")))return;megBack();}
window.megHeadClose=megHeadClose;

/* image lightbox */
function lightbox(src,alt){popOpen(`<div class="lb"><img src="${esc(src)}" alt="${esc(alt||'')}"><button class="btn ghost sm" style="margin-top:.7rem" onclick="popClose()">Close</button></div>`);}
window.lightbox=lightbox;

/* ===================== CONTINGENCY (browse by faction) ===================== */
function uniqueFor(fac){return DATA.contingency.unique[SLUG(fac)];}
function contCardsFor(fac){const u=uniqueFor(fac);return [...DATA.contingency.core,...(u?[u]:[])];}
builders.contingency=function(p){
  const fac=Store.get("contBrowseFac",FACTIONS_AZ[0]);
  p.innerHTML=`<h2 class="vh">Contingency</h2><p class="vsub">Each MegaCon deck = 19 shared cards + 1 faction-unique card. Tap a card to reveal it.</p>
   ${manual("contingency")}
   <div class="row"><label class="small muted" translate="no">MegaCon</label><select id="contFac" translate="no">${factionOptions(fac)}</select>
     <input id="contSearch" type="search" placeholder="Search cards…" style="flex:1;min-width:120px">
     <button class="btn ghost sm" id="contToDraw">Deal a hand &#8250;</button></div>
   <div id="contList" class="list"></div>${LICENSE}`;
  const reveal=(c,row)=>{const open=row.classList.contains("open");
    // close any other open reveal
    $$("#contList .contreveal",p).forEach(r=>r.remove());
    $$("#contList .controw.open",p).forEach(r=>r.classList.remove("open"));
    if(open)return; // tapping the open row again collapses it
    row.classList.add("open");
    const uflag=!c.n;
    const rv=el("div","contreveal");
    rv.innerHTML=`<button class="rback" data-revback style="margin-bottom:.55rem">&#8249; Back</button><div class="ccard reveal">
        <img class="cimg" loading="lazy" src="${esc(c.img)}" alt="${esc(c.title)}" onclick="lightbox('${esc(c.img).replace(/'/g,"\\'")}','${esc(c.title).replace(/'/g,"\\'")}')">
        <div class="cbody"><div class="row" style="justify-content:space-between;align-items:flex-start;gap:.4rem">
            <span class="ct" translate="no">${esc(c.title)}</span><span class="cop">${esc(c.op)}</span></div>
          ${uflag?'<span class="chip dep" style="margin:.2rem 0">Faction-Unique</span>':''}
          <div class="cx">${esc(c.text)}</div></div></div>`;
    row.after(rv);
    const _rb=rv.querySelector("[data-revback]");if(_rb)_rb.onclick=()=>{rv.remove();row.classList.remove("open");row.scrollIntoView({behavior:"smooth",block:"nearest"});};
    rv.querySelector(".ccard").scrollIntoView({behavior:"smooth",block:"nearest"});};
  const draw=()=>{const f=$("#contFac",p).value;Store.set("contBrowseFac",f);const q=$("#contSearch",p).value.trim().toLowerCase();
    const cards=contCardsFor(f).filter(c=>!q||c.title.toLowerCase().includes(q)||c.text.toLowerCase().includes(q));
    $("#contList",p).innerHTML=cards.map(c=>{const fk=f+"|"+c.title;const uflag=!c.n;
      return `<div class="controw" id="rec-cont-${SLUG(c.title)}" data-rev tabindex="0" role="button" aria-label="Reveal ${esc(c.title)}">
        <img class="thumb" loading="lazy" src="${esc(c.img)}" alt="">
        <span class="grow"><span class="nm" translate="no">${esc(c.title)}</span>
          <span class="meta">${esc(c.op)}${uflag?' &middot; <span class="ctag">Faction</span>':''}</span></span>
        ${starBtn("contingency",fk,c.title)}<span class="ar">&#8250;</span></div>`;}).join("")||`<div class="empty">No cards match.</div>`;
    const lookup={};cards.forEach(c=>{lookup[SLUG(c.title)]=c;});
    $$("#contList .controw",p).forEach(row=>{
      const c=lookup[row.id.replace("rec-cont-","")];
      const fire=ev=>{if(ev.target.closest(".star"))return;reveal(c,row);};
      row.onclick=fire;
      row.addEventListener("keydown",ev=>{if(ev.key==="Enter"||ev.key===" "){ev.preventDefault();reveal(c,row);}});
    });
    wireStars($("#contList",p));};
  // expose reveal-by-slug for deep links / search
  p._contReveal=slug=>{const row=$("#rec-cont-"+slug,p);if(row&&!row.classList.contains("open"))row.click();};
  $("#contFac",p).onchange=draw;$("#contSearch",p).oninput=draw;
  $("#contToDraw",p).onclick=()=>{Store.set("drawFac",$("#contFac",p).value);openTool("draw");};
  draw();
};

/* ===================== CORPORATE TRAITS ===================== */
function tableHTML(t){if(!t)return "";
  return `<div class="tblwrap"><table class="dtable">${t.title?`<caption translate="no">${esc(t.title)}</caption>`:""}
    <tr>${(t.columns||[]).map(c=>`<th>${esc(c)}</th>`).join("")}</tr>
    ${(t.rows||[]).map(r=>`<tr>${r.map(cell=>`<td>${mdInline(cell)}</td>`).join("")}</tr>`).join("")}</table></div>`;}
/* light markdown: **bold** and *italic* inline, escape rest */
function mdInline(s){return esc(s).replace(/\*\*([^*]+)\*\*/g,"<b>$1</b>").replace(/\*([^*]+)\*/g,"<i>$1</i>");}
builders.corp=function(p){
  const fac=Store.get("corpFac",FACTIONS_AZ[0]);
  p.innerHTML=`<h2 class="vh">Corporate Traits</h2><p class="vsub">Faction-wide rules that always apply to every member of the MegaCon.</p>
   ${manual("corp")}
   <div class="row"><label class="small muted" translate="no">MegaCon</label><select id="corpFac" translate="no">${factionOptions(fac)}</select></div>
   <div id="corpBody"></div>${LICENSE}`;
  const draw=()=>{const f=$("#corpFac",p).value;Store.set("corpFac",f);const c=DATA.corporateTraits[SLUG(f)];
    if(!c){$("#corpBody",p).innerHTML=`<div class="empty">No corporate traits on file.</div>`;return;}
    const traits=c.traits.map(t=>`<div class="traitcard"><h4 translate="no">${esc(t.name)}</h4>${escProse(t.text)}</div>`).join("");
    const tables=(c.tables||[]).map(tableHTML).join("");
    $("#corpBody",p).innerHTML=`<div class="corphead" id="rec-corp-${SLUG(f)}"><span class="fac" translate="no">${esc(f)}</span></div>
      ${c.img?`<figure class="cardfig wide"><img loading="lazy" src="${esc(c.img)}" alt="${esc(f)} corporate card" onclick="lightbox('${esc(c.img).replace(/'/g,"\\'")}','${esc(f)} corporate card')"><figcaption>Corporate Card</figcaption></figure>`:""}
      ${traits}${tables}`;};
  $("#corpFac",p).onchange=draw;draw();
};

/* ===================== OPERATIONS ===================== */
function mpBlock(mp){
  const parts=[];
  if(mp.priorityInformation)parts.push(mdBlock(mp.priorityInformation));
  if(mp.hvtl)parts.push(mdBlock(mp.hvtl));
  if(mp.contingency)parts.push(mdBlock(mp.contingency));
  return parts.join("");
}
/* render simple markdown-ish bullet/indent blocks (the data uses "- " and "  - " and **bold**) */
function mdBlock(s){
  const lines=String(s).split("\n");
  let html="",stack=0;
  const out=[];
  lines.forEach(line=>{
    const m=line.match(/^(\s*)-\s+(.*)$/);
    if(m){const depth=Math.floor(m[1].length/2);out.push({depth,text:m[2]});}
    else if(line.trim()){out.push({depth:0,text:line.trim(),plain:true});}
  });
  // build nested lists
  let cur=0; let res="";
  const open=[]; 
  out.forEach(o=>{
    if(o.plain){while(open.length){res+="</ul>";open.pop();}res+=`<p>${mdInline(o.text)}</p>`;return;}
    while(open.length>o.depth+1){res+="</ul>";open.pop();}
    while(open.length<o.depth+1){res+="<ul class='mlist'>";open.push(1);}
    res+=`<li>${mdInline(o.text)}</li>`;
  });
  while(open.length){res+="</ul>";open.pop();}
  return res;
}
builders.operations=function(p){
  const idx=Store.get("opBrowseIdx",0);
  p.innerHTML=`<h2 class="vh">Operations</h2><p class="vsub">Ten missions with full briefings, parameters and objectives.</p>
   ${manual("operations")}
   <div class="row"><label class="small muted" translate="no">Operation</label><select id="opTabSel">${DATA.operations.map((o,i)=>`<option value="${i}" ${i===idx?'selected':''} translate="no">${esc(o.title)}</option>`).join("")}</select></div>
   <div id="opTabBody"></div>${LICENSE}`;
  const draw=()=>{const o=DATA.operations[+$("#opTabSel",p).value];Store.set("opBrowseIdx",+$("#opTabSel",p).value);
    const objs=o.securedObjectives.map(s=>`<div class="obj static"><div class="grow">${esc(s.desc)}</div><div class="op">${esc(s.op)}</div></div>`).join("");
    $("#opTabBody",p).innerHTML=`
      <div class="opcard" id="rec-op-${esc(o.id)}">
        <div class="uhead"><h3 translate="no">${esc(o.title)}</h3><span class="grow"></span>${starBtn("operations",o.id,o.title)}</div>
        ${o.map?`<figure class="cardfig wide"><img loading="lazy" src="${esc(o.map)}" alt="${esc(o.title)} map" onclick="lightbox('${esc(o.map).replace(/'/g,"\\'")}','${esc(o.title)} map')"><figcaption>Mission Map</figcaption></figure>`:''}
        <h4 class="usec">Briefing</h4>${escProse(o.briefing)}
        <h4 class="usec">Mission Parameters</h4><div class="mdblock">${mpBlock(o.missionParameters)}</div>
        <h4 class="usec">Area of Operations</h4>${escProse(o.areaOfOperations)}
        <h4 class="usec">Course of Action</h4>${escProse(o.courseOfAction)}
        <h4 class="usec">Environmental Analysis</h4><div class="mdblock">${mdBlock(o.environmentalAnalysis)}</div>
        <h4 class="usec">Secured Objectives</h4><div class="list objlist">${objs}</div>
        <div class="row" style="margin-top:.8rem"><button class="btn ghost sm" id="opToSetup">Open in Operation Setup &#8250;</button></div>
      </div>`;
    wireStars($("#opTabBody",p));
    $("#opToSetup",p).onclick=()=>{Store.set("opSetupIdx",+$("#opTabSel",p).value);openTool("opsetup");};};
  $("#opTabSel",p).onchange=draw;draw();
};

/* ===================== RULES (core + recon) — book-like, one section at a time ===================== */
/* render-time gibberish cleanup: strip U+FFFD replacement chars and dot-leader runs.
   Data stays as-is; this only affects what is displayed. */
function cleanRuleText(t){
  return String(t==null?"":t)
    .replace(/�/g,"")          // strip � replacement characters
    .replace(/\.{4,}/g," ")          // collapse dot-leader runs (e.g. ".....")
    .replace(/[ \t]{2,}/g," ");      // tidy any double spaces left behind
}
/* Convert body text into HTML: detect [FIGURE ...] / [FIGURES ...] bracket blocks
   and render them as FIGURE callout boxes (no raw brackets leak). Gibberish cleaned. */
function renderRuleBody(body){
  const parts=cleanRuleText(body).split(/(\[FIGURES?[^\]]*\])/g);
  return parts.map(seg=>{
    const fm=seg.match(/^\[FIGURES?\s*[-–:]?\s*([\s\S]*)\]$/);
    if(fm){return `<div class="figbox"><span class="figlbl">Figure</span><span class="figtxt">${esc(fm[1].trim())}</span></div>`;}
    if(!seg.trim())return "";
    return ruleProse(seg);
  }).join("");
}
function ruleFigs(s){
  if(!s.figures||!s.figures.length)return "";
  return s.figures.map(f=>{
    const cap=f.caption?cleanRuleText(f.caption).replace(/^\[FIGURES?\s*[-–:]?\s*/,"").replace(/\]$/,"").trim():"";
    const img=f.img?`<img loading="lazy" src="${esc(f.img)}" alt="">`:"";
    return `<div class="figbox">${img}<span class="figlbl">Figure</span><span class="figtxt">${esc(cap)}</span></div>`;
  }).join("");
}
/* full body of a core section (heading is rendered by the single-section view) */
function coreSectionBody(s){
  const tbls=(s.tables&&s.tables.length)?s.tables.map(tableHTML).join(""):"";
  return `${renderRuleBody(s.body)}${ruleFigs(s)}${tbls}`;
}
/* the readable core sections for the contents index (exclude Cover + the raw Table of Contents) */
function coreRuleEntries(){
  return DATA.rules.core.sections
    .map((s,i)=>({s,i}))
    .filter(({s})=>s.title&&!/^Cover$/i.test(s.title)&&!/^Table of Contents$/i.test(s.title))
    .map(({s,i})=>({slug:SLUG(s.title),title:s.title,si:i,
      html:`<article class="rulesec" id="rec-rule-${SLUG(s.title)}">${coreSectionBody(s)}</article>`}));
}
/* recon contents entries: FAQ (grouped), each Add-On rule, each Rules-Revised entry */
function reconRuleEntries(){
  const r=DATA.rules.recon,out=[];
  out.push({slug:"recon-faq",title:"Frequently Asked Questions",
    html:`<div class="rulesec" id="rec-rule-recon-faq">${r.faq.map(x=>`<div class="faq"><div class="q">${esc(cleanRuleText(x.q))}</div><div class="a">${escText(cleanRuleText(x.a))}</div></div>`).join("")}</div>`});
  r.addOns.forEach(x=>out.push({slug:"recon-add-"+SLUG(x.title),title:x.title,
    html:`<article class="rulesec" id="rec-rule-recon-add-${SLUG(x.title)}">${renderRuleBody(x.body)}</article>`}));
  r.rulesRevised.forEach(x=>out.push({slug:"recon-rev-"+SLUG(x.title),title:x.title,
    html:`<article class="rulesec" id="rec-rule-recon-rev-${SLUG(x.title)}">${renderRuleBody(x.body)}</article>`}));
  return out;
}
builders.rules=function(p){
  const mode=Store.get("rulesMode","core");
  p.innerHTML=`<h2 class="vh">Rules</h2><p class="vsub">The MERCS 2.5 ruleset, transcribed verbatim — plus the Recon add-on. Pick a section to read it on its own.</p>
   ${manual("rules")}
   <div class="seg" id="rulesSeg">
     <button class="segb ${mode==='core'?'on':''}" data-m="core">Core 2.5</button>
     <button class="segb ${mode==='recon'?'on':''}" data-m="recon">Recon Add-On</button>
   </div>
   <div id="rulesBody"></div>${LICENSE}`;
  let CUR_MODE=mode;
  const entriesFor=m=>m==="recon"?reconRuleEntries():coreRuleEntries();
  const intro=m=>m==="recon"
    ? `<div class="rule"><span>The <b>Recon</b> add-on covers the cooperative infiltration variant. These notes supplement the core ruleset.</span></div>`
    : "";
  function showContents(){
    const ents=entriesFor(CUR_MODE);
    $("#rulesBody",p).innerHTML=`<div class="ruleflow">${intro(CUR_MODE)}
      <div class="rtoc-h">Contents</div>
      <ol class="rtoc">${ents.map((e,i)=>`<li><button class="rtoc-i" data-i="${i}"><span class="rtoc-n">${i+1}</span><span class="rtoc-t" translate="no">${esc(e.title)}</span><span class="rtoc-ar">&#8250;</span></button></li>`).join("")}</ol></div>`;
    $$("#rulesBody .rtoc-i",p).forEach(b=>b.onclick=()=>showSection(+b.dataset.i));
    scrollTop0();
  }
  function showSection(i){
    const ents=entriesFor(CUR_MODE);
    if(i<0||i>=ents.length)return;
    const e=ents[i],prev=ents[i-1],next=ents[i+1];
    $("#rulesBody",p).innerHTML=`<div class="ruleflow rulebook">
      <button class="rback" id="rBack">&#8249; Back</button>
      <div class="rsec-meta">Section ${i+1} of ${ents.length}</div>
      <h3 class="rsh rsh-big" translate="no">${esc(e.title)}</h3>
      ${e.html}
      <nav class="rnav">
        <button class="btn ghost sm rnav-p" id="rPrev" ${prev?"":"disabled"}>${prev?'&#8249; '+esc(prev.title):'&#8249; Prev'}</button>
        <button class="btn ghost sm rnav-n" id="rNext" ${next?"":"disabled"}>${next?esc(next.title)+' &#8250;':'Next &#8250;'}</button>
      </nav></div>`;
    $("#rBack",p).onclick=showContents;
    const pb=$("#rPrev",p);if(pb&&prev)pb.onclick=()=>showSection(i-1);
    const nb=$("#rNext",p);if(nb&&next)nb.onclick=()=>showSection(i+1);
    scrollTop0();
  }
  // expose deep-link opener: open a section directly by its slug (search → a rules section)
  p._ruleOpen=(m,slug)=>{
    CUR_MODE=m||"core";Store.set("rulesMode",CUR_MODE);
    $$("#rulesSeg .segb",p).forEach(b=>b.classList.toggle("on",b.dataset.m===CUR_MODE));
    const ents=entriesFor(CUR_MODE);
    const i=ents.findIndex(e=>e.slug===slug);
    if(i>=0)showSection(i);else showContents();
  };
  const apply=m=>{CUR_MODE=m;Store.set("rulesMode",m);$$("#rulesSeg .segb",p).forEach(b=>b.classList.toggle("on",b.dataset.m===m));showContents();};
  $$("#rulesSeg .segb",p).forEach(b=>b.onclick=()=>apply(b.dataset.m));
  apply(mode);
};

/* ===================== MODIFIERS ===================== */
builders.modifiers=function(p){
  p.innerHTML=`<h2 class="vh">Modifiers</h2><p class="vsub">The three combat modifier tables from the rulebook.</p>
   ${manual("modifiers")}
   ${DATA.modifiers.map(m=>`<div class="modcard" id="rec-mod-${SLUG(m.title)}"><h3 class="rsh" translate="no">${esc(m.title)}</h3>${tableHTML(m)}${m.notes?`<div class="modnotes">${escText(m.notes)}</div>`:""}</div>`).join("")}
   ${LICENSE}`;
};

/* ===================== KEYWORDS / PERSONAL ABILITIES ===================== */
builders.keywords=function(p){
  const mode=Store.get("kwMode","keywords");
  p.innerHTML=`<h2 class="vh">Keywords</h2><p class="vsub">Searchable glossary of every Keyword and Personal Ability.</p>
   ${manual("keywords")}
   <div class="seg" id="kwSeg">
     <button class="segb ${mode==='keywords'?'on':''}" data-m="keywords">Keywords (${Object.keys(DATA.keywords).length})</button>
     <button class="segb ${mode==='pa'?'on':''}" data-m="pa">Personal Abilities (${Object.keys(DATA.personalAbilities).length})</button>
   </div>
   <input id="kwSearch" type="search" placeholder="Filter…" style="width:100%;margin-top:.6rem">
   <div id="kwBody" class="glosslist"></div>${LICENSE}`;
  const draw=()=>{const m=Store.get("kwMode","keywords");const src=m==="pa"?DATA.personalAbilities:DATA.keywords;const pfx=m==="pa"?"rec-pa-":"rec-kw-";
    const q=$("#kwSearch",p).value.trim().toLowerCase();
    const entries=Object.values(src).filter(x=>!q||x.name.toLowerCase().includes(q)||x.text.toLowerCase().includes(q))
      .sort((a,b)=>a.name.localeCompare(b.name));
    $("#kwBody",p).innerHTML=entries.map(x=>`<div class="glo" id="${pfx}${SLUG(x.name)}"><div class="gn" translate="no">${esc(x.name)}</div><div class="gt">${escText(x.text)}</div></div>`).join("")||`<div class="empty">No entries match.</div>`;};
  const apply=m=>{Store.set("kwMode",m);$$("#kwSeg .segb",p).forEach(b=>b.classList.toggle("on",b.dataset.m===m));draw();};
  $$("#kwSeg .segb",p).forEach(b=>b.onclick=()=>apply(b.dataset.m));
  $("#kwSearch",p).oninput=draw;
  apply(mode);
};

/* ============================================================
   TOOLS — modal overlays over any tab
   ============================================================ */
const TOOLDEFS=[
 {id:"codex",t:"MERCS Codex",ico:ICO.shield,d:"Stat heatmap for every unit"},
 {id:"round",t:"Round Tracker",ico:ICO.bolt,d:"Initiative & activation order"},
 {id:"opsetup",t:"Operation Setup",ico:ICO.target,d:"Mission params & live scoring"},
 {id:"draw",t:"Contingency Draw",ico:ICO.cards,d:"Deal & manage a faction hand"},
 {id:"damage",t:"Damage & Armor",ico:ICO.heart,d:"Blood pips & armor checks"},
 {id:"strike",t:"Strike Team Builder",ico:ICO.squad,d:"Build a legal 5-member team"},
 {id:"favorites",t:"Favorites",ico:ICO.star,d:"Your starred units, cards & ops"},
 {id:"compare",t:"Compare Units",ico:ICO.compare,d:"Stack 2-3 units side-by-side"}
];
let TOOL_CUR=null;
function openToolsMenu(){
  TOOL_CUR=null;   /* S3-fix: the tool PICKER has no active tool, so a background rebuildAll must not re-open the last one */
  $("#toolsTitle").textContent="Field Tools";
  $("#toolsBody").innerHTML=`<p class="vsub" style="margin:.2rem 0 .8rem">Seven battlefield tools plus your Favorites — usable over any screen.</p>
    <div class="toolmenu">${TOOLDEFS.map(t=>`<button class="toolcard" data-tool="${t.id}"><span class="ico">${t.ico}</span><div><h3 translate="no">${esc(t.t)}</h3><p>${esc(t.d)}</p></div><span class="ar">&#8250;</span></button>`).join("")}</div>`;
  $$("#toolsBody [data-tool]").forEach(b=>b.onclick=()=>openTool(b.dataset.tool));
  $("#toolsBack").style.display="none";
  showTools();
}
function openTool(id){TOOL_CUR=id;const def=TOOLDEFS.find(t=>t.id===id);
  $("#toolsTitle").textContent=def?def.t:"Field Tools";
  $("#toolsBack").style.display="inline-flex";
  const body=$("#toolsBody");body.innerHTML="";
  ({codex:toolCodex,round:toolRound,opsetup:toolOpSetup,draw:toolDraw,damage:toolDamage,strike:toolStrike,favorites:toolFavorites,compare:toolCompare}[id]||openToolsMenu)(body);
  showTools();body.scrollTop=0;
}
window.openTool=openTool;
function showTools(){const t=$("#tools");t.classList.add("open");if(!t._pushed){history.pushState({tools:true},"","#tools");t._pushed=true;}}
function closeTools(){const t=$("#tools");t.classList.remove("open");t._pushed=false;TOOL_CUR=null;
  // if hash still #tools, restore to current tab
  if(location.hash==="#tools")history.replaceState({tab:CURRENT_TAB},"","#"+(CURRENT_TAB||"home"));}
window.closeTools=closeTools;

/* ---------- TOOL 1: CODEX ---------- */
function toolCodex(v){
  const fac=Store.get("codexFac",FACTIONS_AZ[0]);
  v.innerHTML=`${toolManual("codex")}<p class="vsub">Colors rank each stat across the whole game (it knows low CR/IT/AF are good).</p>
   <div class="row"><label class="small muted" translate="no">MegaCon</label><select id="cxFac" translate="no">${factionOptions(fac)}</select>
     <input id="cxSearch" type="search" placeholder="Search name…" style="flex:1;min-width:120px"></div>
   <div id="cxList" class="list"></div><div id="cxDetail"></div>`;
  const draw=()=>{const f=$("#cxFac",v).value;Store.set("codexFac",f);const q=$("#cxSearch",v).value.trim().toLowerCase();
    const list=extByFaction(f).filter(u=>!q||u.name.toLowerCase().includes(q));
    $("#cxList",v).innerHTML=list.map(u=>`<button class="item" data-i="${unitIndex(u)}"><span class="nm" translate="no">${esc(cap(u.name))}</span>
      ${u.hasQuick?'<span class="chip q">Quick</span>':''}${u.deployable?'<span class="chip dep">Deploy</span>':''}
      <span class="grow"></span><span class="meta" translate="no">BL ${esc(u.stats.BL)} · AF ${esc(u.stats.AF)}</span><span class="ar">&#8250;</span></button>`).join("")||`<div class="empty">No units match.</div>`;
    $$("#cxList .item",v).forEach(b=>b.onclick=()=>codexDetail(v,+b.dataset.i));$("#cxDetail",v).innerHTML="";};
  $("#cxFac",v).onchange=draw;$("#cxSearch",v).oninput=draw;draw();
}
function codexDetail(v,i){const u=DATA.units[i];
  const stats=STAT_ORDER.map(k=>{const val=u.stats[k];const g=goodness(k,val);const col=heatColor(g);const w=g==null?0:Math.round(g*100);
    return `<button class="stat" onclick="statPop('${k}')"><div class="k" translate="no">${k}</div><div class="v" translate="no" style="color:${col}">${esc(val)}</div>
      <div class="bar"><i style="width:${w}%;background:${col}"></i></div></button>`;}).join("");
  $("#cxDetail",v).innerHTML=`<div class="unitcard"><div class="uhead"><h3 translate="no">${esc(cap(u.name))}</h3><span class="fac" translate="no">${esc(u.faction)}</span></div>
    <div class="stats">${stats}</div><div class="small muted">Tap a stat for its meaning.</div>
    <button class="btn sm" id="cxOpen" style="margin-top:.7rem">View full MegaCon card &#8250;</button></div>`;
  const ob=$("#cxOpen",v);if(ob)ob.onclick=()=>{closeTools();deepGoUnit(u.faction,i,u.id);};
  $("#cxDetail",v).scrollIntoView({behavior:"smooth",block:"start"});
}

/* ---------- TOOL 2: ROUND TRACKER ---------- */
function toolRound(v){
  let roster=Store.get("roundRoster",[]);let round=Store.get("roundNo",1);
  v.innerHTML=`${toolManual("round")}<p class="vsub">Add your MERCS, roll initiative, activate top-down. Quick breaks ties.</p>
   <div class="rule"><span><b>Quick:</b> a MERCS with Quick acts first among models tied on the same Initiative Step.</span></div>
   <div class="row"><select id="rdFac" translate="no">${factionOptions(FACTIONS_AZ[0])}</select><select id="rdUnit" translate="no"></select><button class="btn sm" id="rdAdd">+ Add</button></div>
   <div class="row" style="margin-top:.7rem"><span class="chip">Round <b id="rdRound" style="margin-left:.3rem">${round}</b></span>
     <button class="btn ghost sm" id="rdRoll">&#8635; Roll initiative</button><button class="btn ghost sm" id="rdNext">Next round &#8250;</button><button class="btn ghost sm" id="rdClear">Clear page</button></div>
   <div id="rdList" class="list"></div>`;
  const facUnits=()=>extByFaction($("#rdFac",v).value).filter(u=>!u.deployable);
  const fillUnits=()=>{$("#rdUnit",v).innerHTML=facUnits().map(u=>`<option value="${unitIndex(u)}">${esc(cap(u.name))} (IM ${esc(u.stats.IM)})</option>`).join("");};
  const save=()=>{Store.set("roundRoster",roster);Store.set("roundNo",round);};
  const clampMod=(im,m)=>{const lim=/^\d+$/.test(im)?+im:0;return Math.max(-lim,Math.min(lim,m));};
  const order=()=>roster.map((r,idx)=>{const u=DATA.units[r.i];return{r,u,idx,fin:(r.roll??0)+(r.mod??0),quick:u.hasQuick};})
     .sort((a,b)=>b.fin-a.fin||(b.quick-a.quick)||a.idx-b.idx);
  function draw(){const ord=order();$("#rdRound",v).textContent=round;
    if(!roster.length){$("#rdList",v).innerHTML=`<div class="empty">Add MERCS to begin. Tip: add both sides to track the whole table.</div>`;save();return;}
    $("#rdList",v).innerHTML=ord.map((o,pos)=>{const r=o.r;const rolled=r.roll!=null;
      return `<div class="trkitem ${r.done?'done':''} ${pos===0&&rolled?'active':''}">
        <div class="initbadge ${pos===0&&rolled?'lead':''}">${rolled?o.fin:'—'}</div>
        <div class="grow"><div class="nm" translate="no">${esc(cap(o.u.name))} ${o.quick?'<span class="chip q">Quick</span>':''}</div>
          <div class="meta" translate="no">${esc(o.u.faction)} · IM ${esc(o.u.stats.IM)}${rolled?` · rolled ${r.roll}${r.mod?` ${r.mod>0?'+':''}${r.mod}`:''}`:''}</div></div>
        ${rolled?`<div class="row"><button class="stog" data-m="-1" data-id="${o.idx}">−</button><button class="stog" data-m="1" data-id="${o.idx}">+</button>
           <button class="btn ghost sm" data-done="${o.idx}">${r.done?'Undo':'Activate'}</button></div>`:''}
        <button class="stog" data-del="${o.idx}">✕</button></div>`;}).join("");
    $$("#rdList [data-done]",v).forEach(b=>b.onclick=()=>{roster[+b.dataset.done].done=!roster[+b.dataset.done].done;draw();});
    $$("#rdList [data-del]",v).forEach(b=>b.onclick=()=>{roster.splice(+b.dataset.del,1);draw();});
    $$("#rdList [data-m]",v).forEach(b=>b.onclick=()=>{const r=roster[+b.dataset.id];const u=DATA.units[r.i];r.mod=clampMod(u.stats.IM,(r.mod??0)+ +b.dataset.m);draw();});
    save();}
  $("#rdFac",v).onchange=fillUnits;
  $("#rdAdd",v).onclick=()=>{roster.push({i:+$("#rdUnit",v).value,roll:null,mod:0,done:false});draw();};
  $("#rdRoll",v).onclick=()=>{roster.forEach(r=>{const u=DATA.units[r.i];r.roll=d10();r.mod=clampMod(u.stats.IM,r.mod??0);});draw();toast("Initiative rolled");};
  $("#rdNext",v).onclick=()=>{round++;roster.forEach(r=>{r.done=false;r.roll=null;r.mod=0;});draw();};
  $("#rdClear",v).onclick=()=>{roster=[];round=1;draw();toast("Round tracker cleared");};
  fillUnits();draw();
}

/* ---------- TOOL 3: OPERATION SETUP ---------- */
function opHandSize(o){const m=(o.missionParameters&&o.missionParameters.contingency||"").match(/(\d+)\s*cards?/i);return m?+m[1]:4;}
function opLiveRound(o){const m=(o.missionParameters&&o.missionParameters.contingency||"").match(/Live Contingency Round:\s*(\d+)/i);return m?+m[1]:null;}
function toolOpSetup(v){
  const idx=Store.get("opSetupIdx",0);
  v.innerHTML=`${toolManual("opsetup")}<p class="vsub">Pick a mission to lay out its parameters and score objectives live.</p>
   <div class="row"><select id="opSel">${DATA.operations.map((o,i)=>`<option value="${i}" ${i===idx?'selected':''} translate="no">${esc(o.title)}</option>`).join("")}</select><button class="btn ghost sm" id="opClear">Clear ticks</button></div><div id="opBody"></div>`;
  const draw=()=>{const o=DATA.operations[+$("#opSel",v).value];Store.set("opSetupIdx",+$("#opSel",v).value);
    const hand=opHandSize(o),live=opLiveRound(o);
    const key="opChecked_"+o.id;let checked=Store.get(key,{});
    const objs=o.securedObjectives.map((s,i)=>`<div class="obj ${checked[i]?'checked':''}" data-i="${i}"><div class="box">${checked[i]?'✓':''}</div><div class="grow">${esc(s.desc)}</div><div class="op">${esc(s.op)}</div></div>`).join("");
    $("#opBody",v).innerHTML=`<div class="tagline">
        <span class="chip">Contingency: <b style="margin-left:.25rem">${hand} cards</b></span>
        <span class="chip">Live Round: <b style="margin-left:.25rem">${live??'?'}</b></span></div>
      <div class="unitcard"><h3 style="font-size:1.05rem">Briefing</h3><p class="small" style="color:var(--ink2)">${flowInline(o.briefing)}</p>
        <div class="row" style="margin-top:.7rem"><button class="btn ghost sm" id="opToDraw">Deal this hand in Contingency Draw &#8594;</button></div></div>
      <h3 style="font-size:1.05rem;margin:1rem 0 .3rem">Secured Objectives</h3><div class="list">${objs}</div>
      <div class="tally"><span>Secured</span><span class="muted small" id="opCount"></span><span class="big" id="opSum">0 OP</span></div>`;
    const recalc=()=>{let sum=0,n=0;o.securedObjectives.forEach((s,i)=>{if(checked[i]){n++;const mm=String(s.op).match(/(\d+)\s*OP/);if(mm)sum+=+mm[1];}});
      $("#opSum",v).textContent=sum+" OP";$("#opCount",v).textContent=n+" / "+o.securedObjectives.length;};
    $$("#opBody .obj",v).forEach(b=>b.onclick=()=>{const i=+b.dataset.i;checked[i]=!checked[i];Store.set(key,checked);
      b.classList.toggle("checked");b.querySelector(".box").textContent=checked[i]?'✓':'';recalc();});
    $("#opToDraw",v).onclick=()=>{Store.set("drawHand",hand);Store.set("drawLive",live);Store.set("drawOpName",o.title);openTool("draw");};
    recalc();};
  $("#opSel",v).onchange=draw;
  $("#opClear",v).onclick=()=>{const o=DATA.operations[+$("#opSel",v).value];Store.set("opChecked_"+o.id,{});draw();toast("Objectives reset");};
  draw();
}

/* ---------- TOOL 4: CONTINGENCY DRAW ---------- */
function deckForDraw(fac){const u=uniqueFor(fac);
  return [...DATA.contingency.core.map(c=>({title:c.title,op:c.op,text:c.text,img:c.img,core:true})),...(u?[{title:u.title,op:u.op,text:u.text,img:u.img,core:false}]:[])];}
function toolDraw(v){
  const fac=Store.get("drawFac",FACTIONS_AZ[0]);const hand=Store.get("drawHand",4);
  v.innerHTML=`${toolManual("draw")}<p class="vsub">Deck = 19 shared + 1 faction-unique. Deal, set your Live card, discard to the limit.</p>
   ${Store.get("drawOpName")?`<div class="rule"><span>Hand size from <b>${esc(Store.get("drawOpName"))}</b>: deal <b>${hand}</b>. Live Contingency Round is <b>${Store.get("drawLive")??'?'}</b>.</span></div>`:''}
   <div class="row"><select id="ctFac" translate="no">${factionOptions(fac)}</select><label class="small muted">Hand</label>
     <input id="ctHand" type="number" min="1" max="20" value="${hand}" style="width:74px"><button class="btn sm" id="ctDeal">Shuffle &amp; deal</button>
     <button class="btn ghost sm" id="ctDraw">+ Draw one</button><button class="btn ghost sm" id="ctClear">Clear page</button></div>
   <div class="tagline"><span id="ctInfo"></span></div><div id="ctHandWrap" class="list"></div>`;
  let state=Store.get("drawState",null);const facNow=()=>$("#ctFac",v).value;
  const persist=()=>{Store.set("drawState",state);Store.set("drawFac",facNow());Store.set("drawHand",+$("#ctHand",v).value||4);};
  function deal(){const f=facNow();const deck=deckForDraw(f).map((c,i)=>({...c,id:i}));shuffle(deck);const n=Math.min(+$("#ctHand",v).value||4,deck.length);
    state={fac:f,drawn:deck.slice(0,n),rest:deck.slice(n),live:null};persist();draw();}
  function draw(){if(!state||state.fac!==facNow()){$("#ctHandWrap",v).innerHTML=`<div class="empty">Choose a MegaCon and deal a hand.</div>`;$("#ctInfo",v).textContent="";return;}
    $("#ctInfo",v).innerHTML=`Deck: <b translate="no">${esc(state.fac)}</b> — ${deckForDraw(state.fac).length} cards · holding <b>${state.drawn.length}</b> · ${state.rest.length} left`;
    $("#ctHandWrap",v).innerHTML=state.drawn.map(c=>`<div class="handcard ${state.live===c.id?'live':''}">
        <div class="row" style="justify-content:space-between"><span class="ct" translate="no">${esc(c.title)} ${c.core?'':'<span class="chip dep">Faction</span>'}</span><span class="cop">${esc(c.op)}</span></div>
        <div class="cx">${esc(c.text)}</div><div class="row2"><button class="stog ${state.live===c.id?'on':''}" data-live="${c.id}">${state.live===c.id?'★ Live card':'Set as Live'}</button>
          <button class="btn ghost sm" data-disc="${c.id}">Discard</button></div></div>`).join("");
    $$("#ctHandWrap [data-live]",v).forEach(b=>b.onclick=()=>{const id=+b.dataset.live;state.live=state.live===id?null:id;persist();draw();});
    $$("#ctHandWrap [data-disc]",v).forEach(b=>b.onclick=()=>{const id=+b.dataset.disc;if(state.live===id){toast("The Live Contingency Card can't be discarded.");return;}
      const c=state.drawn.find(x=>x.id===id);state.drawn=state.drawn.filter(x=>x.id!==id);state.rest.push(c);persist();draw();});}
  $("#ctFac",v).onchange=()=>{state=null;draw();};$("#ctDeal",v).onclick=deal;
  $("#ctDraw",v).onclick=()=>{if(!state||state.fac!==facNow()){deal();return;}if(!state.rest.length){toast("Deck empty.");return;}state.drawn.push(state.rest.shift());persist();draw();};
  $("#ctClear",v).onclick=()=>{["drawState","drawOpName","drawLive"].forEach(k=>Store.set(k,null));state=null;toolDraw(v);toast("Contingency Draw cleared");};
  draw();
}

/* ---------- TOOL 5: DAMAGE & ARMOR ---------- */
function toolDamage(v){
  let squad=Store.get("dmgSquad",[]);
  v.innerHTML=`${toolManual("damage")}<p class="vsub">Track Blood per MERCS and resolve Armor Failure exactly by the book.</p>
   <div class="rule"><span><b>Armor Failure:</b> after a hit, roll a d10 — <b>equal or higher than AF = armor holds</b>; lower = it fails. <b>AF 0 always fails.</b> A model dies when Blood reaches its BL.</span></div>
   <div class="row"><select id="dgFac" translate="no">${factionOptions(FACTIONS_AZ[0])}</select><select id="dgUnit" translate="no"></select><button class="btn sm" id="dgAdd">+ Add</button><button class="btn ghost sm" id="dgClear">Clear page</button></div><div id="dgList"></div>`;
  const STATUS=["Pinned","Disoriented","Burning","Forced","Suppressed","Armor Broken"];
  const fillUnits=()=>{$("#dgUnit",v).innerHTML=extByFaction($("#dgFac",v).value).map(u=>`<option value="${unitIndex(u)}">${esc(cap(u.name))} (BL ${esc(u.stats.BL)} · AF ${esc(u.stats.AF)})</option>`).join("");};
  const save=()=>Store.set("dmgSquad",squad);
  function draw(){if(!squad.length){$("#dgList",v).innerHTML=`<div class="empty">Add MERCS to track their Blood and armor.</div>`;save();return;}
    $("#dgList",v).innerHTML=squad.map((s,si)=>{const u=DATA.units[s.i];const bl=+u.stats.BL||0;const dead=s.blood>=bl&&bl>0;const noAF=u.stats.AF==="–"||u.stats.AF==="-"||u.stats.AF==="X";
      const pips=Array.from({length:bl},(_,k)=>`<span class="pip ${k<s.blood?'full':''}"></span>`).join("");
      return `<div class="dmg ${dead?'dead':''}"><div class="row" style="justify-content:space-between">
          <div><span class="nm" style="font-family:var(--font-disp);font-weight:700" translate="no">${esc(cap(u.name))}</span> <span class="meta" translate="no">${esc(u.faction)} · BL ${esc(u.stats.BL)} · AF ${esc(u.stats.AF)}</span></div><button class="stog" data-del="${si}">✕</button></div>
        <div class="bloodrow"><button class="stog" data-b="-1" data-i="${si}">−</button><div class="pips">${pips||'<span class="muted small">no Blood value</span>'}</div>
          <button class="stog" data-b="1" data-i="${si}">+</button><span class="grow"></span><span class="${dead?'':'muted'} small" style="${dead?'color:var(--bad);font-weight:800;font-family:var(--font-disp)':''}">${dead?'KILLED':s.blood+' / '+bl}</span></div>
        <div class="row">${noAF?`<span class="chip">Does not roll for Armor Failure</span>`:`<button class="btn ghost sm" data-af="${si}">Roll armor check</button>`}
          <span class="small" style="${s.afMsg&&s.afMsg.includes('FAIL')?'color:var(--bad);font-weight:700':'color:var(--muted)'}">${esc(s.afMsg||'')}</span></div>
        <div class="statusrow">${STATUS.map(st=>`<button class="stog ${s.status.includes(st)?'on':''}" data-st="${si}|${st}">${st}</button>`).join("")}</div></div>`;}).join("");
    $$("#dgList [data-del]",v).forEach(b=>b.onclick=()=>{squad.splice(+b.dataset.del,1);draw();});
    $$("#dgList [data-b]",v).forEach(b=>b.onclick=()=>{const s=squad[+b.dataset.i];s.blood=Math.max(0,s.blood+ +b.dataset.b);draw();});
    $$("#dgList [data-af]",v).forEach(b=>b.onclick=()=>{const s=squad[+b.dataset.af];const u=DATA.units[s.i];const af=+u.stats.AF;const r=d10();const pass=(af===0)?false:(r>=af);
      s.afMsg=`d10=${r} — ${pass?'armor HOLDS':'armor FAILS'}${af===0?' (AF 0 auto-fail)':''}`;draw();if(!pass&&!s.status.includes("Armor Broken"))toast("Armor failed — mark Armor Broken / apply penalties.");});
    $$("#dgList [data-st]",v).forEach(b=>b.onclick=()=>{const[si,st]=b.dataset.st.split("|");const s=squad[+si];s.status=s.status.includes(st)?s.status.filter(x=>x!==st):[...s.status,st];draw();});
    save();}
  $("#dgFac",v).onchange=fillUnits;$("#dgAdd",v).onclick=()=>{squad.push({i:+$("#dgUnit",v).value,blood:0,status:[],afMsg:""});draw();};
  $("#dgClear",v).onclick=()=>{squad=[];save();draw();toast("Damage tracker cleared");};
  fillUnits();draw();
}

/* ---------- TOOL 6: STRIKE TEAM BUILDER ---------- */
function toolStrike(v){
  let team=Store.get("strikeTeam",{fac:null,size:5,members:[]});
  if(!DATA.factions.includes(team.fac))team.fac=null;
  const save=()=>Store.set("strikeTeam",team);
  function render(){
    const facSel=`<select id="stFac" translate="no"><option value="">— pick MegaCon —</option>${FACTIONS_AZ.map(f=>`<option ${f===team.fac?'selected':''}>${esc(f)}</option>`).join("")}</select>`;
    const sizeSel=`<select id="stSize">${[3,4,5].map(n=>`<option value="${n}" ${n===team.size?'selected':''}>${n}-member team</option>`).join("")}</select>`;
    let addSel="";
    if(team.fac){
      const used=team.members.map(i=>DATA.units[i].archetype);
      const opts=extByFaction(team.fac).filter(u=>!team.members.includes(unitIndex(u))).map(u=>{
        const dup=used.includes(u.archetype);
        return `<option value="${unitIndex(u)}" ${dup?'disabled':''}>${esc(cap(u.name))} (${esc(u.archetype)})${dup?' — archetype taken':''}</option>`;}).join("");
      addSel=`<select id="stUnit" translate="no">${opts||'<option>— none left —</option>'}</select><button class="btn sm" id="stAdd" ${team.members.length>=team.size?'disabled':''}>+ Add</button>`;
    }
    const roster=team.members.length?`<div class="list">${team.members.map((i,pos)=>{const u=DATA.units[i];
      return `<div class="item"><img class="thumb" loading="lazy" src="${esc(u.imgFront)}" alt="">
        <span class="grow"><span class="nm" translate="no">${esc(cap(u.name))}</span><span class="meta" translate="no">${esc(u.archetype)} · BL ${esc(u.stats.BL)} · AF ${esc(u.stats.AF)}</span></span>
        <button class="stog" data-rem="${pos}">✕</button></div>`;}).join("")}</div>`:`<div class="empty">${team.fac?'Add up to '+team.size+' members from this MegaCon.':'Pick a MegaCon to begin building.'}</div>`;
    // validation summary
    const archs=team.members.map(i=>DATA.units[i].archetype);
    const dupArch=archs.length!==new Set(archs).size;
    const valid=team.fac&&team.members.length>0&&team.members.length<=team.size&&!dupArch;
    const vmsg=!team.fac?"":(dupArch?'<span class="bad">Duplicate archetype — not legal.</span>':(team.members.length>team.size?'<span class="bad">Over team size.</span>':(valid?'<span class="good">Legal Strike Team &#10003;</span>':'<span class="muted">Add members…</span>')));
    v.innerHTML=`${toolManual("strike")}<p class="vsub">Build a legal Strike Team: one MegaCon, no duplicate archetypes, up to your chosen size. (MERCS has no point system.)</p>
      <div class="row">${facSel}${sizeSel}</div>
      <div class="row" style="margin-top:.6rem">${addSel}<span class="grow"></span><button class="btn ghost sm" id="stClear">Clear team</button></div>
      <div class="tagline" style="margin-top:.6rem"><span class="chip">${team.members.length} / ${team.size}</span> ${vmsg}</div>
      ${roster}`;
    $("#stFac",v).onchange=e=>{const nf=e.target.value;if(nf!==team.fac){team.fac=nf||null;team.members=[];}save();render();};
    $("#stSize",v).onchange=e=>{team.size=+e.target.value;if(team.members.length>team.size)team.members=team.members.slice(0,team.size);save();render();};
    const addBtn=$("#stAdd",v);if(addBtn)addBtn.onclick=()=>{const sel=$("#stUnit",v);if(!sel||!sel.value)return;const i=+sel.value;
      if(team.members.length>=team.size){toast("Team is full.");return;}
      const arch=DATA.units[i].archetype;
      if(team.members.some(m=>DATA.units[m].archetype===arch)){toast("That archetype is already on the team.");return;}
      team.members.push(i);save();render();};
    $$("[data-rem]",v).forEach(b=>b.onclick=()=>{team.members.splice(+b.dataset.rem,1);save();render();});
    $("#stClear",v).onclick=()=>{team.members=[];save();render();toast("Team cleared");};
  }
  render();
}

/* ---------- TOOL 7: FAVORITES ---------- */
function toolFavorites(v){
  const f=favs();
  const unitItems=f.units.map(id=>{const u=DATA.units.find(x=>x.id===id);if(!u)return"";
    return `<div class="item" role="button" tabindex="0" data-go-unit="${unitIndex(u)}"><img class="thumb" loading="lazy" src="${esc(u.imgFront)}" alt="">
      <span class="grow"><span class="nm" translate="no">${esc(cap(u.name))}</span><span class="meta" translate="no">${esc(u.faction)} · ${esc(u.archetype)}</span></span>
      <button class="stog" data-unfav="units|${esc(id)}">✕</button><span class="ar">&#8250;</span></div>`;}).join("");
  const contItems=f.contingency.map(key=>{const[fac,title]=favParts(key);const card=contCardsFor(fac).find(c=>c.title===title);if(!card)return"";
    return `<div class="item"><span class="grow"><span class="nm" translate="no">${esc(card.title)}</span><span class="meta" translate="no">${esc(fac)} · ${esc(card.op)}</span></span>
      <button class="stog" data-unfav="contingency|${esc(key)}">✕</button></div>`;}).join("");
  const opItems=f.operations.map(id=>{const o=DATA.operations.find(x=>x.id===id);if(!o)return"";
    return `<div class="item" role="button" tabindex="0" data-go-op="${DATA.operations.indexOf(o)}"><span class="grow"><span class="nm" translate="no">${esc(o.title)}</span></span>
      <button class="stog" data-unfav="operations|${esc(id)}">✕</button><span class="ar">&#8250;</span></div>`;}).join("");
  const empty=!unitItems&&!contItems&&!opItems;
  v.innerHTML=`${toolManual("favorites")}<p class="vsub">Everything you've starred. Tap to jump to the record.</p>
    ${empty?'<div class="empty">No favorites yet. Tap the &#9733; on any unit, contingency card or operation.</div>':''}
    ${unitItems?`<h3 class="rsh" style="font-size:1rem">Units</h3><div class="list">${unitItems}</div>`:''}
    ${contItems?`<h3 class="rsh" style="font-size:1rem;margin-top:.8rem">Contingency Cards</h3><div class="list">${contItems}</div>`:''}
    ${opItems?`<h3 class="rsh" style="font-size:1rem;margin-top:.8rem">Operations</h3><div class="list">${opItems}</div>`:''}`;
  $$("[data-go-unit]",v).forEach(b=>b.onclick=()=>{const i=+b.dataset.goUnit;closeTools();deepGoUnit(DATA.units[i].faction,i,DATA.units[i].id);});
  $$("[data-go-op]",v).forEach(b=>b.onclick=()=>{const i=+b.dataset.goOp;closeTools();deepGoOp(i);});
  $$("[data-unfav]",v).forEach(b=>b.onclick=ev=>{ev.stopPropagation();const[kind,key]=favParts(b.dataset.unfav);const ff=favs();ff[kind]=ff[kind].filter(x=>x!==key);Store.set("favs",ff);syncStars();toolFavorites(v);});
}

/* ---------- TOOL 8: COMPARE UNITS (side-by-side) ---------- */
function toolCompare(v){
  let sel=Store.get("cmpSel",[]).filter(i=>Number.isInteger(i)&&DATA.units[i]).slice(0,3);
  const save=()=>Store.set("cmpSel",sel);
  const draw=()=>{
    const facSel=$("#cmpFac",v)?$("#cmpFac",v).value:FACTIONS_AZ[0];
    const addBlock=`<div class="cmp-add">
        <select id="cmpFac" translate="no">${factionOptions(facSel)}</select>
        <select id="cmpUnit" translate="no"></select>
        <button class="btn sm" id="cmpAdd"${sel.length>=3?' disabled':''}>+ Add</button>
        ${sel.length?'<button class="btn ghost sm" id="cmpClear">Clear all</button>':''}
      </div>${sel.length>=3?'<div class="small muted">Comparing the maximum of three units.</div>':''}`;
    let body;
    if(!sel.length){
      body=`<div class="cmp-empty">Add two or three units above to stack their stats side-by-side. You can mix factions.</div>`;
    }else{
      const units=sel.map(i=>DATA.units[i]);
      // header row
      const heads=units.map((u,col)=>`<th><div class="uh">
          <img loading="lazy" src="${esc(u.imgFront)}" alt="">
          <span class="nm" translate="no">${esc(cap(u.name))}</span>
          <span class="fc" translate="no">${esc(u.faction)}</span>
          <button class="rm" data-rm="${col}" aria-label="Remove">\u00d7</button>
        </div></th>`).join("");
      // stat rows with best-per-row highlight
      const rows=STAT_ORDER.map(k=>{
        const gs=units.map(u=>goodness(k,u.stats[k]));
        const valid=gs.filter(g=>g!=null);
        const bestG=valid.length?Math.max(...valid):null;
        const cells=units.map((u,ci)=>{
          const val=u.stats[k],g=gs[ci],col=heatColor(g);
          const isBest=g!=null&&bestG!=null&&Math.abs(g-bestG)<1e-9&&valid.length>1;
          return `<td class="sv${isBest?' best':''}" style="color:${col}" translate="no">${esc(val)}</td>`;
        }).join("");
        return `<tr><th><button class="kw" onclick="statPop('${k}')" translate="no" style="background:none;border:none;padding:0;color:inherit;font:inherit;cursor:pointer">${k}</button></th>${cells}</tr>`;
      }).join("");
      // archetype row
      const archRow=`<tr><th>Type</th>${units.map(u=>`<td class="arch" translate="no">${esc(u.archetype)}</td>`).join("")}</tr>`;
      // weapons row
      const wRow=`<tr><th>Arms</th>${units.map(u=>{
        const w=u.weapons.length?u.weapons.map(wp=>`<div><span class="wn" translate="no">${esc(wp.name)}</span><br><span class="bands" translate="no">B ${esc(wp.bands.B||'\u2013')} · S ${esc(wp.bands.S||'\u2013')} · M ${esc(wp.bands.M||'\u2013')} · L ${esc(wp.bands.L||'\u2013')}</span></div>`).join('<div style="height:.3rem"></div>'):'<span class="muted">\u2013</span>';
        return `<td class="wpl">${w}</td>`;
      }).join("")}</tr>`;
      body=`<div class="cmp-wrap"><table class="cmp">
        <thead><tr><th></th>${heads}</tr></thead>
        <tbody>${rows}${archRow}${wRow}</tbody>
      </table></div>
      <div class="small muted">Stat colours rank across the whole game; \u2605 marks the best in each row.</div>`;
    }
    v.innerHTML=`${toolManual("compare")}<p class="vsub">Stack 2-3 units (any factions) and read their stats, archetype and weapons together.</p>${addBlock}${body}`;
    // wire add controls
    const fillUnits=()=>{const f=$("#cmpFac",v).value;
      $("#cmpUnit",v).innerHTML=extByFaction(f).map(u=>`<option value="${unitIndex(u)}"${sel.includes(unitIndex(u))?' disabled':''}>${esc(cap(u.name))}${sel.includes(unitIndex(u))?' — added':''}</option>`).join("");};
    if($("#cmpFac",v)){$("#cmpFac",v).onchange=fillUnits;fillUnits();}
    if($("#cmpAdd",v))$("#cmpAdd",v).onclick=()=>{
      const i=+$("#cmpUnit",v).value;
      if(sel.length>=3){toast("Up to three units.");return;}
      if(sel.includes(i)){toast("That unit is already added.");return;}
      sel.push(i);save();draw();
    };
    if($("#cmpClear",v))$("#cmpClear",v).onclick=()=>{sel=[];save();draw();toast("Comparison cleared");};
    $$("[data-rm]",v).forEach(b=>b.onclick=()=>{const c=+b.dataset.rm;sel.splice(c,1);save();draw();});
  };
  draw();
}

/* ============================================================
   UNIVERSAL: SEARCH (cross-tab, debounced 200ms, grouped, highlighted)
   ============================================================ */
let SEARCH_INDEX=null;

/* ---- DEEP-LINK helpers: navigate, render the right sub-context, then scroll+pulse the record ---- */
/* Panels build lazily; after navTo/draw, query the id on the next frame and scroll it into view. */
function scrollToRecord(id){
  const tryScroll=()=>{
    const elx=document.getElementById(id);
    if(!elx)return false;
    elx.scrollIntoView({behavior:"smooth",block:"start"});
    elx.classList.remove("rec-hl");
    // force reflow so re-adding the class restarts the animation
    void elx.offsetWidth;
    elx.classList.add("rec-hl");
    setTimeout(()=>{elx&&elx.classList.remove("rec-hl");},2000);
    return true;
  };
  // wait one frame for the lazy builder to paint, retry a few times if needed
  let tries=0;
  const tick=()=>{ if(tryScroll())return; if(tries++<20)requestAnimationFrame(tick); };
  requestAnimationFrame(tick);
}
function deepGoUnit(fac,i,id){
  Store.set("megFac",fac);
  rebuildPanel("megacons");
  navTo("megacons");
  // megacons builder draws the roster for stored faction; showUnit renders the detail card.
  requestAnimationFrame(()=>{showUnit(i);scrollToRecord("rec-unit-"+id);});
}
function deepGoCont(fac,title){
  Store.set("contBrowseFac",fac);
  rebuildPanel("contingency");
  navTo("contingency");
  const slug=SLUG(title);
  requestAnimationFrame(()=>{
    const panel=$("#panel-contingency");
    if(panel&&panel._contReveal)panel._contReveal(slug);
    scrollToRecord("rec-cont-"+slug);
  });
}
function deepGoCorp(fac){
  Store.set("corpFac",fac);
  rebuildPanel("corp");
  navTo("corp");
  requestAnimationFrame(()=>scrollToRecord("rec-corp-"+SLUG(fac)));
}
function deepGoOp(i){
  Store.set("opBrowseIdx",i);
  rebuildPanel("operations");
  navTo("operations");
  requestAnimationFrame(()=>scrollToRecord("rec-op-"+DATA.operations[i].id));
}
function deepGoRule(slug,mode){
  mode=mode||"core";
  Store.set("rulesMode",mode);
  rebuildPanel("rules");
  navTo("rules");
  requestAnimationFrame(()=>{
    const panel=$("#panel-rules");
    if(panel&&panel._ruleOpen)panel._ruleOpen(mode,slug);
    scrollToRecord("rec-rule-"+slug);
  });
}
/* deep-link → a Modifier table */
function deepGoModifier(slug){navTo("modifiers");requestAnimationFrame(()=>scrollToRecord("rec-mod-"+slug));}
/* popover for a glossary/status term that has no dedicated panel of its own */
function defPop(k){const t=DATA.termDefs&&DATA.termDefs[k];if(!t)return;
  popOpen(`<h4>${tn(t.term||k)}</h4><div>${escText(t.def||"")}</div>`);}
window.defPop=defPop;
function deepGoTerm(mode,name){
  Store.set("kwMode",mode);
  rebuildPanel("keywords");
  navTo("keywords");
  // clear any leftover filter so the target row renders, then re-draw
  requestAnimationFrame(()=>{
    const inp=$("#kwSearch");
    if(inp&&inp.value){inp.value="";inp.dispatchEvent(new Event("input"));}
    scrollToRecord((mode==="pa"?"rec-pa-":"rec-kw-")+SLUG(name));
  });
}

/* word-boundary "contains": true if needle starts at a word boundary inside hay */
function _wb(hay,needle){let i=hay.indexOf(needle);while(i>=0){if(i===0||!/[a-z0-9]/.test(hay[i-1]))return true;i=hay.indexOf(needle,i+1);}return false;}
/* relevance score: exact name > name-prefix > name word-start > name-substring > body word-start > body-substring */
function scoreHit(r,lc){const L=r.labelLc;
  if(r.abbr&&r.abbr.toLowerCase()===lc)return 1000;
  if(L===lc)return 1000;
  if(L.startsWith(lc))return 850;
  if(_wb(L,lc))return 700;
  if(L.includes(lc))return 560;
  if(_wb(r.lc,lc))return 320;
  return 140;}
/* COMPREHENSIVE search index — EVERY record type in the app is indexed here so
   nothing is unreachable from search: units, contingency (core+unique), corporate
   traits, operations, ALL rules (core + Recon FAQ/Add-Ons/Rules-Revised), modifier
   tables, keywords, personal abilities, stat definitions and glossary terms. */
function buildSearchIndex(){
  const idx=[];
  DATA.units.forEach((u,i)=>idx.push({type:"Unit",key:"rec-unit-"+u.id,fac:u.faction,uidx:i,label:cap(u.name),sub:u.faction+" · "+u.archetype,text:(u.name+" "+u.archetype+" "+u.weapons.map(w=>w.name).join(" ")+" "+(u.kit||"")),go:()=>deepGoUnit(u.faction,i,u.id)}));
  // Contingency: core cards (19, identical across all 12 decks) indexed ONCE; faction-unique (1/deck) once each.
  DATA.contingency.core.forEach(c=>idx.push({type:"Contingency",key:"rec-cont-"+SLUG(c.title),fac:FACTIONS_AZ[0],label:c.title,sub:"All decks · "+c.op,text:c.title+" "+c.text,go:()=>deepGoCont(FACTIONS_AZ[0],c.title)}));
  DATA.factions.forEach(f=>{const u=uniqueFor(f);if(u)idx.push({type:"Contingency",key:"rec-cont-"+SLUG(u.title),fac:f,label:u.title,sub:f+" · "+u.op,text:u.title+" "+u.text,go:()=>deepGoCont(f,u.title)});});
  DATA.factions.forEach(f=>{const cc=DATA.corporateTraits[SLUG(f)];if(cc)cc.traits.forEach(t=>idx.push({type:"Corporate",key:"rec-corp-"+SLUG(f),fac:f,label:t.name,sub:f+" · Corporate Trait",text:t.name+" "+t.text,go:()=>deepGoCorp(f)}));});
  DATA.operations.forEach((o,i)=>idx.push({type:"Operation",key:"rec-op-"+o.id,oidx:i,label:o.title,sub:"Operation",text:o.title+" "+o.briefing,go:()=>deepGoOp(i)}));
  // Core rules
  DATA.rules.core.sections.forEach((s,si)=>{if(s.title&&!/^Cover$/i.test(s.title)&&!/^Table of Contents$/i.test(s.title))idx.push({type:"Rule",key:"rec-rule-"+SLUG(s.title),label:s.title,sub:"Core 2.5",text:s.title+" "+cleanRuleText(s.body),go:()=>deepGoRule(SLUG(s.title),"core")});});
  // Recon add-on rules — FAQ (grouped + each question), Add-Ons, Rules-Revised  (previously NOT searchable)
  if(DATA.rules.recon){const r=DATA.rules.recon;
    if(r.faq&&r.faq.length){
      idx.push({type:"Rule",key:"rec-rule-recon-faq",label:"Recon — Frequently Asked Questions",sub:"Recon Add-On",text:"Recon FAQ "+r.faq.map(x=>x.q+" "+x.a).join(" "),go:()=>deepGoRule("recon-faq","recon")});
      r.faq.forEach(x=>idx.push({type:"Rule",key:"rec-rule-recon-faq",label:cleanRuleText(x.q),sub:"Recon FAQ",text:cleanRuleText(x.q)+" "+cleanRuleText(x.a),go:()=>deepGoRule("recon-faq","recon")}));
    }
    (r.addOns||[]).forEach(x=>idx.push({type:"Rule",key:"rec-rule-recon-add-"+SLUG(x.title),label:"Recon — "+x.title,sub:"Recon Add-On",text:"Recon "+x.title+" "+cleanRuleText(x.body),go:()=>deepGoRule("recon-add-"+SLUG(x.title),"recon")}));
    (r.rulesRevised||[]).forEach(x=>idx.push({type:"Rule",key:"rec-rule-recon-rev-"+SLUG(x.title),label:"Recon — "+x.title,sub:"Recon Rules Revised",text:"Recon "+x.title+" "+cleanRuleText(x.body),go:()=>deepGoRule("recon-rev-"+SLUG(x.title),"recon")}));
  }
  // Modifier tables  (previously NOT searchable)
  DATA.modifiers.forEach(m=>idx.push({type:"Modifier",key:"rec-mod-"+SLUG(m.title),label:m.title,sub:"Modifier Table",text:m.title+" "+(m.columns||[]).join(" ")+" "+(m.rows||[]).map(rw=>rw.join(" ")).join(" ")+" "+(m.notes||""),go:()=>deepGoModifier(SLUG(m.title))}));
  // Keywords + Personal Abilities
  Object.values(DATA.keywords).forEach(k=>idx.push({type:"Keyword",key:"rec-kw-"+SLUG(k.name),kwName:k.name,label:k.name,sub:"Keyword",text:k.name+" "+k.text,go:()=>deepGoTerm("keywords",k.name)}));
  Object.values(DATA.personalAbilities).forEach(k=>idx.push({type:"Ability",key:"rec-pa-"+SLUG(k.name),kwName:k.name,label:k.name,sub:"Personal Ability",text:k.name+" "+k.text,go:()=>deepGoTerm("pa",k.name)}));
  // Stat definitions (IM, RE, CR…) → stat popover  (previously NOT searchable)
  if(DATA.terms)Object.keys(DATA.terms).forEach(k=>{const t=DATA.terms[k];idx.push({type:"Term",key:"stat-"+k,abbr:k,label:(t.term||k)+" ("+k+")",sub:"Stat",text:k+" "+(t.term||"")+" "+(t.def||""),go:()=>statPop(k)});});
  // Glossary / status terms not already covered above → term popover  (previously NOT searchable)
  if(DATA.termDefs){const have=new Set([].concat(Object.keys(DATA.keywords),Object.keys(DATA.personalAbilities),Object.keys(DATA.terms||{}),Object.values(DATA.terms||{}).map(t=>t.term||"")).map(x=>x.toUpperCase()));
    Object.keys(DATA.termDefs).forEach(k=>{if(have.has(k.toUpperCase()))return;const t=DATA.termDefs[k];idx.push({type:"Term",key:"term-"+SLUG(k),label:t.term||k,sub:"Game Term",text:(t.term||k)+" "+(t.def||""),go:()=>defPop(k)});});
  }
  idx.forEach(r=>{r.labelLc=r.label.toLowerCase();r.lc=(r.label+" "+r.text).toLowerCase();});
  SEARCH_INDEX=idx;
}
function hl(text,q){if(!q)return esc(text);const i=text.toLowerCase().indexOf(q.toLowerCase());if(i<0)return esc(text);
  return esc(text.slice(0,i))+"<mark>"+esc(text.slice(i,i+q.length))+"</mark>"+esc(text.slice(i+q.length));}
function openSearch(){
  const s=$("#search");s.classList.add("open");
  if(!s._pushed){history.pushState({search:true},"","#search");s._pushed=true;}
  const inp=$("#searchInput");inp.value="";$("#searchResults").innerHTML=`<div class="empty">Search units, cards, traits, missions, rules and keywords.</div>`;
  if(!SEARCH_INDEX)buildSearchIndex();
  setTimeout(()=>inp.focus(),50);
}
function closeSearch(){const s=$("#search");s.classList.remove("open");s._pushed=false;
  if(location.hash==="#search")history.replaceState({tab:CURRENT_TAB},"","#"+(CURRENT_TAB||"home"));}
window.closeSearch=closeSearch;
let _searchT=null;
function runSearch(q){q=q.trim();const out=$("#searchResults");
  if(q.length<2){out.innerHTML=`<div class="empty">Type at least two characters.</div>`;return;}
  const lc=q.toLowerCase();
  let hits=SEARCH_INDEX.filter(r=>r.lc.includes(lc));
  if(!hits.length){out.innerHTML=`<div class="empty">No results for “${esc(q)}”.</div>`;return;}
  // rank every hit by relevance so the most obvious match is always first
  hits.forEach(h=>h._sc=scoreHit(h,lc));
  hits.sort((a,b)=>b._sc-a._sc||a.labelLc.localeCompare(b.labelLc));
  hits=hits.slice(0,200);
  const order=["Unit","Contingency","Corporate","Operation","Rule","Modifier","Keyword","Ability","Term"];
  const PLURAL={Unit:"Units",Contingency:"Contingency Cards",Corporate:"Corporate Traits",Operation:"Operations",Rule:"Rules",Modifier:"Modifiers",Keyword:"Keywords",Ability:"Personal Abilities",Term:"Game Terms"};
  const groups={};hits.forEach(h=>{(groups[h.type]=groups[h.type]||[]).push(h);});
  // float the group holding the strongest match to the top; canonical order breaks ties
  const present=Object.keys(groups).sort((a,b)=>(groups[b][0]._sc-groups[a][0]._sc)||(order.indexOf(a)-order.indexOf(b)));
  out.innerHTML=present.map(t=>`<div class="sgrp"><div class="sgh">${esc(PLURAL[t]||t)} <span>${groups[t].length}</span></div>
    ${groups[t].map(h=>`<button class="sres" data-i="${SEARCH_INDEX.indexOf(h)}">
      <span class="sl" translate="no">${hl(h.label,q)}</span><span class="ss" translate="no">${esc(h.sub)}</span></button>`).join("")}</div>`).join("");
  $$("#searchResults .sres",out).forEach(b=>b.onclick=()=>{const r=SEARCH_INDEX[+b.dataset.i];closeSearch();r.go();});
}

/* ============================================================
   UNIVERSAL: TRANSLATE — native-first, three honest paths
   1) Chrome/Edge (incl. the wrapped Android app): the browser's BUILT-IN
      on-device Translator API. Translates in place, no server, and once a
      language pack is downloaded it keeps working with no connection.
   2) The wrapped iOS app: hands the page to Safari, whose own on-device
      translation takes over (Apple exposes no translate API to web content).
   3) Anything else: the legacy Google website-translator widget, but now
      with a progress bar and an honest failure message instead of silence.
   Protected game terms carry translate="no" and are never sent or altered.
   ============================================================ */
const LANGS=[
 ["af","Afrikaans"],["sq","Albanian"],["ar","Arabic"],["hy","Armenian"],["az","Azerbaijani"],
 ["eu","Basque"],["be","Belarusian"],["bn","Bengali"],["bs","Bosnian"],["bg","Bulgarian"],
 ["ca","Catalan"],["zh-CN","Chinese (Simplified)"],["zh-TW","Chinese (Traditional)"],["hr","Croatian"],
 ["cs","Czech"],["da","Danish"],["nl","Dutch"],["et","Estonian"],["fi","Finnish"],["fr","French"],
 ["gl","Galician"],["ka","Georgian"],["de","German"],["el","Greek"],["gu","Gujarati"],
 ["ht","Haitian Creole"],["he","Hebrew"],["hi","Hindi"],["hu","Hungarian"],["is","Icelandic"],
 ["id","Indonesian"],["ga","Irish"],["it","Italian"],["ja","Japanese"],["kn","Kannada"],
 ["ko","Korean"],["lv","Latvian"],["lt","Lithuanian"],["mk","Macedonian"],["ms","Malay"],
 ["mt","Maltese"],["no","Norwegian"],["fa","Persian"],["pl","Polish"],["pt","Portuguese"],
 ["ro","Romanian"],["ru","Russian"],["sr","Serbian"],["sk","Slovak"],["sl","Slovenian"],
 ["es","Spanish"],["sw","Swahili"],["sv","Swedish"],["ta","Tamil"],["te","Telugu"],
 ["th","Thai"],["tr","Turkish"],["uk","Ukrainian"],["ur","Urdu"],["vi","Vietnamese"],["cy","Welsh"]
];
function xlName(code){const h=LANGS.find(l=>l[0]===code);return h?h[1]:code;}

/* ---------- platform ---------- */
const XL_IOS_WRAP=/PWAShell|MERCSApp/.test(navigator.userAgent||"");
function xlHasNative(){try{return typeof Translator!=="undefined"&&typeof Translator.create==="function";}catch(e){return false;}}

/* ---------- state ---------- */
const XL={lang:"",busy:false,tr:null,trLang:"",obs:null,touched:[],cache:null,pend:null};
const XL_LANGKEY="mercs.v1.xlang";
const XL_CACHEKEY="mercs.v1.xlcache";

function xlCache(){if(XL.cache)return XL.cache;
  try{XL.cache=JSON.parse(localStorage.getItem(XL_CACHEKEY)||"{}");}catch(e){XL.cache={};}
  if(!XL.cache||typeof XL.cache!=="object")XL.cache={};
  return XL.cache;}
function xlCacheSave(){try{const s=JSON.stringify(XL.cache||{});
    if(s.length>700000){XL.cache={};return;}                 /* bounded: drop rather than grow forever */
    localStorage.setItem(XL_CACHEKEY,s);}catch(e){}}

/* ---------- progress bar (never itself translated) ---------- */
function xlBar(msg,pct){
  let b=document.getElementById("xlbar");
  if(!b){b=document.createElement("div");b.id="xlbar";b.setAttribute("translate","no");
    b.innerHTML='<span class="xlmsg"></span><span class="xlpct"></span><i class="xlfill"></i>';
    document.body.appendChild(b);}
  b.querySelector(".xlmsg").textContent=msg||"";
  b.querySelector(".xlpct").textContent=(pct==null?"":pct+"%");
  b.querySelector(".xlfill").style.width=(pct==null?0:Math.max(2,Math.min(100,pct)))+"%";
  b.classList.add("show");
}
function xlBarHide(){const b=document.getElementById("xlbar");if(b)b.classList.remove("show");}

/* ---------- protected MERCS vocabulary ----------
   A string that IS one of the game's proper nouns is never sent for translation,
   wherever it appears (labels, headings, chips). Prose that merely mentions a term
   still translates — terms inside sentences are protected by markup, not by this list. */
const XL_TERMS=new Set(["mercs","megacon","megacons","contingency","contingency draw",
  "corporate trait","corporate traits","operation","operations","strike team",
  "strike team builder","reference card","reference cards","recon"]);
function xlProtected(t){
  const k=t.toLowerCase();
  if(XL_TERMS.has(k))return true;
  try{if(window.DATA&&DATA.factions&&DATA.factions.some(f=>String(f).toLowerCase()===k))return true;}catch(e){}
  return false;
}

/* ---------- which text nodes may be translated ---------- */
const XL_SKIP='[translate="no"],.notranslate,#gte,#xlbar,#pop,script,style,noscript,svg,select,textarea,input,code,pre,.langlist';
function xlNodes(root){
  const out=[];
  const w=document.createTreeWalker(root||document.body,NodeFilter.SHOW_TEXT,null);
  let n;
  while((n=w.nextNode())){
    const v=n.nodeValue;if(!v)continue;
    const t=v.trim();
    if(t.length<2)continue;
    if(!/[A-Za-z]{2}/.test(t))continue;                       /* numbers/glyphs alone: nothing to translate */
    if(xlProtected(t))continue;                               /* a MERCS proper noun on its own stays English */
    const p=n.parentElement;
    if(!p||p.closest(XL_SKIP))continue;
    out.push(n);
  }
  return out;
}

/* ---------- apply / revert ---------- */
function xlSet(n,text){
  const t=n.nodeValue.trim();
  XL.touched.push([n,n.nodeValue]);
  n.nodeValue=n.nodeValue.replace(t,text);
}
function xlRevert(){
  for(let i=XL.touched.length-1;i>=0;i--){try{XL.touched[i][0].nodeValue=XL.touched[i][1];}catch(e){}}
  XL.touched=[];
}

/* ---------- native (Chrome/Edge on-device) ---------- */
async function xlNativeTranslate(code,nodes,quiet){
  const cache=xlCache(),pfx=code+"";
  const uniq=new Map();
  nodes.forEach(n=>{const k=n.nodeValue.trim();if(!uniq.has(k))uniq.set(k,[]);uniq.get(k).push(n);});
  const need=[];
  uniq.forEach((_,k)=>{if(cache[pfx+k]==null)need.push(k);});
  if(need.length){
    if(!XL.tr||XL.trLang!==code){
      if(!quiet)xlBar("Preparing "+xlName(code)+"…",null);
      XL.tr=await Translator.create({sourceLanguage:"en",targetLanguage:code,
        monitor(m){m.addEventListener("downloadprogress",e=>{
          if(!quiet)xlBar("Downloading "+xlName(code)+" — one time only…",Math.round((e.loaded||0)*100));});}});
      XL.trLang=code;
    }
    let done=0;const queue=need.slice();
    const worker=async()=>{while(queue.length){const s=queue.shift();
      try{cache[pfx+s]=await XL.tr.translate(s);}catch(e){cache[pfx+s]=s;}
      done++;if(!quiet&&(done%4===0||done===need.length))xlBar("Translating…",Math.round(done/need.length*100));}};
    await Promise.all(Array.from({length:Math.min(6,queue.length)},worker));
    xlCacheSave();
  }
  uniq.forEach((list,k)=>{const out=cache[pfx+k];if(out==null||out===k)return;list.forEach(n=>xlSet(n,out));});
}

/* Re-translate anything the app renders later (panels, modals, search results). */
function xlObserve(){
  if(XL.obs||!("MutationObserver" in window))return;
  XL.obs=new MutationObserver(muts=>{
    if(!XL.lang||XL.busy)return;
    let added=false;
    for(const m of muts){if(m.addedNodes&&m.addedNodes.length){added=true;break;}}
    if(!added)return;
    clearTimeout(XL.pend);
    XL.pend=setTimeout(async()=>{
      if(!XL.lang||XL.busy)return;
      const fresh=xlNodes(document.body).filter(n=>!XL.touched.some(p=>p[0]===n));
      if(!fresh.length)return;
      XL.busy=true;
      try{await xlNativeTranslate(XL.lang,fresh,true);}catch(e){}
      XL.busy=false;
    },260);
  });
  XL.obs.observe(document.body,{childList:true,subtree:true});
}
function xlUnobserve(){if(XL.obs){XL.obs.disconnect();XL.obs=null;}clearTimeout(XL.pend);}

/* ---------- legacy Google widget (fallback only) ---------- */
let _gteState="idle";
function _gteInject(){
  if(_gteState==="loading"||_gteState==="ready")return;
  _gteState="loading";
  window.googleTranslateElementInit=function(){
    try{new google.translate.TranslateElement({pageLanguage:"en",autoDisplay:false},"gte");_gteState="ready";}
    catch(e){_gteState="failed";}
  };
  const sc=document.createElement("script");
  sc.src="https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit";
  sc.onerror=()=>{_gteState="failed";};
  document.head.appendChild(sc);
}
/* Restoring the original English on the legacy path.
   Setting .goog-te-combo back to "" does NOT reliably untranslate — verified failing on the
   wrapped Android app and on iPhone. The widget's own state lives in the `googtrans` cookie,
   so the deterministic restore is: clear that cookie on every scope it may have been set
   under, forget our saved choice, and reload. Everything is service-worker cached, so the
   reload is fast and the app restores the tab you were on. */
function xlClearGoogTrans(){
  var host=location.hostname, parts=host.split(".");
  var domains=["",host,"."+host];
  if(parts.length>2)domains.push("."+parts.slice(-2).join("."));
  var paths=["/",""+location.pathname];
  domains.forEach(function(d){paths.forEach(function(pa){
    try{document.cookie="googtrans=;expires=Thu, 01 Jan 1970 00:00:01 GMT;path="+(pa||"/")+(d?";domain="+d:"");}catch(e){}
  });});
}
function xlLegacyRestore(){
  xlBar("Restoring English…",null);
  try{localStorage.removeItem(XL_LANGKEY);}catch(e){}
  xlClearGoogTrans();
  setTimeout(function(){location.reload();},120);
}
function xlLegacy(code){
  _gteInject();
  const probe=xlNodes(document.body)[0];
  const before=probe?probe.nodeValue:"";
  xlBar(code?"Translating…":"Restoring English…",null);
  const deadline=Date.now()+30000;
  let applied=false;
  const poll=setInterval(()=>{
    if(_gteState==="failed"){clearInterval(poll);xlBarHide();
      toast("Translation is unavailable right now — please try again with a connection.");return;}
    const sel=document.querySelector(".goog-te-combo");
    if(sel&&!applied){sel.value=code;sel.dispatchEvent(new Event("change"));applied=true;}
    const changed=probe&&probe.nodeValue!==before;
    if(changed||(!code&&applied)){clearInterval(poll);xlBarHide();
      toast(code?("Translated to "+xlName(code)):"Showing the original English");return;}
    if(Date.now()>deadline){clearInterval(poll);xlBarHide();
      toast("Translation is taking too long — please try again with a connection.");}
  },400);
}

/* ---------- the one entry point ---------- */
async function setTranslate(code){
  popClose();
  if(XL.busy)return;
  if(!xlHasNative()){
    if(!code){xlLegacyRestore();return;}          /* deterministic restore — see xlLegacyRestore */
    xlLegacy(code);return;
  }
  XL.busy=true;
  try{
    xlUnobserve();
    xlRevert();                                   /* always start from the real English */
    if(!code){XL.lang="";try{localStorage.removeItem(XL_LANGKEY);}catch(e){}
      xlBarHide();toast("Showing the original English");return;}
    xlBar("Preparing "+xlName(code)+"…",null);
    await xlNativeTranslate(code,xlNodes(document.body),false);
    XL.lang=code;
    try{localStorage.setItem(XL_LANGKEY,code);}catch(e){}
    xlBarHide();
    toast("Translated to "+xlName(code)+" — game terms stay in English");
    xlObserve();
  }catch(e){
    xlRevert();XL.lang="";xlBarHide();
    toast("Couldn’t translate — a connection is needed the first time you use a language.");
  }finally{XL.busy=false;}
}
window.setTranslate=setTranslate;

/* Re-apply the chosen language on launch, but ONLY if its pack is already on the
   device — never surprise anyone with a download or a wait at startup. */
async function xlRestore(){
  let saved="";try{saved=localStorage.getItem(XL_LANGKEY)||"";}catch(e){}
  if(!saved||!xlHasNative()||XL_IOS_WRAP)return;
  try{
    const a=await Translator.availability({sourceLanguage:"en",targetLanguage:saved});
    if(a!=="available")return;
    XL.busy=true;
    await xlNativeTranslate(saved,xlNodes(document.body),true);
    XL.lang=saved;XL.busy=false;xlObserve();
  }catch(e){XL.busy=false;}
}

/* ---------- picker ---------- */
function xlSafariHandoff(){
  try{if(window.webkit&&window.webkit.messageHandlers&&window.webkit.messageHandlers.openInSafari){
    window.webkit.messageHandlers.openInSafari.postMessage(location.href);return;}}catch(e){}
  window.open(location.href,"_blank","noopener");
}
window.xlSafariHandoff=xlSafariHandoff;

function translatePicker(){
  if(XL_IOS_WRAP){
    popOpen('<div translate="no"><h4>Translate</h4>'
      +'<p class="small muted" style="margin:.1rem 0 .8rem">This page opens in Safari, which translates it on your device. '
      +'Tap <b>aA</b> in the Safari toolbar, choose <b>Translate</b>, then pick your language. Core game terms stay in English.</p>'
      +'<button class="btn" style="width:100%" onclick="xlSafariHandoff();popClose()">Translate this page</button></div>');
    return;
  }
  const native=xlHasNative();
  const note=native
    ? "Translates this page on your device. The first use of a language downloads it once; after that it works with no connection. Core game terms stay in English."
    : "Translates this page. Core game terms stay in English. Needs an internet connection.";
  const cur=XL.lang?('<p class="small" style="margin:.1rem 0 .5rem"><b translate="no">'+esc(xlName(XL.lang))+'</b> is active.</p>'):"";
  const opts='<button class="langopt" data-lang="" translate="no">Show original (English)</button>'
    +LANGS.map(function(l){return '<button class="langopt" data-lang="'+esc(l[0])+'" translate="no">'+esc(l[1])+'</button>';}).join("");
  popOpen('<div translate="no"><h4>Translate</h4>'+cur
    +'<p class="small muted" style="margin:.1rem 0 .6rem">'+note+'</p>'
    +'<div class="langlist" id="langList">'+opts+'</div></div>');
  $$("#langList .langopt").forEach(function(b){b.onclick=function(){setTranslate(b.dataset.lang);};});
}
window.translatePicker=translatePicker;

/* ============================================================
   UNIVERSAL: SHOP + ABOUT/PRIVACY
   ============================================================ */
function shopMercs(){window.open("https://www.mercsminiatures.com/store","_blank","noopener");}
window.shopMercs=shopMercs;
function openAbout(){
  popOpen(`<h4>About &amp; Privacy</h4>
    <p class="small" style="color:var(--ink2)">The official MERCS Companion by <a href="https://digirunestudios.com" target="_blank" rel="noopener" class="dr-link"><b>DigiRune Studios</b></a>. A complete field reference for the MERCS 2.5 tabletop game — every unit, contingency card, corporate trait, operation, rule, modifier and keyword, plus seven battlefield tools and your Favorites.</p>
    <h4 style="font-size:1rem;margin-top:.8rem">Privacy</h4>
    <p class="small" style="color:var(--ink2)">The app works fully offline and shows <b>no ads</b>. Without signing in it collects <b>no personal data</b> &mdash; nothing leaves your device. Signing in with <b>Google</b> or <b>Apple</b> is optional; it creates a private account so your favorites, strike teams and trackers <b>sync across your devices</b>. We then store only your name, email and your in-app selections, using Google Firebase (Authentication + Firestore) as the processor. We never sell your data or use it for ads. You can delete your account and all synced data anytime from <b>Sign In &rarr; Delete account &amp; data</b>, or read the full policy and deletion steps at <a href="https://mercs.digirunestudios.com/privacy.html" target="_blank" rel="noopener" class="dr-link">mercs.digirunestudios.com/privacy</a>.</p>
    <h4 style="font-size:1rem;margin-top:.8rem">Credits &amp; License</h4>
    <p class="small" style="color:var(--ink2)">MERCS&trade; &copy; Fifth Angel Studios — used under license. All stats, cards and rules are transcribed verbatim from the MERCS 2.5 source. Interface icons are hand-authored by DigiRune Studios; fonts (Oswald, Days One, Barlow) are served from Google Fonts under the SIL Open Font License.</p>
    <div class="row" style="margin-top:.9rem"><button class="btn" id="abShop"><span class="ico" style="width:18px;height:18px;display:inline-block;vertical-align:-3px">${ICO.cart}</span> Shop MERCS</button></div>`);
  $("#abShop").onclick=shopMercs;
}
window.openAbout=openAbout;

/* ============================================================
   UNIVERSAL: MOBILE NAV MENU (hamburger — small screens)
   Mirrors the Twisted pattern: full-screen overlay listing all 8 sections
   as large tap targets, plus quick rows for Search / Tools / Translate /
   Low-light. Opening pushes history so Android Back closes it first.
   ============================================================ */
function buildNavMenu(){
  const list=$("#navList");if(!list)return;
  list.innerHTML=TABS.map(t=>`<button class="navlink" data-nav="${t.id}"><span class="nico">${t.ico}</span><span translate="no">${esc(t.t)}</span></button>`).join("");
  $$("#navList .navlink").forEach(b=>b.onclick=()=>{closeNav();navTo(b.dataset.nav);});
  const acts=$("#navActs");
  if(acts){
    acts.innerHTML=`
      <button class="navact" data-act="search"><span class="nico">${ICO.search}</span><span translate="no">Search</span></button>
      <button class="navact" data-act="translate"><span class="nico">${ICO.globe}</span><span translate="no">Translate</span></button>
      <button class="navact" data-act="tools"><span class="nico">${ICO.tools}</span><span translate="no">Tools</span></button>
      <button class="navact" data-act="theme"><span class="nico">${ICO.book}</span><span translate="no">Low-light</span></button>
      <button class="navact navact-wide" data-act="account"><span class="nico"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4.5 4-6.5 8-6.5s8 2 8 6.5"/></svg></span><span translate="no">Sign In</span></button>`;
    $$("#navActs .navact").forEach(b=>b.onclick=()=>{const a=b.dataset.act;closeNav();
      if(a==="search")openSearch();
      else if(a==="tools")openToolsMenu();
      else if(a==="translate")translatePicker();
      else if(a==="theme")toggleTheme(); else if(a==="account")openAccount();});
  }
}
function syncNavActive(){$$("#navList .navlink").forEach(b=>b.classList.toggle("on",b.dataset.nav===CURRENT_TAB));}
function openNav(){
  const m=$("#navMenu");if(!m)return;
  syncNavActive();
  m.classList.add("open");
  const hb=$("#navHamBtn");if(hb){hb.classList.add("in");hb.setAttribute("aria-expanded","true");}
  if(!m._pushed){history.pushState({nav:true},"","#menu");m._pushed=true;}
}
window.openNav=openNav;
function closeNav(){
  const m=$("#navMenu");if(!m)return;
  m.classList.remove("open");
  const hb=$("#navHamBtn");if(hb){hb.classList.remove("in");hb.setAttribute("aria-expanded","false");}
  if(m._pushed){m._pushed=false;
    if(location.hash==="#menu")history.replaceState({tab:CURRENT_TAB},"","#"+(CURRENT_TAB||"home"));}
}
window.closeNav=closeNav;

/* ============================================================
   SWIPE between tabs (55px X / 80px Y / 400ms; ignore in modals/inputs/scroll)
   ============================================================ */
(function(){
  let sx=0,sy=0,st=0,active=false,swiped=false;
  const overlayOpen=()=>$("#tools").classList.contains("open")||$("#pop").classList.contains("open")||$("#search").classList.contains("open")||($("#navMenu")&&$("#navMenu").classList.contains("open"));
  // hard-block swipe-nav only over real controls & overlays; tables/carousels are handled boundary-aware below
  const HARD=el=>{ if(!el)return false; return !!el.closest("input,textarea,select,.lb,.pop,.tools,.search,#navMenu"); };
  // nearest ancestor that can actually scroll horizontally (Modifiers tables, card-image rows, etc.)
  const hScroll=el=>{ while(el&&el.nodeType===1&&el!==document.body){ if(el.scrollWidth-el.clientWidth>4){const ox=getComputedStyle(el).overflowX; if(ox==="auto"||ox==="scroll")return el;} el=el.parentElement;} return null; };
  let sel=null;
  document.addEventListener("touchstart",e=>{
    swiped=false;
    if(overlayOpen()){active=false;return;}
    if(e.touches.length!==1||HARD(e.target)){active=false;return;}
    const t=e.touches[0];sx=t.clientX;sy=t.clientY;st=Date.now();sel=e.target;active=true;
  },{passive:true});
  document.addEventListener("touchend",e=>{
    if(!active)return;active=false;const t=e.changedTouches[0];
    const dx=t.clientX-sx,dy=t.clientY-sy,dt=Date.now()-st;
    // smooth + reliable: clearly-horizontal flick, generous time, modest distance
    if(dt>700)return;
    if(Math.abs(dx)<42)return;
    if(Math.abs(dx)<Math.abs(dy)*1.4)return;   // must be dominantly horizontal (not a scroll/diagonal)
    // let a horizontally-scrollable element (e.g. Modifiers tables) consume the swipe until it reaches its edge
    const sc=hScroll(sel);
    if(sc){const max=sc.scrollWidth-sc.clientWidth;
      if(dx<0&&sc.scrollLeft<max-1)return;   // room to scroll right -> scroll, don't switch tab
      if(dx>0&&sc.scrollLeft>1)return;}      // room to scroll left  -> scroll, don't switch tab
    const cur=TAB_IDS.indexOf(CURRENT_TAB);if(cur<0)return;
    let ni=cur+(dx<0?1:-1);
    if(ni<0||ni>=TAB_IDS.length)return;
    swiped=true; navTo(TAB_IDS[ni]);
  },{passive:true});
  // a registered swipe must NOT also fire a tap on the newly-shown tab
  document.addEventListener("click",e=>{ if(swiped){swiped=false;e.preventDefault();e.stopPropagation();} },true);
})();

/* ============================================================
   SERVICE-WORKER UPDATE TOAST
   ============================================================ */

/* service worker registration + update flow */
/* ============================================================
   LOW-LIGHT (DARK) THEME — light default + manual toggle
   ============================================================ */
function currentTheme(){return document.documentElement.getAttribute("data-theme")==="dark"?"dark":"light";}
function applyTheme(mode){
  const dark=mode==="dark";
  document.documentElement.setAttribute("data-theme",dark?"dark":"light");
  const m=document.querySelector('meta[name=theme-color]');
  if(m)m.setAttribute("content",dark?"#0e1c19":"#174541");
  const tb=$("#themeBtn");
  if(tb){tb.classList.toggle("in",dark);tb.setAttribute("title",dark?"Low-light mode on":"Low-light mode");}
}
function setTheme(mode){try{localStorage.setItem("mercs.theme",mode);}catch(e){}applyTheme(mode);}
function toggleTheme(){setTheme(currentTheme()==="dark"?"light":"dark");}
function initTheme(){
  let t="light";try{t=localStorage.getItem("mercs.theme")==="dark"?"dark":"light";}catch(e){}
  applyTheme(t);
  const tb=$("#themeBtn");if(tb)tb.onclick=toggleTheme;
}
window.toggleTheme=toggleTheme;

/* ============================================================
   OFFLINE PRECACHE — first-launch image download + indicator
   ============================================================ */
function offReady(){try{return localStorage.getItem("mercs.offlineReady")==="1";}catch(e){return false;}}
function showOffbar(html,done){
  const b=$("#offbar");if(!b)return;
  const msg=b.querySelector(".offmsg");if(msg)msg.innerHTML=html;
  b.classList.toggle("done",!!done);
  b.classList.add("show");
}
function hideOffbar(){const b=$("#offbar");if(b)b.classList.remove("show");}
function initOffline(){
  if(!("serviceWorker" in navigator))return;
  navigator.serviceWorker.addEventListener("message",e=>{
    const d=e.data||{};
    if(d.type==="precache"){
      if(offReady())return; // already done on a prior launch — stay quiet
      showOffbar(`Saving cards for offline\u2026 <b>${d.done}/${d.total}</b>`);
    }else if(d.type==="precache-done"){
      try{localStorage.setItem("mercs.offlineReady","1");}catch(err){}
      showOffbar('<span class="ok">\u2713</span> Available offline',true);
      setTimeout(hideOffbar,2600);
    }
  });
  // Ask the SW to (re)start the precache if this device hasn't finished yet.
  if(!offReady()){
    const kick=()=>{const c=navigator.serviceWorker.controller;if(c)c.postMessage({type:"start-precache"});};
    if(navigator.serviceWorker.controller)kick();
    navigator.serviceWorker.addEventListener("controllerchange",kick);
    navigator.serviceWorker.ready.then(kick).catch(()=>{});
  }
}

function registerSW(){
  /* One-time confirmation shown after an automatic update reload. */
  try{ if(sessionStorage.getItem("mercs.v1.updated")==="1"){ sessionStorage.removeItem("mercs.v1.updated"); toast("Updated to the latest version"); } }catch(e){}
  if(!("serviceWorker" in navigator))return;
  if(/PWAShell|MERCSApp/.test(navigator.userAgent||"")) return; /* wrapped store build updates ship through the store */
  navigator.serviceWorker.register("sw.js").then(reg=>{
    if(reg.waiting&&navigator.serviceWorker.controller) autoApplyUpdate(reg.waiting); /* a worker left waiting from a prior visit */
    reg.addEventListener("updatefound",()=>{
      const nw=reg.installing;if(!nw)return;
      nw.addEventListener("statechange",()=>{
        /* installed + an existing controller => this is an UPDATE (not a first install): apply it automatically, no tap needed */
        if(nw.state==="installed"&&navigator.serviceWorker.controller) autoApplyUpdate(nw);
      });
    });
  }).catch(()=>{});
  let reloaded=false;
  navigator.serviceWorker.addEventListener("controllerchange",()=>{
    if(reloaded)return;reloaded=true;
    try{sessionStorage.setItem("mercs.v1.updated","1");}catch(e){}
    reloadWhenSafe();
  });
}
function autoApplyUpdate(worker){ try{ worker.postMessage("SKIP_WAITING"); }catch(e){} }
function reloadWhenSafe(){
  const safe=()=>{
    try{
      const ae=document.activeElement;
      if(ae&&(ae.tagName==="INPUT"||ae.tagName==="TEXTAREA"||ae.isContentEditable)) return false; /* don't wipe a half-typed search */
      const pop=document.getElementById("pop");
      if(pop&&pop.classList.contains("open")) return false; /* don't slam an open card/modal shut */
      const tools=document.getElementById("tools");
      if(tools&&tools.classList.contains("open")) return false; /* U3: don't wipe an in-progress Field Tool session (esp. guest, memory-only) */
    }catch(e){}
    return true;
  };
  if(safe()) return location.reload();
  const iv=setInterval(()=>{ if(safe()){ clearInterval(iv); location.reload(); } },1500);
  document.addEventListener("visibilitychange",function h(){ if(document.visibilityState==="visible"&&safe()){ clearInterval(iv); document.removeEventListener("visibilitychange",h); location.reload(); } });
}

/* ============================================================
   ACCOUNT
   ============================================================ */
const GLOGO='<svg width=\"18\" height=\"18\" viewBox=\"0 0 48 48\" aria-hidden=\"true\"><path fill=\"#EA4335\" d=\"M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z\"/><path fill=\"#4285F4\" d=\"M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z\"/><path fill=\"#FBBC05\" d=\"M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z\"/><path fill=\"#34A853\" d=\"M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z\"/></svg>';
const ALOGO='<svg width=\"15\" height=\"18\" viewBox=\"0 0 842 1000\" aria-hidden=\"true\"><path fill=\"currentColor\" d=\"M824.7 779c-15.1 34.9-33 67-53.7 96.5-28.3 40.2-51.5 68-69.4 83.5-27.8 25.4-57.6 38.4-89.5 39.1-22.9 0-50.5-6.5-82.7-19.7-32.3-13.1-62-19.6-89.2-19.6-28.5 0-59 6.5-91.6 19.6-32.6 13.2-58.9 20.1-79 20.8-30.6 1.3-61.1-12.1-91.6-40.2-19.4-16.9-43.6-45.7-72.6-86.4-31.1-43.5-56.7-93.9-76.8-151.4C10.6 658.3 0 600.4 0 544.3c0-64.3 13.9-119.7 41.8-166.1 21.9-37.3 51.1-66.7 87.6-88.3s75.9-32.6 118.3-33.3c24.3 0 56.1 7.5 95.6 22.2 39.4 14.8 64.7 22.3 75.8 22.3 8.3 0 36.4-8.8 84.1-26.3 45.1-16.2 83.2-22.9 114.4-20.3 84.6 6.8 148.1 40.2 190.3 100.4-75.7 45.9-113.1 110.1-112.4 192.4.7 64.1 24 117.5 69.8 159.9 20.8 19.7 44 34.9 69.8 45.7-5.6 16.2-11.5 31.7-17.8 46.6zM623.5 20.7c0 48-17.5 92.8-52.5 134.3-42.2 49.3-93.2 77.8-148.6 73.3-.7-5.8-1.1-11.9-1.1-18.3 0-46.1 20-95.4 55.6-135.7 17.8-20.4 40.4-37.4 67.9-51 27.4-13.4 53.3-20.8 77.7-22.1.7 5.8 1 11.7 1 17.6z\"/></svg>';
function openAccount(){
  const A=ACCOUNT;
  if(A&&A.mode==='cloud'){
    const who=esc(A.name||A.email||'your account');
    const prov=A.provider==='apple.com'?'Apple':(A.provider==='google.com'?'Google':'your account');
    const st=(window.__mercsSync&&window.__mercsSync.statusText)?window.__mercsSync.statusText:'Synced across your devices';
    popOpen(`<h4>Account</h4>
      <p class="small">Signed in with <b>${prov}</b> as <b translate="no">${who}</b>.</p>
      <p class="small muted" id="acSync">${esc(st)}</p>
      <p class="small muted">Your favorites, strike teams and tracker state sync automatically across every device you sign in on.</p>
      <div class="row" style="margin-top:.8rem"><button class="btn" id="acOut">Sign out</button></div>
      <div class="row" style="margin-top:.5rem"><button class="btn danger" id="acDelete">Delete account &amp; data</button></div>
      <p class="small muted" style="margin-top:.5rem">Deleting permanently removes your synced data and your sign-in account. <a href="#" id="acPriv" class="dr-link">Privacy</a>.</p>`);
    $("#acOut").onclick=()=>{signOut();popClose();};
    $("#acDelete").onclick=()=>confirmDeleteAccount();
    const _p=$("#acPriv"); if(_p)_p.onclick=(e)=>{e.preventDefault();popClose();openAbout();};
  }else if(A&&A.mode==='device'){
    popOpen(`<h4>Saved on this device</h4>
      <p class="small muted">Your selections are saved on <b>this device</b> only. Sign in to sync them across all your devices.</p>
      <div class="signin-official">
        <button class="gsi-btn" id="siGoogle">${GLOGO}<span>Sign in with Google</span></button>
        <button class="asi-btn" id="siApple">${ALOGO}<span>Sign in with Apple</span></button>
      </div>
      <div class="row" style="margin-top:.35rem"><button class="btn ghost sm" id="siStop">Stop saving on this device</button></div>`);
    $("#siGoogle").onclick=()=>{if(window.__mercsSync)window.__mercsSync.signInGoogle();};
    $("#siApple").onclick=()=>{if(window.__mercsSync)window.__mercsSync.signInApple();};
    $("#siStop").onclick=()=>{signOut();popClose();};
  }else{
    popOpen(`<h4>Sign in to sync</h4>
      <p class="small muted">Keep your favorites, strike teams and trackers and sync them across all your devices. Optional &mdash; you can also just save on this device.</p>
      <div class="signin-official">
        <button class="gsi-btn" id="siGoogle">${GLOGO}<span>Sign in with Google</span></button>
        <button class="asi-btn" id="siApple">${ALOGO}<span>Sign in with Apple</span></button>
      </div>
      <div class="row" style="margin-top:.2rem"><button class="btn ghost sm" id="siDevice">Just save on this device</button></div>
      <p class="small muted" style="margin-top:.55rem">Signing in creates a private account that stores only your in-app selections &mdash; no tracking, no ads. You can delete it anytime. <a href="#" id="siPriv" class="dr-link">Privacy</a>.</p>`);
    $("#siGoogle").onclick=()=>{if(window.__mercsSync)window.__mercsSync.signInGoogle();};
    $("#siApple").onclick=()=>{if(window.__mercsSync)window.__mercsSync.signInApple();};
    $("#siDevice").onclick=()=>{signInDevice();popClose();};
    const _p=$("#siPriv"); if(_p)_p.onclick=(e)=>{e.preventDefault();popClose();openAbout();};
  }
}
function confirmDeleteAccount(){
  popOpen(`<h4>Delete account &amp; data?</h4>
    <p class="small">This permanently deletes your synced data and your sign-in account. Copies on your other devices are removed on their next sync. This can't be undone.</p>
    <div class="row" style="margin-top:.85rem"><button class="btn danger" id="dlYes">Delete everything</button> <button class="btn ghost" id="dlNo">Cancel</button></div>`);
  $("#dlNo").onclick=popClose;
  $("#dlYes").onclick=()=>{ if(window.__mercsSync)window.__mercsSync.deleteAccount(); popClose(); };
}
window.openAccount=openAccount;

/* ============================================================
   BOOT
   ============================================================ */

/* ---------- launch splash: fade out shortly after load, dismiss on tap, remove from layout ---------- */
function initLaunchSplash(){
  const el=$("#launchSplash");if(!el)return;
  let done=false;
  const remove=()=>{el.classList.add("fadeout");
    const fin=()=>{el.style.display="none";el.setAttribute("aria-hidden","true");};
    el.addEventListener("animationend",fin,{once:true});
    setTimeout(fin,600);};
  const dismiss=()=>{if(done)return;done=true;clearTimeout(t);remove();};
  el.addEventListener("click",dismiss,{once:true});
  el.addEventListener("touchstart",dismiss,{once:true,passive:true});
  const t=setTimeout(dismiss,1400);
}

/* ---------- first-run tip: sign-in syncs across devices (optional) — Forge CHECK 1.5 ---------- */
function initSyncTip(){
  try{ if(localStorage.getItem("mercs.v1.synctip")) return; }catch(e){}
  if(ACCOUNT) return;                       // already saving/synced -> no prompt
  setTimeout(()=>{
    try{ if(localStorage.getItem("mercs.v1.synctip")) return; }catch(e){}
    if(ACCOUNT || document.getElementById("syncTip")) return;
    const bar=document.createElement("div"); bar.id="syncTip";
    bar.innerHTML=`<span class="stx"><b>Sync across your devices</b> &mdash; sign in to keep your favorites, teams &amp; trackers on every device. Optional, anytime.</span>`+
      `<button class="stgo" id="stGo">Sign in</button><button class="stx-close" id="stX" aria-label="Dismiss">&#10005;</button>`;
    const done=()=>{ try{localStorage.setItem("mercs.v1.synctip","1");}catch(e){} if(bar.parentNode)bar.parentNode.removeChild(bar); };
    document.body.appendChild(bar);
    const g=$("#stGo",bar); if(g)g.onclick=()=>{ done(); openAccount(); };
    const x=$("#stX",bar);  if(x)x.onclick=done;
  }, 1600);
}

function boot(){
  restoreSession();
  // build tab bar
  $("#tabbar").innerHTML=TABS.map(t=>`<button class="tab" data-tab="${t.id}"><span class="tico">${t.ico}</span><span class="tlbl" translate="no">${esc(t.t)}</span></button>`).join("");
  $$("#tabbar .tab").forEach(b=>b.onclick=()=>navTo(b.dataset.tab));
  // header buttons
  $("#acctBtn").onclick=openAccount;updateAccountUI();
  // header logo acts as a Home control (role=button on the <img>)
  const _barLogo=$("#barLogo");
  if(_barLogo){
    _barLogo.onclick=()=>navTo("home");
    _barLogo.addEventListener("keydown",e=>{if(e.key==="Enter"||e.key===" "){e.preventDefault();navTo("home");}});
  }

  $("#searchBtn").onclick=openSearch;
  $("#searchClose").onclick=closeSearch;
  $("#searchInput").oninput=e=>{clearTimeout(_searchT);const q=e.target.value;_searchT=setTimeout(()=>runSearch(q),200);};
  $("#xlateBtn").onclick=translatePicker;
  $("#toolsBtn").onclick=openToolsMenu;
  $("#toolsClose").onclick=closeTools;
  $("#toolsBack").onclick=openToolsMenu;
  // mobile hamburger nav
  buildNavMenu();
  const _ham=$("#navHamBtn");if(_ham)_ham.onclick=openNav;
  const _nc=$("#navCloseBtn");if(_nc)_nc.onclick=closeNav;
  const _nm=$("#navMenu");if(_nm)_nm.onclick=e=>{if(e.target.id==="navMenu")closeNav();};
  // pop backdrop dismiss
  $("#pop").onclick=e=>{if(e.target.id==="pop")popClose();};
  $("#tools").onclick=e=>{if(e.target.id==="tools")closeTools();};
  $("#search").onclick=e=>{if(e.target.id==="search")closeSearch();};
  // Esc handling
  document.addEventListener("keydown",e=>{if(e.key==="Escape"){
    if($("#navMenu")&&$("#navMenu").classList.contains("open"))closeNav();
    else if($("#pop").classList.contains("open"))popClose();
    else if($("#search").classList.contains("open"))closeSearch();
    else if($("#tools").classList.contains("open"))closeTools();
  }});
  // NOTE: do NOT set translate="no" on <html> — that would block the in-page Google
  // Translate Element entirely. Per-element translate="no" wraps still protect MERCS terms.
  // initial route
  const id=(location.hash||"#home").slice(1);
  const start=TAB_IDS.includes(id)?id:"home";
  history.replaceState({tab:start},"","#"+start);
  navTo(start,{fromPopstate:true});
  initTheme();
  initLaunchSplash();     /* U4: dismiss the splash BEFORE SW/offline init so a throw there can't leave it covering the app */
  registerSW();
  initOffline();
  initSyncTip();
  xlRestore();            /* re-apply a previously chosen language if its pack is already on-device */
}
boot();
