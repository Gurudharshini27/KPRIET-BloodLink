# KPRIET BloodLink

A smart campus blood donor and emergency request management system for KPRIET.

The public landing page is in place. Member 1 owns donor registration, login, and profile management.

## Requirements

- Node.js 18 or later (includes npm)
- The existing Firebase project **BloodLink-KPRIET** (do not create a new project)

## How to run

```bash
npm install
```

Copy `.env.example` to `.env` and paste the **web app** keys from Firebase Console → BloodLink-KPRIET → Project settings.

```bash
npm run dev
```

Open the URL Vite prints (usually `http://localhost:5173`).

## Member 1 Firebase setup

In the BloodLink-KPRIET project:

1. Enable **Authentication → Email/Password**.
2. Keep email verification enabled (the app calls `sendEmailVerification`).
3. Create a Firestore collection named `users` (documents are created automatically on registration).
4. Use this security rule for Member 1 testing (users can only read/write their own profile):

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

Registration is allowed only for emails ending in `@kpriet.ac.in`.

## Member 1 routes

- `/` landing page
- `/register` donor registration
- `/login` login
- `/dashboard` donor dashboard (signed-in users only)

## Other commands

```bash
npm run build
npm run preview
```
