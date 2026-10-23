# Bookings Operations Dashboard: Staff Acceptance Checklist

Status: **not yet completed by staff**. Use this checklist with representative
test accounts and non-production booking data before changing the dashboard's
rollout status.

## Accounts and access

- [ ] An ordinary customer is denied `/bookings-admin` and every `/api/bookings/staff/` endpoint.
- [ ] A full super-admin can see all approved test bookings, including both websites and supplier bookings.
- [ ] A manager cannot see Pending or Payment Failed bookings and cannot download invoices.
- [ ] An active supplier sees and changes only its own bookings; manually supplied other-supplier IDs are denied.
- [ ] An inactive supplier is denied dashboard access.
- [ ] The **Django Admin** link opens `/admin-dashboard/` as the operational fallback.

## Booking operations

- [ ] Search, date filters, status/service filters, ordering, and pagination return the expected server-scoped rows.
- [ ] A staff user can inspect a permitted booking and cannot load an out-of-scope detail URL.
- [ ] Editing shows backend validation errors; role-protected fields remain unavailable.
- [ ] A normal save updates the permitted fields without sending an email.
- [ ] **Save and notify customer** reports queued, direct-send, or failed delivery accurately; cancellation uses the cancellation email flow.
- [ ] Invoice/form downloads and status actions match each role's permissions.
- [ ] A valid staff user can create a booking; supplier creation remains assigned to the logged-in supplier.
- [ ] Excel, PDF, invoice ZIP, and booking-form ZIP contain only selected, authorized bookings.

## Release checks

- [ ] Test RS Express and Dublin Airport Parking bookings, an unviewed booking, and a booking with prior customer experience.
- [ ] Record any workflow difference from Django Admin and obtain approval before rollout.
- [ ] Confirm error messages do not expose customer data, tokens, or internal exceptions.
- [ ] Keep Django Admin available until staff formally accepts the dashboard rollout.
