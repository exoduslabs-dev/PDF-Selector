import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { GroupManager } from '../GroupManager';
import { apiCall } from '../../../config/api';

// Mock the API call
jest.mock('../../../config/api');
const mockApiCall = apiCall as jest.MockedFunction<typeof apiCall>;

// Mock groups data
const mockGroups = [
  {
    group_id: '1',
    group_name: 'Paper Rolls',
    group_description: 'Various paper roll materials',
    group_color: '#3B82F6',
    sort_order: 1
  },
  {
    group_id: '2',
    group_name: 'Vinyl Sheets',
    group_description: 'Vinyl materials for signage',
    group_color: '#10B981',
    sort_order: 2
  },
  {
    group_id: '3',
    group_name: 'Fabric Materials',
    group_description: 'Textile-based materials',
    group_color: '#F59E0B',
    sort_order: 3
  }
];

describe('GroupManager', () => {
  const mockOnChanged = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Default successful API responses
    mockApiCall.mockImplementation((url: string, options?: any) => {
      if (url === '/api/material-groups' && !options) {
        // GET request
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ groups: mockGroups })
        } as Response);
      }
      
      // POST, PUT, DELETE requests
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({})
      } as Response);
    });
  });

  describe('Loading State', () => {
    it('displays loading message initially', async () => {
      render(<GroupManager onChanged={mockOnChanged} />);
      
      expect(screen.getByText('Loading…')).toBeInTheDocument();
      
      await waitFor(() => {
        expect(screen.queryByText('Loading…')).not.toBeInTheDocument();
      });
    });
  });

  describe('Groups Display', () => {
    beforeEach(async () => {
      render(<GroupManager onChanged={mockOnChanged} />);
      
      await waitFor(() => {
        expect(screen.queryByText('Loading…')).not.toBeInTheDocument();
      });
    });

    it('displays all groups correctly', () => {
      expect(screen.getByText('Paper Rolls')).toBeInTheDocument();
      expect(screen.getByText('Various paper roll materials')).toBeInTheDocument();
      expect(screen.getByText('Vinyl Sheets')).toBeInTheDocument();
      expect(screen.getByText('Vinyl materials for signage')).toBeInTheDocument();
      expect(screen.getByText('Fabric Materials')).toBeInTheDocument();
      expect(screen.getByText('Textile-based materials')).toBeInTheDocument();
    });

    it('displays edit buttons for each group', () => {
      const editButtons = screen.getAllByText('Edit');
      expect(editButtons).toHaveLength(3);
    });
  });

  describe('Add New Group', () => {
    beforeEach(async () => {
      render(<GroupManager onChanged={mockOnChanged} />);
      
      await waitFor(() => {
        expect(screen.queryByText('Loading…')).not.toBeInTheDocument();
      });
    });

    it('displays add new group form', () => {
      expect(screen.getByText('Add New Group')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Group name')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Description (optional)')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Sort order')).toBeInTheDocument();
      expect(screen.getByText('Add')).toBeInTheDocument();
    });

    it('allows typing in form fields', async () => {
      const user = userEvent.setup();
      
      const nameInput = screen.getByPlaceholderText('Group name');
      const descInput = screen.getByPlaceholderText('Description (optional)');
      const sortInput = screen.getByPlaceholderText('Sort order');

      await user.type(nameInput, 'New Group');
      await user.type(descInput, 'New group description');
      await user.clear(sortInput);
      await user.type(sortInput, '5');

      expect(nameInput).toHaveValue('New Group');
      expect(descInput).toHaveValue('New group description');
      expect(sortInput).toHaveValue(5);
    });

    it('submits new group correctly', async () => {
      const user = userEvent.setup();
      
      const nameInput = screen.getByPlaceholderText('Group name');
      const addButton = screen.getByText('Add');

      await user.type(nameInput, 'New Test Group');
      await user.click(addButton);

      await waitFor(() => {
        expect(mockApiCall).toHaveBeenCalledWith('/api/material-groups', {
          method: 'POST',
          body: JSON.stringify({
            group_name: 'New Test Group',
            group_description: '',
            group_color: '#888888',
            sort_order: 999
          })
        });
      });

      expect(mockOnChanged).toHaveBeenCalled();
    });

    it('disables add button when name is empty', () => {
      const addButton = screen.getByText('Add');
      expect(addButton).toBeDisabled();
    });

    it('enables add button when name is filled', async () => {
      const user = userEvent.setup();
      
      const nameInput = screen.getByPlaceholderText('Group name');
      const addButton = screen.getByText('Add');

      await user.type(nameInput, 'Test');

      expect(addButton).not.toBeDisabled();
    });
  });

  describe('Edit Group', () => {
    beforeEach(async () => {
      render(<GroupManager onChanged={mockOnChanged} />);
      
      await waitFor(() => {
        expect(screen.queryByText('Loading…')).not.toBeInTheDocument();
      });
    });

    it('opens edit panel when edit button is clicked', async () => {
      const user = userEvent.setup();
      const editButtons = screen.getAllByText('Edit');

      await user.click(editButtons[0]);

      expect(screen.getByText('Edit Group')).toBeInTheDocument();
      expect(screen.getByText('Close')).toBeInTheDocument();
      expect(screen.getByText('Configure group settings')).toBeInTheDocument();
    });

    it('populates edit form with existing group data', async () => {
      const user = userEvent.setup();
      const editButtons = screen.getAllByText('Edit');

      await user.click(editButtons[0]);

      const nameInput = screen.getByDisplayValue('Paper Rolls');
      const descInput = screen.getByDisplayValue('Various paper roll materials');
      const sortInput = screen.getByDisplayValue('1');

      expect(nameInput).toBeInTheDocument();
      expect(descInput).toBeInTheDocument();
      expect(sortInput).toBeInTheDocument();
    });

    it('updates group when fields are changed', async () => {
      const user = userEvent.setup();
      const editButtons = screen.getAllByText('Edit');

      await user.click(editButtons[0]);

      const nameInput = screen.getByDisplayValue('Paper Rolls');
      await user.clear(nameInput);
      await user.type(nameInput, 'Updated Paper Rolls');

      await waitFor(() => {
        expect(mockApiCall).toHaveBeenCalledWith('/api/material-groups/1', {
          method: 'PUT',
          body: JSON.stringify({ group_name: 'Updated Paper Rolls' })
        });
      });

      expect(mockOnChanged).toHaveBeenCalled();
    });

    it('closes edit panel when close button is clicked', async () => {
      const user = userEvent.setup();
      const editButtons = screen.getAllByText('Edit');

      await user.click(editButtons[0]);
      expect(screen.getByText('Edit Group')).toBeInTheDocument();

      const closeButton = screen.getByText('Close');
      await user.click(closeButton);

      expect(screen.queryByText('Edit Group')).not.toBeInTheDocument();
    });
  });

  describe('Delete Group', () => {
    beforeEach(async () => {
      render(<GroupManager onChanged={mockOnChanged} />);
      
      await waitFor(() => {
        expect(screen.queryByText('Loading…')).not.toBeInTheDocument();
      });

      // Mock window.confirm
      Object.defineProperty(window, 'confirm', {
        writable: true,
        value: jest.fn()
      });
    });

    it('shows delete button in edit mode', async () => {
      const user = userEvent.setup();
      const editButtons = screen.getAllByText('Edit');

      await user.click(editButtons[0]);

      expect(screen.getByText('Delete')).toBeInTheDocument();
    });

    it('asks for confirmation before deleting', async () => {
      const user = userEvent.setup();
      const confirmSpy = jest.spyOn(window, 'confirm').mockReturnValue(false);
      
      const editButtons = screen.getAllByText('Edit');
      await user.click(editButtons[0]);

      const deleteButton = screen.getByText('Delete');
      await user.click(deleteButton);

      expect(confirmSpy).toHaveBeenCalledWith('Delete this group?');
      expect(mockApiCall).not.toHaveBeenCalledWith('/api/material-groups/1', { method: 'DELETE' });
    });

    it('deletes group when confirmed', async () => {
      const user = userEvent.setup();
      jest.spyOn(window, 'confirm').mockReturnValue(true);
      
      const editButtons = screen.getAllByText('Edit');
      await user.click(editButtons[0]);

      const deleteButton = screen.getByText('Delete');
      await user.click(deleteButton);

      await waitFor(() => {
        expect(mockApiCall).toHaveBeenCalledWith('/api/material-groups/1', { method: 'DELETE' });
      });

      expect(mockOnChanged).toHaveBeenCalled();
    });

    it('handles delete errors gracefully', async () => {
      const user = userEvent.setup();
      jest.spyOn(window, 'confirm').mockReturnValue(true);
      
      // Mock delete failure
      mockApiCall.mockImplementation((url: string, options?: any) => {
        if (url === '/api/material-groups/1' && options?.method === 'DELETE') {
          return Promise.resolve({
            ok: false,
            json: () => Promise.resolve({ error: 'Delete failed' })
          } as Response);
        }
        
        // Default to successful load
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ groups: mockGroups })
        } as Response);
      });

      // Mock window.alert
      const alertSpy = jest.spyOn(window, 'alert').mockImplementation(() => {});

      const editButtons = screen.getAllByText('Edit');
      await user.click(editButtons[0]);

      const deleteButton = screen.getByText('Delete');
      await user.click(deleteButton);

      await waitFor(() => {
        expect(alertSpy).toHaveBeenCalledWith('Delete failed');
      });

      alertSpy.mockRestore();
    });
  });

  describe('API Error Handling', () => {
    it('handles loading error gracefully', async () => {
      mockApiCall.mockRejectedValue(new Error('Network error'));

      render(<GroupManager onChanged={mockOnChanged} />);

      await waitFor(() => {
        expect(screen.queryByText('Loading…')).not.toBeInTheDocument();
      });

      // Should still render the form even if loading fails
      expect(screen.getByText('Add New Group')).toBeInTheDocument();
    });

    it('handles save error gracefully', async () => {
      mockApiCall.mockImplementation((url: string, options?: any) => {
        if (options?.method === 'POST') {
          return Promise.resolve({
            ok: false,
            json: () => Promise.resolve({ error: 'Save failed' })
          } as Response);
        }
        
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ groups: mockGroups })
        } as Response);
      });

      render(<GroupManager onChanged={mockOnChanged} />);
      
      await waitFor(() => {
        expect(screen.queryByText('Loading…')).not.toBeInTheDocument();
      });

      const user = userEvent.setup();
      const nameInput = screen.getByPlaceholderText('Group name');
      const addButton = screen.getByText('Add');

      await user.type(nameInput, 'Test Group');
      await user.click(addButton);

      // Should not call onChanged if save fails
      await waitFor(() => {
        expect(mockOnChanged).not.toHaveBeenCalled();
      });
    });
  });
});
