/* Cloud sync for Little Bites (optional). Sign in with Google to back up and sync across devices.
   This device always works from localStorage. While signed in, changes are pushed to Firestore (entries) and Firebase
   Storage (photos), and other devices' changes are merged in. Every entry has an edit time `u`; the newest edit wins.
   Layout: see cloud.js and FIREBASE.md. */
const Sync = (() => {
  const KEY = "littlebites.sync";
  const LISTENERS = 4;                // baby, logs, customFoods, foodPhotos: each must answer from the server before we push
  let C = null;                       // cloud.js (LBCloud), loaded by boot(); null if it can't load (e.g. offline on first open)
  let account = null;                 // signed-in Firebase user
  let active = false, starting = false;
  let base = null;                    // what the cloud is known to hold: { uid, babyId, logs, customs, photos, photosUp, baby }
  let unsubs = [], seen = new Set(), timer = 0, status = "";
  const inflight = new Set();

  const readBase = () => { try { return JSON.parse(localStorage.getItem(KEY)) || null; } catch (e) { return null; } };
  const persist = () => { if (base) try { localStorage.setItem(KEY, JSON.stringify(base)); } catch (e) { } };
  const fresh = (uid, babyId) => ({ uid, babyId, logs: {}, customs: {}, photos: {}, photosUp: {}, baby: null });
  // Canonical JSON (sorted keys), so the same settings always compare equal
  const canon = v => JSON.stringify(v, (k, x) => x && typeof x === "object" && !Array.isArray(x) ? Object.keys(x).sort().reduce((o, key) => (o[key] = x[key], o), {}) : x);
  const clean = o => JSON.parse(JSON.stringify(o));          // drops undefined fields, which Firestore rejects
  const babyOf = () => ({ name: S.baby.name || "", bday: S.baby.bday || "", settings: S.settings });
  const byId = list => new Map(list.map(x => [x.id, x]));
  const clock = () => new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });

  function boxHtml() {
    if (!C) return `<p class="small muted">Cloud sync can’t connect right now. Reopen Little Bites when you’re online to sign in.</p>`;
    if (!account) return `<p class="small muted">Sign in with Google to back up your data and use it on other devices. Your data stays on this device too.</p>
      <button class="btn sm" data-act="cloudsignin">Sign in with Google</button>`;
    return `<p class="small muted">Signed in as <b>${esc(account.email || "your Google account")}</b>${status ? " · " + esc(status) : ""}.</p>
      <button class="btn sm sec" data-act="cloudsignout">Sign out</button>`;
  }
  function show(msg) {
    if (msg !== undefined) status = msg;
    const box = document.getElementById("cloudBox");
    if (box) box.innerHTML = boxHtml();
  }
  // Re-draw the current view after remote changes, but not while the person is typing in a field
  function refresh() {
    const a = document.activeElement;
    if (a && /^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName)) return;
    render(true);
  }

  /* ── merging remote data into this device ── */

  // Merge a server list of entries (logs or custom foods) into S[key]. Returns true if S changed.
  // map[id] is the edit time the cloud had when we last synced this entry. If only the cloud changed it, take the cloud
  // copy. If only this device changed it, keep ours (it gets pushed). If both did, the newer edit wins.
  function mergeList(key, map, list, fromCache) {
    const arr = S[key], local = byId(arr), remote = byId(list);
    let changed = false;
    remote.forEach((r, id) => {
      const l = local.get(id);
      if (!l) {
        if (id in map && map[id] === r.u) return;           // we deleted it here; that delete is still on its way
        arr.push(r); map[id] = r.u; changed = true;
        return;
      }
      const localEdited = map[id] !== l.u, remoteEdited = map[id] !== r.u;
      if (remoteEdited && (!localEdited || (r.u || 0) > (l.u || 0))) {
        arr[arr.indexOf(l)] = r; map[id] = r.u; changed = true;
      }
    });
    if (!fromCache) {                                       // only trust the server's view when deleting things
      for (let i = arr.length - 1; i >= 0; i--) if (!remote.has(arr[i].id) && arr[i].id in map) { delete map[arr[i].id]; arr.splice(i, 1); changed = true; }
      Object.keys(map).forEach(id => { if (!remote.has(id) && !local.has(id)) delete map[id]; });
    }
    return changed;
  }
  function mergePhotos(list) {
    let changed = false;
    list.forEach(r => {
      const mine = S.photoU[r.id] || 0, theirs = r.u || 0, synced = base.photos[r.id] || 0;
      const localEdited = synced !== mine, remoteEdited = synced !== theirs;
      if (remoteEdited && (!localEdited || theirs > mine)) {
        if (r.photo) S.photos[r.id] = r.photo; else delete S.photos[r.id];
        S.photoU[r.id] = theirs; base.photos[r.id] = theirs; changed = true;
      }
    });
    return changed;
  }
  // Baby profile and settings. On first sign-in the cloud copy wins. After that, a change on one side is taken from
  // the cloud unless this device also changed it, in which case this device's copy is pushed.
  function mergeBaby(d) {
    if (!d) return false;
    const r = { name: d.name || "", bday: d.bday || "", settings: d.settings || {} }, rj = canon(r);
    if (base.baby === null || (rj !== base.baby && canon(babyOf()) === base.baby)) {
      S.baby.name = r.name; S.baby.bday = r.bday; S.settings = { ...defaults().settings, ...r.settings };
      base.baby = rj;
      return true;
    }
    return false;
  }

  // A listener answered. Merge what it sent, redraw, and once every listener has heard from the server, push our changes.
  function got(name, fromCache, merge) {
    if (!active) return;
    if (!fromCache) seen.add(name);
    if (merge()) {
      save();
      if (name === "baby" && document.getElementById("st-name")) openSettings(); else refresh();
    }
    if (seen.size === LISTENERS) changed();
  }

  /* ── sending this device's changes ── */

  function push() {
    if (!active || seen.size < LISTENERS) return;
    const jobs = [], id = base.babyId;
    const done = p => p.then(() => true, () => false);
    // Write an entry if this device changed it since the cloud last heard about it
    const put = (col, row, map) => {
      const u = row.u;
      if (map[row.id] === u) return;
      map[row.id] = u;
      jobs.push(done(C.set(col, id, row.id, clean(row)).catch(() => { if (map[row.id] === u) delete map[row.id]; persist(); throw 0; })));
    };
    const drop = (col, rowId, map) => {
      const was = map[rowId];
      delete map[rowId];
      jobs.push(done(C.del(col, id, rowId).catch(() => { map[rowId] = was; persist(); throw 0; })));
    };
    const logIds = new Set(S.logs.map(l => l.id)), customIds = new Set(S.custom.map(c => c.id));
    S.logs.forEach(l => put("logs", l, base.logs));
    Object.keys(base.logs).forEach(k => { if (!logIds.has(k)) drop("logs", k, base.logs); });
    S.custom.forEach(c => { if (!c.u) c.u = Date.now(); put("customFoods", c, base.customs); });
    Object.keys(base.customs).forEach(k => { if (!customIds.has(k)) drop("customFoods", k, base.customs); });
    Object.keys(S.photoU).forEach(f => put("foodPhotos", { id: f, photo: S.photos[f] || null, u: S.photoU[f] }, base.photos));
    const bj = canon(babyOf());
    if (bj !== base.baby) {
      const prev = base.baby;
      base.baby = bj;
      jobs.push(done(C.setBaby(id, clean(babyOf())).catch(() => { base.baby = prev; persist(); throw 0; })));
    }
    persist();
    if (jobs.length) Promise.all(jobs).then(res => show(res.every(Boolean) ? "saved " + clock() : "some changes will sync when you’re online"));
  }
  function changed() {
    if (!active) return;
    clearTimeout(timer);
    timer = setTimeout(() => { flushPhotos(); push(); }, 800);
  }

  // Upload local photos that the cloud doesn't have yet. Safe to run at any time; retried on every change.
  async function flushPhotos() {
    if (!active) return;
    const want = new Set();
    S.logs.forEach(l => (l.ph || []).forEach(p => want.add(p)));
    for (const pid of want) {
      if (!active) return;
      if (base.photosUp[pid] || inflight.has(pid)) continue;
      inflight.add(pid);
      try {
        const row = await PhotoStore.get(pid);
        if (!active) return;
        if (row && !base.photosUp[pid]) {
          await C.uploadPhoto(base.babyId, pid, row.blob, row.thumb);
          base.photosUp[pid] = true; persist();
        }
      } catch (e) { show("some photos will upload when you’re online"); }
      finally { inflight.delete(pid); }
    }
  }

  // Photo store adapter (see store.js): uploads new photos, fetches photos that were added on another device
  const photoRemote = {
    upload: () => flushPhotos(),
    async download(pid) {
      if (!base) return null;
      const got = await C.downloadPhoto(base.babyId, pid);
      if (got && base) { base.photosUp[pid] = true; persist(); }
      return got;
    },
    remove(pid) {
      if (!base) return;
      delete base.photosUp[pid]; persist();
      C.deletePhoto(base.babyId, pid);
    }
  };

  /* ── sign-in lifecycle ── */

  async function start(u) {
    if (active || starting) return;
    starting = true;
    let babies;
    try { babies = await C.babies(); }
    catch (e) { starting = false; show("waiting for a connection to sync"); return; }
    starting = false;
    if (!account || account.uid !== u.uid) return;                 // signed out while we were loading
    // Use the baby already in the cloud, so every device writes to the same one; otherwise use this device's baby
    const babyId = babies.length ? babies[0].id : S.baby.id;
    const saved = readBase();
    base = saved && saved.uid === u.uid && saved.babyId === babyId ? saved : fresh(u.uid, babyId);
    if (S.baby.id !== babyId) { S.baby.id = babyId; save(); }
    active = true; seen = new Set();
    PhotoStore.setRemote(photoRemote);
    unsubs = C.watch(babyId, {
      baby: (d, c) => got("baby", c, () => mergeBaby(d)),
      logs: (l, c) => got("logs", c, () => mergeList("logs", base.logs, l, c)),
      customs: (l, c) => got("customs", c, () => mergeList("custom", base.customs, l, c)),
      photos: (l, c) => got("photos", c, () => mergePhotos(l))
    });
    show("syncing…");
    flushPhotos();
  }
  function stop() {
    clearTimeout(timer);
    unsubs.forEach(f => f()); unsubs = [];
    persist();
    base = null; active = false; seen = new Set();
    PhotoStore.setRemote(null);
  }

  return {
    async boot() {
      try { C = (await import("./cloud.js")).LBCloud; }
      catch (e) { show(); return; }
      C.redirectResult();
      C.onAuth(u => { account = u; if (u) { show(); start(u); } else { stop(); show(); } });
      window.addEventListener("online", () => { if (account && !active) start(account); });
    },
    // save() calls this after every local change
    changed,
    box: boxHtml,
    signedIn: () => !!account,
    async signIn() {
      if (!C) return toast("Cloud sync isn’t available right now");
      try { await C.signIn(); } catch (e) { toast("Sign-in didn’t work. Please try again."); }
    },
    async signOut() {
      if (!C) return;
      await C.signOut();
      toast("Signed out. Your data stays on this device.");
    },
    // Erase this device's copy of the sync state (used by "Erase all data"). The cloud copy is left alone.
    forget() {
      if (account && C) C.signOut().catch(() => { });
      stop(); account = null;
      try { localStorage.removeItem(KEY); } catch (e) { }
    }
  };
})();
