// filepath: /Users/Shared/Next-Printing/Resources/PDF Selector /src/pages/MaterialsPage.tsx
import React, { useEffect, useState, useCallback } from "react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { apiCall } from "../config/api";

interface Material {
  material_id: string;
  material_code: string;
  material_name: string;
  substrate_type: string;
  adhesive_type: string;
  handling: string;
  weight_gsm: number;
  width_mm: number;
  length_mm: number;
  coating: string;
  grain_direction: string;
  glossy_level: string;
  conductive: boolean;
  white_material: boolean;
  cost_aud: number;
  stock: number;
  reorder_level: number;
  lead_time_days: number;
  pricing_unit: string;
  aliases: string;
}

interface Supplier {
  supplier_id: string;
  supplier_code: string;
  supplier_name: string;
  contact_person: string;
  email: string;
  phone: string;
  payment_terms: string;
  lead_time_days: number;
  is_active: boolean;
}

interface MaterialFormData {
  material_code: string;
  material_name: string;
  substrate_type: string;
  adhesive_type: string;
  handling: string;
  weight_gsm: number;
  width_mm: number;
  length_mm: number;
  coating: string;
  grain_direction: string;
  glossy_level: string;
  conductive: boolean;
  white_material: boolean;
  cost_aud: number;
  stock: number;
  reorder_level: number;
  lead_time_days: number;
  pricing_unit: string;
  aliases: string;
}

export function MaterialsPage() {
  const [materials, setMaterials] = useState<Material[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState<string>("all");
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // Modal and form state
  const [showModal, setShowModal] = useState(false);
  const [editingMaterial, setEditingMaterial] = useState<Material | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState<MaterialFormData>({
    material_code: "",
    material_name: "",
    substrate_type: "paper",
    adhesive_type: "permanent",
    handling: "hand_applied",
    weight_gsm: 80,
    width_mm: 1000,
    length_mm: 1000,
    coating: "matte",
    grain_direction: "",
    glossy_level: "",
    conductive: false,
    white_material: false,
    cost_aud: 0,
    stock: 0,
    reorder_level: 10,
    lead_time_days: 7,
    pricing_unit: "sqm",
    aliases: ""
  });

  const loadMaterials = useCallback(async () => {
    try {
      setIsRefreshing(true);
      const response = await apiCall('/api/materials');
      if (response.ok) {
        const data = await response.json();
        setMaterials(data.materials || []);
        setError(null);
      } else {
        throw new Error(`Failed to load materials: ${response.status}`);
      }
    } catch (err) {
      console.error('Error loading materials:', err);
      setError(err instanceof Error ? err.message : 'Failed to load materials');
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  const importMaterialsFromJobs = useCallback(async () => {
    try {
      setIsRefreshing(true);
      const response = await apiCall('/api/import-materials-from-jobs', {
        method: 'POST'
      });
      if (response.ok) {
        const data = await response.json();
        alert(`Successfully imported ${data.imported} new materials from job lines`);
        await loadMaterials();
      } else {
        throw new Error(`Failed to import materials: ${response.status}`);
      }
    } catch (err) {
      console.error('Error importing materials:', err);
      alert('Failed to import materials from job lines');
    } finally {
      setIsRefreshing(false);
    }
  }, [loadMaterials]);

  const openAddModal = useCallback(() => {
    setEditingMaterial(null);
    setFormData({
      material_code: "",
      material_name: "",
      substrate_type: "paper",
      adhesive_type: "permanent", 
      handling: "hand_applied",
      weight_gsm: 80,
      width_mm: 1000,
      length_mm: 1000,
      coating: "matte",
      grain_direction: "",
      glossy_level: "",
      conductive: false,
      white_material: false,
      cost_aud: 0,
      stock: 0,
      reorder_level: 10,
      lead_time_days: 7,
      pricing_unit: "sqm",
      aliases: ""
    });
    setShowModal(true);
  }, []);

  const openEditModal = useCallback((material: Material) => {
    setEditingMaterial(material);
    setFormData({
      material_code: material.material_code || "",
      material_name: material.material_name || "",
      substrate_type: material.substrate_type || "paper",
      adhesive_type: material.adhesive_type || "permanent",
      handling: material.handling || "hand_applied",
      weight_gsm: material.weight_gsm || 80,
      width_mm: material.width_mm || 1000,
      length_mm: material.length_mm || 1000,
      coating: material.coating || "matte",
      grain_direction: material.grain_direction || "",
      glossy_level: material.glossy_level || "",
      conductive: material.conductive || false,
      white_material: material.white_material || false,
      cost_aud: material.cost_aud || 0,
      stock: material.stock || 0,
      reorder_level: material.reorder_level || 10,
      lead_time_days: material.lead_time_days || 7,
      pricing_unit: material.pricing_unit || "sqm",
      aliases: material.aliases || ""
    });
    setShowModal(true);
  }, []);

  const closeModal = useCallback(() => {
    setShowModal(false);
    setEditingMaterial(null);
  }, []);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.material_name.trim()) {
      alert('Material name is required');
      return;
    }

    try {
      setIsSubmitting(true);
      const url = editingMaterial ? `/api/materials/${editingMaterial.material_id}` : '/api/materials';
      const method = editingMaterial ? 'PUT' : 'POST';
      
      const response = await apiCall(url, {
        method,
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        await loadMaterials();
        closeModal();
        alert(editingMaterial ? 'Material updated successfully' : 'Material created successfully');
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save material');
      }
    } catch (err) {
      console.error('Error saving material:', err);
      alert(`Failed to save material: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setIsSubmitting(false);
    }
  }, [formData, editingMaterial, loadMaterials, closeModal]);

  useEffect(() => {
    loadMaterials();
  }, [loadMaterials]);

  const filteredMaterials = materials.filter(material => {
    const matchesSearch = material.material_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         material.material_code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         material.substrate_type?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         material.aliases?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesFilter = filterType === "all" || material.substrate_type === filterType;
    
    return matchesSearch && matchesFilter;
  });

  const substrateTypes = [...new Set(materials.map(m => m.substrate_type).filter(Boolean))];

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-AU', {
      style: 'currency',
      currency: 'AUD',
      minimumFractionDigits: 2
    }).format(amount);
  };

  const getStockStatus = (material: Material) => {
    if (material.stock <= material.reorder_level) {
      return 'low';
    }
    return 'normal';
  };

  const getPricingUnitLabel = (unit: string) => {
    const labels: Record<string, string> = {
      sqm: 'per m²',
      linear_meter: 'per linear meter',
      sheet: 'per sheet',
      roll: 'per roll',
      kg: 'per kg'
    };
    return labels[unit] || `per ${unit}`;
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Materials</h1>
        </div>
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading materials...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Materials</h1>
          <Button onClick={loadMaterials} variant="outline">
            Retry
          </Button>
        </div>
        <div className="text-center py-12">
          <p className="text-red-600 mb-4">Error: {error}</p>
          <Button onClick={loadMaterials}>Try Again</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Materials</h1>
        <div className="flex items-center gap-2">
          <Button 
            onClick={importMaterialsFromJobs}
            variant="outline"
            disabled={isRefreshing}
            className="flex items-center gap-2"
          >
            {isRefreshing ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div>
                Importing...
              </>
            ) : (
              'Import from Jobs'
            )}
          </Button>
          <Button 
            onClick={openAddModal}
            className="flex items-center gap-2"
          >
            + Add Material
          </Button>
          <Button 
            onClick={loadMaterials} 
            variant="outline"
            disabled={isRefreshing}
            className="flex items-center gap-2"
          >
            {isRefreshing ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div>
                Refreshing...
              </>
            ) : (
              'Refresh'
            )}
          </Button>
        </div>
      </div>

      {/* Search and Filter Controls */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <Input
            type="text"
            placeholder="Search materials by name, code, substrate type, or aliases..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full"
          />
        </div>
        <div className="w-full sm:w-48">
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Substrate Types</option>
            {substrateTypes.map(type => (
              <option key={type} value={type}>
                {type.charAt(0).toUpperCase() + type.slice(1)}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Materials Count */}
      <div className="text-sm text-gray-600">
        Showing {filteredMaterials.length} of {materials.length} materials
      </div>

      {/* Materials List */}
      {filteredMaterials.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500 text-lg mb-2">No materials found</p>
          <p className="text-gray-400">Try adjusting your search or filter criteria</p>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
          {/* Desktop Table Header - Hidden on mobile */}
          <div className="hidden lg:block bg-gray-50 px-6 py-3 border-b border-gray-200">
            <div className="grid grid-cols-12 gap-4 text-xs font-medium text-gray-500 uppercase tracking-wider">
              <div className="col-span-1">Actions</div>
              <div className="col-span-3">Material</div>
              <div className="col-span-2">Properties</div>
              <div className="col-span-2">Dimensions</div>
              <div className="col-span-2">Stock</div>
              <div className="col-span-1">Status</div>
              <div className="col-span-1">Cost</div>
            </div>
          </div>

          {/* Table Body */}
          <div className="divide-y divide-gray-200">
            {filteredMaterials.map((material) => {
              const stockStatus = getStockStatus(material);
              
              return (
                <div key={material.material_id} className="px-4 lg:px-6 py-4 hover:bg-gray-50 transition-colors">
                  {/* Desktop Layout */}
                  <div className="hidden lg:grid lg:grid-cols-12 lg:gap-4 lg:items-center">
                    {/* Actions Column */}
                    <div className="col-span-1">
                      <div className="flex flex-col space-y-2">
                        <Button
                          onClick={() => openEditModal(material)}
                          variant="outline"
                          size="sm"
                          className="text-xs px-2 py-1"
                        >
                          Edit
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-xs px-2 py-1"
                        >
                          Suppliers
                        </Button>
                      </div>
                    </div>

                    {/* Material Info Column */}
                    <div className="col-span-3">
                      <div className="min-w-0">
                        <h3 className="text-sm font-semibold text-gray-900 truncate">
                          {material.material_name}
                        </h3>
                        <p className="text-xs text-gray-600 font-mono">
                          {material.material_code}
                        </p>
                        {material.aliases && (
                          <p className="text-xs text-gray-500 mt-1 truncate">
                            Also: {material.aliases}
                          </p>
                        )}
                        <div className="flex flex-wrap gap-1 mt-2">
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                            {material.substrate_type}
                          </span>
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800">
                            {getPricingUnitLabel(material.pricing_unit)}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Properties Column */}
                    <div className="col-span-2">
                      <div className="text-xs space-y-1">
                        <div><span className="text-gray-500">Adhesive:</span> <span className="font-medium">{material.adhesive_type}</span></div>
                        <div><span className="text-gray-500">Handling:</span> <span className="font-medium">{material.handling}</span></div>
                        <div><span className="text-gray-500">Weight:</span> <span className="font-medium">{material.weight_gsm} GSM</span></div>
                        <div><span className="text-gray-500">Coating:</span> <span className="font-medium">{material.coating}</span></div>
                        {(material.conductive || material.white_material) && (
                          <div className="flex flex-wrap gap-1 mt-1">
                            {material.conductive && (
                              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800">
                                Conductive
                              </span>
                            )}
                            {material.white_material && (
                              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                                White
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Dimensions Column */}
                    <div className="col-span-2">
                      <div className="text-xs space-y-1">
                        <div><span className="text-gray-500">Width:</span> <span className="font-medium">{material.width_mm}mm</span></div>
                        <div><span className="text-gray-500">Length:</span> <span className="font-medium">{material.length_mm}mm</span></div>
                        <div><span className="text-gray-500">Lead time:</span> <span className="font-medium">{material.lead_time_days} days</span></div>
                      </div>
                    </div>

                    {/* Stock Column */}
                    <div className="col-span-2">
                      <div className="text-xs space-y-1">
                        <div><span className="text-gray-500">Current:</span> <span className="font-medium">{material.stock}m</span></div>
                        <div><span className="text-gray-500">Reorder:</span> <span className="font-medium">{material.reorder_level}m</span></div>
                      </div>
                    </div>

                    {/* Status Column */}
                    <div className="col-span-1">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        stockStatus === 'low' 
                          ? 'bg-red-100 text-red-800' 
                          : 'bg-green-100 text-green-800'
                      }`}>
                        {stockStatus === 'low' ? 'Low' : 'OK'}
                      </span>
                    </div>

                    {/* Cost Column */}
                    <div className="col-span-1">
                      <div className="text-right">
                        <div className="text-sm font-semibold text-green-600">
                          {formatCurrency(material.cost_aud)}
                        </div>
                        <div className="text-xs text-gray-500">Legacy</div>
                      </div>
                    </div>
                  </div>

                  {/* Mobile Layout */}
                  <div className="lg:hidden">
                    <div className="flex items-start justify-between mb-3">
                      {/* Left: Action buttons */}
                      <div className="flex flex-col space-y-1 mr-4">
                        <Button
                          onClick={() => openEditModal(material)}
                          variant="outline"
                          size="sm"
                          className="text-xs px-2 py-1"
                        >
                          Edit
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-xs px-2 py-1"
                        >
                          Suppliers
                        </Button>
                      </div>

                      {/* Right: Material info and status */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <h3 className="text-sm font-semibold text-gray-900 truncate">
                              {material.material_name}
                            </h3>
                            <p className="text-xs text-gray-600 font-mono">
                              {material.material_code}
                            </p>
                          </div>
                          <span className={`ml-2 inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                            stockStatus === 'low' 
                              ? 'bg-red-100 text-red-800' 
                              : 'bg-green-100 text-green-800'
                          }`}>
                            {stockStatus === 'low' ? 'Low Stock' : 'In Stock'}
                          </span>
                        </div>

                        {/* Badges */}
                        <div className="flex flex-wrap gap-1 mt-2">
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                            {material.substrate_type}
                          </span>
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800">
                            {getPricingUnitLabel(material.pricing_unit)}
                          </span>
                          {material.conductive && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800">
                              Conductive
                            </span>
                          )}
                          {material.white_material && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                              White
                            </span>
                          )}
                        </div>

                        {/* Aliases */}
                        {material.aliases && (
                          <p className="text-xs text-gray-500 mt-1">
                            Also: {material.aliases}
                          </p>
                        )}

                        {/* Properties Grid */}
                        <div className="grid grid-cols-2 gap-x-4 gap-y-1 mt-3 text-xs">
                          <div><span className="text-gray-500">Adhesive:</span> <span className="font-medium">{material.adhesive_type}</span></div>
                          <div><span className="text-gray-500">Handling:</span> <span className="font-medium">{material.handling}</span></div>
                          <div><span className="text-gray-500">Weight:</span> <span className="font-medium">{material.weight_gsm} GSM</span></div>
                          <div><span className="text-gray-500">Coating:</span> <span className="font-medium">{material.coating}</span></div>
                          <div><span className="text-gray-500">Width:</span> <span className="font-medium">{material.width_mm}mm</span></div>
                          <div><span className="text-gray-500">Length:</span> <span className="font-medium">{material.length_mm}mm</span></div>
                          <div><span className="text-gray-500">Stock:</span> <span className="font-medium">{material.stock}m</span></div>
                          <div><span className="text-gray-500">Reorder:</span> <span className="font-medium">{material.reorder_level}m</span></div>
                        </div>

                        {/* Cost and Lead Time */}
                        <div className="flex justify-between items-center mt-3 pt-2 border-t border-gray-200">
                          <div className="text-xs">
                            <span className="text-gray-500">Lead time:</span> <span className="font-medium">{material.lead_time_days} days</span>
                          </div>
                          <div className="text-right">
                            <div className="text-sm font-semibold text-green-600">
                              {formatCurrency(material.cost_aud)}
                            </div>
                            <div className="text-xs text-gray-500">Legacy cost</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
      
      {/* Add/Edit Material Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h2 className="text-xl font-bold mb-4">
                {editingMaterial ? 'Edit Material' : 'Add New Material'}
              </h2>
              
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Material Code
                    </label>
                    <Input
                      type="text"
                      value={formData.material_code}
                      onChange={(e) => setFormData({...formData, material_code: e.target.value})}
                      placeholder="e.g., MAT001"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Material Name *
                    </label>
                    <Input
                      type="text"
                      value={formData.material_name}
                      onChange={(e) => setFormData({...formData, material_name: e.target.value})}
                      placeholder="e.g., Semi Gloss Paper"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Aliases (comma-separated alternative names)
                  </label>
                  <Input
                    type="text"
                    value={formData.aliases}
                    onChange={(e) => setFormData({...formData, aliases: e.target.value})}
                    placeholder="e.g., Semi-Gloss, SG Paper, Satin Paper"
                  />
                  <p className="text-xs text-gray-500 mt-1">Alternative names this material might be called</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Substrate Type
                    </label>
                    <select
                      value={formData.substrate_type}
                      onChange={(e) => setFormData({...formData, substrate_type: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="paper">Paper</option>
                      <option value="vinyl">Vinyl</option>
                      <option value="polyester">Polyester</option>
                      <option value="polypropylene">Polypropylene</option>
                      <option value="pet">PET</option>
                      <option value="other">Other</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Adhesive Type
                    </label>
                    <select
                      value={formData.adhesive_type}
                      onChange={(e) => setFormData({...formData, adhesive_type: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="permanent">Permanent</option>
                      <option value="removable">Removable</option>
                      <option value="repositionable">Repositionable</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Pricing Unit
                    </label>
                    <select
                      value={formData.pricing_unit}
                      onChange={(e) => setFormData({...formData, pricing_unit: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="sqm">Square Meters (sqm)</option>
                      <option value="linear_meter">Linear Meters</option>
                      <option value="sheet">Sheets</option>
                      <option value="roll">Rolls</option>
                      <option value="kg">Kilograms</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Weight (GSM)
                    </label>
                    <Input
                      type="number"
                      value={formData.weight_gsm}
                      onChange={(e) => setFormData({...formData, weight_gsm: parseInt(e.target.value) || 0})}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Width (mm)
                    </label>
                    <Input
                      type="number"
                      value={formData.width_mm}
                      onChange={(e) => setFormData({...formData, width_mm: parseFloat(e.target.value) || 0})}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Length (mm)
                    </label>
                    <Input
                      type="number"
                      value={formData.length_mm}
                      onChange={(e) => setFormData({...formData, length_mm: parseFloat(e.target.value) || 0})}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Coating
                    </label>
                    <select
                      value={formData.coating}
                      onChange={(e) => setFormData({...formData, coating: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="gloss">Gloss</option>
                      <option value="matte">Matte</option>
                      <option value="satin">Satin</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Handling
                    </label>
                    <select
                      value={formData.handling}
                      onChange={(e) => setFormData({...formData, handling: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="hand_applied">Hand Applied</option>
                      <option value="machine_applied">Machine Applied</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Legacy Cost (AUD) - Deprecated
                    </label>
                    <Input
                      type="number"
                      step="0.01"
                      value={formData.cost_aud}
                      onChange={(e) => setFormData({...formData, cost_aud: parseFloat(e.target.value) || 0})}
                    />
                    <p className="text-xs text-gray-500 mt-1">Use supplier pricing for current rates</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Stock (meters)
                    </label>
                    <Input
                      type="number"
                      step="0.1"
                      value={formData.stock}
                      onChange={(e) => setFormData({...formData, stock: parseFloat(e.target.value) || 0})}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Reorder Level (meters)
                    </label>
                    <Input
                      type="number"
                      step="0.1"
                      value={formData.reorder_level}
                      onChange={(e) => setFormData({...formData, reorder_level: parseFloat(e.target.value) || 0})}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Lead Time (days)
                    </label>
                    <Input
                      type="number"
                      value={formData.lead_time_days}
                      onChange={(e) => setFormData({...formData, lead_time_days: parseInt(e.target.value) || 0})}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={formData.conductive}
                        onChange={(e) => setFormData({...formData, conductive: e.target.checked})}
                        className="rounded border-gray-300"
                      />
                      <span className="text-sm text-gray-700">Conductive</span>
                    </label>
                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={formData.white_material}
                        onChange={(e) => setFormData({...formData, white_material: e.target.checked})}
                        className="rounded border-gray-300"
                      />
                      <span className="text-sm text-gray-700">White Material</span>
                    </label>
                  </div>
                </div>

                <div className="flex justify-end space-x-2 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={closeModal}
                    disabled={isSubmitting}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex items-center gap-2"
                  >
                    {isSubmitting ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div>
                        {editingMaterial ? 'Updating...' : 'Creating...'}
                      </>
                    ) : (
                      editingMaterial ? 'Update Material' : 'Create Material'
                    )}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
