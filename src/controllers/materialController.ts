import { MaterialService } from '../services/materialService.js';
import { 
  validateBody, 
  validateQuery, 
  validatePathParam,
  materialSchema, 
  updateMaterialSchema,
  materialGroupSchema,
  materialPricingSchema,
  paginationSchema 
} from '../middleware/validation.js';
import { createSuccessResponse, createErrorResponse } from '../middleware/errorHandler.js';
import type { CreateMaterialRequest, UpdateMaterialRequest, CreateMaterialGroupRequest, CreateMaterialPricingRequest } from '../types/materials.js';
import { parseCsv, objectsToCsv } from '../utils/csvParser.js';
import { getCorsHeaders } from '../config/cors.js';

export class MaterialController {
  private materialService = new MaterialService();

  /**
   * GET /api/materials
   */
  async getAllMaterials(req: Request, url: URL): Promise<Response> {
    try {
      const origin = req.headers.get('origin') || undefined;
      const substrateGroup = url.searchParams.get('substrate_group') || undefined;
      
      const materials = await this.materialService.getAllMaterials(substrateGroup);
      
      // Return materials array directly to match MaterialsPage expectations
      return new Response(JSON.stringify(materials), {
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
   * GET /api/materials/:id
   */
  async getMaterialById(req: Request, url: URL): Promise<Response> {
    try {
      const origin = req.headers.get('origin') || undefined;
      const materialId = url.pathname.split('/').pop();
      
      if (!materialId) {
        throw new Error('Material ID is required');
      }

      const material = await this.materialService.getMaterialById(materialId);
      
      return createSuccessResponse(
        { material },
        'Material found',
        200,
        origin
      );
    } catch (error) {
      const origin = req.headers.get('origin') || undefined;
      return createErrorResponse(error as Error, undefined, origin);
    }
  }

  /**
   * POST /api/materials
   */
  async createMaterial(req: Request, url: URL): Promise<Response> {
    try {
      const origin = req.headers.get('origin') || undefined;
      const validatedData = await validateBody(materialSchema)(req);
      
      const material = await this.materialService.createMaterial(validatedData as CreateMaterialRequest);
      
      return createSuccessResponse(
        { material },
        'Material created successfully',
        201,
        origin
      );
    } catch (error) {
      const origin = req.headers.get('origin') || undefined;
      return createErrorResponse(error as Error, undefined, origin);
    }
  }

  /**
   * PUT /api/materials/:id
   */
  async updateMaterial(req: Request, url: URL): Promise<Response> {
    try {
      const origin = req.headers.get('origin') || undefined;
      const materialId = url.pathname.split('/').pop();
      
      if (!materialId) {
        throw new Error('Material ID is required');
      }

      const validatedData = await validateBody(materialSchema.partial())(req);
      const updateData = { ...validatedData, material_id: materialId } as UpdateMaterialRequest;
      
      const material = await this.materialService.updateMaterial(updateData);
      
      return createSuccessResponse(
        { material },
        'Material updated successfully',
        200,
        origin
      );
    } catch (error) {
      const origin = req.headers.get('origin') || undefined;
      return createErrorResponse(error as Error, undefined, origin);
    }
  }

  /**
   * DELETE /api/materials/:id
   */
  async deleteMaterial(req: Request, url: URL): Promise<Response> {
    try {
      const origin = req.headers.get('origin') || undefined;
      const materialId = url.pathname.split('/').pop();
      
      if (!materialId) {
        throw new Error('Material ID is required');
      }

      await this.materialService.deleteMaterial(materialId);
      
      return createSuccessResponse(
        null,
        'Material deleted successfully',
        200,
        origin
      );
    } catch (error) {
      const origin = req.headers.get('origin') || undefined;
      return createErrorResponse(error as Error, undefined, origin);
    }
  }

  /**
   * GET /api/field-options
   */
  async getFieldOptions(req: Request, url: URL): Promise<Response> {
    try {
      const origin = req.headers.get('origin') || undefined;
      const options = await this.materialService.getFieldOptions();
      
      // Return in format expected by MaterialsPage: {options: {...}}
      return new Response(JSON.stringify({ options }), {
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
   * GET /api/material-groups
   */
  async getMaterialGroups(req: Request, url: URL): Promise<Response> {
    try {
      const origin = req.headers.get('origin') || undefined;
      const groups = await this.materialService.getAllMaterialGroups();
      
      return createSuccessResponse(
        { groups },
        `Found ${groups.length} material groups`,
        200,
        origin
      );
    } catch (error) {
      const origin = req.headers.get('origin') || undefined;
      return createErrorResponse(error as Error, undefined, origin);
    }
  }

  /**
   * POST /api/material-groups
   */
  async createMaterialGroup(req: Request, url: URL): Promise<Response> {
    try {
      const origin = req.headers.get('origin') || undefined;
      const validatedData = await validateBody(materialGroupSchema)(req);
      
      const group = await this.materialService.createMaterialGroup(validatedData as CreateMaterialGroupRequest);
      
      return createSuccessResponse(
        { group },
        'Material group created successfully',
        201,
        origin
      );
    } catch (error) {
      const origin = req.headers.get('origin') || undefined;
      return createErrorResponse(error as Error, undefined, origin);
    }
  }

  /**
   * GET /api/material-pricing
   */
  async getMaterialPricing(req: Request, url: URL): Promise<Response> {
    try {
      const origin = req.headers.get('origin') || undefined;
      const materialId = url.searchParams.get('material_id');
      
      if (!materialId) {
        throw new Error('material_id query parameter is required');
      }

      const items = await this.materialService.getMaterialPricing(materialId);
      
      // Return in format expected by MaterialsPage: {items: [...]}
      return new Response(JSON.stringify({ items }), {
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
   * POST /api/material-pricing
   */
  async createMaterialPricing(req: Request, url: URL): Promise<Response> {
    try {
      const origin = req.headers.get('origin') || undefined;
      const validatedData = await validateBody(materialPricingSchema)(req);
      
      const pricing = await this.materialService.createMaterialPricing(validatedData as CreateMaterialPricingRequest);
      
      return createSuccessResponse(
        { pricing },
        'Material pricing created successfully',
        201,
        origin
      );
    } catch (error) {
      const origin = req.headers.get('origin') || undefined;
      return createErrorResponse(error as Error, undefined, origin);
    }
  }

  /**
   * PUT /api/material-pricing/:id
   */
  async updateMaterialPricing(req: Request, url: URL): Promise<Response> {
    try {
      const origin = req.headers.get('origin') || undefined;
      const pricingId = url.pathname.split('/').pop();
      
      if (!pricingId) {
        throw new Error('Pricing ID is required');
      }

      const validatedData = await validateBody(materialPricingSchema.partial())(req);
      
      const pricing = await this.materialService.updateMaterialPricing(pricingId, validatedData);
      
      return createSuccessResponse(
        { pricing },
        'Material pricing updated successfully',
        200,
        origin
      );
    } catch (error) {
      const origin = req.headers.get('origin') || undefined;
      return createErrorResponse(error as Error, undefined, origin);
    }
  }

  /**
   * DELETE /api/material-pricing/:id
   */
  async deleteMaterialPricing(req: Request, url: URL): Promise<Response> {
    try {
      const origin = req.headers.get('origin') || undefined;
      const pricingId = url.pathname.split('/').pop();
      
      if (!pricingId) {
        throw new Error('Pricing ID is required');
      }

      await this.materialService.deleteMaterialPricing(pricingId);
      
      return createSuccessResponse(
        null,
        'Material pricing deleted successfully',
        200,
        origin
      );
    } catch (error) {
      const origin = req.headers.get('origin') || undefined;
      return createErrorResponse(error as Error, undefined, origin);
    }
  }

  /**
   * GET /api/materials/csv-template
   */
  async getCsvTemplate(req: Request, url: URL): Promise<Response> {
    try {
      const origin = req.headers.get('origin') || undefined;
      
      const csvTemplate = `material_name,material_code,substrate_type,substrate_group,adhesive_type,handling,weight_gsm,grain_direction,coating,glossy_level,conductive,white_material,pricing_unit,cost_aud,currency,stock_level,reorder_level,lead_time_days,aliases,notes,supplier_id_1,supplier_cost_1,supplier_unit_1,supplier_preferred_1,supplier_id_2,supplier_cost_2,supplier_unit_2,supplier_preferred_2,supplier_id_3,supplier_cost_3,supplier_unit_3,supplier_preferred_3
Example Material,MAT-001,vinyl,Labels,permanent,web,80,MD,coated,matte,false,false,sqm,15.50,AUD,100,20,7,ALT001,Test material,SUP001,12.00,sqm,true,SUP002,13.50,sqm,false,,,,,`;

      return new Response(csvTemplate, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': 'attachment; filename="materials_template.csv"',
          ...getCorsHeaders(origin),
        },
      });
    } catch (error) {
      const origin = req.headers.get('origin') || undefined;
      return createErrorResponse(error as Error, undefined, origin);
    }
  }

  /**
   * POST /api/materials/csv-upload
   */
  async uploadCsv(req: Request, url: URL): Promise<Response> {
    try {
      const origin = req.headers.get('origin') || undefined;
      
      // Parse form data
      const formData = await req.formData();
      const file = formData.get('file') as File;
      
      if (!file) {
        throw new Error('No file provided');
      }

      const content = await file.text();
      const parseResult = parseCsv(content);

      // Process each row
      const results = {
        successful: 0,
        failed: 0,
        errors: [] as string[],
      };

      for (let i = 0; i < parseResult.data.length; i++) {
        try {
          const row = parseResult.data[i] as any;
          
          // Create material
          const materialData: CreateMaterialRequest = {
            material_name: row.material_name,
            material_code: row.material_code || undefined,
            substrate_type: row.substrate_type || undefined,
            substrate_group: row.substrate_group || undefined,
            adhesive_type: row.adhesive_type || undefined,
            handling: row.handling || undefined,
            weight_gsm: row.weight_gsm ? parseFloat(row.weight_gsm) : undefined,
            grain_direction: row.grain_direction || undefined,
            coating: row.coating || undefined,
            glossy_level: row.glossy_level || undefined,
            conductive: row.conductive ? row.conductive.toLowerCase() === 'true' : undefined,
            white_material: row.white_material ? row.white_material.toLowerCase() === 'true' : undefined,
            pricing_unit: row.pricing_unit || undefined,
            cost_aud: row.cost_aud ? parseFloat(row.cost_aud) : undefined,
            currency: row.currency || undefined,
            stock_level: row.stock_level ? parseInt(row.stock_level, 10) : undefined,
            reorder_level: row.reorder_level ? parseInt(row.reorder_level, 10) : undefined,
            lead_time_days: row.lead_time_days ? parseInt(row.lead_time_days, 10) : undefined,
            aliases: row.aliases || undefined,
            notes: row.notes || undefined,
          };

          const material = await this.materialService.createMaterial(materialData);

          // Process supplier pricing (up to 3 suppliers)
          for (let j = 1; j <= 3; j++) {
            const supplierId = row[`supplier_id_${j}`];
            const supplierCost = row[`supplier_cost_${j}`];
            const supplierUnit = row[`supplier_unit_${j}`];
            const supplierPreferred = row[`supplier_preferred_${j}`];

            if (supplierId && supplierCost) {
              try {
                await this.materialService.createMaterialPricing({
                  material_id: material.material_id,
                  supplier_id: supplierId,
                  cost_per_unit: parseFloat(supplierCost),
                  pricing_unit: supplierUnit || materialData.pricing_unit || 'sqm',
                  is_preferred_supplier: supplierPreferred ? supplierPreferred.toLowerCase() === 'true' : false,
                });
              } catch (pricingError) {
                console.warn(`Failed to create pricing for supplier ${j}:`, pricingError);
              }
            }
          }

          results.successful++;
        } catch (error) {
          results.failed++;
          results.errors.push(`Row ${i + 2}: ${(error as Error).message}`);
        }
      }

      return createSuccessResponse(
        { results },
        `CSV processed: ${results.successful} successful, ${results.failed} failed`,
        200,
        origin
      );
    } catch (error) {
      const origin = req.headers.get('origin') || undefined;
      return createErrorResponse(error as Error, undefined, origin);
    }
  }
}
