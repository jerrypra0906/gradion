# Gradion HTML mockups

Static page mockups aligned with the Next.js app (Tailwind CDN, no API).

## Open locally

```bash
open docs/html-mockups/index.html
```

Or serve the folder:

```bash
cd docs/html-mockups && python3 -m http.server 8765
# http://localhost:8765
```

## Files

| File | App route |
|------|-----------|
| `01-landing.html` | `/` |
| `02-login.html` | `/login/parent` |
| `03-dashboard.html` | `/dashboard` |
| `04-child.html` | `/dashboard/children/[id]` |
| `05-initial-observation.html` | `/dashboard/children/new` (step 2) |
| `06-program.html` | `/dashboard/children/[id]/aba-program` |

Each page includes a dark **Mockup** bar for navigation between files.
