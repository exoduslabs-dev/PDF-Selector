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
    <div className="fixed inset-0 bg-black/50 z-[9999] flex items-start justify-center p-1 pt-0">
      <div className="w-full max-w-[95vw] h-[calc(100vh-0.25rem)] bg-white shadow-2xl rounded-lg flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b flex-shrink-0 bg-white">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900">
              {material ? 'Edit Material' : 'Add New Material'}
            </h2>
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
        <div className="flex-1 min-h-0 bg-white">
          <form onSubmit={handleSubmit} className="h-full flex flex-col">
            <div className="flex-1 overflow-y-auto p-6 bg-white min-h-0">
                              <div className="grid grid-cols-4 gap-x-8 gap-y-4 max-w-none">
                 {/* Column 1 */}
                 <div className="space-y-4">
                   <div>
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
                 </div>

                 {/* Column 2 */}
                 <div className="space-y-4">
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
                     <Label htmlFor="grain_direction" className="font-medium text-sm text-gray-900 block mb-2">Grain Direction</Label>
                     <Select key={`grain_direction_${formData.grain_direction}`} value={formData.grain_direction} onValueChange={(value) => setFormData(prev => ({ ...prev, grain_direction: value }))}>
                       <SelectTrigger className="w-full bg-gray-50 border border-gray-300">
                         <SelectValue placeholder="Select grain direction" />
                       </SelectTrigger>
                       <SelectContent className="z-[10002]">
                         <SelectItem value="long">Long</SelectItem>
                         <SelectItem value="short">Short</SelectItem>
                         <SelectItem value="none">None</SelectItem>
                       </SelectContent>
                     </Select>
                   </div>
                 </div>

                 {/* Column 3 */}
                 <div className="space-y-4">
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
                     <Label htmlFor="glossy_level" className="font-medium text-sm text-gray-900 block mb-2">Glossy Level</Label>
                     <Select key={`glossy_level_${formData.glossy_level}`} value={formData.glossy_level} onValueChange={(value) => setFormData(prev => ({ ...prev, glossy_level: value }))}>
                       <SelectTrigger className="w-full bg-gray-50 border border-gray-300">
                         <SelectValue placeholder="Select glossy level" />
                       </SelectTrigger>
                       <SelectContent className="z-[10002]">
                         <SelectItem value="low">Low</SelectItem>
                         <SelectItem value="medium">Medium</SelectItem>
                         <SelectItem value="high">High</SelectItem>
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
                     <Label htmlFor="stock" className="font-medium text-sm text-gray-900 block mb-2">Stock</Label>
                     <Input
                       id="stock"
                       type="number"
                       value={formData.stock}
                       onChange={(e) => setFormData(prev => ({ ...prev, stock: parseInt(e.target.value) || 0 }))}
                       className="w-full bg-gray-50 border border-gray-300"
                       placeholder="Enter stock quantity"
                     />
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
                 </div>

                 {/* Column 4 */}
                 <div className="space-y-4">
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

                   <div>
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
               </div>
            </div>

            {/* Actions */}
            <div className="px-6 py-4 border-t flex-shrink-0 bg-white">
              <div className="flex justify-end gap-3">
                <Button type="button" variant="outline" onClick={handleClose}>
                  Cancel
                </Button>
                <Button type="submit">
                  {material ? 'Update Material' : 'Add Material'}
                </Button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
