# Example seed data

After enabling Authentication and Firestore, create an initial admin so you can sign in and manage categories.

In **Firebase → Authentication → Sign-in method**, enable:

- **Google** (Gmail) — optional support email in the provider settings.
- **Apple** — follow the wizard (Services ID, key, etc.) so “Sign in with Apple” works on the web.
- **Email / Password** — for email + password sign-up and sign-in.

**Subscription plans (admin):** In the app, open **Plans** to create catalog entries (e.g. Netflix, Spotify) with **slots** and default pricing. Assign users to a plan from **Subscriptions** → *Assign subscription* → *Catalog plan*. Firestore collection: `plans`.

## 1. Register the first account

Use the app’s **Register** flow (or Firebase Auth console) to create `admin@example.com` (or your email).

## 2. Promote to admin in Firestore

In **Firestore → `users` → {your uid}**, set:

- `role`: `admin`
- `name`: your display name
- `email`: same as Auth

Document id must match the Auth user’s UID.

## User management: “Missing or insufficient permissions”

This repo’s **`firestore.rules`** allow **any signed-in user** to **read** `users/{uid}` (for directory + admin table). If you still see **Missing or insufficient permissions** on the Users page, it is **not** from that read rule — it is almost always **Cloud Firestore App Check**: the console has **Enforcement** turned on for Firestore, but this web build is **not sending a valid App Check token** (often because there is no `VITE_APPCHECK_*` entry in `.env`).

### Turn off Firestore App Check enforcement (dev / unblock quickly)

1. Open **App Check** for your project (replace `YOUR_PROJECT` with `VITE_FIREBASE_PROJECT_ID` from `.env`):  
   `https://console.firebase.google.com/project/YOUR_PROJECT/appcheck`
2. Find **Cloud Firestore** under **APIs** (or the metrics list for Firestore).
3. Turn **Enforcement** / **Enforce** **OFF** for Firestore. Changes can take **up to ~15 minutes**.
4. Hard-refresh the app and open User management again.

### Or keep enforcement on

Add **`VITE_APPCHECK_RECAPTCHA_SITE_KEY`** (or Enterprise) from the Firebase console to `.env`, restart dev, then register the **debug token** printed in the browser console under **App Check → your web app → Manage debug tokens**. See `.env.example`.

### Other checks

1. **Deploy rules from this repo** to the **same** project as `.env`: `npm run firestore:deploy`. In **Firebase Console → Firestore → Rules**, confirm the **published** tab matches this repo (look for `allow read: if authed();` under `users`).
2. **Google Cloud API key (very common):** In **Google Cloud Console → APIs & Services → Credentials**, open the **Browser** API key used by your web app. If **Application restrictions** are **HTTP referrers**, you must include your dev URL (e.g. `http://localhost:5173/*`) and your production site — otherwise Firestore returns permission errors. For local testing, **None** is simplest.
3. **Firestore profile:** `users/{your Auth UID}` should have **`role`**: `admin` or `manager` (for who can change roles — not what blocks the list when App Check is the issue).

### Optional — Auth custom claim `admin`

Rules also treat **`request.auth.token.admin == true`** as admin **before** reading Firestore. Set once with the **Firebase Admin SDK** (service account), then **sign out and sign in** so the ID token refreshes:

```js
// Run with Node after: npm i firebase-admin
// export GOOGLE_APPLICATION_CREDENTIALS=/path/to/serviceAccount.json
import admin from 'firebase-admin'
admin.initializeApp()
await admin.auth().setCustomUserClaims('YOUR_AUTH_UID', { admin: true })
console.log('Done — sign out and back in in the app.')
```

Use your real UID in place of `YOUR_AUTH_UID` (same as the Firestore document id under `users/`).

## 3. Seed categories (optional)

Add documents to collection **`categories`**:

| `name`   |
|----------|
| Entertainment |
| Utilities     |
| Loans         |
| Insurance     |
| Software      |

You can also use **Users → Add category** in the app once you are an admin.

## 4. Create a manager (optional)

1. As admin, open **Users** and set another user’s `role` to `manager`, or create a user in Auth and add a `users/{uid}` doc with `role: "manager"`.
2. Managers sign in and use **Add user** to provision end users (Firestore `createdBy` is set automatically).

## JSON export (manual)

You can paste JSON into Firebase console or use the Emulator import format. Example `users` document fields:

```json
{
  "name": "Admin",
  "email": "admin@example.com",
  "role": "admin",
  "createdAt": { ".sv": "timestamp" }
}
```

Example `subscriptions` document:

```json
{
  "userId": "<target-user-uid>",
  "name": "Netflix",
  "categoryId": "<category-doc-id>",
  "categoryName": "Entertainment",
  "amount": 15.99,
  "billingCycle": "monthly",
  "nextBillingDate": "2026-05-15",
  "status": "active",
  "createdAt": { ".sv": "timestamp" }
}
```
