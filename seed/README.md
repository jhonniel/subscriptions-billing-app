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
