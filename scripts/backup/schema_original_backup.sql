-- Label Production Management System - Complete Database Schema
-- Based on existing structure with comprehensive expansion
-- Compatible with current data while adding new production capabilities

-- =============================================
-- CORE BUSINESS ENTITIES (Updated from existing)
-- =============================================

-- UPDATED: Expanded customers table with full business requirements
CREATE TABLE customers (
  customer_id TEXT PRIMARY KEY,
  -- Preserve existing fields
  customerId TEXT UNIQUE, -- Keep for backward compatibility
  customerName TEXT,
  customerContactName TEXT,
  customerContactEmail TEXT,
  -- New comprehensive fields
  code TEXT,
  name TEXT,
  site_code TEXT,
  phone TEXT,
  mobile TEXT,
  email TEXT,
  website TEXT,
  comment TEXT,
  active BOOLEAN DEFAULT TRUE,
  credit_terms TEXT,
  mis_ref_1 TEXT,
  mis_ref_2 TEXT,
  account_manager_id TEXT REFERENCES account_managers(manager_id),
  company_number_type TEXT,
  company_number TEXT,
  account_status_id TEXT REFERENCES account_status(status_id),
  customer_tier_id TEXT REFERENCES customer_tiers(tier_id),
  date_created DATE DEFAULT CURRENT_DATE,
  last_modified_by TEXT,
  tax_type_id TEXT REFERENCES tax_types(tax_type_id),
  discount_rate DECIMAL(5,2),
  discount_based_on TEXT,
  billing_customer_id TEXT REFERENCES customers(customer_id),
  customer_group_id TEXT REFERENCES customer_groups(group_id),
  freight_zone_id TEXT REFERENCES freight_zones(zone_id),
  important_notes TEXT,
  outstanding_balance DECIMAL(15,2) DEFAULT 0,
  credit_limit DECIMAL(15,2),
  currency_code TEXT DEFAULT 'AUD' REFERENCES currency_codes(currency_code),
  commission_rate DECIMAL(5,2)
);

-- NEW: Customer addresses
CREATE TABLE customer_addresses (
  address_id TEXT PRIMARY KEY,
  customer_id TEXT REFERENCES customers(customer_id),
  address_type TEXT, -- 'billing', 'shipping', 'delivery'
  address_name TEXT,
  address_line_1 TEXT,
  address_line_2 TEXT,
  address_line_3 TEXT,
  city TEXT,
  country TEXT DEFAULT 'Australia',
  postcode TEXT,
  state TEXT,
  address_notes_internal TEXT,
  address_notes_external TEXT,
  is_default BOOLEAN DEFAULT FALSE,
  can_blind_ship BOOLEAN DEFAULT FALSE,
  blind_ship_default BOOLEAN DEFAULT FALSE
);

-- NEW: Customer contacts
CREATE TABLE customer_contacts (
  contact_id TEXT PRIMARY KEY,
  customer_id TEXT REFERENCES customers(customer_id),
  contact_type TEXT, -- 'primary', 'billing', 'technical', 'shipping'
  contact_title TEXT,
  contact_first_name TEXT,
  contact_surname TEXT,
  contact_phone TEXT,
  contact_mobile TEXT,
  contact_email TEXT,
  contact_website TEXT,
  contact_comment TEXT,
  email_invoice BOOLEAN DEFAULT FALSE,
  is_primary BOOLEAN DEFAULT FALSE
);

-- UPDATED: Enhanced orders table
CREATE TABLE orders (
  order_id TEXT PRIMARY KEY,
  customer_id TEXT REFERENCES customers(customer_id),
  order_date DATE DEFAULT CURRENT_DATE,
  due_date DATE,
  rush_priority BOOLEAN DEFAULT FALSE,
  order_status TEXT DEFAULT 'pending', -- 'pending', 'confirmed', 'in_production', 'completed', 'cancelled'
  special_instructions TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- UPDATED: Comprehensive jobs table (evolved from job_lines)
CREATE TABLE jobs (
  job_id TEXT PRIMARY KEY, -- This is now the main schema ID (was id in job_lines)
  order_id TEXT REFERENCES orders(order_id), -- This now properly references orders
  customer_id TEXT REFERENCES customers(customer_id),
  -- Preserve existing job_lines compatibility
  lineIdentifier TEXT,
  lineIdentifierNoPrefix TEXT,
  jobLineId TEXT, -- This becomes the order reference
  quoteLineId TEXT, -- Reference to quote line
  jobName TEXT,
  recipeId TEXT,
  orderDate DATE,
  dueDate DATE,
  accountManagerName TEXT,
  accountManagerEmail TEXT,
  itemId TEXT,
  productId TEXT,
  productCode TEXT,
  productName TEXT,
  -- Production specifications
  material_id TEXT REFERENCES materials(material_id),
  finishing_id TEXT REFERENCES finishing_options(finishing_id),
  qty_ordered INTEGER,
  qty_per_roll INTEGER,
  requires_joining BOOLEAN DEFAULT FALSE,
  core_size TEXT,
  web_width DECIMAL(8,2),
  size_x DECIMAL(8,2), -- sizeXmm from existing
  size_y DECIMAL(8,2), -- sizeYmm from existing
  number_around INTEGER,
  number_across INTEGER,
  gap_around DECIMAL(6,2),
  gap_across DECIMAL(6,2),
  corner_radius DECIMAL(6,2),
  shape_id TEXT REFERENCES shapes(shape_id),
  tool_number TEXT,
  tool_cost_aud DECIMAL(10,2),
  tool_lead_time_days INTEGER,
  use_digital_cut BOOLEAN DEFAULT FALSE,
  digital_cut_eligible BOOLEAN DEFAULT FALSE,
  repeat_length DECIMAL(8,2),
  max_step_qty INTEGER,
  estimated_print_speed DECIMAL(6,2),
  estimated_print_time INTEGER,
  total_web_length DECIMAL(10,2),
  material_overrun_allowance DECIMAL(5,2) DEFAULT 5.0,
  job_status TEXT DEFAULT 'pending',
  estimated_total_time INTEGER,
  actual_total_time INTEGER,
  profit_margin DECIMAL(8,2),
  total_cost_aud DECIMAL(12,2),
  -- Preserve existing fields
  quantity INTEGER,
  sibling INTEGER,
  siblingCount INTEGER,
  revision INTEGER,
  approvers TEXT,
  fileName TEXT,
  fileLocation TEXT,
  materialName TEXT,
  laminateName TEXT,
  finishingName TEXT,
  printColour TEXT,
  tool TEXT,
  cores TEXT,
  handMachineApplied TEXT,
  supply TEXT,
  kinds INTEGER,
  rollDirection TEXT,
  lineDescription TEXT,
  quoteId TEXT,
  deliveryToAddress TEXT,
  profitCentreName TEXT,
  customerFolderId TEXT,
  processed BOOLEAN DEFAULT FALSE
);

-- =============================================
-- MATERIAL MANAGEMENT
-- =============================================

-- NEW: Materials library
CREATE TABLE materials (
  material_id TEXT PRIMARY KEY,
  material_code TEXT UNIQUE,
  material_name TEXT,
  substrate_type TEXT, -- 'paper', 'vinyl', 'polyester', 'polypropylene'
  adhesive_type TEXT, -- 'permanent', 'removable', 'repositionable'
  handling TEXT, -- 'hand_applied', 'machine_applied'
  weight_gsm INTEGER,
  width_mm DECIMAL(8,2),
  length_mm DECIMAL(8,2),
  coating TEXT, -- 'gloss', 'matte', 'satin'
  grain_direction TEXT,
  glossy_level TEXT,
  conductive BOOLEAN DEFAULT FALSE,
  white_material BOOLEAN DEFAULT FALSE,
  cost_per_sqm_aud DECIMAL(8,2),
  stock_meters DECIMAL(10,2) DEFAULT 0,
  reorder_level_meters DECIMAL(10,2) DEFAULT 0,
  lead_time_days INTEGER DEFAULT 7
);

-- NEW: Color mode rules linked to materials
CREATE TABLE color_mode_rules (
  rule_id TEXT PRIMARY KEY,
  material_id TEXT REFERENCES materials(material_id),
  substrate_type TEXT,
  coating_type TEXT,
  ink_requirements TEXT,
  uses_white_ink BOOLEAN DEFAULT FALSE,
  white_ink_stations INTEGER DEFAULT 0,
  null_cycles INTEGER DEFAULT 0,
  double_strike_black BOOLEAN DEFAULT FALSE,
  total_mode_number INTEGER,
  speed_factor DECIMAL(4,2) DEFAULT 1.0
);

-- NEW: Finishing options
CREATE TABLE finishing_options (
  finishing_id TEXT PRIMARY KEY,
  finishing_code TEXT UNIQUE,
  finishing_type TEXT, -- 'lamination', 'coating', 'die_cutting', 'perforation'
  coating_type TEXT,
  requires_coating_station BOOLEAN DEFAULT FALSE,
  setup_time_minutes INTEGER DEFAULT 0,
  cleanup_time_minutes INTEGER DEFAULT 0,
  cost_per_sqm_aud DECIMAL(8,2)
);

-- NEW: Shapes library
CREATE TABLE shapes (
  shape_id TEXT PRIMARY KEY,
  shape_name TEXT,
  shape_type TEXT, -- 'rectangle', 'circle', 'oval', 'custom'
  cutting_complexity TEXT -- 'simple', 'medium', 'complex'
);

-- =============================================
-- PRODUCTION MACHINES & OPERATIONS
-- =============================================

-- NEW: Machines
CREATE TABLE machines (
  machine_id TEXT PRIMARY KEY,
  machine_name TEXT,
  machine_type TEXT, -- 'indigo', 'digital_cutter', 'laminator', 'slitter'
  capabilities TEXT, -- JSON or comma-separated
  hourly_rate_aud DECIMAL(8,2),
  max_web_width_mm INTEGER,
  availability_status TEXT DEFAULT 'available',
  maintenance_schedule TEXT,
  shift_hours INTEGER DEFAULT 8
);

-- NEW: Machine setup times
CREATE TABLE machine_setup_times (
  setup_id TEXT PRIMARY KEY,
  machine_id TEXT REFERENCES machines(machine_id),
  setup_type TEXT,
  from_specification TEXT,
  to_specification TEXT,
  setup_time_minutes INTEGER,
  skill_level_factor DECIMAL(4,2) DEFAULT 1.0
);

-- NEW: Machine specifications
CREATE TABLE machine_specifications (
  spec_id TEXT PRIMARY KEY,
  machine_id TEXT REFERENCES machines(machine_id),
  spec_category TEXT,
  spec_name TEXT,
  spec_value TEXT,
  spec_units TEXT,
  applies_to_materials TEXT
);

-- NEW: Operations
CREATE TABLE operations (
  operation_id TEXT PRIMARY KEY,
  operation_name TEXT,
  machine_id TEXT REFERENCES machines(machine_id),
  operation_category TEXT, -- 'printing', 'cutting', 'finishing', 'quality'
  can_run_parallel BOOLEAN DEFAULT FALSE,
  requires_operator BOOLEAN DEFAULT TRUE,
  setup_time_base_minutes INTEGER DEFAULT 0
);

-- NEW: Job operations (evolved from process_steps)
CREATE TABLE job_operations (
  job_operation_id TEXT PRIMARY KEY,
  job_id TEXT REFERENCES jobs(job_id),
  operation_id TEXT REFERENCES operations(operation_id),
  sequence_order INTEGER,
  depends_on_operation_id TEXT REFERENCES job_operations(job_operation_id),
  estimated_time_minutes INTEGER,
  actual_time_minutes INTEGER,
  setup_time_minutes INTEGER,
  machine_id TEXT REFERENCES machines(machine_id),
  operator_id TEXT,
  status TEXT DEFAULT 'pending', -- 'pending', 'in_progress', 'completed', 'on_hold'
  priority_boost INTEGER DEFAULT 0,
  start_time TIMESTAMP,
  end_time TIMESTAMP,
  notes TEXT,
  -- Preserve existing process_steps compatibility
  barcode TEXT,
  name TEXT,
  sort FLOAT,
  completedAt TIMESTAMP
);

-- NEW: Operators
CREATE TABLE operators (
  operator_id TEXT PRIMARY KEY,
  operator_name TEXT,
  skill_level TEXT, -- 'trainee', 'standard', 'senior', 'expert'
  hourly_rate_aud DECIMAL(8,2),
  shift_pattern TEXT,
  machine_certifications TEXT -- JSON or comma-separated
);

-- =============================================
-- TOOL MANAGEMENT
-- =============================================

-- NEW: Tools library
CREATE TABLE tools_library (
  tool_id TEXT PRIMARY KEY,
  die_number TEXT UNIQUE,
  stock TEXT,
  leading_edge_mm DECIMAL(8,2),
  trailing_edge_mm DECIMAL(8,2),
  gap_across_mm DECIMAL(8,2),
  number_across INTEGER,
  gap_around_mm DECIMAL(8,2),
  number_around INTEGER,
  corner_radius_mm DECIMAL(8,2),
  shape TEXT,
  tool_cost_aud DECIMAL(10,2),
  lead_time_days INTEGER,
  status TEXT DEFAULT 'available', -- 'available', 'in_use', 'maintenance', 'damaged'
  last_used_date DATE,
  usage_count INTEGER DEFAULT 0,
  created_date DATE DEFAULT CURRENT_DATE,
  last_modified_date DATE DEFAULT CURRENT_DATE,
  notes TEXT
);

-- =============================================
-- GANG RUN SYSTEM
-- =============================================

-- NEW: Gang runs
CREATE TABLE gang_runs (
  gang_run_id TEXT PRIMARY KEY,
  gang_run_name TEXT,
  material_id TEXT REFERENCES materials(material_id),
  finishing_id TEXT REFERENCES finishing_options(finishing_id),
  color_mode TEXT,
  web_width DECIMAL(8,2),
  total_repeat_length_mm DECIMAL(10,2),
  web_utilization_percentage DECIMAL(5,2),
  total_print_meters DECIMAL(10,2),
  material_overrun_meters DECIMAL(8,2),
  estimated_indigo_time_minutes INTEGER,
  created_date DATE DEFAULT CURRENT_DATE,
  status TEXT DEFAULT 'planning', -- 'planning', 'ready', 'in_production', 'completed'
  priority_level TEXT DEFAULT 'normal'
);

-- NEW: Gang run jobs (many-to-many)
CREATE TABLE gang_run_jobs (
  gang_run_job_id TEXT PRIMARY KEY,
  gang_run_id TEXT REFERENCES gang_runs(gang_run_id),
  job_id TEXT REFERENCES jobs(job_id),
  position_x_mm DECIMAL(8,2),
  position_y_mm DECIMAL(8,2),
  qty_to_produce INTEGER,
  overrun_qty INTEGER
);

-- =============================================
-- SCHEDULING & PRODUCTION QUEUE
-- =============================================

-- NEW: Production queue
CREATE TABLE production_queue (
  queue_id TEXT PRIMARY KEY,
  machine_id TEXT REFERENCES machines(machine_id),
  job_operation_id TEXT REFERENCES job_operations(job_operation_id),
  scheduled_start_time TIMESTAMP,
  scheduled_end_time TIMESTAMP,
  queue_position INTEGER,
  estimated_setup_time INTEGER,
  can_gang_run BOOLEAN DEFAULT FALSE,
  gang_run_id TEXT REFERENCES gang_runs(gang_run_id),
  priority_score INTEGER DEFAULT 0,
  created_date DATE DEFAULT CURRENT_DATE
);

-- NEW: Machine capacity planning
CREATE TABLE machine_capacity_planning (
  capacity_id TEXT PRIMARY KEY,
  machine_id TEXT REFERENCES machines(machine_id),
  date DATE,
  shift_start_time TIME,
  shift_end_time TIME,
  available_minutes INTEGER,
  scheduled_minutes INTEGER DEFAULT 0,
  setup_minutes INTEGER DEFAULT 0,
  maintenance_minutes INTEGER DEFAULT 0,
  utilization_percentage DECIMAL(5,2) DEFAULT 0
);

-- =============================================
-- COSTING SYSTEM
-- =============================================

-- NEW: Job costing
CREATE TABLE job_costing (
  costing_id TEXT PRIMARY KEY,
  job_id TEXT REFERENCES jobs(job_id),
  material_cost_aud DECIMAL(12,2),
  tool_cost_aud DECIMAL(12,2),
  machine_time_cost_aud DECIMAL(12,2),
  setup_cost_aud DECIMAL(12,2),
  labor_cost_aud DECIMAL(12,2),
  overhead_percentage DECIMAL(5,2) DEFAULT 15.0,
  total_cost_aud DECIMAL(12,2),
  selling_price_aud DECIMAL(12,2),
  profit_margin_aud DECIMAL(12,2),
  profit_percentage DECIMAL(5,2)
);

-- =============================================
-- PRICING & MASTER DATA
-- =============================================

-- NEW: Account managers
CREATE TABLE account_managers (
  manager_id TEXT PRIMARY KEY,
  manager_code TEXT UNIQUE,
  manager_name TEXT,
  email TEXT,
  phone TEXT,
  mobile TEXT,
  territory TEXT,
  active BOOLEAN DEFAULT TRUE,
  hire_date DATE
);

-- NEW: Customer tiers
CREATE TABLE customer_tiers (
  tier_id TEXT PRIMARY KEY,
  tier_code TEXT UNIQUE,
  tier_name TEXT,
  tier_description TEXT,
  discount_percentage DECIMAL(5,2),
  credit_limit_default DECIMAL(15,2),
  payment_terms_default TEXT,
  priority_level INTEGER
);

-- NEW: Account status
CREATE TABLE account_status (
  status_id TEXT PRIMARY KEY,
  status_code TEXT UNIQUE,
  status_name TEXT,
  status_description TEXT,
  allow_orders BOOLEAN DEFAULT TRUE,
  require_approval BOOLEAN DEFAULT FALSE,
  credit_hold BOOLEAN DEFAULT FALSE,
  active BOOLEAN DEFAULT TRUE
);

-- NEW: Tax types
CREATE TABLE tax_types (
  tax_type_id TEXT PRIMARY KEY,
  tax_code TEXT UNIQUE,
  tax_name TEXT,
  tax_rate DECIMAL(5,2),
  tax_description TEXT,
  country_code TEXT DEFAULT 'AU',
  active BOOLEAN DEFAULT TRUE
);

-- NEW: Currency codes
CREATE TABLE currency_codes (
  currency_id TEXT PRIMARY KEY,
  currency_code TEXT UNIQUE,
  currency_name TEXT,
  currency_symbol TEXT,
  is_base_currency BOOLEAN DEFAULT FALSE
);

-- NEW: Freight zones
CREATE TABLE freight_zones (
  zone_id TEXT PRIMARY KEY,
  zone_code TEXT UNIQUE,
  zone_name TEXT,
  zone_description TEXT,
  api_provider TEXT,
  api_endpoint TEXT,
  freight_type TEXT,
  calculation_method TEXT,
  base_rate DECIMAL(8,2),
  per_kg_rate DECIMAL(6,2),
  per_m3_rate DECIMAL(8,2),
  minimum_charge DECIMAL(8,2)
);

-- NEW: Customer groups
CREATE TABLE customer_groups (
  group_id TEXT PRIMARY KEY,
  group_code TEXT UNIQUE,
  group_name TEXT,
  group_description TEXT,
  default_discount DECIMAL(5,2),
  default_payment_terms TEXT,
  group_type TEXT
);

-- NEW: Price lists
CREATE TABLE price_lists (
  price_list_id TEXT PRIMARY KEY,
  price_list_code TEXT UNIQUE,
  price_list_name TEXT,
  price_list_type TEXT,
  currency_code TEXT REFERENCES currency_codes(currency_code),
  company_id TEXT,
  effective_date DATE,
  expiry_date DATE,
  active BOOLEAN DEFAULT TRUE,
  created_by TEXT,
  created_date DATE DEFAULT CURRENT_DATE,
  last_modified_by TEXT,
  last_modified_date DATE DEFAULT CURRENT_DATE
);

-- NEW: Customer price lists (many-to-many)
CREATE TABLE customer_price_lists (
  customer_price_list_id TEXT PRIMARY KEY,
  customer_id TEXT REFERENCES customers(customer_id),
  price_list_id TEXT REFERENCES price_lists(price_list_id),
  price_category TEXT,
  is_default BOOLEAN DEFAULT FALSE,
  can_override BOOLEAN DEFAULT TRUE,
  priority_order INTEGER,
  assigned_date DATE DEFAULT CURRENT_DATE,
  assigned_by TEXT
);

-- NEW: Price list items
CREATE TABLE price_list_items (
  price_item_id TEXT PRIMARY KEY,
  price_list_id TEXT REFERENCES price_lists(price_list_id),
  item_type TEXT, -- 'material', 'finishing', 'setup', 'tooling'
  material_id TEXT REFERENCES materials(material_id),
  finishing_id TEXT REFERENCES finishing_options(finishing_id),
  size_x_min DECIMAL(8,2),
  size_x_max DECIMAL(8,2),
  size_y_min DECIMAL(8,2),
  size_y_max DECIMAL(8,2),
  pricing_method TEXT, -- 'fixed', 'per_sqm', 'per_unit', 'tiered'
  fixed_price DECIMAL(10,2),
  price_per_sqm DECIMAL(8,2),
  price_per_unit DECIMAL(8,2),
  minimum_quantity INTEGER,
  price_break_qty_1 INTEGER,
  price_break_price_1 DECIMAL(8,2),
  price_break_qty_2 INTEGER,
  price_break_price_2 DECIMAL(8,2),
  price_break_qty_3 INTEGER,
  price_break_price_3 DECIMAL(8,2),
  new_order_multiplier DECIMAL(4,2) DEFAULT 1.0,
  repeat_order_multiplier DECIMAL(4,2) DEFAULT 0.95,
  setup_cost DECIMAL(8,2),
  effective_date DATE,
  expiry_date DATE
);

-- =============================================
-- RULES & WORKFLOW ENGINE
-- =============================================

-- NEW: Production workflows
CREATE TABLE production_workflows (
  workflow_id TEXT PRIMARY KEY,
  workflow_name TEXT,
  workflow_type TEXT,
  material_requirements TEXT,
  finishing_requirements TEXT,
  operation_sequence TEXT, -- JSON
  conditions TEXT,
  active BOOLEAN DEFAULT TRUE
);

-- NEW: Routing rules
CREATE TABLE routing_rules (
  rule_id TEXT PRIMARY KEY,
  rule_name TEXT,
  condition_type TEXT,
  condition_value TEXT,
  suggested_operation_sequence TEXT,
  rule_priority INTEGER,
  active BOOLEAN DEFAULT TRUE
);

-- NEW: Business rules
CREATE TABLE business_rules (
  rule_id TEXT PRIMARY KEY,
  rule_category TEXT,
  rule_name TEXT,
  rule_value TEXT,
  rule_description TEXT,
  active BOOLEAN DEFAULT TRUE
);

-- =============================================
-- PRESERVE EXISTING TABLES (Updated)
-- =============================================

-- UPDATED: Enhanced quotes table
CREATE TABLE quotes (
  id TEXT PRIMARY KEY,
  lineIdentifier TEXT,
  lineIdentifierNoPrefix TEXT,
  quoteId TEXT,
  quoteIdNoPrefix TEXT,
  quoteLineId TEXT,
  quoteDescription TEXT,
  recipeId TEXT,
  quoteDate DATE,
  customerId TEXT REFERENCES customers(customerId),
  customerName TEXT,
  quantity INTEGER,
  sibling INTEGER,
  siblingCount INTEGER,
  revision INTEGER,
  sizeXmm FLOAT,
  sizeYmm FLOAT,
  fileName TEXT,
  materialName TEXT,
  laminateName TEXT,
  finishingName TEXT,
  printColour TEXT,
  tool TEXT,
  cores TEXT,
  handMachineApplied TEXT,
  supply TEXT,
  kinds INTEGER,
  rollDirection TEXT,
  lineDescription TEXT,
  deliveryToAddress TEXT,
  profitCentreName TEXT,
  status TEXT,
  changeHistory TEXT,
  notes TEXT,
  processed BOOLEAN DEFAULT FALSE
);

-- PRESERVE: Customer folders
CREATE TABLE customer_folders (
  id TEXT PRIMARY KEY,
  customerId TEXT REFERENCES customers(customerId),
  sizeXmm FLOAT,
  sizeYmm FLOAT,
  folderName TEXT
);

-- PRESERVE: Customer file index
CREATE TABLE customer_file_index (
  id TEXT PRIMARY KEY,
  fileName TEXT,
  fileLocation TEXT,
  uploadedAt TIMESTAMP,
  usedInJobLineId TEXT,
  notes TEXT,
  customerFolderId TEXT REFERENCES customer_folders(id)
);

-- PRESERVE: Job line files (many-to-many)
CREATE TABLE job_line_files (
  id TEXT PRIMARY KEY,
  jobLineId TEXT REFERENCES jobs(job_id), -- Updated to reference job_id
  fileIndexId TEXT REFERENCES customer_file_index(id)
);

-- =============================================
-- COMPREHENSIVE INDEXES
-- =============================================

-- Preserve existing indexes
CREATE INDEX IF NOT EXISTS idx_customers_customerId ON customers(customerId);
CREATE INDEX IF NOT EXISTS idx_quotes_quoteId ON quotes(quoteId);
CREATE INDEX IF NOT EXISTS idx_quotes_processed ON quotes(processed);
CREATE INDEX IF NOT EXISTS idx_jobs_customerId ON jobs(customer_id);
CREATE INDEX IF NOT EXISTS idx_jobs_jobLineId ON jobs(jobLineId); -- Updated from job_number
CREATE INDEX IF NOT EXISTS idx_jobs_lineIdentifier ON jobs(lineIdentifier);
CREATE INDEX IF NOT EXISTS idx_jobs_processed ON jobs(processed);
CREATE INDEX IF NOT EXISTS idx_job_operations_jobId ON job_operations(job_id);
CREATE INDEX IF NOT EXISTS idx_job_operations_barcode ON job_operations(barcode);

-- New performance indexes
CREATE INDEX IF NOT EXISTS idx_jobs_order_id ON jobs(order_id);
CREATE INDEX IF NOT EXISTS idx_jobs_material_id ON jobs(material_id);
CREATE INDEX IF NOT EXISTS idx_jobs_finishing_id ON jobs(finishing_id);
CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(job_status);
CREATE INDEX IF NOT EXISTS idx_jobs_due_date ON jobs(dueDate);

CREATE INDEX IF NOT EXISTS idx_job_operations_operation_id ON job_operations(operation_id);
CREATE INDEX IF NOT EXISTS idx_job_operations_machine_id ON job_operations(machine_id);
CREATE INDEX IF NOT EXISTS idx_job_operations_status ON job_operations(status);
CREATE INDEX IF NOT EXISTS idx_job_operations_sequence ON job_operations(sequence_order);

CREATE INDEX IF NOT EXISTS idx_production_queue_machine_id ON production_queue(machine_id);
CREATE INDEX IF NOT EXISTS idx_production_queue_scheduled_start ON production_queue(scheduled_start_time);
CREATE INDEX IF NOT EXISTS idx_production_queue_priority ON production_queue(priority_score);

CREATE INDEX IF NOT EXISTS idx_gang_runs_status ON gang_runs(status);
CREATE INDEX IF NOT EXISTS idx_gang_runs_material_id ON gang_runs(material_id);

CREATE INDEX IF NOT EXISTS idx_materials_code ON materials(material_code);
CREATE INDEX IF NOT EXISTS idx_materials_substrate_type ON materials(substrate_type);

CREATE INDEX IF NOT EXISTS idx_tools_die_number ON tools_library(die_number);
CREATE INDEX IF NOT EXISTS idx_tools_status ON tools_library(status);

-- =============================================
-- VIEWS FOR BACKWARD COMPATIBILITY
-- =============================================

-- View to maintain job_lines compatibility
CREATE VIEW job_lines AS
SELECT 
  job_id as id, -- job_id is now the primary key
  lineIdentifier,
  lineIdentifierNoPrefix,
  jobLineId as jobId, -- jobLineId becomes the jobId in the view
  jobLineId as jobIdNoPrefix,
  jobLineId,
  jobName,
  recipeId,
  orderDate,
  dueDate,
  customer_id as customerId,
  accountManagerName,
  accountManagerEmail,
  itemId,
  productId,
  productCode,
  productName,
  quantity,
  size_x as sizeXmm,
  size_y as sizeYmm,
  sibling,
  siblingCount,
  revision,
  approvers,
  fileName,
  fileLocation,
  materialName,
  laminateName,
  finishingName,
  printColour,
  tool,
  cores,
  handMachineApplied,
  supply,
  kinds,
  rollDirection,
  lineDescription,
  quoteId,
  deliveryToAddress,
  profitCentreName,
  customerFolderId,
  processed
FROM jobs;

-- View to maintain process_steps compatibility
CREATE VIEW process_steps AS
SELECT 
  job_operation_id as id,
  job_id as jobLineId,
  barcode,
  name,
  sort,
  completedAt
FROM job_operations;