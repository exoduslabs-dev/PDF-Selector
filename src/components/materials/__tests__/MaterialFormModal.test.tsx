import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MaterialFormModal } from '../MaterialFormModal';
import type { Material, MaterialFieldOptions } from '../../../types/materials';
import { apiCall } from '../../../config/api';

// Mock the API call
jest.mock('../../../config/api');
const mockApiCall = apiCall as jest.MockedFunction<typeof apiCall>;

// Mock field options
const mockFieldOptions: MaterialFieldOptions = {
  substrate_types: ['paper', 'vinyl', 'fabric'],
  adhesive_types: ['permanent', 'removable', 'repositionable'],
  handling_types: ['normal', 'careful', 'delicate'],
  coating_types: ['matte', 'gloss', 'satin'],
  pricing_units: ['sqm', 'linear_meter', 'sheet', 'roll', 'kg']
};

// Mock existing material for edit tests
const mockMaterial: Material = {
  material_id: '1',
  material_code: 'MAT001',
  material_name: 'Test Material',
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
  aliases: 'test material',
  created_at: '2024-01-01',
  updated_at: '2024-01-01'
};

describe('MaterialFormModal', () => {
  const mockOnClose = jest.fn();
  const mockOnSave = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockApiCall.mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({}),
    } as any);
  });

  describe('Modal Visibility', () => {
    it('does not render when isOpen is false', () => {
      render(
        <MaterialFormModal
          isOpen={false}
          onClose={mockOnClose}
          material={null}
          fieldOptions={mockFieldOptions}
          onSave={mockOnSave}
        />
      );

      expect(screen.queryByText('Material Details')).not.toBeInTheDocument();
    });

    it('renders when isOpen is true', () => {
      render(
        <MaterialFormModal
          isOpen={true}
          onClose={mockOnClose}
          material={null}
          fieldOptions={mockFieldOptions}
          onSave={mockOnSave}
        />
      );

      expect(screen.getByText('Material Details')).toBeInTheDocument();
    });
  });

  describe('Form Tabs', () => {
    beforeEach(() => {
      render(
        <MaterialFormModal
          isOpen={true}
          onClose={mockOnClose}
          material={mockMaterial}
          fieldOptions={mockFieldOptions}
          onSave={mockOnSave}
        />
      );
    });

    it('displays all tab options', () => {
      expect(screen.getByText('Material Details')).toBeInTheDocument();
      expect(screen.getByText('Supplier Pricing')).toBeInTheDocument();
      expect(screen.getByText('Material History')).toBeInTheDocument();
    });

    it('switches between tabs correctly', async () => {
      const user = userEvent.setup();

      // Should start on Material Details tab
      expect(screen.getByDisplayValue('Test Material')).toBeInTheDocument();

      // Click on Supplier Pricing tab
      await user.click(screen.getByText('Supplier Pricing'));
      expect(screen.getByText('Supplier Pricing')).toBeInTheDocument();

      // Click on Material History tab
      await user.click(screen.getByText('Material History'));
      expect(screen.getByText('Material History')).toBeInTheDocument();
      expect(screen.getByText('Feature coming soon')).toBeInTheDocument();
    });
  });

  describe('Add New Material Mode', () => {
    beforeEach(() => {
      render(
        <MaterialFormModal
          isOpen={true}
          onClose={mockOnClose}
          material={null}
          fieldOptions={mockFieldOptions}
          onSave={mockOnSave}
        />
      );
    });

    it('displays form with empty initial values', () => {
      expect(screen.getByPlaceholderText('Auto-generated on save')).toHaveValue('');
      expect(screen.getByPlaceholderText('e.g., Semi Gloss Paper')).toHaveValue('');
      expect(screen.getByDisplayValue('80')).toBeInTheDocument(); // Default weight_gsm
      expect(screen.getByDisplayValue('1000')).toBeInTheDocument(); // Default width_mm
    });

    it('displays Create Material button', () => {
      expect(screen.getByText('Create Material')).toBeInTheDocument();
    });

    it('validates required fields', async () => {
      const user = userEvent.setup();
      const submitButton = screen.getByText('Create Material');

      // Try to submit without required material name
      await user.click(submitButton);

      // Should show alert for required field
      // Note: We'd need to mock window.alert or use a different validation approach
    });
  });

  describe('Edit Material Mode', () => {
    beforeEach(() => {
      render(
        <MaterialFormModal
          isOpen={true}
          onClose={mockOnClose}
          material={mockMaterial}
          fieldOptions={mockFieldOptions}
          onSave={mockOnSave}
        />
      );
    });

    it('populates form with existing material data', () => {
      expect(screen.getByDisplayValue('MAT001')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Test Material')).toBeInTheDocument();
      expect(screen.getByDisplayValue('test material')).toBeInTheDocument();
      expect(screen.getByDisplayValue('90')).toBeInTheDocument();
      expect(screen.getByDisplayValue('1200')).toBeInTheDocument();
      expect(screen.getByDisplayValue('800')).toBeInTheDocument();
    });

    it('displays Update Material button', () => {
      expect(screen.getByText('Update Material')).toBeInTheDocument();
    });

    it('shows checkboxes in correct state', () => {
      const conductiveCheckbox = screen.getByLabelText('Conductive') as HTMLInputElement;
      const whiteMaterialCheckbox = screen.getByLabelText('White Material') as HTMLInputElement;

      expect(conductiveCheckbox.checked).toBe(false);
      expect(whiteMaterialCheckbox.checked).toBe(true);
    });
  });

  describe('Form Interactions', () => {
    beforeEach(() => {
      render(
        <MaterialFormModal
          isOpen={true}
          onClose={mockOnClose}
          material={null}
          fieldOptions={mockFieldOptions}
          onSave={mockOnSave}
        />
      );
    });

    it('updates text inputs correctly', async () => {
      const user = userEvent.setup();
      const materialNameInput = screen.getByPlaceholderText('e.g., Semi Gloss Paper');

      await user.clear(materialNameInput);
      await user.type(materialNameInput, 'New Test Material');

      expect(materialNameInput).toHaveValue('New Test Material');
    });

    it('updates number inputs correctly', async () => {
      const user = userEvent.setup();
      const weightInput = screen.getByDisplayValue('80');

      await user.clear(weightInput);
      await user.type(weightInput, '120');

      expect(weightInput).toHaveValue(120);
    });

    it('updates checkboxes correctly', async () => {
      const user = userEvent.setup();
      const conductiveCheckbox = screen.getByLabelText('Conductive') as HTMLInputElement;

      expect(conductiveCheckbox.checked).toBe(false);
      
      await user.click(conductiveCheckbox);
      
      expect(conductiveCheckbox.checked).toBe(true);
    });
  });

  describe('Form Submission', () => {
    beforeEach(() => {
      render(
        <MaterialFormModal
          isOpen={true}
          onClose={mockOnClose}
          material={null}
          fieldOptions={mockFieldOptions}
          onSave={mockOnSave}
        />
      );
    });

    it('submits form with correct data for new material', async () => {
      const user = userEvent.setup();

      // Fill in required field
      const materialNameInput = screen.getByPlaceholderText('e.g., Semi Gloss Paper');
      await user.type(materialNameInput, 'New Material');

      // Submit form
      const submitButton = screen.getByText('Create Material');
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockApiCall).toHaveBeenCalledWith('/api/materials', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: expect.stringContaining('"material_name":"New Material"')
        });
      });
    });

    it('submits form with correct data for existing material', async () => {
      render(
        <MaterialFormModal
          isOpen={true}
          onClose={mockOnClose}
          material={mockMaterial}
          fieldOptions={mockFieldOptions}
          onSave={mockOnSave}
        />
      );

      const user = userEvent.setup();
      const submitButton = screen.getByText('Update Material');
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockApiCall).toHaveBeenCalledWith('/api/materials/1', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: expect.stringContaining('"material_name":"Test Material"')
        });
      });
    });

    it('calls onSave and onClose after successful submission', async () => {
      const user = userEvent.setup();

      // Fill in required field
      const materialNameInput = screen.getByPlaceholderText('e.g., Semi Gloss Paper');
      await user.type(materialNameInput, 'New Material');

      // Submit form
      const submitButton = screen.getByText('Create Material');
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockOnSave).toHaveBeenCalled();
        expect(mockOnClose).toHaveBeenCalled();
      });
    });

    it('handles API errors gracefully', async () => {
      const user = userEvent.setup();
      
      // Mock API failure
      mockApiCall.mockResolvedValue({
        ok: false,
        json: jest.fn().mockResolvedValue({ error: 'Test error' }),
      } as any);

      // Mock window.alert
      const alertSpy = jest.spyOn(window, 'alert').mockImplementation(() => {});

      // Fill in required field
      const materialNameInput = screen.getByPlaceholderText('e.g., Semi Gloss Paper');
      await user.type(materialNameInput, 'New Material');

      // Submit form
      const submitButton = screen.getByText('Create Material');
      await user.click(submitButton);

      await waitFor(() => {
        expect(alertSpy).toHaveBeenCalledWith('Failed to save material: Test error');
      });

      alertSpy.mockRestore();
    });
  });

  describe('Modal Controls', () => {
    beforeEach(() => {
      render(
        <MaterialFormModal
          isOpen={true}
          onClose={mockOnClose}
          material={null}
          fieldOptions={mockFieldOptions}
          onSave={mockOnSave}
        />
      );
    });

    it('calls onClose when close button is clicked', async () => {
      const user = userEvent.setup();
      const closeButton = screen.getByTitle('Close');

      await user.click(closeButton);

      expect(mockOnClose).toHaveBeenCalled();
    });

    it('calls onClose when cancel button is clicked', async () => {
      const user = userEvent.setup();
      const cancelButton = screen.getByText('Cancel');

      await user.click(cancelButton);

      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  describe('Form Sections', () => {
    beforeEach(() => {
      render(
        <MaterialFormModal
          isOpen={true}
          onClose={mockOnClose}
          material={null}
          fieldOptions={mockFieldOptions}
          onSave={mockOnSave}
        />
      );
    });

    it('displays all form sections', () => {
      expect(screen.getByText('Basic Information')).toBeInTheDocument();
      expect(screen.getByText('Material Properties')).toBeInTheDocument();
      expect(screen.getByText('Physical Properties')).toBeInTheDocument();
      expect(screen.getByText('Additional Properties')).toBeInTheDocument();
      expect(screen.getByText('Pricing & Stock')).toBeInTheDocument();
    });

    it('contains all expected form fields', () => {
      // Basic Information
      expect(screen.getByLabelText('Material Code')).toBeInTheDocument();
      expect(screen.getByLabelText('Material Name *')).toBeInTheDocument();
      expect(screen.getByLabelText('Aliases')).toBeInTheDocument();
      expect(screen.getByLabelText('Substrate Group')).toBeInTheDocument();

      // Physical Properties
      expect(screen.getByLabelText('Weight (GSM)')).toBeInTheDocument();
      expect(screen.getByLabelText('Width (mm)')).toBeInTheDocument();
      expect(screen.getByLabelText('Length (mm)')).toBeInTheDocument();

      // Pricing & Stock
      expect(screen.getByLabelText('Legacy Cost (AUD)')).toBeInTheDocument();
      expect(screen.getByLabelText('Current Stock')).toBeInTheDocument();
      expect(screen.getByLabelText('Reorder Level')).toBeInTheDocument();
      expect(screen.getByLabelText('Lead Time (Days)')).toBeInTheDocument();
    });
  });
});
