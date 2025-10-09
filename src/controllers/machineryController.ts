import { MachineryService } from '../services/machineryService.js';
import { getCorsHeaders } from '../config/cors.js';
import { createSuccessResponse, createErrorResponse } from '../middleware/errorHandler.js';
import { executeQuery } from '../config/database.js';

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
