/* Photo storage for Little Bites.
   Photos are kept OUT of localStorage (too small a quota) in IndexedDB as resized JPEG blobs, and logs only hold photo ids
   (log.ph = ["p_abc", ...]). This keeps the data model Firebase-ready — see FIREBASE.md:
     PhotoStore.put/get/remove/ids  ->  Firebase Storage  (users/{uid}/babies/{babyId}/photos/{id}.jpg + _thumb.jpg)
     logs / custom foods / baby     ->  Firestore documents
   To migrate, replace the methods of PhotoStore (and the load/save of state in app.js) — the rest of the UI doesn't change. */
const PhotoStore = (() => {
  const mem = new Map();          // fallback if IndexedDB is unavailable (e.g. some private modes)
  let dbp = null, useMem = false;
  const urlCache = new Map();     // "id:kind" -> objectURL

  function open() {
    if (useMem) return Promise.reject(new Error("mem"));
    if (!dbp) dbp = new Promise((res, rej) => {
      try {
        const r = indexedDB.open("littlebites-photos", 1);
        r.onupgradeneeded = () => r.result.createObjectStore("photos", { keyPath: "id" });
        r.onsuccess = () => res(r.result);
        r.onerror = () => rej(r.error);
      } catch (e) { rej(e); }
    }).catch(e => { useMem = true; throw e; });
    return dbp;
  }
  const req = r => new Promise((res, rej) => { r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });
  async function store(mode) { const db = await open(); return db.transaction("photos", mode).objectStore("photos"); }

  async function put(id, rec) {            // rec: { blob, thumb, w, h, created }
    const row = { id, ...rec, created: rec.created || Date.now() };
    try { await req((await store("readwrite")).put(row)); } catch (e) { mem.set(id, row); }
    urlCache.forEach((u, k) => { if (k.startsWith(id + ":")) { URL.revokeObjectURL(u); urlCache.delete(k); } });
  }
  async function getRow(id) {
    if (mem.has(id)) return mem.get(id);
    try { return (await req((await store("readonly")).get(id))) || null; } catch (e) { return null; }
  }
  async function url(id, kind) {           // kind: "full" | "thumb"
    const key = id + ":" + kind;
    if (urlCache.has(key)) return urlCache.get(key);
    const row = await getRow(id); if (!row) return null;
    const u = URL.createObjectURL(kind === "thumb" && row.thumb ? row.thumb : row.blob);
    urlCache.set(key, u); return u;
  }
  async function remove(id) {
    mem.delete(id);
    try { await req((await store("readwrite")).delete(id)); } catch (e) { }
    ["full", "thumb"].forEach(k => { const u = urlCache.get(id + ":" + k); if (u) { URL.revokeObjectURL(u); urlCache.delete(id + ":" + k); } });
  }
  async function ids() {
    let out = [...mem.keys()];
    try { out = out.concat(await req((await store("readonly")).getAllKeys())); } catch (e) { }
    return [...new Set(out)];
  }
  async function clear() { for (const id of await ids()) await remove(id); }
  async function exportAll(keep) {         // -> { id: dataURL } for ids in `keep`
    const out = {};
    for (const id of keep) { const r = await getRow(id); if (r) out[id] = await blobToDataURL(r.blob); }
    return out;
  }
  async function importAll(map) { for (const [id, d] of Object.entries(map || {})) { const blob = await (await fetch(d)).blob(); await put(id, { blob, thumb: await resizeBlob(blob, 240) }); } }

  function blobToDataURL(b) { return new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = rej; r.readAsDataURL(b); }); }
  function loadImg(blob) { return new Promise((res, rej) => { const u = URL.createObjectURL(blob), i = new Image(); i.onload = () => { URL.revokeObjectURL(u); res(i); }; i.onerror = rej; i.src = u; }); }
  async function resizeBlob(blob, max) {
    const img = await loadImg(blob), s = Math.min(1, max / Math.max(img.width, img.height));
    const c = document.createElement("canvas"); c.width = Math.round(img.width * s); c.height = Math.round(img.height * s);
    c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
    return new Promise(res => c.toBlob(res, "image/jpeg", 0.82));
  }
  /* Resize a camera/library file to a 1280px JPEG plus a 240px thumbnail (strips EXIF/location data). */
  async function prepare(file) {
    const blob = await resizeBlob(file, 1280), thumb = await resizeBlob(blob, 240);
    return { blob, thumb };
  }
  return { put, url, remove, ids, clear, prepare, exportAll, importAll };
})();
