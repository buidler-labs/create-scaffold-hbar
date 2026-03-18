# Example: Converting Implementation Plan to Notion Tickets

## Input: Implementation Plan (from Claude Planning Agent)

```
## User Authentication Flow Implementation

### Overview
Implement a complete authentication system with JWT tokens, refresh logic, and secure session handling.

### Step 1: Database Schema
- Create Users table with email, hashed password, created_at
- Create RefreshTokens table with user_id, token, expires_at
- Add indexes on email and user_id

### Step 2: API Implementation
- Create POST /auth/register endpoint
- Create POST /auth/login endpoint
- Create POST /auth/refresh endpoint

### Step 3: Client Integration
- Add authentication context/provider to React
- Create login/register forms
- Wire up API calls to forms
- Add JWT storage in localStorage

### Step 4: Security & Testing
- Add password validation rules
- Add CSRF protection
- Add E2E tests for auth flow
- Add unit tests for password hashing
```

## Parsing the Plan

**Plan name:** "User Authentication Flow"

**Discrete units (dependencies):**
- Step 1: Database schema (no dependencies)
- Step 2: API endpoints (depends on Step 1)
- Step 2b: Client forms (can be parallel with Step 2)
- Step 3: Wire up & testing (depends on Steps 2 & 2b)

## Generated Tickets

```
Plan: "User Authentication Flow"

| # | Name | Priority | Duration | Notes |
|---|------|----------|----------|-------|
| 1 | [Step 1] Create Users and RefreshTokens tables | HIGH | 60 min | Blocks #2, #3 |
| 2 | [Step 2] Implement auth API endpoints | HIGH | 120 min | Parallel with #3 |
| 3 | [Step 2] Create authentication React context | HIGH | 90 min | Parallel with #2 |
| 4 | [Step 3] Wire up login/register forms to API | HIGH | 90 min | Depends on #2, #3 |
| 5 | [Step 4] Add password validation and CSRF | MEDIUM | 60 min | Depends on #2 |
| 6 | [Step 4] Add authentication tests | MEDIUM | 120 min | Depends on #4, #5 |
```

## Ticket Details (Created in Notion)

### Ticket 1: Create Users and RefreshTokens tables

**Title:** [Step 1] Create Users and RefreshTokens tables

**Priority:** High

**Status:** Open

**Due date:** 2026-03-06 (1 day)

**Description:**
```markdown
## Context
First step of authentication implementation. Database schema must be in place before API endpoints can be implemented. This unblocks the API implementation work.

## Scope
- [ ] Create Users table (id, email, hashed_password, created_at, updated_at)
- [ ] Create RefreshTokens table (id, user_id, token, expires_at)
- [ ] Add indexes on Users.email and RefreshTokens.user_id
- [ ] Create database migration file

## Out of Scope
- Initial data/seeding
- Password hashing logic (will be in API layer)
- User roles/permissions

## Technical Notes
- Use existing migration framework in `db/migrations/`
- Follow naming conventions in existing schema
- Ensure foreign key constraints between tables
- Add unique constraint on Users.email

## Acceptance Criteria
- Migration file runs without errors
- Tables visible in database schema
- Indexes created and queryable
- Foreign keys enforced
```

---

### Ticket 2: Implement auth API endpoints

**Title:** [Step 2] Implement auth API endpoints

**Priority:** High

**Status:** Open

**Due date:** 2026-03-08 (3 days)

**Description:**
```markdown
## Context
Implements the server-side authentication logic. Three endpoints: register (create user), login (issue tokens), refresh (get new access token). Must be completed before client integration can be wired up.

## Scope
- [ ] Implement POST /auth/register (validate email, hash password, create user)
- [ ] Implement POST /auth/login (validate credentials, issue JWT + refresh token)
- [ ] Implement POST /auth/refresh (validate refresh token, issue new JWT)
- [ ] Add error handling for invalid credentials, existing email, expired tokens

## Out of Scope
- Email verification
- Password reset flow
- Multi-factor authentication

## Technical Notes
- Use existing JWT library in `lib/jwt`
- Password hashing: use bcrypt with salt rounds = 12
- JWT expiry: 15 minutes (access), 7 days (refresh)
- Store refresh tokens in database (RefreshTokens table from Ticket 1)
- All endpoints should return 401 on invalid input

## Acceptance Criteria
- All three endpoints implement correct validation
- Tokens are properly issued and can be verified
- Expired/invalid tokens rejected
- Endpoints return appropriate HTTP status codes
```

---

### Ticket 3: Create authentication React context

**Title:** [Step 2] Create authentication React context

**Priority:** High

**Status:** Open

**Due date:** 2026-03-08 (3 days)

**Description:**
```markdown
## Context
Client-side authentication state management. Provides authentication context to entire app, handles token storage, and exposes login/logout/register functions. Can be worked in parallel with Ticket 2.

## Scope
- [ ] Create AuthContext with useAuth hook
- [ ] Implement JWT storage in localStorage
- [ ] Implement login function (calls /auth/login, stores tokens)
- [ ] Implement register function (calls /auth/register)
- [ ] Implement logout function (clears tokens)
- [ ] Add token refresh logic (auto-refresh on expiry)

## Out of Scope
- Specific form UI (handled in Ticket 4)
- Token persistence strategies beyond localStorage

## Technical Notes
- Store both access and refresh tokens in localStorage
- Implement axios interceptor to add token to all requests
- Auto-refresh: intercept 401s, call /auth/refresh, retry original request
- Expose user state (logged in status, user info)
- Handle refresh failures gracefully (redirect to login)

## Acceptance Criteria
- AuthContext provides useAuth hook to child components
- Tokens stored and retrieved correctly
- Login/logout functions work as expected
- Token refresh happens automatically on expiry
```

---

### Ticket 4: Wire up login/register forms to API

**Title:** [Step 3] Wire up login/register forms to API

**Priority:** High

**Status:** Open

**Due date:** 2026-03-10 (5 days)

**Description:**
```markdown
## Context
Final client integration step. Creates forms, connects them to auth context, and adds navigation based on auth state. Depends on both API endpoints (Ticket 2) and auth context (Ticket 3).

## Scope
- [ ] Create LoginForm component (email, password, submit)
- [ ] Create RegisterForm component (email, password, confirm password)
- [ ] Wire forms to useAuth hook (call login/register)
- [ ] Add form validation (email format, password strength)
- [ ] Add error display for failed auth attempts
- [ ] Add loading states while auth is in progress
- [ ] Redirect to dashboard on successful login

## Out of Scope
- Password recovery
- Form styling (use existing design system)
- Account settings

## Technical Notes
- Use existing form components from `components/form/`
- Validate password strength: min 8 chars, 1 uppercase, 1 number
- Show clear error messages from API responses
- Disable form submission during loading
- Redirect using react-router: navigate('/dashboard')

## Acceptance Criteria
- Forms submit to API and handle success/failure
- Validation prevents submission of invalid data
- Error messages displayed to user
- Loading states prevent double-submission
- User redirected after successful login
```

---

### Ticket 5: Add password validation and CSRF

**Title:** [Step 4] Add password validation and CSRF

**Priority:** Medium

**Status:** Open

**Due date:** 2026-03-12 (7 days)

**Description:**
```markdown
## Context
Security hardening. Adds password strength validation and CSRF token handling to protect against common attacks.

## Scope
- [ ] Implement password validation (min length, complexity rules)
- [ ] Return validation errors in /auth/register responses
- [ ] Implement CSRF token middleware
- [ ] Add CSRF tokens to registration/login POST requests
- [ ] Validate CSRF tokens on server

## Out of Scope
- Rate limiting
- Account lockout after failed attempts
- Advanced password rules (e.g., dictionary checks)

## Technical Notes
- Password requirements: 8+ chars, 1 uppercase, 1 number, 1 special char
- Use existing CSRF middleware in `middleware/csrf`
- CSRF tokens issued on GET /auth/csrf
- Tokens valid for 1 hour
- Return 403 Forbidden on invalid CSRF

## Acceptance Criteria
- Weak passwords rejected with helpful error message
- CSRF tokens issued and validated correctly
- Requests without valid CSRF token rejected
```

---

### Ticket 6: Add authentication tests

**Title:** [Step 4] Add authentication tests

**Priority:** Medium

**Status:** Open

**Due date:** 2026-03-12 (7 days)

**Description:**
```markdown
## Context
Test coverage for entire auth flow. Ensures system works as expected and prevents regressions.

## Scope
- [ ] Add unit tests for password hashing/verification
- [ ] Add unit tests for JWT creation/verification
- [ ] Add API endpoint tests (register, login, refresh)
- [ ] Add integration tests for complete auth flow
- [ ] Add E2E tests for login/register flows

## Out of Scope
- Load testing
- Security scanning tools

## Technical Notes
- Use existing test framework in `__tests__/`
- Mock database for unit tests
- Use test database for integration tests
- E2E tests: use Playwright with test account
- Aim for >85% code coverage

## Acceptance Criteria
- All test suites pass locally
- No console errors or warnings
- Coverage >85% for auth module
```

## Approval Presentation

**User sees:**

```
Plan: "User Authentication Flow"

| # | Name | Priority | Duration | Notes |
|---|------|----------|----------|-------|
| 1 | [Step 1] Create Users and RefreshTokens tables | HIGH | 60 min | Blocks #2, #3 |
| 2 | [Step 2] Implement auth API endpoints | HIGH | 120 min | Parallel with #3 |
| 3 | [Step 2] Create authentication React context | HIGH | 90 min | Parallel with #2 |
| 4 | [Step 3] Wire up login/register forms to API | HIGH | 90 min | Depends on #2, #3 |
| 5 | [Step 4] Add password validation and CSRF | MEDIUM | 60 min | Depends on #2 |
| 6 | [Step 4] Add authentication tests | MEDIUM | 120 min | Depends on #4, #5 |

Total: 6 tickets | 540 min (~9 hours) | 5 business days to complete

Ready to create these in Notion? (yes/no/edit #)
```

## Notion Database Result

All 6 tickets created in Issue Tracking database with:
- Status: "Open" (ready for development)
- Priority: HIGH or MEDIUM (as specified)
- Due dates: Staggered based on dependencies
- Descriptions: Complete context, scope, acceptance criteria
- No assignments (or assigned based on team availability)

Developers can then pick up tickets individually or in order, starting with Ticket 1.

