import React, { useEffect, useState } from "react";

type Machinery = { id: string; name: string };
type Operation = { id: string; name: string; machineId?: string; description?: string; setupTimeMinutes?: number };

export default function ScanningPage(): React.ReactElement {
  const [machineries, setMachineries] = useState<Machinery[]>([]);
  const [selectedMachine, setSelectedMachine] = useState<string | undefined>(undefined);
  const [operations, setOperations] = useState<Operation[]>([]);
  const [loading, setLoading] = useState(false);
  const [savingOps, setSavingOps] = useState<Record<string, boolean>>({});
  // Local-only selection of operations for the current scan.
  // This is NOT used to assign/unassign operations in the DB — it only records
  // which operations were performed for the next scan submission.
  const [selectedOperations, setSelectedOperations] = useState<Set<string>>(new Set());
  const [scanInput, setScanInput] = useState("");
  // Recent scans tracked with status so we can show success / failure next to each item
  const [recentScans, setRecentScans] = useState<Array<{
    clientId: string;
    code: string;
    status: 'pending' | 'success' | 'failed';
    message?: string | null;
    scanId?: string | null;
    scannedAt?: string | null;
    operations?: string[] | null;
  }>>([]);

  useEffect(() => {
    async function loadMachineries() {
      try {
        const res = await fetch('/api/machineries');
        const data = await res.json();
        setMachineries((data && data.items) || data || []);
      } catch (e) {
        console.error('Failed to load machineries', e);
      }
    }
    loadMachineries();
  }, []);

  useEffect(() => {
    async function loadOperations() {
      setLoading(true);
      try {
        if (!selectedMachine) {
          // No machine selected: do not fetch operations
          setOperations([]);
          setLoading(false);
          return;
        }
        const url = `/api/operations?machineId=${encodeURIComponent(selectedMachine)}`;
        const res = await fetch(url);
        const payload = await res.json();
        const ops = (payload && (payload.data?.operations || payload.operations || payload.data || payload.items)) || [];
        setOperations(Array.isArray(ops) ? ops : []);
      } catch (e) {
        console.error('Failed to load operations', e);
        setOperations([]);
      } finally {
        setLoading(false);
      }
    }
    loadOperations();
  }, [selectedMachine]);

  return (
    <div style={{ padding: 12 }}>
      <h1 style={{ marginTop: 0 }}>Scanning / Operations</h1>
      <p style={{ color: '#555' }}>Select a machine to view its configured operations, or leave blank to list all operations.</p>

      {/* Two-column top area: left = operations, right = machine selector + scanning */}
      <div style={{ display: 'flex', gap: 24, alignItems: 'flex-start', marginTop: 12 }}>
        {/* Left column: operations checklist (fixed width) */}
        <div style={{ width: 320, border: '1px solid #eee', padding: 12, borderRadius: 8, background: '#fff' }}>
          <h3 style={{ marginTop: 0, marginBottom: 8 }}>Operations</h3>
          {loading ? (
            <div>Loading operations...</div>
          ) : operations.length === 0 ? (
            <div style={{ color: '#888' }}>No operations found.</div>
          ) : (
            <ul style={{ paddingLeft: 18, margin: 0 }}>
              {operations.map((op) => {
                const disabled = !selectedMachine;
                const checked = selectedOperations.has(op.id);
                return (
                  <li key={op.id} style={{ marginBottom: 8 }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <input
                        type="checkbox"
                        disabled={disabled}
                        checked={checked}
                        onChange={(e) => {
                          const isChecked = e.target.checked;
                          setSelectedOperations((prev) => {
                            const next = new Set(prev);
                            if (isChecked) next.add(op.id);
                            else next.delete(op.id);
                            return next;
                          });
                        }}
                      />
                      <span style={{ fontWeight: 600 }}>{op.name}</span>
                    </label>
                    {op.description ? <div style={{ color: '#555' }}>{op.description}</div> : null}
                    {op.setupTimeMinutes ? <div style={{ color: '#777', fontSize: 12 }}>Setup: {op.setupTimeMinutes} min</div> : null}
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Right column: machine selector + scanning controls */}
        <div style={{ flex: 1 }}>
          <div>
            <label htmlFor="machine-select" style={{ display: 'block', marginBottom: 6 }}>Select machine</label>
            <select
              id="machine-select"
              value={selectedMachine || ''}
              onChange={(e) => setSelectedMachine(e.target.value || undefined)}
              style={{ padding: 8, borderRadius: 6, border: '1px solid #ddd', minWidth: 240 }}
            >
              <option value="" disabled>Select a machine</option>
              {machineries.map((m) => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </select>
          </div>

          <div style={{ marginTop: 12 }}>
            <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
              <input
                aria-label="Scan input"
                value={scanInput}
                onChange={(e) => setScanInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    const trimmed = scanInput.trim();
                    if (trimmed) {
                      const clientId = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
                      // optimistic pending entry
                      setRecentScans((r) => [{ clientId, code: trimmed, status: 'pending', operations: Array.from(selectedOperations) }, ...r]);
                      void submitScanWithClientId(trimmed, clientId);
                      setScanInput('');
                    }
                  }
                }}
                placeholder="Scan or paste job id and press Enter"
                style={{ flex: 1, padding: 8, borderRadius: 6, border: '1px solid #ddd' }}
              />
              <button onClick={() => {
                const trimmed = scanInput.trim();
                if (trimmed) {
                  const clientId = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
                  setRecentScans((r) => [{ clientId, code: trimmed, status: 'pending', operations: Array.from(selectedOperations) }, ...r]);
                  void submitScanWithClientId(trimmed, clientId);
                  setScanInput('');
                }
              }} style={{ padding: '8px 12px' }}>Add</button>
              <button onClick={() => setRecentScans([])} style={{ padding: '8px 12px' }}>Clear</button>
            </div>

            <div>
              <h3 style={{ margin: '6px 0' }}>Recent scans</h3>
              {recentScans.length === 0 ? (
                <div style={{ color: '#888' }}>No items scanned yet.</div>
              ) : (
                <ul style={{ paddingLeft: 18 }}>
                  {recentScans.map((item) => (
                    <li key={item.clientId} style={{ marginBottom: 8 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <strong>{item.code}</strong>
                        {item.status === 'pending' && <span style={{ color: '#888' }}>• pending</span>}
                        {item.status === 'success' && <span style={{ color: 'green' }}>✓</span>}
                        {item.status === 'failed' && <span style={{ color: 'red' }}>✗</span>}
                      </div>
                      {item.message ? <div style={{ color: item.status === 'failed' ? 'red' : '#555', fontSize: 12 }}>{item.message}</div> : null}
                      {item.operations && item.operations.length > 0 ? <div style={{ color: '#777', fontSize: 12 }}>Operations: {item.operations.join(', ')}</div> : null}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      </div>

      <p style={{ marginTop: 18, color: '#666', fontSize: 13 }}>
        This page reuses the machine operations UI as the Scanning page. If you want separate scanning features (barcode input, persistence), I can add them.
      </p>
    </div>
  );

  async function submitScan(codeText: string) {
    // legacy signature for backward-compat; forward to new form
    return submitScanWithClientId(codeText, undefined);
  }

  async function submitScanWithClientId(codeText: string, clientId?: string) {
    try {
      const ops = Array.from(selectedOperations);
      const res = await fetch('/api/scans', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ codeText, machineId: selectedMachine, operations: ops }) });
      const json = await res.json().catch(() => ({ success: false, error: 'Invalid JSON response' }));
      if (res.ok && json && json.success) {
        const scan = json.data?.scan || json.scan || null;
        setRecentScans((prev) => prev.map((it) => it.clientId === clientId ? ({ ...it, status: 'success', scanId: scan?.scanId || scan?.scan_id, scannedAt: scan?.scannedAt || scan?.scanned_at, message: json.message || null }) : it));
        return { success: true, scan };
      }

      // failure path
      const errMsg = (json && (json.error || json.message)) || `HTTP ${res.status}`;
      setRecentScans((prev) => prev.map((it) => it.clientId === clientId ? ({ ...it, status: 'failed', message: String(errMsg) }) : it));
      return { success: false, error: errMsg };
    } catch (e) {
      const msg = String(e instanceof Error ? e.message : e);
      if (clientId) {
        setRecentScans((prev) => prev.map((it) => it.clientId === clientId ? ({ ...it, status: 'failed', message: msg }) : it));
      }
      console.error('Failed to submit scan', e);
      return { success: false, error: msg };
    }
  }
}
