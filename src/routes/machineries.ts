import { MachineryController } from '../controllers/machineryController.js';

const controller = new MachineryController();

export const handleMachineryRoutes = async (req: Request, url: URL) => {
  if (url.pathname === '/api/operations' && req.method === 'GET') {
    return controller.getOperations(req, url);
  }

  // Update operation machine assignment
  if (url.pathname.startsWith('/api/operations/') && req.method === 'PUT' && url.pathname.endsWith('/machine')) {
    return controller.updateOperationMachine(req, url);
  }

  if (url.pathname === '/api/scans' && req.method === 'POST') {
    return controller.createScan(req, url);
  }

  if (url.pathname === '/api/machineries' && req.method === 'GET' && url.pathname === '/api/machineries') {
    return controller.getAll(req, url);
  }

  if (url.pathname.startsWith('/api/machineries/') && req.method === 'GET') {
    return controller.getById(req, url);
  }

  if (url.pathname.startsWith('/api/machineries/') && (req.method === 'PUT' || req.method === 'POST')) {
    return controller.update(req, url);
  }

  return null;
};
