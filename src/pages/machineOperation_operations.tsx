import React, { useEffect, useState } from "react";

export interface OperationItem {
  operation_id: string;
  operation_name: string;
  machine_id?: string;
  operation_category?: string;
  can_run_parallel?: boolean;
  requires_operator?: boolean;
  setup_time_base_minutes?: number;
}

export default function MachineOperationOperations(): React.ReactElement {
  const [operations, setOperations] = useState<OperationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch('/api/operations');
        if (!res.ok) throw new Error(`API error ${res.status}`);
        const json = await res.json();
        // assume { success: true, data: [...] }
        const rows = Array.isArray(json?.data) ? json.data : json?.items || [];
        if (mounted) setOperations(rows);
      } catch (e: any) {
        if (mounted) setError(e?.message || String(e));
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => { mounted = false; };
  }, []);

  return (
    <div>
      <h2 className="text-lg font-semibold mb-3">Operations</h2>
      {loading ? (
        <div className="text-sm text-muted-foreground">Loading operations...</div>
      ) : error ? (
        <div className="text-sm text-red-600">Error: {error}</div>
      ) : operations.length === 0 ? (
        <div className="text-sm text-muted-foreground">No operations found.</div>
      ) : (
        <div className="space-y-2">
          {operations.map((op) => (
            <div key={op.operation_id} className="p-3 border rounded bg-white shadow-sm">
              <div className="flex justify-between items-start">
                <div>
                  <div className="font-medium">{op.operation_name}</div>
                  <div className="text-xs text-muted-foreground">ID: {op.operation_id} {op.operation_category ? `• ${op.operation_category}` : ''}</div>
                </div>
                <div className="text-right text-sm text-muted-foreground">
                  {typeof op.setup_time_base_minutes === 'number' ? `${op.setup_time_base_minutes} min` : '-'}
                </div>
              </div>
              <div className="mt-2 text-sm text-muted-foreground">
                Machine: {op.machine_id || '—'} • Operator: {op.requires_operator ? 'Yes' : 'No'} • Parallel: {op.can_run_parallel ? 'Yes' : 'No'}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
