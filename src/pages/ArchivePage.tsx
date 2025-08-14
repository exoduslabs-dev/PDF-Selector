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

interface Quote {
  quoteId: string;
  customerName: string;
  orderDate: string;
  dueDate: string;
  sizeVariations: number;
  totalLines: number;
  totalQuantity: number;
  sizeGroups: SizeGroup[];
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

export function ArchivePage() {
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'quotes' | 'jobs'>('quotes');
  const [refreshKey, setRefreshKey] = useState(0);
  const [expandedStates, setExpandedStates] = useState<Record<string, { item: boolean, sizes: string[] }>>({});
  const [scrollPosition, setScrollPosition] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    fetchData();
  }, [refreshKey]); // Re-fetch when refreshKey changes

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

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const [quotesResponse, jobsResponse] = await Promise.all([
        apiCall('/api/quotes'),
        apiCall('/api/jobs')
      ]);

      if (!quotesResponse.ok || !jobsResponse.ok) {
        throw new Error('Failed to fetch data');
      }

      const quotesData = await quotesResponse.json();
      const jobsData = await jobsResponse.json();

      setQuotes(quotesData);
      setJobs(jobsData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  // Function to trigger a data refresh while preserving state
  const refreshData = useCallback((itemId?: string, preserveState?: { item: boolean, sizes: string[] }) => {
    // Save current scroll position and show loading overlay
    setScrollPosition(window.scrollY);
    setIsRefreshing(true);
    
    if (itemId && preserveState) {
      setExpandedStates(prev => ({ ...prev, [itemId]: preserveState }));
    }
    setRefreshKey(prev => prev + 1);
  }, []);

  // Function to trigger a lightweight refresh for specific data without full page reload
  const refreshSpecificData = useCallback(async (itemId?: string, type?: 'quote' | 'job') => {
    try {
      // Only refresh the specific data if itemId is provided
      if (itemId) {
        const [quotesResponse, jobsResponse] = await Promise.all([
          apiCall('/api/quotes'),
          apiCall('/api/jobs')
        ]);

        if (quotesResponse.ok && jobsResponse.ok) {
          const quotesData = await quotesResponse.json();
          const jobsData = await jobsResponse.json();
          setQuotes(quotesData);
          setJobs(jobsData);
          return; // Exit early, no need for full refresh
        }
      }
      
      // Fallback to full refresh if specific refresh fails
      setRefreshKey(prev => prev + 1);
    } catch (error) {
      console.error('Specific refresh failed, falling back to full refresh:', error);
      setRefreshKey(prev => prev + 1);
    }
  }, []);

  // Function to get preserved state for an item
  const getPreservedState = useCallback((itemId: string) => {
    return expandedStates[itemId];
  }, [expandedStates]);

  // Stable callback for state changes
  const handleStateChange = useCallback((itemId: string) => (state: { item: boolean, sizes: string[] }) => {
    setExpandedStates(prev => ({ ...prev, [itemId]: state }));
  }, []);

  if (loading) {
    return (
      <div>
        <h1 className="text-3xl font-bold mb-4">Archive</h1>
        <p>Loading archived items...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <h1 className="text-3xl font-bold mb-4">Archive</h1>
        <p className="text-red-600">Error: {error}</p>
        <p className="text-sm text-gray-600 mt-2">
          Make sure the API server is running: <code>bun run scripts/api_server.ts</code>
        </p>
      </div>
    );
  }

  // Filter for processed items only
  const processedQuotes = quotes.filter(quote => quote.sizeGroups.every(sg => sg.processed));
  const processedJobs = jobs.filter(job => job.sizeGroups.every(sg => sg.processed));

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

      <h1 className="text-3xl font-bold mb-6">Archive</h1>
      
      {/* Tab Navigation */}
      <div className="flex space-x-1 mb-6">
        <button
          onClick={() => setActiveTab('quotes')}
          className={`px-4 py-2 rounded-lg text-sm font-medium ${
            activeTab === 'quotes'
              ? 'bg-blue-500 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          Processed Quotes ({processedQuotes.length})
        </button>
        <button
          onClick={() => setActiveTab('jobs')}
          className={`px-4 py-2 rounded-lg text-sm font-medium ${
            activeTab === 'jobs'
              ? 'bg-blue-500 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          Processed Jobs ({processedJobs.length})
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === 'quotes' && (
        <div className="space-y-3">
          {processedQuotes.map((quote) => (
            <ItemCard
              key={quote.quoteId}
              id={quote.quoteId}
              customerName={quote.customerName}
              orderDate={quote.orderDate}
              dueDate={quote.dueDate}
              sizeVariations={quote.sizeVariations}
              totalLines={quote.totalLines}
              totalQuantity={quote.totalQuantity}
              sizeGroups={quote.sizeGroups}
              type="quote"
              title={`Quote ${quote.quoteId}`}
              onDataChange={() => refreshSpecificData(quote.quoteId, 'quote')}
              preservedState={getPreservedState(quote.quoteId)}
              onStateChange={handleStateChange(quote.quoteId)}
            />
          ))}
          
          {processedQuotes.length === 0 && (
            <div className="text-center py-8">
              <p className="text-gray-500 italic">No processed quotes found.</p>
            </div>
          )}
        </div>
      )}

      {activeTab === 'jobs' && (
        <div className="space-y-3">
          {processedJobs.map((job) => (
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
              onDataChange={() => refreshSpecificData(job.jobId, 'job')}
              preservedState={getPreservedState(job.jobId)}
              onStateChange={handleStateChange(job.jobId)}
            />
          ))}
          
          {processedJobs.length === 0 && (
            <div className="text-center py-8">
              <p className="text-gray-500 italic">No processed jobs found.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
