# Project Context: RS Express Parking System

This document outlines the high-level architecture, tech stack, and code conventions for the RS Express Parking platform (Django + React). This guide serves as a baseline for Prompt Engineers or new developers (especially when conceptualizing and building a new SEO-optimized Blogs module).

## 1. TECH STACK & LIBRARIES

### Frontend (SPA)
- **Framework**: Plain React 19 bootstrapped with [Vite](https://vitejs.dev/) (`@vitejs/plugin-react` v4.3.4). No SSR framework (Next.js/Remix) is currently installed.
- **Routing**: `react-router-dom` v7.
- **State Management**: React Context APIs (`AuthContext` and `BookingContext`); no Redux or Zustand usage found.
- **API Client**: Native `fetch` API bundled within a custom network wrapper (`src/auth/fetch.js`) rather than Axios.
- **Main Dependencies**: 
  - **SEO**: `react-helmet-async` (for dynamic meta tags within the SPA).
  - **Styles & UI**: `bootstrap`, `react-bootstrap`, `swiper` (carousels), `react-icons`, and raw CSS files.
  - **Charting**: `recharts` (used in the Finance Admin dashboard).
  - **Payments**: `@stripe/react-stripe-js` & `@stripe/stripe-js`.
  - **Utilities**: `luxon` (date handling), `react-toastify`, `react-floating-whatsapp`.

### Backend
- **Framework**: Django 5.2.
- **API Layer**: Django REST Framework (DRF v3.16.0).
- **Authentication**: `djangorestframework_simplejwt` (JWT authentication).
- **Database**: MySQL (configured via `mysqlclient` and decoupled environment variables).
- **Async Tasks**: Celery v5.5 + Redis v6.1 (managed via `django-celery-beat`). Used for non-blocking processes like sending scheduling/completion emails and invoice generation.
- **PDF Generation**: `weasyprint`, `reportlab`, and `pypdf`.
- **Other Key Packages**: `django-cors-headers` (CORS management), `whitenoise` (static file serving).

---

## 2. FRONTEND ARCHITECTURE & SEO BASELINE

### Directory Structure Integration
```text
frontend/src/
  ├── api/              # (Mostly deprecated/empty directory, historically used for axios)
  ├── assets/           # Static images, logic-dependent webp's, and video (mp4).
  ├── auth/             # Custom Fetch API wrapper (fetch.js) & AuthContext logic.
  ├── components/       # Reusable components partitioned by domain layer (e.g., HomePage, Utility, FinanceDashboard).
  ├── context/          # React Context providers (BookingContext).
  ├── pages/            # View components tied heavily to react-router maps (Home, BookingForm, FinanceDashboard).
  ├── App.jsx           # Main routing entry point.
  └── main.jsx          # DOM rendering entry point.
```

### SEO & Performance Baseline
- **Current SEO Model**: The project operates as a strict Single Page Application (SPA). SEO meta tags are dynamically injected client-side via `react-helmet-async`. There is currently **no Server-Side Rendering (SSR)** or **Static Site Generation (SSG)** natively involved unless it's configured externally via prerendering services.
- **Component Optimization**: Extensive use of lazily loaded components (e.g., `React.lazy(() => import('../components/HomePage/FAQSection'))`) applied inside heavily-trafficked pages like `Home.jsx`.
- **Asset/Script Deferment**: Heavy frontend interaction relies on decoupled initial-paint-blocking mechanisms. For example, video loading (`requestIdleCallback`) and third-party scripts (Stripe, Shapo embeds) use event listeners (`scroll`, `touchstart`) and timeouts (`setTimeout`) to defer executions, safeguarding LCP (Largest Contentful Paint) metrics.

### Map of Frontend Routes (`App.jsx`)
```javascript
<Route path="/" element={<Home />} />
<Route path="/services" element={<Services />} />
<Route path="/book/:slug" element={<BookingForm />} />
<Route path="/contact-us" element={<ContactUs />} />

{/* Explicitly Hardcoded SEO / Alias Mapping routes that fall back to Home */}
<Route path="/services/standard-meet-and-greet-parking" element={<Home />} />
<Route path="/book-now" element={<Home />} />
<Route path="/dublin-airport-parking-offer" element={<Home />} />

{/* Authentication / Authorization */}
<Route path="/login" element={<Login />} />
<Route path="/unauthorized" element={<UnauthorizedPage />} />
<Route path="/logout" element={<Logout />} />

{/* Admin / Portal Routes */}
<Route path="/customer-dashboard" element={<CustomerDashboard />} />
<Route path="/finance-dashboard" element={<FinanceDashboard />} />
```

---

## 3. AUTHENTICATION & REACT ADMIN PANEL

### Token Flow
- **Context API**: Global state surrounding user profiles and local caching lies within `AuthProvider` (`src/auth/AuthContext.jsx`).
- **Token Injection via Custom Interceptor**: 
  - Instead of standard Axios interceptors, this codebase implements a custom native fetch interceptor hook mapped inside `src/auth/fetch.js`.
  - Depending on whether the user is making a standard client request or an admin-related dashboard request, the script checks specific keys in `localStorage`: standard `'access_token'` vs. `'finance_jwt'`.
  - The script systematically merges `Authorization: Bearer ${token}` headers into every payload.
  - If a **401 Unauthorized** response is returned, the wrapper automatically hits `[API_URL]/auth/token/refresh/`. If that succeeds, the local storage tokens are swapped out, and the original request is identically re-executed.

### React Admin / Finance Panel
- The internal administrative tool points largely to `/finance-dashboard`.
- Components mapped to `/finance-dashboard` undergo a check inside `App.jsx` leveraging `useLocation` to specifically hide public elements (Headers and Footers).
- In `FinanceDashboard.jsx`, an intercepting custom hook `useFinanceJwtFromUrl` mounts implicitly; if a manager lands on the URL appended with query parameters (`?access=...&refresh=...`), it immediately rips them off the URL, caches them softly into `localStorage` (`finance_jwt`), and wipes the window history object. If it doesn't detect valid keys, it directs the user to `/unauthorized`.

---

## 4. BACKEND ARCHITECTURE & APIS

### Django App Composition
Backend modularity revolves purely around categorized domains aligned as apps:
`users`, `services`, `bookings`, `faq`, `contact`, `payments`, `core` (shared utilities and permissions), `finance`, and `django_celery_beat`.

### API Structure & ViewSets
APIs are exposed natively using DRF Class-Based Views (e.g., `APIView`, standard generics like `ListCreateAPIView`).
- **Endpoints**: Routed modularly, i.e., backend root routes import direct `<app>/urls.py` manifests. Booking routes are parsed like `/bookings/manager/all/` mapped onto `ManagerBookingList.as_view()`.
- **Permissions Framework**: Role verification leans heavily on internal utilities, like `@permission_classes([IsManagerOrAdmin])` imported structurally from `core.permissions` evaluating flags on the `users.CustomUser` model or simple `IsAuthenticated`.
- Emailing relies heavily on Celery jobs using Django's core `EmailMultiAlternatives` wrapped in heavily integrated raw HTML variables directly embedded in `views.py`.

### Database
- Uses relational configuration (`django.db.backends.mysql`).
- Contains a customized user model extending AbstractUser handling various user states and potentially hierarchical mappings up to supplier entities (`Supplier` foreign-key mappings within `Booking` model mapping B2B relations).

---

## 5. CODE CONVENTIONS

- **Styling**: React codebase is segmented with CSS modules & standard styling classes globally declared in Bootstrap conventions paired alongside dynamic custom elements (e.g., `<Container>`).
- **Error Handling**: On the frontend, standard try-catch blocks and explicit response checking inside `fetch.js` (`if (!response.ok)`) are standard.
- **Backend View Formatting**: APIs heavily output `Response(..., status=status.HTTP_..._...)` leveraging explicitly scoped Django DRF Serializers built inside respective apps matching database layers exactly. Code typically features thick controller logic embedded directly inside views rather than offloaded into strict isolated service layers.

*Note for New Blogs Module Setup: Given the SPA nature of this environment natively absent Server-Side Rendering (SSR), SEO strategies required for the new module will heavily necessitate dynamically managing `<Helmet>` tags efficiently per blog post, and might strictly require API-level adjustments generating clean sitemaps or forcing pre-render techniques to ensure web crawlers can effectively read dynamic JS content.*

---

## 6. PRODUCTION CACHING & COMPRESSION DEPLOYMENT NOTES

### Cache-Control Policy (Target State)
- **Hashed build assets** (example: `/assets/index.abc12345.js`): `Cache-Control: public, max-age=31536000, immutable`
- **HTML documents** (example: `/`, `/index.html`): `Cache-Control: no-cache, no-store, must-revalidate`
- **Non-hashed static files**: short cache (recommended `max-age=86400`) to allow safe rollouts

### Django-Controlled Behavior
- Django static files are served with WhiteNoise (`CompressedManifestStaticFilesStorage`) and precompressed variants (Brotli/gzip) when available.
- `WHITENOISE_IMMUTABLE_FILE_TEST` is configured to treat 8-12 character fingerprinted filenames as immutable.
- Dynamic API and HTML response behavior in Django is kept unchanged; HTML cache policy should be enforced at the reverse proxy/CDN edge.

### If Frontend `/assets` Is Served Outside Django

Use one of the following edge/server rule sets.

#### Apache (frontend host)
```apache
<IfModule mod_headers.c>
  <FilesMatch "\.[0-9a-f]{8,12}\.(?:css|js|mjs|json|map|png|jpe?g|gif|svg|webp|avif|ico|woff2?|ttf|eot)$">
    Header set Cache-Control "public, max-age=31536000, immutable"
  </FilesMatch>

  <FilesMatch "^(?!.*\.[0-9a-f]{8,12}\.).+\.(?:css|js|mjs|json|map|png|jpe?g|gif|svg|webp|avif|ico|woff2?|ttf|eot)$">
    Header set Cache-Control "public, max-age=86400"
  </FilesMatch>

  <FilesMatch "\.html?$">
    Header set Cache-Control "no-cache, no-store, must-revalidate"
    Header set Pragma "no-cache"
    Header set Expires "0"
  </FilesMatch>

  Header merge Vary "Accept-Encoding"
</IfModule>

<IfModule mod_brotli.c>
  AddOutputFilterByType BROTLI_COMPRESS text/plain text/html text/css text/javascript application/javascript application/json application/xml image/svg+xml
</IfModule>

<IfModule mod_deflate.c>
  AddOutputFilterByType DEFLATE text/plain text/html text/css text/javascript application/javascript application/json application/xml image/svg+xml
</IfModule>
```

#### Nginx (frontend host)
```nginx
# Hashed assets: immutable, 1 year
location ~* \.[0-9a-f]{8,12}\.(css|js|mjs|json|map|png|jpe?g|gif|svg|webp|avif|ico|woff2?|ttf|eot)$ {
    expires 365d;
    add_header Cache-Control "public, max-age=31536000, immutable" always;
}

# Non-hashed static: short cache
location ~* \.(css|js|mjs|json|map|png|jpe?g|gif|svg|webp|avif|ico|woff2?|ttf|eot)$ {
    expires 1d;
    add_header Cache-Control "public, max-age=86400" always;
}

# HTML: always revalidate
location = /index.html {
    expires -1;
    add_header Cache-Control "no-cache, no-store, must-revalidate" always;
}

location / {
    try_files $uri /index.html;
    add_header Cache-Control "no-cache, no-store, must-revalidate" always;
}

gzip on;
gzip_vary on;
gzip_types text/plain text/css text/javascript application/javascript application/json application/xml image/svg+xml;

# Requires ngx_brotli module
brotli on;
brotli_comp_level 5;
brotli_types text/plain text/css text/javascript application/javascript application/json application/xml image/svg+xml;
```

#### CDN Rule Template (Cloudflare/Fastly/Akamai)
- Rule 1: path matches hashed asset pattern (`/assets/*.[0-9a-f]{8,12}.*`) -> Browser TTL 1 year, mark as immutable.
- Rule 2: path matches HTML entry (`/`, `/index.html`) -> bypass edge cache or set very low TTL + revalidation.
- Rule 3: enable Brotli and gzip at edge, and keep `Vary: Accept-Encoding`.

### Compression & Cache Verification Checklist

Run these from any deployment shell:

```bash
# 1) Hashed asset should be immutable + Brotli when requested
curl -I -H "Accept-Encoding: br" https://your-domain.com/assets/index.abc12345.js

# 2) Gzip fallback should also work
curl -I -H "Accept-Encoding: gzip" https://your-domain.com/assets/index.abc12345.js

# 3) HTML must not be long-cached
curl -I https://your-domain.com/

# 4) API responses must not accidentally inherit immutable static policy
curl -I https://your-domain.com/api/services/
```

Expected indicators:
- Hashed asset response includes `Cache-Control: public, max-age=31536000, immutable`
- HTML response includes `Cache-Control: no-cache, no-store, must-revalidate`
- Compressed responses include `Content-Encoding: br` or `Content-Encoding: gzip`
- `Vary` includes `Accept-Encoding`
