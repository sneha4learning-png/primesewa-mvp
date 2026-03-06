
# Test Case Document – PrimeSewa Hyperlocal Service Platform

Source BRD: AntiGravity Hyperlocal Service Booking MVP

## 1. Functional Test Cases

| Test Case ID | Test Category | Module | Scenario | Preconditions | Steps | Expected Result | Priority | Type | API Endpoint |
|---|---|---|---|---|---|---|---|---|---|
| FT-001 | Functional | Authentication | OTP login with valid mobile | User registered | Enter mobile → request OTP → enter correct OTP | User logged in successfully | High | Automation | /auth/otp |
| FT-002 | Functional | Customer App | Create booking | Logged in customer | Select category → provider → fill address → submit | Booking created with status pending | High | Automation | /bookings/create |
| FT-003 | Functional | Provider Panel | Provider accepts booking | Provider logged in | View pending lead → click accept | Booking status becomes accepted | High | Automation | /bookings/update |
| FT-004 | Functional | Booking Lifecycle | Provider proposes price | Booking pending | Provider proposes new price | Status changes to negotiating | High | Automation | /bookings/update |
| FT-005 | Functional | Booking Lifecycle | Customer accepts negotiated price | Booking negotiating | Click accept proposal | Booking status becomes accepted | High | Automation | /bookings/update |
| FT-006 | Functional | Booking Lifecycle | Provider marks job complete | Booking accepted | Click mark completed | Booking status completed | High | Automation | /bookings/update |
| FT-007 | Functional | Commission | Commission generated on completion | Completed booking | Trigger cloud function | Commission document created | High | Automation | /commissions |
| FT-008 | Functional | Admin Dashboard | Admin views booking monitor | Admin logged in | Navigate to bookings page | All bookings visible | High | Manual | N/A |
| FT-009 | Functional | Admin Dashboard | Suspend provider | Admin logged in | Open provider profile → suspend | Provider status updated | High | Automation | /providers/update |
| FT-010 | Functional | Notifications | Customer receives completion notification | Completed booking | Trigger FCM | Notification delivered | Medium | Automation | /notifications |
| FT-011 | Functional | Customer App | Rate completed booking | Booking completed | Open past bookings → rate | Rating saved | Medium | Automation | /ratings |
| FT-012 | Functional | Provider Panel | View earnings dashboard | Provider logged in | Navigate earnings page | Earnings ledger visible | Medium | Manual | N/A |
| FT-013 | Functional | Routing | Redirect unauthorized user | Non logged user | Access /provider | Redirect to login | High | Automation | N/A |
| FT-014 | Functional | Admin Dashboard | Export commission CSV | Admin logged in | Select range → export | CSV generated | Medium | Manual | /commissions/export |
| FT-015 | Functional | User Management | Admin blocks customer | Admin logged in | Block user | User cannot login | High | Automation | /users/block |

## 2. Negative Test Cases

| Test Case ID | Test Category | Module | Scenario | Preconditions | Steps | Expected Result | Priority | Type | API Endpoint |
|---|---|---|---|---|---|---|---|---|---|
| NT-001 | Negative | Authentication | Invalid OTP | OTP requested | Enter wrong OTP | Login rejected | High | Automation | /auth/otp |
| NT-002 | Negative | Booking | Create booking without login | User not logged in | Attempt booking | Error shown | High | Automation | /bookings/create |
| NT-003 | Negative | Booking | Provider accepts unauthorized booking | Different provider | Attempt accept | Action blocked | High | Automation | /bookings/update |
| NT-004 | Negative | Booking | Invalid status transition | Booking pending | Attempt complete | Validation error | High | Automation | /bookings/update |
| NT-005 | Negative | Commission | Commission accessed by provider | Provider login | Query commission | Access denied | High | Automation | /commissions |
| NT-006 | Negative | Firestore | Provider edits price | Accepted booking | Modify price field | Change rejected | High | Automation | Firestore rule |
| NT-007 | Negative | Security | Customer accesses other booking | Logged customer | Access other booking id | Access denied | High | Automation | /bookings |
| NT-008 | Negative | Routing | Customer access admin route | Logged customer | Open /admin | Redirect to login | High | Automation | N/A |
| NT-009 | Negative | Booking | Submit empty address | Booking form open | Submit blank | Validation message | Medium | Automation | UI |
| NT-010 | Negative | Notifications | Invalid device token | Notification trigger | Send FCM | Error handled | Medium | Automation | /notifications |
| NT-011 | Negative | API | Invalid request body | API request | Send malformed JSON | 400 response | High | Automation | /api |
| NT-012 | Negative | Provider Panel | Suspended provider accepts job | Provider suspended | Accept booking | Blocked action | High | Automation | /bookings/update |
| NT-013 | Negative | Auth | Session expired | Logged in | Access protected route | Forced login | High | Automation | N/A |
| NT-014 | Negative | Admin | Non admin export commission | Provider login | Access export | Denied | High | Automation | /commissions |
| NT-015 | Negative | Booking | Duplicate booking request | Same request | Submit twice | Single booking created | Medium | Automation | /bookings/create |

## 3. Edge Case Test Cases

| Test Case ID | Test Category | Module | Scenario | Preconditions | Steps | Expected Result | Priority | Type | API Endpoint |
|---|---|---|---|---|---|---|---|---|---|
| EC-001 | Edge | Booking | Simultaneous provider accept | Multiple providers | Accept simultaneously | Only one accepted | High | Automation | /bookings/update |
| EC-002 | Edge | Booking | Provider suspended mid job | Booking accepted | Admin suspends provider | Booking flagged | High | Automation | /providers/update |
| EC-003 | Edge | Booking | Network loss during booking | User booking | Disconnect internet | Retry prompt | Medium | Automation | N/A |
| EC-004 | Edge | Auth | OTP timeout | OTP requested | Wait expiry | OTP invalid | Medium | Automation | /auth |
| EC-005 | Edge | Commission | Commission rounding | Booking value decimal | Complete job | Accurate calculation | Medium | Automation | Cloud function |
| EC-006 | Edge | UI | Slow loading providers | Many providers | Load listing | Pagination works | Medium | Automation | N/A |
| EC-007 | Edge | Session | Local storage cleared | Logged in | Clear storage | Forced re-login | Medium | Automation | N/A |
| EC-008 | Edge | Booking | Customer cancels accepted job | Booking accepted | Cancel | Status cancelled | High | Automation | /bookings |
| EC-009 | Edge | Booking | Provider rejects job | Booking pending | Reject | Status rejected | High | Automation | /bookings |
| EC-010 | Edge | Commission | Booking cancelled | Booking cancelled | Trigger function | No commission | High | Automation | Cloud function |
| EC-011 | Edge | Admin | Override stuck booking | Booking stuck | Force complete | Status updated | High | Manual | /admin |
| EC-012 | Edge | Notifications | Multiple notifications | Rapid events | Trigger FCM | Deduplicated alerts | Medium | Automation | /notifications |
| EC-013 | Edge | Booking | Customer declines proposal | Negotiating | Decline | Status rejected | High | Automation | /bookings |
| EC-014 | Edge | Firestore | Large booking history | Many docs | Query | Performance acceptable | Medium | Automation | Firestore |
| EC-015 | Edge | API | High traffic | Load simulation | 100 requests | System stable | High | Automation | API |

## 4. API Test Cases

| Test Case ID | Test Category | Module | Scenario | Preconditions | Steps | Expected Result | Priority | Type | API Endpoint |
|---|---|---|---|---|---|---|---|---|---|
| API-001 | API | Booking | Create booking API | Auth token | POST booking | 201 created | High | Automation | /bookings/create |
| API-002 | API | Booking | Fetch bookings | Auth token | GET bookings | List returned | High | Automation | /bookings |
| API-003 | API | Booking | Update booking status | Valid booking | PATCH status | Status updated | High | Automation | /bookings/update |
| API-004 | API | Provider | Get provider list | Public | GET providers | Providers returned | Medium | Automation | /providers |
| API-005 | API | Auth | OTP request | Mobile provided | POST OTP | OTP sent | High | Automation | /auth/otp |
| API-006 | API | Auth | Verify OTP | OTP valid | POST verify | Auth success | High | Automation | /auth/verify |
| API-007 | API | Commission | Fetch commission | Admin auth | GET commissions | Commission list | High | Automation | /commissions |
| API-008 | API | Notification | Send notification | Token valid | POST send | Delivered | Medium | Automation | /notifications |
| API-009 | API | Provider | Update provider status | Admin auth | PATCH provider | Status changed | High | Automation | /providers/update |
| API-010 | API | Users | Fetch user history | Admin auth | GET users | History returned | Medium | Automation | /users |
| API-011 | API | Booking | Cancel booking | Auth user | PATCH cancel | Status cancelled | High | Automation | /bookings |
| API-012 | API | Booking | Reject booking | Provider auth | PATCH reject | Status rejected | High | Automation | /bookings |
| API-013 | API | Rating | Submit rating | Completed booking | POST rating | Rating saved | Medium | Automation | /ratings |
| API-014 | API | Export | Export CSV | Admin auth | GET export | File generated | Medium | Automation | /export |
| API-015 | API | Security | Unauthorized request | No auth | API call | 401 response | High | Automation | API |

## 5. UI / UX Test Cases

| Test Case ID | Test Category | Module | Scenario | Preconditions | Steps | Expected Result | Priority | Type | API Endpoint |
|---|---|---|---|---|---|---|---|---|---|
| UI-001 | UI | Landing Page | Verify landing page loads | Open site | Navigate root | Hero and categories visible | High | Manual | N/A |
| UI-002 | UI | Login Screen | OTP input UI validation | Login page open | Enter mobile | OTP input appears | High | Manual | N/A |
| UI-003 | UI | Customer Home | Category grid visible | Logged in | View home | Categories visible | High | Manual | N/A |
| UI-004 | UI | Provider Listing | Filter providers | Category selected | Apply filter | Provider list updates | Medium | Manual | N/A |
| UI-005 | UI | Booking Form | Address validation | Booking form open | Leave blank | Error message | High | Manual | N/A |
| UI-006 | UI | Booking Timeline | Show booking status | Booking exists | Open booking | Status timeline visible | High | Manual | N/A |
| UI-007 | UI | Provider Dashboard | Incoming leads UI | Provider login | Open dashboard | Leads displayed | High | Manual | N/A |
| UI-008 | UI | Earnings Screen | Ledger display | Provider login | Open earnings | Ledger visible | Medium | Manual | N/A |
| UI-009 | UI | Admin Dashboard | Metrics cards visible | Admin login | Open dashboard | Stats displayed | High | Manual | N/A |
| UI-010 | UI | Admin Table | Provider table pagination | Many providers | Scroll table | Pagination works | Medium | Manual | N/A |
| UI-011 | UI | Notification Bell | Notification dropdown | Admin login | Click bell | Alerts visible | Medium | Manual | N/A |
| UI-012 | UI | Rating Widget | 5 star rating interaction | Completed booking | Click stars | Rating saved | Medium | Manual | N/A |
| UI-013 | UI | Mobile View | Responsive layout | Mobile device | Open site | UI responsive | High | Manual | N/A |
| UI-014 | UI | Error Handling | API error message | Force API error | Submit form | Error message shown | Medium | Manual | N/A |
| UI-015 | UI | Logout | Logout functionality | Logged in | Click logout | Redirect to login | High | Manual | N/A |
