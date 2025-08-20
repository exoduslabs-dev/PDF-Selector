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
      const limit = limitParam ? parseInt(limitParam, 10) : 50;
      
      const jobs = await this.jobService.getAllJobs(limit);
      
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
      
      const limit = limitParam ? parseInt(limitParam, 10) : 20;
      
      const kanbanData = await this.jobService.getKanbanData(limit, company || undefined, filter || undefined);
      
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
}
