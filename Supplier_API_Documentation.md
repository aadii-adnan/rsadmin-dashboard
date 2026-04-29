# RS Express Parking — Supplier Booking API

**Version:** 1.0  
**Base URL (Production):** `https://www.rsexpressparking.com`  
**Protocol:** HTTPS only  
**Format:** JSON (`Content-Type: application/json`)

---

## Overview

This API allows RS Express Parking suppliers to create bookings programmatically from their own systems. Once a booking is submitted, it appears immediately in the RS Express Parking admin portal with **Confirmed** status and the operations team receives an automated notification email with an invoice PDF attached — exactly the same as a standard online booking.

**What the API does NOT do:**
- Send any confirmation email to the customer (that is the supplier's responsibility)
- Handle payment (pricing is provided by the supplier in the request; Stripe is not involved)
- Send completion or follow-up emails to the customer

---

## Authentication

The API uses **JWT (JSON Web Token)** authentication. You must obtain a token pair first, then include the access token on every booking request.

Your credentials (username and password) will be provided by RS Express Parking. Each supplier has a dedicated account.

### Step 1 — Obtain tokens

**Request:**

```
POST /api/token/
Content-Type: application/json

{
  "username": "your_supplier_username",
  "password": "your_supplier_password"
}
```

**Response (200 OK):**

```json
{
  "access": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refresh": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

Store both tokens securely. **Do not expose them in client-side code or version control.**

| Token | Lifetime | Purpose |
|---|---|---|
| `access` | 3 hours | Used in the `Authorization` header on every API request |
| `refresh` | 24 hours | Used to get a new access token without re-entering your password |

---

### Step 2 — Refresh an expired access token

When the access token expires (after 3 hours), use the refresh token to get a new one without re-authenticating.

**Request:**

```
POST /api/token/refresh/
Content-Type: application/json

{
  "refresh": "your_refresh_token_here"
}
```

**Response (200 OK):**

```json
{
  "access": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

If the refresh token has also expired (after 24 hours), repeat Step 1 to obtain a new token pair.

**Recommended implementation:** Build token refresh logic into your HTTP client so it automatically retries with a fresh access token on a `401 Unauthorized` response.

---

## Create a Booking

### Endpoint

```
POST /api/supplier/bookings/
Authorization: Bearer <access_token>
Content-Type: application/json
```

### Request Body

```json
{
  "service": 3,
  "first_name": "John",
  "last_name": "Doe",
  "email": "john.doe@example.com",
  "contact_no": "+353871234567",
  "total_passengers": 2,
  "car_registration_no": "192-D-1234",
  "car_model": "Corolla",
  "car_colour": "Silver",
  "car_manufacturer": "Toyota",
  "departure_terminal": "T1",
  "return_terminal": "T1",
  "departure_flight_number": "FR1234",
  "return_flight_number": "FR5678",
  "departure_time": "2025-06-01T06:00:00",
  "return_time": "2025-06-08T18:00:00",
  "total_price": "120.00",
  "discounted_price": "120.00",
  "add_ons": [2],
  "website": "rsexpressparking",
  "note": "Customer travelling with oversized luggage"
}
```

### Field Reference

| Field | Type | Required | Notes |
|---|---|---|---|
| `service` | integer | **Yes** | ID of the parking service. Ask RS Express Parking for your allowed service IDs. |
| `first_name` | string | **Yes** | Customer's first name |
| `last_name` | string | **Yes** | Customer's last name |
| `email` | string (email) | **Yes** | Customer's email address |
| `contact_no` | string | **Yes** | Customer's phone number (include country code, e.g. `+353…`) |
| `total_passengers` | integer | **Yes** | Number of passengers |
| `car_registration_no` | string | **Yes** | Vehicle registration plate |
| `car_model` | string | **Yes** | Vehicle model (e.g. `Corolla`) |
| `car_colour` | string | **Yes** | Vehicle colour |
| `car_manufacturer` | string | **Yes** | Vehicle make (e.g. `Toyota`) |
| `departure_terminal` | string | **Yes** | Dublin Airport terminal for drop-off (e.g. `T1`, `T2`) |
| `return_terminal` | string | **Yes** | Dublin Airport terminal for pick-up |
| `departure_time` | datetime (ISO 8601) | **Yes** | Drop-off date and time in UTC (e.g. `2025-06-01T06:00:00`) |
| `return_time` | datetime (ISO 8601) | **Yes** | Pick-up date and time in UTC (e.g. `2025-06-08T18:00:00`) |
| `total_price` | decimal string | **Yes** | Price before any discount, in EUR (e.g. `"120.00"`) |
| `discounted_price` | decimal string | No | Final price after any discount. If omitted or null, `total_price` is used. |
| `departure_flight_number` | string | No | Outbound flight number (e.g. `FR1234`) |
| `return_flight_number` | string | No | Return flight number (e.g. `FR5678`) |
| `add_ons` | array of integers | No | List of add-on IDs to attach. Use `[]` or omit if none. Ask RS Express Parking for available add-on IDs. |
| `website` | string | No | `"rsexpressparking"` (default) or `"dublinairportparking"` |
| `note` | string | No | Any internal note visible to the RS Express Parking operations team |

**Important notes on datetime format:**
- Send all times in **UTC**. Example: if the customer's drop-off is at 6:00 AM Irish time (IST = UTC+1 in summer), send `05:00:00` UTC.
- Format: `YYYY-MM-DDTHH:MM:SS` — no timezone suffix needed, server interprets as UTC.

---

### Successful Response (201 Created)

```json
{
  "id": 847,
  "booking_id": "SUP-A3F9C21B",
  "service": 3,
  "service_name": "Meet & Greet Premium",
  "first_name": "John",
  "last_name": "Doe",
  "email": "john.doe@example.com",
  "contact_no": "+353871234567",
  "total_passengers": 2,
  "car_registration_no": "192-D-1234",
  "car_model": "Corolla",
  "car_colour": "Silver",
  "car_manufacturer": "Toyota",
  "departure_terminal": "T1",
  "return_terminal": "T1",
  "departure_flight_number": "FR1234",
  "return_flight_number": "FR5678",
  "departure_time": "2025-06-01T06:00:00Z",
  "return_time": "2025-06-08T18:00:00Z",
  "total_price": "120.00",
  "discounted_price": "120.00",
  "add_ons": [
    { "id": 2, "name": "Baby Seat", "price": "10.00" }
  ],
  "website": "rsexpressparking",
  "note": "Customer travelling with oversized luggage",
  "status": { "id": 2, "name": "Confirmed", "type": "booking" },
  "created_at": "2025-04-29T10:32:15.123456Z"
}
```

**Store the `booking_id`** (e.g. `SUP-A3F9C21B`) in your system — it uniquely identifies the booking in the RS Express Parking portal and is required if you ever need to contact RS Express Parking about the booking.

The booking ID prefix (e.g. `SUP`) is unique to your supplier account.

---

### Error Responses

| HTTP Status | When it happens | Example response body |
|---|---|---|
| `400 Bad Request` | Missing or invalid fields | `{ "email": ["This field is required."] }` |
| `400 Bad Request` | Service not available for suppliers | `{ "service": ["This service is not available for supplier bookings."] }` |
| `401 Unauthorized` | Missing or expired access token | `{ "detail": "Authentication credentials were not provided." }` |
| `403 Forbidden` | Account is not a supplier or is deactivated | `{ "detail": "You do not have permission to perform this action." }` |
| `500 Internal Server Error` | Unexpected server error | `{ "error": "System configuration error: Confirmed status not found" }` |

---

## Code Examples

### Python (requests)

```python
import requests

BASE_URL = "https://www.rsexpressparking.com"

# Step 1: Authenticate
auth_response = requests.post(f"{BASE_URL}/api/token/", json={
    "username": "your_supplier_username",
    "password": "your_supplier_password"
})
tokens = auth_response.json()
access_token = tokens["access"]
refresh_token = tokens["refresh"]

# Step 2: Create booking
booking_payload = {
    "service": 3,
    "first_name": "John",
    "last_name": "Doe",
    "email": "john.doe@example.com",
    "contact_no": "+353871234567",
    "total_passengers": 2,
    "car_registration_no": "192-D-1234",
    "car_model": "Corolla",
    "car_colour": "Silver",
    "car_manufacturer": "Toyota",
    "departure_terminal": "T1",
    "return_terminal": "T1",
    "departure_flight_number": "FR1234",
    "return_flight_number": "FR5678",
    "departure_time": "2025-06-01T06:00:00",
    "return_time": "2025-06-08T18:00:00",
    "total_price": "120.00",
    "discounted_price": "120.00",
    "add_ons": [],
    "website": "rsexpressparking"
}

response = requests.post(
    f"{BASE_URL}/api/supplier/bookings/",
    json=booking_payload,
    headers={"Authorization": f"Bearer {access_token}"}
)

if response.status_code == 201:
    booking = response.json()
    print(f"Booking created: {booking['booking_id']}")
elif response.status_code == 401:
    # Access token expired — refresh and retry
    refresh_response = requests.post(f"{BASE_URL}/api/token/refresh/", json={
        "refresh": refresh_token
    })
    new_access = refresh_response.json()["access"]
    response = requests.post(
        f"{BASE_URL}/api/supplier/bookings/",
        json=booking_payload,
        headers={"Authorization": f"Bearer {new_access}"}
    )
    booking = response.json()
    print(f"Booking created: {booking['booking_id']}")
else:
    print(f"Error {response.status_code}: {response.json()}")
```

---

### Node.js (fetch / axios)

```javascript
const BASE_URL = 'https://www.rsexpressparking.com';

async function createSupplierBooking(bookingData) {
  // Step 1: Authenticate
  const authRes = await fetch(`${BASE_URL}/api/token/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      username: 'your_supplier_username',
      password: 'your_supplier_password',
    }),
  });
  const { access, refresh } = await authRes.json();

  // Step 2: Create booking
  const res = await fetch(`${BASE_URL}/api/supplier/bookings/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${access}`,
    },
    body: JSON.stringify(bookingData),
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(`Booking failed (${res.status}): ${JSON.stringify(err)}`);
  }

  const booking = await res.json();
  console.log(`Booking created: ${booking.booking_id}`);
  return booking;
}

createSupplierBooking({
  service: 3,
  first_name: 'John',
  last_name: 'Doe',
  email: 'john.doe@example.com',
  contact_no: '+353871234567',
  total_passengers: 2,
  car_registration_no: '192-D-1234',
  car_model: 'Corolla',
  car_colour: 'Silver',
  car_manufacturer: 'Toyota',
  departure_terminal: 'T1',
  return_terminal: 'T1',
  departure_time: '2025-06-01T06:00:00',
  return_time: '2025-06-08T18:00:00',
  total_price: '120.00',
  discounted_price: '120.00',
  add_ons: [],
  website: 'rsexpressparking',
});
```

---

### PHP (cURL)

```php
<?php

$baseUrl = 'https://www.rsexpressparking.com';

// Step 1: Authenticate
$authCurl = curl_init("$baseUrl/api/token/");
curl_setopt_array($authCurl, [
    CURLOPT_POST => true,
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_HTTPHEADER => ['Content-Type: application/json'],
    CURLOPT_POSTFIELDS => json_encode([
        'username' => 'your_supplier_username',
        'password' => 'your_supplier_password',
    ]),
]);
$authResponse = json_decode(curl_exec($authCurl), true);
curl_close($authCurl);
$accessToken = $authResponse['access'];

// Step 2: Create booking
$bookingPayload = [
    'service'              => 3,
    'first_name'           => 'John',
    'last_name'            => 'Doe',
    'email'                => 'john.doe@example.com',
    'contact_no'           => '+353871234567',
    'total_passengers'     => 2,
    'car_registration_no'  => '192-D-1234',
    'car_model'            => 'Corolla',
    'car_colour'           => 'Silver',
    'car_manufacturer'     => 'Toyota',
    'departure_terminal'   => 'T1',
    'return_terminal'      => 'T1',
    'departure_flight_number' => 'FR1234',
    'return_flight_number' => 'FR5678',
    'departure_time'       => '2025-06-01T06:00:00',
    'return_time'          => '2025-06-08T18:00:00',
    'total_price'          => '120.00',
    'discounted_price'     => '120.00',
    'add_ons'              => [],
    'website'              => 'rsexpressparking',
];

$bookingCurl = curl_init("$baseUrl/api/supplier/bookings/");
curl_setopt_array($bookingCurl, [
    CURLOPT_POST => true,
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_HTTPHEADER => [
        'Content-Type: application/json',
        "Authorization: Bearer $accessToken",
    ],
    CURLOPT_POSTFIELDS => json_encode($bookingPayload),
]);
$bookingResponse = json_decode(curl_exec($bookingCurl), true);
$httpCode = curl_getinfo($bookingCurl, CURLINFO_HTTP_CODE);
curl_close($bookingCurl);

if ($httpCode === 201) {
    echo "Booking created: " . $bookingResponse['booking_id'] . "\n";
} else {
    echo "Error $httpCode: " . json_encode($bookingResponse) . "\n";
}
```

---

### curl (command line / testing)

```bash
# Step 1: Obtain tokens
curl -s -X POST https://www.rsexpressparking.com/api/token/ \
  -H "Content-Type: application/json" \
  -d '{"username":"your_supplier_username","password":"your_supplier_password"}'

# Step 2: Create booking (replace ACCESS_TOKEN with value from step 1)
curl -X POST https://www.rsexpressparking.com/api/supplier/bookings/ \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ACCESS_TOKEN" \
  -d '{
    "service": 3,
    "first_name": "John",
    "last_name": "Doe",
    "email": "john.doe@example.com",
    "contact_no": "+353871234567",
    "total_passengers": 2,
    "car_registration_no": "192-D-1234",
    "car_model": "Corolla",
    "car_colour": "Silver",
    "car_manufacturer": "Toyota",
    "departure_terminal": "T1",
    "return_terminal": "T1",
    "departure_time": "2025-06-01T06:00:00",
    "return_time": "2025-06-08T18:00:00",
    "total_price": "120.00",
    "discounted_price": "120.00",
    "add_ons": [],
    "website": "rsexpressparking"
  }'
```

---

## Testing

Before going live, RS Express Parking can set up a **test supplier account** pointing to a staging environment. Contact RS Express Parking to arrange test credentials.

When testing:
1. Use the staging base URL (provided by RS Express Parking)
2. Create a booking and verify the `booking_id` in the response
3. Confirm the booking appears in the RS Express Parking admin portal
4. Verify that no email is delivered to the test customer email address

---

## Support

For credentials, service/add-on IDs, or integration questions, contact:

**RS Express Parking**  
Email: `support@rsexpressparking.com`

---
---

# Production Infrastructure Notes (Internal — RS Express Parking Team)

> This section is for the RS Express Parking technical team. Do not share with suppliers.

## CORS — No Issue for Supplier API Calls

**CORS (Cross-Origin Resource Sharing) is a browser-only security mechanism.** It does not apply to server-to-server HTTP calls.

When a supplier's backend system (PHP app, Python script, Node.js service, etc.) calls `POST /api/supplier/bookings/`, the request goes directly from their server to ours — no browser is involved. The browser never sees it, so no CORS check is performed. The current `CORS_ALLOWED_ORIGINS` whitelist in `settings.py` has zero effect on these calls.

**The only scenario where CORS would apply** is if a supplier built a browser-based web app where user browsers call our API directly. This is uncommon for B2B integrations and not expected here. If it ever arises, the fix is to add the supplier's domain to `CORS_ALLOWED_ORIGINS` in `backend/settings.py`:

```python
CORS_ALLOWED_ORIGINS = [
    'https://www.rsexpressparking.com',
    'https://dublinairportexpressparking.ie',
    'https://www.dublinairportexpressparking.ie',
    'http://localhost:3000',
    'http://localhost:5173',
    'https://supplier-domain.com',  # ← add here if needed
]
```

---

## Nginx — What to Check in Production

If the production server uses Nginx as a reverse proxy (common with Hostinger or any VPS setup), there are two things to verify:

### 1. Rate limiting

If Nginx has `limit_req` rules configured (e.g. to protect against DDoS), suppliers may hit rate limits during high-volume periods. Check the Nginx config for rules like:

```nginx
limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
limit_req zone=api burst=20;
```

**Fix:** Create a separate, more permissive zone for the supplier endpoint, or raise the burst limit:

```nginx
# More lenient rate limit for supplier API (trusted server-to-server calls)
limit_req_zone $binary_remote_addr zone=supplier_api:10m rate=30r/s;

location /api/supplier/ {
    limit_req zone=supplier_api burst=50 nodelay;
    proxy_pass http://127.0.0.1:8000;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}
```

### 2. IP allowlist / firewall rules

If the server has `allow`/`deny` rules in Nginx or a firewall (UFW, iptables, Hostinger panel) that restrict which IPs can reach `/api/`, supplier IPs will be blocked with a 403 or connection refused.

**Fix:** Either remove IP restrictions from the API paths entirely (preferred for a public API), or add supplier IP ranges to the allowlist. To check if Nginx has IP restrictions:

```bash
grep -r "allow\|deny" /etc/nginx/
```

If using UFW:

```bash
sudo ufw allow from <supplier_ip> to any port 443
```

### 3. `ALLOWED_HOSTS` — Not an issue

Django's `ALLOWED_HOSTS` in `settings.py` validates the `Host` HTTP header, not the client's IP. Suppliers send requests to `rsexpressparking.com`, which is already in `ALLOWED_HOSTS`. No change needed.

### 4. Add DRF throttling (recommended)

Currently there is no API-level rate limiting in Django (`REST_FRAMEWORK` has no `DEFAULT_THROTTLE_CLASSES`). For production with multiple suppliers, it is advisable to add throttling to protect the endpoint:

```python
# backend/settings.py
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': [
        'rest_framework_simplejwt.authentication.JWTAuthentication',
    ],
    'DEFAULT_THROTTLE_CLASSES': [
        'rest_framework.throttling.UserRateThrottle',
    ],
    'DEFAULT_THROTTLE_RATES': {
        'user': '200/hour',  # per authenticated user (i.e. per supplier account)
    },
}
```

This limits each supplier account to 200 requests per hour, which is well within normal usage but prevents abuse.
