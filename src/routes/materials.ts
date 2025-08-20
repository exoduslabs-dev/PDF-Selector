import { MaterialController } from '../controllers/materialController.js';
import type { RouteHandler } from '../types/common.js';

const materialController = new MaterialController();

/**
 * Handle all material-related routes
 */
export const handleMaterialRoutes: RouteHandler = async (req: Request, url: URL): Promise<Response | null> => {
  // GET /api/materials - Get all materials
  if (url.pathname === '/api/materials' && req.method === 'GET') {
    return await materialController.getAllMaterials(req, url);
  }

  // POST /api/materials - Create new material
  if (url.pathname === '/api/materials' && req.method === 'POST') {
    return await materialController.createMaterial(req, url);
  }

  // GET /api/materials/:id - Get material by ID
  if (url.pathname.startsWith('/api/materials/') && req.method === 'GET' && !url.pathname.includes('/csv-')) {
    const pathParts = url.pathname.split('/');
    if (pathParts.length === 4) { // /api/materials/{id}
      return await materialController.getMaterialById(req, url);
    }
  }

  // PUT /api/materials/:id - Update material
  if (url.pathname.startsWith('/api/materials/') && req.method === 'PUT') {
    const pathParts = url.pathname.split('/');
    if (pathParts.length === 4) { // /api/materials/{id}
      return await materialController.updateMaterial(req, url);
    }
  }

  // DELETE /api/materials/:id - Delete material
  if (url.pathname.startsWith('/api/materials/') && req.method === 'DELETE') {
    const pathParts = url.pathname.split('/');
    if (pathParts.length === 4) { // /api/materials/{id}
      return await materialController.deleteMaterial(req, url);
    }
  }

  // GET /api/field-options - Get field options for dropdowns
  if (url.pathname === '/api/field-options' && req.method === 'GET') {
    return await materialController.getFieldOptions(req, url);
  }

  // GET /api/material-groups - Get all material groups
  if (url.pathname === '/api/material-groups' && req.method === 'GET') {
    return await materialController.getMaterialGroups(req, url);
  }

  // POST /api/material-groups - Create material group
  if (url.pathname === '/api/material-groups' && req.method === 'POST') {
    return await materialController.createMaterialGroup(req, url);
  }

  // GET /api/material-pricing - Get material pricing
  if (url.pathname === '/api/material-pricing' && req.method === 'GET') {
    return await materialController.getMaterialPricing(req, url);
  }

  // POST /api/material-pricing - Create material pricing
  if (url.pathname === '/api/material-pricing' && req.method === 'POST') {
    return await materialController.createMaterialPricing(req, url);
  }

  // PUT /api/material-pricing/:id - Update material pricing
  if (url.pathname.startsWith('/api/material-pricing/') && req.method === 'PUT') {
    return await materialController.updateMaterialPricing(req, url);
  }

  // DELETE /api/material-pricing/:id - Delete material pricing
  if (url.pathname.startsWith('/api/material-pricing/') && req.method === 'DELETE') {
    return await materialController.deleteMaterialPricing(req, url);
  }

  // GET /api/materials/csv-template - Download CSV template
  if (url.pathname === '/api/materials/csv-template' && req.method === 'GET') {
    return await materialController.getCsvTemplate(req, url);
  }

  // POST /api/materials/csv-upload - Upload CSV
  if (url.pathname === '/api/materials/csv-upload' && req.method === 'POST') {
    return await materialController.uploadCsv(req, url);
  }

  // Route not handled by this module
  return null;
};
