import { executeQuery, executeQuerySingle } from '../config/database.js';
import type { 
  Material, 
  CreateMaterialRequest, 
  UpdateMaterialRequest,
  MaterialGroup,
  CreateMaterialGroupRequest,
  MaterialSupplierPricing,
  CreateMaterialPricingRequest,
  UpdateMaterialPricingRequest,
  MaterialFieldOptions,
  MaterialCsvRow
} from '../types/materials.js';
import { DatabaseError, NotFoundError } from '../types/common.js';
import { generateMaterialCode, generatePricingId, generateGroupId } from '../utils/codeGenerator.js';

export class MaterialService {
  /**
   * Get all materials with optional filtering
   */
  async getAllMaterials(substratGroupFilter?: string): Promise<Material[]> {
    try {
      let query = `SELECT * FROM materials`;
      const params: any[] = [];

      if (substratGroupFilter && substratGroupFilter !== 'all') {
        query += ' WHERE substrate_group = $1';
        params.push(substratGroupFilter);
      }

      query += ' ORDER BY material_name ASC';

      return await executeQuery<Material>(query, params);
    } catch (error) {
      throw new DatabaseError('Failed to fetch materials', error);
    }
  }

  /**
   * Get material by ID
   */
  async getMaterialById(materialId: string): Promise<Material> {
    try {
      const material = await executeQuerySingle<Material>(
        `SELECT * FROM materials WHERE material_id = $1`,
        [materialId]
      );

      if (!material) {
        throw new NotFoundError('Material', materialId);
      }

      return material;
    } catch (error) {
      if (error instanceof NotFoundError) throw error;
      throw new DatabaseError('Failed to fetch material', error);
    }
  }

  /**
   * Create a new material
   */
  async createMaterial(data: CreateMaterialRequest): Promise<Material> {
    try {
      const materialId = data.material_code || generateMaterialCode();
      
      const query = `
        INSERT INTO materials (
          material_id, material_code, material_name, substrate_type, substrate_group,
          adhesive_type, handling, weight_gsm, grain_direction, coating, glossy_level,
          conductive, white_material, pricing_unit, cost_aud, currency, stock_level,
          reorder_level, lead_time_days, aliases, notes, is_active, created_at, updated_at
        )
        VALUES (
          $1, $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, TRUE, NOW(), NOW()
        )
        RETURNING *
      `;

      const result = await executeQuerySingle<Material>(query, [
        materialId,
        data.material_name,
        data.substrate_type,
        data.substrate_group,
        data.adhesive_type,
        data.handling,
        data.weight_gsm,
        data.grain_direction,
        data.coating,
        data.glossy_level,
        data.conductive,
        data.white_material,
        data.pricing_unit,
        data.cost_aud,
        data.currency,
        data.stock_level,
        data.reorder_level,
        data.lead_time_days,
        data.aliases,
        data.notes,
      ]);

      if (!result) {
        throw new DatabaseError('Failed to create material');
      }

      return result;
    } catch (error) {
      throw new DatabaseError('Failed to create material', error);
    }
  }

  /**
   * Update an existing material
   */
  async updateMaterial(data: UpdateMaterialRequest): Promise<Material> {
    try {
      // Check if material exists
      await this.getMaterialById(data.material_id);

      const query = `
        UPDATE materials SET
          material_name = COALESCE($2, material_name),
          substrate_type = COALESCE($3, substrate_type),
          substrate_group = COALESCE($4, substrate_group),
          adhesive_type = COALESCE($5, adhesive_type),
          handling = COALESCE($6, handling),
          weight_gsm = COALESCE($7, weight_gsm),
          grain_direction = COALESCE($8, grain_direction),
          coating = COALESCE($9, coating),
          glossy_level = COALESCE($10, glossy_level),
          conductive = COALESCE($11, conductive),
          white_material = COALESCE($12, white_material),
          pricing_unit = COALESCE($13, pricing_unit),
          cost_aud = COALESCE($14, cost_aud),
          currency = COALESCE($15, currency),
          stock_level = COALESCE($16, stock_level),
          reorder_level = COALESCE($17, reorder_level),
          lead_time_days = COALESCE($18, lead_time_days),
          aliases = COALESCE($19, aliases),
          notes = COALESCE($20, notes),
          updated_at = NOW()
        WHERE material_id = $1 AND is_active = TRUE
        RETURNING *
      `;

      const result = await executeQuerySingle<Material>(query, [
        data.material_id,
        data.material_name,
        data.substrate_type,
        data.substrate_group,
        data.adhesive_type,
        data.handling,
        data.weight_gsm,
        data.grain_direction,
        data.coating,
        data.glossy_level,
        data.conductive,
        data.white_material,
        data.pricing_unit,
        data.cost_aud,
        data.currency,
        data.stock_level,
        data.reorder_level,
        data.lead_time_days,
        data.aliases,
        data.notes,
      ]);

      if (!result) {
        throw new NotFoundError('Material', data.material_id);
      }

      return result;
    } catch (error) {
      if (error instanceof NotFoundError) throw error;
      throw new DatabaseError('Failed to update material', error);
    }
  }

  /**
   * Soft delete a material
   */
  async deleteMaterial(materialId: string): Promise<void> {
    try {
      const result = await executeQuery(
        'UPDATE materials SET is_active = FALSE, updated_at = NOW() WHERE material_id = $1 AND is_active = TRUE',
        [materialId]
      );

      if (result.length === 0) {
        throw new NotFoundError('Material', materialId);
      }
    } catch (error) {
      if (error instanceof NotFoundError) throw error;
      throw new DatabaseError('Failed to delete material', error);
    }
  }

  /**
   * Get field options for dropdowns
   */
  async getFieldOptions(): Promise<MaterialFieldOptions> {
    try {
      // Get values from database
      const [substrateTypes, substrateGroups, adhesiveTypes, handlingTypes, coatingTypes, pricingUnits] = await Promise.all([
        executeQuery('SELECT DISTINCT substrate_type FROM materials WHERE substrate_type IS NOT NULL AND substrate_type != \'\' ORDER BY substrate_type'),
        executeQuery('SELECT DISTINCT substrate_group FROM materials WHERE substrate_group IS NOT NULL AND substrate_group != \'\' ORDER BY substrate_group'),
        executeQuery('SELECT DISTINCT adhesive_type FROM materials WHERE adhesive_type IS NOT NULL AND adhesive_type != \'\' ORDER BY adhesive_type'),
        executeQuery('SELECT DISTINCT handling FROM materials WHERE handling IS NOT NULL AND handling != \'\' ORDER BY handling'),
        executeQuery('SELECT DISTINCT coating FROM materials WHERE coating IS NOT NULL AND coating != \'\' ORDER BY coating'),
        executeQuery('SELECT DISTINCT pricing_unit FROM materials WHERE pricing_unit IS NOT NULL AND pricing_unit != \'\' ORDER BY pricing_unit')
      ]);

      // Get database values
      const dbSubstrateTypes = substrateTypes.map((r: any) => r.substrate_type);
      const dbSubstrateGroups = substrateGroups.map((r: any) => r.substrate_group);
      const dbAdhesiveTypes = adhesiveTypes.map((r: any) => r.adhesive_type);
      const dbHandlingTypes = handlingTypes.map((r: any) => r.handling);
      const dbCoatingTypes = coatingTypes.map((r: any) => r.coating);
      const dbPricingUnits = pricingUnits.map((r: any) => r.pricing_unit);

      // Return database values with fallbacks if empty
      return {
        substrate_types: dbSubstrateTypes.length > 0 ? dbSubstrateTypes : ['paper', 'vinyl', 'fabric', 'plastic', 'metal', 'glass'],
        substrate_groups: dbSubstrateGroups.length > 0 ? dbSubstrateGroups : ['paper_rolls', 'vinyl_sheets', 'fabric_rolls', 'plastic_sheets'],
        adhesive_types: dbAdhesiveTypes.length > 0 ? dbAdhesiveTypes : ['permanent', 'removable', 'repositionable', 'none'],
        handling_types: dbHandlingTypes.length > 0 ? dbHandlingTypes : ['normal', 'careful', 'fragile', 'temperature_controlled'],
        coating_types: dbCoatingTypes.length > 0 ? dbCoatingTypes : ['matte', 'gloss', 'satin', 'textured', 'none'],
        pricing_units: dbPricingUnits.length > 0 ? dbPricingUnits : ['sqm', 'linear_meter', 'piece', 'kg', 'roll']
      };
    } catch (error) {
      console.error('Failed to fetch field options:', error);
      // Return fallback values if database queries fail
      return {
        substrate_types: ['paper', 'vinyl', 'fabric', 'plastic', 'metal', 'glass'],
        substrate_groups: ['paper_rolls', 'vinyl_sheets', 'fabric_rolls', 'plastic_sheets'],
        adhesive_types: ['permanent', 'removable', 'repositionable', 'none'],
        handling_types: ['normal', 'careful', 'fragile', 'temperature_controlled'],
        coating_types: ['matte', 'gloss', 'satin', 'textured', 'none'],
        pricing_units: ['sqm', 'linear_meter', 'piece', 'kg', 'roll']
      };
    }
  }

  // Material Groups methods
  async getAllMaterialGroups(): Promise<MaterialGroup[]> {
    try {
      return await executeQuery<MaterialGroup>(
        'SELECT * FROM material_groups ORDER BY group_name ASC'
      );
    } catch (error) {
      throw new DatabaseError('Failed to fetch material groups', error);
    }
  }

  async createMaterialGroup(data: CreateMaterialGroupRequest): Promise<MaterialGroup> {
    try {
      const groupId = generateGroupId();
      
      const result = await executeQuerySingle<MaterialGroup>(
        `INSERT INTO material_groups (group_id, group_name, description, is_active, created_at, updated_at)
         VALUES ($1, $2, $3, TRUE, NOW(), NOW())
         RETURNING *`,
        [groupId, data.group_name, data.description]
      );

      if (!result) {
        throw new DatabaseError('Failed to create material group');
      }

      return result;
    } catch (error) {
      throw new DatabaseError('Failed to create material group', error);
    }
  }

  // Material Pricing methods
  async getMaterialPricing(materialId: string): Promise<MaterialSupplierPricing[]> {
    try {
      return await executeQuery<MaterialSupplierPricing>(
        `SELECT msp.pricing_id, msp.supplier_id, s.supplier_name, msp.pricing_unit, 
                msp.cost_per_unit, msp.is_preferred_supplier, msp.is_active, msp.notes
         FROM material_supplier_pricing msp
         LEFT JOIN suppliers s ON s.supplier_id = msp.supplier_id
         WHERE msp.material_id = $1 AND msp.is_active = TRUE
         ORDER BY msp.is_preferred_supplier DESC, msp.created_at DESC`,
        [materialId]
      );
    } catch (error) {
      throw new DatabaseError('Failed to fetch material pricing', error);
    }
  }

  async createMaterialPricing(data: CreateMaterialPricingRequest): Promise<MaterialSupplierPricing> {
    try {
      // Check if combination already exists
      const existing = await executeQuerySingle(
        'SELECT pricing_id FROM material_supplier_pricing WHERE material_id = $1 AND supplier_id = $2',
        [data.material_id, data.supplier_id || null]
      );

      if (existing) {
        // Update existing record
        const result = await executeQuerySingle<MaterialSupplierPricing>(
          `UPDATE material_supplier_pricing SET
             cost_per_unit = $1,
             pricing_unit = COALESCE($2, pricing_unit),
             updated_at = NOW(),
             is_active = TRUE,
             notes = COALESCE($3, notes)
           WHERE pricing_id = $4
           RETURNING *`,
          [data.cost_per_unit, data.pricing_unit, data.notes, existing.pricing_id]
        );

        if (!result) {
          throw new DatabaseError('Failed to update material pricing');
        }

        return result;
      } else {
        // Insert new record
        const pricingId = generatePricingId();
        const result = await executeQuerySingle<MaterialSupplierPricing>(
          `INSERT INTO material_supplier_pricing (
             pricing_id, material_id, supplier_id, cost_per_unit, pricing_unit, 
             is_preferred_supplier, is_active, notes, created_at, updated_at
           )
           VALUES ($1, $2, $3, $4, $5, $6, TRUE, $7, NOW(), NOW())
           RETURNING *`,
          [
            pricingId, 
            data.material_id, 
            data.supplier_id || null, 
            data.cost_per_unit, 
            data.pricing_unit, 
            data.is_preferred_supplier || false, 
            data.notes
          ]
        );

        if (!result) {
          throw new DatabaseError('Failed to create material pricing');
        }

        return result;
      }
    } catch (error) {
      throw new DatabaseError('Failed to create material pricing', error);
    }
  }

  async updateMaterialPricing(pricingId: string, data: Partial<UpdateMaterialPricingRequest>): Promise<MaterialSupplierPricing> {
    try {
      const result = await executeQuerySingle<MaterialSupplierPricing>(
        `UPDATE material_supplier_pricing SET
           supplier_id = COALESCE($2, supplier_id),
           cost_per_unit = COALESCE($3, cost_per_unit),
           pricing_unit = COALESCE($4, pricing_unit),
           is_preferred_supplier = COALESCE($5, is_preferred_supplier),
           notes = COALESCE($6, notes),
           updated_at = NOW()
         WHERE pricing_id = $1 AND is_active = TRUE
         RETURNING *`,
        [
          pricingId, 
          data.supplier_id, 
          data.cost_per_unit, 
          data.pricing_unit, 
          data.is_preferred_supplier, 
          data.notes
        ]
      );

      if (!result) {
        throw new NotFoundError('Material pricing', pricingId);
      }

      return result;
    } catch (error) {
      if (error instanceof NotFoundError) throw error;
      throw new DatabaseError('Failed to update material pricing', error);
    }
  }

  async deleteMaterialPricing(pricingId: string): Promise<void> {
    try {
      const result = await executeQuery(
        'UPDATE material_supplier_pricing SET is_active = FALSE WHERE pricing_id = $1',
        [pricingId]
      );

      if (result.length === 0) {
        throw new NotFoundError('Material pricing', pricingId);
      }
    } catch (error) {
      if (error instanceof NotFoundError) throw error;
      throw new DatabaseError('Failed to delete material pricing', error);
    }
  }
}
