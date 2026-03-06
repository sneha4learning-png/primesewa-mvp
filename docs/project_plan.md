# PrimeSewa MVP — Project Plan

**Project Type:** On-Demand Home Services Marketplace  
**Portals:** Customer · Provider (Partner) · Admin  
**Live URL:** https://primeseva-mvp.web.app  
**Repository:** https://github.com/sneha4learning-png/primesewa-mvp  
**Last Updated:** March 2026

---

## 1. Project Overview

PrimeSewa is a digital marketplace connecting customers who need home services (plumbing, electrical, cleaning, carpentry) with verified local service providers. The platform is designed for the Indian market, with a mobile-first UX, OTP-based authentication, and real-time booking status tracking.

### Business Objectives

| Objective | Description |
|---|---|
| **Connect demand & supply** | Give customers instant access to verified local service providers |
| **Verified provider network** | Admin-reviewed onboarding ensures quality before providers go live |
| **Price transparency** | Fixed pricing displayed upfront; negotiation flow for custom jobs |
| **Platform revenue** | 15% commission automatically calculated on every completed booking |
| **Real-time tracking** | Customers and providers see booking status change live — no refresh needed |

### Target Users

| Role | Who They Are |
|---|---|
| **Customer** | Homeowners/tenants who need domestic services |
| **Provider (Partner)** | Individual skilled workers or small service businesses |
| **Admin** | PrimeSewa operations team managing quality and finance |

---

## 2. Application Portals & URLs

| Portal | URL | Purpose |
|---|---|---|
| Customer Storefront | `https://primeseva-mvp.web.app/` | Browse providers, book services, track jobs |
| Customer Login | `https://primeseva-mvp.web.app/login` | OTP-based login |
| Admin Panel | `https://primeseva-mvp.web.app/admin` | Dashboard for operations and finance |
| Admin Login | `https://primeseva-mvp.web.app/admin/login` | Master password login |
| Provider Dashboard | `https://primeseva-mvp.web.app/provider` | Accept jobs, manage earnings |
| Provider Login | `https://primeseva-mvp.web.app/provider/login` | OTP-based login |

---

## 3. Functional Details

### 3.1 Customer Portal

#### Authentication
- Enter name + mobile number → receive OTP → verify → access granted
- Dev fallback: OTP `1234` (when Firebase Blaze billing not enabled)
- Session persists across page refreshes (Firebase token)

#### Browse & Discover
- View 4 service categories: **Plumbing · Electrical · Cleaning · Carpentry**
- Click any category to filter providers by that service
- Search providers by name or category
- Filter providers by star rating (All / 4.0+ / 4.5+)
- View provider cards: name, rating, job count, price range
- "View Profile" → full provider detail modal

#### Book a Service
1. Click **Book Now** on a provider
2. Fill booking form: date, time, address, issue description
3. Click **Confirm Request** (button disables to prevent duplicates)
4. Booking created in Firestore with status `pending`
5. Success confirmation shown; booking appears in **Current Activity** sidebar

#### Track Bookings
- **Current Activity** sidebar: live view of all active bookings
- Status badges: `pending` → `accepted` → `completed`
- Negotiation alert: if provider proposes different price, customer can **Accept** or **Decline**
- **Cancel Booking**: cancel any `pending` or `accepted` job

#### Rate & Review
- Completed jobs show in **Past Bookings** section
- 5-star interactive rating widget
- Rating submitted updates provider's average score in Firestore

---

### 3.2 Provider (Partner) Portal

#### Registration & Onboarding
- Enter name, phone, service category, price per hour/job
- Registration saved to Firestore `providers` collection with `status: pending`
- Admin must approve before provider can receive work

#### Authentication
- OTP login matching registered phone number
- Dev fallback: OTP `1234`
- Status checked from Firestore on every login

#### Online/Offline Toggle
- Header switch: toggle **Online / Offline** availability
- Only online providers are shown to customers browsing

#### Service Requests
- View all incoming `pending` bookings assigned to this provider
- **Accept**: changes status to `accepted`, moves job to Active Jobs
- **Reject**: removes from requests, status set to `rejected`
- **Propose Price**: send a counter-price to the customer (triggers `negotiating` status)

#### Active Jobs
- View all `accepted` jobs with customer name, address, date/time
- **Mark Complete**: sets status to `completed`, triggers commission calculation
- **Call Customer**: initiates phone call to customer's number directly

#### Earnings Dashboard
- **Today's earnings**: net pay from today's completed jobs (85% of job value)
- **Weekly earnings**: aggregated from the 7-day window
- **Monthly earnings**: aggregated from the current month

#### Account Status States
| Status | What Happens |
|---|---|
| `pending` | Yellow warning banner, no requests shown |
| `active` | Full access — earnings, requests, active jobs visible |
| `suspended` | Red warning banner, Accept button hidden |

---

### 3.3 Admin Panel

#### Authentication
- Master password login (no OTP required for Admin in MVP)
- Role-based `ProtectedRoute` prevents non-admins from accessing `/admin/*`

#### Dashboard Overview
- **Total Bookings**: count of all bookings in Firestore
- **Pending Bookings**: bookings still waiting for provider
- **Active Providers**: providers with `status: active`
- **Commission Earned**: sum of all commission records (15% of completed jobs)
- Recent bookings feed (last 3, auto-refreshed)
- Pending provider approvals list with quick-review links

#### Provider Fleet Management (`/admin/providers`)
- Full table of all registered providers
- Provider details: name, category, phone, rating, status
- Actions: **Approve** (pending → active) · **Suspend** · **Reactivate**
- Status change reflects immediately in Firestore

#### Live Booking Monitor (`/admin/bookings`)
- Table of all bookings with filters: status, category, provider, date
- Advanced filter panel (collapsible)
- Status color badges: Pending (amber) · Accepted (blue) · Completed (green) · Cancelled (red) · Negotiating (purple)
- "Review Timeline" action per booking

#### Commission Management (`/admin/commissions`)
- Auto-generated records when any booking status changes to `completed`
- Commission = **15%** of final/agreed price
- Provider receives **85%** net
- CSV export UI (full export requires Cloud Functions — future)

#### Consumer Management (`/admin/users`)
- Table of all registered customers
- Actions: **Block** / **Unblock** customer accounts

---

## 4. Core Business Flow — Booking Lifecycle

```
Customer selects provider & fills form
              │
              ▼ [status: pending]
        Booking created in Firestore
              │
              ├──► Provider sees request
              │         │
              │    ┌─────┴──────┐
              │    │            │
              │  Accept      Propose Price
              │    │            │
              │    │       Customer sees
              │    │       negotiation alert
              │    │            │
              │    │      ┌─────┴──────┐
              │    │      │            │
              │    │   Accept       Decline
              │    │      │            │
              │    └──────┘      [status: rejected]
              │         │
              │  [status: accepted]
              │         │
              │    Provider does job
              │         │
              │  Mark Complete
              │         │
              ▼  [status: completed]
        Commission auto-calculated (15%)
        Provider earns 85% of job value
        Customer prompted to rate provider
```

---

## 5. Commission & Earnings Model

| Stakeholder | Share | Example (₹500 job) |
|---|---|---|
| **Provider** | 85% | ₹425 |
| **PrimeSewa** | 15% | ₹75 |
| **Customer pays** | 100% | ₹500 |

Commission records are created automatically in the `commissions` collection when any booking reaches `completed` status.

---

## 6. Role-Based Access Control

| Route Pattern | Access Rule | Redirect on Failure |
|---|---|---|
| `/app`, `/profile` | Customer role required | `/login` |
| `/admin/*` | Admin role required | `/admin/login` |
| `/provider/*` | Provider role required | `/provider/login` |

Roles are enforced by `ProtectedRoute.jsx` in React using the `userData.role` field from Firestore.

---

## 7. Technology Stack

### Architecture Overview

```
┌─────────────────────────────────────────────────────┐
│                   Browser / Mobile                   │
│  ┌───────────┐  ┌─────────────┐  ┌──────────────┐  │
│  │ Customer  │  │  Provider   │  │    Admin     │  │
│  │  Portal   │  │   Portal    │  │    Panel     │  │
│  └─────┬─────┘  └──────┬──────┘  └──────┬───────┘  │
└────────┼───────────────┼────────────────┼───────────┘
         └───────────────┼────────────────┘
                         │  Firebase SDK
         ┌───────────────▼───────────────────┐
         │         Firebase Platform          │
         │  Auth · Firestore · Hosting        │
         └───────────────────────────────────┘
                         │
         ┌───────────────▼───────────────────┐
         │  GitHub Actions (CI/CD)            │
         │  Secrets → Build → Deploy          │
         └───────────────────────────────────┘
```

### Frontend

| Attribute | Detail | Why Suitable |
|---|---|---|
| **React 18** | UI component framework | Component reuse across 3 portals, hooks for real-time state |
| **Vite 5** | Build tool | <100ms HMR in development, fast production bundles |
| **Tailwind CSS** | Utility-first styling | Rapid, consistent, mobile-first design system |
| **React Router v6** | SPA routing | Clean URLs, protected routes, no page reloads |
| **Lucide React** | Icon library | Lightweight, tree-shakeable, consistent icon set |

### Backend (BaaS — no custom server)

| Service | Firebase Feature | Why Suitable |
|---|---|---|
| **Authentication** | Phone OTP | India mobile-first, passwordless, no email management |
| **Data API** | Firestore SDK | Real-time reads, no REST server needed |
| **File storage** | Firebase Storage | Profile photos, document uploads (future) |
| **Push alerts** | FCM | Order notifications to customer & provider (future, needs Blaze) |
| **Automation** | Cloud Functions | Commission reports, CSV exports (future) |

### Database — Cloud Firestore

| Collection | Key Fields |
|---|---|
| `bookings` | `status`, `customer`, `provider`, `service`, `price`, `proposedPrice`, `date`, `time`, `address` |
| `providers` | `name`, `phone`, `uid`, `category`, `price`, `rating`, `jobs`, `status`, `isOnline` |
| `users` | `name`, `phone`, `uid`, `role`, `status` |
| `commissions` | `bookingId`, `provider`, `amount`, `commission`, `date` |

### Deployment & Security

| Layer | Technology | Detail |
|---|---|---|
| **Hosting** | Firebase Hosting | Global CDN, free SSL, SPA rewrites |
| **CI/CD** | GitHub Actions | Auto-deploy on push to `main` |
| **Secrets** | GitHub Repository Secrets | 6 Firebase env vars — never in git |
| **Build** | Vite + `.env` injection | `VITE_FIREBASE_*` injected at build time only |

---

## 8. Testing Summary (v2)

| Category | Total | ✅ Pass | ❌ Fail | ⚠️ Partial |
|---|---|---|---|---|
| Functional | 15 | 12 | 0 | 1 |
| Negative | 15 | 11 | 0 | 1 |
| Edge Case | 15 | 9 | 0 | 2 |
| API | 15 | 5 | 0 | 0 |
| UI/UX | 15 | 15 | 0 | 0 |
| **Total** | **75** | **52** | **0** | **4** |

---

## 9. MVP Limitations & Roadmap

| # | Current Limitation | Planned Upgrade |
|---|---|---|
| 1 | SMS OTP requires Firebase Blaze plan | Upgrade to Blaze or integrate MSG91/Twilio |
| 2 | Push notifications not active | Enable FCM on Blaze plan |
| 3 | Firestore security rules not deployed | Deploy `firestore.rules` with role-based read/write |
| 4 | No atomic booking transaction | Use Firestore `runTransaction()` to prevent double-booking |
| 5 | Admin security is password-only | Replace with Firebase Custom Claims for true role auth |
| 6 | No CSV/PDF export | Add Cloud Function to generate and email reports |
| 7 | No cancellation refund flow | Add refund workflow with provider penalty logic |
| 8 | No in-app chat | Integrate Firebase Realtime Database for customer-provider chat |
| 9 | No geolocation matching | Use Google Maps API to match nearest provider |
| 10 | Single-region deployment | Expand to multi-region Firestore for global latency |
