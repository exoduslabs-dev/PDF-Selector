import React from "react";
import { Button } from "../ui/button";
import type { Material } from "../../types/materials";

interface MaterialListProps {
  materials: Material[];
  onEditMaterial: (material: Material) => void;
  loading?: boolean;
}

export function MaterialList({ materials, onEditMaterial, loading }: MaterialListProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-AU', {
      style: 'currency',
      currency: 'AUD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount || 0);
  };

  const getPricingUnitLabel = (unit: string) => {
    const unitLabels: Record<string, string> = {
      sqm: 'per m²',
      linear_meter: 'per LM',
      sheet: 'per sheet',
      roll: 'per roll',
      kg: 'per kg'
    };
    return unitLabels[unit] || unit;
  };

  const getStockStatus = (material: Material) => {
    const currentStock = Number(material.stock) || 0;
    const reorderLevel = Number(material.reorder_level) || 0;
    return currentStock <= reorderLevel ? 'low' : 'ok';
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <p className="text-gray-500 mt-2">Loading materials...</p>
      </div>
    );
  }

  if (materials.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-gray-400 text-6xl mb-4">📦</div>
        <p className="text-gray-500 text-lg mb-2">No materials found</p>
        <p className="text-gray-400">Try adjusting your search or filter criteria</p>
      </div>
    );
  }

  return (
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

      {/* Materials List */}
      <div className="divide-y divide-gray-200">
        {materials.map((material) => {
          const stockStatus = getStockStatus(material);
          
          return (
            <div 
              key={material.material_id} 
              className="px-4 lg:px-6 py-4 hover:bg-gray-50 transition-colors"
            >
              {/* Desktop Layout */}
              <div className="hidden lg:grid lg:grid-cols-12 lg:gap-3 lg:items-center">
                {/* Actions Column */}
                <div className="col-span-1">
                  <div className="flex flex-col space-y-2">
                    <Button
                      onClick={() => onEditMaterial(material)}
                      variant="outline"
                      size="sm"
                      className="text-xs px-2 py-1"
                    >
                      Edit
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
                        {getPricingUnitLabel(material.pricing_unit || 'sqm')}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Properties Column */}
                <div className="col-span-2">
                  <div className="text-xs space-y-1">
                    <div>
                      <span className="text-gray-500">Adhesive:</span>{' '}
                      <span className="font-medium">{material.adhesive_type || 'N/A'}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Handling:</span>{' '}
                      <span className="font-medium">{material.handling || 'N/A'}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Weight:</span>{' '}
                      <span className="font-medium">{material.weight_gsm || 0} GSM</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Coating:</span>{' '}
                      <span className="font-medium">{material.coating || 'N/A'}</span>
                    </div>
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
                    <div>
                      <span className="text-gray-500">Width:</span>{' '}
                      <span className="font-medium">{material.width_mm || 0}mm</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Length:</span>{' '}
                      <span className="font-medium">{material.length_mm || 0}mm</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Lead time:</span>{' '}
                      <span className="font-medium">{material.lead_time_days || 0} days</span>
                    </div>
                  </div>
                </div>

                {/* Stock Column */}
                <div className="col-span-2">
                  <div className="text-xs space-y-1">
                    <div>
                      <span className="text-gray-500">Current:</span>{' '}
                      <span className="font-medium">{material.stock || 0}m</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Reorder:</span>{' '}
                      <span className="font-medium">{material.reorder_level || 0}m</span>
                    </div>
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
                      {formatCurrency(Number(material.cost_aud) || 0)}
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
                      onClick={() => onEditMaterial(material)}
                      variant="outline"
                      size="sm"
                      className="text-xs px-2 py-1"
                    >
                      Edit
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
                        {getPricingUnitLabel(material.pricing_unit || 'sqm')}
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
                      <div>
                        <span className="text-gray-500">Adhesive:</span>{' '}
                        <span className="font-medium">{material.adhesive_type || 'N/A'}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Handling:</span>{' '}
                        <span className="font-medium">{material.handling || 'N/A'}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Weight:</span>{' '}
                        <span className="font-medium">{material.weight_gsm || 0} GSM</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Coating:</span>{' '}
                        <span className="font-medium">{material.coating || 'N/A'}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Width:</span>{' '}
                        <span className="font-medium">{material.width_mm || 0}mm</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Length:</span>{' '}
                        <span className="font-medium">{material.length_mm || 0}mm</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Stock:</span>{' '}
                        <span className="font-medium">{material.stock || 0}m</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Reorder:</span>{' '}
                        <span className="font-medium">{material.reorder_level || 0}m</span>
                      </div>
                    </div>

                    {/* Cost and Lead Time */}
                    <div className="flex justify-between items-center mt-3 pt-2 border-t border-gray-200">
                      <div className="text-xs">
                        <span className="text-gray-500">Lead time:</span>{' '}
                        <span className="font-medium">{material.lead_time_days || 0} days</span>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-semibold text-green-600">
                          {formatCurrency(Number(material.cost_aud) || 0)}
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
  );
}
