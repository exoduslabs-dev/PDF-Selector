import React from "react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { apiCall } from "../../config/api";
import type { MaterialFieldOptions } from "../../types/materials";

interface PricingRow {
  pricing_id: string;
  supplier_id?: string;
  supplier_name?: string;
  cost_per_unit: number;
  pricing_unit: string;
  is_preferred_supplier: boolean;
  is_active: boolean;
}

interface Supplier {
  supplier_id: string;
  supplier_name?: string;
}

interface SupplierPricingEditorProps {
  materialId: string;
  fieldOptions: MaterialFieldOptions;
}

export function SupplierPricingEditor({ materialId, fieldOptions }: SupplierPricingEditorProps) {
  const [rows, setRows] = React.useState<PricingRow[]>([]);
  const [suppliers, setSuppliers] = React.useState<Supplier[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [draftSupplier, setDraftSupplier] = React.useState<string>('');
  const [draftPrice, setDraftPrice] = React.useState<string>('');
  const [draftUnit, setDraftUnit] = React.useState<string>('sqm');
  const [saving, setSaving] = React.useState(false);

  const load = React.useCallback(async () => {
    if (!materialId) {
      return;
    }
    setLoading(true);
    try {
      const pricingUrl = `/api/material-pricing?material_id=${encodeURIComponent(materialId)}`;
      const [pricingResponse, suppliersResponse] = await Promise.all([
        apiCall(pricingUrl),
        apiCall('/api/suppliers')
      ]);
      if (pricingResponse.ok) {
        const data = await pricingResponse.json();
        setRows(data.items || []);
      } else {
        const errorText = await pricingResponse.text();
      }
      if (suppliersResponse.ok) {
        const data = await suppliersResponse.json();
        setSuppliers((data.suppliers || []).map((x: any) => ({ 
          supplier_id: x.supplier_id, 
          supplier_name: x.supplier_name 
        })));
      } else {
        const errorText = await suppliersResponse.text();
      }
    } catch (error) {
    } finally {
      setLoading(false);
    }
  }, [materialId]);

  React.useEffect(() => { 
    load(); 
  }, [load]);

  const saveRow = async (id: string) => {
    if (!materialId || saving) return;
    
    const unitPrice = parseFloat(draftPrice);
    if (Number.isNaN(unitPrice) || unitPrice < 0) {
      alert('Enter a valid price');
      return;
    }

    setSaving(true);
    const isTemp = id.startsWith('temp-');
    const payload = { 
      supplier_id: draftSupplier || null, 
      cost_per_unit: unitPrice, 
      pricing_unit: draftUnit || 'sqm'
    };

    try {
      let response: Response;
      if (isTemp) {
        response = await apiCall('/api/material-pricing', { 
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ material_id: materialId, ...payload }) 
        });
      } else {
        response = await apiCall(`/api/material-pricing/${id}`, { 
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload) 
        });
      }

      if (!response.ok) {
        const errorData = await response.text();
        console.error('Save failed:', errorData);
        alert('Failed to save pricing');
        return;
      }

      // Reset form state
      setEditingId(null);
      setDraftPrice('');
      setDraftSupplier('');
      setDraftUnit('sqm');
      
      // Reload data
      await load();
    } catch (error) {
      console.error('Failed to save pricing:', error);
      alert('Failed to save pricing');
    } finally {
      setSaving(false);
    }
  };

  const deleteRow = async (id: string) => {
    if (!window.confirm('Delete this pricing entry?')) return;

    try {
      const response = await apiCall(`/api/material-pricing/${id}`, { 
        method: 'DELETE' 
      });
      
      if (response.ok) {
        await load();
      } else {
        const errorData = await response.text();
        console.error('Delete failed:', errorData);
        alert('Failed to delete pricing');
      }
    } catch (error) {
      console.error('Failed to delete pricing:', error);
      alert('Failed to delete pricing');
    }
  };

  const startEditing = (row: PricingRow) => {
    // Cancel any existing temp rows first
    setRows(prev => prev.filter(r => !r.pricing_id.startsWith('temp-')));
    
    setEditingId(row.pricing_id);
    setDraftSupplier(row.supplier_id || '');
    setDraftPrice(String(row.cost_per_unit ?? ''));
    setDraftUnit(row.pricing_unit || 'sqm');
  };

  const addNewPricing = () => {
    // Cancel any existing editing
    if (editingId) {
      cancelEditing();
    }
    
    const tempId = `temp-${Date.now()}`;
    const newRow: PricingRow = {
      pricing_id: tempId,
      supplier_id: '',
      cost_per_unit: 0,
      pricing_unit: 'sqm',
      is_preferred_supplier: false,
      is_active: true
    };

    setRows(prev => [...prev, newRow]);
    setEditingId(tempId);
    setDraftSupplier('');
    setDraftPrice('');
    setDraftUnit('sqm');
  };

  const cancelEditing = () => {
    setEditingId(null);
    setDraftPrice('');
    setDraftSupplier('');
    setDraftUnit('sqm');
    
    // Remove temp rows when canceling
    setRows(prev => prev.filter(row => !row.pricing_id.startsWith('temp-')));
  };

  const formatPricingUnit = (unit: string) => {
    const unitLabels: Record<string, string> = {
      sqm: 'per m²',
      linear_meter: 'per linear meter',
      sheet: 'per sheet',
      roll: 'per roll',
      kg: 'per kg'
    };
    return unitLabels[unit] || unit;
  };

  // Handle key press for better UX
  const handleKeyPress = (e: React.KeyboardEvent, rowId: string) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      saveRow(rowId);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      cancelEditing();
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Supplier Pricing</h3>
        <Button 
          onClick={addNewPricing} 
          variant="outline"
          disabled={loading || saving || !!editingId}
        >
          + Add Pricing
        </Button>
      </div>

      <div className="text-sm text-gray-600">
        Click on a supplier name to edit pricing details. Press Enter to save, Escape to cancel.
      </div>

      <div className="border rounded-md overflow-hidden bg-white">
        <div className="grid grid-cols-5 gap-2 bg-gray-50 p-3 text-sm font-medium border-b">
          <div>Supplier</div>
          <div>Cost (AUD)</div>
          <div>Unit</div>
          <div>Preferred</div>
          <div>Actions</div>
        </div>

        {loading ? (
          <div className="p-8 text-center text-gray-500">
            <div className="animate-pulse">Loading pricing data...</div>
          </div>
        ) : rows.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <div className="mb-3">No supplier pricing configured yet.</div>
            <Button onClick={addNewPricing} variant="outline" size="sm">
              Add First Pricing Entry
            </Button>
          </div>
        ) : (
          <div className="divide-y">
            {rows.map((row) => (
              <div 
                key={row.pricing_id} 
                className={`grid grid-cols-5 gap-2 p-3 items-center text-sm transition-colors ${
                  editingId === row.pricing_id ? 'bg-gray-50' : 'hover:bg-gray-50'
                }`}
              >
                {/* Supplier */}
                <div>
                  {editingId === row.pricing_id ? (
                    <select 
                      value={draftSupplier} 
                      onChange={(e) => setDraftSupplier(e.target.value)} 
                      onKeyDown={(e) => handleKeyPress(e, row.pricing_id)}
                      className="w-full px-2 py-1 border rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      disabled={saving}
                    >
                      <option value="">(No supplier)</option>
                      {suppliers.map(supplier => (
                        <option key={supplier.supplier_id} value={supplier.supplier_id}>
                          {supplier.supplier_name || supplier.supplier_id}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <button 
                      className="text-blue-600 hover:text-blue-800 underline text-left w-full text-sm"
                      onClick={() => startEditing(row)}
                      disabled={!!editingId || saving}
                    >
                      {row.supplier_name || row.supplier_id || '(No supplier)'}
                    </button>
                  )}
                </div>

                {/* Cost */}
                <div>
                  {editingId === row.pricing_id ? (
                    <Input 
                      type="number"
                      step="0.01"
                      min="0"
                      value={draftPrice} 
                      onChange={(e) => setDraftPrice(e.target.value)}
                      onKeyDown={(e) => handleKeyPress(e, row.pricing_id)}
                      placeholder="0.00"
                      className="w-full text-sm"
                      disabled={saving}
                    />
                  ) : (
                    <span className="font-mono">
                      ${Number(row.cost_per_unit || 0).toFixed(2)}
                    </span>
                  )}
                </div>

                {/* Unit */}
                <div>
                  {editingId === row.pricing_id ? (
                    <select 
                      value={draftUnit} 
                      onChange={(e) => setDraftUnit(e.target.value)} 
                      onKeyDown={(e) => handleKeyPress(e, row.pricing_id)}
                      className="w-full px-2 py-1 border rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      disabled={saving}
                    >
                      {(fieldOptions?.pricing_units || ['sqm']).map(unit => (
                        <option key={unit} value={unit}>
                          {formatPricingUnit(unit)}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <span className="text-gray-600 text-sm">
                      {formatPricingUnit(row.pricing_unit)}
                    </span>
                  )}
                </div>

                {/* Preferred */}
                <div>
                  {row.is_preferred_supplier && (
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      ⭐ Preferred
                    </span>
                  )}
                </div>

                {/* Actions */}
                <div className="flex gap-1">
                  {editingId === row.pricing_id ? (
                    <>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => saveRow(row.pricing_id)}
                        disabled={saving}
                        className="text-xs px-2"
                      >
                        {saving ? 'Saving...' : 'Save'}
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={cancelEditing}
                        disabled={saving}
                        className="text-xs px-2"
                      >
                        Cancel
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => startEditing(row)}
                        disabled={!!editingId || saving}
                        className="text-xs px-2"
                      >
                        Edit
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => deleteRow(row.pricing_id)}
                        disabled={!!editingId || saving}
                        className="text-red-600 hover:text-red-700 text-xs px-2"
                      >
                        Delete
                      </Button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {rows.length > 0 && (
        <div className="text-sm text-gray-500">
          Total pricing entries: {rows.filter(row => !row.pricing_id.startsWith('temp-')).length}
          {editingId && editingId.startsWith('temp-') && ' (1 unsaved)'}
        </div>
      )}
    </div>
  );
}