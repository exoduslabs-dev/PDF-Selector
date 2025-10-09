-- Create consolidated Printbeat + machines views with derived telemetry fields
-- FILE: scripts/create_machinery_views.sql

-- latest_printbeat_per_device: pick newest row per device and expose normalized columns
CREATE OR REPLACE VIEW latest_printbeat_per_device AS
SELECT DISTINCT ON (device_serial_number)
  device_serial_number,
  press_name,
  press_state,
  current_job,
  jobs_in_queue,
  impressions_per_hour,
  meters_per_hour,
  time_to_complete_pending_jobs,
  maintenance_status,
  payload,
  updated_at,
  -- derived: prefer meters_per_hour but fall back to impressions_per_hour
  COALESCE(meters_per_hour, impressions_per_hour) AS units_per_hour,
  -- derived: minutes to complete pending jobs (ceil of seconds->minutes)
  CASE
    WHEN time_to_complete_pending_jobs IS NOT NULL THEN CEIL(time_to_complete_pending_jobs / 60.0)
    ELSE NULL
  END AS minutes_to_complete_pending,
  -- derived: payload current job if present (payload is json/jsonb)
  (CASE WHEN payload IS NOT NULL THEN (payload ->> 'currentJob') ELSE NULL END) AS payload_current_job
FROM "Printbeat data Real time"
ORDER BY device_serial_number, COALESCE(updated_at, created_at) DESC;

-- latest_machineries: join machines table to latest_printbeat_per_device and expose a single consolidated row
CREATE OR REPLACE VIEW latest_machineries AS
SELECT
  m.machine_id AS id,
  m.machine_name AS name,
  m.machine_type,
  m.availability_status,
  -- include printbeat fields when available
  l.device_serial_number,
  l.press_name,
  l.press_state,
  l.current_job AS pb_current_job,
  l.payload_current_job,
  l.jobs_in_queue,
  l.units_per_hour,
  l.minutes_to_complete_pending,
  l.time_to_complete_pending_jobs,
  l.updated_at AS telemetry_updated_at,
  l.maintenance_status AS pb_maintenance_status,
  l.payload AS payload,
  -- normalized maintenance_ok boolean
  (CASE
     WHEN l.maintenance_status IS NULL THEN NULL
     WHEN lower(l.maintenance_status) IN ('ok', 'none', '') THEN true
     ELSE false
   END) AS maintenance_ok,
  -- fallbacks: maintenance_schedule from machines
  m.maintenance_schedule
FROM machines m
LEFT JOIN latest_printbeat_per_device l
  ON (
    -- try to match press_name to machine_name heuristically (case-insensitive substring match)
    (l.press_name IS NOT NULL AND lower(l.press_name) LIKE '%' || lower(m.machine_name) || '%')
    OR (m.machine_name IS NOT NULL AND lower(m.machine_name) LIKE '%' || lower(l.press_name) || '%')
  );

-- Indexing notes: consider creating an index on lower(press_name) or a materialized view for performance in large DBs.
