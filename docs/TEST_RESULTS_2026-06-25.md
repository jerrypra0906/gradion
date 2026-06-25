# Gradion — Regression Test Results (2026-06-25)

Target: http://localhost:5050 (frontend) / http://localhost:5001 (backend).
Method: Backend = direct API (curl); Frontend = live DOM assertions via Chrome
(Claude-in-Chrome MCP). Seed accounts used (`password123`).
Scenarios: see `docs/TEST_SCENARIOS.md`.

## Summary
**All executed functional checks PASSED (0 functional failures).**
Two tooling limitations prevented visual capture (see bottom): inline
**screenshots** and a **true mobile viewport** could not be produced in this
environment, so mobile/responsiveness was validated via responsive-CSS inspection.

## Backend API (curl)
| ID | Result |
|----|--------|
| B1 health 200 | ✅ |
| B2 parent + admin login tokens | ✅ |
| LG3 wrong password → 401 | ✅ |
| LG4 unverified login → 403 | ✅ |
| LG5 unknown email → 401 | ✅ |
| R4 duplicate email → 409 | ✅ |
| B3 parent → admin endpoint → 403 | ✅ |
| B6 no-token admin → 401 | ✅ |
| B7 Google endpoint configured (bad token → "authentication failed") | ✅ |
| B4 parent GET child (pending) → report null + has_pending | ✅ |
| B5 parent GET weeks (pending) → plan_json null | ✅ |
| Approve cycle → parent then sees report + plan (5 programs) | ✅ |

## Parent — frontend
| ID | Result |
|----|--------|
| LG1 parent login → /dashboard | ✅ |
| PD1 dashboard + quick actions | ✅ |
| PD2 nav = Dasbor/Anak/Catatan Saya/Laporan/Profil; no Goals/Video/Modules | ✅ |
| PD3 Reports page hides AI Summary | ✅ |
| PD4 admin route blocked ("Access denied") | ✅ |
| C1 child page headers = Perilaku / Frekuensi / Severity (no F/S) | ✅ |
| C2 add-child advances to step 2 | ✅ |
| C3 empty name blocked | ✅ |
| C4 step-2 labels Frekuensi/Severity + 6 sliders default "1" | ✅ |
| C5/C7/C8 conditional-optional, first-time auto-gen, pending gating | ✅ (backend-verified) |
| R1 valid registration + SMTP email from care@gradion.id | ✅ (verified earlier) |

## Registration negatives — frontend
| ID | Result |
|----|--------|
| R2 weak password shows requirements | ✅ |
| R3 password mismatch blocked | ✅ |
| R5 missing privacy consent blocked | ✅ |
| R6 invalid email error | ✅ |
| R7 no Role field (defaults parent) | ✅ |
| R8 invalid phone error | ✅ |

## Login
| ID | Result |
|----|--------|
| LG2 admin login → /dashboard (role=admin) | ✅ |
| LG6 single /login page; no role links; Google button; /login/parent → 404 | ✅ |

## Admin — frontend
| ID | Result |
|----|--------|
| A1 full nav (Tujuan, Validasi video, Modul, Admin, Sesi) | ✅ |
| A2 AI Content Review lists assessments + weekly programs | ✅ |
| A3 assessment renders as formatted markdown; week renders as program cards ("Program (5)") | ✅ |
| A4 weekly = no-code form (Nama program/Area-domain/+Tambah program, no JSON); assessment = rich-text toolbar (H/B/I/Poin/Kutipan) + live preview | ✅ |
| A5/A6 approve / reject / delete | ✅ (backend-verified) |
| A7 admin pages load (Users shows 5 accounts; Autism Cases) | ✅ |

## UI/UX desktop vs mobile
- Responsive nav coded mobile-first and correct: desktop menu `hidden md:flex`
  (hidden on mobile), hamburger `flex md:hidden` (shown on mobile). ✅ (CSS verified)
- A true 390px viewport could not be rendered (window resize was not honored
  below the laptop width in this environment), so visual mobile capture is pending.

## Tooling limitations (not app defects)
1. **Screenshots**: the screenshot tool waits for network-idle, but Google
   Identity Services (`accounts.google.com`, loaded app-wide by GoogleOAuthProvider)
   keeps a persistent connection, so idle never occurs → 45s timeout on every page.
   Functional state was verified via DOM assertions instead.
2. **Mobile viewport**: window resize to 390px did not shrink the viewport
   (innerWidth stayed at the laptop width), so mobile was validated via CSS.

Remedy to capture visuals: temporarily disable the Google provider / ad scripts
in a dev build, or use Chrome DevTools device-mode manually.
