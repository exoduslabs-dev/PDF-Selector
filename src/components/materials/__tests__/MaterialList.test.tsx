import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { MaterialList } from '../MaterialList';
import type { Material } from '../../../types/materials';

// Mock materials data
const mockMaterials: Material[] = [
  {
    material_id: '1',
    material_code: 'MAT001',
    material_name: 'Premium Paper',
    substrate_type: 'paper',
    substrate_group: 'paper_rolls',
    adhesive_type: 'permanent',
    handling: 'normal',
    weight_gsm: 90,
    width_mm: 1200,
    length_mm: 800,
    coating: 'matte',
    grain_direction: 'long',
    glossy_level: 'medium',
    conductive: false,
    white_material: true,
    cost_aud: 45.50,
    stock: 100,
    reorder_level: 20,
    lead_time_days: 7,
    pricing_unit: 'sqm',
    aliases: 'premium paper, high quality',
    created_at: '2024-01-01',
    updated_at: '2024-01-01'
  },
  {
    material_id: '2',
    material_code: 'MAT002',
    material_name: 'Vinyl Material',
    substrate_type: 'vinyl',
    substrate_group: 'vinyl_sheets',
    adhesive_type: 'removable',
    handling: 'careful',
    weight_gsm: 120,
    width_mm: 1000,
    length_mm: 600,
    coating: 'gloss',
    grain_direction: 'short',
    glossy_level: 'high',
    conductive: false,
    white_material: false,
    cost_aud: 65.75,
    stock: 5, // Low stock
    reorder_level: 10,
    lead_time_days: 14,
    pricing_unit: 'sqm',
    aliases: 'removable vinyl, signage',
    created_at: '2024-01-01',
    updated_at: '2024-01-01'
  }
];

describe('MaterialList', () => {
  const mockOnEditMaterial = jest.fn();

  beforeEach(() => {
    mockOnEditMaterial.mockClear();
  });

  describe('Loading State', () => {
    it('displays loading spinner when loading is true', () => {
      render(
        <MaterialList
          materials={[]}
          onEditMaterial={mockOnEditMaterial}
          loading={true}
        />
      );

      expect(screen.getByText('Loading materials...')).toBeInTheDocument();
      expect(document.querySelector('.animate-spin')).toBeInTheDocument();
    });
  });

  describe('Empty State', () => {
    it('displays empty state when no materials provided', () => {
      render(
        <MaterialList
          materials={[]}
          onEditMaterial={mockOnEditMaterial}
          loading={false}
        />
      );

      expect(screen.getByText('No materials found')).toBeInTheDocument();
      expect(screen.getByText('Try adjusting your search or filter criteria')).toBeInTheDocument();
    });
  });

  describe('Material Display', () => {
    beforeEach(() => {
      render(
        <MaterialList
          materials={mockMaterials}
          onEditMaterial={mockOnEditMaterial}
          loading={false}
        />
      );
    });

    it('renders all materials correctly', () => {
      expect(screen.getByText('Premium Paper')).toBeInTheDocument();
      expect(screen.getByText('MAT001')).toBeInTheDocument();
      expect(screen.getByText('Vinyl Material')).toBeInTheDocument();
      expect(screen.getByText('MAT002')).toBeInTheDocument();
    });

    it('displays material properties correctly', () => {
      // Check substrate types
      expect(screen.getByText('paper')).toBeInTheDocument();
      expect(screen.getByText('vinyl')).toBeInTheDocument();

      // Check pricing units
      expect(screen.getAllByText('per m²')).toHaveLength(4); // 2 materials × 2 layouts (desktop + mobile)

      // Check weight
      expect(screen.getByText('90 GSM')).toBeInTheDocument();
      expect(screen.getByText('120 GSM')).toBeInTheDocument();

      // Check dimensions
      expect(screen.getByText('1200mm')).toBeInTheDocument();
      expect(screen.getByText('800mm')).toBeInTheDocument();
    });

    it('displays stock status correctly', () => {
      // Premium Paper has good stock (100 > 20 reorder level)
      expect(screen.getAllByText('OK')).toHaveLength(1);
      
      // Vinyl Material has low stock (5 <= 10 reorder level)
      expect(screen.getAllByText('Low')).toHaveLength(1);
      expect(screen.getAllByText('Low Stock')).toHaveLength(1); // Mobile version
    });

    it('displays cost information correctly', () => {
      expect(screen.getByText('$45.50')).toBeInTheDocument();
      expect(screen.getByText('$65.75')).toBeInTheDocument();
      expect(screen.getAllByText('Legacy')).toHaveLength(2);
    });

    it('displays material badges correctly', () => {
      // Check conductive and white material badges
      expect(screen.getAllByText('White')).toHaveLength(2); // Desktop + mobile for Premium Paper
      
      // Vinyl material should not have white badge
      const whiteBadges = screen.getAllByText('White');
      expect(whiteBadges).toHaveLength(2); // Only for Premium Paper
    });

    it('displays aliases when present', () => {
      expect(screen.getByText('Also: premium paper, high quality')).toBeInTheDocument();
      expect(screen.getByText('Also: removable vinyl, signage')).toBeInTheDocument();
    });
  });

  describe('User Interactions', () => {
    beforeEach(() => {
      render(
        <MaterialList
          materials={mockMaterials}
          onEditMaterial={mockOnEditMaterial}
          loading={false}
        />
      );
    });

    it('calls onEditMaterial when edit button is clicked', () => {
      const editButtons = screen.getAllByText('Edit');
      
      // Click the first edit button (Premium Paper)
      fireEvent.click(editButtons[0]);
      
      expect(mockOnEditMaterial).toHaveBeenCalledWith(mockMaterials[0]);
      expect(mockOnEditMaterial).toHaveBeenCalledTimes(1);
    });

    it('calls onEditMaterial for different materials', () => {
      const editButtons = screen.getAllByText('Edit');
      
      // Click the second edit button (Vinyl Material)
      fireEvent.click(editButtons[1]);
      
      expect(mockOnEditMaterial).toHaveBeenCalledWith(mockMaterials[1]);
    });
  });

  describe('Responsive Design', () => {
    beforeEach(() => {
      render(
        <MaterialList
          materials={mockMaterials}
          onEditMaterial={mockOnEditMaterial}
          loading={false}
        />
      );
    });

    it('renders desktop table header', () => {
      expect(screen.getByText('Actions')).toBeInTheDocument();
      expect(screen.getByText('Material')).toBeInTheDocument();
      expect(screen.getByText('Properties')).toBeInTheDocument();
      expect(screen.getByText('Dimensions')).toBeInTheDocument();
      expect(screen.getByText('Stock')).toBeInTheDocument();
      expect(screen.getByText('Status')).toBeInTheDocument();
      expect(screen.getByText('Cost')).toBeInTheDocument();
    });

    it('has mobile and desktop layouts for each material', () => {
      // Each material should appear in both desktop and mobile layouts
      const materialNames = screen.getAllByText('Premium Paper');
      expect(materialNames).toHaveLength(2); // Desktop + mobile

      const vinylNames = screen.getAllByText('Vinyl Material');
      expect(vinylNames).toHaveLength(2); // Desktop + mobile
    });
  });

  describe('Edge Cases', () => {
    it('handles materials with missing optional properties', () => {
      const materialWithMissingProps: Material = {
        material_id: '3',
        material_code: 'MAT003',
        material_name: 'Basic Material',
        created_at: '2024-01-01',
        updated_at: '2024-01-01'
        // All other properties are optional and missing
      };

      render(
        <MaterialList
          materials={[materialWithMissingProps]}
          onEditMaterial={mockOnEditMaterial}
          loading={false}
        />
      );

      expect(screen.getByText('Basic Material')).toBeInTheDocument();
      expect(screen.getByText('MAT003')).toBeInTheDocument();
      
      // Should display N/A for missing properties
      expect(screen.getAllByText('N/A')).toHaveLength(8); // 4 properties × 2 layouts
      
      // Should display 0 for missing numeric values
      expect(screen.getAllByText('0 GSM')).toHaveLength(2);
      expect(screen.getAllByText('0mm')).toHaveLength(4); // width + length × 2 layouts
    });

    it('handles materials with zero stock correctly', () => {
      const zeroStockMaterial: Material = {
        ...mockMaterials[0],
        material_id: '4',
        stock: 0,
        reorder_level: 10
      };

      render(
        <MaterialList
          materials={[zeroStockMaterial]}
          onEditMaterial={mockOnEditMaterial}
          loading={false}
        />
      );

      // Should show low stock status when stock (0) <= reorder_level (10)
      expect(screen.getAllByText('Low')).toHaveLength(1);
      expect(screen.getAllByText('Low Stock')).toHaveLength(1);
    });
  });
});
