# TaskFlow — Testing Architecture

## Test Runner

The project uses Node.js's built-in test runner.

Run all tests:

```bash
npm test
```

## Test Files

Authentication:

```bash
node --test tests/auth.test.js
```

Organizations:

```bash
node --test tests/organizations.test.js
```

Organization members:

```bash
node --test tests/organization-members.test.js
```

Projects:

```bash
node --test tests/projects.test.js
```

Tasks:

```bash
node --test tests/tasks.test.js
```

## Current Test Coverage

The current test suite contains 69 passing tests.

```text
69 tests
69 passed
0 failed
```

## Tested Areas

### Authentication

- Registration
- Login
- Invalid credentials
- Refresh tokens
- Logout
- Refresh token invalidation
- Organization context preservation

### Organizations

- Organization creation
- Creator becomes organization administrator
- Organization context in access token
- Input validation
- Unauthenticated access

### Organization Members

- List members
- Add users
- Duplicate member protection
- Unknown user protection
- Role changes
- Member removal
- Permission checks
- Last administrator protection

### Projects

- Create project
- List projects
- Get project
- Update project
- Delete project
- Cross-tenant protection
- Role-based deletion
- Validation
- Unknown project handling

### Tasks

- Create task
- Get task
- Update task
- Delete task
- Cross-tenant protection
- Task assignment
- Task unassignment
- Duplicate assignment protection
- Pagination
- Status filtering
- Priority filtering
- Assignee filtering
- Due-date filtering
- Input validation

## Testing Goal

The tests focus on API behavior and important multi-tenant security boundaries rather than only testing individual functions.
