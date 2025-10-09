import React, { useEffect, useState } from 'react';
import type { Machinery as MachineryType } from '../types/common.js';

type Machinery = MachineryType;

const stateColor = (s: string) => {
  switch (s) {
    case 'running':
      return 'bg-green-500';
    case 'idle':
      return 'bg-gray-400';
    case 'maintenance':
      return 'bg-yellow-400';
    case 'error':
      return 'bg-red-500';
    default:
      return 'bg-gray-400';
  }
};

export default function MachineriesPage() {
  const [items, setItems] = useState<Machinery[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Machinery | null>(null);

  useEffect(() => {
    fetch('/api/machineries')
      .then((r) => r.json())
      .then((d) => {
        setItems(d.items || []);
      })
      .catch((e) => console.error(e))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div>Loading machineries...</div>;

  return (
    <>
      <div className="grid grid-cols-3 gap-4">
        {items.map((m) => (
          <div
            key={m.id}
            className="relative bg-white rounded shadow p-4 cursor-pointer hover:shadow-lg transition"
            onClick={() => setSelected(m)}
            role="button"
            tabIndex={0}
          >
            <div className={`absolute top-3 right-3 w-3 h-3 rounded-full ${stateColor(m.state)}`} />
            <h3 className="font-semibold text-lg">{m.name}</h3>
            <p className="text-sm text-muted-foreground capitalize">{m.machineType ? `${m.machineType}` : m.state}</p>
            <div className="mt-3 text-left">
              <p className="text-sm">Type: <span className="font-medium">{m.machineType || 'Unknown'}</span></p>
              <p className="text-sm">Current Job: <span className="font-medium">{m.currentJob ? `${m.currentJob.name}` : 'None'}</span></p>
              <p className="text-sm">Queue: <span className="font-medium">{m.queueLength}</span></p>
              <p className="text-sm">Rate: <span className="font-medium">{m.unitsPerHour} units/hr</span></p>
              <p className="text-sm">Maintenance: <span className="font-medium">{m.maintenanceDue ? 'Due' : 'OK'}</span></p>
            </div>
          </div>
        ))}
      </div>

      {/* Detail modal */}
      {selected && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded shadow-lg w-3/5 max-h-[80vh] overflow-auto p-6">
            <div className="flex justify-between items-start">
              <div>
                <h2 className="text-2xl font-bold">{selected.name} {selected.machineType ? `· ${selected.machineType}` : ''}</h2>
                <p className="text-sm text-muted-foreground">State: <span className={`inline-block px-2 py-1 rounded text-white ${stateColor(selected.state)}`}>{selected.state}</span></p>
              </div>
              <div>
                <button className="text-sm text-muted-foreground" onClick={() => setSelected(null)}>Close</button>
              </div>
            </div>

            <div className="mt-4">
              <h3 className="font-semibold">Overview</h3>
              <ul className="mt-2 text-left">
                <li>Current Job: {selected.currentJob ? `${selected.currentJob.name} (${selected.currentJob.jobId})` : 'None'}</li>
                <li>Queue Length: {selected.queueLength}</li>
                <li>Units / hr: {selected.unitsPerHour}</li>
                <li>Maintenance: {selected.maintenanceDue ? 'Due' : 'OK'}</li>
                <li>Last Updated: {new Date(selected.lastUpdated).toLocaleString()}</li>
              </ul>
            </div>

            <div className="mt-4">
              <h3 className="font-semibold">Schedule</h3>
              {selected.schedule && selected.schedule.length > 0 ? (
                <ol className="mt-2 text-left list-decimal list-inside">
                  {selected.schedule.map((s, i) => (
                    <li key={i} className="py-1">
                      <div className="text-sm">{new Date(s.time).toLocaleString()} — <span className="font-medium">{s.event}</span></div>
                    </li>
                  ))}
                </ol>
              ) : (
                <p className="mt-2 text-sm text-muted-foreground">No scheduled items</p>
              )}
            </div>

          </div>
        </div>
      )}
    </>
  );
}
