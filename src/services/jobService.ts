import { executeQuery, executeQuerySingle } from '../config/database.js';
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
  orderstatus?: string;
  customername: string;
  quoteid?: number;
}

export class JobService {
  /**
   * Build a reusable WHERE clause and append parameters to the provided array.
   * queryParams should already contain any leading params (e.g. LIMIT as $1).
   * Returns the WHERE clause string that can be interpolated into the SQL.
   */
  buildWhereClause(queryParams: any[], filter?: string, company?: string, excludeDispatched?: boolean) {
    let whereClause = 'j.job_id IS NOT NULL';

    // Company-specific handling: include or exclude Labex by job_id marker
    if (company === 'labex') {
      queryParams.push(`%labex%`);
      const paramIndex = queryParams.length;
      whereClause += ` AND CAST(j.job_id AS TEXT) ILIKE $${paramIndex}`;
    } else if (company === 'next-labels') {
      // Exclude Labex jobs for next-labels
      queryParams.push(`%labex%`);
      const paramIndex = queryParams.length;
      whereClause += ` AND CAST(j.job_id AS TEXT) NOT ILIKE $${paramIndex}`;
    }

    // If a generic filter is provided, apply it to job_id (case-insensitive contains).
    if (filter) {
      queryParams.push(`%${filter}%`);
      const paramIndex = queryParams.length; // $n index for SQL placeholder
      // Match either the internal job_id or the user-visible job_number so filtering
      // works the same for /api/jobs and /api/kanban-data (users may type a job_number).
      whereClause += ` AND (CAST(j.job_id AS TEXT) ILIKE $${paramIndex} OR COALESCE(j.job_number::text, '') ILIKE $${paramIndex})`;
    }

    // Optionally exclude dispatched/processed rows when requested by the caller.
    if (excludeDispatched) {
      whereClause += ` AND NOT (COALESCE(j.order_status, '') ILIKE 'dispatched' OR COALESCE(j.processed, false) = TRUE)`;
    }

    return whereClause;
  }

  /**
   * Get all jobs with details
   */
  async getAllJobs(limit?: number, company?: string, filter?: string, excludeDispatched?: boolean): Promise<JobWithDetails[]> {
    try {
      const queryLimit = limit && limit > 0 ? limit : 50;

      // If a company is specified, reuse the Kanban query so both endpoints return consistent rows
      if (company) {
        const kanbanRows = await this.getKanbanData(queryLimit, company, filter, excludeDispatched);

        // Map KanbanItem[] -> JobWithDetails grouped by job key (lineidentifier / jobid)
        const grouped = kanbanRows.reduce((acc: any, row: any) => {
          const key = String(row.lineidentifier || row.jobid);
          if (!acc[key]) {
            acc[key] = {
              jobId: key,
              customerName: row.customername || 'Unknown Customer',
              orderDate: row.orderdate,
              dueDate: row.duedate,
              quoteId: row.quoteid,
              sizeVariations: 0,
              totalLines: 0,
              totalQuantity: 0,
              sizeGroups: [] as any[]
            };
          }

          // Build a size string from Kanban row fields
          const sizeStr = `${row.sizexmm !== null && row.sizexmm !== undefined ? row.sizexmm : 'N/A'} x ${row.sizeymm !== null && row.sizeymm !== undefined ? row.sizeymm : 'N/A'}`;

          acc[key].sizeVariations += 1;
          acc[key].totalLines += 1;
          acc[key].totalQuantity += parseInt(row.quantity) || 0;

          acc[key].sizeGroups.push({
            size: sizeStr,
            lineCount: 1,
            totalQuantity: parseInt(row.quantity) || 0,
            individualQuantities: String(row.quantity || ''),
            products: row.jobname || '',
            materials: row.materialname || '',
            lineIdentifiers: row.lineidentifier || key,
            descriptions: '',
            processed: !!row.processed
          });

          return acc;
        }, {} as Record<string, any>);

        return Object.values(grouped) as JobWithDetails[];
      }

      const queryParams: any[] = [queryLimit];

      const whereClause = this.buildWhereClause(queryParams, filter, company, excludeDispatched);

      const result = await executeQuery(`
        WITH job_aggregated AS (
          SELECT 
            COALESCE(j.job_number, j.job_id::text) as job_key,
            CONCAT(COALESCE(j.size_x::text, 'N/A'), ' x ', COALESCE(j.size_y::text, 'N/A')) as size_mm,
            COUNT(*) as line_count,
            SUM(j.qty_ordered) as total_quantity,
            STRING_AGG(DISTINCT j.qty_ordered::text, ', ' ORDER BY j.qty_ordered::text) as individual_quantities,
            STRING_AGG(DISTINCT COALESCE(j.product_name, COALESCE(j.job_number, j.job_id::text)), ', ') as products,
            STRING_AGG(DISTINCT COALESCE(j.material_name, m.material_name), ', ') as materials,
            STRING_AGG(DISTINCT COALESCE(j.line_identifier, COALESCE(j.job_number, j.job_id::text)), ', ') as line_identifiers,
            STRING_AGG(DISTINCT COALESCE(j.line_description, j.special_instructions), ' | ') as descriptions,
            MIN(c.name) as customername,
            MIN(j.order_date) as orderdate,
            MIN(j.due_date) as duedate,
            MIN(j.quote_id) as quoteid,
            BOOL_AND(COALESCE(j.processed, false)) as all_processed
          FROM jobs j
          LEFT JOIN customers c ON j.customer_id = c.customer_id
          LEFT JOIN materials m ON j.material_id = m.material_id
          LEFT JOIN finishing_options f ON j.finishing_id = f.finishing_id
          WHERE ${whereClause}
          GROUP BY COALESCE(j.job_number, j.job_id::text), j.size_x, j.size_y
        )
        SELECT 
          ja.job_key as job_number,
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
          COUNT(*) OVER (PARTITION BY ja.job_key) as size_variations
        FROM job_aggregated ja
        ORDER BY ja.orderdate DESC, ja.job_key DESC
        LIMIT $1
      `, queryParams);

      // Group by job_key to show size variations (similar to quotes)
      const groupedJobs = result.reduce((acc: any, row: any) => {
        const key = row.job_number;
        if (!acc[key]) {
          acc[key] = {
            jobId: key,
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

        acc[key].totalLines += parseInt(row.line_count) || 0;
        acc[key].totalQuantity += parseInt(row.total_quantity) || 0;
        acc[key].sizeGroups.push({
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
  async getKanbanData(limit?: number, company?: string, filter?: string, excludeDispatched?: boolean): Promise<KanbanItem[]> {
    try {
      const queryLimit = limit && limit > 0 ? limit : 50; // Increased default limit
      const queryParams: any[] = [queryLimit];

      // Build reusable WHERE clause and append any filter params into queryParams
      const whereClause = this.buildWhereClause(queryParams, filter, company, excludeDispatched);
       
      const result = await executeQuery(`
        SELECT 
          j.job_id as id,
          COALESCE(j.job_number, j.job_id::text) as lineidentifier,
          j.job_id as jobid,
          COALESCE(j.job_name, j.product_name, 'Job ' || j.job_id) as jobname,
          j.qty_ordered as quantity,
          j.size_x as sizexmm,
          j.size_y as sizeymm,
          COALESCE(j.material_name, m.material_name, 'Unknown Material') as materialname,
          COALESCE(j.finishing_name, f.finishing_code, 'Standard') as finishingname,
          COALESCE(j.tool, 'N/A') as tool,
          j.due_date as duedate,
          j.order_date as orderdate,
          COALESCE(j.processed, false) as processed,
          COALESCE(j.order_status, 'Print Ready') as orderstatus,
          c.name as customername,
          j.quote_id as quoteid
        FROM jobs j
        LEFT JOIN customers c ON j.customer_id = c.customer_id
        LEFT JOIN materials m ON j.material_id = m.material_id
        LEFT JOIN finishing_options f ON j.finishing_id = f.finishing_id
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

  /**
   * Update job status
   */
  async updateJobStatus(jobId: string, processed: boolean, orderstatus?: string): Promise<any> {
    try {
      if (typeof orderstatus === 'string') {
        console.log('[jobService] updateJobStatus - executing UPDATE with order_status', { jobId, processed, orderstatus });
        const updated = await executeQuerySingle(
          `
          UPDATE jobs
          SET processed = $1, order_status = $2, updated_at = CURRENT_TIMESTAMP
          WHERE job_id = $3
          RETURNING job_id, processed, order_status, updated_at
        `, [processed, orderstatus, jobId]
        );
        console.log('[jobService] updateJobStatus - updated row:', updated);
        return updated;
      } else {
        console.log('[jobService] updateJobStatus - executing UPDATE without order_status', { jobId, processed });
        const updated = await executeQuerySingle(
          `
          UPDATE jobs 
          SET processed = $1, updated_at = CURRENT_TIMESTAMP 
          WHERE job_id = $2
          RETURNING job_id, processed, order_status, updated_at
        `, [processed, jobId]
        );
        console.log('[jobService] updateJobStatus - updated row:', updated);
        return updated;
      }
    } catch (error) {
      console.error('[jobService] updateJobStatus error', error);
      throw new DatabaseError('Failed to update job status', error);
    }
  }
}
