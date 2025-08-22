import type { BaseEntity } from './common.js';

// Material types
export interface Material extends BaseEntity {
  material_id: string;
  material_code: string;
  material_name: string;
  substrate_type?: string;
  substrate_group?: string;
  adhesive_type?: string;
  handling?: string;
  weight_gsm?: number;
  width_mm?: number;
  length_mm?: number;
  grain_direction?: string;
  coating?: string;
  glossy_level?: string;
  conductive?: boolean;
  white_material?: boolean;
  pricing_unit?: string;
  cost_aud?: number;
  currency?: string;
  stock?: number;
  stock_level?: number;
  reorder_level?: number;
  lead_time_days?: number;
  is_active?: boolean;
  aliases?: string;
  notes?: string;
}

// Material creation/update request types
export interface CreateMaterialRequest {
  material_name: string;
  material_code?: string;
  substrate_type?: string;
  substrate_group?: string;
  adhesive_type?: string;
  handling?: string;
  weight_gsm?: number;
  grain_direction?: string;
  coating?: string;
  glossy_level?: string;
  conductive?: boolean;
  white_material?: boolean;
  pricing_unit?: string;
  cost_aud?: number;
  currency?: string;
  stock_level?: number;
  reorder_level?: number;
  lead_time_days?: number;
  aliases?: string;
  notes?: string;
}

export interface UpdateMaterialRequest extends Partial<CreateMaterialRequest> {
  material_id: string;
}

// Material group types
export interface MaterialGroup extends BaseEntity {
  group_id: string;
  group_name: string;
  description?: string;
  is_active?: boolean;
}

export interface CreateMaterialGroupRequest {
  group_name: string;
  description?: string;
}

// Material supplier pricing types
export interface MaterialSupplierPricing extends BaseEntity {
  pricing_id: string;
  material_id: string;
  supplier_id?: string;
  cost_per_unit: number;
  pricing_unit: string;
  is_preferred_supplier?: boolean;
  is_active?: boolean;
  notes?: string;
}

export interface CreateMaterialPricingRequest {
  material_id: string;
  supplier_id?: string;
  cost_per_unit: number;
  pricing_unit: string;
  is_preferred_supplier?: boolean;
  notes?: string;
}

export interface UpdateMaterialPricingRequest extends Partial<CreateMaterialPricingRequest> {
  pricing_id: string;
}

// Field options for dropdowns
export interface MaterialFieldOptions {
  substrate_types: string[];
  substrate_groups: string[];
  adhesive_types: string[];
  handling_types: string[];
  coating_types: string[];
  pricing_units: string[];
}

// Material form data interface (matches frontend form structure)
export interface MaterialFormData {
  material_code: string;
  material_name: string;
  substrate_type: string;
  substrate_group: string;
  adhesive_type: string;
  handling: string;
  weight_gsm: number;
  width_mm: number;
  length_mm: number;
  coating: string;
  grain_direction: string;
  glossy_level: string;
  conductive: boolean;
  white_material: boolean;
  cost_aud: number;
  stock: number;
  reorder_level: number;
  lead_time_days: number;
  pricing_unit: string;
  aliases: string;
}

// CSV import types
export interface MaterialCsvRow {
  material_name: string;
  material_code?: string;
  substrate_type?: string;
  substrate_group?: string;
  adhesive_type?: string;
  handling?: string;
  weight_gsm?: string;
  grain_direction?: string;
  coating?: string;
  glossy_level?: string;
  conductive?: string;
  white_material?: string;
  pricing_unit?: string;
  cost_aud?: string;
  currency?: string;
  stock_level?: string;
  reorder_level?: string;
  lead_time_days?: string;
  aliases?: string;
  notes?: string;
  // Supplier pricing columns (up to 3 suppliers)
  supplier_id_1?: string;
  supplier_cost_1?: string;
  supplier_unit_1?: string;
  supplier_preferred_1?: string;
  supplier_id_2?: string;
  supplier_cost_2?: string;
  supplier_unit_2?: string;
  supplier_preferred_2?: string;
  supplier_id_3?: string;
  supplier_cost_3?: string;
  supplier_unit_3?: string;
  supplier_preferred_3?: string;
}
