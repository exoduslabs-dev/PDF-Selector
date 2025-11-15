import { MachineryService } from '../services/machineryService.js';
import { getCorsHeaders } from '../config/cors.js';
import { createSuccessResponse, createErrorResponse } from '../middleware/errorHandler.js';
import { executeQuery, executeQuerySingle } from '../config/database.js';

export class MachineryController {
  private service = new MachineryService();

  async getAll(req: Request, url: URL): Promise<Response> {
    try {
      const origin = req.headers.get('origin') || undefined;
      const items = await this.service.getAllMachineries();
      // Attempt to read the raw view for debugging; include any error as a string
      let rawLatest: any = null;
      try {
        rawLatest = await executeQuery('SELECT * FROM latest_machineries ORDER BY name LIMIT 100');
      } catch (e) {
        rawLatest = { error: String((e as Error).message || e) };
      }

      return new Response(JSON.stringify({ items, debug: { rawLatest } }), {
        headers: { 'Content-Type': 'application/json', ...getCorsHeaders(origin) },
      });
    } catch (err) {
      const origin = req.headers.get('origin') || undefined;
      return createErrorResponse(err as Error, undefined, origin);
    }
  }

  // New: return operations (optionally filtered by machine id via query param ?machineId=)
  async getOperations(req: Request, url: URL): Promise<Response> {
    try {
      const origin = req.headers.get('origin') || undefined;
      const q = new URL(req.url);
      const machineId = q.searchParams.get('machineId') || undefined;
      const debug = (q.searchParams.get('debug') || '').toLowerCase() === 'true' || q.searchParams.get('debug') === '1';
      const ops = await this.service.getOperations(machineId);
      if (debug) {
        // return raw DB rows for inspection
        try {
          const params: any[] = [];
          let where = '';
          if (machineId) {
            where = 'WHERE machine_id = $1';
            params.push(machineId);
          }
          const raw = await executeQuery(`SELECT operation_id as id, operation_name as name, machine_id, operation_category, can_run_parallel, requires_operator, setup_time_base_minutes FROM operations ${where} ORDER BY name`, params);
          return createSuccessResponse({ operations: ops, raw }, 'OK', 200, origin);
        } catch (e) {
          // if raw query fails, still return normalized ops and include error
          return createSuccessResponse({ operations: ops, rawError: String((e as Error).message || e) }, 'OK', 200, origin);
        }
      }
      return createSuccessResponse({ operations: ops }, 'OK', 200, origin);
    } catch (err) {
      const origin = req.headers.get('origin') || undefined;
      return createErrorResponse(err as Error, undefined, origin);
    }
  }

  // PUT /api/operations/:id/machine  { machineId: string | null }
  async updateOperationMachine(req: Request, url: URL): Promise<Response> {
    try {
      const origin = req.headers.get('origin') || undefined;
      const id = url.pathname.split('/')[3]; // /api/operations/:id/machine
      if (!id) throw new Error('operation id required');
      const body = await req.json();
      const machineId = body?.machineId ?? null;
      const updated = await this.service.updateOperationMachine(id, machineId);
      if (!updated) throw new Error('update failed');
      return createSuccessResponse({ operation: updated }, 'Updated', 200, origin);
    } catch (err) {
      const origin = req.headers.get('origin') || undefined;
      return createErrorResponse(err as Error, undefined, origin);
    }
  }

  // POST /api/scans - record a scanned code
  async createScan(req: Request, url: URL): Promise<Response> {
    try {
      const origin = req.headers.get('origin') || undefined;
      const body = await req.json();
      const codeText = body?.codeText || body?.code || body?.text;
      if (!codeText) throw new Error('codeText required');
      const machineId = body?.machineId || null;
      const userId = body?.userId || null;
      const operations = Array.isArray(body?.operations) ? body.operations : (body?.operations ? [body.operations] : null);
      const metadata = body?.metadata || null;

      const row = await this.service.createScan(codeText, machineId, userId, operations, metadata);
      // return scan details including timestamp
      return createSuccessResponse({ scan: row }, 'Created', 201, origin);
    } catch (err) {
      const origin = req.headers.get('origin') || undefined;
      return createErrorResponse(err as Error, undefined, origin);
    }
  }

  async getById(req: Request, url: URL): Promise<Response> {
    try {
      const origin = req.headers.get('origin') || undefined;
      const id = url.pathname.split('/').pop();
      if (!id) throw new Error('id required');
      const item = await this.service.getMachineryById(id);
      if (!item) throw new Error('not found');
      return createSuccessResponse({ item }, 'Found', 200, origin);
    } catch (err) {
      const origin = req.headers.get('origin') || undefined;
      return createErrorResponse(err as Error, undefined, origin);
    }
  }

  async update(req: Request, url: URL): Promise<Response> {
    try {
      const origin = req.headers.get('origin') || undefined;
      const id = url.pathname.split('/').pop();
      if (!id) throw new Error('id required');
      const body = await req.json();
      const updated = await this.service.updateMachinery(id, body);
      return createSuccessResponse({ item: updated }, 'Updated', 200, origin);
    } catch (err) {
      const origin = req.headers.get('origin') || undefined;
      return createErrorResponse(err as Error, undefined, origin);
    }
  }
}
