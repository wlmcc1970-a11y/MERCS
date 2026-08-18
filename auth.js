/* ============================================================================
   MERCS Companion — cloud sign-in + cross-device sync   (window.__mercsSync)
   ----------------------------------------------------------------------------
   Google + Apple via Firebase Authentication. The WHOLE SESSION object (favorites,
   strike teams, tracker/round state) is mirrored to Firestore at users/{uid}.blob,
   so a signed-in player's saves follow them to every device. This is an ONLINE-ONLY
   enhancement layered on top of app.js: if Firebase can't load (offline / blocked),
   the app keeps working and sign-in simply reports unavailable.

   Mirrors the shipped Twisted pattern (decideSync / mergeMaps / onSnapshot device
   guard) and is WRAPPER-AWARE: inside the native iOS/Android shell the same buttons
   route through the native sign-in bridge instead of a WebView popup, so this one
   file drives both the web PWA and the store apps — Flawless Day One, no rebuild.

   NOTE: the Firebase web config below is PUBLIC by design — it ships in every client.
   Security comes from Firebase Auth + the Firestore rule (users/{uid} self-only),
   NOT from hiding these values.
   ============================================================================ */
(function(){
  "use strict";

  /* ── Firebase web config ──────────────────────────────────────────────────
     >>> REPLACE the six values below with the MERCS Firebase project's web config
     (Firebase Console -> Project settings -> Your apps -> Web app -> SDK setup ->
     Config). Until real values are pasted, the app runs normally and the sign-in
     buttons explain that sync isn't configured yet. */
  var cfg = {
    apiKey:            "AIzaSyBcW-XiybutnZOuLZGmPM8qyLRh56Jc1rY",
    authDomain:        "login.digirunestudios.com",
    projectId:         "mercs-companion",
    storageBucket:     "mercs-companion.firebasestorage.app",
    messagingSenderId: "14229288118",
    appId:             "1:14229288118:web:ad37ab03fbec6e6a7c2217"
  };
  var CONFIGURED = cfg.apiKey.indexOf("PASTE_") !== 0;      // guard: never call Firebase with placeholders
  var FB = "https://www.gstatic.com/firebasejs/10.12.2/";

  /* ── native shell (wrapper) detection ─────────────────────────────────────
     The wrapped app sets a custom User-Agent (…PWAShell / MERCSApp) and exposes
     WKScriptMessageHandlers. On web + Android Chrome we use signInWithPopup. */
  var UA = navigator.userAgent || "";
  var IN_WRAPPER = /PWAShell|MERCSApp/.test(UA);
  var USE_REDIRECT = /Android|iPhone|iPad|iPod|Mobi/i.test(UA);  // mobile web: redirect is more reliable than a popup
  function nativeHandler(name){
    try { return !!(window.webkit && window.webkit.messageHandlers && window.webkit.messageHandlers[name]); }
    catch(e){ return false; }
  }
  function postNative(name){ try{ window.webkit.messageHandlers[name].postMessage(""); }catch(e){} }

  /* ── device id — echo guard so a device ignores its own live snapshots ──── */
  function deviceId(){
    var d=null; try{ d=localStorage.getItem(SAVE_DEVICE); }catch(e){}
    if(!d){ d='dev_'+Math.random().toString(36).slice(2)+Date.now().toString(36);
      try{ localStorage.setItem(SAVE_DEVICE,d); }catch(e){} }
    return d;
  }

  /* ── SESSION <-> cloud blob helpers (SESSION is the sync unit) ──────────── */
  function snapshotLocal(){ try{ return JSON.parse(JSON.stringify(SESSION||{})); }catch(e){ return {}; } }
  function keyCount(o){ try{ return o?Object.keys(o).length:0; }catch(e){ return 0; } }
  function unionArr(a,b){ var s=Array.isArray(a)?a.slice():[]; (Array.isArray(b)?b:[]).forEach(function(x){ if(s.indexOf(x)<0)s.push(x); }); return s; }
  function unionFavs(cf,lf){ if(!cf&&!lf)return undefined; cf=cf||{}; lf=lf||{};
    return { units:unionArr(cf.units,lf.units), contingency:unionArr(cf.contingency,lf.contingency), operations:unionArr(cf.operations,lf.operations) }; }
  function baseGet(){ try{ return (typeof syncBaseGet==='function')?syncBaseGet():{}; }catch(e){ return {}; } }
  function baseSet(o){ try{ if(typeof syncBaseSet==='function') syncBaseSet(o); }catch(e){} }
  /* 3-way merge (S1/S2): cloud is the base truth; overlay ONLY the keys this device changed since the last
     sync (SESSION vs the persisted base) so a stale preloaded mirror never clobbers a newer device; a key
     deleted locally is dropped from cloud; favourites are ALWAYS unioned so no star is ever lost. */
  function reconcile(cloud, base, local){
    var merged={}, k, changed=false;
    for(k in cloud) merged[k]=cloud[k];
    for(k in local){ if(k==='favs')continue; if(JSON.stringify(local[k])!==JSON.stringify(base[k])){ merged[k]=local[k]; changed=true; } }
    for(k in base){ if(k!=='favs' && !(k in local) && (k in merged)){ delete merged[k]; changed=true; } }
    var uf=unionFavs(cloud.favs, local.favs); if(uf!==undefined) merged.favs=uf;
    return merged;
  }
  function adopt(obj){                     // replace SESSION with obj; persist mirror+base+dv; repaint; return changed
    var before=JSON.stringify(SESSION||{});
    SESSION = obj || {};
    try{ if(ACCOUNT){ localStorage.setItem(SAVE_LOCAL, JSON.stringify(SESSION)); if(typeof SAVE_DV!=='undefined') localStorage.setItem(SAVE_DV, String(DATA_VERSION)); } }catch(e){}
    var changed = JSON.stringify(SESSION)!==before;
    if(changed){ try{ rebuildAll(); }catch(e){} }
    return changed;
  }

  /* ── public API (referenced by app.js's Store + account modal) ──────────── */
  var api = {
    statusText: 'Cloud sync (off)',
    schedulePush: function(){},
    signInGoogle: function(){ toast("Sign-in unavailable"); },
    signInApple:  function(){ toast("Sign-in unavailable"); },
    signOutCloud: function(){},
    deleteAccount:function(){ toast("Not ready yet — try again in a moment"); }
  };
  window.__mercsSync = api;

  if(!CONFIGURED){
    api.signInGoogle = api.signInApple = function(){ toast("Sign-in isn't configured yet"); };
    api.statusText = 'Cloud sync (not configured)';
    return;
  }

  Promise.all([
    import(FB+"firebase-app.js"),
    import(FB+"firebase-auth.js"),
    import(FB+"firebase-firestore.js")
  ]).then(function(m){
    var appMod=m[0], authMod=m[1], fsMod=m[2];
    var app = appMod.initializeApp(cfg);
    var auth = authMod.getAuth(app);
    var db  = fsMod.getFirestore(app);

    var googleProvider = new authMod.GoogleAuthProvider();
    var appleProvider  = new authMod.OAuthProvider('apple.com');
    appleProvider.addScope('email'); appleProvider.addScope('name');

    var currentUser=null, unsub=null, pushTimer=null, firstAuthCb=true;
    authMod.getRedirectResult(auth).catch(function(){});   // finalize a mobile redirect sign-in

    function docRef(uid){ return fsMod.doc(db,'users',uid); }
    function setStatus(t){ api.statusText=t; var e=document.getElementById('acSync'); if(e)e.textContent=t; }
    function pushMap(map){
      if(!currentUser)return;
      var pushed = JSON.parse(JSON.stringify(map||{}));   // FREEZE what we push: a later in-place SESSION edit must not retro-alter the confirmed base
      fsMod.setDoc(docRef(currentUser.uid), { blob:JSON.stringify(pushed), updatedAt:Date.now(), device:deviceId() })
        .then(function(){ baseSet(pushed); })   // the pushed snapshot is now the confirmed cloud state → new base (any later edit stays a delta)
        .catch(function(){});
    }
    function pushNow(){ pushMap(snapshotLocal()); }
    api.schedulePush = function(){ if(!currentUser)return; if(pushTimer)clearTimeout(pushTimer); pushTimer=setTimeout(pushNow,1500); };
    function syncReconcile(cloudBlob){
      if(keyCount(cloudBlob)===0){ if(hasLocalData()) pushMap(snapshotLocal()); return; }  // seed empty cloud; pushMap advances base only when the push is confirmed
      var merged = reconcile(cloudBlob, baseGet(), snapshotLocal());
      var changed = JSON.stringify(merged)!==JSON.stringify(cloudBlob);
      adopt(merged);                                  // SESSION + mirror + repaint (base left untouched)
      if(changed) pushMap(merged);                    // unconfirmed local delta — base advances ONLY when this push lands (else the edit stays a delta and re-pushes; no loss on a failed push)
      else baseSet(merged);                           // merged == cloud (server-confirmed) — safe to set base now
    }

    /* ── sign-in entrypoints — native bridge in the wrapper, popup on web ──── */
    api.signInGoogle = function(){
      setStatus('Opening Google sign-in...');
      if(IN_WRAPPER && nativeHandler('startGoogleSignIn')){ postNative('startGoogleSignIn'); return; }
      if(USE_REDIRECT){ authMod.signInWithRedirect(auth, googleProvider); return; }
      authMod.signInWithPopup(auth, googleProvider).catch(function(e){
        if(e && (e.code==='auth/popup-blocked' || e.code==='auth/operation-not-supported-in-this-environment')){ authMod.signInWithRedirect(auth, googleProvider); return; }
        setStatus('Sign-in did not complete - tap to try again'); toast('Sign-in did not complete');
      });
    };
    api.signInApple = function(){
      setStatus('Opening Apple sign-in...');
      if(IN_WRAPPER && nativeHandler('startAppleSignIn')){ postNative('startAppleSignIn'); return; }
      if(USE_REDIRECT){ authMod.signInWithRedirect(auth, appleProvider); return; }
      authMod.signInWithPopup(auth, appleProvider).catch(function(e){
        if(e && (e.code==='auth/popup-blocked' || e.code==='auth/operation-not-supported-in-this-environment')){ authMod.signInWithRedirect(auth, appleProvider); return; }
        setStatus('Sign-in did not complete - tap to try again'); toast('Sign-in did not complete');
      });
    };

    /* ── native shell hands provider credentials back (no WebView popup) ───── */
    window.__onNativeGoogleCredential = function(idToken, accessToken){
      try{ var c=authMod.GoogleAuthProvider.credential(idToken, accessToken); authMod.signInWithCredential(auth, c).catch(function(){ toast('Google sign-in failed'); }); }catch(e){}
    };
    window.__onNativeAppleCredential = function(idToken, rawNonce){
      try{ var c=appleProvider.credential({ idToken:idToken, rawNonce:rawNonce }); authMod.signInWithCredential(auth, c).catch(function(){ toast('Apple sign-in failed'); }); }catch(e){}
    };
    window.__onNativeAuthError = function(){ setStatus('Sign-in did not complete - tap to try again'); };

    api.signOutCloud = function(){ authMod.signOut(auth); };

    /* ── delete account & all synced data (store requirement) ─────────────── */
    api.deleteAccount = function(){
      var u = auth.currentUser;
      if(!u){ toast('Not signed in'); return; }
      setStatus('Deleting your account...');
      fsMod.deleteDoc(docRef(u.uid)).catch(function(){}).then(function(){
        return u.delete();
      }).then(function(){
        try{ localStorage.removeItem(SAVE_LOCAL); }catch(e){}
        try{ localStorage.removeItem(SAVE_MODE); }catch(e){}
        try{ localStorage.removeItem(SAVE_ACCT); }catch(e){}
        try{ localStorage.removeItem(SAVE_BASE); }catch(e){}
        SESSION={}; ACCOUNT=null;
        try{ updateAccountUI(); rebuildAll(); }catch(e){}
        toast('Account and data deleted');
      }).catch(function(err){
        if(err && err.code==='auth/requires-recent-login'){
          setStatus('Please sign in again to confirm deletion');
          var isApple = u.providerData && u.providerData[0] && u.providerData[0].providerId==='apple.com';
          var prov = isApple ? appleProvider : googleProvider;
          authMod.reauthenticateWithPopup(u, prov).then(function(){ api.deleteAccount(); }).catch(function(){ toast('Could not confirm - please try again'); });
        } else {
          toast('Delete failed - please try again'); setStatus('Cloud sync on');
        }
      });
    };

    /* ── auth state: establish/clear the cloud session + live sync ────────── */
    authMod.onAuthStateChanged(auth, function(user){
      currentUser = user;
      if(unsub){ try{ unsub(); }catch(e){} unsub=null; }

      if(user){
        var pid = (user.providerData && user.providerData[0] && user.providerData[0].providerId) || '';
        ACCOUNT = { mode:'cloud', uid:user.uid, provider:pid, name:user.displayName||'', email:user.email||'', photo:user.photoURL||'' };
        try{ localStorage.setItem(SAVE_MODE,'cloud'); }catch(e){}
        try{ localStorage.setItem(SAVE_ACCT, JSON.stringify({name:ACCOUNT.name,email:ACCOUNT.email,photo:ACCOUNT.photo})); }catch(e){}   // S1: cache label for offline display
        try{ updateAccountUI(); }catch(e){}
        setStatus('Synced as ' + (user.email || user.displayName || 'your account'));
        try{ var _pm=document.getElementById('pop'); if(_pm && _pm.classList.contains('open') && typeof popClose==='function') popClose(); }catch(e){}
        if(!firstAuthCb){ try{ toast('Signed in as ' + String(user.displayName||user.email||'your account').split(' ')[0]); }catch(e){} }

        fsMod.getDoc(docRef(user.uid)).then(function(snap){
          var data = snap.exists() ? snap.data() : null;
          var cloudBlob = {};
          try{ cloudBlob = (data && data.blob) ? JSON.parse(data.blob) : {}; }catch(e){ cloudBlob = {}; }
          syncReconcile(cloudBlob);
          // live updates from this user's OTHER devices
          unsub = fsMod.onSnapshot(docRef(user.uid), function(s){
            if(!s.exists())return;
            var dd = s.data();
            if(!dd || !dd.blob) return;
            if(dd.device === deviceId()) return;      // ignore our own echo
            var rb={}; try{ rb=JSON.parse(dd.blob); }catch(e){ return; }
            syncReconcile(rb);                        // 3-way merge (keeps this device's unpushed edits), not a blind adopt
          });
        }).catch(function(){ setStatus('Sync error - will retry on next change'); });

      } else {
        if(ACCOUNT && ACCOUNT.mode==='cloud'){
          ACCOUNT=null;
          try{ localStorage.removeItem(SAVE_MODE); }catch(e){}
          try{ localStorage.removeItem(SAVE_ACCT); }catch(e){}
          try{ localStorage.removeItem(SAVE_BASE); }catch(e){}
          try{ updateAccountUI(); rebuildAll(); }catch(e){}
          toast('Signed out');
        }
        setStatus('Cloud sync (off)');
      }
      firstAuthCb = false;
    });

  }).catch(function(){
    // Firebase modules couldn't load (offline or blocked) — degrade gracefully.
    api.signInGoogle = api.signInApple = function(){ toast('Sign-in needs a connection'); };
    api.signOutCloud = api.deleteAccount = function(){ toast('Connect to the internet to manage your account'); };  // F3: no silent dead buttons offline
    api.statusText = 'Cloud sync unavailable offline';
  });
})();
