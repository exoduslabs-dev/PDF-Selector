import { executeQuery, executeQuerySingle } from '../config/database.js';
import { Supplier, CreateSupplierRequest, UpdateSupplierRequest } from '../types/suppliers.js';
import { DatabaseError, NotFoundError } from '../types/common.js';
import { generateSupplierId } from '../utils/codeGenerator.js';

export class SupplierService {
  /**
   * Get all active suppliers
   */
  async getAllSuppliers(): Promise<Supplier[]> {
    try {
      // First try to get from suppliers table
      const suppliers = await executeQuery<Supplier>(
        'SELECT supplier_id, supplier_name FROM suppliers WHERE is_active = TRUE ORDER BY supplier_name'
      );

      if (suppliers.length === 0) {
        // Fallback to distinct suppliers from pricing table
        const fallbackSuppliers = await executeQuery<any>(
          'SELECT DISTINCT supplier_id FROM material_supplier_pricing WHERE supplier_id IS NOT NULL ORDER BY supplier_id'
        );
        
        return fallbackSuppliers.map(row => ({
          supplier_id: row.supplier_id,
          supplier_name: row.supplier_id, // Use ID as name when no supplier table data
          is_active: true,
        })) as Supplier[];
      }

      return suppliers;
    } catch (error) {
      throw new DatabaseError('Failed to fetch suppliers', error);
    }
  }

  /**
   * Get supplier by ID
   */
  async getSupplierById(supplierId: string): Promise<Supplier> {
    try {
      const supplier = await executeQuerySingle<Supplier>(
        'SELECT * FROM suppliers WHERE supplier_id = $1 AND is_active = TRUE',
        [supplierId]
      );

      if (!supplier) {
        throw new NotFoundError('Supplier', supplierId);
      }

      return supplier;
    } catch (error) {
      if (error instanceof NotFoundError) throw error;
      throw new DatabaseError('Failed to fetch supplier', error);
    }
  }

  /**
   * Create a new supplier
   */
  async createSupplier(data: CreateSupplierRequest): Promise<Supplier> {
    try {
      const supplierId = generateSupplierId();
      
      const query = `
        INSERT INTO suppliers (
          supplier_id, supplier_name, contact_name, contact_email, contact_phone,
          address, city, state, postal_code, country, website, notes,
          payment_terms, delivery_terms, rating, is_active, created_at, updated_at
        )
        VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, TRUE, NOW(), NOW()
        )
        RETURNING *
      `;

      const result = await executeQuerySingle<Supplier>(query, [
        supplierId,
        data.supplier_name,
        data.contact_name,
        data.contact_email,
        data.contact_phone,
        data.address,
        data.city,
        data.state,
        data.postal_code,
        data.country,
        data.website,
        data.notes,
        data.payment_terms,
        data.delivery_terms,
        data.rating,
      ]);

      if (!result) {
        throw new DatabaseError('Failed to create supplier');
      }

      return result;
    } catch (error) {
      throw new DatabaseError('Failed to create supplier', error);
    }
  }

  /**
   * Update an existing supplier
   */
  async updateSupplier(data: UpdateSupplierRequest): Promise<Supplier> {
    try {
      // Check if supplier exists
      await this.getSupplierById(data.supplier_id);

      const query = `
        UPDATE suppliers SET
          supplier_name = COALESCE($2, supplier_name),
          contact_name = COALESCE($3, contact_name),
          contact_email = COALESCE($4, contact_email),
          contact_phone = COALESCE($5, contact_phone),
          address = COALESCE($6, address),
          city = COALESCE($7, city),
          state = COALESCE($8, state),
          postal_code = COALESCE($9, postal_code),
          country = COALESCE($10, country),
          website = COALESCE($11, website),
          notes = COALESCE($12, notes),
          payment_terms = COALESCE($13, payment_terms),
          delivery_terms = COALESCE($14, delivery_terms),
          rating = COALESCE($15, rating),
          updated_at = NOW()
        WHERE supplier_id = $1 AND is_active = TRUE
        RETURNING *
      `;

      const result = await executeQuerySingle<Supplier>(query, [
        data.supplier_id,
        data.supplier_name,
        data.contact_name,
        data.contact_email,
        data.contact_phone,
        data.address,
        data.city,
        data.state,
        data.postal_code,
        data.country,
        data.website,
        data.notes,
        data.payment_terms,
        data.delivery_terms,
        data.rating,
      ]);

      if (!result) {
        throw new NotFoundError('Supplier', data.supplier_id);
      }

      return result;
    } catch (error) {
      if (error instanceof NotFoundError) throw error;
      throw new DatabaseError('Failed to update supplier', error);
    }
  }

  /**
   * Soft delete a supplier
   */
  async deleteSupplier(supplierId: string): Promise<void> {
    try {
      const result = await executeQuery(
        'UPDATE suppliers SET is_active = FALSE, updated_at = NOW() WHERE supplier_id = $1 AND is_active = TRUE',
        [supplierId]
      );

      if (result.length === 0) {
        throw new NotFoundError('Supplier', supplierId);
      }
    } catch (error) {
      if (error instanceof NotFoundError) throw error;
      throw new DatabaseError('Failed to delete supplier', error);
    }
  }
}
