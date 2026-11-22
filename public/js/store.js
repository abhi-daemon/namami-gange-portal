// Data layer: Firebase Firestore when configured, otherwise localStorage demo mode.
(function () {
  const KEY = 'ganga_reports_v1';
  const listeners = [];
  const notify = (rows) => listeners.forEach((fn) => fn(rows));

  window.scoreReport = function (r) {
    const base = { drain: 3, plastic: 2, garbage: 2 }[r.category] || 2;
    return base + Number(r.extent) + (r.footfall ? 2 : 0); // range 4 to 8
  };
  window.severityOf = (score) => (score >= 7 ? 'high' : score >= 5 ? 'medium' : 'low');

  const seed = [
    { id: 's1', category: 'drain', extent: 3, footfall: true, lat: 25.6212, lng: 85.1695, description: 'Open drain discharging into the river near the NIT bank', photo: '', status: 'new', createdAt: Date.now() - 86400000 * 3 },
    { id: 's2', category: 'plastic', extent: 2, footfall: true, lat: 25.6198, lng: 85.1752, description: 'Plastic bags and bottles below the steps', photo: '', status: 'dispatched', dept: 'Patna Municipal Corporation', createdAt: Date.now() - 86400000 * 2 },
    { id: 's3', category: 'garbage', extent: 1, footfall: false, lat: 25.6226, lng: 85.1781, description: 'Small garbage heap on the embankment', photo: '', status: 'new', createdAt: Date.now() - 86400000 },
  ].map((r) => ({ ...r, score: window.scoreReport(r) }));


  const useFirebase = !!(window.FIREBASE_CONFIG && window.firebase);
  let local = [];
  let col;

  if (useFirebase) {
    firebase.initializeApp(window.FIREBASE_CONFIG);
    col = firebase.firestore().collection('reports');
    col.orderBy('createdAt', 'desc').onSnapshot((snap) => notify(snap.docs.map((d) => ({ ...d.data(), id: d.id }))));
  } else {
    try { local = JSON.parse(localStorage.getItem(KEY)) || []; } catch (e) { local = []; }
    if (!local.length) local = seed;
  }
  // ---- Admin auth ----
  let admin = false;
  const adminCbs = [];
  const setAdmin = (v) => { admin = v; adminCbs.forEach((fn) => fn(v)); };
  if (useFirebase) {
    firebase.auth().onAuthStateChanged(async (u) => {
      if (!u) return setAdmin(false);
      try { setAdmin((await firebase.firestore().collection('admins').doc(u.uid).get()).exists); } catch (e) { setAdmin(false); }
    });
  } else if (sessionStorage.getItem('ganga_admin') === '1') admin = true;

  window.Auth = {
    demo: !useFirebase,
    isAdmin: () => admin,
    onChange(fn) { adminCbs.push(fn); fn(admin); },
    async login(email, pw) {
      if (useFirebase) {
        const cred = await firebase.auth().signInWithEmailAndPassword(email, pw);
        const ok = (await firebase.firestore().collection('admins').doc(cred.user.uid).get()).exists;
        if (!ok) { await firebase.auth().signOut(); throw new Error('This account does not have admin access.'); }
        setAdmin(true);
      } else {
        if (pw !== (window.ADMIN_DEMO_PASSCODE || 'admin123')) throw new Error('Wrong passcode.');
        sessionStorage.setItem('ganga_admin', '1'); setAdmin(true);
      }
    },
    async logout() {
      if (useFirebase) await firebase.auth().signOut();
      else { sessionStorage.removeItem('ganga_admin'); setAdmin(false); }
    },
  };

  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(local)); } catch (e) { alert('Browser storage is full. Use smaller photos.'); } notify(local); };

  window.Store = {
    mode: useFirebase ? 'firebase' : 'demo',
    subscribe(fn) { listeners.push(fn); if (!useFirebase) fn(local); },
    async add(r) {
      r.score = window.scoreReport(r); r.status = 'new'; r.createdAt = Date.now();
      if (useFirebase) return col.add(r);
      r.id = 'r' + r.createdAt; local.unshift(r); save();
    },
    async update(id, patch) {
      if (!admin) throw new Error('Admin access required');
      if (useFirebase) return col.doc(id).update(patch);
      local = local.map((r) => (r.id === id ? { ...r, ...patch } : r)); save();
    },
  };
})();
