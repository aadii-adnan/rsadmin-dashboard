# Supplier API Internal Notes

This file is for the RS Express Parking technical team. Do not share it with suppliers.

## CORS

CORS is a browser-only security mechanism. It does not apply to normal server-to-server supplier API calls.

When a supplier backend calls `POST /api/supplier/bookings/`, the request goes directly from their server to ours. The browser never sees it, so `CORS_ALLOWED_ORIGINS` has no effect on that integration.

The only scenario where CORS applies is if a supplier builds a browser app where the user's browser calls our API directly. If that ever happens, add the supplier domain to `CORS_ALLOWED_ORIGINS` in `backend/backend/settings.py`.

```python
CORS_ALLOWED_ORIGINS = [
    'https://www.rsexpressparking.com',
    'https://dublinairportexpressparking.ie',
    'https://www.dublinairportexpressparking.ie',
    'http://localhost:3000',
    'http://localhost:5173',
    'https://supplier-domain.com',
]
```

## Nginx

If production uses Nginx as a reverse proxy, verify the supplier endpoint is not blocked by rate limits or IP allowlists.

### Rate limiting

If Nginx has `limit_req` rules configured, suppliers may hit rate limits during high-volume periods. Check for rules like:

```nginx
limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
limit_req zone=api burst=20;
```

If needed, create a more permissive location for the supplier endpoint:

```nginx
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

### IP allowlists

If Nginx or a firewall restricts `/api/`, supplier IPs may receive 403 responses or connection failures.

Preferred approach: keep the authenticated API public over HTTPS. If an allowlist is required, add supplier IP ranges explicitly.

Useful checks:

```bash
grep -r "allow\|deny" /etc/nginx/
sudo ufw status
```

## ALLOWED_HOSTS

Django `ALLOWED_HOSTS` validates the `Host` header, not the client IP. Suppliers send requests to `rsexpressparking.com`, which is already allowed.

## Recommended DRF Throttling

There is currently no API-level rate limiting in Django. For production with multiple suppliers, consider authenticated per-user throttling:

```python
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': [
        'rest_framework_simplejwt.authentication.JWTAuthentication',
    ],
    'DEFAULT_THROTTLE_CLASSES': [
        'rest_framework.throttling.UserRateThrottle',
    ],
    'DEFAULT_THROTTLE_RATES': {
        'user': '200/hour',
    },
}
```

This protects the endpoint while staying comfortably above normal supplier booking volume.
