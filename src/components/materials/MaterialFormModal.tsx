import React, { useState, useEffect } from "react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { apiCall } from "../../config/api";
import type { Material, MaterialFormData, MaterialFieldOptions } from "../../types/materials";
import { SupplierPricingEditor } from "./SupplierPricingEditor";
import { Textarea } from "../ui/textarea";

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
  const scrollPositionRef = React.useRef<number>(0);
  const [modalTopPosition, setModalTopPosition] = useState<number>(0);

  // Initialize form data when material prop changes
  useEffect(() => {
    if (material) {
      const newFormData = {
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
      };
      setFormData(newFormData);
    } else {
      setFormData(initialFormData);
    }
  }, [material]);

  // Handle modal scroll position preservation
  useEffect(() => {
    if (isOpen) {
      // Save current scroll position
      scrollPositionRef.current = window.pageYOffset;
      // Calculate modal position relative to current scroll (add 20px offset from top of visible area)
      setModalTopPosition(scrollPositionRef.current + 20);
      // Prevent body scrolling while modal is open
      document.body.style.overflow = 'hidden';
    } else {
      // Restore body scrolling and scroll position when modal closes
      document.body.style.overflow = '';
      // Small delay to ensure modal is fully closed before restoring scroll
      setTimeout(() => {
        window.scrollTo(0, scrollPositionRef.current);
      }, 50);
    }
    
    return () => {
      // Cleanup: always restore scrolling when component unmounts
      document.body.style.overflow = '';
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
    <div className="fixed inset-0 bg-black/50 z-[9999]">
      <div 
        className="absolute left-1/2 transform -translate-x-1/2 bg-white rounded-lg shadow-xl w-full max-w-7xl max-h-[90vh] overflow-hidden mx-4"
        style={{ top: `${modalTopPosition}px` }}
      >
        {/* Header with Subtabs */}
        <div className="px-6 py-4 border-b bg-white">
          <div className="flex items-center justify-between mb-4">
            <div className="flex space-x-6">
              <button
                onClick={() => setSubTab('details')}
                className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                  subTab === 'details'
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
              >
                Material
              </button>
              <button
                onClick={() => {
                  setSubTab('suppliers');
                }}
                className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                  subTab === 'suppliers'
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
              >
                Supplier
              </button>
              <button
                onClick={() => setSubTab('history')}
                className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                  subTab === 'history'
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
              >
                History
              </button>
            </div>
            <button
              onClick={handleClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
          {subTab === 'details' && (
            <form onSubmit={handleSubmit}>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              {/* Row 1: Basic Information */}
              <div className="col-span-2">
                <Label htmlFor="material_name" className="font-medium text-sm text-gray-900 block mb-2">Material Name</Label>
                <Input
                  id="material_name"
                  value={formData.material_name}
                  onChange={(e) => setFormData(prev => ({ ...prev, material_name: e.target.value }))}
                  className="w-full bg-gray-50 border border-gray-300"
                  placeholder="Enter material name"
                />
              </div>

              <div>
                <Label htmlFor="material_code" className="font-medium text-sm text-gray-900 block mb-2">Material Code</Label>
                <Input
                  id="material_code"
                  value={formData.material_code}
                  onChange={(e) => setFormData(prev => ({ ...prev, material_code: e.target.value }))}
                  className="w-full bg-gray-50 border border-gray-300"
                  placeholder="Enter material code"
                />
              </div>

              <div>
                <Label htmlFor="substrate_type" className="font-medium text-sm text-gray-900 block mb-2">Substrate Type</Label>
                <Select key={`substrate_type_${formData.substrate_type}`} value={formData.substrate_type} onValueChange={(value) => setFormData(prev => ({ ...prev, substrate_type: value }))}>
                  <SelectTrigger className="w-full bg-gray-50 border border-gray-300">
                    <SelectValue placeholder="Select substrate type" />
                  </SelectTrigger>
                  <SelectContent className="z-[10002]">
                    {(fieldOptions?.substrate_types || []).map(type => (
                      <SelectItem key={type} value={type}>{type}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="substrate_group" className="font-medium text-sm text-gray-900 block mb-2">Substrate Group</Label>
                <Select key={`substrate_group_${formData.substrate_group}`} value={formData.substrate_group} onValueChange={(value) => setFormData(prev => ({ ...prev, substrate_group: value }))}>
                  <SelectTrigger className="w-full bg-gray-50 border border-gray-300">
                    <SelectValue placeholder="Select substrate group" />
                  </SelectTrigger>
                  <SelectContent className="z-[10002]">
                    {(fieldOptions?.substrate_groups || []).map(group => (
                      <SelectItem key={group} value={group}>{group}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="adhesive_type" className="font-medium text-sm text-gray-900 block mb-2">Adhesive Type</Label>
                <Select key={`adhesive_type_${formData.adhesive_type}`} value={formData.adhesive_type} onValueChange={(value) => setFormData(prev => ({ ...prev, adhesive_type: value }))}>
                  <SelectTrigger className="w-full bg-gray-50 border border-gray-300">
                    <SelectValue placeholder="Select adhesive type" />
                  </SelectTrigger>
                  <SelectContent className="z-[10002]">
                    {(fieldOptions?.adhesive_types || []).map(type => (
                      <SelectItem key={type} value={type}>{type}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Row Separator */}
              <div className="col-span-6 border-t border-gray-200 my-4"></div>

              {/* Row 2: Physical Properties */}
              <div>
                <Label htmlFor="weight_gsm" className="font-medium text-sm text-gray-900 block mb-2">Weight (GSM)</Label>
                <Input
                  id="weight_gsm"
                  type="number"
                  value={formData.weight_gsm}
                  onChange={(e) => setFormData(prev => ({ ...prev, weight_gsm: parseFloat(e.target.value) || 0 }))}
                  className="w-full bg-gray-50 border border-gray-300"
                  placeholder="Enter weight in GSM"
                />
              </div>

              <div>
                <Label htmlFor="width_mm" className="font-medium text-sm text-gray-900 block mb-2">Width (mm)</Label>
                <Input
                  id="width_mm"
                  type="number"
                  value={formData.width_mm}
                  onChange={(e) => setFormData(prev => ({ ...prev, width_mm: parseFloat(e.target.value) || 0 }))}
                  className="w-full bg-gray-50 border border-gray-300"
                  placeholder="Enter width in mm"
                />
              </div>

              <div>
                <Label htmlFor="length_mm" className="font-medium text-sm text-gray-900 block mb-2">Length (mm)</Label>
                <Input
                  id="length_mm"
                  type="number"
                  value={formData.length_mm}
                  onChange={(e) => setFormData(prev => ({ ...prev, length_mm: parseFloat(e.target.value) || 0 }))}
                  className="w-full bg-gray-50 border border-gray-300"
                  placeholder="Enter length in mm"
                />
              </div>

              <div>
                <Label htmlFor="coating" className="font-medium text-sm text-gray-900 block mb-2">Coating</Label>
                <Select key={`coating_${formData.coating}`} value={formData.coating} onValueChange={(value) => setFormData(prev => ({ ...prev, coating: value }))}>
                  <SelectTrigger className="w-full bg-gray-50 border border-gray-300">
                    <SelectValue placeholder="Select coating type" />
                  </SelectTrigger>
                  <SelectContent className="z-[10002]">
                    {(fieldOptions?.coating_types || []).map(type => (
                      <SelectItem key={type} value={type}>{type}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="handling" className="font-medium text-sm text-gray-900 block mb-2">Handling</Label>
                <Select key={`handling_${formData.handling}`} value={formData.handling} onValueChange={(value) => setFormData(prev => ({ ...prev, handling: value }))}>
                  <SelectTrigger className="w-full bg-gray-50 border border-gray-300">
                    <SelectValue placeholder="Select handling type" />
                  </SelectTrigger>
                  <SelectContent className="z-[10002]">
                    {(fieldOptions?.handling_types || []).map(type => (
                      <SelectItem key={type} value={type}>{type}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="pricing_unit" className="font-medium text-sm text-gray-900 block mb-2">Pricing Unit</Label>
                <Select key={`pricing_unit_${formData.pricing_unit}`} value={formData.pricing_unit} onValueChange={(value) => setFormData(prev => ({ ...prev, pricing_unit: value }))}>
                  <SelectTrigger className="w-full bg-gray-50 border border-gray-300">
                    <SelectValue placeholder="Select pricing unit" />
                  </SelectTrigger>
                  <SelectContent className="z-[10002]">
                    {(fieldOptions?.pricing_units || []).map(unit => (
                      <SelectItem key={unit} value={unit}>{unit}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Row Separator */}
              <div className="col-span-6 border-t border-gray-200 my-4"></div>

              {/* Row 3: Additional Properties */}
              <div>
                <Label htmlFor="grain_direction" className="font-medium text-sm text-gray-900 block mb-2">Grain Direction</Label>
                <Input
                  id="grain_direction"
                  value={formData.grain_direction}
                  onChange={(e) => setFormData(prev => ({ ...prev, grain_direction: e.target.value }))}
                  className="w-full bg-gray-50 border border-gray-300"
                  placeholder="Enter grain direction"
                />
              </div>

              <div>
                <Label htmlFor="glossy_level" className="font-medium text-sm text-gray-900 block mb-2">Glossy Level</Label>
                <Input
                  id="glossy_level"
                  value={formData.glossy_level}
                  onChange={(e) => setFormData(prev => ({ ...prev, glossy_level: e.target.value }))}
                  className="w-full bg-gray-50 border border-gray-300"
                  placeholder="Enter glossy level"
                />
              </div>

              <div>
                <Label htmlFor="conductive" className="font-medium text-sm text-gray-900 block mb-2">Conductive</Label>
                <Select key={`conductive_${formData.conductive}`} value={formData.conductive.toString()} onValueChange={(value) => setFormData(prev => ({ ...prev, conductive: value === 'true' }))}>
                  <SelectTrigger className="w-full bg-gray-50 border border-gray-300">
                    <SelectValue placeholder="Select conductivity" />
                  </SelectTrigger>
                  <SelectContent className="z-[10002]">
                    <SelectItem value="true">Yes</SelectItem>
                    <SelectItem value="false">No</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="white_material" className="font-medium text-sm text-gray-900 block mb-2">White Material</Label>
                <Select key={`white_material_${formData.white_material}`} value={formData.white_material.toString()} onValueChange={(value) => setFormData(prev => ({ ...prev, white_material: value === 'true' }))}>
                  <SelectTrigger className="w-full bg-gray-50 border border-gray-300">
                    <SelectValue placeholder="Select white material" />
                  </SelectTrigger>
                  <SelectContent className="z-[10002]">
                    <SelectItem value="true">Yes</SelectItem>
                    <SelectItem value="false">No</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="cost_aud" className="font-medium text-sm text-gray-900 block mb-2">Cost (AUD)</Label>
                <Input
                  id="cost_aud"
                  type="number"
                  step="0.01"
                  value={formData.cost_aud}
                  onChange={(e) => setFormData(prev => ({ ...prev, cost_aud: parseFloat(e.target.value) || 0 }))}
                  className="w-full bg-gray-50 border border-gray-300"
                  placeholder="Enter cost in AUD"
                />
              </div>

              <div>
                <Label htmlFor="stock" className="font-medium text-sm text-gray-900 block mb-2">Stock</Label>
                <Input
                  id="stock"
                  type="number"
                  value={formData.stock}
                  onChange={(e) => setFormData(prev => ({ ...prev, stock: parseFloat(e.target.value) || 0 }))}
                  className="w-full bg-gray-50 border border-gray-300"
                  placeholder="Enter stock quantity"
                />
              </div>

              {/* Row Separator */}
              <div className="col-span-6 border-t border-gray-200 my-4"></div>

              {/* Row 4: Final Properties */}
              <div>
                <Label htmlFor="reorder_level" className="font-medium text-sm text-gray-900 block mb-2">Reorder Level</Label>
                <Input
                  id="reorder_level"
                  type="number"
                  value={formData.reorder_level}
                  onChange={(e) => setFormData(prev => ({ ...prev, reorder_level: parseInt(e.target.value) || 0 }))}
                  className="w-full bg-gray-50 border border-gray-300"
                  placeholder="Enter reorder level"
                />
              </div>

              <div>
                <Label htmlFor="lead_time_days" className="font-medium text-sm text-gray-900 block mb-2">Lead Time (Days)</Label>
                <Input
                  id="lead_time_days"
                  type="number"
                  value={formData.lead_time_days}
                  onChange={(e) => setFormData(prev => ({ ...prev, lead_time_days: parseInt(e.target.value) || 0 }))}
                  className="w-full bg-gray-50 border border-gray-300"
                  placeholder="Enter lead time in days"
                />
              </div>

              <div className="col-span-4">
                <Label htmlFor="aliases" className="font-medium text-sm text-gray-900 block mb-2">Aliases</Label>
                <Textarea
                  id="aliases"
                  value={formData.aliases}
                  onChange={(e) => setFormData(prev => ({ ...prev, aliases: e.target.value }))}
                  className="w-full bg-gray-50 border border-gray-300"
                  placeholder="Enter aliases (comma-separated)"
                  rows={3}
                />
              </div>
            </div>

                          {/* Actions */}
              <div className="flex justify-end gap-3 mt-6 pt-4 border-t">
                <Button type="button" variant="outline" onClick={handleClose}>
                  Cancel
                </Button>
                <Button type="submit">
                  {material ? 'Update Material' : 'Add Material'}
                </Button>
              </div>
            </form>
          )}

          {subTab === 'suppliers' && material && (
            <div className="text-center py-8">
              <SupplierPricingEditor 
                materialId={material.material_id}
                fieldOptions={fieldOptions}
              />
            </div>
          )}

          {subTab === 'history' && (
            <div className="text-center py-8">
              <div className="text-gray-500">
                <svg className="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <h3 className="text-lg font-medium text-gray-900 mb-2">Material History</h3>
                <p className="text-gray-600">Material change history will be displayed here.</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
