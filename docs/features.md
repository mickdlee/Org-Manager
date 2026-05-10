# Org Manager — Feature Documentation

## Overview

Org Manager is a single-page application for managing an enterprise's organisational structure across three hierarchical layers: **Delivery Units → Release Trains → Squads**. It tracks people, roles, costs, allocation, and onboarding across the organisation.

---

## Authentication

- **First-run setup**: When no users exist the app prompts for an admin account (username + password, minimum 8 characters).
- **Login**: Credential-based login stored in `localStorage`. Sessions persist across page refreshes.
- **Roles**: Two roles — `admin` and `viewer`. Admins can create, edit, and delete all data. Viewers have read-only access.
- **User management**: Admins can create additional users from the Settings page.

---

## Organisational Hierarchy

### Delivery Units

The top-level organisational grouping.

- **Type** — each Delivery Unit is classified as one of:
  - `Customer Journey` — outward-facing product streams
  - `Platform` — internal platform and infrastructure units
  - `Supporting` — enabling and shared-service units
- **Description** — optional free-text description.
- **Assignments** — people can be assigned to a Delivery Unit directly with a designated role (e.g. Delivery Unit Owner, Chief Product Owner, Delivery Lead).
- **Cost tally** — the card displays total daily and monthly cost aggregated across all levels beneath it.
- **Navigation** — clicking a Delivery Unit card opens its detail page.

### Release Trains

Contained within a Delivery Unit. Groups multiple squads that deliver together on a cadence.

- **Assignments** — people can be assigned at the Release Train level with roles such as Release Train Engineer or Product Owner.
- **Cost summary** — a banner shows the combined daily and monthly cost of the Release Train's own assignments plus all squads beneath it.
- **Navigation** — clicking a Release Train card from the Delivery Unit page opens its detail page, listing all squads.

### Squads

Contained within a Release Train. The primary working unit.

- **Member cards** — each assigned person is shown as a card with:
  - Profile photo (or initials avatar with a consistent colour derived from person ID)
  - Name, email, day rate
  - Role badge
  - Allocation slider (admin only, 0–100% in steps of 5)
  - Hover tooltip on the allocation percentage showing all squads the person belongs to with their respective allocations
  - Over-allocation warning (red card border and text) when total squad allocation across all squads exceeds 100%
- **Cost tally** — shown next to the Members heading, displaying daily and monthly figures.
- **Admin controls** — edit squad name/description via modal; remove members.

---

## People

A global directory of all individuals in the organisation.

| Column | Description |
|---|---|
| Name | Full name |
| Email | Contact email |
| Photo | 48 px avatar; falls back to initials if no URL is set |
| Day Rate | Daily cost in USD |
| Total Team Allocation | Sum of this person's allocation across all squads |

- **Search** — filter by name or email in real time.
- **Over-allocation highlighting** — rows where total squad allocation exceeds 100% are highlighted red.
- **Allocation hover tooltip** — hovering the allocation percentage reveals a breakdown of every squad the person is assigned to, showing Squad → Release Train → Delivery Unit and the allocation percentage for each.
- **Add / Edit / Delete** — admin-only. Form fields: Name, Email, Photo URL, Day Rate.

---

## Cost Tracking

Cost is calculated from each person's **day rate** and **allocation percentage** at the squad level.

- `Daily cost = dayRate × (allocationPercentage / 100)`
- `Monthly cost = dailyCost × 22 working days`
- Costs roll up: Squad → Release Train → Delivery Unit → Dashboard totals.
- Allocation is set **per squad assignment only** — DU and RT assignments are excluded from allocation totals by design.

## Financials (Monthly Funded Deliverables)

Delivery Units now support a dedicated **Financials** tab for monthly funded-deliverable planning and tracking.

- **Funded deliverables (DU level)** — each DU can define deliverables with:
  - Code
  - Name
  - Owner
  - Status (`Planned`, `In Progress`, `At Risk`, `Complete`)
  - Start date / End date
  - Funding amount (monthly budget target)
- **Month picker** — financial allocations and rollups are stored per month (`YYYY-MM`), preserving history.
- **Squad allocation input** — for each squad and month, admins enter:
  - Actual allocation percentages across funded deliverables
  - Forecast allocation percentages across funded deliverables
  - Both Actual and Forecast totals must each equal **100%** per squad.
- **Actuals calculation**:
  - Squad assignment costs are split across deliverables by the squad's Actual percentages.
  - DU and RT assignment costs are auto-distributed using the DU's aggregated squad Actual mix for the selected month.
- **Forecast calculation**:
  - Uses squad Forecast percentages.
  - Includes forecast costs from open positions with configured day rates (DU, RT, and Squad onboarding open positions).
  - DU and RT assignment/open-position forecast costs are auto-distributed by aggregated squad Forecast mix.
- **Rollup outputs** (per deliverable and total):
  - Actual monthly cost
  - Forecast monthly cost
  - Variance against funded amount (Actual and Forecast)

Open positions now support optional **Day Rate** input for forecast modeling.

---

## Allocation Management

- Allocation is tracked strictly at the **squad assignment** level.
- Each new squad member defaults to **100% allocation**.
- Admins adjust allocation via a slider on the squad member card.
- **Over-allocation** (total across all squads > 100%) is surfaced in:
  - Red card styling on the Squad page
  - Red row highlighting on the People page
  - A warning message on the member card
  - Red-coloured allocation figures in hover tooltips

---

## Onboarding

### Squad Onboarding

A three-stage hiring pipeline per squad:

| Stage | Meaning |
|---|---|
| Recruitment | Candidates currently in screening |
| Pre-boarding | Offers accepted, not yet started |
| Ramp-up | Members in training / ramping up |

Additional fields per squad:
- **Sprint name** — current sprint identifier
- **Hiring priority** — High / Medium / Low
- **Pending offboarding count** — people leaving
- **Average ramp-up days** — expected time to full productivity
- **Open positions** — unfilled roles with title, seniority, and hiring priority
- **Sprint tasks** — lightweight task list with To Do / In Progress / Done statuses

Candidates can be added, moved between stages, and removed. Open positions and sprint tasks support full CRUD (admin only).

### Delivery Unit Onboarding

An aggregate onboarding dashboard for the entire Delivery Unit:

- **Overall health status** — Healthy / Attention / Critical (colour-coded)
- **Summary stats** — total new hires, total open roles, pending offboarding
- **Squad pipeline totals** — candidates and open positions rolled up from all squads beneath the DU
- **Release Train table** — lists each RT with its squad count and a link to drill in
- **Squad grid** — quick-access cards to each squad's onboarding page

---

## Settings (Admin Only)

| Section | Description |
|---|---|
| Sample Data | Resets all data to a pre-built dataset of 2 Delivery Units, Release Trains, Squads, and 18 people |
| Manage Role Types | Add or remove roles at the Delivery Unit, Release Train, and Squad layers. Changes take effect immediately for new assignments; existing assignments are unaffected |
| Create User | Add additional user accounts with username, password, and role (admin or viewer) |

---

## Organisational Map Export

Export organizational hierarchies as SVG files for external use, sharing, or archival.

- **Delivery Unit export** — includes the entire hierarchy: all Release Trains and Squads beneath the DU, with role information for each person assigned.
- **Release Train export** — shows the RT and all Squads it contains, with member assignments and roles.
- **Squad export** — displays the Squad card with all assigned members, their roles, and names.
- **SVG format** — output is a standard vector graphic, suitable for viewing in any SVG viewer, embedding in documents, or further editing in design tools.
- **File naming** — exported files are named `{EntityName}-orgmap.svg` for easy identification.
- **Diagram features**:
  - Color-coded node types: DU (blue), RT (purple), Squad (pink), Person (amber)
  - Hierarchical layout with connecting lines showing organizational relationships
  - Rounded rectangles with responsive sizing
  - Subtitles for DU types and person roles

The export button is located in the top-right of the Delivery Unit, Release Train, and Squad detail pages.

---

## Navigation & Layout

- **Sidebar** — links to Dashboard, People, and Settings.
- **Breadcrumbs** — context-aware trail in the header (e.g. Dashboard → Delivery Unit → Release Train → Squad). All segments are clickable links.
- **Tab strips** — Delivery Unit and Squad pages have Overview / Onboarding tabs.

---

## Data Persistence

All data is stored in the browser's `localStorage` under the key `org_manager_data`. Users and sessions use separate keys (`org_manager_users`, `org_manager_session`). A migration layer ensures older stored data is upgraded automatically when the schema evolves.
