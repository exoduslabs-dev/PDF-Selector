import React, { useEffect, useState, useCallback } from "react";
import { ItemCard } from "../components/ItemCard";
import { apiCall } from "../config/api";

interface SizeGroup {
  size: string;
  lineCount: number;
  totalQuantity: number;
  individualQuantities: string;
  products: string;
  materials: string;
  lineIdentifiers: string;
  descriptions: string;
  processed?: boolean;
}

interface Job {
  jobId: string;
  customerName: string;
  orderDate: string;
  dueDate: string;
  quoteId?: string;
  sizeVariations: number;
  totalLines: number;
  totalQuantity: number;
  sizeGroups: SizeGroup[];
}

export function JobPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [expandedStates, setExpandedStates] = useState<Record<string, { item: boolean, sizes: string[] }>>({});
  const [scrollPosition, setScrollPosition] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  // Data limit selector state
  const [dataLimit, setDataLimit] = useState<number>(50);

  useEffect(() => {
    fetchJobs();
  }, [refreshKey, dataLimit]); // Re-fetch when refreshKey or dataLimit changes

  // Restore scroll position after data loads and DOM updates
  useEffect(() => {
    if (!loading && scrollPosition > 0 && isRefreshing) {
      // Use requestAnimationFrame to ensure DOM is fully rendered
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          // Double RAF to ensure content is fully laid out
          window.scrollTo(0, scrollPosition);
          setScrollPosition(0); // Clear after restoring
          setIsRefreshing(false); // Hide loading overlay
        });
      });
    }
  }, [loading, scrollPosition, isRefreshing]);

  const fetchJobs = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await apiCall(`/api/jobs?limit=${dataLimit}`);
      if (!response.ok) {
        throw new Error('Failed to fetch jobs');
      }
      const data = await response.json();
      setJobs(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  // Function to trigger a data refresh while preserving state and scroll position
  const refreshData = useCallback((jobId?: string, preserveState?: { item: boolean, sizes: string[] }) => {
    // Save current scroll position and show loading overlay
    setScrollPosition(window.scrollY);
    setIsRefreshing(true);
    
    if (jobId && preserveState) {
      setExpandedStates(prev => ({ ...prev, [jobId]: preserveState }));
    }
    setRefreshKey(prev => prev + 1);
  }, []);

  // Function to trigger a lightweight refresh for specific data without full page reload
  const refreshSpecificData = useCallback(async (jobId?: string) => {
    try {
      // Only refresh the specific job data if jobId is provided
      if (jobId) {
        const response = await apiCall(`/api/jobs?limit=${dataLimit}`);
        if (response.ok) {
          const data = await response.json();
          setJobs(data);
          return; // Exit early, no need for full refresh
        }
      }
      
      // Fallback to full refresh if specific refresh fails
      setRefreshKey(prev => prev + 1);
    } catch (error) {
      console.error('Specific refresh failed, falling back to full refresh:', error);
      setRefreshKey(prev => prev + 1);
    }
  }, [dataLimit]);

  // Function to get preserved state for a job
  const getPreservedState = useCallback((jobId: string) => {
    return expandedStates[jobId];
  }, [expandedStates]);

  // Stable callback for state changes
  const handleStateChange = useCallback((jobId: string) => (state: { item: boolean, sizes: string[] }) => {
    setExpandedStates(prev => ({ ...prev, [jobId]: state }));
  }, []);

  if (loading) {
    return (
      <div>
        <h1 className="text-3xl font-bold mb-4">Jobs</h1>
        <p>Loading jobs...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <h1 className="text-3xl font-bold mb-4">Jobs</h1>
        <p className="text-red-600">Error: {error}</p>
        <p className="text-sm text-gray-600 mt-2">
          Make sure the API server is running: <code>bun run scripts/api_server.ts</code>
        </p>
      </div>
    );
  }

  return (
    <div className="relative">
      {/* Loading Overlay */}
      {isRefreshing && (
        <div className="fixed inset-0 bg-white bg-opacity-90 flex items-center justify-center z-50">
          <div className="flex items-center gap-3">
            <svg className="animate-spin h-8 w-8 text-blue-500" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <span className="text-lg text-gray-700">Processing...</span>
          </div>
        </div>
      )}

      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Jobs</h1>
        <div className="flex items-center gap-4">
          <div className="bg-blue-50 px-4 py-2 rounded-lg">
            <span className="text-sm font-medium">
              Active Jobs: {jobs.filter(job => !job.sizeGroups.every(sg => sg.processed)).length}
            </span>
          </div>
          {/* Data limit selector */}
          <div>
            <label htmlFor="data-limit-jobs" className="text-sm font-medium text-gray-700 mr-2">Items per page:</label>
            <select
              id="data-limit-jobs"
              value={dataLimit}
              onChange={(e) => setDataLimit(Number(e.target.value))}
              className="border border-gray-300 rounded-md text-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </div>
        </div>
      </div>
      
      <div className="space-y-4">
        {jobs
          .filter(job => !job.sizeGroups.every(sg => sg.processed))
          .map((job) => (
          <ItemCard
            key={job.jobId}
            id={job.jobId}
            customerName={job.customerName}
            orderDate={job.orderDate}
            dueDate={job.dueDate}
            sizeVariations={job.sizeVariations}
            totalLines={job.totalLines}
            totalQuantity={job.totalQuantity}
            sizeGroups={job.sizeGroups}
            type="job"
            title={`Job ID: ${job.jobId}`}
            subtitle={job.quoteId ? `Quote: ${job.quoteId}` : undefined}
            onDataChange={() => refreshSpecificData(job.jobId)}
            preservedState={getPreservedState(job.jobId)}
            onStateChange={handleStateChange(job.jobId)}
          />
        ))}
      </div>
      
      {jobs.filter(job => !job.sizeGroups.every(sg => sg.processed)).length === 0 && (
        <p className="text-gray-500 italic">No active jobs found. Check the Archive for processed jobs.</p>
      )}
    </div>
  );
}


