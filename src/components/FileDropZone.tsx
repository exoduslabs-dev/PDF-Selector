import React, { useState, useCallback } from 'react';
import { API_BASE_URL } from '../config/api';

interface FileDropZoneProps {
  customerName: string;
  size: string;
  quoteId: string;
  type: 'quote' | 'job';
  onFileUploaded: (fileName: string, filePath?: string) => void;
}

export function FileDropZone({ customerName, size, quoteId, type, onFileUploaded }: FileDropZoneProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({});

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    
    const files = Array.from(e.dataTransfer.files);
    if (files.length === 0) return;

    await uploadMultipleFiles(files);
  }, [customerName, size, quoteId, type]);

  const handleFileInput = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    
    const fileArray = Array.from(files);
    await uploadMultipleFiles(fileArray);
  }, [customerName, size, quoteId, type]);

  const uploadFile = async (file: File): Promise<{ success: boolean; fileName: string; filePath?: string; error?: string }> => {
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('customerName', customerName);
      formData.append('size', size);
      formData.append('quoteId', quoteId);
      formData.append('type', type);

      const response = await fetch(`${API_BASE_URL}/api/upload-file`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Upload failed: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();
      
      // Extract file path from response if available
      const filePath = result.filePath || result.filelocation || `${customerName}/${size}/${quoteId}/files/${file.name}`;
      
      return { success: true, fileName: file.name, filePath };
    } catch (error) {
      return { 
        success: false, 
        fileName: file.name, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  };

  const uploadMultipleFiles = async (files: File[]) => {
    setIsUploading(true);
    setUploadStatus(null);
    setUploadProgress({});

    try {
      let successCount = 0;
      let failedFiles: string[] = [];
      const results: Array<{ success: boolean; fileName: string; filePath?: string; error?: string }> = [];

      // Upload files sequentially to avoid overwhelming the server
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (!file) continue; // Skip if file is undefined
        
        // Update progress
        setUploadProgress(prev => ({ ...prev, [file.name]: 0 }));
        
        // Simulate progress for better UX
        const progressInterval = setInterval(() => {
          setUploadProgress(prev => {
            const current = prev[file.name] || 0;
            if (current < 90) {
              return { ...prev, [file.name]: current + Math.random() * 20 };
            }
            return prev;
          });
        }, 100);

        try {
          const result = await uploadFile(file);
          results.push(result);
          
          if (result.success) {
            successCount++;
            // Call callback immediately with file path for instant UI update
            onFileUploaded(result.fileName, result.filePath);
          } else {
            failedFiles.push(file.name);
          }
        } catch (error) {
          failedFiles.push(file.name);
          results.push({ 
            success: false, 
            fileName: file.name, 
            error: error instanceof Error ? error.message : 'Unknown error' 
          });
        } finally {
          clearInterval(progressInterval);
          setUploadProgress(prev => ({ ...prev, [file.name]: 100 }));
        }
      }

      // Set final status
      if (failedFiles.length === 0) {
        setUploadStatus(`✓ All ${successCount} files uploaded successfully`);
      } else if (successCount > 0) {
        setUploadStatus(`⚠ ${successCount} files uploaded, ${failedFiles.length} failed: ${failedFiles.join(', ')}`);
      } else {
        setUploadStatus(`✗ All uploads failed: ${failedFiles.join(', ')}`);
      }

      // Clear progress after a delay
      setTimeout(() => {
        setUploadProgress({});
        setUploadStatus(null);
      }, 3000);

    } catch (error) {
      setUploadStatus(`✗ Upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsUploading(false);
    }
  };

  const getFileIcon = (fileName: string) => {
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
  };

  return (
    <div className="mt-3">
      <div
        className={`border-2 border-dashed rounded-lg p-4 text-center transition-colors ${
          isDragOver
            ? 'border-blue-500 bg-blue-50'
            : 'border-gray-300 hover:border-gray-400'
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <input
          type="file"
          id={`file-input-${quoteId}-${size.replace(/\s+/g, '')}`}
          className="hidden"
          onChange={handleFileInput}
          disabled={isUploading}
          multiple
          accept=".pdf,.jpg,.jpeg,.png,.gif,.bmp,.webp,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.zip,.rar,.7z,.txt,.csv"
        />
        
        {isUploading ? (
          <div className="text-blue-600">
            <div className="animate-spin inline-block w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full mr-2"></div>
            Uploading files...
            {Object.keys(uploadProgress).length > 0 && (
              <div className="mt-2 space-y-1">
                {Object.entries(uploadProgress).map(([fileName, progress]) => (
                  <div key={fileName} className="text-xs">
                    <div className="flex items-center gap-2">
                      <span className="w-4">{getFileIcon(fileName)}</span>
                      <span className="truncate flex-1">{fileName}</span>
                      <span className="text-xs text-gray-500">{Math.round(progress)}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-1 mt-1">
                      <div 
                        className="bg-blue-600 h-1 rounded-full transition-all duration-300" 
                        style={{ width: `${progress}%` }}
                      ></div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div>
            <p className="text-sm text-gray-600 mb-2">
              Drop multiple files here or{' '}
              <label
                htmlFor={`file-input-${quoteId}-${size.replace(/\s+/g, '')}`}
                className="text-blue-600 hover:text-blue-800 cursor-pointer underline"
              >
                click to browse
              </label>
            </p>
            <p className="text-xs text-gray-500 mb-2">
              Files will be saved to: {customerName}/{size}/{quoteId}/files
            </p>
            <p className="text-xs text-gray-400">
              Supported formats: PDF, Images, Office docs, Archives, Text files
            </p>
          </div>
        )}
      </div>
      
      {uploadStatus && (
        <div className={`mt-2 text-sm ${
          uploadStatus.startsWith('✓') 
            ? 'text-green-600' 
            : uploadStatus.startsWith('⚠') 
            ? 'text-orange-600' 
            : 'text-red-600'
        }`}>
          {uploadStatus}
        </div>
      )}
    </div>
  );
}
