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

| Domain | Key Functionalities |
|---|---|
| **Authentication** | • Mobile + Name login<br>• Real OTP (or `1234` dev fallback)<br>• Token-based session survival (Firebase) |
| **Discovery** | • Browsing by 4 core categories: Plumbing, Electrical, Cleaning, Carpentry<br>• Search & Sorting (Name, Category, Rating 4.0+/4.5+)<br>• Rich Provider Profiles (ratings, history, rates) |
| **Booking Engine** | • One-click "Book Now" flow<br>• Detailed capture: Issue description, specific Date/Time, Address<br>• Double-booking prevention via button locking |
| **Live Monitoring** | • **Current Activity** sidebar for real-time status updates<br>• Status transitions (Pending → Accepted → Arrived → Completed)<br>• **Price Negotiation**: Accept/Decline counter-offers from providers |
| **Reputation** | • Interactive 1-5 star review system after job completion<br>• Real-time reputation updates for providers |

---

### 3.2 Provider (Partner) Portal

| Domain | Key Functionalities |
|---|---|
| **Partner Lifecycle** | • Multi-step registration: Name, Phone, Category, Rate<br>• **Identity Verification**: ID upload (Aadhar/PAN) + Work samples<br>• Admin approval gate (Status starts as `pending`) |
| **Authentication** | • OTP login verified against registered partner phone<br>• Role check: Redirects away from customer-only pages |
| **Operations** | • **Online/Offline Switch**: Instantly control visibility to customers<br>• Real-time request feed for incoming leads |
| **Job Management** | • **Accept/Reject**: One-click leads management<br>• **Price Negotiation**: Propose custom quotes (enters `negotiating` state)<br>• **Active Tracker**: Direct call to customer & "Complete Job" action |
| **Wallet** | • Aggregated earnings dashboard: Today, This Week, This Month<br>• Net payout calculation (85% of job value) |

#### Account Status States
| Status | What Happens |
|---|---|
| `pending` | Yellow warning banner, no requests shown |
| `active` | Full access — earnings, requests, active jobs visible |
| `suspended` | Red warning banner, Accept button hidden |

---

### 3.3 Admin Panel

| Domain | Key Functionalities |
|---|---|
| **Authentication** | • Master password admin login<br>• Security guards for all `/admin/*` routes |
| **Insights** | • Global KPI Dashboard: Total Bookings, Commissions, Active Fleet<br>• Real-time "Recent Activity" feed |
| **Fleet Ops** | • **Unified Monitoring**: Approve, Suspend, or Reactivate providers<br>• Identity record review (ID scan verification) |
| **Finance** | • Automated **15% Commission** calculation on completion<br>• History of all platform revenue records |
| **Monitoring** | • **Live Booking Monitor**: Advanced filtering by Category, Provider, and Date Range<br>• Detailed booking timelines and history |
| **Moderation** | • Customer management table<br>• Block/Unblock suspicious or problematic accounts |

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
              │    Live Tracking (Provider updates arrival status)
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
