import { SupplierController } from '../controllers/supplierController.js';
import type { RouteHandler } from '../types/common.js';

const supplierController = new SupplierController();

/**
 * Handle all supplier-related routes
 */
export const handleSupplierRoutes: RouteHandler = async (req: Request, url: URL): Promise<Response | null> => {
  // GET /api/suppliers - Get all suppliers
  if (url.pathname === '/api/suppliers' && req.method === 'GET') {
    return await supplierController.getAllSuppliers(req, url);
  }

  // POST /api/suppliers - Create new supplier
  if (url.pathname === '/api/suppliers' && req.method === 'POST') {
    return await supplierController.createSupplier(req, url);
  }

  // GET /api/suppliers/:id - Get supplier by ID
  if (url.pathname.startsWith('/api/suppliers/') && req.method === 'GET') {
    const pathParts = url.pathname.split('/');
    if (pathParts.length === 4) { // /api/suppliers/{id}
      return await supplierController.getSupplierById(req, url);
    }
  }

  // PUT /api/suppliers/:id - Update supplier
  if (url.pathname.startsWith('/api/suppliers/') && req.method === 'PUT') {
    const pathParts = url.pathname.split('/');
    if (pathParts.length === 4) { // /api/suppliers/{id}
      return await supplierController.updateSupplier(req, url);
    }
  }

  // DELETE /api/suppliers/:id - Delete supplier
  if (url.pathname.startsWith('/api/suppliers/') && req.method === 'DELETE') {
    const pathParts = url.pathname.split('/');
    if (pathParts.length === 4) { // /api/suppliers/{id}
      return await supplierController.deleteSupplier(req, url);
    }
  }

  // Route not handled by this module
  return null;
};
