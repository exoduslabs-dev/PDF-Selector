import { JobController } from '../controllers/jobController.js';
import type { RouteHandler } from '../types/common.js';

const jobController = new JobController();

/**
 * Handle all job-related routes
 */
export const handleJobRoutes: RouteHandler = async (req: Request, url: URL): Promise<Response | null> => {
  // GET /api/jobs - Get all jobs
  if (url.pathname === '/api/jobs' && req.method === 'GET') {
    return await jobController.getAllJobs(req, url);
  }

  // GET /api/kanban-data - Get kanban board data
  if (url.pathname === '/api/kanban-data' && req.method === 'GET') {
    return await jobController.getKanbanData(req, url);
  }

  // PUT /api/jobs/:jobId/status - Update job status
  if (url.pathname.startsWith('/api/jobs/') && url.pathname.endsWith('/status') && req.method === 'PUT') {
    return await jobController.updateJobStatus(req, url);
  }

  // Route not handled by this module
  return null;
};
