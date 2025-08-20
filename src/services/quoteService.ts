import { executeQuery } from '../config/database.js';
import type { Quote } from '../types/quotes.js';
import { DatabaseError } from '../types/common.js';

export interface QuoteWithDetails {
  quoteId: number;
  customerName: string;
  orderDate: string;
  dueDate: string;
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
    supply: string;
    notes: string;
    processed: boolean;
  }>;
}

export class QuoteService {
  /**
   * Get all quotes with aggregated data
   */
  async getAllQuotes(limit?: number): Promise<QuoteWithDetails[]> {
    try {
      const queryLimit = limit && limit > 0 ? limit : 50;
      const limitClause = `LIMIT ${queryLimit}`;
      
      const result = await executeQuery(`
        WITH quote_aggregated AS (
          SELECT 
            q.quoteid,
            CONCAT(COALESCE(q.sizexmm::text, 'N/A'), ' x ', COALESCE(q.sizeymm::text, 'N/A')) as size_mm,
            COUNT(*) as line_count,
            SUM(q.quantity) as total_quantity,
            STRING_AGG(DISTINCT q.quantity::text, ', ' ORDER BY q.quantity::text) as individual_quantities,
            STRING_AGG(DISTINCT q.materialname, ', ') as products,
            STRING_AGG(DISTINCT q.materialname, ', ') as materials,
            STRING_AGG(DISTINCT q.lineidentifier, ', ') as line_identifiers,
            STRING_AGG(DISTINCT q.linedescription, ' | ') as descriptions,
            STRING_AGG(DISTINCT COALESCE(q.supply, ''), ' | ') as supply,
            STRING_AGG(DISTINCT COALESCE(q.notes, ''), ' | ') as notes,
            MIN(q.customerid) as customerid,
            MIN(COALESCE(q.customername, c.name)) as customername,
            MIN(q.quotedate) as orderdate,
            MIN(q.quotedate) as duedate,
            BOOL_AND(COALESCE(q.processed, false)) as all_processed
          FROM quotes q
          LEFT JOIN customers c ON q.customerid = c.customer_id
          GROUP BY q.quoteid, q.sizexmm, q.sizeymm
        )
        SELECT 
          qa.quoteid,
          qa.size_mm,
          qa.line_count,
          qa.total_quantity,
          qa.individual_quantities,
          qa.products,
          qa.materials,
          qa.line_identifiers,
          qa.descriptions,
          qa.supply,
          qa.notes,
          qa.customername,
          qa.orderdate,
          qa.duedate,
          qa.all_processed as processed,
          COUNT(*) OVER (PARTITION BY qa.quoteid) as size_variations
        FROM quote_aggregated qa
        ORDER BY qa.quoteid DESC, qa.size_mm
        ${limitClause}
      `);

      // Group by quoteId to show size variations
      const groupedQuotes = result.reduce((acc: any, row: any) => {
        if (!acc[row.quoteid]) {
          acc[row.quoteid] = {
            quoteId: row.quoteid,
            customerName: row.customername,
            orderDate: row.orderdate,
            dueDate: row.duedate,
            sizeVariations: row.size_variations,
            totalLines: 0,
            totalQuantity: 0,
            sizeGroups: []
          };
        }
        
        acc[row.quoteid].totalLines += parseInt(row.line_count) || 0;
        acc[row.quoteid].totalQuantity += parseInt(row.total_quantity) || 0;
        acc[row.quoteid].sizeGroups.push({
          size: row.size_mm,
          lineCount: parseInt(row.line_count) || 0,
          totalQuantity: parseInt(row.total_quantity) || 0,
          individualQuantities: row.individual_quantities,
          products: row.products,
          materials: row.materials,
          lineIdentifiers: row.line_identifiers,
          descriptions: row.descriptions,
          supply: row.supply,
          notes: row.notes,
          processed: row.processed
        });
        
        return acc;
      }, {});

      return Object.values(groupedQuotes) as QuoteWithDetails[];
    } catch (error) {
      throw new DatabaseError('Failed to fetch quotes', error);
    }
  }

  /**
   * Update quote notes
   */
  async updateQuoteNotes(quoteId: number, notes: string): Promise<void> {
    try {
      await executeQuery(
        'UPDATE quotes SET notes = $1 WHERE quoteid = $2',
        [notes, quoteId]
      );
    } catch (error) {
      throw new DatabaseError('Failed to update quote notes', error);
    }
  }
}
