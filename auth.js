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
    authDomain:        "mercs-companion.firebaseapp.com",
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
  function mergeMaps(cloud, local){ var o={},k; for(k in cloud)o[k]=cloud[k]; for(k in local)o[k]=local[k]; return o; } // union, local wins
  function decideSync(cloudKeys, hasLocal){ if(cloudKeys===0)return hasLocal?'push':'noop'; return hasLocal?'merge':'pull'; }
  function adopt(obj){                     // replace SESSION with obj, persist + repaint; return changed
    var before=JSON.stringify(SESSION||{});
    SESSION = obj || {};
    try{ if(ACCOUNT){ localStorage.setItem(SAVE_LOCAL, JSON.stringify(SESSION)); } }catch(e){}
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
    deleteAccount:function(){}
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

    var currentUser=null, unsub=null, pushTimer=null;

    function docRef(uid){ return fsMod.doc(db,'users',uid); }
    function setStatus(t){ api.statusText=t; var e=document.getElementById('acSync'); if(e)e.textContent=t; }
    function pushMap(map){
      if(!currentUser)return;
      fsMod.setDoc(docRef(currentUser.uid), { blob:JSON.stringify(map), updatedAt:Date.now(), device:deviceId() }).catch(function(){});
    }
    function pushNow(){ pushMap(snapshotLocal()); }
    api.schedulePush = function(){ if(!currentUser)return; if(pushTimer)clearTimeout(pushTimer); pushTimer=setTimeout(pushNow,1500); };

    /* ── sign-in entrypoints — native bridge in the wrapper, popup on web ──── */
    api.signInGoogle = function(){
      setStatus('Opening Google sign-in...');
      if(IN_WRAPPER && nativeHandler('startGoogleSignIn')){ postNative('startGoogleSignIn'); return; }
      authMod.signInWithPopup(auth, googleProvider).catch(function(){ setStatus('Sign-in did not complete - tap to try again'); toast('Sign-in did not complete'); });
    };
    api.signInApple = function(){
      setStatus('Opening Apple sign-in...');
      if(IN_WRAPPER && nativeHandler('startAppleSignIn')){ postNative('startAppleSignIn'); return; }
      authMod.signInWithPopup(auth, appleProvider).catch(function(){ setStatus('Sign-in did not complete - tap to try again'); toast('Sign-in did not complete'); });
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
        try{ updateAccountUI(); }catch(e){}
        setStatus('Synced as ' + (user.email || user.displayName || 'your account'));

        fsMod.getDoc(docRef(user.uid)).then(function(snap){
          var data = snap.exists() ? snap.data() : null;
          var cloudBlob = {};
          try{ cloudBlob = (data && data.blob) ? JSON.parse(data.blob) : {}; }catch(e){ cloudBlob = {}; }
          var decision = decideSync(keyCount(cloudBlob), hasLocalData());
          if(decision==='push' || decision==='noop'){ pushNow(); }
          else if(decision==='pull'){ adopt(cloudBlob); }
          else { // merge (union, local wins), then push if it changed the cloud
            var merged = mergeMaps(cloudBlob, snapshotLocal());
            adopt(merged);
            if(JSON.stringify(merged)!==JSON.stringify(cloudBlob)) pushMap(merged);
          }
          // live updates from this user's OTHER devices
          unsub = fsMod.onSnapshot(docRef(user.uid), function(s){
            if(!s.exists())return;
            var dd = s.data();
            if(!dd || !dd.blob) return;
            if(dd.device === deviceId()) return;      // ignore our own echo
            var rb={}; try{ rb=JSON.parse(dd.blob); }catch(e){ return; }
            adopt(rb);
          });
        }).catch(function(){ setStatus('Sync error - will retry on next change'); });

      } else {
        if(ACCOUNT && ACCOUNT.mode==='cloud'){
          ACCOUNT=null;
          try{ localStorage.removeItem(SAVE_MODE); }catch(e){}
          try{ updateAccountUI(); rebuildAll(); }catch(e){}
          toast('Signed out');
        }
        setStatus('Cloud sync (off)');
      }
    });

  }).catch(function(){
    // Firebase modules couldn't load (offline or blocked) — degrade gracefully.
    api.signInGoogle = api.signInApple = function(){ toast('Sign-in needs a connection'); };
    api.statusText = 'Cloud sync unavailable offline';
  });
})();
