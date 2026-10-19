# SAJ Academy Hussainabad - Attendance Portal

Static website + Vercel serverless API (`api/rpc.js`) + Firebase Firestore. No build step.

## Roles
- **Admin**: add students (Excel, CSV or manual), create teacher logins, assign classes, set passwords, block/unblock/delete/reset any user, take attendance for any class, daily/monthly PDF reports.
- **Teacher**: can take attendance and view reports only for the classes assigned by the admin (enforced by Firestore rules too).
- **Parent**: username = GR No, default password = 1234 (can be changed). Sees only their own child's record.

## One-time setup
1. Firebase Console > create a project > Firestore Database > Create database (production mode).
2. Firestore > Rules tab: paste the content of `firestore.rules` and Publish.
3. Project settings > General > Your apps > add a Web app (`</>`). Paste the config into `js/firebase-config.js`.
4. Project settings > Service accounts > Generate new private key. Paste the whole JSON into the Vercel environment variable `FIREBASE_SERVICE_ACCOUNT`. Never upload this file to GitHub.
5. Upload the project to GitHub, then Vercel > Add New Project > import the repo (Framework: Other, leave build command empty).
6. Vercel > Settings > Environment Variables:
   - `FIREBASE_SERVICE_ACCOUNT` = the full service account JSON
   - `ADMIN_PASSWORD` = your admin password (the admin account is created from it on first login)
7. Deploy / Redeploy. Login: username `admin`, password = `ADMIN_PASSWORD` (or `admin123` if not set; change it immediately).

## Daily use
1. Admin > Students: upload an Excel file (use the Sample template button for the format) or add students one by one.
2. Admin > Users: create teacher logins, tick their classes, and share the username/password.
3. Teachers open Attendance, pick class and date, and mark P / A / L / Lv.
4. Reports: daily and monthly PDF.

## Notes
- If Firestore shows an "index required" error, click the link in the error to create the index.
- Class changes or blocking a user take effect at that user's next login (an existing session can last up to ~1 hour).
- PDF reports do not render Urdu script; enter names in English.
- Passwords are hashed on the server; Firestore rules block clients from reading the users collection.
