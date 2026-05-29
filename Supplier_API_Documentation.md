# RS Express Parking - Supplier Booking API

**Version:** 1.1
**Base URL (Production):** `https://www.rsexpressparking.com`  
**Protocol:** HTTPS only  
**Format:** JSON (`Content-Type: application/json`)

---

## Overview

This API allows RS Express Parking suppliers to create bookings programmatically from their own systems. Once a booking is submitted, it appears immediately in the RS Express Parking admin portal with **Confirmed** status. The RS Express Parking operations team receives an automated notification email with an invoice PDF attached.

**What the API does not do:**
- Send a confirmation email to the customer. That is the supplier's responsibility.
- Handle payment. Pricing is supplied in the request; Stripe is not involved.
- Send completion, follow-up, marketing, or review emails to the customer.

RS Express Parking will provide each supplier with:
- Username and password
- Production or staging base URL
- Allowed service IDs
- Available add-on IDs, if any
- Booking ID prefix, or confirmation that a custom `booking_id` must be supplied

---

## Authentication

The API uses JWT authentication. Obtain a token pair first, then include the access token on every booking request.

Each supplier has a dedicated account. Store credentials and tokens securely. Do not expose them in client-side code or version control.

### Step 1 - Obtain Tokens

**Request**

```http
POST /api/token/
Content-Type: application/json

{
  "username": "your_supplier_username",
  "password": "your_supplier_password"
}
```

**Response - 200 OK**

```json
{
  "access": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refresh": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

| Token | Lifetime | Purpose |
|---|---:|---|
| `access` | 3 hours | Used in the `Authorization` header on API requests |
| `refresh` | 24 hours | Used to get a new access token without re-entering the password |

Compatibility aliases are also available: `POST /api/auth/login/` and `POST /api/auth/token/refresh/`.

---

### Step 2 - Refresh an Expired Access Token

When the access token expires, use the refresh token to get a new access token.

**Request**

```http
POST /api/token/refresh/
Content-Type: application/json

{
  "refresh": "your_refresh_token_here"
}
```

**Response - 200 OK**

```json
{
  "access": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

If the refresh token has expired, repeat Step 1 to obtain a new token pair.

Recommended implementation: when a booking request returns `401 Unauthorized`, refresh the access token once and retry the booking request.

---

## Create a Booking

### Endpoint

```http
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
  "departure_time": "2025-06-01T05:00:00",
  "return_time": "2025-06-08T17:00:00",
  "total_price": "120.00",
  "discounted_price": "120.00",
  "add_ons": [2],
  "website": "rsexpressparking",
  "note": "Customer travelling with oversized luggage"
}
```

### Field Reference

| Field | Type | Required | Notes |
|---|---|---:|---|
| `service` | integer | Yes | Enabled RS Express Parking service ID. Ask RS Express Parking for allowed IDs. |
| `booking_id` | string | Conditional | Only required if RS Express Parking tells you your account uses custom booking IDs. Otherwise omit it. |
| `first_name` | string | Yes | Customer's first name. |
| `last_name` | string | Yes | Customer's last name. |
| `email` | string | Yes | Customer's email address. |
| `contact_no` | string | Yes | Customer's phone number. Include country code where possible, e.g. `+353871234567`. |
| `total_passengers` | integer | Yes | Number of passengers. Minimum `1`. |
| `car_registration_no` | string | Yes | Vehicle registration plate. |
| `car_model` | string | Yes | Vehicle model, e.g. `Corolla`. |
| `car_colour` | string | Yes | Vehicle colour. |
| `car_manufacturer` | string | Yes | Vehicle make, e.g. `Toyota`. |
| `departure_terminal` | string | Yes | Dublin Airport terminal for drop-off, e.g. `T1` or `T2`. |
| `return_terminal` | string | Yes | Dublin Airport terminal for pick-up. |
| `departure_time` | datetime | Yes | Drop-off date and time in UTC. |
| `return_time` | datetime | Yes | Pick-up date and time in UTC. Must be after `departure_time`. |
| `total_price` | decimal string | Yes | Price before any discount, in EUR, e.g. `"120.00"`. Must not be negative. |
| `discounted_price` | decimal string | No | Final price after any discount. If omitted or `null`, `total_price` is used. Must not be negative. |
| `departure_flight_number` | string | No | Outbound flight number, e.g. `FR1234`. |
| `return_flight_number` | string | No | Return flight number, e.g. `FR5678`. |
| `add_ons` | array of integers | No | Active add-on IDs to attach. Use `[]` or omit if none. |
| `website` | string | No | `rsexpressparking` by default. `dublinairportparking` is also accepted if instructed by RS Express Parking. |
| `note` | string | No | Internal note visible to the RS Express Parking operations team. |

### Datetime Format

Send all booking times in UTC.

Accepted examples:
- `2025-06-01T05:00:00`
- `2025-06-01T05:00:00Z`
- `2025-06-01T06:00:00+01:00`

If you send no timezone suffix, the server treats the value as UTC. For example, if the customer's drop-off is 6:00 AM Irish summer time (IST, UTC+1), send `2025-06-01T05:00:00` or `2025-06-01T05:00:00Z`.

---

## Successful Response

**201 Created**

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
  "departure_time": "2025-06-01T05:00:00Z",
  "return_time": "2025-06-08T17:00:00Z",
  "total_price": "120.00",
  "discounted_price": "120.00",
  "add_ons": [
    {
      "id": 2,
      "name": "Baby Seat",
      "price": "10.00",
      "description": "",
      "active": true
    }
  ],
  "website": "rsexpressparking",
  "note": "Customer travelling with oversized luggage",
  "status": {
    "id": 2,
    "name": "Confirmed",
    "type": "booking"
  },
  "created_at": "2025-04-29T10:32:15.123456Z"
}
```

Store the `booking_id` in your system. It uniquely identifies the booking in the RS Express Parking portal and should be used when contacting RS Express Parking about a booking.

If your account uses generated booking IDs, the prefix, such as `SUP`, is unique to your supplier account.

---

## Error Responses

| HTTP Status | When it happens | Example response body |
|---|---|---|
| `400 Bad Request` | Missing or invalid fields | `{ "email": ["This field is required."] }` |
| `400 Bad Request` | Return time is not after departure time | `{ "return_time": "return_time must be after departure_time." }` |
| `400 Bad Request` | Service is disabled or unavailable for supplier bookings | `{ "service": ["This service is not available for supplier bookings."] }` |
| `400 Bad Request` | Inactive or unknown add-on ID | `{ "add_ons": ["Invalid pk \"99\" - object does not exist."] }` |
| `400 Bad Request` | Custom booking ID is required for your supplier account | `{ "booking_id": "This supplier uses custom booking IDs. Please provide booking_id." }` |
| `400 Bad Request` | Duplicate custom booking ID | `{ "booking_id": "A booking with this booking_id already exists." }` |
| `401 Unauthorized` | Missing or expired access token | `{ "detail": "Authentication credentials were not provided." }` |
| `403 Forbidden` | Account is not a supplier or is deactivated | `{ "detail": "You do not have permission to perform this action." }` |
| `500 Internal Server Error` | RS Express Parking configuration issue | `{ "error": "System configuration error: Confirmed status not found" }` |

---

## Code Examples

### Python

```python
import requests

BASE_URL = "https://www.rsexpressparking.com"

auth_response = requests.post(f"{BASE_URL}/api/token/", json={
    "username": "your_supplier_username",
    "password": "your_supplier_password",
})
auth_response.raise_for_status()

tokens = auth_response.json()
access_token = tokens["access"]
refresh_token = tokens["refresh"]

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
    "departure_time": "2025-06-01T05:00:00Z",
    "return_time": "2025-06-08T17:00:00Z",
    "total_price": "120.00",
    "discounted_price": "120.00",
    "add_ons": [],
    "website": "rsexpressparking",
}

def create_booking(access):
    return requests.post(
        f"{BASE_URL}/api/supplier/bookings/",
        json=booking_payload,
        headers={"Authorization": f"Bearer {access}"},
    )

response = create_booking(access_token)

if response.status_code == 401:
    refresh_response = requests.post(f"{BASE_URL}/api/token/refresh/", json={
        "refresh": refresh_token,
    })
    refresh_response.raise_for_status()
    access_token = refresh_response.json()["access"]
    response = create_booking(access_token)

if response.status_code == 201:
    booking = response.json()
    print(f"Booking created: {booking['booking_id']}")
else:
    print(f"Error {response.status_code}: {response.json()}")
```

### Node.js

```javascript
const BASE_URL = 'https://www.rsexpressparking.com';

async function createSupplierBooking(bookingData) {
  const authRes = await fetch(`${BASE_URL}/api/token/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      username: 'your_supplier_username',
      password: 'your_supplier_password',
    }),
  });

  if (!authRes.ok) {
    throw new Error(`Authentication failed (${authRes.status})`);
  }

  const { access } = await authRes.json();

  const res = await fetch(`${BASE_URL}/api/supplier/bookings/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${access}`,
    },
    body: JSON.stringify(bookingData),
  });

  const body = await res.json();

  if (!res.ok) {
    throw new Error(`Booking failed (${res.status}): ${JSON.stringify(body)}`);
  }

  console.log(`Booking created: ${body.booking_id}`);
  return body;
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
  departure_time: '2025-06-01T05:00:00Z',
  return_time: '2025-06-08T17:00:00Z',
  total_price: '120.00',
  discounted_price: '120.00',
  add_ons: [],
  website: 'rsexpressparking',
});
```

### PHP

```php
<?php

$baseUrl = 'https://www.rsexpressparking.com';

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

$bookingPayload = [
    'service' => 3,
    'first_name' => 'John',
    'last_name' => 'Doe',
    'email' => 'john.doe@example.com',
    'contact_no' => '+353871234567',
    'total_passengers' => 2,
    'car_registration_no' => '192-D-1234',
    'car_model' => 'Corolla',
    'car_colour' => 'Silver',
    'car_manufacturer' => 'Toyota',
    'departure_terminal' => 'T1',
    'return_terminal' => 'T1',
    'departure_flight_number' => 'FR1234',
    'return_flight_number' => 'FR5678',
    'departure_time' => '2025-06-01T05:00:00Z',
    'return_time' => '2025-06-08T17:00:00Z',
    'total_price' => '120.00',
    'discounted_price' => '120.00',
    'add_ons' => [],
    'website' => 'rsexpressparking',
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

### curl

```bash
curl -s -X POST https://www.rsexpressparking.com/api/token/ \
  -H "Content-Type: application/json" \
  -d '{"username":"your_supplier_username","password":"your_supplier_password"}'

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
    "departure_time": "2025-06-01T05:00:00Z",
    "return_time": "2025-06-08T17:00:00Z",
    "total_price": "120.00",
    "discounted_price": "120.00",
    "add_ons": [],
    "website": "rsexpressparking"
  }'
```

---

## Testing

Before going live, RS Express Parking can provide a test supplier account for a staging environment.

When testing:
1. Use the staging base URL provided by RS Express Parking.
2. Obtain JWT tokens with the supplier credentials.
3. Create a booking and store the `booking_id` from the response.
4. Confirm the booking appears in the RS Express Parking admin portal with `Confirmed` status.
5. Confirm no email is delivered to the customer email address.

---

## Support

For credentials, service IDs, add-on IDs, or integration questions, contact:

**RS Express Parking**  
Email: `support@rsexpressparking.com`
