# Backend Fixes Required for Authentication Issues

## Issue 1: 401 Unauthorized on POST /api/auth/first-access/complete

### Root Cause
In `AuthService.CompleteFirstAccessAsync`, the repository method `GetUserByIdAsync()` loads only the `User` entity without including the `UserCredential` navigation property. When the code tries to access `user.Credential`, it returns null, causing a `GenericLoginException` and 401 response even when the temporary password is correct.

### Backend Fixes Needed

#### 1. Add Repository Method to Load User with Credential

**File:** `UserRepository.cs` or similar

**Add new method:**
```csharp
public async Task<User?> GetUserWithCredentialByIdAsync(long userId, CancellationToken cancellationToken = default)
{
    return await _context.Users
        .Include(u => u.Credential)
        .FirstOrDefaultAsync(u => u.UserId == userId, cancellationToken);
}
```

#### 2. Update CompleteFirstAccessAsync to Use New Method

**File:** `AuthService.cs`

**Current problematic code:**
```csharp
User user = await _repository.GetUserByIdAsync(challenge.UserId, cancellationToken)
    ?? throw GenericLoginException();

UserCredential credential = user.Credential
    ?? throw GenericLoginException();
```

**Fixed code:**
```csharp
User user = await _repository.GetUserWithCredentialByIdAsync(challenge.UserId, cancellationToken)
    ?? throw GenericLoginException();

UserCredential credential = user.Credential
    ?? throw GenericLoginException();
```

#### 3. Verify Temporary Password Verification

Ensure the password verification logic works correctly:
```csharp
if (!_passwordHasher.VerifyPassword(
        request.CurrentTemporaryPassword,
        credential.PasswordHash))
{
    ProcessFailedPasswordAttempt(user, utcNow);
    await _repository.SaveChangesAsync(cancellationToken);
    throw GenericLoginException();
}
```

**Important:** Frontend sends the exact temporary password from onboarding email without trimming or alteration.

#### 4. Verify First Access State Checks

Before completing first access, verify:
- `user.AccountStatus == PendingFirstAccess`
- `credential.CredentialType == Temporary`
- `credential.MustChangePassword == true`
- `credential.TemporaryPasswordExpiresAt > now`
- Challenge stage is correct after OTP verification
- `RestrictedAuthorizationToken` is valid

#### 5. Ensure Device Flow Remains Intact

Do not remove device binding logic:
```csharp
UserDevice device = await _repository.GetUserDeviceByIdAsync(
        challenge.UserDeviceId ?? 0,
        cancellationToken)
    ?? throw GenericLoginException();
```

Device must match installation hash and student device approval must remain intact.

#### 6. Complete First Access Success Flow

After successful password verification and new password validation:
- Update credential password hash with new password
- Set `credential_type = Permanent`
- Set `must_change_password = false`
- Revoke temporary password
- Set `user.EmailVerified = true`
- Set `user.AccountStatus = Active`
- Set `user.FirstLoginCompletedAt = now`
- Approve current device
- Create session and refresh token
- Return access token and user response with roles

#### 7. Fix User Summary Response to Include Roles

When returning `AuthSuccessResponse`, ensure roles are included in `UserSummaryResponse`:
```csharp
Roles = roles.ToArray()
```

Expected response:
```json
{
  "emailVerified": true,
  "roles": ["STUDENT"]
}
```

---

## Issue 2: Refresh Token Cookie Not Working Locally

### Root Cause
The refresh token cookie configuration may not be set correctly for local HTTP development, causing the frontend `/api/auth/refresh-token` call to fail with "Invalid refresh credential".

### Backend Fixes Needed

#### 1. Fix Refresh Token Cookie Configuration for Localhost

**File:** `RefreshTokenCookieOptions.cs` or `appsettings.Development.json`

**For Local HTTP Development:**
```csharp
options.HttpOnly = true;
options.Secure = false;  // false for HTTP localhost (not HTTPS)
options.SameSite = SameSiteMode.Lax;  // Lax for localhost cross-origin
options.Path = "/";
options.MaxAge = TimeSpan.FromDays(30); // or appropriate expiry
```

**Important:**
- `Secure = false` for HTTP localhost (not HTTPS)
- `SameSite = Lax` for localhost cross-origin between frontend:3000 and backend:5082
- Do NOT use `SameSite = None` without `Secure = true` (won't work on HTTP)

#### 2. Verify Cookie is Set After First-Access Complete

After `/api/auth/first-access/complete` succeeds:
- Backend should set HttpOnly cookie
- Browser Application tab should show the cookie
- Cookie should be sent automatically on subsequent requests with `withCredentials: true`

#### 3. Frontend Already Configured Correctly

**File:** `src/lib/api/client.ts`

Already has:
```typescript
withCredentials: true
```

This ensures cookies are sent with requests to the backend.

---

## Issue 3: 403 Forbidden on POST /api/auth/register-user

### Root Cause
The JWT access token does not contain the ADMIN role claim, so ASP.NET Core `[Authorize(Roles = RoleNames.Admin)]` fails.

### Backend Fixes Needed

#### 1. Fix TokenService Role Claim Generation

**File:** `TokenService.cs` or similar

**Current Problem:** TokenService may not be adding role claims to JWT, or using wrong claim type.

**Required Fix:**
```csharp
// When generating JWT, add role claims using ClaimTypes.Role
var roles = await _userRepository.GetActiveRolesAsync(userId);
foreach (var role in roles)
{
    claims.Add(new Claim(ClaimTypes.Role, role.RoleName));
}
```

**Important:** Use `ClaimTypes.Role` (not "role") to match Program.cs configuration.

#### 2. Fix RoleNames Constants

**File:** `RoleNames.cs` or similar

**Required Values:**
```csharp
public static class RoleNames
{
    public const string Admin = "ADMIN";
    public const string Student = "STUDENT";
    public const string Teacher = "TEACHER";
}
```

**Important:** Use uppercase to match database values and JWT claims.

#### 3. Verify Program.cs JWT Configuration

**File:** `Program.cs`

**Current (correct) configuration:**
```csharp
options.TokenValidationParameters = new TokenValidationParameters
{
    NameClaimType = ClaimTypes.Name,
    RoleClaimType = ClaimTypes.Role
};
```

**Do NOT change this** - TokenService must emit claims using `ClaimTypes.Role`.

#### 4. Fix User Summary / PageLoad Response Mapping

**File:** `AuthService.cs` or `CurrentUserHelper.cs`

**Current Problem:** Returns `"emailVerified": false` and `"roles": []` despite database having correct values.

**Required Fix:**
```csharp
// When mapping user to response
response.EmailVerified = user.EmailVerified;
response.Roles = user.UserRoles
    .Where(ur => ur.IsActive)
    .Select(ur => ur.Role.RoleName)
    .ToList();
```

**Expected Response:**
```json
{
  "userId": 1,
  "username": "laxman.shahj24@cps.edu.np",
  "email": "laxman.shahj24@cps.edu.np",
  "fullName": "Laxman Shah",
  "accountStatus": "Active",
  "emailVerified": true,
  "roles": ["ADMIN"]
}
```

#### 5. Verify Database Role Query

Run this query to confirm database is correct:
```sql
SELECT
    u.user_id,
    u.email,
    u.email_verified,
    r.role_name,
    ur.is_active
FROM users u
JOIN user_roles ur ON ur.user_id = u.user_id
JOIN roles r ON r.role_id = ur.role_id
WHERE u.normalized_email = 'LAXMAN.SHAHJ24@CPS.EDU.NP';
```

**Expected:**
```
user_id: 1
email: laxman.shahj24@cps.edu.np
email_verified: true
role_name: ADMIN
is_active: true
```

If database is correct, do not change SQL. Fix token generation/mapping.

---

## Issue 2: Auth Loss After Page Refresh

### Root Cause
Frontend needs to call refresh token endpoint on app load to restore session using HttpOnly cookie.

### Frontend Changes (Already Completed)

✅ `src/lib/api/client.ts` - Already has `withCredentials: true`
✅ `src/lib/auth/refresh.ts` - Created refresh token logic
✅ `src/components/auth-provider.tsx` - Created auth initialization component
✅ `app/layout.tsx` - Added AuthProvider wrapper

### Backend Fixes Needed

#### 1. Fix Refresh Token Cookie Configuration

**File:** `RefreshTokenCookieOptions.cs` or `appsettings.Development.json`

**For Local HTTP Development:**
```csharp
options.HttpOnly = true;
options.Secure = false;  // false for HTTP localhost
options.SameSite = SameSiteMode.Lax;  // Lax for localhost
options.Path = "/";
```

**Important:**
- `Secure = false` for HTTP localhost (not HTTPS)
- `SameSite = Lax` for localhost cross-origin
- Do NOT use `SameSite = None` without `Secure = true`

#### 2. Verify Refresh Token Endpoint

**File:** `AuthController.cs`

**Endpoint:** `POST /api/auth/refresh-token`

**Requirements:**
- Should not require Authorization header (uses cookie)
- Should return new access token in response
- Should set new refresh token cookie
- Should return user summary

**Expected Response:**
```json
{
  "AccessToken": "new-jwt-token",
  "ExpiresAtUtc": "2026-07-28T10:00:00Z",
  "User": {
    "userId": 1,
    "email": "laxman.shahj24@cps.edu.np",
    "emailVerified": true,
    "roles": ["ADMIN"]
  }
}
```

---

## Verification Steps After Backend Fixes

### 1. Clear Frontend State
```javascript
localStorage.clear()
```

### 2. Login
- Email: `laxman.shahj24@cps.edu.np`
- Password: `Admin@12345`
- Complete OTP flow

### 3. Check JWT Token
- Navigate to `/dashboard/admin`
- Look at "JWT Token Debug" section
- Verify ADMIN role shows "Present ✓"
- Expand "View Decoded Token Payload"
- Look for: `"http://schemas.microsoft.com/ws/2008/06/identity/claims/role": "ADMIN"`

### 4. Check User Summary
- Call `GET /api/auth/page-load`
- Verify:
  - `emailVerified: true`
  - `roles: ["ADMIN"]`

### 5. Test Refresh
- Refresh browser
- Frontend should call `POST /api/auth/refresh-token`
- Session should be restored
- Dashboard should stay authenticated

### 6. Test Register User
- Try `POST /api/auth/register-user`
- Should NOT return 403
- Should return 200 OK or 400 validation error
- Backend logs should show `RegisterUserAsync` is reached

---

## Expected Decoded JWT After Fix

```json
{
  "sub": "1",
  "email": "laxman.shahj24@cps.edu.np",
  "name": "Laxman Shah",
  "http://schemas.microsoft.com/ws/2008/06/identity/claims/role": "ADMIN",
  "exp": 1722045600,
  "iat": 1722042000,
  "nbf": 1722042000
}
```

---

## Summary

### Frontend Changes (Completed)
1. ✅ JWT decoder utility for debugging
2. ✅ Auth store auto-extracts roles from token
3. ✅ Admin dashboard shows JWT debug info
4. ✅ Refresh token logic implemented
5. ✅ Auth initialization on app load
6. ✅ API client uses `withCredentials: true`

### Backend Changes (Required)
1. ❌ TokenService adds role claims using `ClaimTypes.Role`
2. ❌ RoleNames constants use uppercase (ADMIN, STUDENT, TEACHER)
3. ❌ User summary mapping returns real `emailVerified` and `roles`
4. ❌ Refresh token cookie configured for localhost (Secure=false, SameSite=Lax)
