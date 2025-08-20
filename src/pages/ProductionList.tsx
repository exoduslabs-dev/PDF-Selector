import React, { useEffect, useState } from 'react';
import { apiCall } from '../config/api';

interface ListJob {
  id: string;
  jobNumber: string;
  customer?: string;
  material?: string;
  finishing?: string;
  readyDate?: string;
  dueDate?: string;
  overdueDate?: string;
  orderDate?: string;
  quantity?: number;
  tool?: string;
  processed?: boolean;
  quoteId?: string;
}

type SortOrder = 'asc' | 'desc';
type SortColumn = 'dueDate' | 'orderDate' | 'customer' | 'material' | 'finishing' | 'quantity' | 'jobNumber' | 'tool';
interface SortRule { column: SortColumn; order: SortOrder }

export function ProductionList({ sortRules = [{ column: 'dueDate', order: 'asc' }] }: { sortRules?: SortRule[] }) {
  const [rows, setRows] = useState<ListJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const res = await apiCall('/api/kanban-data?limit=100&company=next-labels');
        const data = await res.json();
        if (!data.success) throw new Error(data.error || 'Failed to fetch data');
        
        // Map API data to ProductionList format
        const mappedData = (data.data || []).map((item: any) => {
          const dueDate = item.duedate ? new Date(item.duedate) : null;
          const now = new Date();
          const isOverdue = dueDate ? dueDate < now : false;
          
          return {
            id: item.id?.toString() || item.jobid?.toString(),
            jobNumber: item.lineidentifier || `Job ${item.jobid}`,
            customer: item.customername,
            material: item.materialname,
            finishing: item.finishingname,
            dueDate: item.duedate,
            orderDate: item.orderdate,
            overdueDate: isOverdue ? item.duedate : undefined,
            quantity: item.quantity,
            tool: item.tool,
            processed: item.processed,
            quoteId: item.quoteid
          };
        });
        
        setRows(mappedData);
      } catch (e: any) {
        setError(e.message || 'Failed to load');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Compute derived data without hooks to avoid hook-order issues across renders
  const sorted = [...rows].sort((a, b) => {
    const getVal = (row: ListJob, col: SortColumn) => {
      switch (col) {
        case 'dueDate': return row.dueDate ? new Date(row.dueDate).getTime() : Infinity;
        case 'orderDate': return row.orderDate ? new Date(row.orderDate).getTime() : Infinity;
        case 'quantity': return row.quantity ?? -Infinity;
        case 'jobNumber': return row.jobNumber;
        case 'customer': return (row.customer || '').toLowerCase();
        case 'material': return (row.material || '').toLowerCase();
        case 'finishing': return (row.finishing || '').toLowerCase();
        case 'tool': return (row.tool || '').toLowerCase();
        default: return '';
      }
    };
    for (const rule of sortRules) {
      const av = getVal(a, rule.column);
      const bv = getVal(b, rule.column);
      let cmp = 0;
      if (typeof av === 'number' && typeof bv === 'number') cmp = av - bv;
      else cmp = String(av).localeCompare(String(bv));
      if (cmp !== 0) return rule.order === 'asc' ? cmp : -cmp;
    }
    return 0;
  });

  if (loading) return <div className="p-4 text-sm text-muted-foreground">Loading list…</div>;
  if (error) return <div className="p-4 text-sm text-red-600">{error}</div>;

  return (
    <div className="bg-white rounded-lg shadow border">
      {/* Header */}
      <div className="grid grid-cols-12 gap-2 p-3 text-xs font-semibold text-muted-foreground border-b bg-gray-50">
        <div className="col-span-2">Job Number</div>
        <div className="col-span-2">Customer</div>
        <div className="col-span-2">Material</div>
        <div className="col-span-2">Finishing</div>
        <div className="col-span-1 text-right">Qty</div>
        <div className="col-span-2 text-right">Due Date</div>
        <div className="col-span-1 text-center">Status</div>
      </div>
      
      {/* Data Rows */}
      <div className="divide-y">
        {sorted.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <div className="text-lg font-medium mb-2">No production jobs found</div>
            <div className="text-sm">Check your filters or try refreshing the page</div>
          </div>
        ) : (
          sorted.map((j) => {
            const isOverdue = j.dueDate ? new Date(j.dueDate) < new Date() : false;
            const dueDate = j.dueDate ? new Date(j.dueDate) : null;
            const dueLabel = dueDate ? dueDate.toLocaleDateString() : '-';
            const daysDiff = dueDate ? Math.ceil((dueDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)) : 0;
            
            return (
              <div 
                key={j.id} 
                className={`grid grid-cols-12 gap-2 p-3 text-sm hover:bg-muted/30 transition-colors ${
                  isOverdue ? 'bg-red-50 border-l-4 border-l-red-500' : ''
                } ${j.processed ? 'bg-green-50 border-l-4 border-l-green-500' : ''}`}
              >
                <div className="col-span-2 font-medium text-blue-600">
                  #{j.jobNumber}
                  {j.quoteId && (
                    <div className="text-xs text-gray-500 mt-1">Quote: {j.quoteId}</div>
                  )}
                </div>
                <div className="col-span-2 truncate" title={j.customer}>
                  {j.customer || '-'}
                </div>
                <div className="col-span-2 truncate" title={j.material}>
                  {j.material || '-'}
                </div>
                <div className="col-span-2 truncate" title={j.finishing}>
                  {j.finishing || '-'}
                  {j.tool && (
                    <div className="text-xs text-gray-500 mt-1" title={j.tool}>
                      Tool: {j.tool}
                    </div>
                  )}
                </div>
                <div className="col-span-1 text-right font-medium">
                  {j.quantity?.toLocaleString?.() || '-'}
                </div>
                <div className={`col-span-2 text-right ${isOverdue ? 'text-red-600 font-semibold' : ''}`}>
                  {dueLabel}
                  {dueDate && (
                    <div className={`text-xs mt-1 ${
                      isOverdue ? 'text-red-500' : daysDiff <= 7 ? 'text-orange-500' : 'text-gray-500'
                    }`}>
                      {isOverdue ? `${Math.abs(daysDiff)} days overdue` : 
                       daysDiff === 0 ? 'Due today' :
                       daysDiff === 1 ? 'Due tomorrow' :
                       daysDiff <= 7 ? `Due in ${daysDiff} days` : ''}
                    </div>
                  )}
                </div>
                <div className="col-span-1 text-center">
                  {j.processed ? (
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      ✓ Done
                    </span>
                  ) : isOverdue ? (
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                      ⚠ Overdue
                    </span>
                  ) : daysDiff <= 1 ? (
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                      🔥 Urgent
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      📋 Active
                    </span>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
      
      {/* Summary Footer */}
      {sorted.length > 0 && (
        <div className="border-t bg-gray-50 p-3">
          <div className="text-sm text-gray-600 flex justify-between">
            <span>Total Jobs: {sorted.length}</span>
            <span>
              Overdue: {sorted.filter(j => j.dueDate && new Date(j.dueDate) < new Date()).length} | 
              Completed: {sorted.filter(j => j.processed).length} | 
              Active: {sorted.filter(j => !j.processed && (!j.dueDate || new Date(j.dueDate) >= new Date())).length}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}


