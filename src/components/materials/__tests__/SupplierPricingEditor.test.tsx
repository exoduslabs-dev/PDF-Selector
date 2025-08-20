import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SupplierPricingEditor } from '../SupplierPricingEditor';
import type { MaterialFieldOptions } from '../../../types/materials';
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

// Mock pricing data
const mockPricingData = {
  items: [
    {
      pricing_id: '1',
      supplier_id: 'SUP001',
      supplier_name: 'Paper Co Ltd',
      cost_per_unit: 25.50,
      pricing_unit: 'sqm',
      is_preferred_supplier: true,
      is_active: true
    },
    {
      pricing_id: '2',
      supplier_id: 'SUP002',
      supplier_name: 'Material Supply Inc',
      cost_per_unit: 30.00,
      pricing_unit: 'sqm',
      is_preferred_supplier: false,
      is_active: true
    }
  ]
};

// Mock suppliers data
const mockSuppliersData = {
  suppliers: [
    { supplier_id: 'SUP001', supplier_name: 'Paper Co Ltd' },
    { supplier_id: 'SUP002', supplier_name: 'Material Supply Inc' },
    { supplier_id: 'SUP003', supplier_name: 'Global Materials' }
  ]
};

describe('SupplierPricingEditor', () => {
  const materialId = 'MAT001';

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Default API responses
    mockApiCall.mockImplementation((url: string, options?: any) => {
      if (url.includes('/api/material-pricing')) {
        if (options?.method === 'POST' || options?.method === 'PUT' || options?.method === 'DELETE') {
          return Promise.resolve({ ok: true } as Response);
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockPricingData)
        } as Response);
      }
      
      if (url === '/api/suppliers') {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockSuppliersData)
        } as Response);
      }
      
      return Promise.resolve({ ok: true } as Response);
    });
  });

  describe('Loading State', () => {
    it('displays loading message initially', async () => {
      render(
        <SupplierPricingEditor
          materialId={materialId}
          fieldOptions={mockFieldOptions}
        />
      );
      
      expect(screen.getByText('Loading pricing data...')).toBeInTheDocument();
      
      await waitFor(() => {
        expect(screen.queryByText('Loading pricing data...')).not.toBeInTheDocument();
      });
    });
  });

  describe('Header and Controls', () => {
    beforeEach(async () => {
      render(
        <SupplierPricingEditor
          materialId={materialId}
          fieldOptions={mockFieldOptions}
        />
      );
      
      await waitFor(() => {
        expect(screen.queryByText('Loading pricing data...')).not.toBeInTheDocument();
      });
    });

    it('displays component title and add button', () => {
      expect(screen.getByText('Supplier Pricing')).toBeInTheDocument();
      expect(screen.getByText('+ Add Pricing')).toBeInTheDocument();
    });

    it('displays helpful instructions', () => {
      expect(screen.getByText(/Click on a supplier name to edit pricing details/)).toBeInTheDocument();
    });

    it('displays table headers', () => {
      expect(screen.getByText('Supplier')).toBeInTheDocument();
      expect(screen.getByText('Cost (AUD)')).toBeInTheDocument();
      expect(screen.getByText('Unit')).toBeInTheDocument();
      expect(screen.getByText('Preferred')).toBeInTheDocument();
      expect(screen.getByText('Actions')).toBeInTheDocument();
    });
  });

  describe('Pricing Data Display', () => {
    beforeEach(async () => {
      render(
        <SupplierPricingEditor
          materialId={materialId}
          fieldOptions={mockFieldOptions}
        />
      );
      
      await waitFor(() => {
        expect(screen.queryByText('Loading pricing data...')).not.toBeInTheDocument();
      });
    });

    it('displays all pricing entries', () => {
      expect(screen.getByText('Paper Co Ltd')).toBeInTheDocument();
      expect(screen.getByText('Material Supply Inc')).toBeInTheDocument();
      expect(screen.getByText('$25.50')).toBeInTheDocument();
      expect(screen.getByText('$30.00')).toBeInTheDocument();
    });

    it('displays preferred supplier badge', () => {
      expect(screen.getByText('⭐ Preferred')).toBeInTheDocument();
    });

    it('displays pricing units correctly', () => {
      const perM2Elements = screen.getAllByText('per m²');
      expect(perM2Elements.length).toBeGreaterThan(0);
    });

    it('displays total count', () => {
      expect(screen.getByText('Total pricing entries: 2')).toBeInTheDocument();
    });
  });

  describe('Empty State', () => {
    beforeEach(() => {
      // Mock empty pricing data
      mockApiCall.mockImplementation((url: string, options?: any) => {
        if (url.includes('/api/material-pricing')) {
          if (options?.method === 'POST' || options?.method === 'PUT' || options?.method === 'DELETE') {
            return Promise.resolve({ ok: true } as Response);
          }
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ items: [] })
          } as Response);
        }
        
        if (url === '/api/suppliers') {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(mockSuppliersData)
          } as Response);
        }
        
        return Promise.resolve({ ok: true } as Response);
      });
    });

    it('displays empty state message and add button', async () => {
      render(
        <SupplierPricingEditor
          materialId={materialId}
          fieldOptions={mockFieldOptions}
        />
      );
      
      await waitFor(() => {
        expect(screen.getByText('No supplier pricing configured yet.')).toBeInTheDocument();
        expect(screen.getByText('Add First Pricing Entry')).toBeInTheDocument();
      });
    });
  });

  describe('Add New Pricing', () => {
    beforeEach(async () => {
      render(
        <SupplierPricingEditor
          materialId={materialId}
          fieldOptions={mockFieldOptions}
        />
      );
      
      await waitFor(() => {
        expect(screen.queryByText('Loading pricing data...')).not.toBeInTheDocument();
      });
    });

    it('opens edit mode when add pricing button is clicked', async () => {
      const user = userEvent.setup();
      const addButton = screen.getByText('+ Add Pricing');

      await user.click(addButton);

      expect(screen.getByText('Save')).toBeInTheDocument();
      expect(screen.getByText('Cancel')).toBeInTheDocument();
    });

    it('shows supplier dropdown in edit mode', async () => {
      const user = userEvent.setup();
      const addButton = screen.getByText('+ Add Pricing');

      await user.click(addButton);

      const supplierSelect = screen.getByDisplayValue('(No supplier)');
      expect(supplierSelect).toBeInTheDocument();
    });

    it('allows selecting supplier and entering price', async () => {
      const user = userEvent.setup();
      const addButton = screen.getByText('+ Add Pricing');

      await user.click(addButton);

      const supplierSelect = screen.getByDisplayValue('(No supplier)');
      await user.selectOptions(supplierSelect, 'SUP001');

      const priceInput = screen.getByPlaceholderText('0.00');
      await user.clear(priceInput);
      await user.type(priceInput, '35.75');

      expect(supplierSelect).toHaveValue('SUP001');
      expect(priceInput).toHaveValue(35.75);
    });

    it('submits new pricing entry correctly', async () => {
      const user = userEvent.setup();
      const addButton = screen.getByText('+ Add Pricing');

      await user.click(addButton);

      const supplierSelect = screen.getByDisplayValue('(No supplier)');
      await user.selectOptions(supplierSelect, 'SUP001');

      const priceInput = screen.getByPlaceholderText('0.00');
      await user.clear(priceInput);
      await user.type(priceInput, '35.75');

      const saveButton = screen.getByText('Save');
      await user.click(saveButton);

      await waitFor(() => {
        expect(mockApiCall).toHaveBeenCalledWith('/api/material-pricing', {
          method: 'POST',
          body: JSON.stringify({
            material_id: materialId,
            supplier_id: 'SUP001',
            cost_per_unit: 35.75,
            pricing_unit: 'sqm'
          })
        });
      });
    });

    it('validates price input', async () => {
      const user = userEvent.setup();
      const alertSpy = jest.spyOn(window, 'alert').mockImplementation(() => {});
      
      const addButton = screen.getByText('+ Add Pricing');
      await user.click(addButton);

      const saveButton = screen.getByText('Save');
      await user.click(saveButton);

      expect(alertSpy).toHaveBeenCalledWith('Enter a valid price');
      alertSpy.mockRestore();
    });
  });

  describe('Edit Existing Pricing', () => {
    beforeEach(async () => {
      render(
        <SupplierPricingEditor
          materialId={materialId}
          fieldOptions={mockFieldOptions}
        />
      );
      
      await waitFor(() => {
        expect(screen.queryByText('Loading pricing data...')).not.toBeInTheDocument();
      });
    });

    it('opens edit mode when supplier name is clicked', async () => {
      const user = userEvent.setup();
      const supplierButton = screen.getByText('Paper Co Ltd');

      await user.click(supplierButton);

      expect(screen.getByDisplayValue('SUP001')).toBeInTheDocument();
      expect(screen.getByDisplayValue('25.5')).toBeInTheDocument();
    });

    it('opens edit mode when edit button is clicked', async () => {
      const user = userEvent.setup();
      const editButtons = screen.getAllByText('Edit');

      await user.click(editButtons[0]);

      expect(screen.getByDisplayValue('SUP001')).toBeInTheDocument();
      expect(screen.getByDisplayValue('25.5')).toBeInTheDocument();
    });

    it('updates existing pricing entry correctly', async () => {
      const user = userEvent.setup();
      const editButtons = screen.getAllByText('Edit');

      await user.click(editButtons[0]);

      const priceInput = screen.getByDisplayValue('25.5');
      await user.clear(priceInput);
      await user.type(priceInput, '28.00');

      const saveButton = screen.getByText('Save');
      await user.click(saveButton);

      await waitFor(() => {
        expect(mockApiCall).toHaveBeenCalledWith('/api/material-pricing/1', {
          method: 'PUT',
          body: JSON.stringify({
            supplier_id: 'SUP001',
            cost_per_unit: 28.00,
            pricing_unit: 'sqm'
          })
        });
      });
    });

    it('cancels editing correctly', async () => {
      const user = userEvent.setup();
      const editButtons = screen.getAllByText('Edit');

      await user.click(editButtons[0]);

      const cancelButton = screen.getByText('Cancel');
      await user.click(cancelButton);

      expect(screen.queryByText('Save')).not.toBeInTheDocument();
      expect(screen.getByText('Paper Co Ltd')).toBeInTheDocument();
    });
  });

  describe('Delete Pricing', () => {
    beforeEach(async () => {
      render(
        <SupplierPricingEditor
          materialId={materialId}
          fieldOptions={mockFieldOptions}
        />
      );
      
      await waitFor(() => {
        expect(screen.queryByText('Loading pricing data...')).not.toBeInTheDocument();
      });

      // Mock window.confirm
      Object.defineProperty(window, 'confirm', {
        writable: true,
        value: jest.fn()
      });
    });

    it('asks for confirmation before deleting', async () => {
      const user = userEvent.setup();
      const confirmSpy = jest.spyOn(window, 'confirm').mockReturnValue(false);
      
      const deleteButtons = screen.getAllByText('Delete');
      await user.click(deleteButtons[0]);

      expect(confirmSpy).toHaveBeenCalledWith('Delete this pricing entry?');
      expect(mockApiCall).not.toHaveBeenCalledWith('/api/material-pricing/1', { method: 'DELETE' });
    });

    it('deletes pricing when confirmed', async () => {
      const user = userEvent.setup();
      jest.spyOn(window, 'confirm').mockReturnValue(true);
      
      const deleteButtons = screen.getAllByText('Delete');
      await user.click(deleteButtons[0]);

      await waitFor(() => {
        expect(mockApiCall).toHaveBeenCalledWith('/api/material-pricing/1', { method: 'DELETE' });
      });
    });

    it('handles delete errors gracefully', async () => {
      const user = userEvent.setup();
      jest.spyOn(window, 'confirm').mockReturnValue(true);
      
      // Mock delete failure
      mockApiCall.mockImplementation((url: string, options?: any) => {
        if (url.includes('/api/material-pricing/1') && options?.method === 'DELETE') {
          return Promise.resolve({ ok: false } as Response);
        }
        
        // Default successful responses
        if (url.includes('/api/material-pricing')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(mockPricingData)
          } as Response);
        }
        
        if (url === '/api/suppliers') {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(mockSuppliersData)
          } as Response);
        }
        
        return Promise.resolve({ ok: true } as Response);
      });

      const alertSpy = jest.spyOn(window, 'alert').mockImplementation(() => {});

      const deleteButtons = screen.getAllByText('Delete');
      await user.click(deleteButtons[0]);

      await waitFor(() => {
        expect(alertSpy).toHaveBeenCalledWith('Failed to delete pricing');
      });

      alertSpy.mockRestore();
    });
  });

  describe('Error Handling', () => {
    it('handles API errors during load', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      
      mockApiCall.mockRejectedValue(new Error('Network error'));

      render(
        <SupplierPricingEditor
          materialId={materialId}
          fieldOptions={mockFieldOptions}
        />
      );

      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith('Failed to load pricing data:', expect.any(Error));
      });

      consoleSpy.mockRestore();
    });

    it('handles save errors gracefully', async () => {
      mockApiCall.mockImplementation((url: string, options?: any) => {
        if (options?.method === 'POST') {
          return Promise.resolve({ ok: false } as Response);
        }
        
        if (url.includes('/api/material-pricing')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(mockPricingData)
          } as Response);
        }
        
        if (url === '/api/suppliers') {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(mockSuppliersData)
          } as Response);
        }
        
        return Promise.resolve({ ok: true } as Response);
      });

      render(
        <SupplierPricingEditor
          materialId={materialId}
          fieldOptions={mockFieldOptions}
        />
      );
      
      await waitFor(() => {
        expect(screen.queryByText('Loading pricing data...')).not.toBeInTheDocument();
      });

      const user = userEvent.setup();
      const alertSpy = jest.spyOn(window, 'alert').mockImplementation(() => {});

      const addButton = screen.getByText('+ Add Pricing');
      await user.click(addButton);

      const priceInput = screen.getByPlaceholderText('0.00');
      await user.type(priceInput, '25.00');

      const saveButton = screen.getByText('Save');
      await user.click(saveButton);

      await waitFor(() => {
        expect(alertSpy).toHaveBeenCalledWith('Failed to save pricing');
      });

      alertSpy.mockRestore();
    });
  });
});
