import { CustomerService } from '../services/customerService.js';
import { createSuccessResponse, createErrorResponse } from '../middleware/errorHandler.js';
import { getCorsHeaders } from '../config/cors.js';

export class CustomerController {
  private customerService = new CustomerService();

  /**
   * GET /api/customers
   */
  async getAllCustomers(req: Request, url: URL): Promise<Response> {
    try {
      const origin = req.headers.get('origin') || undefined;
      const customers = await this.customerService.getAllCustomers();
      
      return createSuccessResponse(
        { customers },
        `Found ${customers.length} customers`,
        200,
        origin
      );
    } catch (error) {
      const origin = req.headers.get('origin') || undefined;
      return createErrorResponse(error as Error, undefined, origin);
    }
  }

  /**
   * GET /api/customers/:id
   */
  async getCustomerById(req: Request, url: URL): Promise<Response> {
    try {
      const origin = req.headers.get('origin') || undefined;
      const customerId = url.pathname.split('/').pop();
      
      if (!customerId) {
        throw new Error('Customer ID is required');
      }

      const customer = await this.customerService.getCustomerById(customerId);
      
      if (!customer) {
        return createErrorResponse(new Error('Customer not found'), 404, origin);
      }
      
      return createSuccessResponse(
        { customer },
        'Customer found',
        200,
        origin
      );
    } catch (error) {
      const origin = req.headers.get('origin') || undefined;
      return createErrorResponse(error as Error, undefined, origin);
    }
  }
}
