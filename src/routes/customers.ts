import { CustomerController } from '../controllers/customerController.js';
import type { RouteHandler } from '../types/common.js';

const customerController = new CustomerController();

/**
 * Handle all customer-related routes
 */
export const handleCustomerRoutes: RouteHandler = async (req: Request, url: URL): Promise<Response | null> => {
  // GET /api/customers - Get all customers
  if (url.pathname === '/api/customers' && req.method === 'GET') {
    return await customerController.getAllCustomers(req, url);
  }

  // GET /api/customers/:id - Get customer by ID
  if (url.pathname.startsWith('/api/customers/') && req.method === 'GET') {
    const pathParts = url.pathname.split('/');
    if (pathParts.length === 4) { // /api/customers/{id}
      return await customerController.getCustomerById(req, url);
    }
  }

  // Route not handled by this module
  return null;
};
