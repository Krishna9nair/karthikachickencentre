# Auth Testing Playbook (Emergent Google Auth)

## Step 1 — Create test session manually (skip Google flow)
```bash
mongosh --eval '
use("test_database");
var sessionToken = "test_session_" + Date.now();
db.user_sessions.insertOne({
  user_id: "test-google-user",
  email: "test@example.com",
  name: "Test User",
  picture: "https://via.placeholder.com/150",
  session_token: sessionToken,
  phone: null,
  expires_at: new Date(Date.now() + 7*24*60*60*1000),
  created_at: new Date()
});
print("Session: " + sessionToken);
'
```

## Step 2 — Test backend
```bash
TOKEN=<session_token>
API=https://karthik-chicken-app.preview.emergentagent.com

# Whoami
curl -s "$API/api/auth/me" -H "Authorization: Bearer $TOKEN"

# Profile (before phone link → empty addresses, no orders)
curl -s "$API/api/customer/profile" -H "Authorization: Bearer $TOKEN"

# Link phone
curl -s -X POST "$API/api/customer/link-phone" -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" -d '{"phone":"9619417452"}'

# Orders
curl -s "$API/api/customer/orders?status=ongoing" -H "Authorization: Bearer $TOKEN"
curl -s "$API/api/customer/orders?status=delivered" -H "Authorization: Bearer $TOKEN"
curl -s "$API/api/customer/orders?status=cancelled" -H "Authorization: Bearer $TOKEN"

# Logout
curl -s -X POST "$API/api/auth/logout" -H "Authorization: Bearer $TOKEN"
```

## Step 3 — Browser testing
```python
await page.context.add_cookies([{
  "name": "session_token", "value": "<token>",
  "domain": "karthik-chicken-app.preview.emergentagent.com",
  "path": "/", "httpOnly": True, "secure": True, "sameSite": "None"
}])
await page.goto("https://karthik-chicken-app.preview.emergentagent.com/profile")
```

## Test accounts
- Google: any Gmail account works for sign-in (Emergent-managed, no allowlist)
- Linked phone for testing: `9619417452` (matches admin/shop number that has past orders)

## Checklist
- [ ] `GET /api/auth/me` returns user data with cookie or Bearer
- [ ] Sign-in flow lands on `/profile`
- [ ] Phone link gates the Orders + Address features
- [ ] Order tabs (Ongoing / Delivered / Cancelled) filter correctly
- [ ] Reorder fills cart with same items
- [ ] Cancel button only on pending orders, removes order from Ongoing
- [ ] Multiple addresses CRUD works (Home / Office / Other)
- [ ] Logout clears cookie + redirects home
