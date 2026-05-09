---
mode: ask
model: GPT-5.4
applyTo: "**"
description: "Recreate the Org Manager application from specification without access to the original codebase"
---

# Recreate Org Manager

Build a complete web application named "Org Manager" from this specification only. Do not assume access to any existing repository. Create all required source files, configuration, components, pages, utilities, seed data, and local persistence logic.

## Objective

Create a single-page React application for managing an enterprise delivery organization across three layers:

- Delivery Units
- Release Trains
- Squads

The app must support org structure management, role assignments, people management, staffing placeholders, onboarding pipelines, financial visibility toggles, offboarding tracking, squad templates, and Delivery Unit OKRs.

## Technical Stack

Use exactly this stack unless a dependency is required to fulfill the spec:

- React 19
- TypeScript
- Vite
- React Router DOM
- Tailwind CSS
- lucide-react
- Browser localStorage for persistence

## Core App Structure

Create these top-level routes:

- /login
- /dashboard
- /delivery-units/:id
- /delivery-units/:duId/onboarding
- /release-trains/:duId/:rtId
- /squads/:duId/:rtId/:sqId
- /squads/:duId/:rtId/:sqId/onboarding
- /people
- /settings
- any unknown route redirects to /dashboard

Wrap the app with:

- AuthProvider
- AppStoreProvider
- BrowserRouter

## Authentication

Use localStorage-backed auth.

Storage keys:

- org_manager_users
- org_manager_session
- org_manager_data

Requirements:

- On first run, if there are no users, the login screen must allow creating an initial admin account.
- Passwords must be stored as SHA-256 hashes, not plaintext.
- Login is username + password.
- Session persists across refreshes.
- Two roles only: admin and viewer.
- Viewer is read-only.
- Admin can create additional users from Settings.

## Domain Model

Implement these types.

### Shared

- AnyRole = string
- UserRole = admin | viewer
- DeliveryUnitType = Customer Journey | Platform | Supporting
- OnboardingStage = Recruitment | Pre-boarding | Ramp-up
- HiringPriority = Low | Medium | High

### Person

Fields:

- id
- name
- email
- photoUrl optional
- dayRate optional

### Assignment

Fields:

- personId
- role
- allocationPercentage optional
- isScheduledOffboarding optional boolean
- offboardingDate optional string

Important rule:

- allocationPercentage is only meaningful for squad assignments when calculating allocation totals and costs.
- DU and RT assignments may still carry the field structurally, but cost/allocation logic must ignore them for team allocation summaries.

### OpenPosition

Fields:

- id
- title
- priority
- allocationPercentage optional

### OnboardingCandidate

Fields:

- id
- name
- stage
- onboardingDate optional

### SquadOnboarding

Fields:

- hiringPriority optional
- pendingOffboarding optional
- avgRampUpDays optional
- candidates array
- openPositions array

### DeliveryUnitOnboarding

Fields:

- overallHealthStatus optional: Healthy | Attention | Critical
- totalNewHires optional
- totalOpenRoles optional
- totalPendingOffboarding optional

### OKRs

KeyResultYearlyTarget:

- year
- target

DeliveryUnitKeyResult:

- id
- title
- baseline optional
- notes optional
- yearlyTargets array of 3 yearly targets

DeliveryUnitOKR:

- id
- objective
- keyResults array
- progress optional
- targetDate optional

### Squad

Fields:

- id
- name
- description
- assignments array
- onboarding optional

### ReleaseTrain

Fields:

- id
- name
- description
- assignments array
- squads array
- openPositions optional

### DeliveryUnit

Fields:

- id
- name
- type
- description
- assignments array
- releaseTrains array
- onboarding optional
- okrs optional
- openPositions optional

### RoleConfig

Arrays for:

- deliveryUnit
- releaseTrain
- squad

### SquadTemplate

Fields:

- id
- name
- roles array of objects with role and count

### UISettings

Fields:

- showFinancials boolean

### AppData

Fields:

- deliveryUnits
- people
- roleConfig
- squadTemplates
- uiSettings

## Default Roles

Delivery Unit roles:

- Delivery Unit Owner
- Chief Product Owner
- Delivery Lead

Release Train roles:

- Release Train Engineer
- Product Owner

Squad roles:

- Product Owner
- Scrum Master
- Developer
- Business Analyst
- Quality Assurance
- Change Manager
- Subject Matter Expert
- Designer
- Architect

## Persistence and Migration

Create a storage layer that:

- loads app data from localStorage
- seeds sample data if none exists
- saves app data after every store mutation
- upgrades older stored data when schema changes

Migration requirements:

- ensure roleConfig exists and contains the default roles
- ensure Delivery Unit type exists, inferring it from DU name if missing
- normalize assignment offboarding flags
- ensure DU and RT openPositions arrays exist
- ensure uiSettings exists with showFinancials boolean
- ensure squadTemplates exists
- convert any legacy OKR key results stored as strings into structured DeliveryUnitKeyResult objects with baseline, notes, and 3 yearly targets

## App State Layer

Implement a central AppStore context with immutable updates and CRUD operations for:

- people
- delivery units
- release trains
- squads
- assignments at DU, RT, and squad level
- squad onboarding
- delivery unit onboarding
- DU open positions
- RT open positions
- delivery unit OKRs
- role config
- squad templates
- reset to sample data
- reset to large sample data
- financial visibility toggle

Also include lookup helpers:

- getPersonById
- getDeliveryUnitById
- getReleaseTrainById
- getSquadById

## Cost and Allocation Rules

Implement these rules exactly.

### Allocation

- Allocation is tracked only on squad assignments.
- Default new squad assignment allocation is 100%.
- Allocation is adjustable by admin with a slider from 0 to 100 in steps of 5.
- A person is over-allocated if total squad allocation across all squads exceeds 100%.

### Cost

- Daily cost = dayRate * allocationPercentage / 100 at squad level.
- Monthly cost = daily cost * 22 working days.
- Costs roll up from squad to release train to delivery unit.
- Dashboard cards show rolled-up totals.
- Financial information must be hidden globally when showFinancials is false.

### Allocation Breakdown

When hovering over a person’s total allocation or squad allocation indicator, show a tooltip-like breakdown of all squads they belong to with:

- squad name
- release train name
- delivery unit name
- allocation percentage

Highlight allocation figures red when the person is over-allocated.

## Layout and Navigation

Create a shared layout with:

- left sidebar navigation to Dashboard, People, Settings
- top header title and breadcrumbs
- content container spacing consistent across pages

Breadcrumb behavior:

- delivery unit page: Dashboard > DU
- release train page: Dashboard > DU > RT
- squad page: Dashboard > DU > RT > Squad
- squad onboarding page: Dashboard > DU > RT > Squad > Onboarding

Tab strips:

- Delivery Unit page has Overview and Onboarding tabs
- Squad page has Members and Onboarding tabs

## Page Requirements

### Login Page

Requirements:

- if no users exist, show first-run admin creation form
- otherwise show login form
- minimum password length 8
- on successful login, navigate to dashboard

### Dashboard Page

Display Delivery Unit cards with:

- DU name
- DU type badge
- description preview
- release train count
- direct DU member count
- squads count
- all members count across DU + RT + squad assignments
- open roles count rolled up from squad open positions
- pipeline count rolled up from squad candidates
- health badge from DU onboarding
- financial rollup if financials are enabled
- admin edit/delete controls
- button to open DU details

Admin can:

- create DU
- edit DU name, type, description
- delete DU and all descendants

### Delivery Unit Page

Requirements:

- overview/onboarding tab strip
- DU description
- cost summary banner if enabled
- OKRs section above members
- member management section using a reusable member list component
- DU-level open positions section with CRUD for placeholders
- release train cards with summary metrics

Delivery Unit OKRs:

- admin can create, edit, delete OKRs
- display as a table, not cards
- columns:
  - Objective
  - Key Result
  - Baseline
  - Year 1 target
  - Year 2 target
  - Year 3 target
  - Notes
  - Progress
  - Target Date
  - Actions for admin
- each OKR can have multiple key results
- editing form must support adding/removing key results and editing yearly targets

Release Train cards on DU page must show:

- release train name and description preview
- squad members count
- total members count
- open roles count rolled up from squad onboarding open positions
- pipeline count rolled up from squad candidates
- a small tag reading Delivery Readiness Snapshot
- financial rollup if enabled
- button to open RT page
- admin edit/delete controls

### Delivery Unit Onboarding Page

Build an aggregate onboarding dashboard for a DU with:

- overall health status
- total new hires
- total open roles
- total pending offboarding
- rollups from all squads beneath the DU
- list/table of release trains with drill-down links
- quick access squad cards to each squad onboarding page

### Release Train Page

Requirements:

- description
- cost summary banner if enabled
- reusable member list for RT assignments
- RT-level open positions section with CRUD for placeholders
- squad cards grid

Each squad card shows:

- squad name and description preview
- members count
- empty roles count from squad onboarding open positions
- pipeline count from candidate count
- pending offboarding count from scheduled offboarding flags on squad assignments
- hiring priority
- average ramp-up days
- expandable members section listing each assigned person with name, role, allocation
- financial rollup if enabled
- button to open squad page
- admin edit/delete controls

### Squad Page

This is the main staffing page.

Requirements:

- members tab selected by default
- description
- members panel using card layout
- editable squad name/description for admin
- ability to apply a squad template
- placeholder-first staffing workflow

Squad member cards must display:

- avatar photo or deterministic initials avatar
- name
- email
- day rate if financials are enabled
- role badge
- allocation percentage
- allocation slider for admin
- allocation breakdown on hover
- over-allocation warning styling if total > 100
- scheduled offboarding badge if flagged
- offboarding date picker for admin when scheduled offboarding is enabled
- unallocate action
- remove action

Also display squad open position placeholder cards with:

- question-mark avatar
- title
- priority
- allocation percentage
- assign person to this role action
- remove placeholder action

Assigning a real person into a placeholder should remove the placeholder and create a squad assignment.

### Squad Onboarding Page

Build a three-column stage pipeline:

- Recruitment
- Pre-boarding
- Ramp-up

Requirements:

- stage counts
- add candidate
- change candidate stage
- remove candidate
- sidebar with unit context and squad meta
- open positions list with CRUD
- stats row showing members, pending offboarding, avg ramp-up, open positions

Stage transition behavior:

- when moving Recruitment to any later stage, prompt for onboarding date
- when moving Pre-boarding to Ramp-up, prompt to create a real Person and assign them into an open squad role placeholder
- after assigning the person into the placeholder, remove the candidate and remove the placeholder

### People Page

Display a searchable table with:

- Name
- Email
- Photo
- Day Rate when enabled
- Total Team Allocation
- actions for admin

Requirements:

- real-time search by name or email
- red row highlighting when total allocation > 100
- hover breakdown for total allocation
- admin add/edit/delete person
- validation for email and photo URL

### Settings Page

Admin-only page with these sections:

- Sample Data
- Financial Visibility
- Squad Templates
- Manage Role Types
- Create User

Sample Data section:

- reset to small sample data set
- load large sample data set with 20 delivery units
- both actions confirm before replacing existing data

Financial Visibility section:

- checkbox toggle for showing or hiding all financial data in the app

Squad Templates section:

- create/edit/delete templates
- each template has a name and role counts
- applying a template to a squad should create that many open role placeholders in the squad onboarding openPositions array

Manage Role Types section:

- add/remove roles at delivery unit, release train, and squad layers
- removing a role does not mutate existing assignments

Create User section:

- username
- password
- role selector

## Reusable Components

Create at least these reusable components:

- Layout
- Card
- Button
- Input
- TextArea
- Select
- Modal
- ConfirmDialog
- Badge
- MemberList

MemberList component requirements:

- used by Delivery Unit and Release Train pages
- supports admin add/remove/update operations
- supports showing role badge, photo, email, day rate, offboarding status, date picker
- supports add-member modal with optional offboarding flag and offboarding date

## Shared Utilities

Create utilities for:

- cost calculations and allocation breakdowns
- SHA-256 hashing
- localStorage read/write/migrations
- sample data generation
- large data generation

### Sample Data

Create a small curated seed with:

- 2 delivery units
- banking-themed names
- multiple release trains and squads
- 18 people
- realistic day rates
- OKRs on delivery units
- some squad onboarding activity
- some DU and RT open position placeholders

### Large Sample Data

Generate:

- 20 delivery units
- each DU has 1 to 5 release trains
- each RT has 5 to 8 squads
- 300 people plus extras if needed
- allocation distribution biased toward 100%, then 50%, then 20%
- onboarding activity around 8%
- some DU open positions
- some RT open positions
- squad onboarding open positions and candidates

Important constraint:

- avoid creating invalid squad allocations where one person is assigned beyond available capacity during generation unless explicitly intended for a minority of over-allocation scenarios

## UI Behavior and Styling

Use a clean enterprise dashboard aesthetic.

Guidance:

- white cards on light neutral background
- blue/indigo accents for structure and navigation
- amber for open roles or staffing gaps
- red only for warnings and over-allocation states
- rounded cards and modest shadows
- concise text hierarchy and dense but readable layouts
- responsive layout for laptop-sized screens first

Do not build a gimmicky marketing site. This is an internal enterprise operations tool.

## Admin vs Viewer Permissions

Viewer:

- can view all pages and data
- cannot create, edit, delete, assign, unassign, or toggle settings

Admin:

- full CRUD everywhere
- can manage assignments, onboarding, placeholders, OKRs, settings, users

## Acceptance Criteria

The finished app is correct only if all of the following are true:

- first-run admin creation works
- login/logout and persistent session work
- CRUD works for people, DUs, RTs, squads, users, templates, OKRs, and placeholders
- cost rollups are correct and can be hidden globally
- allocation is only computed from squad assignments
- over-allocation is visible in squad and people views
- hover breakdowns show all squad allocations for a person
- squad onboarding stage transitions trigger the required prompts
- pre-boarding to ramp-up can create a real person and fill an open squad role
- DU and RT pages support their own placeholder open positions
- squad templates generate open squad placeholders
- sample data and large seed data load successfully
- stored data from older schemas is migrated safely
- unknown routes redirect to dashboard

## Build Order

Use this implementation order:

1. Project scaffold and dependencies
2. Types and utilities
3. Storage and auth
4. App store context
5. Shared UI components
6. Layout and routing
7. Dashboard and core CRUD pages
8. Squad staffing and allocation logic
9. Onboarding flows and prompts
10. Settings, templates, financial toggle, and users
11. Seed data and migrations
12. Final polish and validation

## Output Instructions

Generate the full application codebase, not a partial prototype.

While generating:

- prefer small reusable components
- keep state updates immutable
- use strong TypeScript typing throughout
- keep the folder structure clear and conventional
- include comments only where behavior is non-obvious
- do not omit any route, feature, or persistence rule from this spec

If a design decision is ambiguous, choose the option that best supports enterprise staffing operations and consistency with the rest of this prompt.
