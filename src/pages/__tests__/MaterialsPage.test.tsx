import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MaterialsPage } from '../MaterialsPage';
import { apiCall } from '../../config/api';

// Mock the API call
jest.mock('../../config/api');
const mockApiCall = apiCall as jest.MockedFunction<typeof apiCall>;

// Mock child components
jest.mock('../../components/materials/MaterialFormModal', () => ({
  MaterialFormModal: ({ isOpen, onClose, material }: any) => (
    isOpen ? (
      <div data-testid="material-form-modal">
        <div>Material Form Modal</div>
        <div>{material ? `Editing: ${material.material_name}` : 'Adding new material'}</div>
        <button onClick={onClose}>Close Modal</button>
      </div>
    ) : null
  )
}));

jest.mock('../../components/materials/MaterialList', () => ({
  MaterialList: ({ materials, onEditMaterial, loading }: any) => (
    <div data-testid="material-list">
      {loading ? (
        <div>Loading materials...</div>
      ) : (
        <div>
          <div>Materials count: {materials.length}</div>
          {materials.map((material: any) => (
            <div key={material.material_id}>
              <div>{material.material_name}</div>
              <button onClick={() => onEditMaterial(material)}>Edit {material.material_name}</button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}));

jest.mock('../../components/materials/GroupManager', () => ({
  GroupManager: ({ onChanged }: any) => (
    <div data-testid="group-manager">
      <div>Group Manager Component</div>
      <button onClick={onChanged}>Test Group Change</button>
    </div>
  )
}));

// Mock data
const mockMaterials = [
  {
    material_id: '1',
    material_code: 'MAT001',
    material_name: 'Premium Paper',
    substrate_type: 'paper',
    substrate_group: 'paper_rolls'
  },
  {
    material_id: '2',
    material_code: 'MAT002',
    material_name: 'Vinyl Material',
    substrate_type: 'vinyl',
    substrate_group: 'vinyl_sheets'
  }
];

const mockFieldOptions = {
  substrate_types: ['paper', 'vinyl', 'fabric'],
  adhesive_types: ['permanent', 'removable'],
  handling_types: ['normal', 'careful'],
  coating_types: ['matte', 'gloss'],
  pricing_units: ['sqm', 'linear_meter']
};

const mockMaterialGroups = {
  groups: [
    { group_id: '1', group_name: 'Paper Rolls' },
    { group_id: '2', group_name: 'Vinyl Sheets' }
  ]
};

describe('MaterialsPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock successful API responses
    mockApiCall.mockImplementation((url: string) => {
      if (url === '/api/materials') {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockMaterials)
        } as Response);
      }
      
      if (url === '/api/field-options') {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockFieldOptions)
        } as Response);
      }
      
      if (url === '/api/material-groups') {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockMaterialGroups)
        } as Response);
      }
      
      return Promise.resolve({ ok: true } as Response);
    });
  });

  describe('Page Rendering', () => {
    it('renders page header correctly', async () => {
      render(<MaterialsPage />);
      
      expect(screen.getByText('Materials Management')).toBeInTheDocument();
      expect(screen.getByText('Manage your printing materials, pricing, and supplier information')).toBeInTheDocument();
    });

    it('renders action buttons in header', async () => {
      render(<MaterialsPage />);
      
      expect(screen.getByText('⚙️ Groups')).toBeInTheDocument();
      expect(screen.getByText('📁 Import CSV')).toBeInTheDocument();
      expect(screen.getByText('+ Add Material')).toBeInTheDocument();
      expect(screen.getByText('Refresh')).toBeInTheDocument();
    });

    it('renders search and filter controls', async () => {
      render(<MaterialsPage />);
      
      expect(screen.getByPlaceholderText('Search materials by name, code, substrate type, or aliases...')).toBeInTheDocument();
      expect(screen.getByDisplayValue('All Substrate Groups')).toBeInTheDocument();
    });
  });

  describe('Data Loading', () => {
    it('loads materials on mount', async () => {
      render(<MaterialsPage />);
      
      await waitFor(() => {
        expect(mockApiCall).toHaveBeenCalledWith('/api/materials');
        expect(mockApiCall).toHaveBeenCalledWith('/api/field-options');
        expect(mockApiCall).toHaveBeenCalledWith('/api/material-groups');
      });
    });

    it('displays materials count', async () => {
      render(<MaterialsPage />);
      
      await waitFor(() => {
        expect(screen.getByText('Showing 2 of 2 materials')).toBeInTheDocument();
      });
    });

    it('displays loading state initially', () => {
      render(<MaterialsPage />);
      
      expect(screen.getByText('Loading materials...')).toBeInTheDocument();
    });

    it('hides loading state after data loads', async () => {
      render(<MaterialsPage />);
      
      await waitFor(() => {
        expect(screen.queryByText('Loading materials...')).not.toBeInTheDocument();
      });
    });
  });

  describe('Search and Filter', () => {
    beforeEach(async () => {
      render(<MaterialsPage />);
      
      await waitFor(() => {
        expect(screen.queryByText('Loading materials...')).not.toBeInTheDocument();
      });
    });

    it('filters materials by search term', async () => {
      const user = userEvent.setup();
      const searchInput = screen.getByPlaceholderText('Search materials by name, code, substrate type, or aliases...');
      
      await user.type(searchInput, 'Premium');
      
      await waitFor(() => {
        expect(screen.getByText('Showing 1 of 2 materials')).toBeInTheDocument();
      });
    });

    it('filters materials by group', async () => {
      const user = userEvent.setup();
      
      // Wait for groups to load
      await waitFor(() => {
        expect(screen.getByText('Paper Rolls')).toBeInTheDocument();
      });
      
      const filterSelect = screen.getByDisplayValue('All Substrate Groups');
      await user.selectOptions(filterSelect, '1');
      
      // Should filter to materials with substrate_group matching "Paper Rolls"
      await waitFor(() => {
        expect(screen.getByText('Showing 1 of 2 materials')).toBeInTheDocument();
      });
    });

    it('combines search and filter correctly', async () => {
      const user = userEvent.setup();
      const searchInput = screen.getByPlaceholderText('Search materials by name, code, substrate type, or aliases...');
      
      await user.type(searchInput, 'vinyl');
      
      await waitFor(() => {
        expect(screen.getByText('Showing 1 of 2 materials')).toBeInTheDocument();
      });
    });
  });

  describe('Material Modal Operations', () => {
    beforeEach(async () => {
      render(<MaterialsPage />);
      
      await waitFor(() => {
        expect(screen.queryByText('Loading materials...')).not.toBeInTheDocument();
      });
    });

    it('opens add material modal', async () => {
      const user = userEvent.setup();
      const addButton = screen.getByText('+ Add Material');
      
      await user.click(addButton);
      
      expect(screen.getByTestId('material-form-modal')).toBeInTheDocument();
      expect(screen.getByText('Adding new material')).toBeInTheDocument();
    });

    it('opens edit material modal', async () => {
      const user = userEvent.setup();
      const editButton = screen.getByText('Edit Premium Paper');
      
      await user.click(editButton);
      
      expect(screen.getByTestId('material-form-modal')).toBeInTheDocument();
      expect(screen.getByText('Editing: Premium Paper')).toBeInTheDocument();
    });

    it('closes modal correctly', async () => {
      const user = userEvent.setup();
      const addButton = screen.getByText('+ Add Material');
      
      await user.click(addButton);
      expect(screen.getByTestId('material-form-modal')).toBeInTheDocument();
      
      const closeButton = screen.getByText('Close Modal');
      await user.click(closeButton);
      
      expect(screen.queryByTestId('material-form-modal')).not.toBeInTheDocument();
    });
  });

  describe('Group Management Modal', () => {
    beforeEach(async () => {
      render(<MaterialsPage />);
      
      await waitFor(() => {
        expect(screen.queryByText('Loading materials...')).not.toBeInTheDocument();
      });
    });

    it('opens group management modal', async () => {
      const user = userEvent.setup();
      const groupsButton = screen.getByText('⚙️ Groups');
      
      await user.click(groupsButton);
      
      expect(screen.getByText('Material Groups')).toBeInTheDocument();
      expect(screen.getByTestId('group-manager')).toBeInTheDocument();
    });

    it('closes group management modal', async () => {
      const user = userEvent.setup();
      const groupsButton = screen.getByText('⚙️ Groups');
      
      await user.click(groupsButton);
      expect(screen.getByText('Material Groups')).toBeInTheDocument();
      
      const closeButton = screen.getByText('Close');
      await user.click(closeButton);
      
      expect(screen.queryByText('Material Groups')).not.toBeInTheDocument();
    });
  });

  describe('CSV Upload Modal', () => {
    beforeEach(async () => {
      render(<MaterialsPage />);
      
      await waitFor(() => {
        expect(screen.queryByText('Loading materials...')).not.toBeInTheDocument();
      });
    });

    it('opens CSV upload modal', async () => {
      const user = userEvent.setup();
      const csvButton = screen.getByText('📁 Import CSV');
      
      await user.click(csvButton);
      
      expect(screen.getByText('Upload Materials from CSV')).toBeInTheDocument();
      expect(screen.getByText('📥 Download Template')).toBeInTheDocument();
    });

    it('downloads CSV template', async () => {
      const user = userEvent.setup();
      
      // Mock URL.createObjectURL and related methods
      global.URL.createObjectURL = jest.fn(() => 'blob:mock-url');
      global.URL.revokeObjectURL = jest.fn();
      
      const createElementSpy = jest.spyOn(document, 'createElement');
      const appendChildSpy = jest.spyOn(document.body, 'appendChild').mockImplementation(() => ({}) as any);
      const removeChildSpy = jest.spyOn(document.body, 'removeChild').mockImplementation(() => ({}) as any);
      
      const csvButton = screen.getByText('📁 Import CSV');
      await user.click(csvButton);
      
      const downloadButton = screen.getByText('📥 Download Template');
      await user.click(downloadButton);
      
      expect(createElementSpy).toHaveBeenCalledWith('a');
      expect(appendChildSpy).toHaveBeenCalled();
      expect(removeChildSpy).toHaveBeenCalled();
      
      createElementSpy.mockRestore();
      appendChildSpy.mockRestore();
      removeChildSpy.mockRestore();
    });

    it('closes CSV upload modal', async () => {
      const user = userEvent.setup();
      const csvButton = screen.getByText('📁 Import CSV');
      
      await user.click(csvButton);
      expect(screen.getByText('Upload Materials from CSV')).toBeInTheDocument();
      
      const cancelButton = screen.getByText('Cancel');
      await user.click(cancelButton);
      
      expect(screen.queryByText('Upload Materials from CSV')).not.toBeInTheDocument();
    });
  });

  describe('Refresh Functionality', () => {
    beforeEach(async () => {
      render(<MaterialsPage />);
      
      await waitFor(() => {
        expect(screen.queryByText('Loading materials...')).not.toBeInTheDocument();
      });
    });

    it('refreshes data when refresh button is clicked', async () => {
      const user = userEvent.setup();
      const refreshButton = screen.getByText('Refresh');
      
      // Clear previous calls
      jest.clearAllMocks();
      
      await user.click(refreshButton);
      
      expect(screen.getByText('Refreshing...')).toBeInTheDocument();
      
      await waitFor(() => {
        expect(mockApiCall).toHaveBeenCalledWith('/api/materials');
        expect(mockApiCall).toHaveBeenCalledWith('/api/field-options');
        expect(mockApiCall).toHaveBeenCalledWith('/api/material-groups');
      });
      
      await waitFor(() => {
        expect(screen.queryByText('Refreshing...')).not.toBeInTheDocument();
        expect(screen.getByText('Refresh')).toBeInTheDocument();
      });
    });
  });

  describe('Error Handling', () => {
    it('handles materials loading error gracefully', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      
      mockApiCall.mockImplementation((url: string) => {
        if (url === '/api/materials') {
          return Promise.reject(new Error('Network error'));
        }
        
        if (url === '/api/field-options') {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(mockFieldOptions)
          } as Response);
        }
        
        if (url === '/api/material-groups') {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(mockMaterialGroups)
          } as Response);
        }
        
        return Promise.resolve({ ok: true } as Response);
      });

      render(<MaterialsPage />);
      
      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith('Error loading materials:', expect.any(Error));
      });
      
      // Should still render the page structure
      expect(screen.getByText('Materials Management')).toBeInTheDocument();
      
      consoleSpy.mockRestore();
    });

    it('handles field options loading error gracefully', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      
      mockApiCall.mockImplementation((url: string) => {
        if (url === '/api/materials') {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(mockMaterials)
          } as Response);
        }
        
        if (url === '/api/field-options') {
          return Promise.reject(new Error('Network error'));
        }
        
        if (url === '/api/material-groups') {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(mockMaterialGroups)
          } as Response);
        }
        
        return Promise.resolve({ ok: true } as Response);
      });

      render(<MaterialsPage />);
      
      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith('Error loading field options:', expect.any(Error));
      });
      
      consoleSpy.mockRestore();
    });
  });
});
