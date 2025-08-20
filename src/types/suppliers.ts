import type { BaseEntity } from './common.js';

// Supplier types
export interface Supplier extends BaseEntity {
  supplier_id: string;
  supplier_name: string;
  contact_name?: string;
  contact_email?: string;
  contact_phone?: string;
  address?: string;
  city?: string;
  state?: string;
  postal_code?: string;
  country?: string;
  website?: string;
  notes?: string;
  is_active?: boolean;
  payment_terms?: string;
  delivery_terms?: string;
  rating?: number;
}

export interface CreateSupplierRequest {
  supplier_name: string;
  contact_name?: string;
  contact_email?: string;
  contact_phone?: string;
  address?: string;
  city?: string;
  state?: string;
  postal_code?: string;
  country?: string;
  website?: string;
  notes?: string;
  payment_terms?: string;
  delivery_terms?: string;
  rating?: number;
}

export interface UpdateSupplierRequest extends Partial<CreateSupplierRequest> {
  supplier_id: string;
}
