# API Specification — Soul2Bowl

**Version:** 1.0.0  
**Date:** April 2026  
**Base URL:** `https://soul2bowl.com/api`  
**Framework:** Next.js Route Handlers (App Router) / tRPC (optional)  
**Auth:** Clerk JWT (passed as `Authorization: Bearer <token>`)

---

## Conventions

- All endpoints return JSON
- All monetary values in cents (integer)
- Timestamps in ISO 8601 format
- Error response format: `{ "error": "message", "code": "ERROR_CODE" }`
- `401 Unauthorized` — missing or invalid auth token
- `403 Forbidden` — insufficient permissions (non-admin accessing admin route)
- `404 Not Found` — resource does not exist
- `422 Unprocessable Entity` — validation error with field details

---

## Authentication Endpoints

### `POST /api/auth/webhook`
Clerk webhook — handles user creation/update/deletion events. Syncs Clerk user to `users` table.  
**Auth:** Clerk webhook secret (not user JWT)

---

## Menu Endpoints

### `GET /api/menu`
Returns all active menu items grouped by category.

**Response:**
```json
{
  "entrees": [...],
  "sides": [...],
  "by_the_pound": [...],
  "desserts": [...],
  "bundles": [...]
}
```

### `GET /api/menu/:slug`
Returns a single menu item by slug.

### `GET /api/menu?category=entree&keto=true`
Filtered menu — supports query params: `category`, `keto`, `vegan`, `gluten_free`, `featured`.

---

## Calendar / Availability Endpoints

### `GET /api/calendar?month=2026-05&service_type=individual`
Returns available calendar slots for a given month and service type.

**Response:**
```json
{
  "slots": [
    {
      "id": "uuid",
      "date": "2026-05-10",
      "time_slot": "12:00",
      "service_type": "individual",
      "available": true,
      "spots_remaining": 8
    }
  ]
}
```

### `GET /api/calendar/:slot_id`
Returns details for a specific slot (availability, cutoff time, service type).

---

## Order Endpoints

### `POST /api/orders`
Creates a new order (moves to `pending_payment` state). Returns Stripe Checkout Session URL.

**Auth:** Optional (guest checkout allowed)

**Request:**
```json
{
  "calendar_slot_id": "uuid",
  "service_type": "individual",
  "items": [
    { "menu_item_id": "uuid", "quantity": 1 },
    { "menu_item_id": "uuid", "quantity": 0.5 }
  ],
  "fulfillment_type": "pickup",
  "delivery_address": null,
  "custom_notes": "Extra spicy please",
  "guest_email": "customer@example.com",
  "guest_name": "Jane Smith"
}
```

**Response:**
```json
{
  "order_id": "uuid",
  "order_number": "SB-2026-001",
  "stripe_checkout_url": "https://checkout.stripe.com/..."
}
```

### `GET /api/orders/:id`
Get order details. Auth required — customer can only view their own orders; admin can view any.

### `GET /api/orders`
**Admin only.** List all orders. Supports filters: `status`, `service_type`, `date`, `page`, `limit`.

### `PATCH /api/orders/:id/status`
**Admin only.** Update order status.

**Request:**
```json
{ "status": "ready" }
```

### `POST /api/orders/:id/refund`
**Admin only.** Trigger Stripe refund for an order.

**Request:**
```json
{ "amount_cents": 1400, "reason": "customer_request" }
```

---

## Stripe Webhook

### `POST /api/webhooks/stripe`
Handles Stripe events. Signature verified via `stripe.webhooks.constructEvent`.

**Events handled:**
- `checkout.session.completed` → confirm order, send confirmation email, decrement slot availability
- `invoice.paid` → renew meal prep subscription record
- `invoice.payment_failed` → send dunning email, update subscription status to `past_due`
- `customer.subscription.deleted` → cancel subscription record

---

## Subscription Endpoints (Meal Prep × 7)

### `POST /api/subscriptions`
Creates a Stripe subscription for weekly Meal Prep × 7. Auth required.

**Request:**
```json
{
  "dietary_preferences": { "keto": false, "vegan": true, "gluten_free": false },
  "custom_notes": "No mushrooms"
}
```

**Response:**
```json
{
  "subscription_id": "uuid",
  "stripe_subscription_id": "sub_xxx",
  "portal_url": "https://billing.stripe.com/..."
}
```

### `GET /api/subscriptions/portal`
Returns Stripe Customer Portal URL for managing/cancelling subscription.

### `DELETE /api/subscriptions/:id`
Cancels subscription at period end (sets `cancel_at_period_end: true` in Stripe).

---

## Catering Endpoints

### `POST /api/catering/inquiries`
Submit a catering inquiry. Auth optional.

**Request:**
```json
{
  "contact_name": "Jane Smith",
  "contact_email": "jane@example.com",
  "contact_phone": "314-555-0100",
  "event_date": "2026-07-04",
  "event_time": "18:00",
  "guest_count": 50,
  "event_type": "birthday party",
  "venue_address": { "line1": "123 Main St", "city": "St. Louis", "state": "MO", "zip": "63101" },
  "dietary_requirements": "Vegan options needed for 10 guests",
  "custom_menu_request": "BBQ + Hawaiian theme",
  "estimated_budget_cents": 200000
}
```

### `GET /api/catering/inquiries`
**Admin only.** List all catering inquiries.

### `PATCH /api/catering/inquiries/:id`
**Admin only.** Update inquiry status, add quote, add admin notes.

---

## Blog Endpoints

### `GET /api/blog?category=recipes&page=1&limit=10`
Returns published blog posts. Public endpoint.

### `GET /api/blog/:slug`
Returns a single blog post by slug.

### `POST /api/blog` (Admin only)
Create a new blog post.

### `PATCH /api/blog/:id` (Admin only)
Update a blog post.

### `DELETE /api/blog/:id` (Admin only)
Soft-delete a blog post.

---

## Admin Config (CMS) Endpoints

### `GET /api/admin/config?page=homepage`
**Admin only.** Returns all config keys for a page.

### `PATCH /api/admin/config/:key`
**Admin only.** Update a single config value (text, HTML, image URL, etc.).

**Request:**
```json
{ "value": "New hero headline text!" }
```

### `POST /api/admin/upload`
**Admin only.** Upload image to DigitalOcean Spaces CDN. Returns CDN URL.

---

## Admin Dashboard Endpoints

### `GET /api/admin/analytics`
**Admin only.** Returns summary metrics.

**Response:**
```json
{
  "revenue_today_cents": 28600,
  "orders_today": 12,
  "top_items": [
    { "name": "Soul Bowl", "orders": 47 }
  ],
  "upcoming_orders": [...],
  "catering_inquiries_pending": 3
}
```

---

## Testimonial Endpoints

### `GET /api/testimonials`
Returns published testimonials. Public.

### `POST /api/testimonials` (Admin only)
Create/approve a testimonial.

---

## Health Check

### `GET /api/health`
Returns `{ "status": "ok", "timestamp": "..." }`. Used by DigitalOcean health checks.
