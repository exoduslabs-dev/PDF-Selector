import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { MaterialList } from '../MaterialList';
import type { Material } from '../../../types/materials';

// Simple mock materials data
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
    aliases: 'premium paper',
    created_at: '2024-01-01',
    updated_at: '2024-01-01'
  }
];

describe('MaterialList Component', () => {
  const mockOnEditMaterial = jest.fn();

  beforeEach(() => {
    mockOnEditMaterial.mockClear();
  });

  test('displays loading state', () => {
    render(
      <MaterialList
        materials={[]}
        onEditMaterial={mockOnEditMaterial}
        loading={true}
      />
    );

    expect(screen.getByText('Loading materials...')).toBeInTheDocument();
  });

  test('displays empty state when no materials', () => {
    render(
      <MaterialList
        materials={[]}
        onEditMaterial={mockOnEditMaterial}
        loading={false}
      />
    );

    expect(screen.getByText('No materials found')).toBeInTheDocument();
  });

  test('renders material information correctly', () => {
    render(
      <MaterialList
        materials={mockMaterials}
        onEditMaterial={mockOnEditMaterial}
        loading={false}
      />
    );

    // Use getAllByText since desktop and mobile layouts show duplicate content
    expect(screen.getAllByText('Premium Paper')).toHaveLength(2);
    expect(screen.getAllByText('MAT001')).toHaveLength(2);
    expect(screen.getAllByText('paper')).toHaveLength(2);
  });

  test('calls onEditMaterial when edit button is clicked', () => {
    render(
      <MaterialList
        materials={mockMaterials}
        onEditMaterial={mockOnEditMaterial}
        loading={false}
      />
    );

    const editButtons = screen.getAllByText('Edit');
    expect(editButtons.length).toBe(2); // Desktop and mobile versions

    fireEvent.click(editButtons[0] as HTMLElement);
    expect(mockOnEditMaterial).toHaveBeenCalledWith(mockMaterials[0]);
  });

  test('shows cost information', () => {
    render(
      <MaterialList
        materials={mockMaterials}
        onEditMaterial={mockOnEditMaterial}
        loading={false}
      />
    );

    // Desktop and mobile layouts show duplicate cost
    expect(screen.getAllByText('$45.50')).toHaveLength(2);
  });

  test('shows stock status', () => {
    render(
      <MaterialList
        materials={mockMaterials}
        onEditMaterial={mockOnEditMaterial}
        loading={false}
      />
    );

    // Premium Paper has stock (100) > reorder level (20), so should be OK
    expect(screen.getByText('OK')).toBeInTheDocument();
  });
});
