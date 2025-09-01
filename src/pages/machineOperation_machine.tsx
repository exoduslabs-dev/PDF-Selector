import React, { useState } from "react";

const MACHINE_TYPES = [
  "indigo",
  "digital_cutter",
  "laminator",
  "slitter"
];
const AVAILABILITY_STATUSES = [
  "available",
  "maintenance",
  "offline",
  "reserved"
];

interface Machine {
  machine_id: string;
  machine_name: string;
  machine_type: string;
  hourly_rate_aud: number;
  max_web_width_mm: number;
  shift_hours: number;
  availability_status: string;
  maintenance_schedule: string;
  capabilities: string[];
}

function generateId() {
  return `M${Math.floor(Math.random() * 100000)}`;
}

export default function MachineOperationMachine({
  machines,
  setMachines,
  selectedId,
  setSelectedId,
  form,
  setForm,
  errors,
  setErrors,
  customType,
  setCustomType,
  showTypeInput,
  setShowTypeInput,
  customStatus,
  setCustomStatus,
  showStatusInput,
  setShowStatusInput,
  addMachine,
  saveMachine,
  deleteMachine,
  updateForm,
  addCustomType,
  addCustomStatus,
  addCapability,
  removeCapability
}: any) {
  return (
    <div>
      <h2 className="text-xl font-semibold mb-4">Machines</h2>
      <div className="flex gap-8">
        {/* Machine List */}
        <div className="w-1/3 border-r pr-6">
          <div className="font-bold mb-2">Machine List</div>
          <ul className="mb-4">
            {machines.map((m: Machine) => (
              <li key={m.machine_id} className={`mb-2 p-2 rounded cursor-pointer ${selectedId === m.machine_id ? "bg-blue-50" : "hover:bg-gray-100"}`}
                onClick={() => setSelectedId(m.machine_id)}>
                <div className="font-semibold">{m.machine_name}</div>
                <div className="text-xs text-gray-500">{m.machine_type} | {m.availability_status}</div>
              </li>
            ))}
          </ul>
          <button className="mt-4 px-3 py-2 bg-blue-500 text-white rounded" onClick={addMachine}>+ Add Machine</button>
          {selectedId && (
            <button className="mt-2 px-3 py-2 bg-red-500 text-white rounded" onClick={() => deleteMachine(selectedId)}>Delete</button>
          )}
        </div>
        {/* Machine Details Form */}
        <div className="w-2/3 pl-6">
          <div className="font-bold mb-2">Machine Details Form</div>
          <form className="space-y-4" onSubmit={e => { e.preventDefault(); saveMachine(); }}>
            <div>
              <label className="block text-sm font-medium mb-1">Machine ID</label>
              <input type="text" value={form.machine_id || ""} onChange={e => updateForm("machine_id", e.target.value)} className={`w-full border rounded px-2 py-1 ${errors.machine_id ? "border-red-500" : "border-gray-300"}`} />
              {errors.machine_id && <div className="text-red-500 text-xs">{errors.machine_id}</div>}
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Name</label>
              <input type="text" value={form.machine_name || ""} onChange={e => updateForm("machine_name", e.target.value)} className={`w-full border rounded px-2 py-1 ${errors.machine_name ? "border-red-500" : "border-gray-300"}`} />
              {errors.machine_name && <div className="text-red-500 text-xs">{errors.machine_name}</div>}
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Type</label>
              <select value={form.machine_type || ""} onChange={e => {
                if (e.target.value === "other") setShowTypeInput(true);
                else {
                  updateForm("machine_type", e.target.value);
                  setShowTypeInput(false);
                }
              }} className={`w-full border rounded px-2 py-1 ${errors.machine_type ? "border-red-500" : "border-gray-300"}`}>
                <option value="">Select type...</option>
                {MACHINE_TYPES.map(type => <option key={type} value={type}>{type}</option>)}
                <option value="other">Other (specify)</option>
              </select>
              {showTypeInput && (
                <div className="flex gap-2 mt-2">
                  <input type="text" value={customType} onChange={e => setCustomType(e.target.value)} className="border rounded px-2 py-1 w-2/3" placeholder="New type..." />
                  <button type="button" className="bg-blue-500 text-white px-3 py-1 rounded" onClick={addCustomType}>Add as new type</button>
                </div>
              )}
              {errors.machine_type && <div className="text-red-500 text-xs">{errors.machine_type}</div>}
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Hourly Rate (AUD)</label>
              <input type="number" min={0} value={form.hourly_rate_aud ?? 0} onChange={e => updateForm("hourly_rate_aud", Number(e.target.value))} className={`w-full border rounded px-2 py-1 ${errors.hourly_rate_aud ? "border-red-500" : "border-gray-300"}`} />
              {errors.hourly_rate_aud && <div className="text-red-500 text-xs">{errors.hourly_rate_aud}</div>}
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Max Web Width (mm)</label>
              <input type="number" min={1} value={form.max_web_width_mm ?? 1000} onChange={e => updateForm("max_web_width_mm", Number(e.target.value))} className={`w-full border rounded px-2 py-1 ${errors.max_web_width_mm ? "border-red-500" : "border-gray-300"}`} />
              {errors.max_web_width_mm && <div className="text-red-500 text-xs">{errors.max_web_width_mm}</div>}
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Shift Hours</label>
              <input type="number" min={1} value={form.shift_hours ?? 8} onChange={e => updateForm("shift_hours", Number(e.target.value))} className={`w-full border rounded px-2 py-1 ${errors.shift_hours ? "border-red-500" : "border-gray-300"}`} />
              {errors.shift_hours && <div className="text-red-500 text-xs">{errors.shift_hours}</div>}
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Availability Status</label>
              <select value={form.availability_status || ""} onChange={e => {
                if (e.target.value === "other") setShowStatusInput(true);
                else {
                  updateForm("availability_status", e.target.value);
                  setShowStatusInput(false);
                }
              }} className={`w-full border rounded px-2 py-1 ${errors.availability_status ? "border-red-500" : "border-gray-300"}`}>
                <option value="">Select status...</option>
                {AVAILABILITY_STATUSES.map(status => <option key={status} value={status}>{status}</option>)}
                <option value="other">Other (specify)</option>
              </select>
              {showStatusInput && (
                <div className="flex gap-2 mt-2">
                  <input type="text" value={customStatus} onChange={e => setCustomStatus(e.target.value)} className="border rounded px-2 py-1 w-2/3" placeholder="New status..." />
                  <button type="button" className="bg-blue-500 text-white px-3 py-1 rounded" onClick={addCustomStatus}>Add as new status</button>
                </div>
              )}
              {errors.availability_status && <div className="text-red-500 text-xs">{errors.availability_status}</div>}
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Maintenance Schedule</label>
              <textarea value={form.maintenance_schedule || ""} onChange={e => updateForm("maintenance_schedule", e.target.value)} className="w-full border rounded px-2 py-1" rows={2} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Capabilities</label>
              <div className="flex gap-2 flex-wrap mb-2">
                {(form.capabilities || []).map((tag: string) => (
                  <span key={tag} className="px-2 py-1 bg-gray-200 rounded text-xs flex items-center gap-1">
                    {tag}
                    <button type="button" className="text-red-500 ml-1" onClick={() => removeCapability(tag)}>&times;</button>
                  </span>
                ))}
              </div>
              <input type="text" placeholder="Add capability..." className="border rounded px-2 py-1 w-2/3" onKeyDown={e => {
                if (e.key === "Enter" && e.currentTarget.value) {
                  addCapability(e.currentTarget.value);
                  e.currentTarget.value = "";
                }
              }} />
            </div>
            <div className="flex gap-4 mt-6">
              <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded font-semibold">{selectedId ? "Update" : "Add"} Machine</button>
              <button type="button" className="bg-gray-300 text-gray-700 px-4 py-2 rounded font-semibold" onClick={addMachine}>Cancel</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
