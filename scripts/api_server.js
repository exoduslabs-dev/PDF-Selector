import { serve } from 'bun';
import { Client } from 'pg';
import dotenv from 'dotenv';
dotenv.config();
const client = new Client({
    host: process.env.PG_HOST,
    port: Number(process.env.PG_PORT),
    database: process.env.PG_DATABASE,
    user: process.env.PG_USER,
    password: process.env.PG_PASSWORD,
});
await client.connect();
serve({
    async fetch(req) {
        const url = new URL(req.url);
        // Add CORS headers
        const headers = {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type',
            'Content-Type': 'application/json',
        };
        if (req.method === 'OPTIONS') {
            return new Response(null, { status: 200, headers });
        }
        if (url.pathname === '/api/quotes') {
            try {
                const result = await client.query(`
          WITH quote_summary AS (
            SELECT 
              jl.quoteid,
              CONCAT(COALESCE(jl.sizexmm::text, 'N/A'), ' x ', COALESCE(jl.sizeymm::text, 'N/A')) as size_mm,
              jl.quantity,
              jl.productname,
              jl.materialname,
              jl.customerid,
              jl.lineidentifier,
              jl.linedescription,
              q.processed,  -- Use processed from quotes table, not job_lines
              c.customername,
              jl.orderdate,
              jl.duedate
            FROM job_lines jl 
            LEFT JOIN customers c ON jl.customerid = c.customerid
            LEFT JOIN quotes q ON jl.quoteid = q.quoteid AND jl.lineidentifier = q.quotelineid
            WHERE jl.quoteid IS NOT NULL
          ),
          quote_aggregated AS (
            SELECT 
              quoteid,
              size_mm,
              COUNT(*) as line_count,
              SUM(quantity) as total_quantity,
              STRING_AGG(DISTINCT quantity::text, ', ' ORDER BY quantity::text) as individual_quantities,
              STRING_AGG(DISTINCT productname, ', ') as products,
              STRING_AGG(DISTINCT materialname, ', ') as materials,
              STRING_AGG(DISTINCT lineidentifier, ', ') as line_identifiers,
              STRING_AGG(DISTINCT linedescription, ' | ') as descriptions,
              MIN(customerid) as customerid,
              MIN(customername) as customername,
              MIN(orderdate) as orderdate,
              MIN(duedate) as duedate,
              BOOL_AND(COALESCE(processed, false)) as all_processed
            FROM quote_summary 
            GROUP BY quoteid, size_mm
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
            qa.customername,
            qa.orderdate,
            qa.duedate,
            qa.all_processed as processed,
            COUNT(*) OVER (PARTITION BY qa.quoteid) as size_variations
          FROM quote_aggregated qa
          ORDER BY qa.quoteid, qa.size_mm
        `);
                // Group by quoteId to show size variations
                const groupedQuotes = result.rows.reduce((acc, row) => {
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
                    acc[row.quoteid].totalLines += row.line_count;
                    acc[row.quoteid].totalQuantity += row.total_quantity;
                    acc[row.quoteid].sizeGroups.push({
                        size: row.size_mm,
                        lineCount: row.line_count,
                        totalQuantity: row.total_quantity,
                        individualQuantities: row.individual_quantities,
                        products: row.products,
                        materials: row.materials,
                        lineIdentifiers: row.line_identifiers,
                        descriptions: row.descriptions,
                        processed: row.processed
                    });
                    return acc;
                }, {});
                return new Response(JSON.stringify(Object.values(groupedQuotes)), { headers });
            }
            catch (error) {
                return new Response(JSON.stringify({ error: error.message }), {
                    status: 500,
                    headers
                });
            }
        }
        if (url.pathname === '/api/jobs') {
            try {
                const result = await client.query(`
          SELECT jl.*, c.customerName
          FROM job_lines jl
          LEFT JOIN customers c ON jl.customerId = c.customerId
          ORDER BY jl.jobId, jl.jobLineId
        `);
                return new Response(JSON.stringify(result.rows), { headers });
            }
            catch (error) {
                return new Response(JSON.stringify({ error: error.message }), {
                    status: 500,
                    headers
                });
            }
        }
        if (url.pathname === '/api/customers') {
            try {
                const result = await client.query(`
          SELECT * FROM customers 
          ORDER BY customerName
        `);
                return new Response(JSON.stringify(result.rows), { headers });
            }
            catch (error) {
                return new Response(JSON.stringify({ error: error.message }), {
                    status: 500,
                    headers
                });
            }
        }
        return new Response('Not found', { status: 404, headers });
    },
    port: 3001,
});
console.log('API server running on http://localhost:3001');
