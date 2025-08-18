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
        setRows(data.data || []);
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
      <div className="grid grid-cols-12 gap-2 p-3 text-xs font-semibold text-muted-foreground border-b">
        <div className="col-span-2">Job</div>
        <div className="col-span-3">Customer</div>
        <div className="col-span-2">Material</div>
        <div className="col-span-2">Finishing</div>
        <div className="col-span-1 text-right">Qty</div>
        <div className="col-span-2 text-right">Due</div>
      </div>
      <div className="divide-y">
        {sorted.map((j) => {
          const isOverdue = j.dueDate ? new Date(j.dueDate) < new Date() : false;
          const dueLabel = j.dueDate ? new Date(j.dueDate).toLocaleDateString() : '-';
          return (
            <div key={j.id} className="grid grid-cols-12 gap-2 p-3 text-sm hover:bg-muted/30">
              <div className="col-span-2 font-medium">#{j.jobNumber}</div>
              <div className="col-span-3 truncate">{j.customer || '-'}</div>
              <div className="col-span-2 truncate">{j.material || '-'}</div>
              <div className="col-span-2 truncate">{j.finishing || '-'}</div>
              <div className="col-span-1 text-right">{j.quantity?.toLocaleString?.() || '-'}</div>
              <div className={`col-span-2 text-right ${isOverdue ? 'text-red-600 font-semibold' : ''}`}>{dueLabel}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}


