# CLAUDE.md — RS Express Parking

## Project Summary

RS Express Parking is a **meet-and-greet airport parking booking platform** serving two brands from a single codebase:

- **rsexpressparking.com** — RS Express Parking (Dublin Airport)
- **dublinairportexpressparking.ie** — Dublin Airport Express Parking

**Target users:** Travellers booking pre-paid parking at Dublin Airport. Secondary users include company staff managing bookings via an internal finance dashboard, and a supplier/vendor layer (B2B).

**Core features:**
- Multi-step online booking (service selection → car/flight details → add-ons → Stripe payment)
- Customer dashboard (view bookings, reschedule)
- Finance/admin dashboard (booking management, revenue, expenses)
- Blog with TinyMCE CMS
- Coupon/discount system and loyalty bonus points
- Celery-driven async email + PDF invoice delivery
- Dual-domain support from one backend with per-domain email config, sitemap, and service visibility

---

## Tech Stack

### Frontend
| Item | Version |
|------|---------|
| React | 19.0.0 |
| Vite | 6.3.x |
| react-router-dom | 7.6.x |
| Bootstrap | 5.3.5 |
| react-bootstrap | 2.10.9 |
| @stripe/react-stripe-js | 3.7.x |
| react-helmet-async | 2.0.5 |
| luxon | 3.6.x (date handling) |
| swiper | 11.2.x (carousels) |
| recharts | 2.15.x (finance charts) |
| tinymce + @tinymce/tinymce-react | 8.3.x / 6.3.x (blog editor, self-hosted) |
| react-icons | 5.5.x |
| react-toastify | 11.0.x |
| react-floating-whatsapp | 5.0.x |
| react-international-phone | 4.5.x |
| @lottiefiles/dotlottie-react | 0.17.x |
| sass-embedded | 1.87.x (dev) |

### Backend
| Item | Version |
|------|---------|
| Python / Django | 5.2 |
| Django REST Framework | 3.16.0 |
| djangorestframework-simplejwt | 5.5.0 |
| MySQL (mysqlclient) | — |
| Celery | 5.5.x |
| Redis | 6.1.x |
| django-celery-beat | 2.8.x |
| Stripe SDK | 12.0.1 |
| WeasyPrint / ReportLab / pypdf | — (PDF invoices) |
| django-cors-headers | 4.7.0 |
| WhiteNoise | — (static file serving + compression) |
| python-decouple | — (.env config) |
| Hostinger SMTP | — (transactional email) |

---

## Architecture Overview

```
Browser
  │
  ├── React SPA (Vite, served as static files)
  │     ├── react-router-dom handles all client-side routing
  │     ├── AuthContext   → JWT tokens in localStorage
  │     ├── BookingContext → multi-step form state in localStorage
  │     └── fetch.js wrapper → auto-attaches Bearer tokens, handles 401 refresh
  │
  └── Django API (DRF, /api/*)
        ├── JWT auth via simplejwt
        ├── MySQL database
        ├── Celery + Redis → async emails + invoice PDFs
        └── Stripe webhooks → payment confirmation
```

**Data flow — booking lifecycle:**
1. User picks service on Home page → routed to `/book/:slug`
2. BookingForm (4 steps): login/register → car+flight details → add-ons → Stripe payment
3. Stripe payment → POST `/api/payments/checkout/` → backend creates `Booking` record
4. Celery fires confirmation email with PDF invoice
5. Customer views/reschedules via `/customer-dashboard`
6. Staff manage via `/finance-dashboard` (separate JWT, injected via URL query param)

**Multi-domain logic:**
- `request.get_host()` in backend views resolves which brand is active
- `Booking.website` and `Service.website` fields tag records per brand
- Sitemap and emails are domain-aware; Dublin domain excludes blog sitemap

---

## Folder Structure

```
rsexpressparking/
├── CLAUDE.md                        ← this file
├── project_context.md               ← architecture reference doc
├── frontend_ui_context.md           ← UI/CSS reference doc
│
├── frontend/
│   ├── package.json
│   ├── vite.config.js
│   ├── .env                         ← VITE_API_BASE_URL, VITE_STRIPE_PUBLIC_KEY, VITE_TINYMCE_API_KEY
│   ├── index.html
│   └── src/
│       ├── main.jsx                 ← DOM entry; wraps BookingProvider → AuthProvider → HelmetProvider → BrowserRouter
│       ├── App.jsx                  ← All route definitions + WhatsApp widget logic
│       ├── ContactUs.css            ← Imported globally in main.jsx (quirk)
│       ├── pages/
│       │   ├── Home.jsx             ← Landing page; lazy-loads heavy sections
│       │   ├── BookingForm.jsx      ← 4-step booking wizard
│       │   ├── CustomerDashboard.jsx
│       │   ├── FinanceDashboard.jsx ← Admin overview; uses useFinanceJwtFromUrl hook
│       │   ├── BlogList.jsx
│       │   ├── BlogDetail.jsx
│       │   ├── Services.jsx
│       │   ├── Login.jsx / ForgotPassword.jsx / ResetPassword.jsx
│       │   ├── ContactUs.jsx
│       │   ├── TermsAndConditions.jsx / PrivacyPolicy.jsx
│       │   ├── ThankYouPage.jsx / UnauthorizedPage.jsx / NotFound404.jsx
│       │   ├── SitemapPage.jsx
│       │   └── Blog.css             ← Blog page styles (imported globally in main.jsx)
│       ├── components/
│       │   ├── AdminLayout/         ← Persistent admin navbar wrapper (Outlet-based)
│       │   ├── BookingForm/         ← Step0–Step4 form components + price summary
│       │   ├── CustomerDashboard/   ← Booking cards, reschedule modal
│       │   ├── FinanceDashboard/    ← Finance panels + BlogAdmin (BlogDashboard, BlogPostForm)
│       │   ├── HomePage/            ← BookingDatesForm, FAQSection, testimonials, etc.
│       │   ├── Services/            ← Service list + modal
│       │   └── Utility/             ← Header, Footer, CookieBanner, dialogs
│       ├── auth/
│       │   ├── AuthContext.jsx      ← Login/logout state; stores user in Context
│       │   └── fetch.js             ← Custom fetch wrapper with JWT injection + 401 auto-refresh
│       ├── context/
│       │   └── BookingContext.jsx   ← Booking form state; persisted to localStorage
│       ├── assets/                  ← Images, WebP assets, MP4 video, avatar
│       ├── api/                     ← Mostly empty (legacy Axios remnant)
│       └── utils/                   ← Misc helpers
│
├── backend/
│   ├── manage.py
│   ├── requirements.txt
│   ├── .env                         ← DB, Stripe, email, Redis config
│   ├── backend/                     ← Django project config package
│   │   ├── settings.py
│   │   ├── urls.py                  ← Root URL config; custom sitemap + JWT login endpoints
│   │   ├── celery.py
│   │   ├── wsgi.py / asgi.py / passenger_wsgi.py
│   ├── users/                       ← CustomUser, Supplier models; auth endpoints
│   ├── services/                    ← Service, AddOn, Coupon models + views
│   ├── bookings/                    ← Booking, BookingUser models; CRUD + reschedule
│   ├── payments/                    ← Stripe checkout + webhook handler
│   ├── blogs/                       ← Blog CRUD; blogs_jwt_login; SEORedirectMiddleware; sitemaps
│   ├── finance/                     ← Finance dashboard views; finance_jwt_login
│   ├── faq/                         ← FAQ CRUD
│   ├── contact/                     ← Contact form submissions
│   ├── core/                        ← Status model, BookingSettings, shared permissions, robots.txt, core sitemaps
│   ├── templates/                   ← HTML email templates
│   ├── static/                      ← Backend static assets (logos for PDFs)
│   ├── staticfiles/                 ← collectstatic output
│   └── media/                       ← Uploaded files (service images, blog images)
│
└── perf/
    └── check-perf-budget.mjs        ← Performance budget checker (npm run perf:budget)
```

---

## Key Conventions

**Frontend**
- **No Tailwind.** Styling is Bootstrap 5 classes + custom CSS variables (see `frontend_ui_context.md`). Never introduce Tailwind.
- **CSS variables** defined in `:root` inside `Home.css`. Use `var(--primary-dark)`, `var(--primary-light)`, etc.
- **Font**: `'Urbanist', sans-serif` on body. All new UI must use Urbanist.
- **Buttons**: Use `.btn-modern` class, not Bootstrap's `.btn-primary`.
- **Section layout pattern**: `<section className="section-padding ..."><Container><Row><Col>...</Col></Row></Container></section>`
- **Icons**: `react-icons/fa` for inline icons; `@fortawesome/fontawesome-free` for `<i>` tag usage.
- **Lazy loading**: Heavy components must use `React.lazy(() => import(...))` — already the pattern in App.jsx and Home.jsx.
- **Video / third-party scripts**: Defer with `requestIdleCallback` or user interaction listeners to protect LCP.
- **WhatsApp widget**: Loaded 20s after mount or on first user interaction, never on admin routes.
- **State**: Use AuthContext for user auth, BookingContext for booking form state. No Redux/Zustand.
- **API calls**: Always use the custom `fetch.js` wrapper (imported as `customFetch`), not raw `fetch` or Axios.
- **SEO**: Use `<Helmet>` from `react-helmet-async` on every public page for meta tags.

**Backend**
- **Views**: Class-based DRF views (`APIView`, `ListCreateAPIView`). Logic lives in views, not separate service layers.
- **Permissions**: Use `@permission_classes([IsManagerOrAdmin])` or `IsAuthenticated` from `core.permissions`.
- **Emails**: Always send via Celery async tasks, not inline in views.
- **Domain detection**: Use `request.get_host()` to resolve RS vs Dublin brand context.
- **Booking IDs**: Auto-generated in `Booking.save()` — prefix `RS-` or `DA-` + 8 hex chars.
- **PDF invoices**: Generated with WeasyPrint or ReportLab; logo paths set in `settings.py`.
- **Env vars**: All secrets via `python-decouple`'s `config()` from `.env`. Never hardcode.
- **Migrations**: Always create and commit new migrations when changing models.

---

## Important Files

| File | Purpose |
|------|---------|
| [frontend/src/App.jsx](frontend/src/App.jsx) | All route definitions; controls Header/Footer visibility for admin routes |
| [frontend/src/main.jsx](frontend/src/main.jsx) | React root; provider nesting order matters (BookingProvider wraps AuthProvider) |
| [frontend/src/auth/fetch.js](frontend/src/auth/fetch.js) | JWT token injection + 401 auto-refresh; use for all API calls |
| [frontend/src/auth/AuthContext.jsx](frontend/src/auth/AuthContext.jsx) | Login/logout state; reads `access_token` / `refresh_token` from localStorage |
| [frontend/src/context/BookingContext.jsx](frontend/src/context/BookingContext.jsx) | Booking form state; localStorage-persisted for multi-step form survival on refresh |
| [frontend/src/pages/Home.jsx](frontend/src/pages/Home.jsx) | Landing page; hero video defer logic; SEO Helmet |
| [frontend/src/pages/BookingForm.jsx](frontend/src/pages/BookingForm.jsx) | 4-step booking wizard; integrates Stripe |
| [frontend/src/pages/FinanceDashboard.jsx](frontend/src/pages/FinanceDashboard.jsx) | Admin dashboard; `useFinanceJwtFromUrl` hook strips tokens from URL |
| [backend/backend/settings.py](backend/backend/settings.py) | All Django config; JWT lifetimes, CORS, Celery, WhiteNoise, email |
| [backend/backend/urls.py](backend/backend/urls.py) | Root URL routing; custom sitemap handler; finance + blog JWT login endpoints |
| [backend/users/models.py](backend/users/models.py) | `CustomUser` (extends AbstractUser) with `bonus_points`, `is_manager`, `is_supplier`; `Supplier` model |
| [backend/bookings/models.py](backend/bookings/models.py) | `Booking` model; auto-generates `booking_id`; `website` field for multi-domain |
| [backend/services/models.py](backend/services/models.py) | `Service`, `AddOn`, `Coupon` models; `Service.website` controls per-brand visibility |
| [backend/core/permissions.py](backend/core/permissions.py) | `IsManagerOrAdmin` and other shared DRF permission classes |
| [backend/blogs/middleware.py](backend/blogs/middleware.py) | `SEORedirectMiddleware` — handles SEO URL redirects |

---

## Current State

**Built and live:**
- Full booking flow (service selection → Stripe payment → confirmation email)
- Customer dashboard (view/reschedule bookings)
- Finance admin dashboard with booking management, revenue/expense charts
- Blog module with TinyMCE CMS editor (self-hosted TinyMCE)
- Coupon/discount system + loyalty bonus points
- Dual-domain support (RS Express + Dublin Airport Express)
- Async email/PDF invoice delivery via Celery + Redis
- Sitemap (domain-aware), robots.txt, SEO meta tags

**In progress / recently added:**
- TinyMCE hosted locally (last commit: "hosted tinymce locally and added text editor to faqs")
- FAQ text editor via TinyMCE
- Performance fixes (recent commits reference perf improvements)
- Addon `active` field (recent commit)

**Planned / potential gaps:**
- No SSR/SSG — blog and other pages rely on client-side Helmet for SEO; crawlers may not index dynamic content reliably
- Test files (`tests.py`) exist across all Django apps but are intentionally empty — tests will be written in a future phase
- `frontend/src/api/` directory is empty (legacy Axios remnant, can be removed)

---

## Dev Workflow

### Backend setup
```bash
cd backend
python -m venv venv
venv\Scripts\activate          # Windows
pip install -r requirements.txt
# Create .env (copy from .env.example or ask team for values)
python manage.py migrate
python manage.py createsuperuser
python manage.py runserver     # API at http://localhost:8000
```

**Celery (required for emails):**
```bash
# In a separate terminal, with venv activated:
celery -A backend worker --loglevel=info
celery -A backend beat --loglevel=info   # for scheduled tasks
```

**Redis must be running** (`redis-cli ping` should return `PONG`).

### Frontend setup
```bash
cd frontend
npm install
# Create .env with:
#   VITE_API_BASE_URL=http://localhost:8000/api
#   VITE_STRIPE_PUBLIC_KEY=pk_test_...
#   VITE_TINYMCE_API_KEY=...
npm run dev                    # Dev server at http://localhost:5173
```

### Build
```bash
cd frontend
npm run build                  # Output to frontend/dist/
```

```bash
cd backend
python manage.py collectstatic
```

### Performance budget check
```bash
cd frontend
npm run perf:budget
```

### Finance / Blog admin access
- Finance dashboard: `/finance-dashboard?access=<jwt>&refresh=<jwt>` (tokens stripped from URL and cached)
- Blog admin: `/blog-admin` (same JWT mechanism via `blogs_jwt_login` endpoint)
- Django admin: `/admin-dashboard/`

---

## Do's and Don'ts

**Do:**
- Use `customFetch` from `src/auth/fetch.js` for all API calls — it handles token injection and refresh
- Use `var(--primary-dark)` and other CSS variables for all colors
- Use `.btn-modern` for primary buttons
- Use `React.lazy()` for new page and heavy component imports
- Use `<Helmet>` on every public-facing page for SEO meta tags
- Use `request.get_host()` in backend to detect which brand/domain is active
- Run `python manage.py makemigrations && migrate` after any model change
- Send all emails via Celery tasks (never inline in views)
- Use `@permission_classes([IsManagerOrAdmin])` for protected admin endpoints
- Keep `BookingContext` as the single source of truth for booking form data across steps

**Don't:**
- Don't add Tailwind CSS — this project uses Bootstrap + custom CSS variables only
- Don't use Bootstrap `.btn-primary` for CTAs — use `.btn-modern`
- Don't use Axios — the project uses native fetch via the custom wrapper
- Don't use Redux or Zustand — only React Context is used
- Don't hardcode secrets or API keys — all go in `.env` via `python-decouple`
- Don't inline blocking scripts or eager-load heavy third-party libraries — defer them
- Don't send emails synchronously in Django views — use Celery
- Don't commit `.env` files
- Don't use `git add .` carelessly — the `backend/venv/` and `frontend/node_modules/` should be gitignored

---

## Open Issues / TODOs

- **SEO gap**: No SSR or prerendering. Blog posts and dynamic pages rely on client-side `<Helmet>`. Web crawlers (Googlebot) may not execute JS reliably; consider adding prerendering or SSG for the blog.
- **Tests are intentionally deferred**: All `tests.py` files in Django apps are empty by design. Tests will be written in a future phase — do not treat empty test files as a gap.
- **Stripe keys in dev**: Local `.env` uses Stripe test keys (`pk_test_*`, `sk_test_*`). Production server uses live keys. This is correct and expected.
- **Supplier/B2B**: There is no supplier-facing UI. Supplier admins are users with `is_supplier=True` (RBAC); they have restricted access to the finance dashboard — can only add bookings and view/edit their own. No separate supplier portal exists.
- **`frontend/src/api/` directory**: Empty legacy folder (old Axios layer); safe to delete when doing housekeeping.
- **`ContactUs.css` imported in `main.jsx`**: Global import of a page-scoped CSS file — styles leak globally. Quirk to be aware of.
- **`Blog.css` imported in `main.jsx`**: Same issue as above.
- **Redis**: If Redis is unavailable, Django cache falls back to `LocMemCache`; Celery broker will also fail. Ensure Redis is reliably running in production.
- **Password reset timeout**: `PASSWORD_RESET_TIMEOUT` defaults to 3600s (1 hour).
- **SEO gap**: No SSR or prerendering. Blog posts rely on client-side `<Helmet>` — Googlebot may not index dynamic content reliably. Consider prerendering for the blog if SEO becomes critical.
