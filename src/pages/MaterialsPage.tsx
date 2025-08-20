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
  substrate_group: string; // New grouping field
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
  substrate_group: string; // New grouping field
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
  const [materialGroups, setMaterialGroups] = useState<{group_id: string, group_name: string}[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState<string>("all");
  const [isRefreshing, setIsRefreshing] = useState(false);
  // Dynamic field options from database
  const [fieldOptions, setFieldOptions] = useState<{
    substrate_types: string[];
    adhesive_types: string[];
    handling_types: string[];
    coating_types: string[];
    pricing_units: string[];
  }>({
    substrate_types: [],
    adhesive_types: [],
    handling_types: [],
    coating_types: [],
    pricing_units: []
  });
  
  // Ref for modal scrolling
  const modalRef = React.useRef<HTMLDivElement>(null);
  
  // CSV upload state
  const [showCsvModal, setShowCsvModal] = useState(false);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [csvUploading, setCsvUploading] = useState(false);
  const [csvResults, setCsvResults] = useState<any>(null);

  // Config modal state
  const [showConfig, setShowConfig] = useState(false);
  // Material edit sub tabs
  const [materialSubTab, setMaterialSubTab] = useState<'details' | 'suppliers' | 'history'>('details');
  
  // Modal and form state
  const [showModal, setShowModal] = useState(false);
  const [editingMaterial, setEditingMaterial] = useState<Material | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState<MaterialFormData>({
    material_code: "",
    material_name: "",
    substrate_type: "paper",
    substrate_group: "label_rolls",
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

  // Handle modal scroll position preservation
  React.useEffect(() => {
    let scrollY = 0;
    
    if (showModal) {
      // Save current scroll position
      scrollY = window.pageYOffset;
      
      // Prevent body scroll
      document.body.style.position = 'fixed';
      document.body.style.top = `-${scrollY}px`;
      document.body.style.width = '100%';
      
      // Scroll modal to top
      setTimeout(() => {
        if (modalRef.current) {
          modalRef.current.scrollTo({ top: 0, behavior: 'auto' });
        }
      }, 0);
    } else {
      // Restore body scroll and position
      const scrollY = parseInt(document.body.style.top || '0', 10) * -1;
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.width = '';
      
      // Restore scroll position without animation
      window.scrollTo(0, scrollY);
    }
    
    // Cleanup function
    return () => {
      if (!showModal) {
        document.body.style.position = '';
        document.body.style.top = '';
        document.body.style.width = '';
      }
    };
  }, [showModal]);

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



  const openAddModal = useCallback(() => {
    setEditingMaterial(null);
    setFormData({
      material_code: "",
      material_name: "",
      substrate_type: "paper",
      substrate_group: "label_rolls",
      adhesive_type: "permanent",
      handling: "web",
      weight_gsm: 80,
      width_mm: 1000,
      length_mm: 1000,
      coating: "coated",
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
      substrate_group: material.substrate_group || "label_rolls",
      adhesive_type: material.adhesive_type || "permanent",
      handling: material.handling || "web",
      weight_gsm: material.weight_gsm || 80,
      width_mm: material.width_mm || 1000,
      length_mm: material.length_mm || 1000,
      coating: material.coating || "coated",
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

  // CSV functions
  const downloadCsvTemplate = useCallback(async () => {
    try {
      const response = await apiCall('/api/materials/csv-template');
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'materials_template.csv';
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        throw new Error('Failed to download template');
      }
    } catch (err) {
      console.error('Error downloading template:', err);
      alert('Failed to download CSV template');
    }
  }, []);

  const handleCsvUpload = useCallback(async () => {
    if (!csvFile) {
      alert('Please select a CSV file first');
      return;
    }

    try {
      setCsvUploading(true);
      const formData = new FormData();
      formData.append('file', csvFile);

      const response = await apiCall('/api/materials/csv-upload', {
        method: 'POST',
        body: formData
      });

      if (response.ok) {
        const result = await response.json();
        setCsvResults(result);
        await loadMaterials(); // Refresh the materials list
        alert(result.message);
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Upload failed');
      }
    } catch (err) {
      console.error('Error uploading CSV:', err);
      alert(`Failed to upload CSV: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setCsvUploading(false);
    }
  }, [csvFile, loadMaterials]);

  const closeCsvModal = useCallback(() => {
    setShowCsvModal(false);
    setCsvFile(null);
    setCsvResults(null);
  }, []);

  useEffect(() => {
    loadMaterials();
  }, [loadMaterials]);

  // Fetch material groups for filter and form options
  useEffect(() => {
    (async () => {
      try {
        const [groupsRes, optionsRes] = await Promise.all([
          apiCall('/api/material-groups'),
          apiCall('/api/field-options')
        ]);
        
        if (groupsRes.ok) {
          const data = await groupsRes.json();
          setMaterialGroups((data.groups || []).map((g: any) => ({ group_id: g.group_id, group_name: g.group_name })));
        }
        
        if (optionsRes.ok) {
          const optionsData = await optionsRes.json();
          setFieldOptions(optionsData.options || {
            substrate_types: [],
            adhesive_types: [],
            handling_types: [],
            coating_types: [],
            pricing_units: []
          });
        }
      } catch (e) {
        // ignore
      }
    })();
  }, []);

  const filteredMaterials = materials.filter(material => {
    const matchesSearch = material.material_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         material.material_code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         material.substrate_type?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         material.aliases?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesFilter = filterType === "all" || material.substrate_group === filterType;

    return matchesSearch && matchesFilter;
  });

  const substrateGroups = [...new Set(materials.map(m => m.substrate_group).filter(Boolean))];
  // No fallbacks; we rely on SQL content only per request

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
            variant="outline"
            onClick={() => setShowConfig(true)}
            title="Configure material groups"
            className="w-10 h-10 p-0"
          >
            ⚙️
          </Button>
          <Button 
            onClick={downloadCsvTemplate}
            variant="outline"
            className="flex items-center gap-2"
          >
            📄 Download CSV Template
          </Button>
          <Button 
            onClick={() => setShowCsvModal(true)}
            variant="outline"
            className="flex items-center gap-2"
          >
            📁 Upload CSV
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
      <div className="flex flex-col sm:flex-row gap-3">
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
            <option value="all">All Substrate Groups</option>
            {materialGroups.map(g => (
                  <option key={g.group_id} value={g.group_id}>{g.group_name}</option>
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
            <div className="grid grid-cols-12 gap-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
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
                  <div className="hidden lg:grid lg:grid-cols-12 lg:gap-3 lg:items-center">
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
                        {/* Suppliers button removed as requested */}
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
      
      {/* Config Modal: Manage Material Groups */}
      {showConfig && (
        <div className="fixed inset-0 bg-black/50 p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-5xl mx-auto">
            <div className="p-4 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold">Material Groups</h2>
                <Button variant="outline" onClick={() => setShowConfig(false)}>Close</Button>
              </div>
              <GroupManager onChanged={async () => {
                // refresh groups list
                try {
                  const res = await apiCall('/api/material-groups');
                  if (res.ok) {
                    const data = await res.json();
                    setMaterialGroups((data.groups || []).map((g: any) => ({ group_id: g.group_id, group_name: g.group_name })));
                  }
                } catch {}
              }} />
            </div>
          </div>
        </div>
      )}

      {/* CSV Upload Modal */}
      {showCsvModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl">
            <div className="p-6">
              <h2 className="text-xl font-bold mb-4">Upload Materials from CSV</h2>
              
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-gray-600 mb-3">
                    Upload a CSV file to bulk import materials. Download the template first to see the required format.
                  </p>
                  
                  <div className="flex items-center gap-2 mb-4">
                    <Button 
                      onClick={downloadCsvTemplate}
                      variant="outline"
                      className="flex items-center gap-2"
                    >
                      📄 Download Template
                    </Button>
                  </div>
                  
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                    <input
                      type="file"
                      accept=".csv"
                      onChange={(e) => setCsvFile(e.target.files?.[0] || null)}
                      className="hidden"
                      id="csv-upload"
                    />
                    <label htmlFor="csv-upload" className="cursor-pointer">
                      <div className="flex flex-col items-center gap-2">
                        <div className="text-4xl">📁</div>
                        <div className="text-sm text-gray-600">
                          {csvFile ? csvFile.name : 'Click to select CSV file'}
                        </div>
                        <div className="text-xs text-gray-500">
                          Only .csv files are supported
                        </div>
                      </div>
                    </label>
                  </div>
                </div>
                
                {csvResults && (
                  <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                    <h3 className="font-semibold mb-2">Upload Results:</h3>
                    <div className="text-sm space-y-1">
                      <div className="text-green-600">✅ Imported: {csvResults.imported} materials</div>
                      <div className="text-blue-600">🔄 Updated: {csvResults.updated} materials</div>
                      {csvResults.errors && csvResults.errors.length > 0 && (
                        <div className="text-red-600">
                          ❌ Errors: {csvResults.errors.length}
                          <details className="mt-2">
                            <summary className="cursor-pointer">Show errors</summary>
                            <ul className="mt-1 text-xs">
                              {csvResults.errors.map((error: string, index: number) => (
                                <li key={index} className="text-red-500">• {error}</li>
                              ))}
                            </ul>
                          </details>
                        </div>
                      )}
                    </div>
                  </div>
                )}
                
                <div className="flex justify-end space-x-2 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={closeCsvModal}
                    disabled={csvUploading}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    onClick={handleCsvUpload}
                    disabled={!csvFile || csvUploading}
                    className="flex items-center gap-2"
                  >
                    {csvUploading ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div>
                        Uploading...
                      </>
                    ) : (
                      <>📤 Upload CSV</>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Add/Edit Material Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-start justify-center">
          <div className="w-full max-w-7xl h-full bg-white overflow-y-auto shadow-2xl" ref={modalRef} style={{ marginTop: '-60px' }}>
            <div className="px-8 py-6">
                {/* Sub tabs with close button */}
                <div className="flex items-center justify-between border-b">
                  <div className="flex gap-1">
                    {[
                      { key: 'details', label: 'Material Detail' },
                      { key: 'suppliers', label: 'Suppliers' },
                      { key: 'history', label: 'Material History' },
                    ].map(t => (
                      <button
                        key={t.key}
                        type="button"
                        onClick={() => setMaterialSubTab(t.key as any)}
                        className={`px-3 py-2 text-sm border-b-2 ${materialSubTab === t.key ? 'border-blue-600 text-blue-700' : 'border-transparent text-gray-600'}`}
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={closeModal}
                    className="text-gray-400 hover:text-gray-600 p-2 hover:bg-gray-100 rounded-full transition-colors"
                    title="Close"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                {materialSubTab === 'details' && (
                  <div>
                    <div className="flex items-center justify-between mb-2">
                </div>
                <form onSubmit={handleSubmit} className="space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Material Code
                    </label>
                    <Input
                      type="text"
                      value={formData.material_code}
                      readOnly
                      placeholder="Auto-generated on save"
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

                {/* Physical properties and dimensions */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Substrate Type
                    </label>
                    <select
                      value={formData.substrate_type}
                      onChange={(e) => setFormData({...formData, substrate_type: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      {fieldOptions.substrate_types.map(type => (
                        <option key={type} value={type}>{type.charAt(0).toUpperCase() + type.slice(1)}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Substrate Group
                    </label>
                    <select
                      value={formData.substrate_group}
                      onChange={(e) => setFormData({...formData, substrate_group: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      {materialGroups.map(g => (
                        <option key={g.group_id} value={g.group_id}>{g.group_name}</option>
                      ))}
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
                      {fieldOptions.adhesive_types.map(type => (
                        <option key={type} value={type}>{type.charAt(0).toUpperCase() + type.slice(1)}</option>
                      ))}
                    </select>
                  </div>

                  {/* Pricing Unit moved below; removed here */}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
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

                {/* Coating / Handling */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1 text-left">Coating</label>
                    <select
                      value={formData.coating}
                      onChange={(e) => setFormData({...formData, coating: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      {fieldOptions.coating_types.map(type => (
                        <option key={type} value={type}>{type.charAt(0).toUpperCase() + type.slice(1)}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1 text-left">Handling</label>
                    <select
                      value={formData.handling}
                      onChange={(e) => setFormData({...formData, handling: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      {fieldOptions.handling_types.map(type => (
                        <option key={type} value={type}>{type.charAt(0).toUpperCase() + type.slice(1)}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Pricing / Stock / Reorder */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
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

                {/* Lead Time / Flags */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
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

                {/* Pricing Unit moved here under pricing section */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Pricing Unit
                  </label>
                  <select
                    value={formData.pricing_unit}
                    onChange={(e) => setFormData({...formData, pricing_unit: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {fieldOptions.pricing_units.map(unit => (
                      <option key={unit} value={unit}>
                        {unit === 'sqm' ? 'Square Meters (sqm)' : 
                         unit === 'linear_meter' ? 'Linear Meters' :
                         unit === 'sheet' ? 'Sheets' :
                         unit === 'roll' ? 'Rolls' :
                         unit === 'kg' ? 'Kilograms' :
                         unit.charAt(0).toUpperCase() + unit.slice(1)}
                      </option>
                    ))}
                  </select>
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
              )}

              {materialSubTab === 'suppliers' && (
                <div>
                  <SupplierPricingEditor materialId={editingMaterial?.material_id || ''} fieldOptions={fieldOptions} />
                </div>
              )}

              {materialSubTab === 'history' && (
                <div>
                  <div className="space-y-3">
                    <div className="text-sm text-gray-600">Stock movements: draw, purchase, adjustments.</div>
                    <div className="border rounded-md">
                      <div className="grid grid-cols-4 gap-2 bg-gray-50 p-2 text-sm font-medium">
                        <div>Date</div>
                        <div>Type</div>
                        <div>Quantity</div>
                        <div>Notes</div>
                      </div>
                      <div className="p-2 text-sm text-gray-500">No history found.</div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function GroupManager({ onChanged }: { onChanged: () => Promise<void> | void }) {
  const [groups, setGroups] = React.useState<any[]>([]);
  const [editingGroup, setEditingGroup] = React.useState<string | null>(null);
  const [draft, setDraft] = React.useState<{ group_id?: string; group_name: string; group_description?: string; group_color?: string; sort_order?: number }>({ group_name: '', group_description: '', group_color: '#888888', sort_order: 999 });
  const [loading, setLoading] = React.useState(true);
  const [busy, setBusy] = React.useState(false);

  const loadGroups = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiCall('/api/material-groups');
      if (res.ok) {
        const data = await res.json();
        setGroups(data.groups || []);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => { loadGroups(); }, [loadGroups]);

  const save = React.useCallback(async () => {
    if (!draft.group_name.trim()) return;
    setBusy(true);
    try {
      const res = await apiCall('/api/material-groups', { method: 'POST', body: JSON.stringify(draft) });
      if (res.ok) {
        setDraft({ group_name: '', group_description: '', group_color: '#888888', sort_order: 999 });
        await loadGroups();
        await onChanged();
      }
    } finally {
      setBusy(false);
    }
  }, [draft, loadGroups, onChanged]);

  const update = React.useCallback(async (id: string, patch: any) => {
    setBusy(true);
    try {
      const res = await apiCall(`/api/material-groups/${id}`, { method: 'PUT', body: JSON.stringify(patch) });
      if (res.ok) {
        await loadGroups();
        await onChanged();
      }
    } finally {
      setBusy(false);
    }
  }, [loadGroups, onChanged]);

  const remove = React.useCallback(async (id: string) => {
    if (!confirm('Delete this group?')) return;
    setBusy(true);
    try {
      const res = await apiCall(`/api/material-groups/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (res.ok) {
        await loadGroups();
        await onChanged();
      } else {
        alert(data.error || 'Delete failed');
      }
    } finally {
      setBusy(false);
    }
  }, [loadGroups, onChanged]);

  return (
    <div className="space-y-6">
      {/* Compact list of groups with name/description and an Edit button on the left */}
      {loading ? (
        <div className="text-gray-500">Loading…</div>
      ) : (
        <div className="divide-y border rounded-md">
          {groups.map(g => (
            <div key={g.group_id} className="flex items-start gap-3 p-3">
              <div>
                <Button variant="outline" onClick={() => setEditingGroup(g.group_id)} title="Edit group">Edit</Button>
              </div>
              <div className="flex-1">
                <div className="font-medium">{g.group_name}</div>
                <div className="text-sm text-gray-600">{g.group_description || ''}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Editor panel opens as a card when a group is selected */}
      {editingGroup && (
        <div className="border rounded-md p-4 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">Edit Group</h3>
            <Button variant="outline" onClick={() => setEditingGroup(null)}>Close</Button>
          </div>
          {/* Show/hide checkboxes for selections per material and default per category */}
          <div className="text-sm text-gray-700">Configure visibility and defaults (placeholder)</div>
          {/* Minimal inputs for name/description to satisfy request scope */}
          {groups.filter(g => g.group_id === editingGroup).map(g => (
            <div key={g.group_id} className="grid grid-cols-1 md:grid-cols-3 gap-2">
              <Input value={g.group_name} onChange={e => update(g.group_id, { group_name: e.target.value })} />
              <Input value={g.group_description || ''} onChange={e => update(g.group_id, { group_description: e.target.value })} />
              <div className="flex gap-2">
                <Input type="number" value={g.sort_order ?? 0} onChange={e => update(g.group_id, { sort_order: Number(e.target.value) || 0 })} />
                <Button variant="outline" onClick={() => remove(g.group_id)} disabled={busy}>Delete</Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function SupplierPricingEditor({ materialId, fieldOptions }: { 
  materialId: string; 
  fieldOptions: {
    substrate_types: string[];
    adhesive_types: string[];
    handling_types: string[];
    coating_types: string[];
    pricing_units: string[];
  }
}) {
  const [rows, setRows] = React.useState<any[]>([]);
  const [suppliers, setSuppliers] = React.useState<{ supplier_id: string; supplier_name?: string }[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [draftSupplier, setDraftSupplier] = React.useState<string>('');
  const [draftPrice, setDraftPrice] = React.useState<string>('');
  const [draftUnit, setDraftUnit] = React.useState<string>('');
  const load = React.useCallback(async () => {
    if (!materialId) return;
    setLoading(true);
    try {
      const [p, s] = await Promise.all([
        apiCall(`/api/material-pricing?material_id=${encodeURIComponent(materialId)}`),
        apiCall('/api/suppliers')
      ]);
      if (p.ok) {
        const data = await p.json();
        setRows(data.items || []);
      }
      if (s.ok) {
        const data = await s.json();
        setSuppliers((data.suppliers || []).map((x: any) => ({ supplier_id: x.supplier_id, supplier_name: x.supplier_name })));
      }
    } finally {
      setLoading(false);
    }
  }, [materialId]);
  React.useEffect(() => { load(); }, [load]);

  async function saveRow(id: string) {
    if (!materialId) return;
    const unit = parseFloat(draftPrice);
    if (Number.isNaN(unit)) return alert('Enter a valid price');
    const isTemp = id.startsWith('temp-');
    const payload = { supplier_id: draftSupplier || null, cost_per_unit: unit, pricing_unit: draftUnit || undefined } as any;
    let res: Response;
    if (isTemp) {
      res = await apiCall('/api/material-pricing', { method: 'POST', body: JSON.stringify({ material_id: materialId, ...payload }) });
    } else {
      res = await apiCall(`/api/material-pricing/${id}`, { method: 'PUT', body: JSON.stringify(payload) });
    }
    if (!res.ok) {
      alert('Failed to save');
      return;
    }
    setEditingId(null);
    setDraftPrice('');
    await load();
  }

  async function deleteRow(id: string) {
    const res = await apiCall(`/api/material-pricing/${id}`, { method: 'DELETE' });
    if (res.ok) await load(); else alert('Failed to delete');
  }

  return (
    <div className="space-y-2">
      <div className="text-sm text-gray-600">Click Supplier to edit; changes lock to that row. Price is editable inline.</div>
      <div className="border rounded-md">
        <div className="grid grid-cols-5 gap-2 bg-gray-50 p-2 text-sm font-medium">
          <div>Supplier</div>
          <div>Cost</div>
          <div>Unit</div>
          <div>Preferred</div>
          <div>Actions</div>
        </div>
        {loading ? (
          <div className="p-2 text-sm text-gray-500">Loading…</div>
        ) : rows.length === 0 ? (
          <div className="p-2 text-sm text-gray-500 flex items-center justify-between">
            <span>No supplier pricing yet.</span>
            <button className="text-blue-600 underline" onClick={() => {
              const tempId = `temp-${Date.now()}`;
              setRows([{ pricing_id: tempId, supplier_id: '', cost_per_unit: '', pricing_unit: 'sqm', is_preferred_supplier: false, is_active: true }, ...rows]);
              setEditingId(tempId);
              setDraftSupplier('');
              setDraftPrice('');
              setDraftUnit('sqm');
            }}>+ Add Pricing</button>
          </div>
        ) : rows.map((r: any) => (
          <div key={r.pricing_id} className="grid grid-cols-5 gap-2 p-2 border-t items-center text-sm">
            <div>
              {editingId === r.pricing_id ? (
                <select value={draftSupplier} onChange={e => setDraftSupplier(e.target.value)} className="w-full px-2 py-1 border rounded">
                  <option value="">(none)</option>
                  {suppliers.map(s => (<option key={s.supplier_id} value={s.supplier_id}>{s.supplier_name || s.supplier_id}</option>))}
                </select>
              ) : (
                <button className="underline" onClick={() => { setEditingId(r.pricing_id); setDraftSupplier(r.supplier_id || ''); setDraftPrice(String(r.cost_per_unit ?? '')); setDraftUnit(r.pricing_unit || ''); }}> {r.supplier_name || r.supplier_id || '(none)'} </button>
              )}
            </div>
            <div>
              {editingId === r.pricing_id ? (
                <Input value={draftPrice} onChange={e => setDraftPrice(e.target.value)} />
              ) : (
                r.cost_per_unit
              )}
            </div>
            <div>
              {editingId === r.pricing_id ? (
                <select value={draftUnit} onChange={e => setDraftUnit(e.target.value)} className="w-full px-2 py-1 border rounded">
                  {fieldOptions.pricing_units.map(unit => (
                    <option key={unit} value={unit}>
                      {unit === 'sqm' ? 'sqm' : 
                       unit === 'linear_meter' ? 'linear_meter' :
                       unit === 'sheet' ? 'sheet' :
                       unit === 'roll' ? 'roll' :
                       unit === 'kg' ? 'kg' : unit}
                    </option>
                  ))}
                </select>
              ) : (
                r.pricing_unit
              )}
            </div>
            <div>{r.is_preferred_supplier ? 'Yes' : ''}</div>
            <div className="flex gap-2">
              {editingId === r.pricing_id ? (
                <>
                  <Button variant="outline" onClick={() => saveRow(r.pricing_id)}>Save</Button>
                  <Button variant="ghost" onClick={() => setEditingId(null)}>Cancel</Button>
                </>
              ) : (
                <>
                  <Button variant="outline" onClick={() => setEditingId(r.pricing_id)}>Edit</Button>
                  <Button variant="ghost" onClick={() => deleteRow(r.pricing_id)}>Delete</Button>
                </>
              )}
            </div>
          </div>
        ))}
        {rows.length > 0 && (
          <div className="p-2 border-t text-right">
            <button className="text-blue-600 underline" onClick={() => {
              const tempId = `temp-${Date.now()}`;
              setRows([...rows, { pricing_id: tempId, supplier_id: '', cost_per_unit: '', pricing_unit: 'sqm', is_preferred_supplier: false, is_active: true }]);
              setEditingId(tempId);
              setDraftSupplier('');
              setDraftPrice('');
              setDraftUnit('sqm');
            }}>+ Add Pricing</button>
          </div>
        )}
      </div>
    </div>
  );
}

