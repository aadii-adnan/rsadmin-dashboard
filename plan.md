# Django Admin to React Operations Dashboard: Implementation Plan

## Purpose and delivery model

Replace Django Admin operational workflows gradually with React screens while retaining Django as the system of record: Django models, validations, Stripe workflows, Celery tasks, PDF generation, and MySQL all remain in place. Each chunk below is designed to be requested and implemented independently. Complete and verify a chunk before starting the next one.

The migration starts with bookings because it is the most operationally important and complex Django Admin area. Django Admin remains available at `/admin-dashboard/` throughout the rollout as a fallback. Do not remove or alter it until all agreed React workflows are accepted.

## Guardrails for every chunk

- Do not replace backend business rules with browser-only logic.
- Enforce every role and object-level restriction in DRF, not just in React navigation.
- Reuse Django invoice, booking-form, email, pricing, cancellation, and task logic rather than duplicating it.
- Keep public/customer/guest endpoints separate from staff endpoints.
- Add targeted tests for new endpoint authorization and business behavior.
- Preserve both brands (`rsexpressparking` and `dublinairportparking`) and supplier behavior.
- Use `customFetch` for new authenticated React API calls unless the existing auth approach is deliberately changed in its own approved chunk.
- Do not expose tokens in URLs in any newly built dashboard feature.
- Do not delete existing Django Admin code as part of a feature-migration chunk.

## Target dashboard structure

Use the existing admin shell and introduce an isolated bookings feature:

```text
frontend/src/
  pages/
    BookingsAdmin.jsx
  components/
    BookingsAdmin/
      BookingList.jsx
      BookingFilters.jsx
      BookingStatusBadge.jsx
      BookingDetail.jsx
      BookingEditForm.jsx
      BookingBulkActions.jsx
      bookingAdminApi.js
      bookingsAdmin.css
```

The final names can be adjusted for existing project conventions, but keep all staff booking UI separate from `BookingForm` and `CustomerDashboard`, which support customer workflows.

---

## Chunk 0 — Confirm migration baseline and acceptance matrix

### Goal

Create a verified inventory of Django Booking Admin behavior and define exact acceptance criteria before changing application behavior.

### Work

- Record the current Booking Admin columns, filters, fieldsets, readonly fields, bulk actions, emails, downloads, and role differences.
- Define the supported roles precisely:
  - Full super-admin: `is_superuser` and neither manager nor supplier.
  - Manager: `is_manager`.
  - Supplier: active `is_supplier` account with supplier profile.
- Decide which Django Admin behavior is intentionally retained outside the React dashboard during early rollout.
- Define representative test accounts/data for both websites, a supplier booking, a pending booking, a payment-failed booking, a new/unviewed booking, and a booking with prior customer experience.
- Define a parity checklist for each future chunk.

### Files to inspect

- `backend/bookings/admin.py`
- `backend/bookings/models.py`
- `backend/bookings/views.py`
- `backend/bookings/serializers.py`
- `backend/core/permissions.py`
- `backend/users/models.py`
- `frontend/src/App.jsx`
- `frontend/src/components/AdminLayout/`

### Acceptance criteria

- A written, approved role/feature matrix exists.
- Every subsequent chunk has a known Django Admin behavior to match or an explicitly approved deviation.
- No application code changes are required in this chunk.

---

## Chunk 1 — Establish staff-dashboard authorization contract

### Goal

Provide a consistent, explicit server-side role model that new React staff endpoints can use safely.

### Work

- Review and strengthen shared DRF permissions for full super-admin, manager, and active supplier roles as needed.
- Add a capability/profile response suitable for the React dashboard, including supplier status/profile identity when appropriate.
- Define which JWT storage strategy new operations screens use. Do not introduce another token type.
- Add a React route guard for staff routes that handles loading, unauthenticated users, and unauthorized users.
- Ensure direct navigation to staff routes cannot render sensitive screens for ordinary customers.

### Files likely to change

- `backend/core/permissions.py`
- `backend/users/views.py`
- `backend/users/serializers.py` if a new profile serializer is appropriate
- `backend/users/urls.py`
- `frontend/src/auth/AuthContext.jsx`
- `frontend/src/auth/fetch.js`
- `frontend/src/App.jsx`
- New `frontend/src/auth/RequireStaffRole.jsx` if needed

### Tests

- Anonymous and ordinary customer requests are denied.
- Manager, supplier, and full super-admin capabilities are correctly represented.
- Inactive suppliers are denied supplier access.
- React route guard handles each role correctly.

### Acceptance criteria

- A new staff screen has one documented auth path.
- Backend authorization is independent of React visibility.
- Existing customer login and finance/blog access continue to work.

---

## Chunk 2 — Build a secure, read-only staff booking-list API

### Goal

Create the first safe API contract for the React bookings dashboard. This replaces none of Django Admin yet; it is read-only.

### Work

- Add a dedicated staff booking list endpoint; do not reuse the currently inadequate generic or manager list endpoint as the final contract.
- Apply server-side queryset scoping:
  - Full super-admin: all bookings.
  - Manager: exclude Pending and Payment Failed, matching Django Admin.
  - Supplier: only bookings belonging to that supplier.
- Implement server-side pagination and response metadata.
- Implement explicit ordering with an allow-list of sortable fields.
- Implement Django Admin search parity:
  - first/last name, email, phone, booking ID, database ID, source channel, UTM campaign
  - registration search ignoring spaces
  - booking-ID search ignoring dashes
- Implement filter parity:
  - departure date range
  - return date range
  - created date range
  - status
  - service
  - website
  - supplier
  - source channel
- Enforce role restrictions on filters, especially supplier scope and manager/supplier access to website/supplier/source filters.
- Return only fields required for a list row, with role-safe price fields.

### Files likely to change

- `backend/bookings/views.py`
- `backend/bookings/serializers.py`
- `backend/bookings/urls.py`
- `backend/core/permissions.py`
- `backend/bookings/tests.py`

### Tests

- Pagination, sorting, each filter, and search normalizations.
- Role-isolated data: suppliers never receive other supplier/non-supplier bookings.
- Managers never receive Pending or Payment Failed bookings.
- Unauthorized/ordinary users receive 401/403.
- Invalid sort/filter input returns a stable validation error.

### Acceptance criteria

- The endpoint can power a large bookings table without client-side filtering of the entire database.
- Responses never leak supplier-only or super-admin-only data.
- No existing public/customer API behavior is changed.

---

## Chunk 3 — Deliver the React read-only bookings list

### Goal

Add the first visible React operations screen: a protected, read-only bookings table.

### Work

- Add `/bookings-admin` beneath the existing `AdminLayout`.
- Add a Bookings navigation item to the existing admin navbar.
- Create a booking API helper using the approved staff authentication strategy.
- Build a responsive table with:
  - list loading, empty, error, and retry states
  - pagination
  - server-side sorting
  - search input with debouncing
  - role-aware columns
  - status, New, and Today badges
- Keep current filters limited to the API filters completed in Chunk 2.
- Reuse existing visual conventions from Blog Admin and Finance Dashboard; do not introduce a new UI library.

### Files likely to change

- `frontend/src/App.jsx`
- `frontend/src/components/AdminLayout/AdminNavbar.jsx`
- New `frontend/src/pages/BookingsAdmin.jsx`
- New `frontend/src/components/BookingsAdmin/BookingList.jsx`
- New `frontend/src/components/BookingsAdmin/BookingFilters.jsx`
- New `frontend/src/components/BookingsAdmin/BookingStatusBadge.jsx`
- New `frontend/src/components/BookingsAdmin/bookingAdminApi.js`
- New `frontend/src/components/BookingsAdmin/bookingsAdmin.css`

### Tests

- API helper tests for query parameter construction and error handling.
- Component tests, if the repository test setup supports them, or focused manual verification otherwise.
- Role-based column visibility verification.

### Acceptance criteria

- Full super-admin, manager, and supplier can open the list only when authorized.
- List data, filters, and row visibility match the new API contract.
- Django Admin remains unchanged and available.

---

## Chunk 4 — Add staff booking detail read API and React detail screen

### Goal

Let authorized staff inspect one booking with Django Admin-equivalent information, without editing it yet.

### Work

- Add a dedicated staff booking-detail endpoint with object-level role checks.
- Mark a booking as viewed through an explicit backend action or documented read side effect that matches current admin behavior.
- Return role-appropriate detail sections:
  - customer, vehicle, travel, service/add-ons, status/note
  - pricing where allowed
  - supplier data where allowed
  - full-admin marketing attribution
  - customer experience and prior reviewed experience where allowed
- Create a detail route or modal/drawer. Prefer a route if the screen will later contain full editing.
- Add direct invoice and booking-form controls only after their authorization is addressed in Chunk 6.

### Files likely to change

- `backend/bookings/views.py`
- `backend/bookings/serializers.py`
- `backend/bookings/urls.py`
- `backend/bookings/tests.py`
- `frontend/src/App.jsx`
- `frontend/src/pages/BookingsAdmin.jsx`
- New `frontend/src/components/BookingsAdmin/BookingDetail.jsx`
- `frontend/src/components/BookingsAdmin/bookingAdminApi.js`

### Tests

- Object-level role restrictions.
- Role-specific field visibility.
- Read/mark-viewed behavior.
- Prior customer-experience calculation presentation.

### Acceptance criteria

- No staff role can retrieve a booking outside its authorized scope.
- The React detail view provides the required operational information without generic public `BookingDetailView` access.

---

## Chunk 5 — Add controlled staff booking editing

### Goal

Replace Django Admin booking edits with an explicitly authorized, validated React workflow.

### Work

- Add a role-aware staff update endpoint; do not expose the generic `BookingSerializer(fields='__all__')` as an unrestricted admin-edit API.
- Define allowed editable fields per role based on Django Admin behavior.
- Preserve model validations and business constraints.
- Support editable sections for customer, vehicle, travel, service/add-ons, status/note, and allowed pricing fields.
- Keep marketing attribution read-only.
- Ensure super-admin-only supplier extension editing stays restricted.
- Build an edit form with server-returned validation errors mapped to fields.
- Refresh the list/detail after successful save.

### Files likely to change

- `backend/bookings/views.py`
- `backend/bookings/serializers.py`
- `backend/bookings/urls.py`
- `backend/bookings/tests.py`
- `frontend/src/components/BookingsAdmin/BookingDetail.jsx`
- New `frontend/src/components/BookingsAdmin/BookingEditForm.jsx`
- `frontend/src/components/BookingsAdmin/bookingAdminApi.js`

### Tests

- Full super-admin allowed fields.
- Manager cannot edit pricing/marketing fields.
- Supplier cannot change supplier ownership or protected customer-experience fields.
- Invalid dates, prices, service/add-on IDs, and statuses are rejected.

### Acceptance criteria

- React edits enforce the same or stricter role rules than Django Admin.
- No role can update a booking outside its permitted scope.

---

## Chunk 6 — Secure booking documents and single-record actions

### Goal

Move individual document downloads and operational status actions behind staff-safe endpoints.

### Work

- Replace or wrap current public invoice and booking-form download behavior with staff-authorized booking document endpoints.
- Reuse `generate_invoice` and `generate_booking_form_pdf`; do not recreate PDF generation in React.
- Add explicit permitted status-transition actions for staff, including the current manager statuses where appropriate.
- Decide and implement whether the React staff UI allows cancellation through a dedicated staff action or through controlled general editing.
- Show action confirmation and success/error feedback in React.

### Files likely to change

- `backend/bookings/views.py`
- `backend/bookings/urls.py`
- `backend/payments/views.py`
- `backend/payments/urls.py`
- `backend/bookings/tests.py`
- `frontend/src/components/BookingsAdmin/BookingDetail.jsx`
- `frontend/src/components/BookingsAdmin/bookingAdminApi.js`

### Tests

- Unauthorized document requests fail.
- Supplier can only download documents for its own bookings.
- Manager/full-admin permissions match agreed rules.
- Status transitions reject unsupported values and preserve required side effects.

### Acceptance criteria

- React booking detail supports authorized invoice/form downloads and required status actions.
- Public customer document behavior is not accidentally broken.

---

## Chunk 7 — Add “save and send update email” parity

### Goal

Replace the Django Admin custom update-email button with an explicit staff operation.

### Work

- Add a dedicated action endpoint that records/saves permitted booking changes and sends the appropriate notification.
- Reuse existing `send_booking_updated_email` and `send_cancellation_email_task` behavior.
- Preserve the existing changed-field summary logic and excluded internal fields.
- Use Celery first; preserve or explicitly redesign the current fallback behavior if the broker is unavailable.
- Add a clear React choice between ordinary save and save-and-notify.

### Files likely to change

- `backend/bookings/admin.py` only if shared logic must be extracted without behavior duplication
- `backend/bookings/views.py`
- `backend/bookings/serializers.py`
- `backend/bookings/tasks.py`
- `backend/bookings/urls.py`
- `backend/bookings/tests.py`
- `frontend/src/components/BookingsAdmin/BookingEditForm.jsx`
- `frontend/src/components/BookingsAdmin/bookingAdminApi.js`

### Tests

- Changed fields are accurately summarized.
- Excluded fields are not included in the customer email.
- Cancellation selects the cancellation email behavior.
- Unauthorized roles cannot trigger customer emails.

### Acceptance criteria

- Staff can distinguish a normal save from save-and-notify.
- Notification results are visible and accurately reported in the UI.

---

## Chunk 8 — Implement staff booking creation

### Goal

Provide a React equivalent of Django Admin “Add Booking,” including role-specific creation rules.

### Work

- Add a controlled staff create endpoint and matching create form.
- Preserve Booking model ID generation and supplier custom-ID requirements.
- For supplier-created records, force the logged-in supplier server-side.
- Preserve confirmed non-supplier booking email/manager-notification behavior if it remains an approved requirement.
- Prevent client-selected supplier ownership for suppliers.
- Use server-side service/coupon/status validation.

### Files likely to change

- `backend/bookings/views.py`
- `backend/bookings/serializers.py`
- `backend/bookings/urls.py`
- `backend/bookings/tests.py`
- New `frontend/src/components/BookingsAdmin/BookingCreateForm.jsx`
- `frontend/src/pages/BookingsAdmin.jsx`
- `frontend/src/components/BookingsAdmin/bookingAdminApi.js`

### Tests

- Booking ID generation for RS, Dublin, and suppliers.
- Supplier custom booking-ID requirement.
- Supplier cannot create for another supplier.
- Confirmation email behavior for qualifying staff-created bookings.

### Acceptance criteria

- Approved staff roles can create valid bookings without Django Admin.
- Creation behavior matches the agreed Django Admin workflow.

---

## Chunk 9 — Implement bulk booking actions and exports

### Goal

Replace Django Admin selected-row operations safely and efficiently.

### Work

- Add selected-ID bulk-action endpoints with server-side authorization and queryset scoping.
- Implement:
  - Excel export (current Django action is XLSX despite its method name)
  - PDF export
  - invoice ZIP download
  - booking-form ZIP download
- Preserve existing date-filter-based grouping and file naming where required.
- Add a React bulk-selection toolbar with role-aware available actions and progress/error handling.
- Do not perform bulk PDF/ZIP generation in the browser.

### Files likely to change

- `backend/bookings/admin.py` if export logic is extracted for shared reuse
- `backend/bookings/views.py`
- `backend/bookings/urls.py`
- New backend helper/module if extraction keeps views and admin maintainable
- `backend/bookings/tests.py`
- New `frontend/src/components/BookingsAdmin/BookingBulkActions.jsx`
- `frontend/src/components/BookingsAdmin/BookingList.jsx`
- `frontend/src/components/BookingsAdmin/bookingAdminApi.js`

### Tests

- Bulk actions respect selected IDs and current role scope.
- Managers/suppliers receive only approved actions.
- Generated files have correct content type and usable filenames.
- Empty/invalid selection returns a stable error.

### Acceptance criteria

- Staff can export/download authorized selected bookings from React.
- A supplier cannot export another supplier’s booking by submitting its ID manually.

---

## Chunk 10 — Booking-dashboard quality, observability, and rollout

### Goal

Make the bookings feature production-ready while retaining Django Admin as rollback support.

### Work

- Add API and React tests for completed booking workflows.
- Test all roles against representative production-like data.
- Validate performance with realistic list sizes and export selections.
- Add error logging for failed staff actions without logging booking-sensitive data or tokens.
- Conduct staff acceptance testing against the parity checklist from Chunk 0.
- Add an optional feature flag or controlled navigation rollout if deployment practices support it.
- Keep a visible Django Admin fallback link until acceptance is complete.

### Files likely to change

- `backend/bookings/tests.py`
- Related backend test modules
- Frontend tests for new API helpers/components
- `frontend/src/components/AdminLayout/AdminNavbar.jsx`
- Deployment/configuration files only if a feature-flag approach is approved

### Acceptance criteria

- Super-admin, manager, and supplier workflows have been acceptance-tested.
- No unresolved authorization defects remain.
- Django Admin remains operational as a rollback path.

---

## Chunks after Bookings

Start these only after the bookings dashboard is stable, or explicitly reprioritize them.

### Chunk 11 — Users, suppliers, and credit-ledger administration

- React screens for users, role/profile management, suppliers, and immutable credit transactions.
- Keep manual credit changes as dedicated audited ledger actions, never a raw balance edit.

### Chunk 12 — Services, add-ons, coupons, statuses, and booking settings

- Replace Django Admin catalog/configuration screens.
- Apply strict super-admin-only permissions to pricing and global settings.

### Chunk 13 — Contact, FAQ, marketing, and redirect operations

- Add React management for contact messages, FAQ data, marketing leads, unsubscribes, and redirect rules.
- Reuse and unify the existing React Blog Admin where practical.

### Chunk 14 — Payments and remaining finance operations

- Add staff-facing payment records/operational status review where required.
- Preserve webhook-driven Stripe behavior; do not create unsafe manual payment-state changes.

### Chunk 15 — Review Django Admin retirement scope

- Compare all remaining `/admin-dashboard/` models/actions against React coverage.
- Decide which technical/super-admin-only Django Admin tools remain permanently, such as low-level Celery Beat administration.
- Remove only obsolete navigation links after a formal acceptance decision; do not delete Django Admin merely because React screens exist.

## Dependency order

```text
0 baseline
  └─ 1 staff authorization
       └─ 2 booking-list API
            └─ 3 React booking list
                 └─ 4 detail read
                      └─ 5 edit
                           ├─ 6 documents/status actions
                           ├─ 7 save-and-notify
                           ├─ 8 create
                           └─ 9 bulk exports
                                └─ 10 rollout/acceptance
                                     └─ 11–15 remaining admin areas
```

## Suggested first implementation request

When ready to begin coding, request only:

> Implement Chunk 1 from `plan.md`: establish the staff-dashboard authorization contract. Do not begin bookings-list API or React bookings UI yet.

After that is reviewed and accepted, proceed to Chunk 2.
