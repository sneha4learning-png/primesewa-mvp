# Functional Project Plan — PrimeSewa MVP

## 1. Core Mission
To provide a seamless, real-time marketplace for home services (Plumbing, Electrical, Cleaning, etc.) by connecting verified providers with customers through a mobile-first web experience.

---

## 2. Technology Stack & Rationale

| Technology | Role | Why We Used This |
|---|---|---|
| **React 18** | UI Framework | **Component-Based Architecture**: Allows reusing complex UI elements (like provider cards and booking status trackers) across Customer, Provider, and Admin portals. |
| **Vite 5** | Build Tool | **Speed**: Offers near-instant Hot Module Replacement (HMR). Traditional tools like Webpack are too slow for an agile MVP rollout. |
| **Firebase Auth** | Authentication | **OTP Integration**: Crucial for the Indian market where mobile-first (phone-only) login is the standard. It eliminates the need for managing vulnerable password databases. |
| **Cloud Firestore** | Database | **Real-Time Sync**: Vital for booking tracking. When a provider accepts a job, the customer's screen updates instantly without a refresh. No REST API boilerplate required. |
| **Tailwind CSS** | Styling | **Efficiency**: Enables rapid, responsive design directly in HTML. Ensures a modern, "premium" look without writing thousands of lines of custom CSS. |
| **Lucide React** | Iconography | **Visual Clarity**: Lightweight, consistent icons improve the UX for users who navigate by visuals (especially relevant for varied service categories). |
| **GitHub Actions** | CI/CD | **Automation**: Every change to the `main` branch is automatically built and deployed to the URL, ensuring the team always sees the latest work. |

---

## 3. Functional Modules

### 3.1 Customer Module
*   **Discovery**: Browse services by category (Plumbing, Repair, etc.) with real-time filtering and star-rating sorting.
*   **Booking Engine**: One-click booking flow that prevents duplicate requests and captures specific job details (address, time, issues).
*   **Live Tracker**: A visual "journey" interface that updates as the provider transitions from `Accepted` → `On the Way` → `Arrived`.
*   **Rating System**: Post-job feedback loop that directly calculates and updates the provider's reputation.

### 3.2 Provider (Partner) Module
*   **Onboarding**: Multi-step registration capturing Identity Proof and Work Experience for quality control.
*   **Availability Toggle**: Simple Online/Offline switch to control visibility in the marketplace.
*   **Job Negotiation**: Ability to counter-offer prices, enabling a flexible marketplace for custom jobs.
*   **Earnings Wallet**: Real-time aggregation of Daily/Weekly/Monthly income (net 85% after platform commission).

### 3.3 Admin Panel (Operations)
*   **Fleet Control**: Centralized table to Approve, Suspend, or Reactivate providers based on their credentials.
*   **Live Monitor**: Global overview of all booking activities to ensure no request goes unanswered.
*   **Commission Tracking**: Automated 15% revenue calculation on every completed job.

---

## 4. Key Logic & Success Factors
*   **Provider Deduplication**: Advanced logic to merge duplicate profiles and prioritize the most complete "Active" profile.
*   **Role-Based Access (RBAC)**: Secure routing ensures Customers cannot access Admin tools and vice-versa.
*   **Zero-Refresh UI**: Leveraging Firebase listeners so the entire booking lifecycle feels like a native mobile app.

---

**Current Status**: Deployed at [https://primeseva-mvp.web.app](https://primeseva-mvp.web.app)
