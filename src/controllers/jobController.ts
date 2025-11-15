import { JobService } from '../services/jobService.js';
import { createSuccessResponse, createErrorResponse } from '../middleware/errorHandler.js';
import { getCorsHeaders } from '../config/cors.js';

export class JobController {
  private jobService = new JobService();

  /**
   * GET /api/jobs
   */
  async getAllJobs(req: Request, url: URL): Promise<Response> {
    try {
      const origin = req.headers.get('origin') || undefined;
      const limitParam = url.searchParams.get('limit');
      const company = url.searchParams.get('company');
      const filter = url.searchParams.get('filter');
      const excludeDispatchedParam = url.searchParams.get('excludeDispatched');
      const excludeDispatched = excludeDispatchedParam === '1' || excludeDispatchedParam === 'true';
      const limit = limitParam ? parseInt(limitParam, 10) : 50;

      // Forward company/filter/excludeDispatched so getAllJobs can reuse the Kanban query
      // and return the same dataset (different shape) when company is provided.
      const jobs = await this.jobService.getAllJobs(limit, company || undefined, filter || undefined, excludeDispatched);
      
      // Return jobs in the format expected by the frontend (direct array)
      return new Response(JSON.stringify(jobs), {
        headers: {
          'Content-Type': 'application/json',
          ...getCorsHeaders(origin),
        },
      });
    } catch (error) {
      const origin = req.headers.get('origin') || undefined;
      return createErrorResponse(error as Error, undefined, origin);
    }
  }

  /**
   * GET /api/kanban-data
   */
  async getKanbanData(req: Request, url: URL): Promise<Response> {
    try {
      const origin = req.headers.get('origin') || undefined;
      const limitParam = url.searchParams.get('limit');
      const company = url.searchParams.get('company');
      const filter = url.searchParams.get('filter');
      const excludeDispatchedParam = url.searchParams.get('excludeDispatched');
      const excludeDispatched = excludeDispatchedParam === '1' || excludeDispatchedParam === 'true';
      
      const limit = limitParam ? parseInt(limitParam, 10) : 20;
      
      const kanbanData = await this.jobService.getKanbanData(limit, company || undefined, filter || undefined, excludeDispatched);
      
      // Return response in expected format
      return new Response(JSON.stringify({
        success: true,
        data: kanbanData
      }), {
        headers: {
          'Content-Type': 'application/json',
          ...getCorsHeaders(origin),
        },
      });
    } catch (error) {
      const origin = req.headers.get('origin') || undefined;
      return createErrorResponse(error as Error, undefined, origin);
    }
  }

  /**
   * PUT /api/jobs/:jobId/status
   */
  async updateJobStatus(req: Request, url: URL): Promise<Response> {
    try {
      const origin = req.headers.get('origin') || undefined;
      // Extract jobId from URL like /api/jobs/:jobId/status
      const pathParts = url.pathname.split('/').filter(Boolean); // removes empty segments
      let jobId = pathParts.length >= 3 ? pathParts[pathParts.length - 2] : undefined;

      console.log('[jobController] updateJobStatus incoming pathname', url.pathname);
      if (jobId) {
        const decoded = decodeURIComponent(String(jobId)).trim();
        console.log('[jobController] updateJobStatus extracted jobId', { raw: jobId, decoded, length: decoded.length, type: typeof decoded });
        jobId = decoded;
      }
      const body = await req.json();
      const { processed, orderstatus } = body;

      // Debug logging
      console.log('[jobController] updateJobStatus called', { jobId, processed, orderstatus });

      if (!jobId || typeof processed !== 'boolean') {
        return new Response(JSON.stringify({ error: 'Invalid request' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json', ...getCorsHeaders(origin) },
        });
      }
      
      const updateResult = await this.jobService.updateJobStatus(jobId, processed, orderstatus);

      if (!updateResult) {
        console.warn('[jobController] updateJobStatus - no rows updated', { jobId, processed, orderstatus });
        return new Response(JSON.stringify({ success: false, error: 'No matching job found', updated: null }), {
          status: 404,
          headers: { 'Content-Type': 'application/json', ...getCorsHeaders(origin) },
        });
      }

      console.log('[jobController] updateJobStatus succeeded', { jobId, processed, orderstatus, updateResult });
      
      return new Response(JSON.stringify({ success: true, updated: updateResult }), {
        headers: { 'Content-Type': 'application/json', ...getCorsHeaders(origin) },
      });
    } catch (error) {
      console.error('[jobController] updateJobStatus error', error);
      const origin = req.headers.get('origin') || undefined;
      return createErrorResponse(error as Error, undefined, origin);
    }
  }
}
