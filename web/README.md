# AntiGravity MVP

## Project Overview
AntiGravity is a home services platform MVP facilitating connections between customers and service providers in Ahmedabad. 

## Completed Features
### 1. Admin Panel
- **Dashboard Overview Metrics:** Total bookings, Pending, Completed, Revenue, Commission, Active Providers.
- **Provider Management:** Approve/Reject, Suspend/Reactivate, *View Booking History*.
- **Booking Monitoring:** Filter by status, *Advanced Filters (Category, Date Range, Provider)*.
- **Commission Dashboard:** Aggregations, *Export CSV logic*.
- **User/Customer Management:** View customers, block/unblock.
- **Notifications:** *Status updates and actionable alerts in Admin Layout*.

### 2. Provider Panel
- **Provider Login:** OTP-based login and admin approval checks.
- **Profile Setup & Display:** Business Name, Category, *Service Areas in Ahmedabad*.
- **Booking Dashboard:** View Incoming, Active (Accepted), and Completed jobs.
- **Booking Actions:** Accept/Reject requests, Price negotiations.
- **Availability Toggle:** *Online/Offline status switch in header*.
- **Earnings Dashboard:** Display Net Earnings against platform commissions.

### 3. Customer Panel
- **Landing Page & Navigation:** Categories, City-Specific hero section.
- **Customer Authentication:** OTP-based flow & Session persistence.
- **Provider Listing:** View curated active providers based on category.
- **Provider Filters:** Filter providers by Minimum Rating (e.g., 4.0+, 4.5+).
- **Provider Details Page:** Modal displaying statistics, pricing, and mock reviews.
- **Service Booking:** Explicit Date & Time selection integrated into the quote process.
- **Live Status Tracking:** "Current Activity" pipeline for bookings (Pending -> Accepted -> Completed).
- **History View & Reviews:** View previous completed jobs and submit star ratings.
- **Profile Management:** Edit and manage Name and Mobile number via `/customer/profile`.
