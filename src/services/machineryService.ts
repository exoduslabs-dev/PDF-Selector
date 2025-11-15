import type { Machinery, MachineryUpdate } from '../types/common.js';
import { executeQuery, executeQuerySingle } from '../config/database.js';
import { DatabaseError } from '../types/common.js';

function parseSchedule(value: any) {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  try {
    return JSON.parse(value as string);
  } catch (e) {
    return [];
  }
}

export class MachineryService {
  async getAllMachineries(): Promise<Machinery[]> {
    try {
      // Read consolidated view which includes latest printbeat telemetry when available
      const rows = await executeQuery(`SELECT * FROM latest_machineries ORDER BY name`);

      return rows.map((r: any) => {
        // Normalize payload (may be jsonb)
        let payload: any = null;
        try {
          payload = r.payload && typeof r.payload === 'object' ? r.payload : (r.payload ? JSON.parse(r.payload) : null);
        } catch (e) {
          payload = null;
        }

        const pressName: string | undefined = r.press_name || (payload && payload.pressName) || undefined;
        const isIndigo = Boolean(pressName && /indigo/i.test(pressName)) || String(r.machine_type || '').toLowerCase() === 'indigo' || String(r.machine_type || '').toLowerCase().includes('indigo');

        if (isIndigo) {
          // Prefer printbeat/view-derived telemetry fields for HP Indigo devices
          const rawCurrent = r.pb_current_job || r.payload_current_job || payload?.currentJob || r.current_job || null;
          const currentJob = rawCurrent ? (typeof rawCurrent === 'object' ? rawCurrent : { jobId: String(rawCurrent), name: String(rawCurrent) }) : null;
          const queueLength = Number(r.jobs_in_queue ?? payload?.jobsInQueue ?? 0);
          // prefer derived units_per_hour from the view, fallback to older fields/payload
          const unitsPerHour = Number(r.units_per_hour ?? r.meters_per_hour ?? r.impressions_per_hour ?? payload?.metersPerHour ?? payload?.impressionsPerHour ?? 0);
          // minutes remaining derived column (nullable)
          const minutesToComplete = r.minutes_to_complete_pending != null ? Number(r.minutes_to_complete_pending) : (r.time_to_complete_pending_jobs ? Math.ceil(Number(r.time_to_complete_pending_jobs) / 60) : null);
          // maintenance: use normalized boolean from view when present
          const maintenanceDue = (r.maintenance_ok === false) || Boolean(r.pb_maintenance_status && String(r.pb_maintenance_status).toLowerCase() !== 'ok') || Boolean(payload?.maintenanceStatus);

          // normalize state strings into the app's expected set: 'running'|'idle'|'maintenance'|'error'
          const rawState = r.press_state || payload?.pressState || r.availability_status || 'idle';
          const s = String(rawState).toLowerCase();
          let state: 'running' | 'idle' | 'maintenance' | 'error' = 'idle';
          if (s.includes('print') || s.includes('running') || s === 'printing') state = 'running';
          else if (s.includes('maint') || s.includes('service')) state = 'maintenance';
          else if (s.includes('err') || s.includes('fault') || s.includes('fail')) state = 'error';
          else state = 'idle';

          const schedule = parseSchedule(r.maintenance_schedule || r.schedule || payload?.schedule || payload?.maintenanceSchedule);
          return {
            id: String(r.id),
            name: r.name,
            machineType: r.machine_type || 'indigo',
            state: String(state),
            currentJob,
            queueLength,
            unitsPerHour,
            maintenanceDue,
            // include computed minutesRemaining as optional extra (not yet in type) for frontend use
            minutesToComplete: minutesToComplete != null ? Number(minutesToComplete) : undefined,
            lastUpdated: r.telemetry_updated_at ? new Date(r.telemetry_updated_at).toISOString() : (r.updated_at ? new Date(r.updated_at).toISOString() : new Date().toISOString()),
            schedule,
          } as Machinery;
        }

        // Non-Printbeat machines: map conservatively from machines columns
        return {
          id: String(r.id),
          name: r.name,
          machineType: r.machine_type || undefined,
          state: r.availability_status || 'unknown',
          currentJob: null,
          queueLength: 0,
          unitsPerHour: 0,
          maintenanceDue: !!r.maintenance_schedule && String(r.maintenance_schedule).trim().length > 0,
          lastUpdated: new Date().toISOString(),
          schedule: parseSchedule(r.maintenance_schedule || r.schedule),
        } as Machinery;
      });
    } catch (err) {
      // fallback: read from machines table if view missing
      try {
        const rows = await executeQuery(`
          SELECT
            machine_id as id,
            machine_name as name,
            machine_type,
            availability_status as state,
            maintenance_schedule as schedule,
            capabilities,
            hourly_rate_aud,
            max_web_width_mm,
            shift_hours
          FROM machines
          ORDER BY machine_name
        `);

        return rows.map((r: any) => ({
          id: String(r.id),
          name: r.name,
          machineType: r.machine_type || undefined,
          state: r.state || 'unknown',
          currentJob: null,
          queueLength: 0,
          unitsPerHour: 0,
          maintenanceDue: !!r.schedule && String(r.schedule).trim().length > 0,
          lastUpdated: new Date().toISOString(),
          schedule: parseSchedule(r.schedule),
        } as Machinery));
      } catch (e) {
        throw new DatabaseError('Failed to fetch machineries', err);
      }
    }
  }

  async getMachineryById(id: string): Promise<Machinery | null> {
    try {
      const row = await executeQuerySingle(`
        SELECT
          machine_id as id,
          machine_name as name,
          machine_type,
          availability_status as state,
          maintenance_schedule as schedule,
          capabilities,
          hourly_rate_aud,
          max_web_width_mm,
          shift_hours
        FROM machines
        WHERE machine_id = $1
        LIMIT 1
      `, [id]);

      if (!row) return null;

      return {
        id: String(row.id),
        name: row.name,
        machineType: row.machine_type || undefined,
        state: row.state || 'unknown',
        currentJob: null,
        queueLength: 0,
        unitsPerHour: 0,
        maintenanceDue: !!row.schedule && String(row.schedule).trim().length > 0,
        lastUpdated: new Date().toISOString(),
        schedule: parseSchedule(row.schedule),
      } as Machinery;
    } catch (err) {
      throw new DatabaseError('Failed to fetch machinery', err);
    }
  }

  async updateMachinery(id: string, data: MachineryUpdate): Promise<Machinery> {
    try {
      const sets: string[] = [];
      const params: any[] = [];
      let idx = 1;

      if (data.name !== undefined) {
        sets.push(`machine_name = $${idx++}`);
        params.push(data.name);
      }

      if (data.state !== undefined) {
        sets.push(`availability_status = $${idx++}`);
        params.push(data.state);
      }

      if (data.schedule !== undefined) {
        sets.push(`maintenance_schedule = $${idx++}`);
        params.push(JSON.stringify(data.schedule));
      }

      if ((data as any).capabilities !== undefined) {
        sets.push(`capabilities = $${idx++}`);
        params.push((data as any).capabilities);
      }

      if ((data as any).machineType !== undefined) {
        sets.push(`machine_type = $${idx++}`);
        params.push((data as any).machineType);
      }

      if ((data as any).shiftHours !== undefined) {
        sets.push(`shift_hours = $${idx++}`);
        params.push((data as any).shiftHours);
      }

      if (sets.length === 0) {
        const existing = await this.getMachineryById(id);
        if (!existing) throw new Error('Machinery not found');
        return existing;
      }

      const sql = `UPDATE machines SET ${sets.join(', ')} WHERE machine_id = $${idx} RETURNING
        machine_id as id,
        machine_name as name,
        machine_type,
        availability_status as state,
        maintenance_schedule as schedule,
        capabilities,
        hourly_rate_aud,
        max_web_width_mm,
        shift_hours`;

      params.push(id);

      const row = await executeQuerySingle(sql, params);
      if (!row) throw new Error('Update failed');

      return {
        id: String(row.id),
        name: row.name,
        machineType: row.machine_type || undefined,
        state: row.state || 'unknown',
        currentJob: null,
        queueLength: 0,
        unitsPerHour: 0,
        maintenanceDue: !!row.schedule && String(row.schedule).trim().length > 0,
        lastUpdated: new Date().toISOString(),
        schedule: parseSchedule(row.schedule),
      } as Machinery;
    } catch (err) {
      throw new DatabaseError('Failed to update machinery', err);
    }
  }

  async getOperations(machineId?: string): Promise<any[]> {
    try {
      const params: any[] = [];
      let where = '';
      if (machineId) {
        where = 'WHERE machine_id = $1';
        params.push(machineId);
      }

      const rows = await executeQuery(`
        SELECT
          operation_id as id,
          operation_name as name,
          machine_id,
          operation_category,
          can_run_parallel,
          requires_operator,
          setup_time_base_minutes
        FROM operations
        ${where}
        ORDER BY name
      `, params);

      return (rows || []).map((r: any) => ({
        id: String(r.id),
        name: r.name,
        machineId: r.machine_id != null ? String(r.machine_id) : undefined,
        category: r.operation_category || undefined,
        canRunParallel: r.can_run_parallel === true,
        requiresOperator: r.requires_operator === true,
        setupTimeMinutes: r.setup_time_base_minutes != null ? Number(r.setup_time_base_minutes) : undefined,
      }));
    } catch (err) {
      // If the operations table doesn't exist, return empty list rather than throwing
      return [];
    }
  }

  // Update operation's machine association (assign/unassign to a machine)
  async updateOperationMachine(operationId: string, machineId?: string | null): Promise<any | null> {
    // Editing operation assignments is intentionally disabled.
    // This system treats operations as read-only for viewing purposes only.
    throw new DatabaseError('Operation assignments are read-only. Editing operations is disabled.');
  }

  // record a scanned code (accept operations array and optional metadata)
  async createScan(codeText: string, machineId?: string | null, userId?: string | null, operations?: any[] | null, metadata?: any): Promise<any> {
    try {
      const sql = `INSERT INTO scanned_codes (code_text, machine_id, user_id, operations, metadata) VALUES ($1, $2, $3, $4, $5) RETURNING scan_id, code_text, scanned_at, machine_id, user_id, operations, metadata`;
      const row = await executeQuerySingle(sql, [codeText, machineId || null, userId || null, operations ? JSON.stringify(operations) : null, metadata || null]);
      if (!row) return null;
      return {
        scanId: row.scan_id ?? row.scanId,
        codeText: row.code_text || row.codeText,
        scannedAt: row.scanned_at || row.scannedAt,
        machineId: row.machine_id || row.machineId,
        userId: row.user_id || row.userId,
        operations: row.operations || null,
        metadata: row.metadata || null,
      };
    } catch (err) {
      throw new DatabaseError('Failed to create scan', err);
    }
  }
}
