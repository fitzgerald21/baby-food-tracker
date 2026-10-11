# Moving Little Bites to Firebase

The app is already structured so the move is mostly swapping two storage layers. Nothing in the UI needs to change.

## Where data lives today
| Data | Today | Firebase target |
|---|---|---|
| Baby (`S.baby`: `id`, `name`, `bday`) | localStorage | Firestore `users/{uid}/babies/{babyId}` |
| Food logs (`S.logs[]`) | localStorage | Firestore `users/{uid}/babies/{babyId}/logs/{logId}` |
| Custom foods (`S.custom[]`) | localStorage | Firestore `.../customFoods/{foodId}` |
| Settings (`S.settings`) | localStorage | Firestore `users/{uid}/babies/{babyId}` field `settings` |
| Meal photos | IndexedDB via `PhotoStore` (`store.js`) | Firebase Storage `users/{uid}/babies/{babyId}/photos/{photoId}.jpg` and `{photoId}_thumb.jpg` |
| Food catalogue (`data/foods.js`) | static file | keep static (it is reference data, not user data) |

## Data model notes (already Firebase-friendly)
- Every log has a stable random id (`id`), a creation time (`t`) and a last-modified time (`u`, ms). Use `u` for last-write-wins merging across devices.
- A log references photos by id only: `log.ph = ["p_abc", ...]`. Photos are never embedded in documents.
- Photos are resized client-side to 1280px JPEG plus a 240px thumbnail, with EXIF/location stripped, so uploads are small and private.
- Dates are `YYYY-MM-DD` strings (`d`); an empty string means "date unknown".
- `S.baby.id` exists so multiple babies can be added later.

## Migration plan
1. Add the Firebase JS SDK, Auth (Google/Apple/email) and enable Firestore + Storage.
2. In `store.js`, re-implement `PhotoStore.put/url/remove/ids` with `uploadBytes` / `getDownloadURL` / `deleteObject` / `listAll` (keep IndexedDB as an offline cache).
3. In `app.js`, replace `load()` / `save()` with Firestore reads/writes (`onSnapshot` for live sync; enable offline persistence). `save()` is the single write path; diff `S.logs` by `id` and `u` to write only changed docs.
4. One-time import: on first sign-in, upload existing localStorage data and IndexedDB photos (the same code path as "Backup with photos" restore).
5. Remember GitHub Pages hosting is fine for Firebase web apps; add your Pages domain to Firebase Auth "Authorized domains".

## Security rules (starting point)
```
rules_version = '2';
service cloud.firestore {
  match /databases/{db}/documents {
    match /users/{uid}/{document=**} {
      allow read, write: if request.auth != null && request.auth.uid == uid;
    }
  }
}
// Storage
service firebase.storage {
  match /b/{bucket}/o {
    match /users/{uid}/{allPaths=**} {
      allow read, write: if request.auth != null && request.auth.uid == uid
        && (request.method == 'delete' || request.resource.size < 5 * 1024 * 1024);
    }
  }
}
```
Baby photos and health notes are sensitive: keep Storage and Firestore private (as above), never public buckets.
