# ASH AI - Updated Plan from Client

# 🏷️ Project Identity

**Project Name:** **ASH AI**
**Meaning (Acronym):** **A**pparel **S**mart **H**ub – **A**rtificial **I**ntelligence

**Repo & service naming (use consistently):**

* Monorepo: `ash-ai`
* Services:

  * `ash-core` (orders, routing, inventory, HR/finance glue)
  * `ash-ai` (Ashley: monitor, forecast, advise)
  * `ash-admin` (backoffice UI)
  * `ash-staff` (mobile/PWA for workers)
  * `ash-portal` (client portal)
  * `ash-api` (BFF/API gateway)
* Env var prefix: `ASH_` (e.g., `ASH_DB_URL`, `ASH_JWT_SECRET`)
* Event prefix (for the bus): `ash.` (e.g., `ash.po.created`)

---

# 🎯 Overview (Developer Lens)

**Goal:** ASH AI is an AI-powered ERP for apparel manufacturing with end-to-end coverage:

* **Orders & Production** (Silkscreen, Sublimation, DTF, Embroidery; routing templates + customization)
* **Warehouse & Inventory** (QR batches, wastage)
* **Finance & Payroll** (auto-compute, invoicing, PH compliance)
* **HR** (attendance, performance, training recs)
* **Maintenance** (machines & vehicles, reminders)
* **Client Portal** (tracking, approvals, payments, reorders)
* **Merchandising AI** (reprints, theme suggestions)
* **Automation Engine** (reminders for bills/deadlines/follow-ups)

**Non-functional requirements (NFRs):**

* **Security:** RBAC + 2FA for sensitive roles, RLS by `workspace_id`/`brand_id`, field-level encryption for PII & payroll
* **Auditability:** immutable `audit_logs`, idempotent writes
* **Reliability:** daily DB backups + point-in-time recovery; job retries on queues
* **Performance:** p95 < 300ms for reads; heavy analytics async; indexes + caching
* **Internationalization:** PH default (Asia/Manila), but multi-locale ready
* **Offline-first staff PWA:** queue & sync with conflict resolution

**Key principle:** *Every stage logs structured data, moves status forward, and exposes signals for Ashley to monitor, forecast, and suggest actions.*

---

# 🔹 Stage 1 – Client & Order Intake (Full Developer Spec)

## 1) Actors & Permissions

* **CSR/Admin** (create/edit PO; send for approval)
* **Manager** (can change routing template, due dates; approve exceptions)
* **Client (Portal)** (view intake summary once PO is “Approved/Confirmed”)
* **Ashley** (read-only over inputs; computes checks & prompts)

RBAC scopes used here:

* `orders.create`, `orders.edit`, `orders.view`
* `routing.apply_template`, `routing.customize`
* `clients.create`, `clients.edit`, `clients.view`

Delegations (optional): Admin can grant `orders.edit_critical`/`routing.customize` temporarily to a Manager.

---

## 2) UI/UX — New Production Order (CSR/Admin)

**Form sections & fields (with rules):**

### A. Client & Brand

* **Client** (picker; or **New Client** modal: name, company, emails\[], phones\[], billing address)
* **Brand** (Reefer/Sorbetes/…; required; drives defaults & pricing rules)
* **Channel** (Direct, CSR, Shopee, TikTok, Lazada; optional for attribution)

### B. Product & Design

* **Product Type** (Tee/Hoodie/Jersey/Uniform/Custom)
* **Design** (attach or link to `design_assets`; if absent, create placeholder)
* **Method** (Silkscreen / Sublimation / DTF / Embroidery) → **drives default route**

### C. Quantities & Size Curve

* **Total Qty** (int > 0)
* **Size Curve** (JSON map; must sum to Total Qty; validation)

  * Example: `{ "S": 50, "M": 120, "L": 200, "XL": 80 }`

### D. Variants & Add-ons (optional)

* Colorways (e.g., Black/White split)
* Add-ons (puff print, anti-migration, premium thread, special packaging)

### E. Dates & SLAs

* **Target Delivery Date** (required)
* *Optional*: Target stage dates (auto-derived; can be edited by Manager)

### F. Commercials

* **Unit Price** (by variant optional)
* **Deposit %** and **Payment Terms** (e.g., 50/50, net 15)
* **Tax** flags (VAT inclusive/exclusive)
* **Currency** (default PHP)

### G. Production Route

* **Default Route** (auto-selected by Method & Brand defaults)

  * Silkscreen options:

    * (●) **Cut → Print → Sew → QC → Pack** (Option A – default)
    * (○) **Cut → Sew → Print → QC → Pack** (Option B – guarded by Ashley)
  * Sublimation default: **GA → Print → Heat Press → Cut → Sew → QC → Pack**
  * DTF default: **Receive Plain Tee → DTF → QC → Pack**
  * Embroidery default: **Cut → Emb → Sew → QC → Pack**
* **\[Customize Path]** button → opens drag-and-drop editor for exceptions
* **Ashley advisory** (inline): hazards (e.g., “Large AOP requires printing before sewing.”)

### H. Files & Notes

* Upload references, client brief, special instructions (rich text)

### I. Submit

* Actions: **Save Draft**, **Create PO**, **Send Intake Summary to Client** (optional)

---

## 3) Data Model (Core Tables)

```sql
-- Clients
create table clients (
  id uuid primary key,
  workspace_id uuid not null,
  name text not null,
  company text,
  emails jsonb default '[]',
  phones jsonb default '[]',
  billing_address jsonb,
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Brands (per workspace)
create table brands (
  id uuid primary key,
  workspace_id uuid not null,
  name text not null,
  code text,          -- e.g., REEF
  settings jsonb,     -- defaults (pricing, routing, message templates)
  created_at timestamptz default now()
);

-- Orders (PO header)
create table orders (
  id uuid primary key,
  workspace_id uuid not null,
  brand_id uuid not null references brands(id),
  client_id uuid not null references clients(id),
  po_number text unique not null,           -- e.g., REEF-2025-000123
  channel text,                              -- Direct / Shopee / etc.
  product_type text not null,
  method text not null,                      -- SILKSCREEN/SUBLIMATION/DTF/EMB
  total_qty int not null check (total_qty > 0),
  size_curve jsonb not null,                 -- {"S":50,"M":120,...}
  variants jsonb,                            -- [{"color":"Black","qty":300}, ...]
  addons jsonb,
  target_delivery_date date not null,
  commercials jsonb,                         -- {unit_price, deposit_pct, terms, tax_mode, currency}
  status text not null default 'INTAKE',     -- state machine (below)
  created_by uuid not null,                  -- user id
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Order lines (optional if needed for variants)
create table order_lines (
  id uuid primary key,
  order_id uuid references orders(id),
  variant jsonb,
  qty int not null
);

-- Routing steps (per order)
create table routing_steps (
  id uuid primary key,
  order_id uuid not null references orders(id),
  name text not null,             -- "Cutting", "Printing"...
  workcenter text not null,       -- CUTTING/PRINTING/HEAT_PRESS/SEWING/EMB/QC/PACKING/DESIGN
  sequence int not null,
  depends_on uuid[] default '{}',
  join_type text,                 -- null | AND | OR
  standard_spec jsonb,            -- e.g., {"tempC":200,"seconds":60}
  expected_inputs jsonb,
  expected_outputs jsonb,
  can_run_parallel bool default false,
  planned_start timestamptz,
  planned_end timestamptz,
  status text default 'PLANNED',  -- PLANNED/READY/IN_PROGRESS/DONE/BLOCKED
  created_at timestamptz default now()
);

-- Attachments
create table order_attachments (
  id uuid primary key,
  order_id uuid references orders(id),
  type text,                      -- mockup/separation/digitized/brief
  file_url text not null,
  meta jsonb,
  created_at timestamptz default now()
);

-- Audit (append-only)
create table audit_logs (
  id uuid primary key,
  workspace_id uuid not null,
  actor_id uuid,
  entity_type text,               -- 'order','routing_step','client'
  entity_id uuid,
  action text,                    -- 'create','update','apply_template','customize_routing'
  before jsonb,
  after jsonb,
  created_at timestamptz default now()
);
```

**Indexes you must add:**

* `orders (workspace_id, brand_id, status, created_at)`
* `routing_steps (order_id, status, sequence)`
* `clients (workspace_id, name)` (trgm for fuzzy)
* `audit_logs (workspace_id, entity_type, entity_id, created_at)`

**PO number policy:**

* `PO = {BRANDCODE}-{YYYY}-{zero-pad seq}`; sequence is per brand per year (safe via DB transaction).

---

## 4) Order Status Machine

```
INTAKE → DESIGN_PENDING → DESIGN_APPROVAL → PRODUCTION_PLANNED
→ IN_PROGRESS → QC → PACKING → READY_FOR_DELIVERY → DELIVERED → CLOSED

Any stage can go to ON_HOLD or CANCELLED with reasons.
```

* Creating the PO sets `status=INTAKE`
* Uploading a design sets `DESIGN_PENDING`
* Client approval sets `DESIGN_APPROVAL`
* Applying routing & scheduling sets `PRODUCTION_PLANNED`

---

## 5) Routing Templates (snapshots at intake)

Templates are stored centrally and copied into `routing_steps` upon PO creation.

**Examples (JSON):**
Silkscreen **Option A** (default): Cut → Print → Sew → QC → Pack
Silkscreen **Option B**: Cut → Sew → Print → QC → Pack (Ashley guarded)
Sublimation (default): GA → Print → Heat Press → Cut → Sew → QC → Pack
DTF (default): Receive Plain Tee → DTF → QC → Pack
Embroidery (default): Cut → Emb → Sew → QC → Pack

---

## 6) API Contracts (BFF / `ash-api`)

### Create Client (optional)

```
POST /clients
Body:
{
  "name":"Clark Safari",
  "company":"Clark Safari & Adventure Park",
  "emails":["ops@clarksafari.ph"],
  "phones":["+63-9xx-xxx-xxxx"],
  "billing_address":{...}
}
→ 201 {id,...}
```

### Create PO

```
POST /orders
Headers: Idempotency-Key: <uuid>
Body:
{
  "brand_id":"<uuid>",
  "client_id":"<uuid>",
  "product_type":"Hoodie",
  "method":"SILKSCREEN",
  "total_qty":450,
  "size_curve":{"M":180,"L":180,"XL":90},
  "variants":[{"color":"Black","qty":350},{"color":"White","qty":100}],
  "addons":["anti_migration"],
  "target_delivery_date":"2025-09-25",
  "commercials":{"unit_price":499,"deposit_pct":50,"terms":"50/50","tax_mode":"VAT_INCLUSIVE","currency":"PHP"},
  "attachments":[{"type":"brief","file_url":"..."}],
  "route_template_key":"SILK_OPTION_A"   // or omit to auto-pick default
}
→ 201 {id, po_number, status:"INTAKE"}
Emits event: ash.po.created
```

### Apply/Change Routing Template

```
POST /orders/{order_id}/routing/apply-template
Body: { "route_template_key":"SILK_OPTION_B" }
→ 200 {steps:[...]}  // overwrites existing PLANNED steps (guard with confirmation)
Emits: ash.routing.applied
```

### Customize Routing (drag-and-drop editor persists)

```
POST /orders/{order_id}/routing/customize
Body: { "steps":[ { "id": ".../temp", "name":"Cutting", "depends_on":[], ... }, ... ] }
→ 200 {steps:[...]}
Emits: ash.routing.customized
```

### Show in Client Portal

```
POST /orders/{order_id}/share
Body: { "portal_visible": true }
→ 200
Emits: ash.po.shared
```

---

## 7) Ashley (AI) Validation at Intake

Triggered on:

* `POST /orders` (create)
* Routing template change/customization
* Edit of qty/dates/method

**Checks & logic (rules first; ML later):**

1. **Capacity vs Deadlines**

   * For each routing step, estimate standard time:

     * Use method/product defaults (e.g., `CUTTING: 0.6 min/pc`, `PRINTING: coats × area factor`, `SEWING: op_time per garment`).
   * Add buffers (setup, curing, QC sampling).
   * Compare required minutes per **workcenter** per day to **available capacity** (operators × shift mins × utilization).
   * **Warn** if any workcenter exceeds capacity for the target schedule; suggest:

     * Move dates, add shifts, subcontract, or split batches.

2. **Stock Availability (Soft Allocation)**

   * Compute BOM snapshot from size curve + variants + addons.
   * Check `inventory_batches` for available fabric/ink/film/thread under the brand (or shared pool).
   * If shortfall:

     * Create **draft PR** with suggested suppliers (price history & lead time).
     * Warn CSR/Manager.

3. **Method/Route Safety**

   * **Silkscreen Option B** (Sew → Print) only allowed for small placements.

     * If print area > threshold or crosses seam, flag **High Risk**.
   * **Sublimation** requires print/heat before cutting for AOP; warn if changed.
   * **DTF** requires blanks before press; enforce step ordering.

4. **Commercials Sanity**

   * Suggested unit price floor from standard cost + margin floor (brand setting).
   * Warn if margin < configured minimum.

**Output (to UI & logs):**

* Risk level (Green/Amber/Red)
* Blocking issues (e.g., “No fabric available; PR required”)
* Recommended actions (add shift, switch route, reorder qty split)
* Confidence & assumptions

---

## 8) Notifications & Events

**On PO create:**

* To CSR/Manager: “PO REEF-2025-000123 created; method Silkscreen; target 25 Sep.”
* To Warehouse (if soft allocation found shortages): “PR drafted for Fabric X.”
* To Client (optional): “We’ve received your order; track link: …”

**Event bus emissions:**

* `ash.po.created`
* `ash.routing.applied` / `ash.routing.customized`
* `ash.po.shared`
* `ash.ashley.intake_risk_assessed` (with risk, actions)

---

## 9) Edge Cases & Error Handling

* **Size curve mismatch:** Reject if sum ≠ total\_qty (422)
* **Duplicate client:** CSR gets prompt to link to existing (fuzzy match by name/email/phone)
* **Route conflicts:** Customization creating cycles or missing prerequisites (409 with hints)
* **Idempotency:** Replays on network glitches must not duplicate orders (Idempotency-Key header)
* **Draft mode:** Save partially filled form; validations run only on “Create PO”
* **Offline CSR (rare):** If CSR PWA offline, queue `orders.create` with a temp negative ID, reconcile on sync
* **Time zone:** All date inputs shown in Asia/Manila; backend stored UTC

---

## 10) Security & Audit

* Only CSR/Admin/Manager with `orders.create` can create; `routing.customize` limited to Manager/Admin or delegated
* All create/update actions write to `audit_logs` with `before/after`
* Client PII (emails/phones/address) stored encrypted at rest (column/field-level crypto)
* Portal links are signed URLs (short-lived); role-scoped access tokens

---

## 11) Acceptance Criteria (Dev can test against)

1. **Create PO** with valid payload → returns 201, PO has `status=INTAKE`, `po_number` generated
2. **Template applied**: `routing_steps` rows created in correct sequence with dependencies
3. **Ashley check** runs and surfaces at least one advisory when:

   * Capacity is insufficient
   * BOM stock is short
   * Route is unsafe (e.g., Silkscreen Option B with AOP)
4. **Client portal toggle** makes PO visible and emits `ash.po.shared`
5. **Audit logs** contain entries for create/apply-template/customize with diffs
6. **Size curve guard** rejects invalid sums
7. **Idempotency**: re-POST with same key does not create a second PO

---

## 12) Example Objects

**Order (truncated):**

```json
{
  "id":"7c3d...","po_number":"REEF-2025-000123","status":"INTAKE",
  "brand_id":"b1","client_id":"c1","product_type":"Hoodie","method":"SILKSCREEN",
  "total_qty":450,"size_curve":{"M":180,"L":180,"XL":90},
  "variants":[{"color":"Black","qty":350},{"color":"White","qty":100}],
  "target_delivery_date":"2025-09-25",
  "commercials":{"unit_price":499,"deposit_pct":50,"terms":"50/50","tax_mode":"VAT_INCLUSIVE","currency":"PHP"}
}
```

**Routing (Silkscreen Option A snapshot):**

```json
[
  {"name":"Cutting","workcenter":"CUTTING","sequence":10,"depends_on":[]},
  {"name":"Screen Prep","workcenter":"PRINTING","sequence":20,"depends_on":["<Cutting>"]},
  {"name":"Printing","workcenter":"PRINTING","sequence":30,"depends_on":["<Screen Prep>"]},
  {"name":"Sewing","workcenter":"SEWING","sequence":40,"depends_on":["<Printing>"]},
  {"name":"QC","workcenter":"QC","sequence":50,"depends_on":["<Sewing>"]},
  {"name":"Packing","workcenter":"PACKING","sequence":60,"depends_on":["<QC>"]}
]
```

**Ashley intake assessment (example):**

```json
{
  "risk":"AMBER",
  "issues":[
    {"type":"CAPACITY","workcenter":"PRINTING","details":"+18% over capacity in week of Sep 15"},
    {"type":"STOCK","item":"Black Fabric 240gsm","short_by":"28 kg","action":"PR_DRAFTED"}
  ],
  "advice":[
    "Split run: 300 pcs this week, 150 next",
    "Consider subcontracting printing for 2 days"
  ],
  "assumptions":{"printing_rate_pcs_per_hr":55,"utilization":0.8}
}
```

---

### That’s the level of detail your dev needs for Stage 1.
# 🔹 Stage 2 – Design & Approval (Developer Spec)

## 2.1 Actors & Permissions

* **Graphic Artist (GA):** upload/edit design files, metadata, placements.
* **CSR:** send for client approval, view status, communicate with client.
* **Client (Portal):** approve/reject, comment, e-sign (if contract).
* **Manager/Admin:** override, lock versions, set print method constraints.
* **Ashley (AI):** run printability checks, best-seller detection, merchandising recs.

**Scopes:** `design.upload`, `design.version`, `design.approval.send`, `design.approval.resolve`, `design.lock`, `design.view`

---

## 2.2 UX / Flow

### A) GA Upload Screen

* **Fields**

  * Design name (string)
  * PO link (order picker) – required
  * Brand (auto from PO)
  * Method (Silkscreen/Sublimation/DTF/Embroidery) – informs validations
  * Files:

    * **Mockup** (PNG/JPG)
    * **Production file** (AI/PDF/PNG with transparent bg; DST/EMB for embroidery)
    * **Separations** (per color, for silkscreen)
  * Placements (array):

    * Area: front/back/sleeve/left chest/all-over
    * Size (W×H in cm)
    * Position offsets (x,y in cm from anchor)
  * Colors/palette (hex or named)
  * Notes (text)
* **Actions**: Save Draft, Upload & Create Version, Send to CSR

### B) CSR Approval Screen

* Preview (mockup + placements overlay)
* Client selection + message template
* **Actions**: Send for Approval, Copy approval link

### C) Client Portal

* Preview mockup (zoom), variant toggles (if any)
* Buttons: **Approve**, **Request Changes** (comment required)
* Optional E-Sign (DocuSign/AdobeSign) for sample/production signoff

### D) Versioning & Locking

* Each upload = **new version** (v1, v2…)
* Only one **active** version can be “Approved”
* Lock version to prevent late edits once **PRODUCTION\_PLANNED**

---

## 2.3 Data Model (SQL)

```sql
-- master asset (logical design)
create table design_assets (
  id uuid primary key,
  workspace_id uuid not null,
  brand_id uuid not null,
  order_id uuid not null,
  name text not null,
  method text not null,                 -- SILKSCREEN/SUBLIMATION/DTF/EMBROIDERY
  status text not null default 'DRAFT', -- DRAFT/PENDING_APPROVAL/APPROVED/REJECTED/LOCKED
  current_version int not null default 1,
  is_best_seller bool default false,    -- set by Ashley
  tags text[],
  created_by uuid not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- immutable file versions
create table design_versions (
  id uuid primary key,
  asset_id uuid not null references design_assets(id),
  version int not null,
  files jsonb not null,                 -- {mockup_url, prod_url, separations:[...], dst_url}
  placements jsonb not null,            -- [{area, width_cm, height_cm, offset_x, offset_y}]
  palette jsonb,                        -- ["#000000","#19e5a5",...]
  meta jsonb,                           -- {dpi, color_profile, notes}
  created_by uuid not null,
  created_at timestamptz default now(),
  unique (asset_id, version)
);

-- client approval lifecycle
create table design_approvals (
  id uuid primary key,
  asset_id uuid not null references design_assets(id),
  version int not null,
  status text not null default 'SENT',  -- SENT/APPROVED/CHANGES_REQUESTED/EXPIRED
  client_id uuid not null,
  approver_name text,
  approver_email text,
  approver_signed_at timestamptz,
  comments text,
  esign_envelope_id text,
  created_at timestamptz default now()
);

-- Ashley’s printability analysis per version
create table design_checks (
  id uuid primary key,
  asset_id uuid not null references design_assets(id),
  version int not null,
  method text not null,
  result text not null,                 -- PASS/WARN/FAIL
  issues jsonb,                         -- [{code,message,placement_ref}]
  metrics jsonb,                        -- {min_dpi, expected_ink_g, stitch_count, aop_area_cm2, ...}
  created_at timestamptz default now()
);
```

**Indexes:**
`design_assets(workspace_id,brand_id,order_id,status)`
`design_versions(asset_id,version)`
`design_approvals(asset_id,version,status)`
`design_checks(asset_id,version)`

---

## 2.4 API Contracts (BFF)

### Create/Upload Design Version

```
POST /designs
Body {
  order_id, name, method,
  files:{mockup_url, prod_url, separations:[], dst_url?},
  placements:[{area,width_cm,height_cm,offset_x,offset_y}],
  palette:[...], meta:{dpi?, notes?}
}
→ 201 {asset_id, version:1}
Emits: ash.design.version.created
```

### Send for Client Approval

```
POST /designs/{asset_id}/versions/{version}/send-approval
Body { client_id, message_template_id?, require_esign?:true }
→ 200 {approval_id, portal_link}
Emits: ash.design.approval.sent
```

### Client Approve / Request Changes

```
POST /portal/approvals/{approval_id}/approve
→ 200 {status:"APPROVED"}
Emits: ash.design.approved

POST /portal/approvals/{approval_id}/request-changes
Body { comments }
→ 200 {status:"CHANGES_REQUESTED"}
Emits: ash.design.changes_requested
```

### Lock Version

```
POST /designs/{asset_id}/versions/{version}/lock
→ 200 {status:"LOCKED"}
```

---

## 2.5 Validations & Ashley Checks

### File/Art Checks (rules first)

* **Min DPI** at print size: `dpi >= 150` (tee) / `>= 200` (AOP) else WARN
* **Transparency & bleed:** DTF must have correct knockouts; Silkscreen separations present per color
* **Stroke width:** min line thickness ≥ 0.3–0.5 mm (mesh dependent) else WARN
* **Placement bounds:** print must not cross seams for Silkscreen **Option B**
* **Embroidery:** stitch count density vs fabric; warn if > recommended for area (puckering risk)

### Estimation Metrics

* **Expected ink grams (silkscreen):**
  `ink_g ≈ area_cm2 × coats × (coverage_factor)`
  (coverage\_factor derived from mesh + ink type; e.g., 0.006–0.012 g/cm²)
* **Stitch runtime (embroidery):**
  `minutes ≈ stitch_count / machine_spm / eff_factor`
* **AOP coverage (sublimation):** total cm² to press → checks press bed constraints

### Best-Seller Trigger

* When **asset** (or linked SKU) has historical **sell-through days < target** AND **return rate < threshold**, set `is_best_seller=true` → run:

  * **Reprint Advisor** (qty, size curve, color split, BOM, profit)
  * **Theme Recommender** (style/palette/placement + test quantities)

---

## 2.6 Status Transitions

* `design_assets.status`:
  `DRAFT → PENDING_APPROVAL → APPROVED → LOCKED`
  (`REJECTED` if client requests changes and GA closes version)

Approving a version:

* Sets **asset.status=APPROVED**
* Sets **asset.current\_version=version**
* Emits `ash.order.status.bump` → moves order to `DESIGN_APPROVAL` → `PRODUCTION_PLANNED` after scheduling

---

## 2.7 Notifications & Events

* To CSR: “Design v2 sent to Client X”
* To GA: “Client requested changes: \[comment]”
* To Manager: “Design APPROVED; routing will be scheduled”
* Events: `ash.design.version.created`, `ash.design.approval.sent`, `ash.design.approved`, `ash.design.changes_requested`, `ash.ashley.printability.checked`

---

## 2.8 Edge Cases

* **Mixed method assets** (e.g., DTF + Embroidery): support multiple placements with different “methods” tags.
* **Late changes after lock:** require Manager override; all downstream steps reset to PLANNED.
* **Client portal offline:** approval link time-boxed; refresh token if expired.

---

## 2.9 Acceptance Tests

1. Upload new version → appears as v1; `design_checks` record created; result PASS/WARN/FAIL.
2. Send for approval → client receives portal link; approval record `SENT`.
3. Client approves → asset `APPROVED`, order transitions, audit logged.
4. Approving **Option B** silkscreen with wide AOP → Ashley raises **FAIL**, blocks until route changed.
5. Best-seller flagged → Reprint & Theme recommendations generated.

---

# 🔹 Stage 3 – Cutting (Developer Spec)

## 3.1 Actors & Permissions

* **Cutting Operator:** scan rolls, log lays/cuts, create bundles, print QR.
* **Warehouse:** issues fabric rolls to Cutting (stock out to WIP).
* **QC (optional):** fabric inspection/4-point defects (if you enable).
* **Manager:** approve anomalies/wastage over threshold.
* **Ashley:** compute marker efficiency, yield, anomaly alerts.

**Scopes:** `cut.issue`, `cut.log`, `cut.bundle`, `cut.adjust`, `cut.view`

---

## 3.2 UX / Flow

### A) “Issue Fabric to Cutting”

* Operator scans **roll QR** (or selects batch)
* Enter **UoM** (kg/m), **qty issued**
* System creates **WIP issue transaction** from brand warehouse

### B) “Create Lay & Cut”

* **Fields**

  * PO, product, size range
  * Fabric roll(s) used (multi-select)
  * Lay length (m), number of plies
  * Marker name / width (cm)
  * **Target size ratio** (from PO size curve)
* **Actions**

  * Start Lay → End Lay
  * Record **Gross fabric used** (kg or m)
  * Record **Cut pieces by size** (pcs)
  * Record **Offcuts** (kg) and **Defects** (optional)

### C) “Create Bundles”

* Choose **bundle size** (e.g., 20 pcs per size)
* System generates bundle counts & **QRs per bundle**
* Print bundle tickets (QR + PO + size + qty)

---

## 3.3 Data Model (SQL)

```sql
-- fabric rolls / batches
create table fabric_batches (
  id uuid primary key,
  workspace_id uuid not null,
  brand_id uuid not null,
  item_id uuid not null,              -- reference to inventory_items
  lot_no text,
  uom text not null,                  -- KG or M
  qty_on_hand numeric not null,
  gsm int, width_cm int,
  received_at timestamptz,
  created_at timestamptz default now()
);

-- cutting issues (warehouse -> WIP)
create table cut_issues (
  id uuid primary key,
  order_id uuid not null,
  batch_id uuid not null references fabric_batches(id),
  qty_issued numeric not null,
  uom text not null,
  issued_by uuid not null,
  created_at timestamptz default now()
);

-- lays and outputs
create table cut_lays (
  id uuid primary key,
  order_id uuid not null,
  marker_name text,
  marker_width_cm int,
  lay_length_m numeric,
  plies int,
  gross_used numeric not null,        -- kg or m (uom in batch)
  offcuts numeric default 0,
  defects numeric default 0,
  uom text not null,                  -- KG or M
  created_by uuid not null,
  created_at timestamptz default now()
);

-- pieces per size from a lay
create table cut_outputs (
  id uuid primary key,
  lay_id uuid not null references cut_lays(id),
  size_code text not null,
  qty int not null,
  created_at timestamptz default now(),
  unique (lay_id, size_code)
);

-- bundles (traceable WIP units)
create table bundles (
  id uuid primary key,
  order_id uuid not null,
  size_code text not null,
  qty int not null,
  lay_id uuid,
  qr_code text unique not null,       -- encoded id or URL
  status text default 'CREATED',      -- CREATED/IN_SEWING/DONE/REJECTED
  created_at timestamptz default now()
);
```

**Indexes:**
`fabric_batches(brand_id,item_id)`
`cut_lays(order_id,created_at)`
`cut_outputs(lay_id,size_code)`
`bundles(order_id,size_code,status)`

---

## 3.4 Calculations & Ashley Checks

### Units & Conversions

* If fabric issued in **kg** but marker specs in **cm/m**, convert using **gsm** and **width** if available:

  * **Area (m²)** used = `(gross_used_kg × 1000) / gsm`
  * **Length (m)** used ≈ `Area / (width_cm / 100)`
* If issued in **m**, kg ≈ `m × width_cm × gsm / 1000`

### Expected Pieces (from lay)

For tees (simplified):

```
expected_pcs ≈ (marker_width_cm * lay_length_m * plies) / pattern_area_cm2
pattern_area_cm2 depends on size (S,M,L,XL) and product type
```

System stores **pattern\_area\_cm2** per size/product in a reference table.

### Marker Efficiency

```
marker_efficiency % = (used_for_pieces_area / total_fabric_area) * 100
total_fabric_area = width_cm * lay_length_m * plies (in cm²)
used_for_pieces_area = Σ (qty[size] * pattern_area_cm2[size])
```

### Wastage %

```
waste % = ((offcuts_area + defects_area) / total_fabric_area) * 100
```

If only **offcuts kg** logged, convert kg→area with gsm/width.

### Ashley Rules (examples)

* **Low efficiency** (< configured threshold, e.g., 78%): *WARN* → suggest alternate marker or size ratio tweak.
* **High waste** (> threshold): *ALERT* → recommend fabric relax time, recalibrate marker, check cutter training.
* **Size imbalance** vs PO curve (e.g., overproduction of M/L): *WARN* → adjust next lay ratios.
* **Batch mix**: mixing different lots can cause shade variance → *WARN* for shade banding risk.

---

## 3.5 API Contracts (BFF)

### Issue Fabric to Cutting

```
POST /cutting/issues
Body { order_id, batch_id, qty_issued, uom }
→ 201 {id}
Emits: ash.cutting.issue.created
```

### Create Lay & Log Outputs

```
POST /cutting/lays
Body {
  order_id, marker_name, marker_width_cm, lay_length_m, plies,
  gross_used, offcuts?, defects?, uom, outputs:[{size_code, qty}]
}
→ 201 {lay_id}
Emits: ash.cutting.lay.created
```

### Create Bundles

```
POST /cutting/bundles
Body { order_id, from_lay_id, bundle_size_per_size: {"M":20,"L":20,"XL":20} }
→ 201 {bundles:[{id, size_code, qty, qr_code}, ...]}
Emits: ash.bundles.created
```

---

## 3.6 QR / Barcode Encoding

* **QR Content:** `ash://bundle/{bundle_id}` (or short URL to bundle viewer)
* Include: `PO# • Size • Qty • Lay# • CreatedAt`
* Printable 2×3” label template

---

## 3.7 Notifications & Events

* To Warehouse: “Fabric issue recorded to PO#… (28 kg from Batch …)”
* To Manager: “Marker efficiency 73% (< 78% threshold) on PO#… Lay 12”
* Events: `ash.cutting.issue.created`, `ash.cutting.lay.created`, `ash.bundles.created`, `ash.ashley.cutting.analytics.computed`

---

## 3.8 Edge Cases

* **No gsm/width:** allow logging but show “efficiency unknown” and prompt to fill batch specs.
* **Over-issue vs batch balance:** block issue if `qty_issued > qty_on_hand`.
* **Negative outputs:** reject; quantities must be ≥0.
* **Partial bundles:** allow last bundle with smaller qty (prints “Part Bundle”).

---

## 3.9 Acceptance Tests

1. Issue fabric → inventory batch decreases; WIP ledger records transaction.
2. Create lay with outputs → system computes efficiency & waste; Ashley produces check record.
3. Create bundles → correct number of bundles with unique QR; totals equal outputs.
4. Over-issue attempt → 422 error (validation).
5. Missing gsm/width → lay accepted; Ashley flags “missing specs—cannot compute efficiency”.

---

### How Stages 2 & 3 connect

* **Approved design** (Stage 2) locks placements and method → informs **printing specs** and **pattern areas by size** used in **cutting math**.
* **Cutting outputs & bundles** (Stage 3) feed **Sewing**’s WIP and **Payroll** (piece-rate), and they anchor **traceability** through Printing/Sewing/QC.

# 🔹 Stage 4 – Printing (Developer Spec, per method)

> All printing steps are attached to a **routing step** record so the planner/scheduler knows when a step can start (dependencies met) and what **workcenter** is used.

## 4.0 Shared concepts (all methods)

**Actors & scopes**

* Printing Operator (`print.run`, `print.material.log`, `print.reject`)
* QC (`qc.sample`, `qc.reject`)
* Manager (`print.override`, `print.spec.update`)
* Ashley (AI): read-only; computes checks & prompts

**Shared UX**

* “My Queue” shows **ready** routing steps for the user’s workcenter.
* Each job card shows: PO, product, method, variant, target qty, required specs (temp/time/pressure or coats/mesh), and **materials checklist**.
* Buttons: **Start**, **Pause**, **Complete**, **Log Materials**, **Reject** (with photo).

**Shared tables**

```sql
-- link to routing step for traceability
create table print_runs (
  id uuid primary key,
  order_id uuid not null,
  routing_step_id uuid not null references routing_steps(id),
  method text not null,                 -- SILKSCREEN/SUBLIMATION/DTF/EMBROIDERY
  workcenter text not null,             -- PRINTING/HEAT_PRESS/EMB
  machine_id uuid,                      -- press/oven/printer/emb machine
  started_at timestamptz,
  ended_at timestamptz,
  status text default 'CREATED',        -- CREATED/IN_PROGRESS/PAUSED/DONE/CANCELLED
  created_by uuid not null,
  created_at timestamptz default now()
);

-- per-run outputs and materials
create table print_run_outputs (
  id uuid primary key,
  run_id uuid not null references print_runs(id),
  bundle_id uuid,                       -- if operating on bundles
  qty_good int default 0,
  qty_reject int default 0,
  notes text,
  created_at timestamptz default now()
);

create table print_run_materials (
  id uuid primary key,
  run_id uuid not null references print_runs(id),
  item_id uuid not null,                -- ink, transfer paper, film, powder, thread, stabilizer
  uom text not null,                    -- g, m2, m, cone, sheet, pcs
  qty numeric not null,
  source_batch_id uuid,                 -- inventory_batches
  created_at timestamptz default now()
);

-- reject detail
create table print_rejects (
  id uuid primary key,
  run_id uuid not null references print_runs(id),
  bundle_id uuid,
  reason_code text not null,            -- MISALIGNMENT/PEEL/CRACK/GHOST/PUCKERING/...
  qty int not null,
  photo_url text,
  cost_attribution text,                -- SUPPLIER/STAFF/COMPANY/CLIENT
  created_at timestamptz default now()
);

-- machine library (press, ovens, printers, emb machines)
create table machines (
  id uuid primary key,
  workspace_id uuid not null,
  workcenter text not null,             -- PRINTING/HEAT_PRESS/EMB/DRYER
  name text not null,
  spec jsonb,                           -- bed_size, max_temp, lanes, etc.
  is_active bool default true,
  created_at timestamptz default now()
);
```

**Shared APIs**

```
POST /printing/runs
Body { order_id, routing_step_id, method, workcenter, machine_id? }
→ 201 { run_id }

POST /printing/runs/{run_id}/start
→ 200

POST /printing/runs/{run_id}/materials
Body { item_id, uom, qty, source_batch_id? }
→ 201

POST /printing/runs/{run_id}/output
Body { bundle_id?, qty_good, qty_reject?, notes? }
→ 201

POST /printing/runs/{run_id}/reject
Body { bundle_id?, reason_code, qty, photo_url?, cost_attribution? }
→ 201

POST /printing/runs/{run_id}/complete
→ 200 { status:"DONE" } and auto-progress routing_step → DONE (if totals met)
```

---

## 4.1 Silkscreen

### 4.1.1 Steps/UX

1. **Screen Prep**

   * Log: screen ID, mesh count, emulsion batch, exposure time, alignment target.
2. **Printing**

   * Select **bundle(s)** or sub-batch, pick **ink type** (plastisol/water-based/anti-migration), **coats**, squeegee durometer.
   * Log **ink grams** consumed.
3. **Curing**

   * Log dryer **temp/time** (and path speed).
4. **QC sample**: cracks, wash test, registration, placement.

### 4.1.2 Extra tables

```sql
create table silkscreen_prep (
  id uuid primary key,
  run_id uuid not null references print_runs(id),
  screen_id text not null,
  mesh_count int not null,
  emulsion_batch text,
  exposure_seconds int,
  registration_notes text,
  created_at timestamptz default now()
);

create table silkscreen_specs (
  id uuid primary key,
  run_id uuid not null references print_runs(id),
  ink_type text not null,               -- PLASTISOL/WATER/PUFF/ANTI_MIGRATION
  coats int not null,
  squeegee_durometer int,               -- 60/70/80
  floodbar text,
  expected_ink_g numeric,               -- AI estimation
  created_at timestamptz default now()
);

create table curing_logs (
  id uuid primary key,
  run_id uuid not null references print_runs(id),
  dryer_id uuid references machines(id),
  temp_c int not null,
  seconds int not null,
  belt_speed text,
  created_at timestamptz default now()
);
```

### 4.1.3 Ashley checks & calculations

* **Expected ink grams**
  `expected_ink_g = Σ(area_cm2(placement) × coats × coverage_factor(mesh, ink_type))`
  (coverage\_factor \~ 0.006–0.012 g/cm²)
* **Cure verification**

  * Plastisol: **\~160–170°C** core temp; seconds according to ink spec.
  * If `curing_logs.temp_c * seconds` below threshold → **WARN: undercure risk**.
* **Registration drift**

  * If bundle output shows rising rejects for MISALIGNMENT → prompt check screen tension.
* **Option B route guard**

  * If **Sew → Print** chosen **and** placement area crosses seam → **BLOCK** until route changed.

### 4.1.4 Acceptance tests

* Run with 3 coats; ink usage within ±15% of expected → PASS
* Under-cured log (low temp/seconds) → Ashley flags **RED**
* Printing after sewing with AOP → route check **BLOCKS** completion

---

## 4.2 Sublimation

### 4.2.1 Steps/UX

1. **Print to Transfer Paper**

   * Log: printer, paper area (m²), ink grams.
2. **Heat Press Transfer**

   * Log: press **temp/time/pressure**, press count.
3. If AOP route chosen: **Print/Heat first**, then **Cut → Sew**.

### 4.2.2 Extra tables

```sql
create table sublimation_prints (
  id uuid primary key,
  run_id uuid not null references print_runs(id),
  printer_id uuid references machines(id),
  paper_m2 numeric not null,
  ink_g numeric,
  created_at timestamptz default now()
);

create table heat_press_logs (
  id uuid primary key,
  run_id uuid not null references print_runs(id),
  press_id uuid references machines(id),
  temp_c int not null,
  seconds int not null,
  pressure text,                        -- light/medium/firm
  cycles int default 1,
  created_at timestamptz default now()
);
```

### 4.2.3 Ashley checks & calculations

* **Transfer adequacy**

  * Standard: **\~200°C**, **\~60s**, **medium** pressure → else **WARN**.
* **Paper utilization**

  * Compute waste ratio: used area / printed area; if high, suggest nest optimization.
* **AOP route guard**

  * If route customized to **Cut before Heat Press** on AOP → **WARN** misalignment risk.

### 4.2.4 Acceptance tests

* Press logs inside spec → PASS
* Paper m² unusually high for qty → **WARN**: nesting inefficiency
* AOP cut before press → Ashley **WARN**

---

## 4.3 DTF (Direct-to-Film)

### 4.3.1 Steps/UX

1. **Print on Film** (log film area m², ink g)
2. **Powder apply & Cure** (log powder g, temp/time)
3. **Heat Press to Garment** (temp/time/pressure)
4. QC: peel & wash test

### 4.3.2 Extra tables

```sql
create table dtf_prints (
  id uuid primary key,
  run_id uuid not null references print_runs(id),
  film_m2 numeric not null,
  ink_g numeric,
  created_at timestamptz default now()
);

create table dtf_powder_cures (
  id uuid primary key,
  run_id uuid not null references print_runs(id),
  powder_g numeric not null,
  temp_c int not null,
  seconds int not null,
  created_at timestamptz default now()
);
```

### 4.3.3 Ashley checks

* **Adhesion readiness**: if cure temp/time below spec → **WARN: peel risk**
* **Film usage efficiency**: nest optimization hints
* **Press settings** per fabric type (poly/cotton) – mismatch → **WARN**

### 4.3.4 Acceptance tests

* Cure within spec; press within spec → PASS
* Low cure → Ashley **RED**; high peel rejects logged

---

## 4.4 Embroidery

### 4.4.1 Steps/UX

1. **Load digitized file (DST/EMB)**
2. **Thread & Stabilizer Setup** (log thread colors, stabilizer type)
3. **Embroidery Run** (pcs, thread breaks, runtime)
4. **QC**: puckering, tension, alignment

### 4.4.2 Extra tables

```sql
create table embroidery_runs (
  id uuid primary key,
  run_id uuid not null references print_runs(id),
  design_version_id uuid,               -- link to design_versions
  stitch_count int not null,
  machine_spm int,                      -- stitches per minute
  stabilizer_type text,
  thread_colors jsonb,                  -- ["PMS 186C", "Black", ...]
  thread_breaks int default 0,
  runtime_minutes numeric,
  created_at timestamptz default now()
);
```

### 4.4.3 Ashley checks & calculations

* **Runtime estimate**: `stitch_count / machine_spm / eff_factor`
  Compare to actual runtime → if far off, flag machine maintenance or tension issues.
* **Density vs fabric**: if stitches/cm² exceeds threshold → **WARN: puckering risk**
* **Color mismatch**: if palette deviates from approved → **WARN**

### 4.4.4 Acceptance tests

* Runtime within ±20% of estimate → PASS
* Excessive thread breaks (> N per 100k stitches) → **WARN** and suggest needle/tension check

---

# 🔹 Stage 5 – Sewing (Developer Spec)

> Sewing can happen **after printing** or **in parallel sub-assemblies** (collars/sleeves) based on routing dependencies. We support both with DAG routing.

## 5.1 Actors & Permissions

* Sewing Operator (`sew.run`, `sew.bundle.scan`, `sew.reject`)
* Line Leader (`sew.assign`, `sew.rebalance`)
* Manager (`sew.override`)
* Ashley: read-only analytics (rate, defects, fatigue)

## 5.2 UX / Flow

**A) “Scan Bundle & Start”**

* Operator scans **bundle QR** → system checks step readiness (dependencies done).
* Shows operation: e.g., “Join shoulders”, “Attach collar”, “Side seams”, “Hem”, “Final assembly”.
* Buttons: **Start**, **Pause**, **Complete**, **Reject**.

**B) “Complete Operation”**

* Enter **qty completed** (default = bundle qty minus prior rejects).
* Optional: partial completion; remaining qty stays in bundle.
* Log **time on task** (auto; can edit if allowed).
* If rejects → add reason + photo.

**C) Parallel sub-assemblies**

* Example: After **Cutting**, routing spawns:

  * **Sew Sleeves Sub-assembly**
  * **Sew Collars Sub-assembly**
* Final assembly step **depends\_on** both sub-assemblies complete (**AND-join**).
* Gantt shows parallel lanes; planner balances operators.

## 5.3 Data Model

```sql
-- operation library (per product type)
create table sewing_operations (
  id uuid primary key,
  workspace_id uuid not null,
  product_type text not null,           -- Tee/Hoodie/Jersey/...
  name text not null,                   -- "Join shoulders","Attach collar",...
  standard_minutes numeric not null,    -- SMV
  piece_rate numeric,                   -- pay per piece for this op (optional; else from rates table)
  depends_on text[],                    -- logical op names for library planning
  created_at timestamptz default now()
);

-- rates by brand/role (fallback)
create table piece_rates (
  id uuid primary key,
  workspace_id uuid not null,
  brand_id uuid,
  operation_name text not null,
  rate numeric not null,                -- PHP per piece
  effective_from date,
  effective_to date
);

-- sewing runs (per bundle per operation)
create table sewing_runs (
  id uuid primary key,
  order_id uuid not null,
  routing_step_id uuid not null references routing_steps(id),
  operation_name text not null,
  operator_id uuid not null,
  bundle_id uuid not null references bundles(id),
  started_at timestamptz,
  ended_at timestamptz,
  qty_good int default 0,
  qty_reject int default 0,
  reject_reason text,
  reject_photo_url text,
  status text default 'CREATED',        -- CREATED/IN_PROGRESS/DONE
  created_at timestamptz default now()
);
```

## 5.4 APIs

```
POST /sewing/runs
Body { order_id, routing_step_id, operation_name, bundle_id }
→ 201 { run_id }

POST /sewing/runs/{run_id}/start
→ 200

POST /sewing/runs/{run_id}/complete
Body { qty_good, qty_reject?, reject_reason?, reject_photo_url? }
→ 200 { status:"DONE" } and bundle progress updated

POST /sewing/reassign
Body { sewing_run_id, new_operator_id }
→ 200
```

## 5.5 Calculations

**A) Operator rate & payroll accrual**

* **Earned minutes** = `qty_good × SMV`
* **Piece-rate pay** =

  * If operation has explicit `piece_rate` → `qty_good × piece_rate`
  * Else look up **brand/operation** in `piece_rates` with effective date.
* Store line-item accrual per run for payroll integration.

**B) Line efficiency**

* **Actual rate** = `qty_good / (ended_at - started_at)`
* **Efficiency %** = `(SMV × qty_good) / actual_minutes × 100`

**C) Bundle state machine**

* `CREATED → IN_SEWING → DONE` (if multiple ops, track per-op progress in a `bundle_progress` JSON)

## 5.6 Ashley checks

* **Under/Over speed**:

  * If **efficiency %** < threshold (e.g., 70%) → **WARN** (training/material problem).
  * If **efficiency %** > 150% with elevated rejects → **WARN** (rushing).
* **Fatigue**: long continuous sessions without breaks → **PROMPT** line leader.
* **Defect clustering**: repeated rejects on same op/operator → recommend skill coaching.
* **Parallel routing completeness**: ensure all required sub-assemblies done before final join (AND-join enforcement).
* **Load balancing**: suggest reassigning operators to remove bottlenecks.

## 5.7 Events & Edge cases

**Events**

* `ash.sewing.run.started`, `ash.sewing.run.completed`, `ash.sewing.reject.logged`
* `ash.bundle.status.changed`
* `ash.ashley.sewing.analytics.computed`

**Edge cases**

* **Partial bundle completion**: create another sewing\_run for remainder automatically.
* **Wrong bundle scanned**: block start if routing\_step mismatch (dependencies not met).
* **Rework**: create a **rework run** linked to prior reject (separate tag).

## 5.8 Acceptance tests

1. Scan correct bundle → run can start; wrong step → blocked.
2. Complete operation with qty\_good = bundle qty → bundle step marked done.
3. Piece-rate accrual calculated and posted to payroll staging.
4. Efficiency < 60% → Ashley **WARN**; repeat rejects → **ALERT** CAPA.
5. Parallel sub-assemblies not yet complete → final assembly step stays **BLOCKED** until both are done.

---

## 🔗 How Stage 4 ↔ Stage 5 connect

* **If Printing precedes Sewing** (Silkscreen Option A / Sublimation default / DTF printing then press / Embroidery on panels):

  * Sewing steps **depend\_on** printing steps in `routing_steps`.
  * Bundles produced in Cutting carry forward; after Printing, same bundle IDs continue to Sewing.
* **If Sewing precedes Printing** (Silkscreen Option B, limited cases):

  * Ashley guards route; large/full placements **BLOCKED**.
  * Printing operates **on sewn garments** (not panels), and curing/QC must pass before Packing.

---

## 🧭 Planner & Capacity (for both stages)

* **Workcenters** (PRINTING, HEAT\_PRESS, EMB, SEWING\_SUB, SEWING\_FINAL) each have capacity pools:
  operators × machine throughput × utilization.
* Scheduler marks steps **READY** when dependencies are DONE; assigns earliest slot.
* On delay, Ashley recomputes **critical path** and suggests:

  * add overtime, split batches, subcontract, or route switch (where allowed).

# 🔹 Stage 6 – Quality Control (QC) — Developer Spec

## 6.1 Actors & Permissions

* **QC Inspector**: create inspections, sample, record defects, pass/fail, attach photos.
  Scopes: `qc.create`, `qc.sample`, `qc.defect.log`, `qc.passfail.set`
* **Line/Dept Manager**: set AQL plan, approve rework/waivers, open CAPA tasks.
  Scopes: `qc.plan.set`, `qc.capa.create`, `qc.override`
* **Admin**: define defect codes, checklists, sampling defaults.
  Scopes: `qc.codes.manage`, `qc.checklist.manage`
* **Ashley (AI)**: compute trends (p-chart), flags spikes, recommends training/CAPA.

---

## 6.2 UX / Flows

### A) Create Inspection

* Entry points:

  * **Inline QC** (at printing / sewing / embroidery step), or
  * **Final QC** (before packing).
* Fields:

  * PO, brand, method, stage (Printing/Sewing/Final), lot size (qty to inspect), **AQL** (e.g., 2.5), **Inspection Level** (G II default), **Checklist** (by product/method), **Sample plan** (auto-calculated).
* Actions: **Start Inspection** (generates sample size, acceptance/ rejection numbers).

### B) Sampling & Checks

* The app guides inspector through **N sampled units**:

  * Scan bundle/carton (if applicable) → system records which units sampled.
  * Checklist items (toggle/score): print alignment, color match, seams, measurements, embroidery puckering, etc.
  * Log **defects**: choose **severity** (Critical/Major/Minor), reason code, photos, unit id/bundle id, notes.

### C) Disposition

* Auto compute **Pass / Fail** using selected AQL plan:

  * If **defects ≤ acceptance number (Ac)** → **PASS**
  * If **defects ≥ rejection number (Re)** → **FAIL**
* Actions on **FAIL**:

  * **Create Rework Order** (auto-generate tasks linked to failed stage)
  * **Raise CAPA** (root cause, owner, due date)
  * **Hold Shipment** flag (blocks Stage 7 until cleared)

### D) Close Inspection

* Inspector signs, Manager optionally reviews/approves.
* Client-visible summary (optional) pushed to portal.

---

## 6.3 Data Model (SQL)

```sql
-- QC master data
create table qc_defect_codes (
  id uuid primary key,
  workspace_id uuid not null,
  code text not null,                -- e.g., "PRINT_MISALIGN", "SEW_OPEN_SEAM"
  severity text not null,            -- CRITICAL/MAJOR/MINOR
  method text,                       -- optional filter by method
  description text
);

create table qc_checklists (
  id uuid primary key,
  workspace_id uuid not null,
  name text not null,                -- "Tee Final QC v1"
  product_type text,
  method text,
  items jsonb not null               -- [{key,label,required,weight}]
);

-- Inspections
create table qc_inspections (
  id uuid primary key,
  order_id uuid not null,
  routing_step_id uuid,              -- optional for inline QC
  stage text not null,               -- PRINTING/SEWING/FINAL
  lot_size int not null,
  aql numeric not null,              -- e.g., 2.5
  level text not null default 'GII', -- inspection level
  sample_size int not null,
  acceptance int not null,           -- Ac
  rejection int not null,            -- Re
  checklist_id uuid,
  status text default 'OPEN',        -- OPEN/PASSED/FAILED/CLOSED
  created_by uuid not null,
  created_at timestamptz default now(),
  closed_at timestamptz
);

create table qc_samples (
  id uuid primary key,
  inspection_id uuid not null references qc_inspections(id),
  sampled_from text,                 -- bundle_id/carton_id/line
  unit_ref text,                     -- optional unique unit reference
  result text default 'OK',          -- OK/DEFECT
  created_at timestamptz default now()
);

create table qc_defects (
  id uuid primary key,
  inspection_id uuid not null references qc_inspections(id),
  sample_id uuid references qc_samples(id),
  defect_code_id uuid references qc_defect_codes(id),
  severity text not null,
  qty int not null default 1,
  photo_url text,
  notes text,
  cost_attribution text,             -- SUPPLIER/STAFF/COMPANY/CLIENT
  created_at timestamptz default now()
);

-- Corrective/Preventive Action
create table capa_tasks (
  id uuid primary key,
  workspace_id uuid not null,
  order_id uuid,
  source_inspection_id uuid,
  title text not null,
  root_cause text,
  owner_id uuid not null,
  due_date date,
  status text default 'OPEN'         -- OPEN/IN_PROGRESS/DONE/VERIFIED
);
```

**Indexes**
`qc_inspections(order_id, stage, created_at)`
`qc_defects(inspection_id, severity)`
`capa_tasks(order_id, status, due_date)`

---

## 6.4 APIs

```
POST /qc/inspections
Body { order_id, routing_step_id?, stage, lot_size, aql, level, checklist_id }
→ 201 { inspection_id, sample_size, acceptance, rejection }

POST /qc/inspections/{id}/sample
Body { sampled_from?, unit_ref? }
→ 201 { sample_id }

POST /qc/inspections/{id}/defect
Body { sample_id?, defect_code_id, severity, qty, photo_url?, notes?, cost_attribution? }
→ 201

POST /qc/inspections/{id}/close
Body { disposition: "PASSED" | "FAILED" }
→ 200 { status }
(If FAILED: block Stage 7 and optionally create CAPA/rework)
```

---

## 6.5 Sampling & Calculations

* Use ANSI/ASQ Z1.4 **General Inspection Level II** by default.
* Map **lot\_size → code letter → sample\_size** and **Ac/Re** tables stored in a reference JSON (configurable).
* Example (illustrative):

  * Lot 1,201–3,200 → Code **K**, sample **125**, **AQL 2.5** → **Ac=7**, **Re=8**.
* **Pass** if total (Major+Critical weighted per policy) ≤ **Ac**.
* **Fail** if ≥ **Re**.

**Optional rules**

* **Skip-lot** for consistently good lots (Ashley suggests reducing frequency).
* **Tightened inspection** after consecutive fails.

---

## 6.6 Ashley Checks (Analytics)

* **p-chart** of defect rate by stage/operator/time; alert on spikes (Western Electric rules).
* **Top 3 defects** heatmap per method (e.g., DTF peel, silkscreen misalign).
* **Root cause hints** from patterns (e.g., misalign ↑ when Screen Mesh=80 → recommend 120).
* **Training prompts** for operators with repeated MAJOR defects.
* **Supplier attribution** trends (e.g., specific fabric lot linked to color bleed).

---

## 6.7 Events, Notifications, Edge Cases

**Events**
`ash.qc.inspection.created`, `ash.qc.sample.added`, `ash.qc.defect.logged`, `ash.qc.closed`, `ash.capa.created`

**Notifications**

* Manager: “Final QC FAILED (PO …), Ac=7, found=11. Shipment on hold.”
* Operator/Dept lead: “MAJOR defects trend ↑ — schedule refresher training.”

**Edge Cases**

* **Partial rework pass**: allow Re-inspection referencing original inspection.
* **Photo required** policy for Critical defects.
* **Client-required AQL** override per brand/customer.

---

## 6.8 Acceptance Tests

1. Create inspection → system computes sample\_size/Ac/Re from AQL table.
2. Log defects exceeding **Re** → disposition auto = **FAILED**.
3. On FAIL: Stage 7 blocked until `capa_tasks` created and inspection passed.
4. Ashley p-chart flags a spike vs baseline and posts alert.
5. Client with custom AQL uses brand override table successfully.

---

# 🔹 Stage 7 – Finishing & Packing — Developer Spec

## 7.1 Actors & Permissions

* **Finishing Operator**: thread trimming, ironing/steam, lint clean, tag attach.
  Scopes: `finish.run`, `finish.material.log`
* **Packing Operator**: fold, polybag, size sticker, barcode, cartonization.
  Scopes: `pack.unit`, `pack.carton`, `pack.close`
* **Logistics/Planner**: build shipments, assign driver/3PL, generate docs.
  Scopes: `ship.create`, `ship.label`, `ship.assign`
* **Ashley**: carton fill optimization, courier cost comparison, ETA suggestions.

---

## 7.2 UX / Flows

### A) Finishing

* **Select PO / bundles** ready from QC.
* Tasks checklist (configurable per product/brand):

  * Trim threads, iron/steam, lint roll, add neck label/size label, attach brand hangtag, attach care label.
* **Log materials**: hangtags, polybags, size stickers, barcode labels (auto-deduct inventory).
* **Mark garments finished** (WIP → Finished Goods).

### B) Packing (Unit → Carton → Shipment)

1. **Unit Packing**

   * Scan finished bundle or unit → assign **SKU/size/color** to **pack unit**.
   * Auto-generate or scan **retail barcode** if needed.
2. **Cartonization (Carton Builder UI)**

   * Create carton → enter dimensions (L×W×H), tare weight.
   * Add units (drag or scan) until capacity reached.
   * System computes **carton weight**, **dim weight**, and **fill %**; Ashley suggests best packing mix.
   * Print **Carton QR/Label**.
3. **Close Carton**

   * Locks content; generates **Carton ID** and **Packing List** row.
4. **Build Shipment**

   * Select cartons → create **Shipment** (consignee, address, incoterms, COD flag).
   * Choose **Driver** or **3PL (rate cards/API)**; get **ETA** and cost.
   * Generate **Documents**: Packing List, Delivery Receipt, 3PL label (if API), Invoice copy (optional).
   * Status: **READY\_FOR\_PICKUP** → **IN\_TRANSIT** after scan-out.

---

## 7.3 Data Model (SQL)

```sql
-- Finishing runs
create table finishing_runs (
  id uuid primary key,
  order_id uuid not null,
  routing_step_id uuid not null references routing_steps(id),
  operator_id uuid not null,
  started_at timestamptz,
  ended_at timestamptz,
  materials jsonb,                    -- [{item_id,uom,qty,batch_id?}]
  notes text,
  created_at timestamptz default now()
);

-- Finished goods (FG) units
create table finished_units (
  id uuid primary key,
  order_id uuid not null,
  sku text not null,                  -- derived from product+color+size
  size_code text not null,
  color text,
  serial text,                         -- optional per-unit serial/barcode
  packed bool default false,
  created_at timestamptz default now()
);

-- Cartons
create table cartons (
  id uuid primary key,
  order_id uuid not null,
  carton_no int not null,              -- 1..N
  length_cm int, width_cm int, height_cm int,
  tare_weight_kg numeric default 0,
  actual_weight_kg numeric default 0,
  dim_weight_kg numeric default 0,
  fill_percent numeric default 0,
  status text default 'OPEN',          -- OPEN/CLOSED
  qr_code text unique,
  created_at timestamptz default now()
);

create table carton_contents (
  id uuid primary key,
  carton_id uuid not null references cartons(id),
  finished_unit_id uuid not null references finished_units(id),
  qty int not null default 1,
  created_at timestamptz default now()
);

-- Shipments
create table shipments (
  id uuid primary key,
  order_id uuid not null,
  consignee_name text not null,
  consignee_address jsonb not null,
  contact_phone text,
  method text not null,                -- DRIVER/LALAMOVE/GRAB/TPL...
  carrier_ref text,                    -- 3PL waybill or booking id
  cod_amount numeric,
  status text default 'READY_FOR_PICKUP', -- READY_FOR_PICKUP/IN_TRANSIT/DELIVERED/FAILED
  eta timestamptz,
  created_at timestamptz default now()
);

create table shipment_cartons (
  id uuid primary key,
  shipment_id uuid not null references shipments(id),
  carton_id uuid not null references cartons(id),
  created_at timestamptz default now()
);
```

**Indexes**
`finished_units(order_id, sku, size_code, packed)`
`cartons(order_id, status)`
`shipments(order_id, status, created_at)`

---

## 7.4 APIs

```
POST /finishing/runs
Body { order_id, routing_step_id, materials:[{item_id,uom,qty,batch_id?}], notes? }
→ 201 { run_id }

POST /packing/units
Body { order_id, sku, size_code, color?, serial? }
→ 201 { finished_unit_id }  // can be created in bulk from bundles

POST /packing/cartons
Body { order_id, length_cm, width_cm, height_cm, tare_weight_kg }
→ 201 { carton_id, carton_no }

POST /packing/cartons/{carton_id}/add
Body { finished_unit_id, qty }
→ 201

POST /packing/cartons/{carton_id}/close
→ 200 { status:"CLOSED", weights:{actual, dim, fill_percent} }

POST /shipments
Body {
  order_id,
  consignee:{name,address,phone},
  method, cod_amount?,
  cartons:[carton_id...]
}
→ 201 { shipment_id, labels? }
```

---

## 7.5 Calculations

**A) Finished Goods conversion**

* When a bundle passes **Final QC**, create **finished\_units** rows per SKU/size; decrement WIP; increment FG.

**B) Carton metrics**

* **Actual weight** = tare + Σ(unit weights)
* **Dim weight (kg)** = `(L × W × H) / divisor` (divisor per carrier, e.g., 5000 or 6000)
* **Chargeable weight** = `max(actual, dim)`
* **Fill %** = `used volume / carton volume × 100`

**C) Packaging materials**

* Deduct hangtags, polybags, stickers from inventory via `finishing_runs.materials`.

---

## 7.6 Ashley (AI) Suggestions

* **Cartonization optimizer**: suggests unit mixes to hit target **fill %** and minimize chargeable weight.
* **Carrier choice**: compares **Driver vs 3PL** cost and ETA using historical rates & API quotes.
* **Late risk**: if packing finishes close to cutoff time, suggests **next-day pickup** or **priority booking**.
* **Labeling QA**: flags SKUs with common barcode scan failures.

---

## 7.7 Events, Notifications, Edge Cases

**Events**
`ash.finishing.run.completed`, `ash.fg.units.created`, `ash.carton.closed`, `ash.shipment.created`, `ash.shipment.status.changed`

**Notifications**

* To Logistics: “PO … 8 cartons closed; shipment draft ready.”
* To Client: “Your order is packed and ready for pickup/shipping.”

**Edge Cases**

* **Reopen carton** (audit required): allow only for **OPEN/CLOSED** within same day by Manager.
* **Mixed-brand block**: prevent adding units from different `brand_id` unless Admin override.
* **COD**: ensure invoice balance equals COD amount before allowing shipment creation.
* **Hazmat/pressurized**: (future) special handling flags.

---

## 7.8 Acceptance Tests

1. Final QC **PASS** → units convert to FG; packing allowed.
2. Add units to carton → close carton → carton weights computed; label generated; contents locked.
3. Build shipment with 3 cartons → method “LALAMOVE” → returns booking ref; Client portal shows **Ready for pickup**.
4. Ashley suggests **Driver** over **3PL** when volumetric > actual and cost curve favors in-house.
5. Attempt to mix different brands in one carton → blocked (unless Admin override with audit).

---

## 🔗 Stage 6 ↔ Stage 7 Hand-off

* **QC PASS** sets routing step **DONE**; **Final QC PASS** flips WIP → FG (`finished_units`).
* **QC FAIL** sets **HOLD\_SHIPMENT** flag on the order; Packing/Shipment APIs must reject until the hold is cleared or re-inspection passes.
* **CAPA linkage**: finishing runs can reference `capa_tasks` if additional containment actions are required.
# 🔹 Stage 8 – Delivery (Developer Spec)

## 8.1 Actors & Permissions

* **Logistics Coordinator / Dispatcher**: create & assign shipments, book 3PL, monitor delivery.
  Scopes: `ship.create`, `ship.assign`, `ship.book_3pl`, `ship.update_status`
* **Driver**: start trip, scan-out cartons, capture Proof of Delivery (POD), log expenses.
  Scopes: `driver.trip.start`, `driver.scan`, `driver.pod.upload`, `driver.expense.log`
* **Warehouse**: handover cartons (scan-out).
  Scopes: `wh.scan_out`
* **Client (Portal)**: track delivery, confirm receipt, rate delivery.
  Scopes: portal-only
* **Ashley (AI)**: cost/ETA comparison, route/slot recommendations, on-time risk.

---

## 8.2 UX / Flows

### A) Dispatch Board (Coordinator)

* Filter by: **Ready for Pickup**, **In Transit**, **Delivered**, **Failed**.
* Select **cartons** → **Create Shipment** (consignee, address, COD yes/no).
* Choose method:

  * **Driver**: assign driver + vehicle, plan **stops** (multi-drop supported).
  * **3PL**: get quotes (rate card/API), pick carrier, book.

### B) Warehouse Handover

* **Scan Out** each **Carton QR** to link it to **Shipment** and mark `warehouse_out_at`.

### C) Driver App

* Start Trip (odometer start, fuel level).
* See stops list with maps & contact info.
* At each stop:

  * **Scan cartons** → mark **Delivered** or **Failed** (reason codes).
  * **POD**: photo, recipient name/signature, timestamp, geotag.
  * **COD**: collect amount; log **cash received** (with photo of receipt) or **GCash ref**.
* End Trip (odometer end).
* **Expenses**: fuel/toll/parking/repair with receipt photo.

### D) 3PL Flow

* API quote → **book** → get **waybill** / label.
* Status updates via **webhooks**; show on board.
* If **failed** attempt, set next attempt window.

### E) Client Portal

* Live tracking status (In Transit → Delivered).
* View POD, rate experience (1–5), add comment.

---

## 8.3 Data Model (SQL)

```sql
-- Vehicles (if not created yet)
create table vehicles (
  id uuid primary key,
  workspace_id uuid not null,
  plate_no text not null unique,
  type text,                        -- van/motorcycle/truck
  fuel_type text,
  odo_last int,
  active bool default true,
  created_at timestamptz default now()
);

-- Trips (for driver method)
create table trips (
  id uuid primary key,
  shipment_id uuid not null references shipments(id),
  driver_id uuid not null,
  vehicle_id uuid not null references vehicles(id),
  started_at timestamptz,
  ended_at timestamptz,
  odo_start int,
  odo_end int,
  status text default 'PLANNED',     -- PLANNED/IN_PROGRESS/COMPLETED/CANCELLED
  created_at timestamptz default now()
);

-- Trip stops (multi-drop)
create table trip_stops (
  id uuid primary key,
  trip_id uuid not null references trips(id),
  stop_no int not null,
  consignee_name text,
  address jsonb,
  phone text,
  eta timestamptz,
  arrived_at timestamptz,
  departed_at timestamptz,
  status text default 'PENDING',     -- PENDING/DELIVERED/FAILED
  fail_reason text,
  created_at timestamptz default now()
);

-- Link cartons to stops (for multi-drop)
create table stop_cartons (
  id uuid primary key,
  trip_stop_id uuid not null references trip_stops(id),
  carton_id uuid not null references cartons(id),
  scanned_out_at timestamptz,
  delivered_at timestamptz,
  failed_at timestamptz
);

-- Proof of delivery
create table pod_records (
  id uuid primary key,
  shipment_id uuid not null references shipments(id),
  trip_stop_id uuid,                 -- null for 3PL
  carton_id uuid,
  recipient_name text,
  signature_url text,
  photo_url text,
  geo jsonb,                         -- {lat,lon,accuracy}
  created_at timestamptz default now()
);

-- Driver expenses
create table trip_expenses (
  id uuid primary key,
  trip_id uuid not null references trips(id),
  type text not null,                -- FUEL/TOLL/PARKING/REPAIR/OTHER
  amount numeric not null,
  currency text default 'PHP',
  receipt_url text,
  created_at timestamptz default now()
);

-- 3PL bookings
create table carrier_bookings (
  id uuid primary key,
  shipment_id uuid not null references shipments(id),
  provider text not null,            -- LALAMOVE/GRAB/JNT/...
  quote jsonb,                       -- requested/returned rates
  booking_ref text,
  label_url text,
  status text default 'BOOKED',      -- BOOKED/PICKED_UP/IN_TRANSIT/DELIVERED/FAILED/CANCELLED
  webhook_payload jsonb,
  created_at timestamptz default now()
);

-- Optional GPS pings (if driver app reports)
create table gps_pings (
  id uuid primary key,
  trip_id uuid not null references trips(id),
  ts timestamptz not null,
  lat numeric not null,
  lon numeric not null,
  speed_kph numeric,
  battery_pct int
);
```

**Indexes**
`trips(shipment_id, driver_id, status)`
`trip_stops(trip_id, stop_no, status)`
`stop_cartons(trip_stop_id, carton_id)`
`carrier_bookings(shipment_id, provider, status)`

---

## 8.4 APIs

```
POST /shipments           // (Stage 7 already)
→ 201 { shipment_id }

POST /shipments/{id}/assign-driver
Body { driver_id, vehicle_id, stops:[{consignee,address,phone,carton_ids[]}] }
→ 200 { trip_id }

POST /warehouse/scan-out
Body { shipment_id, carton_id }
→ 200

POST /driver/trips/{trip_id}/start
Body { odo_start }
→ 200

POST /driver/trips/{trip_id}/scan
Body { trip_stop_id, carton_id }
→ 200 { status: "SCANNED_OUT" }

POST /driver/trips/{trip_id}/pod
Body { trip_stop_id, carton_id, recipient_name, signature_url?, photo_url?, geo? }
→ 201

POST /driver/trips/{trip_id}/deliver
Body { trip_stop_id, carton_ids:[...] }
→ 200 { stop_status: "DELIVERED" }

POST /driver/trips/{trip_id}/fail
Body { trip_stop_id, reason, carton_ids:[...] }
→ 200 { stop_status: "FAILED" }

POST /driver/trips/{trip_id}/expense
Body { type, amount, receipt_url? }
→ 201

POST /driver/trips/{trip_id}/end
Body { odo_end }
→ 200

POST /3pl/quote
Body { shipment_id, provider? }
→ 200 { options:[{provider,price,eta}] }

POST /3pl/book
Body { shipment_id, provider }
→ 201 { booking_id, waybill, label_url }
```

---

## 8.5 Calculations & Rules

* **Chargeable weight** per shipment: `max(actual_weight, dimensional_weight)` (computed at Stage 7 per carton; sum at shipment).
* **Driver cost model**: (km × fuel rate × adj) + (driver time × hourly) + tolls/parking – used for **Driver vs 3PL** comparison.
* **On-time KPI**: `delivered_at ≤ promised_date`.
* **Delivery success rate**: delivered / total attempts.
* **COD handling**:

  * Collected amount must equal **invoice balance** before shipment closes as **DELIVERED**.
  * On driver trip end: create **payment** (cash) record → Finance review & deposit reconciliation.

---

## 8.6 Ashley (AI) Checks

* **Method choice**: recommends **Driver vs 3PL** using cost & ETA.
* **Slot suggestion**: “Book Lalamove between 2–4 PM to avoid surge.”
* **Route optimization**: re-order stops for shortest travel time (if allowed).
* **Risk alerts**: heavy traffic / weather → ETA slips; auto-notify client with new ETA.
* **Failed delivery patterns**: flag addresses with repeated misses; suggest pre-call.

---

## 8.7 Events, Notifications, Edge Cases

**Events**
`ash.shipment.assigned`, `ash.trip.started`, `ash.carton.scanned_out`, `ash.stop.delivered`, `ash.stop.failed`, `ash.trip.ended`, `ash.carrier.webhook`

**Notifications**

* Client: “Out for delivery” → “Delivered (POD attached)”
* Manager: “Shipment failed at Stop 2 (reason: recipient unavailable). Reattempt tomorrow?”

**Edge cases**

* **Partial delivery**: some cartons delivered, others failed → keep trip open; schedule reattempt or split to new shipment.
* **Wrong carton scanned**: block if not in shipment.
* **Address correction**: coordinator edits stop address mid-trip; driver app fetches update.
* **3PL webhook retries**: idempotent upserts with provider event IDs.

---

## 8.8 Acceptance Tests

1. Create shipment → assign driver with two stops → scan-out cartons → deliver Stop 1 with POD → status moves to **IN\_TRANSIT/DELIVERED (Stop 1)**.
2. Stop 2 fails → reason logged; shipment remains **IN\_TRANSIT** with pending cartons.
3. End trip → trip expenses recorded; Finance sees COD cash pending deposit.
4. 3PL booking returns waybill & label; webhook updates shipment to **DELIVERED**.
5. Ashley suggests 3PL over Driver when volumetric weight makes in-house cost higher.

---

# 🔹 Stage 9 – Finance (Developer Spec)

## 9.1 Actors & Permissions

* **Finance/Accounting**: invoices, receipts/payments, AP bills, refunds, payroll review, exports.
  Scopes: `ar.create`, `ar.apply_payment`, `ap.create`, `ap.pay`, `refund.create`, `export.gl`
* **Manager**: approvals over thresholds.
  Scopes: `finance.approve`
* **Admin**: tax tables, rates, lock periods.
  Scopes: `finance.settings`
* **Ashley (AI)**: margin & cashflow forecasts, channel P\&L, variance alerts.

---

## 9.2 UX / Modules

### A) AR (Accounts Receivable)

* **Invoices**: create from PO (or multiple POs), add lines (products/services), tax mode (VAT inc/ex), discounts.
* **Payments**: apply cash/bank/GCash/Stripe; support **partial** payments; allocate across invoices.
* **Credit Notes / Refunds**: create against invoices; reason codes.
* **Aging Report**: 0–30, 31–60, 61–90, 90+; with brand & client filters.

### B) AP (Accounts Payable)

* **Bills**: supplier invoices (fabric, ink, utilities, 3PL).
* **Payments**: schedule & pay vendors; attach receipts.
* **Withholding** (PH optional): compute and store 2307 data.

### C) Costing & P\&L

* **PO Cost Sheet**: BOM + labor (payroll accruals) + overhead → **COGS**.
* **Brand/Channel P\&L**: revenue – COGS – returns – platform fees – ad spend.
* **Settlement Imports**: Shopee/TikTok statements → fees & payouts.

### D) Payroll Integration (from HR)

* **Payroll Runs** feed **labor cost** into COGS by PO/brand/month.

### E) Compliance & Exports

* **BIR-style exports** (sales book, purchases book), **SSS/PhilHealth/Pag-IBIG** schedules, **CSV/Excel** for GL.

---

## 9.3 Data Model (SQL)

```sql
-- Clients & Suppliers (if not already)
create table suppliers (
  id uuid primary key,
  workspace_id uuid not null,
  name text not null,
  tin text,
  emails jsonb,
  phones jsonb,
  address jsonb,
  created_at timestamptz default now()
);

-- Invoices (AR)
create table invoices (
  id uuid primary key,
  workspace_id uuid not null,
  brand_id uuid not null,
  client_id uuid not null,
  order_id uuid,                        -- nullable for consolidated invoices
  invoice_no text unique not null,      -- BRAND-YYYY-#####
  date_issued date not null,
  due_date date,
  currency text default 'PHP',
  tax_mode text default 'VAT_INCLUSIVE',-- VAT_INCLUSIVE/VAT_EXCLUSIVE/NON_VAT
  status text default 'OPEN',           -- OPEN/PARTIAL/PAID/VOID
  subtotal numeric not null default 0,
  discount numeric not null default 0,
  vat_amount numeric not null default 0,
  total numeric not null default 0,
  balance numeric not null default 0,
  meta jsonb,
  created_at timestamptz default now()
);

create table invoice_lines (
  id uuid primary key,
  invoice_id uuid not null references invoices(id),
  description text not null,
  qty numeric not null,
  uom text,
  unit_price numeric not null,
  tax_rate numeric default 12,          -- %
  line_total numeric not null
);

-- Payments & allocations
create table payments (
  id uuid primary key,
  workspace_id uuid not null,
  payer_type text not null,             -- CLIENT/PLATFORM
  client_id uuid,
  source text not null,                 -- CASH/BANK/GCASH/STRIPE/SHOPEE/TIKTOK
  ref_no text,
  amount numeric not null,
  currency text default 'PHP',
  received_at timestamptz not null,
  created_at timestamptz default now()
);

create table payment_allocations (
  id uuid primary key,
  payment_id uuid not null references payments(id),
  invoice_id uuid not null references invoices(id),
  amount numeric not null
);

-- AP Bills
create table bills (
  id uuid primary key,
  workspace_id uuid not null,
  brand_id uuid,
  supplier_id uuid not null references suppliers(id),
  bill_no text,
  date_received date not null,
  due_date date,
  currency text default 'PHP',
  subtotal numeric not null default 0,
  vat_amount numeric not null default 0,
  total numeric not null default 0,
  status text default 'OPEN',           -- OPEN/PARTIAL/PAID
  meta jsonb,
  created_at timestamptz default now()
);

create table bill_lines (
  id uuid primary key,
  bill_id uuid not null references bills(id),
  description text not null,
  qty numeric not null,
  unit_cost numeric not null,
  tax_rate numeric default 12,
  line_total numeric not null
);

-- Costing / COGS by order
create table po_costs (
  id uuid primary key,
  order_id uuid not null,
  materials_cost numeric default 0,
  labor_cost numeric default 0,
  overhead_cost numeric default 0,
  returns_cost numeric default 0,
  cogs numeric default 0,               -- materials + labor + overhead - adjustments
  updated_at timestamptz default now()
);

-- Channel settlements (e.g., Shopee/TikTok)
create table channel_settlements (
  id uuid primary key,
  workspace_id uuid not null,
  brand_id uuid,
  channel text not null,
  period_start date,
  period_end date,
  gross_sales numeric not null,
  platform_fees numeric not null,
  shipping_fees numeric,
  ads_spend numeric,
  net_payout numeric not null,
  payout_date date,
  ref_file_url text,
  created_at timestamptz default now()
);
```

**Indexes**
`invoices(brand_id, client_id, status, date_issued)`
`payments(source, received_at)`
`payment_allocations(invoice_id)`
`bills(supplier_id, status, due_date)`
`po_costs(order_id)`
`channel_settlements(brand_id, channel, period_start, period_end)`

---

## 9.4 APIs

```
POST /finance/invoices
Body {
  brand_id, client_id, order_id?,
  lines:[{description, qty, unit_price, tax_rate?}],
  discount?, tax_mode?, due_date?
}
→ 201 { invoice_id, invoice_no, totals }

POST /finance/payments
Body {
  payer_type, client_id?, source, ref_no?, amount, received_at
}
→ 201 { payment_id }

POST /finance/payments/{payment_id}/allocate
Body { allocations:[{invoice_id, amount}, ...] }
→ 200 { updated_balances: [...] }

POST /finance/bills
Body {
  supplier_id, brand_id?, lines:[{description, qty, unit_cost, tax_rate?}],
  due_date?
}
→ 201 { bill_id }

POST /finance/costs/po/{order_id}/recompute
→ 200 { materials_cost, labor_cost, overhead_cost, cogs }

POST /finance/settlements/import
Body { brand_id, channel, period_start, period_end, ref_file_url }
→ 201 { settlement_id }
```

---

## 9.5 Calculations & Rules

**A) Invoice totals**

* `line_total = qty × unit_price`
* `subtotal = Σ line_total`
* `vat_amount`

  * If `VAT_INCLUSIVE`: `vat = subtotal × (rate / (100 + rate))`
  * If `VAT_EXCLUSIVE`: `vat = subtotal × (rate/100)`
* `total = subtotal + (VAT_EXCLUSIVE ? vat : 0) - discount`
* `balance = total - Σ allocations`

**B) AR Aging**

* Bucket by `due_date` vs **today**: 0–30 / 31–60 / 61–90 / 90+.

**C) PO Costing (cogs)**

* `materials_cost` = Σ inventory issues (fabric/ink/etc.) to the order at **standard cost** or **batch actual**.
* `labor_cost` = Σ payroll accruals from **sewing\_runs** (and optionally printing) mapped to the order.
* `overhead_cost` = allocation rule (e.g., rate per labor minute or % of materials).
* `cogs = materials + labor + overhead − returns_adjustments`.

**D) Channel P\&L**

* `Gross Margin = Revenue − COGS`
* `Channel P&L = Gross Margin − platform_fees − shipping_fees − ads_spend`.

**E) Cashflow Forecast (30/60/90)**

* Inflows: **open invoices** expected on **due\_date** (probability-weighted by client payment behavior).
* Outflows: **open bills**, **payroll** (per schedule), **rent/utilities** recurring.
* Net cash at horizon = `opening_cash + Σ inflows − Σ outflows`.

**F) Withholding (optional PH)**

* For supplier bills marked **subject\_to\_wht**, compute WHT at rate table; generate 2307 CSV.

---

## 9.6 Ashley (AI) Insights

* **Margin erosion**: alerts when actual **COGS** > estimated; show variance by materials/labor/overhead.
* **Cash gap**: predicts negative balance in T+N days; suggests actions (collect AR, delay AP, request deposit).
* **Client risk**: late payment pattern → recommend **proforma invoice** or higher deposit next time.
* **Channel ROI**: highlights unprofitable channels/campaigns; suggests budget reallocation.
* **Price floor**: warns CSR if quoted price < cost + min margin (brand policy).

---

## 9.7 Events, Notifications, Edge Cases

**Events**
`ash.invoice.created`, `ash.payment.received`, `ash.payment.allocated`, `ash.bill.created`, `ash.costs.po.recomputed`, `ash.settlement.imported`

**Notifications**

* Finance: “Invoice REEF-2025-00321 due tomorrow (₱124,500).”
* Manager: “PO#00123 margin dropped to 22% (< 28% floor) due to labor overrun.”

**Edge Cases**

* **Currency**: default PHP; allow FX for export clients with stored FX rate on invoice date.
* **Over-allocation**: block if allocation > invoice balance.
* **Refunds**: produce **credit note**; if cash refund, create **negative payment** row linked to payout.
* **Lock period**: prevent edits to closed months; require Admin unlock with audit reason.
* **Settlement mismatch**: if platform payout < expected, open a **variance task**.

---

## 9.8 Acceptance Tests

1. Create invoice from PO → totals computed (VAT inc/ex handling correct), `balance = total`.
2. Record payment → allocate partial to two invoices → balances updated, statuses reflect **PARTIAL/PAID**.
3. Import Shopee settlement → fees captured; Channel P\&L recomputed for period.
4. Recompute PO costs after payroll run → COGS updated; margin report reflects change.
5. Ashley cashflow forecast turns **RED** when outflows exceed inflows in 30 days; reminder sent.

---

## 🔗 Stage 8 ↔ Stage 9 Hand-off

* **Delivery → Finance**

  * On **Delivered** (with POD): auto-trigger **invoice generation** (if not issued).
  * **COD**: driver cash/GCash becomes **payment** pending Finance verification; upon approval, allocate to invoice.
  * **Failed delivery**: no invoice; if pre-invoiced, keep **unearned** flag until success.
  # 🔹 Stage 10 – HR (Attendance, Payroll, Compliance) — Developer Spec

## 10.1 Actors & Permissions

* **HR Staff**: manage employees, shifts, leaves, time corrections, payroll runs.
  Scopes: `hr.employee.manage`, `hr.attendance.approve`, `hr.payroll.run`, `hr.payroll.adjust`
* **Managers/Leads**: approve OT/leave, see team attendance, request payroll delegation when needed.
  Scopes: `hr.attendance.view`, `hr.leave.approve`, `payroll.run` (via delegation)
* **Employees/Operators**: clock in/out, view payslips, request corrections/leaves.
  Scopes: `self.attendance.log`, `self.payslip.view`, `self.leave.request`
* **Finance**: review payroll journal, post to GL, disburse.
  Scopes: `finance.payroll.review`, `finance.disburse`
* **Ashley (AI)**: fatigue/OT risk, anomaly detection, training suggestions, cost projections.

---

## 10.2 UX / Flows

### A) Employee Master

* Profile: name, contact, role, brand assignments, department, rate type (hourly/daily/piece-rate/mixed), base rates & allowances, bank/GCash info, emergency contact.
* Documents: IDs, contracts, NDAs (file links).
* Status: Active/Inactive; effectivity dates.

### B) Attendance Capture (PWA, offline-first)

Supported methods (enable per site/role):

* **QR/NFC kiosk** (tablet at gate)
* **Face/selfie + geofence** (optional, privacy-aware)
* **Supervisor batch clock** (line leader clocks a team on shared device)
* **Webhook** (from turnstile or biometric device if available)

Clock States & Rules:

* Clock-in/out, break-start/end; geofence & selfie verification if enabled.
* Offline queue → sync when online; conflict resolution (first-write wins with HR override).

### C) Time Corrections & Overtime

* Employee files a **Time Correction** (TC) with photo/note; manager approves.
* OT requests with reason; pre-approval route configurable per brand/site.
* Night diff/holiday premiums pulled from **rate tables** (configurable; not hardcoded law).

### D) Leaves

* Balances per type (SL/VL/EL/Unpaid); accrual rules per brand.
* Request → Approve/Reject → post to attendance with appropriate pay code.

### E) Payroll Run (Cutoff-based)

* Choose Pay Period (e.g., **1–15**, **16–EOM**).
* **Compile**: attendance, leaves, OT, night diff, holiday, **piece-rate accruals** (from Sewing/Printing runs), fixed allowances, loans, deductions.
* **Preview**: per-employee line items, variances vs prior run.
* **Adjust**: ad-hoc earnings/deductions (e.g., per diem, tardiness penalty).
* **Lock & Generate Payslips** (PDF) + **Exports** (CSV bank file, GCash disbursement, journal).
* **Post to Finance**: payroll expense & liabilities; map labor cost to **PO/brand** (for COGS).

---

## 10.3 Data Model (SQL)

```sql
-- Employees
create table employees (
  id uuid primary key,
  workspace_id uuid not null,
  brand_ids uuid[] default '{}',
  role text not null,                -- OPERATOR/SEWER/PRINTER/QC/CSR/FINANCE/MANAGER
  name text not null,
  email text,
  phone text,
  address jsonb,
  status text default 'ACTIVE',
  hire_date date,
  separation_date date,
  pay_type text not null,            -- HOURLY/DAILY/PIECE/MIXED
  base_rate numeric,                 -- hourly/daily base (nullable if PIECE only)
  bank_info jsonb,                   -- {bank,acct_no} or {gcash_no}
  meta jsonb,                        -- {gov_ids:{sss,philhealth,pagibig}}
  created_at timestamptz default now()
);

-- Attendance
create table attendance_logs (
  id uuid primary key,
  employee_id uuid not null references employees(id),
  ts timestamptz not null,
  type text not null,                -- IN/OUT/BREAK_START/BREAK_END
  source text,                       -- KIOSK/MOBILE/SUPERVISOR/WEBHOOK
  geo jsonb,
  selfie_url text,
  device_id text,
  approved bool default true,
  created_at timestamptz default now()
);

-- Time corrections & OT
create table time_corrections (
  id uuid primary key,
  employee_id uuid not null,
  date date not null,
  reason text,
  requested_by uuid not null,
  status text default 'PENDING',     -- PENDING/APPROVED/REJECTED
  approver_id uuid,
  attachments jsonb,
  created_at timestamptz default now()
);

create table overtime_requests (
  id uuid primary key,
  employee_id uuid not null,
  date date not null,
  hours numeric not null,
  reason text,
  status text default 'PENDING',
  approver_id uuid,
  created_at timestamptz default now()
);

-- Leave management
create table leave_types (
  id uuid primary key,
  workspace_id uuid not null,
  code text not null,                -- SL/VL/EL/UP
  name text not null,
  paid bool default true,
  accrual_rule jsonb                 -- {"per_month":1.25,"max_carryover":5}
);

create table leave_balances (
  id uuid primary key,
  employee_id uuid not null,
  leave_type_id uuid not null,
  balance numeric not null default 0,
  as_of date not null
);

create table leave_requests (
  id uuid primary key,
  employee_id uuid not null,
  leave_type_id uuid not null,
  start_date date not null,
  end_date date not null,
  reason text,
  status text default 'PENDING',     -- PENDING/APPROVED/REJECTED
  approver_id uuid,
  created_at timestamptz default now()
);

-- Rate tables (premiums/holidays)
create table pay_rate_tables (
  id uuid primary key,
  workspace_id uuid not null,
  effective_from date not null,
  data jsonb not null                -- {ot_multiplier:1.25, restday_ot:1.3, night_diff:0.1, holiday:{regular:2.0,special:1.3}}
);

-- Payroll
create table payroll_periods (
  id uuid primary key,
  workspace_id uuid not null,
  period_code text not null,         -- 2025-09A (1-15), 2025-09B (16-EOM)
  start_date date not null,
  end_date date not null,
  pay_date date not null,
  status text default 'OPEN'         -- OPEN/LOCKED/POSTED
);

create table payroll_earnings (
  id uuid primary key,
  period_id uuid not null references payroll_periods(id),
  employee_id uuid not null,
  type text not null,                -- BASIC/OT/NIGHT/ALLOWANCE/PIECE/DIFF/HOLIDAY/LEAVE/ADJ
  amount numeric not null,
  qty numeric,
  meta jsonb                         -- details per line
);

create table payroll_deductions (
  id uuid primary key,
  period_id uuid not null,
  employee_id uuid not null,
  type text not null,                -- LATE/ABSENT/SSS/PH/HDMF/TAX/LOAN/OTHER
  amount numeric not null,
  meta jsonb
);

create table payroll_runs (
  id uuid primary key,
  period_id uuid not null,
  status text default 'DRAFT',       -- DRAFT/FINALIZED/SENT/PAID/POSTED
  totals jsonb,                      -- {gross, deductions, net}
  created_by uuid,
  created_at timestamptz default now()
);

create table payslips (
  id uuid primary key,
  run_id uuid not null references payroll_runs(id),
  employee_id uuid not null,
  gross numeric not null,
  deductions numeric not null,
  net numeric not null,
  pdf_url text,
  created_at timestamptz default now()
);
```

> Piece-rate accruals from **Stage 5 (Sewing)** and relevant printing runs should already be stored per run; during **Compile**, we aggregate them into `payroll_earnings` with type `PIECE`.

---

## 10.4 APIs

```
POST /hr/employees               → create/update profiles
POST /hr/attendance/clock        → {employee_id, type, geo?, selfie_url?}
POST /hr/attendance/correction   → create TC; approve/reject
POST /hr/overtime                → request; approve/reject
POST /hr/leave                   → request; approve/reject
GET  /hr/periods/current         → returns active period
POST /hr/payroll/compile         → {period_id} → aggregates attendance+piece
POST /hr/payroll/adjust          → add earning/deduction line
POST /hr/payroll/finalize        → locks lines + generates payslips PDFs
POST /hr/payroll/export          → {format:"BANK_CSV"|"GCASH"|"GL_CSV"}
POST /hr/payroll/post-to-finance → creates journal; distributes labor to COGS
```

---

## 10.5 Calculations & Rules

**A) Work time**

* Per day: `(ClockOut − ClockIn) − breaks` (guard against overlaps & duplicates).
* Late/Early/Absence from schedule definitions (shift templates per role/site).

**B) Premiums** (from `pay_rate_tables`)

* OT pay = `OT hours × base_hourly × ot_multiplier`
* Night diff = `night_hours × base_hourly × night_diff`
* Holiday = according to configured multipliers (regular/special); stack with OT where policy allows.

**C) Piece-rate**

* From `sewing_runs` (and optional printing runs), group by employee & period:
  `piece_pay = Σ(qty_good × op_rate)`
* Optionally enforce **min guarantee** (if net piece < daily minimum).

**D) Gov contributions & tax**

* **SSS/PhilHealth/Pag-IBIG** and **withholding tax** computed from **configurable rate tables** with **effective dates**; do **not hardcode** statutory numbers (they change).
* Ashley alerts if new tables are uploaded/updated.

**E) Net pay**
`Gross = Σ earnings`
`Deductions = Σ statutory + loans/advances/others`
`Net = Gross − Deductions`

**F) Cost allocation to COGS**

* Option 1 (accurate): allocate labor to orders using **run meta** (minutes/SMV per PO).
* Option 2 (simple): allocate by brand proportionally to output qty for the period.

---

## 10.6 Ashley (AI) Checks

* **Fatigue risk**: consecutive long shifts or OT > threshold → prompt manager.
* **Anomaly**: clock entries far outside geofence/schedule → flag for review.
* **Under/over productivity**: compare piece-rate earnings vs expected baseline.
* **Cost projection**: before cutoff, forecast payroll cost vs cashflow (Stage 9) and warn if tight.
* **Training suggestions**: link high reject rates to specific operators/ops and propose training tasks.

---

## 10.7 Events, Notifications, Edge Cases

**Events**
`ash.hr.clock`, `ash.hr.tc.created`, `ash.hr.ot.approved`, `ash.hr.leave.approved`,
`ash.payroll.compiled`, `ash.payroll.finalized`, `ash.payroll.posted`

**Notifications**

* Manager: “OT request awaiting approval for 3 staff (today 5PM).”
* HR: “Payroll preview variance +18% vs last period.”
* Employee: “Payslip ready.”

**Edge Cases**

* **Offline clocks**: queue with device timestamp, mark `source='OFFLINE'`.
* **Duplicate clocks**: auto-merge heuristics; HR can fix.
* **Backpay/retro**: allow adjustments tied to prior period with audit.
* **Delegation**: Admin grants `payroll.run` to Manager temporarily (as we designed).

---

## 10.8 Acceptance Tests

1. Compile payroll → earnings include piece-rate + OT/night/holiday correctly from tables.
2. Finalize run → payslips generated; edits blocked unless run reopened by Admin.
3. Export **BANK\_CSV/GCASH** files validate against sample templates.
4. Post to Finance → creates payroll expense & liabilities; labor pushes to **PO COGS** correctly.
5. Ashley flags employee far from geofence at clock-in and marks entry for HR review.

---

# 🔹 Stage 11 – Maintenance (Machines & Vehicles) — Developer Spec

## 11.1 Actors & Permissions

* **Maintenance Tech / Mechanic**: log PM/repairs, parts used, close work orders (WOs).
  Scopes: `mnt.wo.create`, `mnt.wo.complete`, `mnt.parts.consume`
* **Planner**: create schedules (time-based & meter-based), assign WOs, set service vendors.
  Scopes: `mnt.schedule.manage`, `mnt.assign`
* **Driver/Operator**: submit fault reports, odometer/runtime updates, upload photos.
  Scopes: `mnt.report.issue`, `mnt.update.meter`
* **Finance**: review costs, capitalize if needed, post to GL.
  Scopes: `finance.mnt.review`
* **Ashley (AI)**: failure prediction, PM reminders, warranty/registration/insurance alerts.

---

## 11.2 UX / Flows

### A) Asset Registry

* **Machines**: embroidery heads, heat presses, dryers, printers, compressors.
* **Vehicles**: plate, brand/model, fuel, renewal dates (registration/insurance).
* **Meters**: hour meter, stitch counter, press cycles, odometer; update via operator or automatic (if device API).

### B) Schedules & Work Orders

* **Time-based PM**: every N months (e.g., oil change every 6 months).
* **Meter-based PM**: every X hours/cycles/stitches/km.
* System **auto-creates Work Orders** (WO) when due or predicted.
* Planner assigns WO to tech or vendor; sets due date and priority.

### C) Fault/Breakdown

* Any user can **Report Issue** with photo/video; creates **Corrective WO**.
* SLA timers; Ashley suggests severity & potential root cause from history.

### D) Execute WO

* Tech starts WO, logs **labor hours**, **parts used** (inventory deduction), **notes**, **photos**.
* Close WO → prompts meter update & test run.
* For vehicles: log **fuel**, **toll**, **repairs** (already integrated in Stage 8 trips).

---

## 11.3 Data Model (SQL)

```sql
-- Assets
create table assets (
  id uuid primary key,
  workspace_id uuid not null,
  type text not null,                 -- MACHINE/VEHICLE
  name text not null,
  brand text,
  model text,
  serial_no text,
  plate_no text,                      -- for vehicles
  purchase_date date,
  warranty_until date,
  registration_due date,              -- vehicles
  insurance_due date,                 -- vehicles
  meters jsonb,                       -- {"hours":0,"stitches":0,"cycles":0,"odometer":0}
  location text,
  status text default 'ACTIVE',       -- ACTIVE/IN_REPAIR/RETIRED
  created_at timestamptz default now()
);

-- Meter updates
create table meter_logs (
  id uuid primary key,
  asset_id uuid not null references assets(id),
  ts timestamptz not null,
  meters jsonb not null               -- delta or absolute per key
);

-- PM schedules
create table pm_schedules (
  id uuid primary key,
  asset_id uuid not null references assets(id),
  type text not null,                 -- TIME/METER
  interval jsonb not null,            -- {"months":6} or {"hours":200} or {"km":5000}
  task_list jsonb not null,           -- ["Change oil","Check tension","Clean nozzles"]
  last_done_at timestamptz,
  next_due_at timestamptz
);

-- Work orders
create table work_orders (
  id uuid primary key,
  asset_id uuid not null,
  kind text not null,                 -- PM/CORRECTIVE/INSPECTION
  source text,                        -- SCHEDULE/REPORT/PREDICTED
  title text not null,
  description text,
  priority text default 'MEDIUM',
  status text default 'OPEN',         -- OPEN/IN_PROGRESS/ON_HOLD/DONE/CANCELLED
  reported_by uuid,
  assigned_to uuid,
  due_date date,
  created_at timestamptz default now(),
  closed_at timestamptz
);

-- WO labor & parts
create table wo_labor (
  id uuid primary key,
  wo_id uuid not null references work_orders(id),
  tech_id uuid not null,
  hours numeric not null,
  rate numeric,
  cost numeric
);

create table wo_parts (
  id uuid primary key,
  wo_id uuid not null references work_orders(id),
  item_id uuid not null,              -- inventory item
  qty numeric not null,
  uom text,
  cost numeric,                       -- standard or actual
  batch_id uuid,                      -- inventory batch
  created_at timestamptz default now()
);

-- Downtime tracking
create table downtime_logs (
  id uuid primary key,
  asset_id uuid not null,
  wo_id uuid,
  started_at timestamptz,
  ended_at timestamptz,
  reason text
);
```

**Indexes**
`assets(type,status,registration_due,insurance_due)`
`pm_schedules(asset_id,next_due_at)`
`work_orders(status,priority,due_date,asset_id)`
`downtime_logs(asset_id,started_at)`

---

## 11.4 APIs

```
POST /mnt/assets                  → create/update assets
POST /mnt/assets/{id}/meter       → log meter update
POST /mnt/pm/schedules            → create PM schedule
POST /mnt/wo                      → create WO (PM or Corrective)
POST /mnt/wo/{id}/assign          → assign tech/vendor
POST /mnt/wo/{id}/start           → start WO (status=IN_PROGRESS)
POST /mnt/wo/{id}/labor           → add labor line
POST /mnt/wo/{id}/parts           → consume parts (deduct inventory)
POST /mnt/wo/{id}/close           → close WO; auto update pm_schedules.next_due_at
POST /mnt/downtime                → start/stop downtime timer
```

---

## 11.5 Calculations & Rules

**A) Next Due (Time-based)**
`next_due_at = last_done_at + interval.months` (or weeks/days)

**B) Next Due (Meter-based)**

* For each meter key (hours/cycles/km), due when `current_meter − last_done_meter >= interval.value`.
* Ashley projects date of due using **usage rate** (moving average of recent meter logs).

**C) WO Cost**
`wo_total = Σ parts.cost + Σ labor.cost`

* Post to Finance as **Repair & Maintenance expense** (or **CapEx** if policy says capitalize).

**D) Downtime**
`downtime_hours = (ended_at − started_at)` per WO → asset availability KPI.

---

## 11.6 Ashley (AI) Predictions & Alerts

* **Predictive PM**: if stitch-breaks or print head clogs trend upward, bring PM forward.
* **Registration/Insurance**: 30/15/7/1-day reminders for vehicles.
* **Battery/consumables**: model expected replacement from historical intervals.
* **Vendor choice**: recommend supplier for parts based on price/lead time history.
* **Cost anomaly**: alert when WO cost deviates > X% from median for same task.

---

## 11.7 Events, Notifications, Edge Cases

**Events**
`ash.mnt.asset.created`, `ash.mnt.pm.due`, `ash.mnt.wo.opened`, `ash.mnt.wo.closed`, `ash.mnt.downtime.logged`

**Notifications**

* Planner: “PM due this week for 3 assets; predicted downtime 6h.”
* Driver: “Vehicle ABC-123 registration due in 7 days.”
* Finance: “WO #1023 exceeded typical cost by 42%.”

**Edge Cases**

* **Meter rollback** (wrong input): require manager correction with audit.
* **Parts not in stock**: auto-create **PR** to Purchasing; block WO close until resolved or override set.
* **Warranty active**: Ashley suggests **vendor warranty claim** route instead of internal repair.
* **Concurrent WOs** on same asset: block start if a **blocking** WO is still open (configurable).

---

## 11.8 Acceptance Tests

1. Create machine & PM schedule (200-hour interval) → meter updates predict next due; WO auto-created at threshold.
2. Close WO with labor & parts → inventory deducted; cost posted to Finance.
3. Vehicle registration due within 7 days → Ashley sends reminders to Driver & Admin.
4. Record downtime around WO → asset availability KPI computed.
5. Parts out-of-stock on WO → PR created; WO cannot close without override.

---

## 🔗 Stage 10 ↔ Stage 11 ↔ Finance/Production

* **HR → Finance**: Payroll postings (liabilities/expenses) & labor cost allocated to **PO COGS**.
* **Maintenance → Finance**: WO costs posted; large repairs optionally capitalized per policy.
* **Maintenance → Production**: Assets in **IN\_REPAIR** reduce available capacity; planner re-schedules routing steps; Ashley recomputes critical path & ETA.
# 🔹 Stage 12 – Client Portal (Tracking, Approvals, Payments, Reorders)

## 12.1 Actors & Permissions

* **Client (Portal user)**: view orders, approve designs, pay invoices, reorder, message CSR.
  Scopes (portal-only): `portal.order.view`, `portal.design.approve`, `portal.invoice.pay`, `portal.reorder`
* **CSR/Manager**: impersonate/read-only for support; send links.
  Scopes: `portal.support.view`, `portal.link.issue`
* **Ashley (AI)**: suggest upsells, nudge late approvals, detect churn risk.

## 12.2 UX / Flows

* **Access**: magic-link email/SMS (no password) or SSO (optional). Brand-themed UI.
* **Order Tracker**: timeline (Design → Cutting → Printing/Emb → Sewing → QC → Packing → Delivery).
* **Design Approval**: preview mockup (zoom), Approve/Request Changes + comment, e-sign if required.
* **Invoices & Payments**: list invoices; pay via **GCash / cards (Stripe/PayMongo)**; partial payments allowed.
* **Reorder**: 1-click reorder from past POs (edit qty/size curve/colorway); Ashley proposes defaults.
* **Messaging**: chat with CSR (attachments allowed); SLA timer & canned replies.
* **Notifications**: email/SMS/Messenger for key events (design ready, shipped, payment posted).

## 12.3 Data Model (SQL)

```sql
create table portal_sessions (
  id uuid primary key,
  client_id uuid not null,
  brand_id uuid not null,
  token text not null unique,
  expires_at timestamptz not null,
  created_at timestamptz default now(),
  used_at timestamptz
);

create table portal_messages (
  id uuid primary key,
  order_id uuid,
  client_id uuid,
  csr_id uuid,
  sender text not null,              -- CLIENT/CSR/SYSTEM
  body text,
  file_url text,
  created_at timestamptz default now()
);

create table portal_events (
  id uuid primary key,
  client_id uuid not null,
  order_id uuid,
  type text not null,                -- VIEWED_ORDER/APPROVED_DESIGN/PAID_INVOICE/REORDER_STARTED
  meta jsonb,
  created_at timestamptz default now()
);

-- client communication preferences
create table comm_prefs (
  id uuid primary key,
  client_id uuid not null,
  brand_id uuid,
  channel text not null,             -- EMAIL/SMS/MESSENGER
  opt_in bool default true,
  quiet_hours jsonb                  -- {"start":"21:00","end":"08:00","tz":"Asia/Manila"}
);
```

## 12.4 APIs

```
POST /portal/session/request
Body { client_id, brand_id, channel:"EMAIL"|"SMS" }
→ 200 (magic-link sent)

GET  /portal/orders/{order_id}           → portal-safe order detail + timeline
POST /portal/designs/{approval_id}/approve
POST /portal/designs/{approval_id}/changes { comments }

GET  /portal/invoices?status=open        → list
POST /portal/payments/checkout
Body { invoice_id, amount, method:"GCASH"|"CARD" }
→ 201 { checkout_url } (webhook for success)

POST /portal/reorders
Body { source_order_id, qty, size_curve?, colorways? }
→ 201 { new_order_id, status:"INTAKE" }

POST /portal/messages
Body { order_id, body, file_url? }       → 201
```

## 12.5 Validations & Rules

* **Magic links**: single-use, 30–60 min TTL, brand-scoped; rotate on use.
* **Approvals**: update `design_approvals` + `design_assets.status`; lock on production start.
* **Payments**: on webhook `SUCCESS`, create `payments` row and allocate to invoice; partial allowed.
* **Reorder**: clones PO header (brand/client/method/placements) with editable qty/curve; Ashley checks capacity & BOM.

## 12.6 Ashley (AI)

* **Nudges**: client hasn’t approved after N days → polite reminder; offer timeslot for quick call.
* **Upsell**: based on brand history → recommend complementary items (e.g., caps with hoodies).
* **Churn signal**: declining order frequency → suggest reactivation promo to CSR.

## 12.7 Events, Edge Cases, Acceptance Tests

* **Events**: `ash.portal.link.sent`, `ash.portal.design.approved`, `ash.portal.payment.success`, `ash.portal.reorder.created`
* **Edge**: expired link → regenerate; refunds → show credit note; multi-brand clients see only their brand scope.
* **Tests**:

  1. Magic link grants access only to the brand’s orders.
  2. Approval updates order status and locks version.
  3. GCash/Stripe webhook creates payment & reduces invoice balance.
  4. Reorder clones PO, passes Ashley intake checks.

---

# 🔹 Stage 13 – Merchandising AI (Reprint Advisor & Theme Recommender)

## 13.1 Purpose

Turn sales history + design performance into **actionable merchandising**:

* What to **reprint** (qty/size curve/color split)
* What **theme to design next** (style/palette/placement) from a best-seller image

## 13.2 Inputs & Signals

* `sales_orders`, `live_sales`, `channel_settlements` (velocity, returns, margin, fees)
* `design_assets` + `design_versions` (placements, palette)
* Inventory & capacity (for feasible recommendations)
* Seasonality/calendar (drops, holidays)

## 13.3 Data Model (SQL)

```sql
create table design_performance (
  id uuid primary key,
  design_asset_id uuid not null,
  brand_id uuid not null,
  period_start date not null,
  period_end date not null,
  units_sold int not null,
  returns int default 0,
  gross_revenue numeric not null,
  cogs numeric not null,
  margin numeric not null,
  channels jsonb,                     -- {"tiktok": %, "shopee": %, "direct": %}
  sell_through_days int,
  updated_at timestamptz default now()
);

create table reprint_recommendations (
  id uuid primary key,
  design_asset_id uuid not null,
  brand_id uuid not null,
  recommended_qty int not null,
  size_curve jsonb not null,
  color_split jsonb,                   -- {"Black":300,"White":150}
  bom jsonb,                           -- materials & est. cost
  forecast_margin numeric,
  rationale text,
  status text default 'DRAFT',         -- DRAFT/ACCEPTED/REJECTED
  created_at timestamptz default now()
);

create table theme_recommendations (
  id uuid primary key,
  source_design_asset_id uuid not null,
  brand_id uuid not null,
  theme_tags text[],                   -- ["retro","street","lineart"]
  palette jsonb,                       -- ["#141414","#eaeaea","#19e5a5"]
  placement text,                      -- FRONT/LCH/ALL-OVER
  suggested_products text[],           -- ["oversized tee","hoodie"]
  test_run_qty int,
  rationale text,
  assets jsonb,                        -- generated moodboard links or prompt refs
  status text default 'DRAFT',
  created_at timestamptz default now()
);
```

## 13.4 APIs

```
POST /merch/reprint/suggest
Body { design_asset_id, horizon_days?:90 }
→ 201 { recommendation_id }

POST /merch/theme/suggest
Body { source_design_asset_id, image_url? }  // image optional if design exists
→ 201 { recommendation_id }

POST /merch/recommendations/{id}/accept   → 200
POST /merch/recommendations/{id}/reject   → 200
```

## 13.5 Methods (pragmatic v1, ML-ready)

**A) Reprint Qty**

* **Velocity**: EMA or 4–8 week moving average; adjust for seasonality (holiday multipliers).
* **Service level**: choose target stock-out risk (e.g., 90%); compute suggested qty = `forecast_demand − on_hand + safety_stock`.
* **Size curve**: weighted average of last N orders for this design/product/region.
* **Color split**: last N’s distribution; bias to top 2 colors; cap tail colors.
* **Feasibility**: check capacity and lead times; split into batches if needed.

**B) BOM & Margin**

* BOM from product template + placements + ink/film/thread estimators (from Stages 4/5).
* COGS = materials + labor + overhead; **Forecast margin** = `(price − COGS)/price`.
* Block if below brand’s **margin floor**.

**C) Theme Recommendation**

* Extract **visual features** (palette, contrast, motifs) via embeddings (e.g., CLIP) — store tags.
* Match against **trending tags** (internal sales + public trend list you curate).
* Output: theme tags, palette, placements, product suggestions, **test\_run\_qty** (e.g., 120 pcs).
* Attach **prompt/moodboard** links for GA.

## 13.6 Ashley (AI) Behavior

* Triggers automatically when a design hits **best-seller** thresholds (sell-through days < X, margin > Y).
* Suggests **test vs full reprint** depending on recent returns/stockouts.
* Alerts CSR: “Reefer Alien Hoodie likely to sell 450 units next 30d; approve 350 now, 100 in 2 weeks?”

## 13.7 Events, Edge Cases, Acceptance Tests

* **Events**: `ash.merch.reprint.drafted`, `ash.merch.theme.drafted`, `ash.merch.rec.accepted`
* **Edge**: sparse data → fall back to product-level curves; conflicting channels → weight by margin.
* **Tests**:

  1. High-velocity design returns a positive reprint with rationales & BOM.
  2. Low margin blocks suggestion (requires price/COGS tweak).
  3. Theme rec produces tags/palette/placement + test qty.

---

# 🔹 Stage 14 – Automation & Reminders (Jobs, Alerts, Messaging)

## 14.1 Purpose

Central engine for **scheduled tasks, rule-based alerts, and notifications** to staff and clients across channels.

## 14.2 Concepts

* **Triggers**: time-based (cron), event-based (order status change), condition-based (query returning true).
* **Jobs**: unit of work (send message, create CAPA, draft PR).
* **Channels**: Email, SMS, Messenger, in-app.
* **Preferences**: per user/client quiet hours, opt-ins, escalation rules.
* **Deduping & Rate limits**: don’t spam.

## 14.3 Data Model (SQL)

```sql
create table automations (
  id uuid primary key,
  workspace_id uuid not null,
  name text not null,
  type text not null,                   -- CRON/EVENT/CONDITION
  schedule text,                        -- cron expr for CRON
  event_key text,                       -- e.g., ash.qc.failed
  condition_sql text,                   -- SQL returning rows to act on
  action jsonb not null,                -- {"type":"NOTIFY","template_id":..., "channel":"EMAIL","to":"CSR:brand"}
  enabled bool default true,
  created_by uuid,
  created_at timestamptz default now()
);

create table notification_templates (
  id uuid primary key,
  workspace_id uuid not null,
  name text not null,
  channel text not null,                -- EMAIL/SMS/MESSENGER/INAPP
  subject text,
  body text,                            -- mustache placeholders
  locale text default 'en-PH'
);

create table outbox (
  id uuid primary key,
  automation_id uuid,
  channel text not null,
  to_ref text not null,                 -- user_id/email/phone/messenger_id
  subject text,
  body text,
  dedupe_key text,                      -- prevent duplicates within window
  send_after timestamptz,
  attempts int default 0,
  status text default 'PENDING',        -- PENDING/SENT/FAILED/DROPPED
  last_error text,
  created_at timestamptz default now()
);

create table user_prefs (
  id uuid primary key,
  user_id uuid not null,
  channel text not null,
  opt_in bool default true,
  quiet_hours jsonb,                    -- {"start":"21:00","end":"08:00","tz":"Asia/Manila"}
  rate_limit jsonb                      -- {"max":5,"window_minutes":60}
);
```

## 14.4 APIs

```
POST /automations
Body {
  name, type:"CRON"|"EVENT"|"CONDITION",
  schedule?, event_key?, condition_sql?,
  action:{type:"NOTIFY"|"CREATE_TASK"|"DRAFT_PR", template_id, channel, to, meta?}
}
→ 201 { id }

POST /automations/{id}/toggle { enabled: true|false } → 200

POST /notify/test
Body { template_id, channel, to_ref, vars:{...} } → 200

GET  /outbox?status=PENDING → list for worker service; worker dispatches and updates status
```

## 14.5 Built-in Automations (examples)

* **Design follow-up**: EVENT=`ash.design.approval.sent` → if no action in 48h → notify CSR & client.
* **QC fail hold**: EVENT=`ash.qc.closed` with status FAIL → notify Manager + create CAPA task.
* **Cashflow warning**: CRON daily 08:00 → if forecast < 0 in 30d → notify Owner + Finance.
* **Vehicle renewal**: CONDITION weekly → `assets where registration_due <= now()+interval '15 days'`.
* **Invoice due**: CRON daily 09:00 → clients with due tomorrow → send branded reminder (respects comm\_prefs).

## 14.6 Rules: Dedup, Quiet Hours, Escalation

* **Dedup**: identical `dedupe_key` dropped within 24h (configurable).
* **Quiet hours**: queue until window ends for each recipient.
* **Escalation**: if not acknowledged (e.g., QC fail) in 4h → escalate to next role.

## 14.7 Ashley (AI) Enhancements

* **Smart channel**: pick email vs SMS vs Messenger by historical open/reply rates per client.
* **Batching**: group notifications (single digest per morning).
* **Language tone**: friendlier tone for clients, concise for staff; brand voice templates.

## 14.8 Events, Edge Cases, Acceptance Tests

* **Events**: `ash.automation.fired`, `ash.notification.sent`, `ash.notification.failed`
* **Edge**: respects opt-out; invalid contact → mark FAILED and alert CSR; webhook retries with backoff.
* **Tests**:

  1. QC fail triggers CAPA + notifications with dedupe.
  2. Invoice reminder respects client quiet hours.
  3. Condition SQL returns rows → outbox populated; rate limits enforced.
  4. Messenger chosen over email when past engagement data favors it.

---

## ✅ What your developer gets from Stages 12–14

* **Precise schemas & APIs** to implement portal access, payments, reorders.
* **Actionable ML-lite methods** for reprint & theme recommendations, ready to upgrade to full ML later.
* **A robust automation framework** with triggers, templates, dedupe, and preferences.

<!-- 

  
## Updated Requirements

[PASTE YOUR UPDATED PLAN HERE]

## Key Changes

[LIST ANY MAJOR CHANGES HERE]

## Priority Items

[LIST PRIORITY IMPLEMENTATIONS HERE]

---
*Last updated: [01/09/25]*
