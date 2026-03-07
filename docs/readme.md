# PrimeSewa MVP

On-demand home services marketplace — Customer, Provider, and Admin portals.

**Live:** https://primeseva-mvp.web.app

---

## Project Structure

```
primesewa-mvp/
├── .github/
│   └── workflows/
│       └── deploy.yml          ← GitHub Actions CI/CD pipeline
│
├── docs/                       ← All project documentation
│   ├── readme.md               ← Main project overview
│   ├── brd.md                  ← Business Requirements Document (markdown)
│   ├── brd.pdf                 ← BRD (PDF)
│   ├── PrimeSewa_BRD_Stakeholder.pdf
│   ├── primesewa_test_cases.md ← Test case definitions
│   ├── primesewa_test_cases.pdf
│   ├── dev_notes.md            ← Developer notes & coding rules
│   └── project_plan.md         ← Detailed project plan
│
├── firebase/                   ← Firebase backend config
│   └── firestore.rules         ← Firestore security rules
│
├── scripts/                    ← Utility & dev scripts
│   ├── fetch_logs.js           ← Log fetching utility
│   ├── update_routes.js        ← Route update utility
│   └── seedImages.js           ← Dummy data seeding script
│
├── web/                        ← React frontend application
│   ├── public/
│   ├── src/
│   │   ├── firebase/           ← Firebase config & AuthContext
│   │   ├── layouts/            ← CustomerLayout, AdminLayout, ProviderLayout
│   │   ├── pages/
│   │   │   ├── admin/          ← Admin dashboard pages
│   │   │   ├── customer/       ← Customer portal pages
│   │   │   └── provider/       ← Provider dashboard pages
│   │   ├── components/         ← Shared UI components (ProtectedRoute etc.)
│   │   └── utils/              ← Utility helpers (mockDb.js)
│   ├── .env                    ← Firebase credentials (gitignored, never committed)
│   ├── .gitignore
│   ├── firebase.json           ← Firebase hosting config
│   ├── .firebaserc             ← Firebase project alias
│   ├── index.html
│   ├── package.json
│   └── vite.config.js
│
└── .gitignore
```

---

## Key Features

- **Cross-Portal Navigation**: Seamlessly switch between the customer storefront, provider dashboard, and admin panel with integrated quick links.
- **Provider Verification Flow**: Enhanced registration requiring identity proofs and work history, creating a trusted marketplace.
- **Live Provider Tracking**: Customers can track the real-time arrival status of providers for accepted jobs.
- **Refined Admin Suite**: Comprehensive operational management featuring consolidated booking histories, icon-driven action tables, and dummy data seeding for demonstrations.

---

## Portals & URLs

| Portal | URL |
|---|---|
| Customer | https://primeseva-mvp.web.app/ |
| Customer Login | https://primesewa-mvp.web.app/login |
| Admin | https://primeseva-mvp.web.app/admin |
| Admin Login | https://primesewa-mvp.web.app/admin/login |
| Provider | https://primeseva-mvp.web.app/provider |
| Provider Login | https://primesewa-mvp.web.app/provider/login |

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18 + Vite + Tailwind CSS |
| Backend | Firebase BaaS (Auth, Firestore, Hosting) |
| Database | Cloud Firestore (NoSQL) |
| Auth | Firebase Phone OTP |
| Hosting | Firebase Hosting (Global CDN) |
| CI/CD | GitHub Actions |

---

## Local Development

```bash
cd web
npm install
npm run dev
```

> Requires `web/.env` with your `VITE_FIREBASE_*` keys.  
> Login OTP for dev testing: `1234`

---

## Deployment

Push to `main` branch → GitHub Actions automatically builds and deploys to Firebase Hosting.  
Firebase credentials are injected from **GitHub Repository Secrets** (never stored in git).

