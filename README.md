<div align="center">

<img src="frontend/src/assets/logo.png" alt="RS Express Parking" width="180"/>

# ✈️ RS Express Parking — Airport Parking Booking Platform

**A full-featured, dual-brand meet-and-greet airport parking platform — from search to Stripe payment to PDF invoice, fully automated.**

[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=white&style=flat-square)](https://react.dev)
[![Vite](https://img.shields.io/badge/Vite-6-646CFF?logo=vite&logoColor=white&style=flat-square)](https://vitejs.dev)
[![Django](https://img.shields.io/badge/Django-5.2-092E20?logo=django&logoColor=white&style=flat-square)](https://www.djangoproject.com)
[![DRF](https://img.shields.io/badge/Django%20REST%20Framework-3.16-A30000?style=flat-square)](https://www.django-rest-framework.org)
[![MySQL](https://img.shields.io/badge/MySQL-8-4479A1?logo=mysql&logoColor=white&style=flat-square)](https://www.mysql.com)
[![Celery](https://img.shields.io/badge/Celery-5.5-37814A?logo=celery&logoColor=white&style=flat-square)](https://docs.celeryq.dev)
[![Redis](https://img.shields.io/badge/Redis-6-DC382D?logo=redis&logoColor=white&style=flat-square)](https://redis.io)
[![Stripe](https://img.shields.io/badge/Stripe-Payments-635BFF?logo=stripe&logoColor=white&style=flat-square)](https://stripe.com)
[![Bootstrap](https://img.shields.io/badge/Bootstrap-5.3-7952B3?logo=bootstrap&logoColor=white&style=flat-square)](https://getbootstrap.com)

🌐 **Live:** [rsexpressparking.com](https://rsexpressparking.com) · [dublinairportexpressparking.ie](https://dublinairportexpressparking.ie)

</div>

---

## 🚀 What Is This?

RS Express Parking is a **production e-commerce platform** for pre-booked meet-and-greet parking at Dublin Airport. One codebase powers **two live brands**, handling everything end to end:

> Customer books online → pays with Stripe → instantly receives a branded PDF invoice by email → manages the booking from a self-service dashboard — while staff run the entire business from a built-in finance back office.

This isn't a demo or a template. It's a real, revenue-generating business platform with payments, accounting, content management, B2B supplier access, and SEO infrastructure — all custom built.

---

## ✨ Feature Highlights

### 🛒 Customer Booking Experience
- **4-step booking wizard** — service selection → account → car & flight details → add-ons → payment
- **Stripe-powered checkout** with secure card payments (PCI handled by Stripe Elements)
- **Smart price summary** that updates live as add-ons, coupons, and date ranges change
- **Coupon & discount engine** with validation rules
- **Loyalty bonus points** — customers earn points on every booking and redeem them later
- **Booking state survives page refreshes** — the multi-step form is persisted to localStorage
- **International phone input**, date handling with Luxon, and form validation throughout

### 👤 Customer Dashboard
- View all past and upcoming bookings at a glance
- **Self-service rescheduling** — customers change their dates without calling support
- Secure JWT authentication with automatic silent token refresh

### 📊 Finance & Admin Back Office
- **Full booking management** — search, filter, edit, and process bookings across both brands
- **Revenue & expense analytics** with interactive charts (Recharts)
- Self-explanatory finance dashboard designed for non-technical staff
- **Supplier/B2B layer** — role-based access lets supplier partners add and manage *their own* bookings only, with supplier invoicing built in
- Role-based permissions: customer / manager / admin / supplier

### 📝 Content & Marketing
- **Built-in blog CMS** with a self-hosted TinyMCE rich-text editor — staff publish posts without touching code
- **FAQ manager** with rich-text editing
- Contact form with backend submission handling
- Floating WhatsApp widget (lazy-loaded so it never hurts performance)

### 📧 Automated Communications
- **Async email pipeline** powered by Celery + Redis — confirmation emails never block checkout
- **Branded PDF invoices** generated server-side (WeasyPrint / ReportLab) and attached automatically
- Scheduled tasks via Celery Beat
- Per-brand email templates and SMTP configuration

### 🌍 Dual-Brand, One Codebase
- A single deployment serves **two distinct branded websites**
- Domain detection on every request — services, bookings, emails, invoices, and sitemaps are all brand-aware
- Booking IDs are brand-prefixed (`RS-…` / `DA-…`)
- Per-domain sitemaps, robots.txt, and service visibility

### ⚡ Performance & SEO
- Route-level **code splitting with React.lazy** — heavy sections load only when needed
- Hero video and third-party scripts **deferred until idle or first interaction** to protect LCP
- WebP image assets, WhiteNoise static compression
- **Automated performance budget checker** (`npm run perf:budget`) keeps bundle sizes honest
- SEO meta tags on every public page, SEO redirect middleware, domain-aware XML sitemaps

---

## 🏗️ Architecture

```
                        ┌─────────────────────────────────────────┐
                        │              Browser (SPA)              │
                        │  React 19 + Vite · Bootstrap 5 · SCSS   │
                        │                                         │
                        │  AuthContext ──── JWT + auto-refresh    │
                        │  BookingContext ─ wizard state (LS)     │
                        │  Stripe Elements ─ card payments        │
                        └────────────────────┬────────────────────┘
                                             │  REST (JWT Bearer)
                        ┌────────────────────▼────────────────────┐
                        │         Django 5.2 + DRF API            │
                        │                                         │
                        │  users · services · bookings · payments │
                        │  finance · blogs · faq · contact · core │
                        └──────┬──────────────┬──────────────┬────┘
                               │              │              │
                        ┌──────▼─────┐  ┌─────▼──────┐  ┌────▼─────┐
                        │   MySQL    │  │   Stripe   │  │  Celery  │
                        │  database  │  │  webhooks  │  │ + Redis  │
                        └────────────┘  └────────────┘  └────┬─────┘
                                                             │
                                                  ┌──────────▼──────────┐
                                                  │  Async emails with  │
                                                  │  PDF invoices (SMTP)│
                                                  └─────────────────────┘
```

**The booking lifecycle:**

1. Customer picks a service on the landing page
2. The 4-step wizard collects account, vehicle, flight, and add-on details
3. Stripe processes payment; the backend verifies via webhook and creates the booking
4. Celery fires off a confirmation email with a branded PDF invoice — asynchronously, so checkout stays fast
5. The customer manages everything from their dashboard; staff manage operations from the finance back office

---

## 🧰 Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | React 19, Vite 6, React Router 7, Bootstrap 5 + custom design system, Sass |
| **State** | React Context (auth + booking wizard), localStorage persistence |
| **Payments** | Stripe Elements + Stripe webhooks |
| **Charts** | Recharts (finance analytics) |
| **CMS** | Self-hosted TinyMCE 8 rich-text editor |
| **Backend** | Django 5.2, Django REST Framework 3.16 |
| **Auth** | JWT (SimpleJWT) with refresh-token rotation, role-based permissions |
| **Database** | MySQL |
| **Async jobs** | Celery 5.5 + Redis, scheduled tasks with Celery Beat |
| **PDF generation** | WeasyPrint / ReportLab |
| **Email** | SMTP with per-brand templates, delivered via Celery |
| **SEO** | react-helmet-async, domain-aware sitemaps, redirect middleware |
| **Static serving** | WhiteNoise with compression |
| **Tooling** | ESLint 9, custom performance budget script |

---

## 📁 Project Structure

```
rsexpressparking/
├── frontend/                  # React 19 + Vite SPA
│   └── src/
│       ├── pages/             # Home, BookingForm, dashboards, blog, …
│       ├── components/        # BookingForm steps, finance panels, blog admin, …
│       ├── auth/              # AuthContext + JWT fetch wrapper (auto-refresh)
│       └── context/           # BookingContext (wizard state)
│
├── backend/                   # Django 5.2 + DRF API
│   ├── users/                 # Custom user model, suppliers, auth
│   ├── services/              # Services, add-ons, coupons
│   ├── bookings/              # Booking lifecycle + rescheduling
│   ├── payments/              # Stripe checkout + webhooks
│   ├── finance/               # Finance dashboard API
│   ├── blogs/                 # Blog CMS + SEO middleware + sitemaps
│   ├── faq/ · contact/ · core/
│   └── templates/             # Branded HTML email templates
│
└── perf/                      # Automated performance budget checker
```

---

## 🛠️ Local Development

<details>
<summary><b>Backend (Django API)</b></summary>

```bash
cd backend
python -m venv venv
venv\Scripts\activate              # Windows  (source venv/bin/activate on macOS/Linux)
pip install -r requirements.txt
# create .env with DB, Stripe, email, and Redis settings
python manage.py migrate
python manage.py runserver         # API at http://localhost:8000
```

Background workers (emails & invoices) — Redis must be running:

```bash
celery -A backend worker --loglevel=info
celery -A backend beat --loglevel=info
```
</details>

<details>
<summary><b>Frontend (React SPA)</b></summary>

```bash
cd frontend
npm install
# create .env:
#   VITE_API_BASE_URL=http://localhost:8000/api
#   VITE_STRIPE_PUBLIC_KEY=pk_test_...
npm run dev                        # http://localhost:5173
```

Production build & performance check:

```bash
npm run build
npm run perf:budget
```
</details>

All secrets live in `.env` files (never committed) — Stripe test keys locally, live keys in production.

---

## 🔒 Security & Quality Practices

- **JWT authentication** with short-lived access tokens and silent refresh — no credentials in app state
- **Role-based access control** across four roles (customer, manager, admin, supplier)
- **Stripe handles all card data** — the platform never touches raw PANs
- **Webhook-verified payments** — bookings are only confirmed after Stripe says so
- **All secrets externalised** to environment config via python-decouple
- **CORS locked down** with django-cors-headers
- **Performance budgets enforced** in the build pipeline

---

## 💼 What This Project Demonstrates

This platform was built end to end — design, frontend, backend, payments, DevOps — and runs two live commercial brands. It showcases:

✅ Full-stack product delivery (React + Django) from zero to production
✅ Real payment integration with webhooks, invoicing, and refund-safe flows
✅ Multi-tenant / multi-brand architecture from a single codebase
✅ Async task pipelines (Celery + Redis) for a snappy user experience
✅ A complete internal back office: finance analytics, booking ops, CMS, B2B supplier access
✅ Production concerns done right: SEO, performance budgets, lazy loading, role-based security

---

<div align="center">

**Interested in a booking platform, marketplace, or custom dashboard for your business?**

This is the level of polish and completeness you can expect. Let's talk. 🚗💨

</div>
