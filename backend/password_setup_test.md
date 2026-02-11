## 🧪 Testing Employee Password Setup

### Test URL:
```
http://localhost:5174/set-password?token=test-token-12345678901234567890123456789012
```

### Test Steps:

1. **Test Invalid Token (No Token)**
   - Visit: `http://localhost:5174/set-password`
   - Expected: Shows "Invalid Link" error page

2. **Test Valid Token Page**
   - Visit: `http://localhost:5174/set-password?token=test-token-12345678901234567890123456789012`
   - Expected: Shows password setup form

3. **Test Form Validation**
   - Submit empty form → Shows validation errors
   - Enter mismatched passwords → Shows "Passwords do not match"
   - Enter short password → Shows "Must be at least 8 characters"

4. **Test Password Submission**
   - Enter matching 8+ character passwords
   - Submit form → Calls `/api/v1/auth/set-password`
   - On success → Shows success and redirects to `/login`

### Backend API Test:
```bash
curl -X POST http://localhost:4000/api/v1/auth/set-password \
  -H "Content-Type: application/json" \
  -d '{"token": "test-token-12345678901234567890123456789012", "password": "newpassword123"}'
```

### Database Verification:
```sql
-- Check if user was activated
SELECT id, email, active FROM "user" WHERE email = 'test.employee@company.com';

-- Check if token was marked as used
SELECT used, expires_at FROM password_setup_token WHERE token = 'test-token-12345678901234567890123456789012';
```

### Expected Flow:
1. HR creates employee → User account created (inactive)
2. Password setup token generated and emailed
3. Employee clicks link → Opens password setup page
4. Employee sets password → Account activated
5. Employee redirected to login → Can now log in

### Security Features:
- ✅ Token validation (exists, not expired, not used)
- ✅ Password policy enforcement (8+ characters)
- ✅ Form validation and error handling
- ✅ Auto-redirect on success
- ✅ No token/password logging
- ✅ Single-use token consumption
