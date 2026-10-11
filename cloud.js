/* Firebase connection for Little Bites (optional cloud sync). sync.js loads this on demand; if it can't load
   (e.g. offline on first open) the app simply stays on this device. Data layout is described in FIREBASE.md:
     users/{uid}/babies/{babyId}                      name, bday, settings
     users/{uid}/babies/{babyId}/logs/{logId}         food logs
     users/{uid}/babies/{babyId}/customFoods/{id}     custom foods
     users/{uid}/babies/{babyId}/foodPhotos/{foodId}  photo for a food (small JPEG data URL)
     Storage: users/{uid}/babies/{babyId}/photos/{id}.jpg and {id}_thumb.jpg */
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";
import { getAuth, GoogleAuthProvider, signInWithPopup, signInWithRedirect, getRedirectResult, onAuthStateChanged, signOut as fbSignOut }
  from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager, collection, doc, getDocs, setDoc, deleteDoc, onSnapshot }
  from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";
import { getStorage, ref, uploadBytes, getBlob, deleteObject } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-storage.js";
import { FIREBASE_CONFIG } from "./firebase-config.js";

const app = initializeApp(FIREBASE_CONFIG);
const auth = getAuth(app);
// Persistent cache keeps the app usable offline; writes made offline are sent when the connection returns.
const db = initializeFirestore(app, { localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }) });
const files = getStorage(app);

const me = () => auth.currentUser.uid;
const babyPath = babyId => ["users", me(), "babies", babyId];
const photoRefs = (babyId, id) => [
  ref(files, `users/${me()}/babies/${babyId}/photos/${id}.jpg`),
  ref(files, `users/${me()}/babies/${babyId}/photos/${id}_thumb.jpg`)
];

export const LBCloud = {
  onAuth: cb => onAuthStateChanged(auth, cb),
  async signIn() {
    const provider = new GoogleAuthProvider();
    try { await signInWithPopup(auth, provider); }
    catch (e) {
      // Popups are blocked in some home-screen (installed app) setups; fall back to a full-page sign-in.
      if (e.code === "auth/popup-blocked" || e.code === "auth/operation-not-supported-in-this-environment") return signInWithRedirect(auth, provider);
      throw e;
    }
  },
  redirectResult: () => getRedirectResult(auth).catch(() => { }),
  signOut: () => fbSignOut(auth),

  async babies() {
    const snap = await getDocs(collection(db, "users", me(), "babies"));
    return snap.docs.map(d => ({ id: d.id }));
  },
  // Live listeners. Each handler gets the data and whether it came from the local cache rather than the server.
  watch(babyId, h) {
    const p = babyPath(babyId);
    const rows = snap => snap.docs.map(d => ({ ...d.data(), id: d.id }));
    return [
      onSnapshot(doc(db, ...p), s => h.baby(s.exists() ? s.data() : null, s.metadata.fromCache), h.error),
      onSnapshot(collection(db, ...p, "logs"), s => h.logs(rows(s), s.metadata.fromCache), h.error),
      onSnapshot(collection(db, ...p, "customFoods"), s => h.customs(rows(s), s.metadata.fromCache), h.error),
      onSnapshot(collection(db, ...p, "foodPhotos"), s => h.photos(rows(s), s.metadata.fromCache), h.error)
    ];
  },
  set: (col, babyId, id, data) => setDoc(doc(db, ...babyPath(babyId), col, id), data),
  del: (col, babyId, id) => deleteDoc(doc(db, ...babyPath(babyId), col, id)),
  setBaby: (babyId, data) => setDoc(doc(db, ...babyPath(babyId)), data),

  async uploadPhoto(babyId, id, blob, thumb) {
    const [full, small] = photoRefs(babyId, id);
    await uploadBytes(full, blob, { contentType: "image/jpeg" });
    await uploadBytes(small, thumb, { contentType: "image/jpeg" });
  },
  async downloadPhoto(babyId, id) {
    const [full, small] = photoRefs(babyId, id);
    try { return { blob: await getBlob(full), thumb: await getBlob(small) }; } catch (e) { return null; }
  },
  async deletePhoto(babyId, id) {
    for (const r of photoRefs(babyId, id)) await deleteObject(r).catch(() => { });
  }
};
