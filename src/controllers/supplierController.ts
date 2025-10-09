import { SupplierService } from '../services/supplierService.js';
import { 
  validateBody, 
  supplierSchema 
} from '../middleware/validation.js';
import { createSuccessResponse, createErrorResponse } from '../middleware/errorHandler.js';
import type { UpdateSupplierRequest } from '../types/suppliers.js';
import type { CreateSupplierRequest } from '../types/suppliers.js';
import { getCorsHeaders } from '../config/cors.js';

export class SupplierController {
  private supplierService = new SupplierService();

  /**
   * GET /api/suppliers
   */
  async getAllSuppliers(req: Request, url: URL): Promise<Response> {
    try {
      const origin = req.headers.get('origin') || undefined;
      const suppliers = await this.supplierService.getAllSuppliers();
      
      // Return in format expected by MaterialsPage: {suppliers: [...]}
      return new Response(JSON.stringify({ suppliers }), {
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
   * GET /api/suppliers/:id
   */
  async getSupplierById(req: Request, url: URL): Promise<Response> {
    try {
      const origin = req.headers.get('origin') || undefined;
      const supplierId = url.pathname.split('/').pop();
      
      if (!supplierId) {
        throw new Error('Supplier ID is required');
      }

      const supplier = await this.supplierService.getSupplierById(supplierId);
      
      return createSuccessResponse(
        { supplier },
        'Supplier found',
        200,
        origin
      );
    } catch (error) {
      const origin = req.headers.get('origin') || undefined;
      return createErrorResponse(error as Error, undefined, origin);
    }
  }

  /**
   * POST /api/suppliers
   */
  async createSupplier(req: Request, url: URL): Promise<Response> {
    try {
      const origin = req.headers.get('origin') || undefined;
      const validatedData = await validateBody(supplierSchema)(req);
      
      const supplier = await this.supplierService.createSupplier(validatedData as CreateSupplierRequest);
      
      return createSuccessResponse(
        { supplier },
        'Supplier created successfully',
        201,
        origin
      );
    } catch (error) {
      const origin = req.headers.get('origin') || undefined;
      return createErrorResponse(error as Error, undefined, origin);
    }
  }

  /**
   * PUT /api/suppliers/:id
   */
  async updateSupplier(req: Request, url: URL): Promise<Response> {
    try {
      const origin = req.headers.get('origin') || undefined;
      const supplierId = url.pathname.split('/').pop();
      
      if (!supplierId) {
        throw new Error('Supplier ID is required');
      }

      const validatedData = await validateBody(supplierSchema.partial())(req);
      const updateData = { ...validatedData, supplier_id: supplierId } as UpdateSupplierRequest;
      
      const supplier = await this.supplierService.updateSupplier(updateData);
      
      return createSuccessResponse(
        { supplier },
        'Supplier updated successfully',
        200,
        origin
      );
    } catch (error) {
      const origin = req.headers.get('origin') || undefined;
      return createErrorResponse(error as Error, undefined, origin);
    }
  }

  /**
   * DELETE /api/suppliers/:id
   */
  async deleteSupplier(req: Request, url: URL): Promise<Response> {
    try {
      const origin = req.headers.get('origin') || undefined;
      const supplierId = url.pathname.split('/').pop();
      
      if (!supplierId) {
        throw new Error('Supplier ID is required');
      }

      await this.supplierService.deleteSupplier(supplierId);
      
      return createSuccessResponse(
        null,
        'Supplier deleted successfully',
        200,
        origin
      );
    } catch (error) {
      const origin = req.headers.get('origin') || undefined;
      return createErrorResponse(error as Error, undefined, origin);
    }
  }
}
