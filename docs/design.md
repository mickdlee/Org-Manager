# Org Manager — Design Document

## 1. Purpose

Org Manager is a client-side single-page application for managing an enterprise's organisational structure. It models the hierarchy **Delivery Unit → Release Train → Squad**, tracks people and their role assignments at each level, computes costs, and provides onboarding pipeline tooling — all without a server.

---

## 2. Technology Stack

| Layer | Technology |
|---|---|
| Framework | React 19 |
| Language | TypeScript 5.7 (strict) |
| Build tool | Vite 6 with `@vitejs/plugin-react` |
| Routing | React Router v7 (`BrowserRouter`) |
| Styling | Tailwind CSS v4 (config via `src/index.css` `@theme` block) |
| Icons | lucide-react |
| Persistence | Browser `localStorage` / `sessionStorage` |
| Crypto | Web Crypto API (`crypto.subtle.digest`) |

No backend, no external API calls, no state-management library beyond React Context + `useState`.

---

## 3. High-Level Architecture

```
┌─────────────────────────────────────────────────────┐
│                     Browser                         │
│                                                     │
│  ┌──────────────┐   ┌───────────────────────────┐  │
│  │ AuthProvider │   │    AppStoreProvider        │  │
│  │  (useAuth)   │   │    (useAppStore)            │  │
│  └──────┬───────┘   └────────────┬──────────────┘  │
│         │                        │                  │
│         └──────────┬─────────────┘                  │
│                    │                                 │
│            ┌───────▼────────┐                       │
│            │  BrowserRouter │                       │
│            │    <Routes>    │                       │
│            └───────┬────────┘                       │
│                    │                                 │
│         ┌──────────▼──────────────┐                 │
│         │   Layout (Shell)        │                 │
│         │  Sidebar + Header       │                 │
│         │  + <main> (page outlet) │                 │
│         └──────────┬──────────────┘                 │
│                    │                                 │
│          Page Components (9 pages)                  │
│                                                     │
│  ┌──────────────────────────────────────────────┐   │
│  │  localStorage         sessionStorage         │   │
│  │  org_manager_data     org_manager_session     │   │
│  │  org_manager_users                            │   │
│  └──────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────┘
```

---

## 4. Provider Tree

The entry point (`src/main.tsx`) renders `<App />`, which wraps the entire application in two context providers and the router:

```
<AuthProvider>               ← session & user management
  <AppStoreProvider>         ← all org data & mutations
    <BrowserRouter>
      <Routes> … </Routes>
    </BrowserRouter>
  </AppStoreProvider>
</AuthProvider>
```

Providers are intentionally independent. `AuthProvider` does not depend on `AppStoreProvider` and vice versa. Pages consume both via custom hooks (`useAuth`, `useAppStore`).

---

## 5. Authentication (`src/hooks/useAuth.tsx`)

### Design decisions

- **No server** — users are stored as `AppUser` records in `localStorage` (`org_manager_users`).
- **Passwords hashed** — `sha256(password)` via the Web Crypto API before storage. Plain-text passwords are never persisted.
- **Session scoped to tab** — the active session is stored in `sessionStorage` (`org_manager_session`), not `localStorage`, so closing the tab logs the user out.
- **First-run bootstrap** — when `loadUsers()` returns an empty array (`hasUsers === false`), the login screen renders a setup form instead of a sign-in form, creating the first admin account.

### State

| State | Source | Description |
|---|---|---|
| `session` | `sessionStorage` | `{ userId, username, role }` or `null` |
| `users` | `localStorage` | Array of `AppUser` (`{ id, username, passwordHash, role }`) |
| `isAdmin` | derived | `session?.role === 'admin'` |

### Key operations

| Method | Description |
|---|---|
| `login(username, password)` | Hashes password, finds matching user, writes session |
| `logout()` | Clears `sessionStorage`, sets `session` to `null` |
| `createUser(username, password, role)` | Hashes password, appends user to `localStorage` |

### Route protection

`Layout` (the shell component wrapping all authenticated pages) reads `session` from `useAuth`. If `null`, it redirects to `/login`. This means every page using `Layout` is automatically protected — no per-route guards are needed.

---

## 6. Data Model (`src/types/index.ts`)

### Entity hierarchy

```
AppData
├── people: Person[]
├── roleConfig: RoleConfig
└── deliveryUnits: DeliveryUnit[]
    ├── assignments: Assignment[]       ← DU-level roles
    ├── onboarding?: DeliveryUnitOnboarding
    └── releaseTrains: ReleaseTrain[]
        ├── assignments: Assignment[]   ← RT-level roles
        └── squads: Squad[]
            ├── assignments: Assignment[]  ← squad-level roles + allocation
            └── onboarding?: SquadOnboarding
```

`Person` is a flat global list — deliberately separate from the hierarchy. Assignment records reference persons by `personId`, which avoids denormalisation and makes cross-cutting queries (e.g. total allocation for a person) straightforward.

### Key types

```typescript
interface Person {
  id: string;
  name: string;
  email: string;
  photoUrl?: string;
  dayRate?: number;          // USD per day
}

interface Assignment {
  personId: string;
  role: string;
  allocationPercentage?: number;  // 0–100, defaults to 100 at squad level
}

interface DeliveryUnit {
  id: string;
  name: string;
  type: DeliveryUnitType;    // 'Customer Journey' | 'Platform' | 'Supporting'
  description: string;
  assignments: Assignment[];
  releaseTrains: ReleaseTrain[];
  onboarding?: DeliveryUnitOnboarding;
  fundedDeliverables?: FundedDeliverable[];
  financialsByMonth?: Record<string, FinancialMonthRecord>; // key: YYYY-MM
}
```

### Allocation design

Allocation (`allocationPercentage`) is tracked **only on squad-level assignments**. DU and RT assignments intentionally omit it — they represent organisational membership, not fractional capacity. This keeps cost and allocation calculations unambiguous: capacity is always consumed at the squad level.

### Monthly funded deliverables financial model

Delivery Units can define funded deliverables and month-specific financial allocation records:

- `fundedDeliverables[]` stores DU-level deliverable metadata and funding targets.
- `financialsByMonth[YYYY-MM]` stores per-squad Actual and Forecast percentage splits across deliverables.
- `OpenPosition.dayRate` (DU, RT, and Squad onboarding positions) is used for forecast cost modeling.

### Role configuration

`RoleConfig` (`{ deliveryUnit, releaseTrain, squad }`) stores the set of available role labels per layer. Admins can add/remove roles from Settings. Removing a role from config does not affect existing assignments — the stored role string is the source of truth.

---

## 7. App Store (`src/store/useAppStore.tsx`)

A single React Context backed by `useState`. All mutations follow the same pattern:

```typescript
setData((prev) => {
  const next = { ...prev, /* immutable update */ };
  saveData(next);   // write-through to localStorage
  return next;
});
```

Write-through ensures persistence is always in sync with in-memory state — there is no explicit "save" step. Because the entire `AppData` tree is stored in one `localStorage` key, every mutation rewrites the full serialised object.

### Mutation surface

| Category | Methods |
|---|---|
| People | `addPerson`, `updatePerson`, `deletePerson` |
| Delivery Units | `addDeliveryUnit`, `updateDeliveryUnit`, `deleteDeliveryUnit` |
| Release Trains | `addReleaseTrain`, `updateReleaseTrain`, `deleteReleaseTrain` |
| Squads | `addSquad`, `updateSquad`, `deleteSquad` |
| Assignments | `addAssignmentTo{DU\|RT\|Squad}`, `removeAssignmentFrom{DU\|RT\|Squad}`, `updateSquadAssignment` |
| Onboarding | `updateSquadOnboarding`, `updateDeliveryUnitOnboarding` |
| Role config | `addRole`, `removeRole` |
| Utility | `getPersonById`, `getDeliveryUnitById`, `getReleaseTrainById`, `getSquadById` |

**Cascading delete**: `deletePerson` walks the entire DU → RT → Squad tree and removes every assignment referencing that person, maintaining referential integrity client-side.

---

## 8. Persistence (`src/utils/storage.ts`)

| Key | Storage | Content |
|---|---|---|
| `org_manager_data` | `localStorage` | Serialised `AppData` JSON |
| `org_manager_users` | `localStorage` | Serialised `AppUser[]` JSON |
| `org_manager_session` | `sessionStorage` | Serialised `Session` JSON |

`localStorage` survives browser restarts; `sessionStorage` is cleared when the tab closes.

### First-run seeding

`loadData()` checks for the `org_manager_data` key. If absent (or JSON-corrupt), it calls `generateSeedData()` from `src/utils/seed.ts` and writes it immediately. The sample dataset includes 18 people and 2 fully-configured Delivery Units so the app is navigable on first load without any setup.

### Schema migration

`loadData()` applies forward-only migrations after parsing:

1. **`roleConfig` missing** → backfill with default role lists.
2. **`deliveryUnit.type` missing** → infer from name (`'platform'` → Platform, `'customer'` → Customer Journey, else Supporting).

Migrations are additive and non-destructive — no version numbers are needed at the current scale.

---

## 9. Cost Calculations (`src/utils/cost.ts`)

All cost functions are pure — they take data as arguments and return numbers with no side effects.

```
dailyCost(assignment) = person.dayRate × (allocationPercentage / 100)

squadDailyCost    = Σ dailyCost(assignment)            for squad assignments
rtDailyCost       = rtAssignments cost + Σ squadDailyCost
duDailyCost       = duAssignments cost + Σ rtDailyCost
monthlyCost       = dailyCost × 22 working days
```

`personTotalAllocationPercent(data, personId)` sums allocation across every squad assignment for a person — spanning all DUs and RTs. This drives over-allocation detection.

`personAllocationBreakdown(data, personId)` returns the same data as a structured list (`{ duName, rtName, sqName, allocation }[]`) for use in hover tooltips.

### Financial rollups (`src/utils/financials.ts`)

Monthly funded-deliverable calculations are implemented as pure utilities:

- Squads provide Actual and Forecast percentage splits that must each total 100%.
- Squad assignment costs are distributed by those percentages.
- DU and RT assignment/open-position costs are auto-distributed using the aggregated weighted squad mix.
- Outputs include per-deliverable Actual/Forecast totals and variance versus funded amount.

---

## 10. Routing

All routes are defined in `src/App.tsx`. The URL structure mirrors the entity hierarchy:

| Route | Page |
|---|---|
| `/login` | `LoginPage` |
| `/dashboard` | `DashboardPage` |
| `/delivery-units/:id` | `DeliveryUnitPage` |
| `/delivery-units/:duId/financials` | `DeliveryUnitFinancialsPage` |
| `/delivery-units/:duId/onboarding` | `DeliveryUnitOnboardingPage` |
| `/release-trains/:duId/:rtId` | `ReleaseTrainPage` |
| `/squads/:duId/:rtId/:sqId` | `SquadPage` |
| `/squads/:duId/:rtId/:sqId/onboarding` | `SquadOnboardingPage` |
| `/people` | `PeoplePage` |
| `/settings` | `SettingsPage` |
| `*` | Redirect → `/dashboard` |

Nested entity routes carry parent IDs as URL parameters (e.g. `:duId/:rtId/:sqId`) so any page can look up its full context without relying on navigation state or a global selection.

---

## 11. UI Shell (`src/components/layout/`)

```
Layout
├── Sidebar      ← nav links: Dashboard, People, Settings; logout button
└── Header       ← page title + breadcrumb trail (clickable <Link> segments)
    └── <main>   ← page content
```

`Layout` is the only component that enforces authentication (`if (!session) return <Navigate to="/login" />`). All nine authenticated pages use it.

---

## 12. Component Library (`src/components/ui/`)

Small, focused primitives with no external UI library dependency:

| Component | Purpose |
|---|---|
| `Button` | Primary / ghost variants, size consistent |
| `Card` | Bordered container with optional padding override |
| `Input` / `TextArea` | Controlled form fields with consistent focus ring |
| `Badge` | Coloured label (blue, amber, red, gray, indigo variants) |
| `Modal` | Overlay dialog with `ConfirmDialog` variant for destructive confirmations |

---

## 13. Data Flow Summary

```
User interaction
       │
       ▼
Page component
  reads:  useAppStore().data  (or useAuth().session / isAdmin)
  calls:  useAppStore().addXxx / updateXxx / deleteXxx
       │
       ▼
AppStoreProvider.setData(prev => next)
       │
       ├─► saveData(next)  →  localStorage  (write-through)
       │
       └─► React re-renders all subscribed components
```

Because the entire `AppData` object is one React state value, any mutation triggers a re-render of all components that consume `useAppStore`. At the current data sizes this is negligible; if the dataset grew, selectors or `useMemo` could be introduced to scope re-renders.

---

## 14. Security Considerations

- Passwords are hashed with SHA-256 before storage. Plain-text passwords never touch `localStorage`.
- `sessionStorage` bounds the authenticated session to a single browser tab.
- All data is stored client-side only — there is no network transmission.
- `isAdmin` is derived from the session role; the role value originates from the persisted user record, not from a URL parameter or user-controllable input.
- Input used in React JSX is escaped automatically by React's rendering — no `dangerouslySetInnerHTML` is used anywhere.

**Limitations** (acceptable for a local tool): SHA-256 without a salt/pepper is technically weaker than bcrypt for credential storage; session data in `sessionStorage` is readable by any script on the same origin. For production deployment behind a real auth layer these would need addressing.

---

## 15. File Structure

```
src/
├── App.tsx                   Route definitions, provider wiring
├── main.tsx                  React entry point
├── index.css                 Tailwind v4 theme configuration
│
├── types/
│   └── index.ts              All TypeScript interfaces and enums
│
├── store/
│   └── useAppStore.tsx       AppData context, all CRUD mutations
│
├── hooks/
│   └── useAuth.tsx           Auth context, session, login/logout
│
├── utils/
│   ├── cost.ts               Cost and allocation calculations (pure)
│   ├── crypto.ts             SHA-256 helper via Web Crypto API
│   ├── seed.ts               Sample dataset generator
│   └── storage.ts            localStorage/sessionStorage read/write + migrations
│
├── pages/
│   ├── LoginPage.tsx
│   ├── DashboardPage.tsx
│   ├── DeliveryUnitPage.tsx
│   ├── DeliveryUnitOnboardingPage.tsx
│   ├── ReleaseTrainPage.tsx
│   ├── SquadPage.tsx
│   ├── SquadOnboardingPage.tsx
│   ├── PeoplePage.tsx
│   └── SettingsPage.tsx
│
└── components/
    ├── layout/
    │   ├── Layout.tsx        Auth guard, sidebar + header shell
    │   ├── Sidebar.tsx       Navigation links
    │   └── Header.tsx        Title, breadcrumbs
    └── ui/
        ├── Badge.tsx
        ├── Button.tsx
        ├── Card.tsx
        ├── Input.tsx
        └── Modal.tsx
```
