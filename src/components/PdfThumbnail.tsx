import React, { useEffect, useState } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import { API_BASE_URL } from '../config/api';
import 'react-pdf/dist/Page/TextLayer.css';
import 'react-pdf/dist/Page/AnnotationLayer.css';

// For small thumbnails, it's acceptable to render on the main thread.
// Disables worker to avoid cross-origin/module worker issues in dev.
(pdfjs as any).disableWorker = true;

interface PdfThumbnailProps {
  file: string | File | ArrayBuffer | { url: string } | { data: Uint8Array } | null;
  width?: number;
  height?: number;
  className?: string;
  onLoadSuccess?: (pdf: any) => void;
  onLoadError?: (error: Error) => void;
}

export function PdfThumbnail({ 
  file, 
  width = 150, 
  height = 200,
  className = "",
  onLoadSuccess,
  onLoadError 
}: PdfThumbnailProps) {
  const [numPages, setNumPages] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
    setIsLoading(false);
    setError(null);
    if (onLoadSuccess) {
      onLoadSuccess({ numPages });
    }
  };

  const onDocumentLoadError = (error: Error) => {
    console.error('PDF loading error:', error);
    setError(error);
    setIsLoading(false);
    if (onLoadError) {
      onLoadError(error);
    }
  };

  if (error) {
    return (
      <div className={`flex flex-col items-center justify-center bg-gray-100 border border-gray-300 rounded ${className}`}
           style={{ width, height }}>
        <span className="text-3xl text-gray-400 mb-2">📄</span>
        <span className="text-xs text-red-500 text-center px-2">
          Failed to load PDF
        </span>
      </div>
    );
  }

  return (
    <div className={`relative bg-white border border-gray-200 rounded overflow-hidden ${className}`}
         style={{ width, height }}>
      <Document
        file={file}
        onLoadSuccess={onDocumentLoadSuccess}
        onLoadError={onDocumentLoadError}
        className="flex items-center justify-center h-full"
        loading={
          <div className="flex items-center justify-center h-full">
            <span className="text-xs text-gray-400">Loading...</span>
          </div>
        }
        error={
          <div className="flex flex-col items-center justify-center h-full">
            <span className="text-3xl text-gray-400 mb-2">📄</span>
            <span className="text-xs text-red-500">Error loading PDF</span>
          </div>
        }
        noData={
          <div className="flex flex-col items-center justify-center h-full">
            <span className="text-3xl text-gray-400 mb-2">📄</span>
            <span className="text-xs text-gray-500">No PDF data</span>
          </div>
        }
      >
        <Page
          pageNumber={1}
          width={width - 4} // Account for border
          height={height - (numPages > 1 ? 30 : 4)} // Account for border and multi-page indicator
          renderTextLayer={false}
          renderAnnotationLayer={false}
          className="pdf-page"
        />
      </Document>

      {isLoading && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/70">
          <div className="animate-pulse flex flex-col items-center">
            <div className="w-8 h-8 bg-gray-300 rounded mb-2"></div>
            <div className="text-xs text-gray-400">Loading PDF...</div>
          </div>
        </div>
      )}
      
      {numPages > 1 && (
        <div className="absolute bottom-0 left-0 right-0 bg-red-500 text-white text-xs text-center py-1">
          Multi-page PDF ({numPages} pages)
        </div>
      )}
    </div>
  );
}

// Utility component for file paths
interface PdfThumbnailFromPathProps extends Omit<PdfThumbnailProps, 'file'> {
  filePath: string;
}

export function PdfThumbnailFromPath({ filePath, ...props }: PdfThumbnailFromPathProps) {
  const [data, setData] = useState<Uint8Array | null>(null);
  const [fetchError, setFetchError] = useState<Error | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const fileUrl = `${API_BASE_URL}/api/file-content?filePath=${encodeURIComponent(filePath)}`;
        const res = await fetch(fileUrl);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const buf = await res.arrayBuffer();
        if (!cancelled) setData(new Uint8Array(buf));
      } catch (e) {
        if (!cancelled) setFetchError(e as Error);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [filePath]);

  if (fetchError) {
    return (
      <div className={`flex flex-col items-center justify-center bg-gray-100 border border-gray-300 rounded ${props.className || ''}`}
           style={{ width: props.width || 150, height: props.height || 200 }}>
        <span className="text-3xl text-gray-400 mb-2">📄</span>
        <span className="text-xs text-red-500">Failed to fetch PDF</span>
      </div>
    );
  }

  if (!data) {
    return (
      <div className={`flex flex-col items-center justify-center bg-gray-50 border border-gray-200 rounded ${props.className || ''}`}
           style={{ width: props.width || 150, height: props.height || 200 }}>
        <div className="animate-pulse flex flex-col items-center">
          <div className="w-8 h-8 bg-gray-300 rounded mb-2"></div>
          <div className="text-xs text-gray-400">Loading PDF...</div>
        </div>
      </div>
    );
  }

  return <PdfThumbnail file={{ data }} {...props} />;
}
