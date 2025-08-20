import { QuoteService } from '../services/quoteService.js';
import { createSuccessResponse, createErrorResponse } from '../middleware/errorHandler.js';
import { getCorsHeaders } from '../config/cors.js';

export class QuoteController {
  private quoteService = new QuoteService();

  /**
   * GET /api/quotes
   */
  async getAllQuotes(req: Request, url: URL): Promise<Response> {
    try {
      const origin = req.headers.get('origin') || undefined;
      const limitParam = url.searchParams.get('limit');
      const limit = limitParam ? parseInt(limitParam, 10) : 50;
      
      const quotes = await this.quoteService.getAllQuotes(limit);
      
      // Return quotes in the format expected by the frontend (direct array)
      return new Response(JSON.stringify(quotes), {
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
   * POST /api/update-quote-notes
   */
  async updateQuoteNotes(req: Request, url: URL): Promise<Response> {
    try {
      const origin = req.headers.get('origin') || undefined;
      const body = await req.json();
      const { quoteId, notes } = body;

      if (!quoteId) {
        throw new Error('Quote ID is required');
      }

      await this.quoteService.updateQuoteNotes(quoteId, notes || '');
      
      return createSuccessResponse(
        { success: true },
        'Quote notes updated successfully',
        200,
        origin
      );
    } catch (error) {
      const origin = req.headers.get('origin') || undefined;
      return createErrorResponse(error as Error, undefined, origin);
    }
  }
}
