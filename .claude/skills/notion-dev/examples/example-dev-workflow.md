# Example: Developer Consuming and Implementing a Notion Ticket

## Starting Point

Developer has seen tickets in Notion and wants to work on one.

**Developer input:** "Work on implementing the auth endpoints ticket"

## Step 1: Find Ticket

Claude searches Notion for "auth endpoints":

```
📋 Found: [Step 2] Implement auth API endpoints
   Priority: HIGH
   Status: Open
   Assigned: (unassigned)

   ## Context
   Implements the server-side authentication logic. Three endpoints: register
   (create user), login (issue tokens), refresh (get new access token).

   ## Scope
   - [ ] Implement POST /auth/register endpoint
   - [ ] Implement POST /auth/login endpoint
   - [ ] Implement POST /auth/refresh endpoint
   - [ ] Add error handling...

   ## Acceptance Criteria
   - All three endpoints implement correct validation
   - Tokens are properly issued and can be verified
   - ...

   Ready? (yes/no)
```

**Developer confirms:** "yes"

## Step 2: Update Status & Create Branch

```
Updating Notion status to "In progress"...
Creating branch feature/implement-auth-api-endpoints

Ready? (yes/no)
```

**Developer confirms:** "yes"

```
✅ Branch created
```

## Step 3: Implement Iteratively

### Scope Item 1: Register Endpoint

Claude implements:

```typescript
// src/api/auth.ts
export async function registerHandler(req: Request) {
  const { email, password } = req.body;

  // Validate email format
  if (!isValidEmail(email)) {
    return { status: 400, body: { error: "Invalid email" } };
  }

  // Check if user exists
  const existing = await db.users.findByEmail(email);
  if (existing) {
    return { status: 409, body: { error: "Email already registered" } };
  }

  // Hash password
  const hashedPassword = await bcrypt.hash(password, 12);

  // Create user
  const user = await db.users.create({
    email,
    hashedPassword,
    createdAt: new Date(),
  });

  return {
    status: 201,
    body: { id: user.id, email: user.email }
  };
}
```

Claude shows what was implemented:

```
I've implemented the register endpoint with email validation and password hashing.

Files changed:
- src/api/auth.ts (new)

The endpoint:
- Validates email format
- Checks for duplicate emails (409 conflict)
- Hashes password with bcrypt
- Creates user in database
- Returns user ID and email

Ready to review? Let me know:
- Explain any part
- Make changes
- Continue to next scope item
- Commit this as-is
```

**Developer response:** "Looks good. Continue to the next endpoint."

### Scope Item 2: Login Endpoint

Claude implements:

```typescript
export async function loginHandler(req: Request) {
  const { email, password } = req.body;

  // Find user
  const user = await db.users.findByEmail(email);
  if (!user) {
    return { status: 401, body: { error: "Invalid credentials" } };
  }

  // Verify password
  const valid = await bcrypt.compare(password, user.hashedPassword);
  if (!valid) {
    return { status: 401, body: { error: "Invalid credentials" } };
  }

  // Issue tokens
  const accessToken = jwt.sign(
    { userId: user.id, email: user.email },
    process.env.JWT_SECRET,
    { expiresIn: '15m' }
  );

  const refreshToken = crypto.randomBytes(32).toString('hex');
  await db.refreshTokens.create({
    userId: user.id,
    token: refreshToken,
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
  });

  return {
    status: 200,
    body: { accessToken, refreshToken }
  };
}
```

Claude shows:

```
I've implemented the login endpoint with password verification and token issuance.

Files changed:
- src/api/auth.ts (modified)

The endpoint:
- Finds user by email
- Verifies password with bcrypt
- Issues JWT access token (15 min expiry)
- Creates refresh token in database (7 day expiry)
- Returns both tokens

Ready to review?
```

**Developer response:** "Can you add a check for inactive accounts? Add an `active` field to users."

Claude iterates:

```typescript
// Updated register endpoint
const user = await db.users.create({
  email,
  hashedPassword,
  active: true,  // New field
  createdAt: new Date(),
});

// Updated login endpoint
const user = await db.users.findByEmail(email);
if (!user) {
  return { status: 401, body: { error: "Invalid credentials" } };
}

// NEW: Check if account is active
if (!user.active) {
  return { status: 403, body: { error: "Account is disabled" } };
}

// ... rest of login logic
```

Claude shows:

```
Added active field check. Updated both register and login endpoints.

Files changed:
- src/api/auth.ts (modified)
- db/migrations/001_create_users.sql (modified) — added active BOOLEAN DEFAULT true

Changes:
- Register sets active: true by default
- Login checks user.active, returns 403 if inactive
- Existing users default to active

Ready to review?
```

**Developer:** "Perfect. Continue."

### Scope Item 3: Refresh Endpoint

Claude implements:

```typescript
export async function refreshHandler(req: Request) {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    return { status: 400, body: { error: "Refresh token required" } };
  }

  // Find refresh token
  const stored = await db.refreshTokens.findByToken(refreshToken);
  if (!stored) {
    return { status: 401, body: { error: "Invalid refresh token" } };
  }

  // Check expiry
  if (stored.expiresAt < new Date()) {
    return { status: 401, body: { error: "Refresh token expired" } };
  }

  // Get user
  const user = await db.users.findById(stored.userId);
  if (!user || !user.active) {
    return { status: 401, body: { error: "User not found or inactive" } };
  }

  // Issue new access token
  const newAccessToken = jwt.sign(
    { userId: user.id, email: user.email },
    process.env.JWT_SECRET,
    { expiresIn: '15m' }
  );

  return { status: 200, body: { accessToken: newAccessToken } };
}
```

Claude shows:

```
I've implemented the refresh endpoint. Validates refresh token, checks expiry,
and issues new access token.

Files changed:
- src/api/auth.ts (modified)

The endpoint:
- Validates refresh token provided
- Checks token hasn't expired
- Verifies user still exists and is active
- Issues new 15-minute access token
- Does not rotate refresh token (one-time use not required)

Ready to review?
```

**Developer:** "Looks good. Commit all three endpoints."

## Step 4: Commit

```
Committing:

feat: Implement authentication API endpoints

- Add POST /auth/register endpoint with email validation
- Add POST /auth/login endpoint with password verification
- Add POST /auth/refresh endpoint for token refresh
- Hash passwords with bcrypt (12 salt rounds)
- Issue JWT access tokens (15 min expiry) and refresh tokens (7 day expiry)
- Check account active status on login and refresh
- Return 401 for invalid credentials, 403 for inactive accounts

Ready to commit? (yes/no/revise message)
```

**Developer:** "yes"

```
✅ Committed
```

## Step 5: Optimisation Pass

```
Before we run code review checks:

Any optimisations you noticed during implementation?
- Code to extract/centralise?
- Utilities to reuse?
- Patterns to follow?
```

**Developer:** "We have a `validateEmail` utility in `lib/validators`. Use that instead of the inline check. And move all password hashing to a separate `lib/crypto.ts` module."

Claude refactors:

```typescript
// New file: src/lib/crypto.ts
import bcrypt from 'bcrypt';

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(
  password: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}
```

```typescript
// Updated src/api/auth.ts
import { hashPassword, verifyPassword } from '../lib/crypto';
import { validateEmail } from '../lib/validators';

export async function registerHandler(req: Request) {
  const { email, password } = req.body;

  if (!validateEmail(email)) {  // Using extracted utility
    return { status: 400, body: { error: "Invalid email" } };
  }

  // ... check existing ...

  const hashedPassword = await hashPassword(password);  // Extracted function

  // ... create user ...
}

export async function loginHandler(req: Request) {
  const { email, password } = req.body;

  const user = await db.users.findByEmail(email);
  if (!user) {
    return { status: 401, body: { error: "Invalid credentials" } };
  }

  const valid = await verifyPassword(password, user.hashedPassword);  // Extracted
  if (!valid) {
    return { status: 401, body: { error: "Invalid credentials" } };
  }

  // ... rest of logic ...
}
```

Claude shows:

```
Refactored to use existing utilities and extracted password hashing.

Files changed:
- src/lib/crypto.ts (new)
- src/api/auth.ts (modified)

Changes:
- Use validateEmail from lib/validators (removes duplication)
- Extract hashPassword and verifyPassword to lib/crypto.ts
- All password operations now go through crypto module
- Makes hashing logic reusable and testable

Ready?
```

**Developer:** "Great. Commit this refactor."

Claude commits:

```
refactor: Extract password hashing and use email validator

- Create lib/crypto.ts with hashPassword and verifyPassword functions
- Use validateEmail utility from lib/validators (removes duplication)
- Makes password operations centralized and testable

✅ Committed
```

## Step 6: Final Audit

```
📋 Final Audit

Before we proceed to PR:

1. Code Understanding:
   - Do you understand all code written?
   - Can you explain changes if asked?

2. Quality:
   - Tests passing locally?
   - Feature tested manually?

3. TODOs:
   - Any out-of-scope items or TODOs discovered that need new tickets?

Ready to proceed? (yes/paste-todos)
```

**Developer:** "yes"

## Step 7: Final Review

```
📋 Implementation Complete

Ticket: [Step 2] Implement auth API endpoints
Branch: feature/implement-auth-api-endpoints

Commits:
1. feat: Implement authentication API endpoints
2. refactor: Extract password hashing and use email validator

Files changed: 2
- src/api/auth.ts
- src/lib/crypto.ts

Scope Complete:
✅ POST /auth/register endpoint (email validation, password hashing)
✅ POST /auth/login endpoint (credential verification, token issuance)
✅ POST /auth/refresh endpoint (token refresh)
✅ Error handling (401 invalid, 403 inactive)

PR will be titled: feat: [Step 2] Implement auth API endpoints

Ready to create PR? (yes/no)
```

**Developer:** "yes"

## Step 8: Create PR

```
Pushing branch and creating PR...

Branch: feature/implement-auth-api-endpoints
PR: https://github.com/org/repo/pull/456
```

## Step 9: Update Notion

```
Updating Notion ticket...
- Status: "In Review"
- Added PR link comment

✅ Notion updated
```

## Final Summary

```
✅ Work complete!

Ticket: [Step 2] Implement auth API endpoints
Branch: feature/implement-auth-api-endpoints
Commits: 2
PR: https://github.com/org/repo/pull/456
Notion: Updated to "In Review" with PR link

Ready for code review. Next developer can work on Step 1 (schema)
or Step 2b (React context) in parallel!
```

## Developer Experience

- Picked up one ticket
- Implemented incrementally with feedback
- Refactored with guidance
- Committed only when ready
- All git actions confirmed
- PR created with full context
- Notion updated automatically
- Ready for review, next ticket ready to be picked up

