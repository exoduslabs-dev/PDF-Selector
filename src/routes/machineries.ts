import { MachineryController } from '../controllers/machineryController.js';

const controller = new MachineryController();

export const handleMachineryRoutes = async (req: Request, url: URL) => {
  if (url.pathname.startsWith('/api/machineries') && req.method === 'GET' && url.pathname === '/api/machineries') {
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
