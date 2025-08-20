import { z } from 'zod';
import { ValidationError } from '../types/common.js';

// Material validation schemas
export const materialSchema = z.object({
  material_name: z.string().min(1, 'Material name is required'),
  material_code: z.string().optional(),
  substrate_type: z.string().optional(),
  substrate_group: z.string().optional(),
  adhesive_type: z.string().optional(),
  handling: z.string().optional(),
  weight_gsm: z.number().min(0).optional(),
  grain_direction: z.string().optional(),
  coating: z.string().optional(),
  glossy_level: z.string().optional(),
  conductive: z.boolean().optional(),
  white_material: z.boolean().optional(),
  pricing_unit: z.string().optional(),
  cost_aud: z.number().min(0).optional(),
  currency: z.string().optional(),
  stock_level: z.number().min(0).optional(),
  reorder_level: z.number().min(0).optional(),
  lead_time_days: z.number().min(0).optional(),
  aliases: z.string().optional(),
  notes: z.string().optional(),
});

export const updateMaterialSchema = materialSchema.partial().extend({
  material_id: z.string().min(1, 'Material ID is required'),
});

export const materialGroupSchema = z.object({
  group_name: z.string().min(1, 'Group name is required'),
  description: z.string().optional(),
});

export const materialPricingSchema = z.object({
  material_id: z.string().min(1, 'Material ID is required'),
  supplier_id: z.string().optional(),
  cost_per_unit: z.number().min(0, 'Cost must be non-negative'),
  pricing_unit: z.string().min(1, 'Pricing unit is required'),
  is_preferred_supplier: z.boolean().optional(),
  notes: z.string().optional(),
});

// Quote validation schemas
export const quoteSchema = z.object({
  customer_name: z.string().min(1, 'Customer name is required'),
  project_name: z.string().optional(),
  status: z.string().optional(),
  total_amount: z.number().min(0).optional(),
  currency: z.string().optional(),
  due_date: z.string().optional(),
  notes: z.string().optional(),
  quote_reference: z.string().optional(),
  contact_email: z.string().email().optional(),
  contact_phone: z.string().optional(),
});

export const updateQuoteSchema = quoteSchema.partial().extend({
  quote_id: z.number().int().positive('Quote ID must be positive'),
});

// Job validation schemas
export const jobSchema = z.object({
  customer_name: z.string().min(1, 'Customer name is required'),
  project_name: z.string().optional(),
  status: z.string().optional(),
  priority: z.string().optional(),
  due_date: z.string().optional(),
  start_date: z.string().optional(),
  notes: z.string().optional(),
  quote_id: z.number().int().positive().optional(),
});

export const updateJobSchema = jobSchema.partial().extend({
  job_id: z.number().int().positive('Job ID must be positive'),
});

// Supplier validation schemas
export const supplierSchema = z.object({
  supplier_name: z.string().min(1, 'Supplier name is required'),
  contact_name: z.string().optional(),
  contact_email: z.string().email().optional(),
  contact_phone: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  postal_code: z.string().optional(),
  country: z.string().optional(),
  website: z.string().url().optional(),
  notes: z.string().optional(),
  payment_terms: z.string().optional(),
  delivery_terms: z.string().optional(),
  rating: z.number().min(1).max(5).optional(),
});

// File validation schemas
export const fileUploadSchema = z.object({
  filename: z.string().min(1, 'Filename is required'),
  mimetype: z.string().min(1, 'MIME type is required'),
  size: z.number().min(1, 'File size must be greater than 0'),
});

// Query parameter validation schemas
export const paginationSchema = z.object({
  page: z.string().transform(val => parseInt(val, 10)).pipe(z.number().int().min(1)).optional(),
  limit: z.string().transform(val => parseInt(val, 10)).pipe(z.number().int().min(1).max(100)).optional(),
});

export const idSchema = z.object({
  id: z.string().min(1, 'ID is required'),
});

// Validation helper function
export const validateBody = <T>(schema: z.ZodSchema<T>) => {
  return async (req: Request): Promise<T> => {
    try {
      const body = await req.json();
      return schema.parse(body);
    } catch (error) {
      if (error instanceof z.ZodError) {
        const firstError = error.issues[0];
        if (firstError) {
          throw new ValidationError(
            firstError.message,
            firstError.path.join('.'),
            (firstError as any).received
          );
        }
        throw new ValidationError('Validation failed');
      }
      throw new ValidationError('Invalid request body');
    }
  };
};

// Query parameter validation helper
export const validateQuery = <T>(schema: z.ZodSchema<T>) => {
  return (url: URL): T => {
    try {
      const queryObject = Object.fromEntries(url.searchParams.entries());
      return schema.parse(queryObject);
    } catch (error) {
      if (error instanceof z.ZodError) {
        const firstError = error.issues[0];
        if (firstError) {
          throw new ValidationError(
            `Query parameter validation failed: ${firstError.message}`,
            firstError.path.join('.'),
            (firstError as any).received
          );
        }
        throw new ValidationError('Query parameter validation failed');
      }
      throw new ValidationError('Invalid query parameters');
    }
  };
};

// Path parameter validation helper
export const validatePathParam = (value: string, paramName: string): string => {
  if (!value || value.trim() === '') {
    throw new ValidationError(`${paramName} is required`);
  }
  return value.trim();
};
