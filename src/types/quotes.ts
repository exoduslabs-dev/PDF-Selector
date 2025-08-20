import type { BaseEntity } from './common.js';

// Quote types
export interface Quote extends BaseEntity {
  quote_id: number;
  customer_name: string;
  project_name?: string;
  status?: string;
  total_amount?: number;
  currency?: string;
  due_date?: string;
  notes?: string;
  is_active?: boolean;
  quote_reference?: string;
  contact_email?: string;
  contact_phone?: string;
}

export interface CreateQuoteRequest {
  customer_name: string;
  project_name?: string;
  status?: string;
  total_amount?: number;
  currency?: string;
  due_date?: string;
  notes?: string;
  quote_reference?: string;
  contact_email?: string;
  contact_phone?: string;
}

export interface UpdateQuoteRequest extends Partial<CreateQuoteRequest> {
  quote_id: number;
}

// Quote line items
export interface QuoteLine extends BaseEntity {
  line_id: string;
  quote_id: number;
  item_description: string;
  quantity: number;
  unit_price?: number;
  total_price?: number;
  material_id?: string;
  specifications?: string;
  notes?: string;
}

export interface CreateQuoteLineRequest {
  quote_id: number;
  item_description: string;
  quantity: number;
  unit_price?: number;
  material_id?: string;
  specifications?: string;
  notes?: string;
}

// Quote submission types
export interface QuoteSubmissionRequest {
  quote_id: number;
  customer_name: string;
  project_name?: string;
  specifications?: string;
  quantity?: number;
  due_date?: string;
  notes?: string;
}
