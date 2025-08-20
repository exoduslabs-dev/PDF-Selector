import { executeQuery } from '../config/database.js';
import type { Job } from '../types/jobs.js';
import { DatabaseError } from '../types/common.js';

export interface JobWithDetails {
  jobId: string;
  customerName: string;
  orderDate: string;
  dueDate: string;
  quoteId?: string;
  sizeVariations: number;
  totalLines: number;
  totalQuantity: number;
  sizeGroups: Array<{
    size: string;
    lineCount: number;
    totalQuantity: number;
    individualQuantities: string;
    products: string;
    materials: string;
    lineIdentifiers: string;
    descriptions: string;
    processed?: boolean;
  }>;
}

export interface KanbanItem {
  id: number;
  lineidentifier: string;
  jobid: number;
  jobname: string;
  quantity: number;
  sizexmm: number;
  sizeymm: number;
  materialname: string;
  finishingname?: string;
  tool?: string;
  duedate: string;
  orderdate: string;
  processed: boolean;
  customername: string;
  quoteid?: number;
}

export class JobService {
  /**
   * Get all jobs with details
   */
  async getAllJobs(limit?: number): Promise<JobWithDetails[]> {
    try {
      const queryLimit = limit && limit > 0 ? limit : 50;
      const limitClause = `LIMIT ${queryLimit}`;
      
      const result = await executeQuery(`
        WITH job_aggregated AS (
          SELECT 
            j.job_number,
            CONCAT(COALESCE(j.size_x::text, 'N/A'), ' x ', COALESCE(j.size_y::text, 'N/A')) as size_mm,
            COUNT(*) as line_count,
            SUM(j.qty_ordered) as total_quantity,
            STRING_AGG(DISTINCT j.qty_ordered::text, ', ' ORDER BY j.qty_ordered::text) as individual_quantities,
            STRING_AGG(DISTINCT COALESCE(j.product_name, j.job_number), ', ') as products,
            STRING_AGG(DISTINCT COALESCE(j.material_name, m.material_name), ', ') as materials,
            STRING_AGG(DISTINCT COALESCE(j.line_identifier, j.job_number), ', ') as line_identifiers,
            STRING_AGG(DISTINCT COALESCE(j.line_description, j.special_instructions), ' | ') as descriptions,
            MIN(c.name) as customername,
            MIN(j.order_date) as orderdate,
            MIN(j.due_date) as duedate,
            MIN(j.quote_id) as quoteid,
            BOOL_AND(COALESCE(j.processed, false)) as all_processed
          FROM jobs j
          LEFT JOIN customers c ON j.customer_id = c.customer_id
          LEFT JOIN materials m ON j.material_id = m.material_id
          WHERE j.job_number IS NOT NULL
          GROUP BY j.job_number, j.size_x, j.size_y
        )
        SELECT 
          ja.job_number,
          ja.size_mm,
          ja.line_count,
          ja.total_quantity,
          ja.individual_quantities,
          ja.products,
          ja.materials,
          ja.line_identifiers,
          ja.descriptions,
          ja.customername,
          ja.orderdate,
          ja.duedate,
          ja.quoteid,
          ja.all_processed as processed,
          COUNT(*) OVER (PARTITION BY ja.job_number) as size_variations
        FROM job_aggregated ja
        ORDER BY ja.orderdate DESC, ja.job_number DESC
        ${limitClause}
      `);

      // Group by job_number to show size variations (similar to quotes)
      const groupedJobs = result.reduce((acc: any, row: any) => {
        if (!acc[row.job_number]) {
          acc[row.job_number] = {
            jobId: row.job_number,
            customerName: row.customername || 'Unknown Customer',
            orderDate: row.orderdate,
            dueDate: row.duedate,
            quoteId: row.quoteid,
            sizeVariations: row.size_variations,
            totalLines: 0,
            totalQuantity: 0,
            sizeGroups: []
          };
        }
        
        acc[row.job_number].totalLines += parseInt(row.line_count) || 0;
        acc[row.job_number].totalQuantity += parseInt(row.total_quantity) || 0;
        acc[row.job_number].sizeGroups.push({
          size: row.size_mm,
          lineCount: parseInt(row.line_count) || 0,
          totalQuantity: parseInt(row.total_quantity) || 0,
          individualQuantities: row.individual_quantities,
          products: row.products,
          materials: row.materials,
          lineIdentifiers: row.line_identifiers,
          descriptions: row.descriptions,
          processed: row.processed || false
        });
        
        return acc;
      }, {});

      return Object.values(groupedJobs) as JobWithDetails[];
    } catch (error) {
      throw new DatabaseError('Failed to fetch jobs', error);
    }
  }

  /**
   * Get kanban data for board display
   */
  async getKanbanData(limit?: number, company?: string, filter?: string): Promise<KanbanItem[]> {
    try {
      const queryLimit = limit && limit > 0 ? limit : 20;
      let whereClause = 'j.job_id IS NOT NULL';
      const queryParams: any[] = [queryLimit];
      let paramIndex = 1;
      
      // Add company-specific filtering
      if (company === 'labex' && filter) {
        whereClause += ` AND j.job_number LIKE $${++paramIndex}`;
        queryParams.push(`${filter}%`);
      }
      
      const result = await executeQuery(`
        SELECT 
          j.job_id as id,
          COALESCE(j.job_number, j.job_id::text) as lineidentifier,
          j.job_id as jobid,
          COALESCE(j.job_name, j.product_name, 'Job ' || j.job_id) as jobname,
          j.qty_ordered as quantity,
          j.size_x as sizexmm,
          j.size_y as sizeymm,
          COALESCE(j.material_name, 'Unknown Material') as materialname,
          COALESCE(j.finishing_name, 'Standard') as finishingname,
          COALESCE(j.tool, 'N/A') as tool,
          j.due_date as duedate,
          j.order_date as orderdate,
          j.processed,
          c.name as customername,
          j.quote_id as quoteid
        FROM jobs j
        LEFT JOIN customers c ON j.customer_id = c.customer_id
        WHERE ${whereClause}
        ORDER BY 
          CASE WHEN j.due_date < CURRENT_DATE THEN 0 ELSE 1 END,
          j.due_date ASC NULLS LAST,
          j.order_date DESC
        LIMIT $1
      `, queryParams);

      return result;
    } catch (error) {
      throw new DatabaseError('Failed to fetch kanban data', error);
    }
  }
}
