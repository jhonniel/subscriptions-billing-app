# JRY Billing

Subscription and billing tracker (React, Vite, TypeScript, Firebase Auth + Firestore).

## Prerequisites

- Node.js 20+ recommended  
- A [Firebase](https://console.firebase.google.com) project  
- [Firebase CLI](https://firebase.google.com/docs/cli) for deploying Firestore rules  

## 1. Environment variables

```bash
cp .env.example .env
```

Set all `VITE_FIREBASE_*` values from **Firebase Console → Project settings → Your apps → Web app**.  
`VITE_FIREBASE_PROJECT_ID` must match the project where you deploy Firestore rules.

## 2. Install and run

```bash
npm install
npm run dev
```

## 3. Firestore rules and indexes

```bash
firebase login
firebase use --add
npm run firestore:deploy
```

Or copy `firestore.rules` and `firestore.indexes.json` into the console and publish.

**`.firebaserc`** — The repo includes `.firebaserc` with a `default` Firebase project id used by `npm run firestore:deploy`. It **must match** `VITE_FIREBASE_PROJECT_ID` in `.env` (edit `.firebaserc` if they differ). If the file is missing, copy `.firebaserc.example` to `.firebaserc` and set `default` to your project id.

After `firebase login`, deploy rules from your machine:

```bash
npm run firestore:deploy
```

If deploy never runs, the console will keep **old** rules and the app will show **`permission-denied`** on `users/{uid}` even when `.env` looks correct.

## 4. Admin (and every user) profile

There is no separate admin URL. After login, the app reads **`users/{your Auth UID}`** in Firestore.

1. **Authentication → Users** — note the user’s **UID**.  
2. **Firestore → Data → `users`** — document id must be **exactly that UID** (not an email).  
3. Fields: `email` (string), `name` (string), `role` (string: `admin`, `manager`, or `user`).  

More samples: **`seed/README.md`**.

## 5. If you see “Missing or insufficient permissions”

Work through this in order:

1. **Rules** — In the **same** project as `.env`, open **Firestore → Rules** and **publish** the `firestore.rules` file from this repository (`npm run firestore:deploy`).  
2. **User document** — `users/{uid}` exists and the id matches **Authentication → UID**.  
3. **App Check** — If **Firestore** has **App Check enforcement** on, either **turn it off** until the web app is fully registered in App Check, or complete **App Check** in the Firebase console (reCAPTCHA / debug tokens). **This app does not configure App Check in code** so misconfigured enforcement shows up as Firestore `permission-denied`.

## Scripts

| Script | Purpose |
|--------|---------|
| `npm run dev` | Dev server |
| `npm run build` | Production build |
| `npm run firestore:deploy` | Deploy `firestore.rules` + indexes |
| `npm run lint` | ESLint |
