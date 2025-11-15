import React, { useState } from "react";
import MachineOperationMachine from "./machineOperation_machine";
import MachineOperationOperations from "./machineOperation_operations.tsx";
import MachineOperationOperators from "./machineOperation_operators";
import MachineOperationQueue from "./machineOperation_queue";
import MachineOperationCapacity from "./machineOperation_capacity";
import MachineOperationSetupTimes from "./machineOperation_setupTimes";
import MachineOperationWorkflows from "./machineOperation_workflows";

const TABS = [
  "Machines",
  "Operations",
  "Operators",
  "Queue",
  "Capacity",
  "Setup Times",
  "Workflows"
];

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

export default function MachineOperationsConfigPage() {
  const [activeTab, setActiveTab] = useState<string>(TABS[0] ?? "");
  const [machines, setMachines] = useState<Machine[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [form, setForm] = useState<Partial<Machine>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [customType, setCustomType] = useState("");
  const [showTypeInput, setShowTypeInput] = useState(false);
  const [customStatus, setCustomStatus] = useState("");
  const [showStatusInput, setShowStatusInput] = useState(false);

  // Validation rules
  function validate(f: Partial<Machine>) {
    const e: Record<string, string> = {};
    if (!f.machine_id) e.machine_id = "ID required";
    if (!f.machine_name) e.machine_name = "Name required";
    if (!f.machine_type) e.machine_type = "Type required";
    if (f.hourly_rate_aud == null || f.hourly_rate_aud < 0) e.hourly_rate_aud = "Rate must be >= 0";
    if (f.max_web_width_mm == null || f.max_web_width_mm < 1) e.max_web_width_mm = "Width must be >= 1";
    if (f.shift_hours == null || f.shift_hours < 1) e.shift_hours = "Shift hours must be >= 1";
    if (!f.availability_status) e.availability_status = "Status required";
    return e;
  }

  // Select machine for editing
  function selectMachine(id: string) {
    setSelectedId(id);
    const m = machines.find(m => m.machine_id === id);
    setForm(m ? { ...m } : {});
    setErrors({});
    setShowTypeInput(false);
    setShowStatusInput(false);
  }

  // Handle form changes
  function updateForm(field: keyof Machine, value: any) {
    setForm(prev => ({ ...prev, [field]: value }));
    setErrors(prev => {
      const { [field]: _, ...rest } = prev;
      return rest;
    });
  }

  // Add new machine
  function addMachine() {
    setSelectedId(null);
    setForm({
      machine_id: generateId(),
      machine_name: "",
      machine_type: "",
      hourly_rate_aud: 0,
      max_web_width_mm: 1000,
      shift_hours: 8,
      availability_status: "available",
      maintenance_schedule: "",
      capabilities: []
    });
    setErrors({});
    setShowTypeInput(false);
    setShowStatusInput(false);
  }

  // Save machine (create or update)
  function saveMachine() {
    const e = validate(form);
    if (Object.keys(e).length) {
      setErrors(e);
      return;
    }
    if (selectedId) {
      setMachines(prev => prev.map(m => m.machine_id === selectedId ? { ...(form as Machine) } : m));
    } else {
      setMachines(prev => [...prev, form as Machine]);
    }
    setSelectedId(form.machine_id!);
  }

  // Delete machine
  function deleteMachine(id: string) {
    setMachines(prev => prev.filter(m => m.machine_id !== id));
    setSelectedId(null);
    setForm({});
  }

  // Add custom type/status
  function addCustomType() {
    if (customType && !MACHINE_TYPES.includes(customType)) {
      MACHINE_TYPES.push(customType);
      updateForm("machine_type", customType);
      setCustomType("");
      setShowTypeInput(false);
    }
  }
  function addCustomStatus() {
    if (customStatus && !AVAILABILITY_STATUSES.includes(customStatus)) {
      AVAILABILITY_STATUSES.push(customStatus);
      updateForm("availability_status", customStatus);
      setCustomStatus("");
      setShowStatusInput(false);
    }
  }

  // Capability tag input
  function addCapability(tag: string) {
    if (tag && !form.capabilities?.includes(tag)) {
      updateForm("capabilities", [...(form.capabilities || []), tag]);
    }
  }
  function removeCapability(tag: string) {
    updateForm("capabilities", (form.capabilities || []).filter(t => t !== tag));
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto py-8">
        <h1 className="text-2xl font-bold mb-6">Configuration</h1>
        <div className="flex gap-2 mb-8">
          {TABS.map(tab => (
            <button
              key={tab}
              className={`px-4 py-2 rounded font-medium transition-colors ${
                activeTab === tab
                  ? "bg-blue-600 text-white"
                  : "bg-white text-gray-700 border border-gray-300 hover:bg-blue-50"
              }`}
              onClick={() => setActiveTab(tab)}
            >
              {tab}
            </button>
          ))}
        </div>
        <div className="bg-white rounded shadow p-6 min-h-[400px]">
          {activeTab === "Machines" && (
            <MachineOperationMachine
              machines={machines}
              setMachines={setMachines}
              selectedId={selectedId}
              setSelectedId={setSelectedId}
              form={form}
              setForm={setForm}
              errors={errors}
              setErrors={setErrors}
              customType={customType}
              setCustomType={setCustomType}
              showTypeInput={showTypeInput}
              setShowTypeInput={setShowTypeInput}
              customStatus={customStatus}
              setCustomStatus={setCustomStatus}
              showStatusInput={showStatusInput}
              setShowStatusInput={setShowStatusInput}
              addMachine={addMachine}
              saveMachine={saveMachine}
              deleteMachine={deleteMachine}
              updateForm={updateForm}
              addCustomType={addCustomType}
              addCustomStatus={addCustomStatus}
              addCapability={addCapability}
              removeCapability={removeCapability}
            />
          )}
          {activeTab === "Operations" && <MachineOperationOperations />}
          {activeTab === "Operators" && <MachineOperationOperators />}
          {activeTab === "Queue" && <MachineOperationQueue />}
          {activeTab === "Capacity" && <MachineOperationCapacity />}
          {activeTab === "Setup Times" && <MachineOperationSetupTimes />}
          {activeTab === "Workflows" && <MachineOperationWorkflows />}
        </div>
      </div>
    </div>
  );
}
