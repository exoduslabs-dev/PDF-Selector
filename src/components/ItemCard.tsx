import React, { useState, useEffect, useCallback, useMemo } from 'react';
 
import { FileDropZone } from './FileDropZone';
import { PdfThumbnailFromPath } from './PdfThumbnail';
import { API_BASE_URL } from '../config/api';
import { Textarea } from './ui/textarea';
import { Button } from './ui/button';
import { SimpleNotes } from './SimpleNotes';

interface SizeGroup {
  size: string;
  lineCount: number;
  totalQuantity: number;
  individualQuantities: string;
  products: string;
  materials: string;
  lineIdentifiers: string;
  descriptions: string;
  notes?: string;
  processed?: boolean;
}

interface FileInfo {
  filename: string;
  filelocation: string;
  uploadedat: string;
}

interface FileThumbnail {
  filename: string;
  filePath: string;
  fileType: string;
  size?: number;
}

interface ItemCardProps {
  id: string;
  customerName: string;
  orderDate: string;
  dueDate: string;
  sizeVariations: number;
  totalLines: number;
  totalQuantity: number;
  sizeGroups: SizeGroup[];
  type: 'quote' | 'job';
  title: string;
  subtitle?: string;
  onDataChange?: () => void; // Callback to trigger data refresh in parent
  preservedState?: { item: boolean, sizes: string[] }; // State to preserve during refresh
  onStateChange?: (state: { item: boolean, sizes: string[] }) => void; // Callback to save state
  onLocalNotesUpdate?: (size: string, notes: string) => void; // Optimistically update notes without full refresh
}

export function ItemCard({ 
  id, 
  customerName, 
  orderDate, 
  dueDate, 
  sizeVariations, 
  totalLines, 
  totalQuantity, 
  sizeGroups, 
  type, 
  title,
  subtitle,
  onDataChange,
  preservedState,
  onStateChange,
  onLocalNotesUpdate
}: ItemCardProps) {
  const [expandedItem, setExpandedItem] = useState(preservedState?.item || false);
  const [expandedSizes, setExpandedSizes] = useState<Set<string>>(new Set(preservedState?.sizes || []));
  const [fileThumbnails, setFileThumbnails] = useState<Record<string, FileThumbnail[]>>({});
  const [submitting, setSubmitting] = useState<Set<string>>(new Set());
  const [locallySubmitted, setLocallySubmitted] = useState<Set<string>>(new Set()); // Track locally submitted items
  const [pendingServerConfirm, setPendingServerConfirm] = useState<Set<string>>(new Set());
  const [processing, setProcessing] = useState<Set<string>>(new Set()); // Track processing animations
  const [deleting, setDeleting] = useState<Set<string>>(new Set()); // Track file deletion animations
  const [uploadingFiles, setUploadingFiles] = useState<Set<string>>(new Set()); // Track files being uploaded
  const [quoteFilesAvailable, setQuoteFilesAvailable] = useState<Record<string, boolean>>({}); // Track which size groups have quote files available
  // Notes functionality moved to SimpleNotes component
 

  // Memoize stable keys to prevent unnecessary re-renders
  const stableKeys = useMemo(() => 
    sizeGroups.map(sg => `${id}-${sg.size}`), 
    [id, sizeGroups]
  );

  // Memoized notes callbacks to prevent SimpleNotes re-renders during typing
  const noteSaveCallbacks = useMemo(() => {
    const callbacks: Record<string, (notes: string) => Promise<void>> = {};
    
    sizeGroups.forEach(sizeGroup => {
      const key = `${id}-${sizeGroup.size}`;
      callbacks[key] = async (notes: string) => {
        // Direct API call without complex state management
        const response = await fetch(`${API_BASE_URL}/api/update-quote-notes`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            quoteId: id,
            size: sizeGroup.size,
            notes: notes.trim()
          })
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Failed to save notes: ${response.status} ${errorText}`);
        }
        // Optimistically update just this note locally to avoid full list refresh
        if (onLocalNotesUpdate) {
          onLocalNotesUpdate(sizeGroup.size, notes.trim());
        } else if (onDataChange) {
          // Fallback: refresh if no local update handler provided
          setTimeout(() => onDataChange(), 100);
        }
      };
    });
    
    return callbacks;
  }, [id, sizeGroups, onDataChange, onLocalNotesUpdate]);

  // Save state changes to parent when state actually changes
  useEffect(() => {
    if (onStateChange) {
      onStateChange({
        item: expandedItem,
        sizes: Array.from(expandedSizes)
      });
    }
  }, [expandedItem, expandedSizes]);

  // Removed debug logging to improve performance

  // Reconcile locallySubmitted with server data (remove any that server has now confirmed)
  useEffect(() => {
    if (!sizeGroups) return;
    setLocallySubmitted(prev => {
      const next = new Set(prev);
      sizeGroups.forEach(sg => {
        if (sg.processed) next.delete(`${id}-${sg.size}`); // server authoritative now
      });
      return next;
    });
    setPendingServerConfirm(prev => {
      const next = new Set(prev);
      sizeGroups.forEach(sg => {
        if (sg.processed) next.delete(`${id}-${sg.size}`);
      });
      return next;
    });
  }, [sizeGroups, id]);

  // Optimized file loading with caching
  const loadExistingFiles = useCallback(async (size: string) => {
    const uploadKey = `${id}-${size}`;
    
    // Don't reload if we already have the data
    if (fileThumbnails[uploadKey] && fileThumbnails[uploadKey].length > 0) {
      return;
    }
    
    console.log('Loading existing files for uploadKey:', uploadKey);
    
    try {
      console.log(`Loading files for: customerName=${customerName}, size=${size}, quoteId=${id}`);
      const response = await fetch(`${API_BASE_URL}/api/get-files?customerName=${encodeURIComponent(customerName)}&size=${encodeURIComponent(size)}&quoteId=${encodeURIComponent(id)}`);
      
      if (response.ok) {
        const files: FileInfo[] = await response.json();
        console.log(`Found ${files.length} files:`, files.map(f => f.filename));
        
        // Initialize thumbnails for all files
        const thumbnails: FileThumbnail[] = files.map(file => ({
          filename: file.filename,
          filePath: file.filelocation,
          fileType: getFileType(file.filename)
        }));
        
        console.log('Setting thumbnails:', thumbnails);
        
        setFileThumbnails(prev => ({
          ...prev,
          [uploadKey]: thumbnails
        }));
        
        console.log('Completed loading all files for uploadKey:', uploadKey);
      } else {
        console.error('Failed to load files:', response.status, response.statusText);
      }
    } catch (error) {
      console.error('Error loading existing files:', error);
    }
  }, [customerName, id, fileThumbnails]);

  // Check if quote files are available for a size group (jobs only)
  const checkQuoteFilesAvailable = useCallback(async (size: string) => {
    if (type !== 'job') return;
    
    const uploadKey = `${id}-${size}`;
    
    // Don't check again if we already know the status
    if (quoteFilesAvailable[uploadKey] !== undefined) {
      return;
    }
    
    try {
      const response = await fetch(`${API_BASE_URL}/api/check-quote-files`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jobId: id,
          size: size,
          lineIdentifiers: sizeGroups.find(sg => sg.size === size)?.lineIdentifiers || ''
        })
      });
      
      if (response.ok) {
        const result = await response.json();
        setQuoteFilesAvailable(prev => ({
          ...prev,
          [uploadKey]: result.hasFiles || false
        }));
      }
    } catch (error) {
      console.error('Error checking quote files:', error);
      // Default to false if there's an error
      setQuoteFilesAvailable(prev => ({
        ...prev,
        [uploadKey]: false
      }));
    }
  }, [API_BASE_URL, id, type, sizeGroups, quoteFilesAvailable]);

  const toggleItem = useCallback(async () => {
    const willExpand = !expandedItem;
    setExpandedItem(willExpand);
    
    // If expanding, preload files for all size groups and check quote files availability
    if (willExpand) {
      for (const sizeGroup of sizeGroups) {
        await loadExistingFiles(sizeGroup.size);
        if (type === 'job') {
          await checkQuoteFilesAvailable(sizeGroup.size);
        }
      }
    }
  }, [expandedItem, sizeGroups, loadExistingFiles, type, checkQuoteFilesAvailable]);

  const toggleSize = useCallback(async (sizeKey: string) => {
    const newExpanded = new Set(expandedSizes);
    if (newExpanded.has(sizeKey)) {
      newExpanded.delete(sizeKey);
    } else {
      newExpanded.add(sizeKey);
      const size = sizeKey.split('-').slice(1).join('-');
      await loadExistingFiles(size);
    }
    setExpandedSizes(newExpanded);
  }, [expandedSizes, loadExistingFiles]);

  const getFileType = useCallback((fileName: string) => {
    return fileName.split('.').pop()?.toLowerCase() || 'unknown';
  }, []);

  // Optimized file upload handler with immediate local updates
  const handleFileUploaded = useCallback(async (sizeKey: string, fileName: string, filePath?: string) => {
    const uploadKey = sizeKey;
    
    // Immediately add the file to local state for instant UI update
    const sizePart = sizeKey.split('-').slice(1).join('-').trim();
    const safeCustomer = customerName.trim();
    const BASE_FILES_PATH = `/Volumes/Archives/Next-Label/database`;
    const resolvedPath = filePath || `${BASE_FILES_PATH}/${safeCustomer}/${sizePart}/${id}/files/${fileName}`;
    const newFile: FileThumbnail = {
      filename: fileName,
      filePath: resolvedPath,
      fileType: getFileType(fileName)
    };

    setFileThumbnails(prev => ({
      ...prev,
      [uploadKey]: [...(prev[uploadKey] || []), newFile]
    }));

    // Add processing animation for file upload
    const uploadProcessingKey = `upload-${sizeKey}-${fileName}`;
    setProcessing(prev => new Set(prev).add(uploadProcessingKey));

    // Wait 200ms for processing animation
    await new Promise(resolve => setTimeout(resolve, 200));

    try {
      // Trigger a lightweight refresh only for this specific item
      if (onDataChange) {
        // Use setTimeout to avoid blocking the UI
        setTimeout(() => onDataChange(), 100);
      }
    } finally {
      // End processing animation
      setProcessing(prev => { 
        const next = new Set(prev); 
        next.delete(uploadProcessingKey); 
        return next; 
      });
    }
  }, [customerName, id, onDataChange, getFileType]);

  // Create prepress package on server for both quotes and jobs
  const handlePrepress = useCallback(async (sizeGroup: SizeGroup) => {
    const stableKey = `${id}-${sizeGroup.size}`;
    const uploadKey = `${id}-${sizeGroup.size}`;
    
    // Check if there are any files attached
    const attachedFiles = fileThumbnails[uploadKey] || [];
    if (attachedFiles.length === 0) {
      const confirmWithoutFiles = confirm(
        `No files are attached to this size (${sizeGroup.size}). Do you want to proceed with ${type === 'quote' ? 'sending to prepress' : 'submitting'} anyway?`
      );
      if (!confirmWithoutFiles) {
        return; // User cancelled
      }
    }
    
    // Optimistic UI: mark as submitted and pending
    setLocallySubmitted(prev => new Set(prev).add(stableKey));
    setPendingServerConfirm(prev => new Set(prev).add(stableKey));
    setProcessing(prev => new Set(prev).add(stableKey));
    await new Promise(resolve => setTimeout(resolve, 150));
    try {
      const response = await fetch(`${API_BASE_URL}/api/prepress-package`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type,
          id,
          size: sizeGroup.size,
          lineIdentifiers: sizeGroup.lineIdentifiers
        })
      });
      if (!response.ok) {
        const txt = await response.text();
        throw new Error(txt || 'Failed to create prepress package');
      }
      const result = await response.json();
      console.log('Prepress package result:', result);
      // Refresh specific data so server-processed flags sync in
      if (onDataChange) {
        setTimeout(() => onDataChange(), 200);
      }
      alert('Prepress package created successfully');
    } catch (err) {
      console.error('Prepress error:', err);
      // Roll back optimistic flags
      setLocallySubmitted(prev => { const next = new Set(prev); next.delete(stableKey); return next; });
      setPendingServerConfirm(prev => { const next = new Set(prev); next.delete(stableKey); return next; });
      alert('Failed to create prepress package');
    } finally {
      setProcessing(prev => { const next = new Set(prev); next.delete(stableKey); return next; });
    }
  }, [API_BASE_URL, id, type, onDataChange, fileThumbnails]);

  // Import files from related quote for jobs
  const handleImportQuoteFiles = useCallback(async (sizeGroup: SizeGroup) => {
    const stableKey = `${id}-${sizeGroup.size}`;
    const uploadKey = `${id}-${sizeGroup.size}`;
    
    // Check if files were already imported
    const attachedFiles = fileThumbnails[uploadKey] || [];
    const hasImportedFiles = attachedFiles.some(file => 
      file.filePath && file.filePath.includes('Imported from quote')
    );
    
    if (hasImportedFiles) {
      alert('Files have already been imported from the quote for this size group.');
      return;
    }
    
    if (!confirm(`Import files from the related quote for size ${sizeGroup.size}?`)) {
      return;
    }

    setProcessing(prev => new Set(prev).add(stableKey));
    
    try {
      const response = await fetch(`${API_BASE_URL}/api/import-quote-files`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jobId: id,
          size: sizeGroup.size,
          lineIdentifiers: sizeGroup.lineIdentifiers
        })
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || 'Failed to import quote files');
      }
      
      const result = await response.json();
      
      if (result.errors && result.errors.length > 0) {
        alert(`Import completed with warnings:\n${result.errors.join('\n')}\n\nImported ${result.copiedFiles.length} files successfully.`);
      } else {
        alert(`Successfully imported ${result.copiedFiles.length} files from the quote.`);
      }
      
      // Refresh to show new files
      if (onDataChange) {
        setTimeout(() => onDataChange(), 200);
      }
      
      // Force reload files for this size group
      setTimeout(() => loadExistingFiles(sizeGroup.size), 300);
      
    } catch (error) {
      console.error('Import quote files error:', error);
      alert(`Failed to import quote files: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setProcessing(prev => { 
        const next = new Set(prev); 
        next.delete(stableKey); 
        return next; 
      });
    }
  }, [API_BASE_URL, id, onDataChange, fileThumbnails, loadExistingFiles]);

  // Optimized file deletion with immediate local updates
  const handleDeleteFile = useCallback(async (uploadKey: string, fileName: string) => {
    if (!confirm(`Are you sure you want to delete "${fileName}"?`)) {
      return;
    }

    const deleteKey = `${uploadKey}-${fileName}`;
    
    // Start delete processing animation
    setDeleting(prev => new Set(prev).add(deleteKey));

    // Immediately remove file from local state for instant UI update
    setFileThumbnails(prev => ({
      ...prev,
      [uploadKey]: prev[uploadKey]?.filter(thumb => thumb.filename !== fileName) || []
    }));

    // Wait 200ms for processing animation
    await new Promise(resolve => setTimeout(resolve, 200));

    try {
      const extractedSize = uploadKey.split('-').slice(1).join('-');
      console.log('Deleting file:', { fileName, customerName, size: extractedSize, quoteId: id });
      
      const response = await fetch(`${API_BASE_URL}/api/delete-file`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          filename: fileName,
          customerName,
          size: extractedSize,
          quoteId: id
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Delete API error:', response.status, errorText);
        throw new Error(`Failed to delete file: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();
      console.log('Delete success:', result);

      // File already removed from local state, just trigger refresh to sync with server
      if (onDataChange) {
        setTimeout(() => onDataChange(), 100);
      }

      // Show success message
      alert(`Successfully deleted "${fileName}"`);
    } catch (error) {
      console.error('Error deleting file:', error);
      
      // Revert the local state change on error
      setFileThumbnails(prev => {
        const originalFiles = fileThumbnails[uploadKey] || [];
        const deletedFile = originalFiles.find(f => f.filename === fileName);
        if (deletedFile) {
          return {
            ...prev,
            [uploadKey]: [...(prev[uploadKey] || []), deletedFile]
          };
        }
        return prev;
      });
      
      alert(`Failed to delete file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      // End delete processing animation
      setDeleting(prev => { 
        const next = new Set(prev); 
        next.delete(deleteKey); 
        return next; 
      });
    }
  }, [customerName, id, onDataChange, fileThumbnails]);

  // Optimized line submission with better error handling
  const handleSubmitLine = useCallback(async (sizeGroup: SizeGroup, index: number) => {
    const stableKey = `${id}-${sizeGroup.size}`;

    // Optimistic: mark locally submitted & pending confirmation immediately
    setLocallySubmitted(prev => new Set(prev).add(stableKey));
    setPendingServerConfirm(prev => new Set(prev).add(stableKey));

    // Start processing animation after optimistic update
    setProcessing(prev => new Set(prev).add(stableKey));

    // Wait 200ms for processing animation
    await new Promise(resolve => setTimeout(resolve, 200));

    try {
      const response = await fetch(`${API_BASE_URL}/api/submit-line`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, type, size: sizeGroup.size, lineIdentifiers: sizeGroup.lineIdentifiers })
      });
      
      if (!response.ok) {
        throw new Error('Failed to submit line');
      }
      
      // Kick off a lightweight refresh without triggering global loading state
      if (onDataChange) {
        setTimeout(() => onDataChange(), 400);
      }
    } catch (error) {
      console.error('Error submitting line:', error);
      // Revert optimistic flag on error
      setLocallySubmitted(prev => { 
        const next = new Set(prev); 
        next.delete(stableKey); 
        return next; 
      });
      setPendingServerConfirm(prev => { 
        const next = new Set(prev); 
        next.delete(stableKey); 
        return next; 
      });
      alert('Failed to submit line. Please try again.');
    } finally {
      // End processing animation
      setProcessing(prev => { 
        const next = new Set(prev); 
        next.delete(stableKey); 
        return next; 
      });
    }
  }, [id, type, onDataChange]);

  const formatDescription = useCallback((description: string) => {
    return description.split('||').map((part, index) => (
      <span key={index}>
        {part.trim()}
        {index < description.split('||').length - 1 && <br />}
      </span>
    ));
  }, []);

  const getFilePreview = useCallback((fileName: string) => {
    const extension = fileName.split('.').pop()?.toLowerCase();
    switch (extension) {
      case 'pdf':
        return '📄';
      case 'jpg':
      case 'jpeg':
      case 'png':
      case 'gif':
      case 'bmp':
      case 'webp':
        return '🖼️';
      case 'doc':
      case 'docx':
        return '📝';
      case 'xls':
      case 'xlsx':
        return '📊';
      case 'ppt':
      case 'pptx':
        return '📋';
      case 'zip':
      case 'rar':
      case '7z':
        return '🗜️';
      case 'txt':
        return '📄';
      case 'csv':
        return '📊';
      default:
        return '📎';
    }
  }, []);

  // Memoize the size groups rendering to improve performance
  const renderedSizeGroups = useMemo(() => {
    if (sizeGroups.length === 0) {
      return <p className="text-gray-500 italic">No size groups found</p>;
    }

  return (
            <div className="space-y-3">
              <h4 className="font-semibold text-sm text-gray-700 mb-3">Size Breakdown:</h4>
              {sizeGroups.map((sizeGroup, originalIndex) => {
                const stableKey = `${id}-${sizeGroup.size}`;
                const uploadKey = `${id}-${sizeGroup.size}`;
                const isProcessedServer = !!sizeGroup.processed;
                const isOptimistic = locallySubmitted.has(stableKey) && !isProcessedServer;
                const isProcessed = isProcessedServer || isOptimistic;
                const isPending = pendingServerConfirm.has(stableKey) && !isProcessedServer;
                const isProcessing = processing.has(stableKey);
                const expanded = expandedSizes.has(stableKey);
          
                return (
                  <div key={stableKey} className={`border border-gray-200 rounded-lg transition-all duration-300 ${!isProcessed ? 'bg-orange-50 border-orange-200' : 'bg-white'} ${isOptimistic ? 'opacity-90' : ''} ${isProcessing ? 'transform scale-[1.02] shadow-md' : ''}`}>
                    <div className="p-3 bg-blue-50 cursor-pointer hover:bg-blue-100 transition-colors" onClick={() => toggleSize(stableKey)}>
                <div className="flex justify-between items-center w-full">
                        <div className="flex items-center gap-4 flex-1 min-w-0">
                          <span className="font-medium text-blue-900">Size: {sizeGroup.size}</span>
                          <span className="text-sm text-gray-600">
                            {sizeGroup.lineCount} lines • {sizeGroup.totalQuantity.toLocaleString()} units
                          </span>
                    {(sizeGroup.individualQuantities || '').includes(',') && (
                            <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded">Multiple Qtys</span>
                          )}
                          {fileThumbnails[uploadKey] && fileThumbnails[uploadKey].length > 0 && (
                            <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded">
                              {fileThumbnails[uploadKey].length} file{fileThumbnails[uploadKey].length > 1 ? 's' : ''}
                            </span>
                          )}
                  </div>
                  <div className="flex items-center gap-2 ml-4">
                          {isProcessed && (
                            <span className={`px-3 py-1 text-xs rounded font-medium inline-flex items-center gap-1 ${isProcessedServer ? 'bg-gray-100 text-gray-600' : 'bg-gray-200 text-gray-700'} ${isProcessing ? 'animate-pulse' : ''}`}>
                              {isProcessing ? (
                                <>
                                  <svg className="animate-spin h-3 w-3" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 714 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                  </svg>
                                  Processing...
                                </>
                              ) : (
                                <>✓ {isProcessedServer ? 'Submitted' : (isPending ? 'Submitting…' : 'Submitted')}</>
                              )}
                            </span>
                          )}
                          {!isProcessed && (
                      type === 'quote' ? (
                        <div className="flex items-center gap-2">
                          <button
                            onClick={(e) => { e.stopPropagation(); handlePrepress(sizeGroup); }}
                            disabled={isProcessing}
                            className={`px-3 py-1 text-xs rounded font-medium min-w-[120px] inline-flex items-center justify-center gap-1 ${
                              isProcessing 
                                ? 'bg-blue-400 text-white cursor-not-allowed'
                                : 'bg-blue-500 hover:bg-blue-600 text-white'
                            }`}
                          >
                            {isProcessing ? (
                              <>
                                <svg className="animate-spin h-3 w-3" viewBox="0 0 24 24">
                                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle>
                                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 714 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                Processing...
                              </>
                            ) : (
                              'Send to prepress'
                            )}
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); }}
                            className="px-3 py-1 text-xs rounded font-medium min-w-[120px] inline-flex items-center justify-center gap-1 bg-gray-100 text-gray-700 hover:bg-gray-200"
                            type="button"
                          >
                            Download proof
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          {type === 'job' && quoteFilesAvailable[uploadKey] && (
                            <button
                              onClick={(e) => { e.stopPropagation(); handleImportQuoteFiles(sizeGroup); }}
                              disabled={isProcessing}
                              className={`px-3 py-1 text-xs rounded font-medium min-w-[120px] inline-flex items-center justify-center gap-1 ${
                                isProcessing 
                                  ? 'bg-green-400 text-white cursor-not-allowed'
                                  : 'bg-green-500 hover:bg-green-600 text-white'
                              }`}
                            >
                              {isProcessing ? (
                                <>
                                  <svg className="animate-spin h-3 w-3" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 818-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 714 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                  </svg>
                                  Importing...
                                </>
                              ) : (
                                'Use previous file'
                              )}
                            </button>
                          )}
                            <button
                          onClick={(e) => { e.stopPropagation(); handlePrepress(sizeGroup); }}
                              disabled={isProcessing}
                              className={`px-3 py-1 text-xs rounded font-medium min-w-[84px] inline-flex items-center justify-center gap-1 ${
                                isProcessing 
                                  ? 'bg-blue-400 text-white cursor-not-allowed'
                                  : 'bg-blue-500 hover:bg-blue-600 text-white'
                              }`}
                            >
                              {isProcessing ? (
                                <>
                                  <svg className="animate-spin h-3 w-3" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 714 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                  </svg>
                                  Processing...
                                </>
                              ) : (
                                'Submit'
                              )}
                            </button>
                        </div>
                      )
                          )}
                        </div>
                  <div className="w-8 flex justify-center ml-2">
                          <span className="text-lg text-blue-600 pointer-events-none">
                            {expanded ? '−' : '+'}
                          </span>
                        </div>
                      </div>
                    </div>
                    {expanded && (
                      <div className="p-4 border-t bg-white">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm mb-4">
                          <div className="text-left">
                            <span className="font-medium text-gray-700">Quantity:</span>
                            <p className="text-blue-600 font-mono text-base text-left">
                              {sizeGroup.totalQuantity.toLocaleString()}
                        {(sizeGroup.individualQuantities || '').includes(',') && <span className="text-xs text-gray-500 ml-2">({sizeGroup.individualQuantities})</span>}
                            </p>
                          </div>
                          <div className="text-left">
                            <span className="font-medium text-gray-700">Products:</span>
                            <p className="text-gray-600 text-left">{sizeGroup.products || 'N/A'}</p>
                          </div>
                          <div className="text-left">
                            <span className="font-medium text-gray-700">Materials:</span>
                            <p className="text-gray-600 text-left">{sizeGroup.materials || 'N/A'}</p>
                          </div>
                        </div>
                        {/* Description and Notes Row */}
                        <div className="mb-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                          {/* Description Box */}
                          <div className="p-3 bg-gray-50 rounded border border-gray-200">
                            <span className="font-medium text-gray-700 text-sm">Description:</span>
                            {sizeGroup.descriptions ? (
                              <p className="text-xs text-gray-600 mt-1 text-left">{formatDescription(sizeGroup.descriptions)}</p>
                            ) : (
                              <p className="text-xs text-gray-500 mt-1 text-left italic">No description</p>
                            )}
                          </div>
                          
                          {/* Notes Box */}
                          <div className="p-3 bg-blue-50 rounded border border-blue-200">
                            <SimpleNotes
                              initialNotes={sizeGroup.notes || ''}
                              onSave={noteSaveCallbacks[`${id}-${sizeGroup.size}`] || (async () => {})}
                              disabled={!!sizeGroup.processed}
                            />
                          </div>
                        </div>
                        <div className="border-t pt-3">
                          <h5 className="font-medium text-sm text-gray-700 mb-2">File Attachments</h5>
                          {fileThumbnails[uploadKey] && fileThumbnails[uploadKey].length > 0 && (
                            <div className="mb-3">
                              <p className="text-sm text-green-600 mb-1">Attached files:</p>
                              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                                {fileThumbnails[uploadKey].map((fileThumb, fileIndex) => {
                                  const deleteKey = `${uploadKey}-${fileThumb.filename}`;
                                  const isDeleting = deleting.has(deleteKey);
                                  
                                  return (
                                    <div key={fileIndex} className={`relative border rounded-lg p-2 bg-white hover:shadow-md transition-all duration-300 ${isDeleting ? 'transform scale-95 opacity-75' : ''}`}>
                                      <div className="mb-2">
                                        {fileThumb.fileType === 'pdf' ? (
                                    <div className="relative w-full h-44 bg-white rounded flex items-center justify-center overflow-hidden">
                                      <img
                                        src={`${API_BASE_URL}/api/file-thumbnail?size=2048&filePath=${encodeURIComponent(fileThumb.filePath)}`}
                                        alt={fileThumb.filename}
                                        loading="lazy"
                                        className="max-w-full max-h-full object-contain drop-shadow-sm"
                                      />
                                      <span className="absolute top-2 left-2 text-[10px] px-1.5 py-0.5 rounded bg-red-600 text-white shadow">PDF</span>
                                    </div>
                                        ) : fileThumb.fileType === 'jpg' || fileThumb.fileType === 'jpeg' || 
                                               fileThumb.fileType === 'png' || fileThumb.fileType === 'gif' || 
                                               fileThumb.fileType === 'bmp' || fileThumb.fileType === 'webp' ? (
                                    <div className="relative w-full h-44 bg-white rounded flex items-center justify-center overflow-hidden">
                                          <img 
                                            src={`${API_BASE_URL}/api/file-content?filePath=${encodeURIComponent(fileThumb.filePath)}`} 
                                            alt={fileThumb.filename} 
                                        loading="lazy"
                                        className="max-w-full max-h-full object-contain"
                                          />
                                    </div>
                                        ) : (
                                          <div className="w-full h-44 bg-gray-100 rounded flex items-center justify-center">
                                            <span className="text-3xl">{getFilePreview(fileThumb.filename)}</span>
                                          </div>
                                        )}
                                      </div>
                                      <div className="text-xs text-gray-600 text-center mb-2">
                                        <div className="font-medium truncate" title={fileThumb.filename}>{fileThumb.filename}</div>
                                        <div className="text-gray-400">{fileThumb.fileType.toUpperCase()}</div>
                                      </div>
                                      <button
                                        onClick={(e) => { e.stopPropagation(); e.preventDefault(); handleDeleteFile(uploadKey, fileThumb.filename); }}
                                        disabled={isDeleting}
                                        className={`w-full px-2 py-1 text-xs rounded transition-colors focus:outline-none focus:ring-2 focus:ring-red-300 inline-flex items-center justify-center gap-1 ${
                                          isDeleting 
                                            ? 'bg-red-400 text-white cursor-not-allowed' 
                                            : 'bg-red-500 text-white hover:bg-red-600'
                                        }`}
                                        type="button"
                                      >
                                        {isDeleting ? (
                                          <>
                                            <svg className="animate-spin h-3 w-3" viewBox="0 0 24 24">
                                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle>
                                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 818-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 714 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                            </svg>
                                            Deleting...
                                          </>
                                        ) : (
                                          'Delete'
                                        )}
                                      </button>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                          {!isProcessed ? (
                            <FileDropZone
                              customerName={customerName}
                              size={sizeGroup.size}
                              quoteId={id}
                              type={type}
                              onFileUploaded={(fileName) => handleFileUploaded(uploadKey, fileName)}
                            />
                          ) : (
                            <div className="p-4 bg-gray-50 rounded-lg border-2 border-dashed border-gray-200 text-center">
                              <p className="text-sm text-gray-500">
                                <span className="inline-flex items-center gap-1">
                                  ✓ <span>This size group has been submitted. No additional files can be uploaded.</span>
                                </span>
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
    );
  }, [sizeGroups, id, locallySubmitted, pendingServerConfirm, processing, expandedSizes, fileThumbnails, deleting, quoteFilesAvailable, toggleSize, handleSubmitLine, formatDescription, getFilePreview, customerName, type, handleDeleteFile, handleFileUploaded, handleImportQuoteFiles, handlePrepress]);

  return (
    <div className="border rounded-lg shadow-sm">
      <div
        className="p-4 bg-gray-50 cursor-pointer hover:bg-gray-100 flex justify-between items-center"
        onClick={toggleItem}
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-4 mb-2">
            <h3 className="font-semibold text-lg text-left">{title}</h3>
            <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded text-left">
              {customerName}
            </span>
            {sizeVariations > 1 && (
              <span className="px-2 py-1 bg-orange-100 text-orange-800 text-xs font-medium rounded">
                {sizeVariations} sizes
              </span>
            )}
            {subtitle && (
              <span className="px-2 py-1 bg-green-100 text-green-800 text-xs font-medium rounded">
                {subtitle}
              </span>
            )}
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-600">
            <div className="text-left">
              <span className="font-medium">Lines:</span> {totalLines}
            </div>
            <div className="text-left">
              <span className="font-medium">Total Qty:</span> {totalQuantity.toLocaleString()}
            </div>
            <div className="text-left">
              <span className="font-medium">Order Date:</span> {orderDate ? new Date(orderDate).toLocaleDateString() : 'N/A'}
            </div>
            <div className="text-left">
              <span className="font-medium">Due Date:</span> {dueDate ? new Date(dueDate).toLocaleDateString() : 'N/A'}
            </div>
          </div>
        </div>
        <div className="w-8 flex justify-center">
          <span className="text-xl font-bold text-gray-400">
            {expandedItem ? '−' : '+'}
          </span>
        </div>
      </div>
      
      {expandedItem && (
        <div className="p-4 border-t bg-white">
          {renderedSizeGroups}
        </div>
      )}
      
    </div>
  );
}
