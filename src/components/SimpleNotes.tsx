import React, { useState, useCallback, memo, useMemo } from 'react';
import { Textarea } from './ui/textarea';
import { Button } from './ui/button';

interface SimpleNotesProps {
  initialNotes?: string;
  onSave: (notes: string) => Promise<void>;
  disabled?: boolean;
}

// Custom memo comparison to prevent unnecessary re-renders
const areEqual = (prev: SimpleNotesProps, next: SimpleNotesProps) => {
  return prev.initialNotes === next.initialNotes && 
         prev.disabled === next.disabled &&
         prev.onSave === next.onSave;
};

export const SimpleNotes = memo(function SimpleNotes({ initialNotes = '', onSave, disabled = false }: SimpleNotesProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [notes, setNotes] = useState(initialNotes);
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = useCallback(async () => {
    if (isSaving) return;
    
    setIsSaving(true);
    try {
      console.log('SimpleNotes: Attempting to save notes:', notes);
      await onSave(notes);
      console.log('SimpleNotes: Notes saved successfully');
      setIsEditing(false);
    } catch (error) {
      console.error('SimpleNotes: Failed to save notes:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      alert(`Failed to save notes: ${errorMessage}`);
    } finally {
      setIsSaving(false);
    }
  }, [isSaving, notes, onSave]);

  const handleCancel = useCallback(() => {
    setNotes(initialNotes);
    setIsEditing(false);
  }, [initialNotes]);

  // Use React.startTransition for non-urgent updates
  const handleEditOptimized = useCallback(() => {
    React.startTransition(() => {
      setNotes(initialNotes);
      setIsEditing(true);
    });
  }, [initialNotes]);

  // Memoized style objects to prevent re-creation
  const actionContainerStyle = useMemo(() => ({ width: 140 }), []);

  // Optimized change handler with minimal allocations
  const handleNotesChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setNotes(value);
  }, []);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      handleCancel();
    } else if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      handleSave();
    }
  }, [handleCancel, handleSave]);

  // Optimized header with stable dimensions
  const Header = (
    <div className="flex items-center justify-between">
      <span className="font-medium text-gray-700 text-sm">Notes:</span>
      <div className="h-6" style={actionContainerStyle}>
        {isEditing && (
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={handleSave}
              disabled={isSaving}
              className="h-6 px-2 text-xs text-green-600 hover:text-green-800 border-green-300 hover:border-green-400 will-change-auto"
            >
              {isSaving ? 'Saving...' : 'Save'}
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={handleCancel}
              disabled={isSaving}
              className="h-6 px-2 text-xs text-red-600 hover:text-red-800 border-red-300 hover:border-red-400 will-change-auto"
            >
              Cancel
            </Button>
          </div>
        )}
      </div>
    </div>
  );

  if (isEditing) {
    return (
      <div className="space-y-2" onClick={(e) => e.stopPropagation()}>
        {Header}
        <Textarea
          value={notes}
          onChange={handleNotesChange}
          placeholder="Enter your notes here..."
          className="min-h-20 text-sm will-change-auto"
          autoFocus
          disabled={isSaving}
          onKeyDown={handleKeyDown}
          style={{ contain: 'layout' }}
        />
      </div>
    );
  }

  // View mode: click anywhere on the notes block to start editing.
  return (
    <div className="space-y-2" onClick={(e) => e.stopPropagation()}>
      {Header}
      <button
        type="button"
        onClick={disabled ? undefined : handleEditOptimized}
        disabled={disabled}
        className="w-full text-left will-change-auto"
        aria-label={initialNotes ? 'Edit notes' : 'Add note'}
        style={{ contain: 'layout' }}
      >
        {initialNotes ? (
          <div className="text-sm text-gray-700 whitespace-pre-wrap p-2 bg-gray-50 rounded border min-h-20 will-change-auto">
            {initialNotes}
          </div>
        ) : (
          <div className="text-sm text-gray-500 italic p-2 bg-gray-50 rounded border min-h-20 will-change-auto">
            Click to add notes
          </div>
        )}
      </button>
    </div>
  );
}, areEqual);
