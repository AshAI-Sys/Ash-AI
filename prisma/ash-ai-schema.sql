-- ASH AI Extension to existing schema
-- This adds the missing tables for the full ASH AI system

-- Extend existing enums
-- OrderStatus already exists but add ASH AI states
-- INTAKE → DESIGN_PENDING → DESIGN_APPROVAL → PRODUCTION_PLANNED
-- → IN_PROGRESS → QC → PACKING → READY_FOR_DELIVERY → DELIVERED → CLOSED

-- Routing and workflow tables
CREATE TABLE IF NOT EXISTS routing_steps (
  id TEXT PRIMARY KEY DEFAULT (hex(randomblob(16))),
  order_id TEXT NOT NULL REFERENCES orders(id),
  name TEXT NOT NULL,             -- "Cutting", "Printing"...
  workcenter TEXT NOT NULL,       -- CUTTING/PRINTING/HEAT_PRESS/SEWING/EMB/QC/PACKING/DESIGN
  sequence INTEGER NOT NULL,
  depends_on TEXT DEFAULT '[]',   -- JSON array of step IDs
  join_type TEXT,                 -- null | AND | OR
  standard_spec TEXT DEFAULT '{}', -- JSON: {"tempC":200,"seconds":60}
  expected_inputs TEXT DEFAULT '{}', -- JSON
  expected_outputs TEXT DEFAULT '{}', -- JSON
  can_run_parallel BOOLEAN DEFAULT FALSE,
  planned_start TEXT,             -- ISO datetime
  planned_end TEXT,               -- ISO datetime
  status TEXT DEFAULT 'PLANNED',  -- PLANNED/READY/IN_PROGRESS/DONE/BLOCKED
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Order attachments for designs and files
CREATE TABLE IF NOT EXISTS order_attachments (
  id TEXT PRIMARY KEY DEFAULT (hex(randomblob(16))),
  order_id TEXT NOT NULL REFERENCES orders(id),
  type TEXT NOT NULL,             -- mockup/separation/digitized/brief
  file_url TEXT NOT NULL,
  meta TEXT DEFAULT '{}',         -- JSON metadata
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Design assets (Stage 2)
CREATE TABLE IF NOT EXISTS design_assets (
  id TEXT PRIMARY KEY DEFAULT (hex(randomblob(16))),
  workspace_id TEXT NOT NULL DEFAULT 'default',
  brand_id TEXT NOT NULL REFERENCES brands(id),
  order_id TEXT NOT NULL REFERENCES orders(id),
  name TEXT NOT NULL,
  method TEXT NOT NULL,                 -- SILKSCREEN/SUBLIMATION/DTF/EMBROIDERY
  status TEXT NOT NULL DEFAULT 'DRAFT', -- DRAFT/PENDING_APPROVAL/APPROVED/REJECTED/LOCKED
  current_version INTEGER NOT NULL DEFAULT 1,
  is_best_seller BOOLEAN DEFAULT FALSE, -- set by Ashley
  tags TEXT DEFAULT '[]',              -- JSON array
  created_by TEXT NOT NULL REFERENCES users(id),
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Immutable file versions
CREATE TABLE IF NOT EXISTS design_versions (
  id TEXT PRIMARY KEY DEFAULT (hex(randomblob(16))),
  asset_id TEXT NOT NULL REFERENCES design_assets(id),
  version INTEGER NOT NULL,
  files TEXT NOT NULL,                 -- JSON: {mockup_url, prod_url, separations:[...], dst_url}
  placements TEXT NOT NULL,            -- JSON: [{area, width_cm, height_cm, offset_x, offset_y}]
  palette TEXT,                        -- JSON: ["#000000","#19e5a5",...]
  meta TEXT,                           -- JSON: {dpi, color_profile, notes}
  created_by TEXT NOT NULL REFERENCES users(id),
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (asset_id, version)
);

-- Client approval lifecycle
CREATE TABLE IF NOT EXISTS design_approvals (
  id TEXT PRIMARY KEY DEFAULT (hex(randomblob(16))),
  asset_id TEXT NOT NULL REFERENCES design_assets(id),
  version INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'SENT',  -- SENT/APPROVED/CHANGES_REQUESTED/EXPIRED
  client_id TEXT NOT NULL REFERENCES clients(id),
  approver_name TEXT,
  approver_email TEXT,
  approver_signed_at TEXT,             -- ISO datetime
  comments TEXT,
  esign_envelope_id TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Ashley's printability analysis per version
CREATE TABLE IF NOT EXISTS design_checks (
  id TEXT PRIMARY KEY DEFAULT (hex(randomblob(16))),
  asset_id TEXT NOT NULL REFERENCES design_assets(id),
  version INTEGER NOT NULL,
  method TEXT NOT NULL,
  result TEXT NOT NULL,                 -- PASS/WARN/FAIL
  issues TEXT DEFAULT '[]',             -- JSON: [{code,message,placement_ref}]
  metrics TEXT DEFAULT '{}',            -- JSON: {min_dpi, expected_ink_g, stitch_count, aop_area_cm2, ...}
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Fabric batches (Stage 3 - Cutting)
CREATE TABLE IF NOT EXISTS fabric_batches (
  id TEXT PRIMARY KEY DEFAULT (hex(randomblob(16))),
  workspace_id TEXT NOT NULL DEFAULT 'default',
  brand_id TEXT NOT NULL REFERENCES brands(id),
  item_id TEXT NOT NULL REFERENCES inventory_items(id),
  lot_no TEXT,
  uom TEXT NOT NULL,                  -- KG or M
  qty_on_hand REAL NOT NULL,
  gsm INTEGER, 
  width_cm INTEGER,
  received_at TEXT,                   -- ISO datetime
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Cutting issues (warehouse -> WIP)
CREATE TABLE IF NOT EXISTS cut_issues (
  id TEXT PRIMARY KEY DEFAULT (hex(randomblob(16))),
  order_id TEXT NOT NULL REFERENCES orders(id),
  batch_id TEXT NOT NULL REFERENCES fabric_batches(id),
  qty_issued REAL NOT NULL,
  uom TEXT NOT NULL,
  issued_by TEXT NOT NULL REFERENCES users(id),
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Lays and outputs
CREATE TABLE IF NOT EXISTS cut_lays (
  id TEXT PRIMARY KEY DEFAULT (hex(randomblob(16))),
  order_id TEXT NOT NULL REFERENCES orders(id),
  marker_name TEXT,
  marker_width_cm INTEGER,
  lay_length_m REAL,
  plies INTEGER,
  gross_used REAL NOT NULL,        -- kg or m (uom in batch)
  offcuts REAL DEFAULT 0,
  defects REAL DEFAULT 0,
  uom TEXT NOT NULL,               -- KG or M
  created_by TEXT NOT NULL REFERENCES users(id),
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Pieces per size from a lay
CREATE TABLE IF NOT EXISTS cut_outputs (
  id TEXT PRIMARY KEY DEFAULT (hex(randomblob(16))),
  lay_id TEXT NOT NULL REFERENCES cut_lays(id),
  size_code TEXT NOT NULL,
  qty INTEGER NOT NULL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (lay_id, size_code)
);

-- Bundles (traceable WIP units)
CREATE TABLE IF NOT EXISTS bundles (
  id TEXT PRIMARY KEY DEFAULT (hex(randomblob(16))),
  order_id TEXT NOT NULL REFERENCES orders(id),
  size_code TEXT NOT NULL,
  qty INTEGER NOT NULL,
  lay_id TEXT REFERENCES cut_lays(id),
  qr_code TEXT UNIQUE NOT NULL,       -- encoded id or URL
  status TEXT DEFAULT 'CREATED',      -- CREATED/IN_SEWING/DONE/REJECTED
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Print runs (Stage 4 - Printing)
CREATE TABLE IF NOT EXISTS print_runs (
  id TEXT PRIMARY KEY DEFAULT (hex(randomblob(16))),
  order_id TEXT NOT NULL REFERENCES orders(id),
  routing_step_id TEXT NOT NULL REFERENCES routing_steps(id),
  method TEXT NOT NULL,                 -- SILKSCREEN/SUBLIMATION/DTF/EMBROIDERY
  workcenter TEXT NOT NULL,             -- PRINTING/HEAT_PRESS/EMB
  machine_id TEXT REFERENCES machines(id),
  started_at TEXT,                      -- ISO datetime
  ended_at TEXT,                        -- ISO datetime
  status TEXT DEFAULT 'CREATED',        -- CREATED/IN_PROGRESS/PAUSED/DONE/CANCELLED
  created_by TEXT NOT NULL REFERENCES users(id),
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Per-run outputs and materials
CREATE TABLE IF NOT EXISTS print_run_outputs (
  id TEXT PRIMARY KEY DEFAULT (hex(randomblob(16))),
  run_id TEXT NOT NULL REFERENCES print_runs(id),
  bundle_id TEXT REFERENCES bundles(id),
  qty_good INTEGER DEFAULT 0,
  qty_reject INTEGER DEFAULT 0,
  notes TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS print_run_materials (
  id TEXT PRIMARY KEY DEFAULT (hex(randomblob(16))),
  run_id TEXT NOT NULL REFERENCES print_runs(id),
  item_id TEXT NOT NULL REFERENCES inventory_items(id),
  uom TEXT NOT NULL,                    -- g, m2, m, cone, sheet, pcs
  qty REAL NOT NULL,
  source_batch_id TEXT REFERENCES fabric_batches(id),
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Print rejects
CREATE TABLE IF NOT EXISTS print_rejects (
  id TEXT PRIMARY KEY DEFAULT (hex(randomblob(16))),
  run_id TEXT NOT NULL REFERENCES print_runs(id),
  bundle_id TEXT REFERENCES bundles(id),
  reason_code TEXT NOT NULL,            -- MISALIGNMENT/PEEL/CRACK/GHOST/PUCKERING/...
  qty INTEGER NOT NULL,
  photo_url TEXT,
  cost_attribution TEXT,                -- SUPPLIER/STAFF/COMPANY/CLIENT
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Silkscreen specific tables
CREATE TABLE IF NOT EXISTS silkscreen_prep (
  id TEXT PRIMARY KEY DEFAULT (hex(randomblob(16))),
  run_id TEXT NOT NULL REFERENCES print_runs(id),
  screen_id TEXT NOT NULL,
  mesh_count INTEGER NOT NULL,
  emulsion_batch TEXT,
  exposure_seconds INTEGER,
  registration_notes TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS silkscreen_specs (
  id TEXT PRIMARY KEY DEFAULT (hex(randomblob(16))),
  run_id TEXT NOT NULL REFERENCES print_runs(id),
  ink_type TEXT NOT NULL,               -- PLASTISOL/WATER/PUFF/ANTI_MIGRATION
  coats INTEGER NOT NULL,
  squeegee_durometer INTEGER,           -- 60/70/80
  floodbar TEXT,
  expected_ink_g REAL,                 -- AI estimation
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS curing_logs (
  id TEXT PRIMARY KEY DEFAULT (hex(randomblob(16))),
  run_id TEXT NOT NULL REFERENCES print_runs(id),
  dryer_id TEXT REFERENCES machines(id),
  temp_c INTEGER NOT NULL,
  seconds INTEGER NOT NULL,
  belt_speed TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Sublimation specific
CREATE TABLE IF NOT EXISTS sublimation_prints (
  id TEXT PRIMARY KEY DEFAULT (hex(randomblob(16))),
  run_id TEXT NOT NULL REFERENCES print_runs(id),
  printer_id TEXT REFERENCES machines(id),
  paper_m2 REAL NOT NULL,
  ink_g REAL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS heat_press_logs (
  id TEXT PRIMARY KEY DEFAULT (hex(randomblob(16))),
  run_id TEXT NOT NULL REFERENCES print_runs(id),
  press_id TEXT REFERENCES machines(id),
  temp_c INTEGER NOT NULL,
  seconds INTEGER NOT NULL,
  pressure TEXT,                        -- light/medium/firm
  cycles INTEGER DEFAULT 1,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- DTF specific
CREATE TABLE IF NOT EXISTS dtf_prints (
  id TEXT PRIMARY KEY DEFAULT (hex(randomblob(16))),
  run_id TEXT NOT NULL REFERENCES print_runs(id),
  film_m2 REAL NOT NULL,
  ink_g REAL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS dtf_powder_cures (
  id TEXT PRIMARY KEY DEFAULT (hex(randomblob(16))),
  run_id TEXT NOT NULL REFERENCES print_runs(id),
  powder_g REAL NOT NULL,
  temp_c INTEGER NOT NULL,
  seconds INTEGER NOT NULL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Embroidery specific
CREATE TABLE IF NOT EXISTS embroidery_runs (
  id TEXT PRIMARY KEY DEFAULT (hex(randomblob(16))),
  run_id TEXT NOT NULL REFERENCES print_runs(id),
  design_version_id TEXT REFERENCES design_versions(id),
  stitch_count INTEGER NOT NULL,
  machine_spm INTEGER,                  -- stitches per minute
  stabilizer_type TEXT,
  thread_colors TEXT DEFAULT '[]',      -- JSON: ["PMS 186C", "Black", ...]
  thread_breaks INTEGER DEFAULT 0,
  runtime_minutes REAL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Sewing operations (Stage 5)
CREATE TABLE IF NOT EXISTS sewing_operations (
  id TEXT PRIMARY KEY DEFAULT (hex(randomblob(16))),
  workspace_id TEXT NOT NULL DEFAULT 'default',
  product_type TEXT NOT NULL,           -- Tee/Hoodie/Jersey/...
  name TEXT NOT NULL,                   -- "Join shoulders","Attach collar",...
  standard_minutes REAL NOT NULL,      -- SMV
  piece_rate REAL,                     -- pay per piece for this op (optional; else from rates table)
  depends_on TEXT DEFAULT '[]',        -- JSON array of logical op names
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS piece_rates (
  id TEXT PRIMARY KEY DEFAULT (hex(randomblob(16))),
  workspace_id TEXT NOT NULL DEFAULT 'default',
  brand_id TEXT REFERENCES brands(id),
  operation_name TEXT NOT NULL,
  rate REAL NOT NULL,                  -- PHP per piece
  effective_from TEXT,                 -- ISO date
  effective_to TEXT                    -- ISO date
);

CREATE TABLE IF NOT EXISTS sewing_runs (
  id TEXT PRIMARY KEY DEFAULT (hex(randomblob(16))),
  order_id TEXT NOT NULL REFERENCES orders(id),
  routing_step_id TEXT NOT NULL REFERENCES routing_steps(id),
  operation_name TEXT NOT NULL,
  operator_id TEXT NOT NULL REFERENCES users(id),
  bundle_id TEXT NOT NULL REFERENCES bundles(id),
  started_at TEXT,                     -- ISO datetime
  ended_at TEXT,                       -- ISO datetime
  qty_good INTEGER DEFAULT 0,
  qty_reject INTEGER DEFAULT 0,
  reject_reason TEXT,
  reject_photo_url TEXT,
  status TEXT DEFAULT 'CREATED',        -- CREATED/IN_PROGRESS/DONE
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Ashley AI insights and checks
CREATE TABLE IF NOT EXISTS ai_insights (
  id TEXT PRIMARY KEY DEFAULT (hex(randomblob(16))),
  workspace_id TEXT NOT NULL DEFAULT 'default',
  type TEXT NOT NULL,                   -- ASSIGNMENT/FORECAST/INVENTORY/PRICING/ANOMALY
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  priority TEXT NOT NULL,               -- HIGH/MEDIUM/LOW
  data TEXT DEFAULT '{}',               -- JSON specific to insight type
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  expires_at TEXT                       -- ISO datetime
);

-- Ashley capacity and routing analysis
CREATE TABLE IF NOT EXISTS capacity_analysis (
  id TEXT PRIMARY KEY DEFAULT (hex(randomblob(16))),
  order_id TEXT NOT NULL REFERENCES orders(id),
  workcenter TEXT NOT NULL,
  required_minutes REAL NOT NULL,
  available_minutes REAL NOT NULL,
  utilization_pct REAL NOT NULL,
  bottleneck BOOLEAN DEFAULT FALSE,
  suggestions TEXT DEFAULT '[]',        -- JSON array of suggestions
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Event bus for ASH AI
CREATE TABLE IF NOT EXISTS event_log (
  id TEXT PRIMARY KEY DEFAULT (hex(randomblob(16))),
  event_type TEXT NOT NULL,             -- ash.po.created, ash.design.approved, etc
  entity_type TEXT NOT NULL,            -- order, design_asset, bundle, etc
  entity_id TEXT NOT NULL,
  payload TEXT DEFAULT '{}',            -- JSON event data
  processed BOOLEAN DEFAULT FALSE,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Routing templates library
CREATE TABLE IF NOT EXISTS routing_templates (
  id TEXT PRIMARY KEY DEFAULT (hex(randomblob(16))),
  workspace_id TEXT NOT NULL DEFAULT 'default',
  name TEXT NOT NULL,
  method TEXT NOT NULL,                 -- SILKSCREEN/SUBLIMATION/DTF/EMBROIDERY
  brand_id TEXT REFERENCES brands(id),
  template_key TEXT UNIQUE NOT NULL,    -- SILK_OPTION_A, SILK_OPTION_B, SUBL_DEFAULT, etc
  steps TEXT NOT NULL,                  -- JSON array of step templates
  is_default BOOLEAN DEFAULT FALSE,
  active BOOLEAN DEFAULT TRUE,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Workspace for multi-tenancy
CREATE TABLE IF NOT EXISTS workspaces (
  id TEXT PRIMARY KEY DEFAULT (hex(randomblob(16))),
  name TEXT NOT NULL,
  settings TEXT DEFAULT '{}',           -- JSON workspace settings
  active BOOLEAN DEFAULT TRUE,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Update existing orders table to match ASH AI spec
-- Add missing fields for ASH AI
-- Note: This is additive to existing schema

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_routing_steps_order_status ON routing_steps(order_id, status);
CREATE INDEX IF NOT EXISTS idx_design_assets_order_brand ON design_assets(order_id, brand_id);
CREATE INDEX IF NOT EXISTS idx_design_versions_asset ON design_versions(asset_id, version);
CREATE INDEX IF NOT EXISTS idx_bundles_order_status ON bundles(order_id, status);
CREATE INDEX IF NOT EXISTS idx_print_runs_order ON print_runs(order_id, status);
CREATE INDEX IF NOT EXISTS idx_sewing_runs_order ON sewing_runs(order_id, status);
CREATE INDEX IF NOT EXISTS idx_ai_insights_type_created ON ai_insights(type, created_at);
CREATE INDEX IF NOT EXISTS idx_event_log_processed ON event_log(processed, created_at);
CREATE INDEX IF NOT EXISTS idx_fabric_batches_brand_item ON fabric_batches(brand_id, item_id);