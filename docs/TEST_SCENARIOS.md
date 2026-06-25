# Gradion — Comprehensive Test Scenarios (Parent + Admin)

Target: http://localhost:5050 (frontend) / http://localhost:5001 (backend API)
Seed credentials (password `password123`): `admin@gradion.id`, `parent@gradion.id`,
`therapist@gradion.id`, `consultant@gradion.id`.
Legend: **(+)** positive / expected-success, **(−)** negative / expected-failure.

---

## 1. Landing page (unauthenticated)
| ID | Scenario | Steps | Expected |
|----|----------|-------|----------|
| L1 (+) | Landing renders | Open `/` | Hero "Recovery is possible", Visi & Misi, footer, nav (Knowledge Hub / Login / Register) |
| L2 (+) | Go to login | Click Login/Sign in | `/login` loads |
| L3 (+) | Go to register | Click Register / create account | `/register` loads |
| L4 (mobile) | Landing responsive | 390px viewport | Layout stacks, no overflow, hamburger/nav usable |

## 2. Registration
| ID | Scenario | Steps | Expected |
|----|----------|-------|----------|
| R1 (+) | Valid registration | Fill name/email/phone/`Password123!`/confirm + privacy → submit | Redirect `/verify-email`; backend logs SMTP send from care@gradion.id |
| R2 (−) | Weak password (no upper/special) | password `password123` | Inline error: needs uppercase + special char; submit blocked |
| R3 (−) | Password mismatch | confirm ≠ password | "Passwords do not match"; blocked |
| R4 (−) | Duplicate email | use `parent@gradion.id` | Clear message "account with this email already exists" (HTTP 409) |
| R5 (−) | Missing privacy consent | leave checkbox unchecked | "must agree to the Privacy Policy" |
| R6 (−) | Invalid email format | `abc` | Email validation error |
| R7 (+) | No Role field | inspect form | Role selector is absent; backend stores role=parent |
| R8 (−) | Invalid phone | letters | "Only + and numbers allowed" |

## 3. Login
| ID | Scenario | Steps | Expected |
|----|----------|-------|----------|
| LG1 (+) | Parent login | parent@gradion.id / password123 | Redirect `/dashboard`, role=parent |
| LG2 (+) | Admin login | admin@gradion.id / password123 | Redirect `/dashboard`, role=admin |
| LG3 (−) | Wrong password | parent@gradion.id / wrong | "Invalid email or password" |
| LG4 (−) | Unverified user | uiregtest1@example.com | Blocked: verify email first |
| LG5 (−) | Unknown email | nobody@x.com | Invalid email or password |
| LG6 (+) | Single login page | inspect `/login` | One page; NO Admin/Parent/Consultant links; Google button present; `/login/parent` → 404 |

## 4. Parent — Dashboard & navigation
| ID | Scenario | Expected |
|----|----------|----------|
| PD1 (+) | Dashboard renders | Children count, Quick actions (New Activity Log, Add Child), children list |
| PD2 (+) | Nav gating | Nav shows Dashboard, Children, My Logs, Reports, Profile; **no** Goals / Video Validation / Modules |
| PD3 (+) | Reports page | AI Summary & Recommendations section is **hidden** for parents |
| PD4 (−) | Admin route blocked | Visiting `/dashboard/admin/ai-content-review` as parent → "Access denied" |

## 5. Parent — Child page & register-child flow
| ID | Scenario | Expected |
|----|----------|----------|
| C1 (+) | View child | Child detail loads; Initial Observation checklist renders with **Frekuensi/Severity** column labels |
| C2 (+) | Add child step 1 | Name required; Next → step 2 |
| C3 (−) | Add child no name | Submit step 1 empty → blocked with error |
| C4 (+) | Observation defaults | Mandatory behavior sliders start at **1** (not "—"); F/S labels = Frekuensi/Severity |
| C5 (+) | Conditional optional | "Other major behavior" F/S optional unless its "(Specify)" text filled → can create without it |
| C6 (+) | Draft save/resume | "Save draft & exit", resume banner on return |
| C7 (+) | Create child | Child created; first-time → assessment + weekly program auto-generated (both pending) |
| C8 (+) | Pending gating | Parent sees "awaiting admin review" for assessment/program until admin approves |

## 6. Parent — Daily / weekly program
| ID | Scenario | Expected |
|----|----------|----------|
| DP1 (+) | Program visible after approval | Approved week shows program cards (name/domain/targets) |
| DP2 (+) | Start session | "Buat/perbarui minggu ini" / Start → guided or upload modal opens |

## 7. Admin — functionality
| ID | Scenario | Expected |
|----|----------|----------|
| A1 (+) | Admin nav | Full nav incl. Goals, Video Validation, Modul, Admin dropdown |
| A2 (+) | AI Content Review list | Pending assessments + weekly programs listed |
| A3 (+) | Parent-style render | Assessment shows formatted markdown; weekly program shows program cards (not raw JSON) |
| A4 (+) | Friendly editors | Assessment = rich-text toolbar; weekly = no-code form (fields + add/remove), no JSON |
| A5 (+) | Approve | Approve assessment + week → parent can now see them |
| A6 (+) | Reject / Delete | Reject hides; Delete removes |
| A7 (+) | Other admin pages | Users, Autism Cases, Master Programs, etc. load |

## 8. Backend API (direct)
| ID | Scenario | Expected |
|----|----------|----------|
| B1 (+) | Health | `GET /api/health` → 200 |
| B2 (+) | Login token | `POST /api/auth/login` → token |
| B3 (−) | Parent → admin endpoint | `GET /api/admin/ai-content` with parent token → 403 |
| B4 (+) | Parent gating (assessment) | `GET /api/children/:id` (parent) → report null + has_pending when not approved |
| B5 (+) | Parent gating (weeks) | `GET /api/aba-program/.../weeks` (parent) → plan_json null for non-approved |
| B6 (−) | Unauthenticated | protected endpoint without token → 401 |
| B7 (−) | Google bad token | `POST /api/auth/google` invalid → "authentication failed" (configured) |

## 9. UI/UX — desktop vs mobile consistency
| ID | Scenario | Expected |
|----|----------|----------|
| U1 | Landing | Desktop + 390px mobile both clean |
| U2 | Login | Form usable on mobile |
| U3 | Dashboard | Mobile shows hamburger menu; same nav items (minus gated) |
| U4 | Child page | Collapsible sections usable on mobile |
| U5 | Admin review | Buttons/editors usable on mobile |
