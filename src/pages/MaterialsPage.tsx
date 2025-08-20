import React, { useEffect, useState, useCallback } from "react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { apiCall } from "../config/api";
import type { Material, MaterialFieldOptions } from "../types/materials";
import { MaterialFormModal } from "../components/materials/MaterialFormModal";
import { MaterialList } from "../components/materials/MaterialList";
import { GroupManager } from "../components/materials/GroupManager";

interface MaterialGroup {
  group_id: string;
  group_name: string;
}

export function MaterialsPage() {
  // State for materials and UI
  const [materials, setMaterials] = useState<Material[]>([]);
  const [filteredMaterials, setFilteredMaterials] = useState<Material[]>([]);
  const [materialGroups, setMaterialGroups] = useState<MaterialGroup[]>([]);
  const [fieldOptions, setFieldOptions] = useState<MaterialFieldOptions>({
    substrate_types: [],
    adhesive_types: [],
    handling_types: [],
    coating_types: [],
    pricing_units: []
  });

  // Search and filter state
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("all");

  // Modal states
  const [showModal, setShowModal] = useState(false);
  const [showConfig, setShowConfig] = useState(false);
  const [showCsvModal, setShowCsvModal] = useState(false);
  const [editingMaterial, setEditingMaterial] = useState<Material | null>(null);

  // Loading states
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // CSV upload state
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [csvUploading, setCsvUploading] = useState(false);

  // Load materials from API
  const loadMaterials = useCallback(async () => {
    try {
      const response = await apiCall('/api/materials');
      if (response.ok) {
        const data = await response.json();
        setMaterials(data || []);
      } else {
        console.error('Failed to load materials');
      }
    } catch (error) {
      console.error('Error loading materials:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Load field options from API
  const loadFieldOptions = useCallback(async () => {
    try {
      const response = await apiCall('/api/field-options');
      if (response.ok) {
        const data = await response.json();
        setFieldOptions(data || {
          substrate_types: [],
          adhesive_types: [],
          handling_types: [],
          coating_types: [],
          pricing_units: []
        });
      }
    } catch (error) {
      console.error('Error loading field options:', error);
    }
  }, []);

  // Load material groups from API
  const loadMaterialGroups = useCallback(async () => {
    try {
      const response = await apiCall('/api/material-groups');
      if (response.ok) {
        const data = await response.json();
        setMaterialGroups((data.groups || []).map((g: any) => ({ 
          group_id: g.group_id, 
          group_name: g.group_name 
        })));
      }
    } catch (error) {
      console.error('Error loading material groups:', error);
    }
  }, []);

  // Initial data load
  useEffect(() => {
    loadMaterials();
    loadFieldOptions();
    loadMaterialGroups();
  }, [loadMaterials, loadFieldOptions, loadMaterialGroups]);

  // Filter materials based on search term and filter type
  useEffect(() => {
    let filtered = materials;

    // Apply search filter
    if (searchTerm.trim()) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(material =>
        material.material_name?.toLowerCase().includes(searchLower) ||
        material.material_code?.toLowerCase().includes(searchLower) ||
        material.substrate_type?.toLowerCase().includes(searchLower) ||
        material.aliases?.toLowerCase().includes(searchLower)
      );
    }

    // Apply group filter
    if (filterType !== 'all') {
      const selectedGroup = materialGroups.find(g => g.group_id === filterType);
      if (selectedGroup) {
        filtered = filtered.filter(material => 
          material.substrate_group === selectedGroup.group_name
        );
      }
    }

    setFilteredMaterials(filtered);
  }, [materials, searchTerm, filterType, materialGroups]);

  // Refresh data
  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([
      loadMaterials(),
      loadFieldOptions(),
      loadMaterialGroups()
    ]);
  };

  // Modal handlers
  const openAddModal = () => {
    setEditingMaterial(null);
    setShowModal(true);
  };

  const openEditModal = (material: Material) => {
    setEditingMaterial(material);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingMaterial(null);
  };

  const handleSave = () => {
    loadMaterials(); // Refresh the materials list
  };

  // CSV upload handlers
  const handleCsvUpload = async () => {
    if (!csvFile) return;

    setCsvUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', csvFile);

      const response = await fetch('http://localhost:3001/api/materials/upload-csv', {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        alert('CSV uploaded successfully!');
        setCsvFile(null);
        setShowCsvModal(false);
        await loadMaterials();
      } else {
        const errorData = await response.json();
        alert(`Upload failed: ${errorData.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('CSV upload error:', error);
      alert('Upload failed: Network error');
    } finally {
      setCsvUploading(false);
    }
  };

  const downloadCsvTemplate = () => {
    const csvContent = `material_name,material_code,substrate_type,substrate_group,adhesive_type,handling,weight_gsm,width_mm,length_mm,coating,grain_direction,glossy_level,conductive,white_material,cost_aud,stock,reorder_level,lead_time_days,pricing_unit,aliases
Premium Paper,MP001,paper,paper_rolls,permanent,normal,90,1200,800,matte,long,medium,false,true,45.50,100,20,7,sqm,"premium paper, high quality"
Vinyl Material,VM001,vinyl,vinyl_sheets,removable,careful,120,1000,600,gloss,short,high,false,false,65.75,50,10,14,sqm,"removable vinyl, signage"`;

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'materials_template.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Materials Management</h1>
          <p className="text-sm text-gray-600 mt-1">
            Manage your printing materials, pricing, and supplier information
          </p>
        </div>
        <div className="flex gap-2 mt-4 sm:mt-0">
          <Button variant="outline" onClick={() => setShowConfig(true)}>
            ⚙️ Groups
          </Button>
          <Button variant="outline" onClick={() => setShowCsvModal(true)}>
            📁 Import CSV
          </Button>
          <Button onClick={openAddModal}>
            + Add Material
          </Button>
          <Button variant="outline" onClick={handleRefresh} disabled={refreshing}>
            {refreshing ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600 mr-2"></div>
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
            {materialGroups.map(group => (
              <option key={group.group_id} value={group.group_id}>
                {group.group_name}
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
      <MaterialList
        materials={filteredMaterials}
        onEditMaterial={openEditModal}
        loading={loading}
      />

      {/* Material Form Modal */}
      <MaterialFormModal
        isOpen={showModal}
        onClose={closeModal}
        material={editingMaterial}
        fieldOptions={fieldOptions}
        onSave={handleSave}
      />

      {/* Config Modal: Manage Material Groups */}
      {showConfig && (
        <div className="fixed inset-0 bg-black/50 p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-5xl mx-auto">
            <div className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold">Material Groups</h2>
                <Button variant="outline" onClick={() => setShowConfig(false)}>
                  Close
                </Button>
              </div>
              <GroupManager onChanged={loadMaterialGroups} />
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
                  <Button variant="outline" onClick={downloadCsvTemplate} className="mb-4">
                    📥 Download Template
                  </Button>
                </div>

                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6">
                  <input
                    type="file"
                    accept=".csv"
                    onChange={(e) => setCsvFile(e.target.files?.[0] || null)}
                    className="w-full"
                  />
                  {csvFile && (
                    <p className="text-sm text-gray-600 mt-2">
                      Selected: {csvFile.name} ({(csvFile.size / 1024).toFixed(1)} KB)
                    </p>
                  )}
                </div>

                <div className="flex justify-end gap-3">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowCsvModal(false);
                      setCsvFile(null);
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleCsvUpload}
                    disabled={!csvFile || csvUploading}
                  >
                    {csvUploading ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Uploading...
                      </>
                    ) : (
                      'Upload CSV'
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
