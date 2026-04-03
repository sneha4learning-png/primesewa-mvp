# AntiGravity - Hyperlocal Service Booking MVP
## Business Requirement Document (BRD) - [STATUS: UPDATED & IMPLEMENTED]

**Project Code:** AG-WEB-MVP
**Target City:** Ahmedabad
**Timeline:** 14-day realistic build
**Business Model:** Commission-based (Default 15%)
**Platform:** Web Application (Responsive Mobile & Desktop)

---

## 1. Objective & Scope
The objective is to pivot from a mobile-first approach to a web-based system for the Anti Gravity hyperlocal service platform. The MVP focuses strictly on core booking mechanics without introducing complex wallets or external payment gateways to meet the aggressive 14-day timeline. 

The system will facilitate connecting Customers in Ahmedabad with local verified Service Providers (Electricians, Cleaners, etc.) while providing platform owners with a robust command center to manage operations and track 15% booking commissions.

---

## PHASE 1 – WEB SYSTEM ARCHITECTURE

### 1.1 Core Web Modules
1.  **Customer Web App:** A responsive web application optimized for mobile browsers allowing users to discover services, book providers, and track their arrival in real-time.
2.  **Provider Web Panel:** A secure portal for service partners to accept/reject jobs, view booking details, track payouts, and update their live tracking status.
3.  **Admin Dashboard:** The primary operational control system for the business owners to govern the entire marketplace.

### 1.2 Layered Architecture
*   **Frontend Layer:** React.js / Vite / Tailwind CSS.
*   **API / Service Layer:** Firebase Client SDKs for direct frontend-to-backend communication. Firebase Cloud Functions for secure server-side logic (commissions, aggregations).
*   **Database Layer:** Firebase Cloud Firestore (NoSQL).
*   **Auth Layer:** Firebase Authentication (Phone/OTP based).
*   **Notification Layer:** Firebase Cloud Messaging (FCM) for web push notifications.

### 1.3 Role-Based Access Logic
*   **Customer Scope:** Read/Write personal profile, Read public categories/providers, Read/Write personal bookings.
*   **Provider Scope:** Read/Write personal profile & status, Read assigned bookings, Update specific status flags on active bookings, Read personal earnings.
*   **Admin Scope:** Full global Read/Write access across all collections (Users, Providers, Bookings, Categories, Commissions).

---

## PHASE 2 – ADMIN DASHBOARD STRUCTURE (Detailed)

### A. Dashboard Overview Page
**Purpose:** High-level operational health snapshot.
**Metrics Displayed:**
*   Total Bookings, Pending Bookings, Total Revenue, Commission Earned (15%), Active Providers.
**Calculation Logic:**
Computed via real-time Firestore `onSnapshot` listeners on the `bookings` and `providers` collections. Financials (Total Revenue, Commission Earned) are calculated on-the-fly from bookings with `status: 'completed'`.

### B. Provider Management Module
**Features:** 
*   Data table listing all registered providers with consolidated detail views (merging profile, identity proofs, and history into a single modal).
*   Icon-driven action buttons (Approve, Reject, Suspend, Reactivate) with intuitive tooltips.
*   View provider profile, submitted identity proofs, experience details, and historical bookings.
**Firestore Updates:** Updates the `status` ('active', 'suspended', 'pending', 'rejected') field in the `/providers` collection.
**Edge Case Handling:** Suspending an active provider triggers a backend check to flag any currently 'pending' or 'accepted' bookings for Admin manual reassignment.

### C. Booking Monitoring Module
**Features:**
*   Live list of all bookings across the platform, reverse sorted by `createdAt` timestamp.
*   Advanced Filters: Status (Pending, Negotiating, Accepted, Completed, Cancelled, Rejected), Date (Today, Yesterday, Tomorrow), Category, Provider.
*   Financial Display: Show final negotiated price or original request amount.
*   Booking Journey Timeline: Interactive modal showing lifecycle of each booking.
**Query Logic:** `db.collection('bookings').onSnapshot(snapshot => { ... sorted by newest first ... })`.
**Validation:** Admin can track the entire timeline from creation to completion, including provider tracking updates.

### D. Commission Dashboard
**Display:** 
*   List view of recent platform commissions (15% cut) generated per booking.
*   Aggregated total commission for selected periods (Last 7 Days, This Month, All Time).
*   Daily Earnings Trend chart (Last 7 Days).
*   Individual Provider Earning breakdown (85% Net).
*   CSV Export functionality for financial reporting.
**Calculation Logic:** Real-time calculation from `bookings` collection filtering for `status == 'completed'`.

### E. User Management Module
**Features:**
*   Data table of all registered consumers.
*   View individual user booking history.
*   Block user functionality (prevents further logins/bookings).
*   Audit activity metrics (joined date, lifetime total bookings).

---

## PHASE 3 – CUSTOMER WEB APP STRUCTURE
*Accessible via `/customer`*

**Screens & Flow:**
1.  **Landing Page:** Hero banner, Trust signals, Popular Categories grid. Directs user to login or browse.
2.  **Login (OTP):** Firebase Phone Auth UI (Mock OTP for MVP). Captures mobile number and verifies OTP.
3.  **Home Page (`/customer/dashboard`):** Personalized greeting, interactive category selection, featured local providers.
4.  **Category Selection:** Dedicated tiles for: Plumbing, Electrical, Cleaning, Carpentry, Painting, AC Repair, Appliance Repair, Pest Control, Salon & Beauty, Packers & Movers.
5.  **Provider Listing (Search Results):** Filtered view of active and approved providers matching a selected category.
6.  **Provider Detail:** Provider initial avatar, ratings, total jobs completed, price estimations.
7.  **Booking Form:** Captures exact service address, specific **House/Flat/Floor No**, optional issue description, and preferred Date/Time via modal. Integrated with **OpenStreetMap Nominatim API** for live address autocomplete, reverse geocoding, and coordinate capture.
8.  **Booking Confirmation:** Success card and status entry placed into "Current Activity". Supports **Guest Booking Persistence**: guest users can fill the form, login, and have their details automatically restored from `sessionStorage`.
9.  **Booking Status / History:** Live timeline (`pending` > `negotiating` > `accepted` > `completed`). Support for Accepting/Declining custom price proposals. Post-acceptance, a live tracker lets customers monitor provider arrival status. Providers can see precise doorstep details (House No) alongside map links.
10. **Rating:** Interactive 5-star rating component appears in the "Past Bookings" list once the job is marked `completed`.

---

## PHASE 4 – PROVIDER WEB PANEL STRUCTURE
*Accessible via `/provider`*

**Screens & Flow:**
1.  **Registration / Login:** Firebase Phone Auth UI (Mock OTP for MVP). Registration requires submitting verifiable identity proof and a portfolio of previous work experience.
2.  **Dashboard (`/provider`):** Incoming leads and active jobs. Allows accepting, rejecting, or proposing custom prices with instant UI feedback.
3.  **Active Booking Detail:** Shows customer address (prominent House No), price, and status. Providers update their journey via status buttons: **En Route**, **Arrived**, **In Progress**. Includes a final "Mark as Completed" button.
4.  **Earnings Overview:** Financial dashboard showing Net Earnings (85%) for Today, This Week, and This Month with a 7-day bar chart trend.
5.  **Profile (`/provider/profile`):** Read-only view of current ratings, jobs completed, registered phone, and active status.

**Approval Gating Logic:** If a provider is `pending` or `suspended` in the database, they are shown a persistent banner on their dashboard warning them of restricted access until Admin intervention.

---

## PHASE 5 – ROLE-BASED ROUTING & AUTH

**Implementation Logic:**
*   **Role Detection:** Utilizing `AuthContext` with database mapping for MVP development. Local phone mock auth associates local users with their roles (Admin, Provider, Customer).
*   **Session Persistence:** Managed by mock mapping to `localStorage` (`mockDb.js`) syncing for state retention across roles.
*   **Route Protection (React Router):**
    *   `/admin/*` routes wrapped in `<AdminRoute>`.
    *   `/provider/*` routes wrapped in `<ProviderRoute>`.
    *   `/customer/*` routes wrapped in `<CustomerRoute>`, with generic root `/` redirecting to the `/customer` landing page.
*   **Unauthorized Handling:** Directs intruders to the respective context `/login` page (Admin Login, Provider Login, or Customer Login).

---

## PHASE 6 – BOOKING LOGIC (Web Context)

**Lifecycle States:**
1.  **Pending:** Created by customer. Awaiting provider response.
    *   *Path A:* Provider accepts -> shifts to `accepted`.
    *   *Path B:* Provider proposes a new price -> shifts to `negotiating`.
    *   *Path C:* Provider rejects -> shifts to `rejected`.
2.  **Negotiating:** Provider proposed a new price.
    *   *Path A:* Customer accepts new price -> shifts to `accepted`.
    *   *Path B:* Customer declines price -> shifts to `rejected`.
3.  **Accepted:** Provider has committed.
    *   *Path A:* Work finishes -> Provider updates tracking (`enroute` > `arrived` > `inprogress`) -> clicks 'Complete' -> shifts to `completed`.
    *   *Path B:* Customer cancels -> shifts to `cancelled`.
4.  **Completed:** Terminal state. Net earnings and commission displayed in dashboards.
5.  **Cancelled / Rejected:** Terminal state. No commission.

**Firestore Update Flow & Commission:**
When a Provider marks a job `completed` via the UI:
1. Client updates booking `status: 'completed'`.
2. A Firestore Cloud Function (`onUpdate`) detects this specific status change.
3. The server calculates 15% of the `bookingValue`.
4. The server creates a secure document in `/commissions`.
5. FCM pushes a "Job Finished & Receipt" notification to the Customer.

---

## PHASE 7 – FIRESTORE SECURITY RULES

**Core Philosophies (Web-Safe):**
1.  **Admin:** Full read/write over the entire database via `request.auth.token.admin == true` custom claim.
2.  **Providers:** Cannot modify the `price`, `commission`, or `customerId` fields on a booking. They can only modify the `status` field of a booking where `resource.data.providerId == request.auth.uid`.
3.  **Customers:** Can only read/write documents where `resource.data.customerId == request.auth.uid`.
4.  **Commission Collection:** Strictly Read/Write locked to Admins and backend Cloud Functions only.

---

## PHASE 8 – ADMIN UX DESIGN STRUCTURE

**Design Approach:** 
Clean, data-dense, minimalist UI optimized for desktop monitors. Utilizing standard table patterns with pagination and persistent sidebars.

**Layout Architecture:**
*   **Sidebar Navigation (Left, Fixed):**
    *   Dashboard Overview
    *   Provider Fleet
    *   Booking Monitor
    *   Commission Reports
    *   Consumer Management
    *   Settings
*   **Top Bar (Top, Fixed):**
    *   Global Search Input (Lookup by ID or Phone).
    *   Admin Profile / Avatar.
    *   Notification Bell (Alerts for reported providers or system errors).
    *   Secure Logout.

---

## PHASE 9 – MVP DEPLOYMENT PLAN

**Deployment Checklist:**
1.  [ ] **Firebase Initialization:** Provision Auth, Firestore, Storage, Hosting.
2.  [ ] **Admin Initialization:** Manually script/inject Custom Claims (`admin: true`) to the founding team's auth UIDs.
3.  [ ] **Environment Specs:** Tie `.env.production` pointing exclusively to the Prod Firebase project.
4.  [ ] **Index Deployment:** Deploy `firestore.indexes.json` to support multi-field sorting on the Bookings dashboard.
5.  [ ] **Security Rules:** Deploy the web-safe `firestore.rules`.
6.  [ ] **Hosting Build:** Run `npm run build`. Configure `firebase.json` to serve `index.html` for all routes (SPA setup).
10. [ ] **Go Live:** Fire `firebase deploy --only hosting`.

## 10. IMPLEMENTED MVP FEATURES (Development Reality)
This section highlights the actual technical and feature decisions made during the MVP development phase:
*   **Anchor-Based UI Navigation:** Integrated hash fragments (`#service-catalog`, `#top`) with `scroll-mt-28` offsets (via Tailwind) to allow seamless navigation between dashboard sections without page reloads, while accounting for the sticky header height.
*   **Provider Interaction Design:** Refined the provider card UX by replacing "whole-card" click events with a dedicated **Info (i) icon**, preventing accidental navigation and ensuring explicit user intent when viewing profiles.
*   **Typography & Visual Accessibility:** Enhanced readability by increasing font sizes from 7px to 10px+ and switching from light-gray (`slate-500`) to high-contrast (`slate-800`) text across all micro-labels on the dashboard.
*   **Data Integrity & Profile Accuracy:** Implemented logic to prioritize the **Active Auth Session** over potentially stale Firestore data for phone numbers and names, synchronized with a real-time (onSnapshot) booking count tracker in the customer profile.
*   **Authentication Resiliency:** Implemented Firebase Phone Auth (reCAPTCHA invisible) with a built-in **Dev Mode Fallback** (OTP: 1234, Admin Password: 'admin') to bypass billing restrictions during testing.
*   **Automated CI/CD:** Defined a `.github/workflows/deploy.yml` pipeline that dynamically injects environment secrets and deploys to Firebase Hosting on every push to the `main` branch.
*   **Live Journey Tracking:** Implemented granular tracking for the provider's journey: `enroute` (🚗), `arrived` (📍), and `inprogress` (🔧), providing real-time transparency to the customer via the **Activity Hub**.
*   **Doorstep Detail (House No):** Implemented a mandatory "House / Flat / Floor No" field to supplement general map addresses, displayed prominently to providers in high-contrast badges for zero-confusion navigation.
*   **Guest Booking Persistence (Session Recovery):** Implemented `sessionStorage` logic to allow guest users to start a booking, redirect to login, and return with all form data (date, time, address, coordinates) pre-filled.
*   **Analytics Dashboards:** Integrated **Recharts** for visual tracking of booking trends, revenue, and daily earnings across Admin and Provider panels.
*   **Map Integration:** Leveraged OpenStreetMap for both coordinate selection during booking and visual tracking on finalized booking details.
