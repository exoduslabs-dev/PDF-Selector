import { handleMaterialRoutes } from './materials.js';
import { handleSupplierRoutes } from './suppliers.js';
import { handleQuoteRoutes } from './quotes.js';
import { handleJobRoutes } from './jobs.js';
import { handleCustomerRoutes } from './customers.js';
import { handleFileRoutes } from './files.js';
import { handleMachineryRoutes } from './machineries.js';
import type { RouteHandler } from '../types/common.js';

/**
 * Main router that delegates to specific route handlers
 */
export const router: RouteHandler = async (req: Request, url: URL): Promise<Response | null> => {
  // Try material routes first
  const materialResponse = await handleMaterialRoutes(req, url);
  if (materialResponse) return materialResponse;

  // Try supplier routes
  const supplierResponse = await handleSupplierRoutes(req, url);
  if (supplierResponse) return supplierResponse;

  // Try quote routes
  const quoteResponse = await handleQuoteRoutes(req, url);
  if (quoteResponse) return quoteResponse;

  // Try job routes
  const jobResponse = await handleJobRoutes(req, url);
  if (jobResponse) return jobResponse;

  // Try customer routes
  const customerResponse = await handleCustomerRoutes(req, url);
  if (customerResponse) return customerResponse;

  // Try file routes
  const fileResponse = await handleFileRoutes(req, url);
  if (fileResponse) return fileResponse;

  // Try machinery routes
  const machineryResponse = await handleMachineryRoutes(req, url);
  if (machineryResponse) return machineryResponse;

  // No route matched
  return null;
};
