import { QuoteController } from '../controllers/quoteController.js';
import type { RouteHandler } from '../types/common.js';

const quoteController = new QuoteController();

/**
 * Handle all quote-related routes
 */
export const handleQuoteRoutes: RouteHandler = async (req: Request, url: URL): Promise<Response | null> => {
  // GET /api/quotes - Get all quotes
  if (url.pathname === '/api/quotes' && req.method === 'GET') {
    return await quoteController.getAllQuotes(req, url);
  }

  // POST /api/update-quote-notes - Update quote notes
  if (url.pathname === '/api/update-quote-notes' && req.method === 'POST') {
    return await quoteController.updateQuoteNotes(req, url);
  }

  // Route not handled by this module
  return null;
};
