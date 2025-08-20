import React, { useState, useEffect } from "react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { apiCall } from "../../config/api";
import type { Material, MaterialFormData, MaterialFieldOptions } from "../../types/materials";
import { SupplierPricingEditor } from "./SupplierPricingEditor";

interface MaterialFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  material?: Material | null;
  fieldOptions: MaterialFieldOptions;
  onSave: () => void;
}

type SubTab = 'details' | 'suppliers' | 'history';

const initialFormData: MaterialFormData = {
  material_code: '',
  material_name: '',
  substrate_type: '',
  substrate_group: '',
  adhesive_type: '',
  handling: '',
  weight_gsm: 80,
  width_mm: 1000,
  length_mm: 1000,
  coating: '',
  grain_direction: '',
  glossy_level: '',
  conductive: false,
  white_material: false,
  cost_aud: 0,
  stock: 0,
  reorder_level: 10,
  lead_time_days: 7,
  pricing_unit: 'sqm',
  aliases: ''
};

export function MaterialFormModal({ 
  isOpen, 
  onClose, 
  material, 
  fieldOptions, 
  onSave 
}: MaterialFormModalProps) {
  const [formData, setFormData] = useState<MaterialFormData>(initialFormData);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [subTab, setSubTab] = useState<SubTab>('details');
  const modalRef = React.useRef<HTMLDivElement>(null);

  // Initialize form data when material prop changes
  useEffect(() => {
    if (material) {
      setFormData({
        material_code: material.material_code || '',
        material_name: material.material_name || '',
        substrate_type: material.substrate_type || '',
        substrate_group: material.substrate_group || '',
        adhesive_type: material.adhesive_type || '',
        handling: material.handling || '',
        weight_gsm: material.weight_gsm || 80,
        width_mm: Number(material.width_mm) || 1000,
        length_mm: Number(material.length_mm) || 1000,
        coating: material.coating || '',
        grain_direction: material.grain_direction || '',
        glossy_level: material.glossy_level || '',
        conductive: material.conductive || false,
        white_material: material.white_material || false,
        cost_aud: Number(material.cost_aud) || 0,
        stock: Number(material.stock) || 0,
        reorder_level: Number(material.reorder_level) || 10,
        lead_time_days: Number(material.lead_time_days) || 7,
        pricing_unit: material.pricing_unit || 'sqm',
        aliases: material.aliases || ''
      });
    } else {
      setFormData(initialFormData);
    }
  }, [material]);

  // Handle modal scroll position preservation
  useEffect(() => {
    let scrollY = 0;
    
    if (isOpen) {
      scrollY = window.pageYOffset;
      document.body.style.overflow = 'hidden';
      document.body.style.position = 'fixed';
      document.body.style.top = `-${scrollY}px`;
      document.body.style.left = '0';
      document.body.style.right = '0';
      document.body.style.width = '100%';
      
      // Scroll modal to top
      setTimeout(() => {
        if (modalRef.current) {
          modalRef.current.scrollTo({ top: 0, behavior: 'auto' });
        }
      }, 0);
    }
    
    return () => {
      if (!isOpen) {
        document.body.style.position = '';
        document.body.style.top = '';
        document.body.style.left = '';
        document.body.style.right = '';
        document.body.style.width = '';
        document.body.style.overflow = '';
        window.scrollTo(0, scrollY);
      }
    };
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.material_name.trim()) {
      alert('Material name is required');
      return;
    }

    try {
      setIsSubmitting(true);
      const url = material ? `/api/materials/${material.material_id}` : '/api/materials';
      const method = material ? 'PUT' : 'POST';
      
      const response = await apiCall(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        onSave();
        onClose();
      } else {
        const errorData = await response.json();
        alert(`Failed to save material: ${errorData.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Failed to save material:', error);
      alert('Failed to save material');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setSubTab('details');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-start justify-center">
      <div className="w-full max-w-6xl h-full bg-white overflow-y-auto shadow-2xl" ref={modalRef}>
        <div className="px-6 py-4">
          {/* Header with sub-tabs and close button */}
          <div className="flex items-center justify-between border-b pb-3 mb-6">
            <div className="flex gap-1">
              {[
                { key: 'details', label: 'Material Details' },
                { key: 'suppliers', label: 'Supplier Pricing' },
                { key: 'history', label: 'Material History' },
              ].map(tab => (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setSubTab(tab.key as SubTab)}
                  className={`px-4 py-2 text-sm border-b-2 transition-colors ${
                    subTab === tab.key 
                      ? 'border-blue-600 text-blue-700 font-medium' 
                      : 'border-transparent text-gray-600 hover:text-gray-800'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={handleClose}
              className="text-gray-400 hover:text-gray-600 p-2 hover:bg-gray-100 rounded-full transition-colors"
              title="Close"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Material Details Tab */}
          {subTab === 'details' && (
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Basic Information */}
              <div>
                <h3 className="text-lg font-semibold mb-3">Basic Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="material_code">Material Code</Label>
                    <Input
                      id="material_code"
                      value={formData.material_code}
                      readOnly
                      placeholder="Auto-generated on save"
                      className="bg-gray-50"
                    />
                  </div>
                  <div>
                    <Label htmlFor="material_name">Material Name *</Label>
                    <Input
                      id="material_name"
                      value={formData.material_name}
                      onChange={(e) => setFormData(prev => ({ ...prev, material_name: e.target.value }))}
                      placeholder="e.g., Semi Gloss Paper"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="aliases">Aliases</Label>
                    <Input
                      id="aliases"
                      value={formData.aliases}
                      onChange={(e) => setFormData(prev => ({ ...prev, aliases: e.target.value }))}
                      placeholder="Alternative names, separated by commas"
                    />
                  </div>
                  <div>
                    <Label htmlFor="substrate_group">Substrate Group</Label>
                    <Input
                      id="substrate_group"
                      value={formData.substrate_group}
                      onChange={(e) => setFormData(prev => ({ ...prev, substrate_group: e.target.value }))}
                      placeholder="e.g., label_rolls"
                    />
                  </div>
                </div>
              </div>

              {/* Material Properties */}
              <div>
                <h3 className="text-lg font-semibold mb-3">Material Properties</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="substrate_type">Substrate Type</Label>
                    <Select
                      value={formData.substrate_type}
                      onValueChange={(value) => setFormData(prev => ({ ...prev, substrate_type: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select substrate type" />
                      </SelectTrigger>
                      <SelectContent>
                        {fieldOptions.substrate_types.map(type => (
                          <SelectItem key={type} value={type}>{type}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="adhesive_type">Adhesive Type</Label>
                    <Select
                      value={formData.adhesive_type}
                      onValueChange={(value) => setFormData(prev => ({ ...prev, adhesive_type: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select adhesive type" />
                      </SelectTrigger>
                      <SelectContent>
                        {fieldOptions.adhesive_types.map(type => (
                          <SelectItem key={type} value={type}>{type}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="handling">Handling</Label>
                    <Select
                      value={formData.handling}
                      onValueChange={(value) => setFormData(prev => ({ ...prev, handling: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select handling type" />
                      </SelectTrigger>
                      <SelectContent>
                        {fieldOptions.handling_types.map(type => (
                          <SelectItem key={type} value={type}>{type}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* Physical Properties */}
              <div>
                <h3 className="text-lg font-semibold mb-3">Physical Properties</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div>
                    <Label htmlFor="weight_gsm">Weight (GSM)</Label>
                    <Input
                      id="weight_gsm"
                      type="number"
                      value={formData.weight_gsm}
                      onChange={(e) => setFormData(prev => ({ ...prev, weight_gsm: Number(e.target.value) }))}
                      min="0"
                    />
                  </div>
                  <div>
                    <Label htmlFor="width_mm">Width (mm)</Label>
                    <Input
                      id="width_mm"
                      type="number"
                      value={formData.width_mm}
                      onChange={(e) => setFormData(prev => ({ ...prev, width_mm: Number(e.target.value) }))}
                      min="0"
                      step="0.01"
                    />
                  </div>
                  <div>
                    <Label htmlFor="length_mm">Length (mm)</Label>
                    <Input
                      id="length_mm"
                      type="number"
                      value={formData.length_mm}
                      onChange={(e) => setFormData(prev => ({ ...prev, length_mm: Number(e.target.value) }))}
                      min="0"
                      step="0.01"
                    />
                  </div>
                  <div>
                    <Label htmlFor="coating">Coating</Label>
                    <Select
                      value={formData.coating}
                      onValueChange={(value) => setFormData(prev => ({ ...prev, coating: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select coating" />
                      </SelectTrigger>
                      <SelectContent>
                        {fieldOptions.coating_types.map(type => (
                          <SelectItem key={type} value={type}>{type}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* Additional Properties */}
              <div>
                <h3 className="text-lg font-semibold mb-3">Additional Properties</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="grain_direction">Grain Direction</Label>
                    <Input
                      id="grain_direction"
                      value={formData.grain_direction}
                      onChange={(e) => setFormData(prev => ({ ...prev, grain_direction: e.target.value }))}
                      placeholder="e.g., long, short"
                    />
                  </div>
                  <div>
                    <Label htmlFor="glossy_level">Glossy Level</Label>
                    <Input
                      id="glossy_level"
                      value={formData.glossy_level}
                      onChange={(e) => setFormData(prev => ({ ...prev, glossy_level: e.target.value }))}
                      placeholder="e.g., high, medium, low"
                    />
                  </div>
                </div>
                
                <div className="flex gap-6 mt-4">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={formData.conductive}
                      onChange={(e) => setFormData(prev => ({ ...prev, conductive: e.target.checked }))}
                      className="rounded border-gray-300"
                    />
                    <span className="text-sm">Conductive</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={formData.white_material}
                      onChange={(e) => setFormData(prev => ({ ...prev, white_material: e.target.checked }))}
                      className="rounded border-gray-300"
                    />
                    <span className="text-sm">White Material</span>
                  </label>
                </div>
              </div>

              {/* Pricing and Stock */}
              <div>
                <h3 className="text-lg font-semibold mb-3">Pricing & Stock</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div>
                    <Label htmlFor="cost_aud">Legacy Cost (AUD)</Label>
                    <Input
                      id="cost_aud"
                      type="number"
                      value={formData.cost_aud}
                      onChange={(e) => setFormData(prev => ({ ...prev, cost_aud: Number(e.target.value) }))}
                      min="0"
                      step="0.01"
                    />
                  </div>
                  <div>
                    <Label htmlFor="pricing_unit">Pricing Unit</Label>
                    <Select
                      value={formData.pricing_unit}
                      onValueChange={(value) => setFormData(prev => ({ ...prev, pricing_unit: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select pricing unit" />
                      </SelectTrigger>
                      <SelectContent>
                        {fieldOptions.pricing_units.map(unit => (
                          <SelectItem key={unit} value={unit}>{unit}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="stock">Current Stock</Label>
                    <Input
                      id="stock"
                      type="number"
                      value={formData.stock}
                      onChange={(e) => setFormData(prev => ({ ...prev, stock: Number(e.target.value) }))}
                      min="0"
                      step="0.01"
                    />
                  </div>
                  <div>
                    <Label htmlFor="reorder_level">Reorder Level</Label>
                    <Input
                      id="reorder_level"
                      type="number"
                      value={formData.reorder_level}
                      onChange={(e) => setFormData(prev => ({ ...prev, reorder_level: Number(e.target.value) }))}
                      min="0"
                      step="0.01"
                    />
                  </div>
                </div>
                <div className="mt-4">
                  <Label htmlFor="lead_time_days">Lead Time (Days)</Label>
                  <Input
                    id="lead_time_days"
                    type="number"
                    value={formData.lead_time_days}
                    onChange={(e) => setFormData(prev => ({ ...prev, lead_time_days: Number(e.target.value) }))}
                    min="0"
                    className="w-32"
                  />
                </div>
              </div>

              {/* Form Actions */}
              <div className="flex justify-end gap-3 pt-4 border-t">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleClose}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmitting || !formData.material_name.trim()}
                >
                  {isSubmitting ? 'Saving...' : material ? 'Update Material' : 'Create Material'}
                </Button>
              </div>
            </form>
          )}

          {/* Supplier Pricing Tab */}
          {subTab === 'suppliers' && material && (
            <SupplierPricingEditor
              materialId={material.material_id}
              fieldOptions={fieldOptions}
            />
          )}

          {/* Material History Tab */}
          {subTab === 'history' && (
            <div className="text-center py-8 text-gray-500">
              <div className="text-lg font-medium mb-2">Material History</div>
              <div className="text-sm">Feature coming soon - track material changes and usage over time</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
