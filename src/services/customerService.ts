import { executeQuery } from '../config/database.js';
import { DatabaseError } from '../types/common.js';

export interface Customer {
  customer_id: string;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  postal_code?: string;
  country?: string;
  created_at?: string;
  updated_at?: string;
}

export class CustomerService {
  /**
   * Get all customers
   */
  async getAllCustomers(): Promise<Customer[]> {
    try {
      return await executeQuery<Customer>(
        'SELECT * FROM customers ORDER BY name ASC'
      );
    } catch (error) {
      throw new DatabaseError('Failed to fetch customers', error);
    }
  }

  /**
   * Get customer by ID
   */
  async getCustomerById(customerId: string): Promise<Customer | null> {
    try {
      const result = await executeQuery<Customer>(
        'SELECT * FROM customers WHERE customer_id = $1',
        [customerId]
      );
      return result.length > 0 && result[0] !== undefined ? result[0] : null;
    } catch (error) {
      throw new DatabaseError('Failed to fetch customer', error);
    }
  }
}
