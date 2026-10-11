# Little Bites and Firebase

Little Bites works fully on the device by default. Signing in with Google (Settings → Account & sync) backs the data up to Firebase and keeps it in sync across devices.

## Status
- **Done:** Firebase project and web app, Firestore and Storage rules, Google sign-in, sync of logs, custom foods, food photos, the baby profile and settings, and meal photo upload and download.
- **Not yet tested on the live site** with a real Google account and a second device. Check this first.
- **Not yet built:** more than one baby per account, and a way to delete the cloud copy from inside the app (signing out and "Erase all data" both leave it in place).

## Project setup
- Little Bites lives in the same Firebase project as the Come back app: **`come-back-fitz21`**. It has its own web app registration ("Little Bites"), so each app has its own config.
- **Firestore has one ruleset per database, shared by every app in the project.** `firestore.rules` keeps the Come back rules exactly as they were and adds the Little Bites rule. Keep both blocks when you edit it.
- Storage needs the Blaze (pay-as-you-go) plan.
- Authorized domains (Authentication → Settings) must include `fitzgerald21.github.io`. Come back already uses it.
- Deploy rules with: `firebase deploy --only firestore:rules,storage --project come-back-fitz21`

## Where data lives
| Data | Local copy | Cloud |
|---|---|---|
| Baby name, birthday, settings (`S.baby`, `S.settings`) | localStorage `littlebites.v1` | Firestore `users/{uid}/babies/{babyId}` |
| Food logs (`S.logs`) | localStorage | Firestore `.../babies/{babyId}/logs/{logId}` |
| Custom foods (`S.custom`) | localStorage | Firestore `.../babies/{babyId}/customFoods/{foodId}` |
| Per-food photos (`S.photos`, 192px) | localStorage | Firestore `.../babies/{babyId}/foodPhotos/{foodId}` (field `photo`) |
| Meal photos | IndexedDB `littlebites-photos` (via `PhotoStore`) | Storage `users/{uid}/babies/{babyId}/photos/{photoId}.jpg` and `{photoId}_thumb.jpg` |
| Sync state (what the cloud last had) | localStorage `littlebites.sync` | none |
| Food catalogue (`data/foods.js`) | static file | not synced (reference data, not user data) |

## How sync works
- Every log, custom food and food photo has an edit time `u` (ms). The sync code uses it to decide which copy is newer.
- Each device remembers what the cloud last had for each entry (`littlebites.sync`). It only writes entries it has changed since then.
- For each entry: if only the cloud changed it, the device takes the cloud copy. If only this device changed it, the device keeps its copy and pushes it. If both changed, the newer `u` wins.
- Deletions propagate in both directions.
- A snapshot from the local cache never deletes anything, and a device doesn't push until every listener has heard from the server. This stops an offline start from wiping data.
- The baby profile and settings sync as one document. On first sign-in the cloud copy wins. After that, if both devices changed it, the last one to save wins.
- Photos are uploaded as soon as they're added, and retried until they succeed. A photo that a device doesn't have locally is downloaded when it's first displayed.

Code: `app.js` (state and UI), `store.js` (`PhotoStore`), `sync.js` (merge and push), `cloud.js` (the Firebase wrapper, loaded on demand), `firebase-config.js`, `firestore.rules`, `storage.rules`.

## Security
Each signed-in user can read and write only their own `users/{uid}/...` tree, in both Firestore and Storage. Photo uploads are capped at 5 MB.

The web config in `firebase-config.js` is not a secret. Access is controlled by the rules and by the authorized domains list.

Baby photos and feeding reactions are sensitive. Keep Storage and Firestore private, and never make the bucket public.
