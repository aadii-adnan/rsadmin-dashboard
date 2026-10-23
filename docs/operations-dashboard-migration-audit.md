# Operations Dashboard migration audit

Status: code review only, 2026-10-18. Django runtime tests and staff acceptance have not been completed. Django Admin remains the required fallback at `/admin-dashboard/`.

## Coverage matrix

| Django Admin workflow | React/API equivalent | Roles | Status and important difference |
| --- | --- | --- | --- |
| Booking list, detail, edit, create, documents, status, email, bulk exports | `/bookings-admin`; `/api/bookings/staff/` | Full admin, manager, active supplier (scoped) | Partial: dedicated contract exists, but runtime parity/role testing is unverified. |
| Users and supplier profiles | `/users-admin`; `/api/auth/staff/users/`, `/suppliers/` | Full admin | Partial: role/profile editing exists; legacy user Admin permission/groups and credentials remain Admin-only. |
| Credit transaction ledger | People & credits; `/api/payments/staff/credits/` | Full admin | Partial: atomic adjustment and read ledger exist; Admin-only email confirmation parity requires runtime verification. |
| Services, add-ons, coupons, statuses, settings | `/catalog-admin`; `/api/services/staff/*`, `/api/core/staff/*` | Full admin | Partial: explicit fields and validation; image uploads and order limits remain Admin-only. |
| Contact messages | `/communications-admin`; `/api/contact/staff/` | Full admin | Covered read-only, pending runtime authorization test. |
| FAQ records | Communications; `/api/faqs/staff/` | Full admin | Partial: FAQ records only; FAQ categories remain Admin-only. |
| Marketing leads and unsubscribes | Communications; `/api/core/staff/marketing-leads/`, `unsubscribes/` | Full admin | Covered read-only. Public capture/unsubscribe routes are unchanged. |
| Redirect rules | Communications; `/api/blogs/staff/redirect-rules/` | Full admin | Partial: separate, stricter operations endpoint; legacy Blog Admin manager workflow remains. |
| Payments | `/payments-admin`; `/api/payments/staff/records/` | Full admin | Intentionally read-only. Stripe webhooks, intent creation, verification, refunds and legacy payment update remain outside this dashboard. |
| Blog posts, categories, tags, Blog FAQs, import | Existing `/blog-admin` | Existing Blog Admin roles | Retained: no retirement audit approval. |
| Finance/expenses/supplier invoices | Existing `/finance-dashboard` | Existing finance roles | Retained. |
| Celery Beat/periodic tasks | Django Admin | Full Django admin | Intentionally retained technical administration. |
| Order limits, BookingUser records | Django Admin | Full Django admin | Missing React workflow; retain. |

## Security review

- New configuration, people, marketing, redirect, and payment-review endpoints use `IsFullSuperAdmin`; React guards are not the authorization boundary.
- Booking APIs use staff permissions and role-scoped querysets; supplier isolation and manager exclusions require runtime tests before acceptance.
- Credit adjustments use `transaction.atomic()` and `select_for_update()`, write an immutable `CreditTransaction`, and reject negative resulting balances.
- Payment review serializers omit Stripe customer/payment IDs, client request IDs, and tokens. No staff payment mutation endpoint was added.
- Public contact, FAQ, services, customer booking, Stripe webhook, finance JWT, and Blog Admin endpoints remain separate.
- Explicit staff serializers are used for the new APIs; however all endpoint tests remain unexecuted because the active interpreter cannot import Django.

## Automated verification

- 2026-10-18 stabilization: focused ESLint for the communications and payments screens passed after their effects were made dependency-safe with `useCallback`; frontend Node tests passed (35/35) and the production build passed.
- Backend modules passed `py_compile` where invoked.
- Django checks/tests are blocked by `ModuleNotFoundError: No module named 'django'` in the active interpreter.
- The two focused hook-dependency warnings in the communications and payments screens are resolved.
- The Windows Python launcher exposes only `C:\Python314\python.exe`. Four Python processes were running, but their executable paths/command lines could not be read without elevated process inspection, and no repository VS Code launch configuration was found. Therefore no verified working Django interpreter was identified in this session.
- Follow-up verification: the supplied `backend\.venv-py312\Scripts\python.exe` could not start because it resolves to a missing base executable at `C:\Users\itw\AppData\Local\Programs\Python\Python312\python.exe`. No Django test was started. The current settings use MySQL database `rexpress_atp` and define no `DATABASES['default']['TEST']` override; Django would normally create a separate `test_rexpress_atp` database, but this remains unverified until the interpreter starts successfully.
- Stabilization review found and fixed two static defects awaiting test verification: `StaffSupplierCreateSerializer` now includes its write-only password input in its explicit field list and creates the linked user/profile atomically; payment intent replays and already-paid conflicts are now resolved before a Stripe configuration check, while new payment attempts still require Stripe configuration.

## Manual acceptance checklist

- [ ] Test full-admin, manager, active supplier, inactive supplier, and customer access for every staff route.
- [ ] Verify supplier cannot enumerate or submit another supplier's booking/ID to every booking action/export/document route.
- [ ] Verify manager Pending/Payment Failed exclusions and price field restrictions.
- [ ] Compare create/edit/save-and-notify/status/document/bulk booking behaviour against Django Admin on both websites.
- [ ] Verify supplier profile and credit-adjustment audit entries, including concurrent deductions.
- [ ] Validate catalog/coupon/FAQ/redirect changes against public website behaviour.
- [ ] Confirm payment review exposes no secrets and does not alter Stripe state.
- [ ] Exercise Finance, Blog Admin, Celery Beat, order limits, and user permission workflows through Django Admin.

## Rollback and recommendation

Keep `/admin-dashboard/` visible and operational. Roll back an Operations Dashboard workflow by directing staff to the corresponding Django Admin screen; do not delete or unregister any model. Django Admin navigation **must not be retired**: several workflows are intentionally retained or only partially covered, and authorization/business-flow parity has not been runtime-tested or staff-accepted.
