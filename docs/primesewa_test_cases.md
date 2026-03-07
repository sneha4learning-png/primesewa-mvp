
# Test Case Document – PrimeSewa Hyperlocal Service Platform - [STATUS: UPDATED]

Source BRD: AntiGravity Hyperlocal Service Booking MVP

## 1. Functional Test Cases

| Test Case ID | Category | Module | Scenario | Steps | Expected Result | Priority | Status |
|---|---|---|---|---|---|---|---|
| FT-001 | Functional | Auth | Dev Mode OTP Fallback | Enter mobile → trigger error → view dev message | "Project is in Developer Mode..." message appears | High | Passed |
| FT-002 | Functional | Customer | Create booking (Fast Request) | Select category → provider → confirm (no address) | Booking created with status pending | High | Passed |
| FT-003 | Functional | Provider | Accept booking | View lead → click accept | Booking status becomes accepted | High | Passed |
| FT-004 | Functional | Booking | Negotiate price | Provider proposes new price | Status changes to negotiating | High | Passed |
| FT-005 | Functional | Booking | Accept proposal | Customer accepts new price | Booking status becomes accepted | High | Passed |
| FT-006 | Functional | Booking | Mark complete | Click mark completed | Booking status completed | High | Passed |
| FT-007 | Functional | Commission | Auto-calculate | Complete job | 15% commission record created | High | Passed |
| FT-008 | Functional | Admin | Unified Provider View | Click "View Details" on provider | History & profile shown in one modal | Medium | Passed |
| FT-009 | Functional | Admin | Icon-driven Actions | Hover over action icons | Tooltips appear, icons execute actions | Medium | Passed |
| FT-010 | Functional | Portal | Cross-Portal Navigation | Click "Switch to Provider" from Customer login | Redirects to Provider Login | Medium | Passed |
| FT-011 | Functional | Customer | Live Tracker | Accept job → view status tracker | Step-by-step progress visible to user | High | Passed |
| FT-012 | Functional | Provider | Identity Submission | Sign up → upload ID proof & work records | Data saved for Admin verification | High | Passed |
| FT-013 | Functional | Routing | Auth Guard | Access /admin without login | Redirect to Admin Login | High | Passed |
| FT-014 | Functional | Customer | Rate Service | Complete job → select stars | Rating saved & visible in history | Low | Passed |
| FT-015 | Functional | Admin | Export CSV | Select range → export | commissions_export.csv generated | Medium | Passed |

## 2. Negative Test Cases

| Test Case ID | Category | Module | Scenario | Steps | Expected Result | Priority | Status |
|---|---|---|---|---|---|---|---|
| NT-001 | Negative | Auth | Invalid OTP | Enter wrong OTP | Error: "Invalid OTP. Please try again." | High | Passed |
| NT-002 | Negative | Auth | Blocked User | Try login with blocked phone | Error: "Your account has been blocked" | High | Passed |
| NT-003 | Negative | Booking | Unauthorized Accept | Provider A accepts Provider B's job | Firebase rules block transaction | High | Passed |
| NT-004 | Negative | Booking | Invalid Transition | Complete a 'Pending' job | Logic blocks direct completion | Medium | Passed |
| NT-005 | Negative | Provider | Suspended Access | Suspended provider tries login | Error: "Account suspended" | High | Passed |
| NT-006 | Negative | Security | Direct URL Access | Customer types /admin/dashboard | Redirect to Admin Login | High | Passed |
| NT-007 | Negative | Auth | SMS Failure Handling | Firebase billing inactive → send OTP | Professional dev-mode warning shown | High | Passed |

## 3. Edge Case Test Cases

| Test Case ID | Category | Module | Scenario | Steps | Expected Result | Priority | Status |
|---|---|---|---|---|---|---|---|
| EC-001 | Edge | Auth | Dev Code 1234 Usage | Use dev code if SMS fails | Successful login in dev environment | High | Passed |
| EC-002 | Edge | Booking | Provider Rejected Job | Click "Reject" on lead | Status correctly set to rejected | Medium | Passed |
| EC-003 | Edge | UI | Responsive Dashboard | Open Admin panel on 768px | Sidebar collapses or adapts | Medium | Passed |
| EC-004 | Edge | Auth | Session Persistence | Refresh page while logged in | User remains logged in (localStorage) | High | Passed |
| EC-005 | Edge | Admin | Empty Fleet Data | View Provider table with zero data | "No active providers available" message | Low | Passed |

