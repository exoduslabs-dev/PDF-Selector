import React, { useMemo, useState, useCallback, useEffect } from 'react';
import { Card } from './ui/card';
import { cn } from '../lib/utils';
// No API calls needed for blank board

export interface LabexJob {
  id: string;
  jobNumber: string;
  customer?: string;
  material?: string;
  finishing?: string;
  readyDate?: string;
  orderDate?: string;
  quantity?: number;
  tool?: string;
  processed?: boolean;
  quoteId?: string;
  orderstatus?: string;
}

export interface LabexColumnData {
  id: string;
  title: string;
  // added 'material_finishing' to allow grouping by combined material + finishing
  groupBy?: 'customer' | 'material' | 'finishing' | 'material_finishing' | null;
  jobs: LabexJob[];
  color: string;
}

function groupJobsBy(jobs: LabexJob[], key: 'customer' | 'material' | 'finishing' | 'material_finishing') {
  const groups: Record<string, LabexJob[]> = {};
  for (const job of jobs) {
    let groupKey: string;
    if (key === 'material_finishing') {
      const mat = (job.material || 'Unknown Material').trim();
      const fin = (job.finishing || 'Standard').trim();
      groupKey = `${mat} — ${fin}`;
    } else {
      groupKey = (job as any)[key] || 'Unassigned';
    }
    if (!groups[groupKey]) groups[groupKey] = [];
    groups[groupKey]!.push(job);
  }
  return groups;
}

function LabexJobCard({ 
  job, 
  color, 
  columnId, 
  onDragStart,
  hideCustomer = false,
  hideMaterial = false,
  hideFinishing = false
}: { 
  job: LabexJob; 
  color: string;
  columnId: string;
  onDragStart: (e: React.DragEvent, jobId: string, sourceColumnId: string) => void;
  hideCustomer?: boolean;
  hideMaterial?: boolean;
  hideFinishing?: boolean;
}) {
  // Default cards to collapsed
  const [isCollapsed, setIsCollapsed] = useState(true);

  // Calculate days remaining and determine color based on due date
  const getDueDateColor = () => {
    if (!job.readyDate) return color;
    
    const today = new Date();
    const dueDate = new Date(job.readyDate);
    const daysRemaining = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    
    // Labex urgency thresholds
    if (daysRemaining >= 3) return 'border-l-green-500';
    if (daysRemaining >= 2) return 'border-l-orange-500';
    if (daysRemaining >= 1) return 'border-l-red-500';
    
    return color; // Default color for overdue or other cases
  };

  const dynamicColor = getDueDateColor();

  return (
    <div
      className={cn(
        'bg-muted/50 rounded-md p-3 border shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-0.5 cursor-grab active:cursor-grabbing relative',
        dynamicColor,
        'border-l-4'
      )}
      draggable
      onDragStart={(e) => onDragStart(e, job.id, columnId)}
      aria-label={`Job ${job.jobNumber}`}
    >
      {/* Header: Job number + collapse toggle + due date */}
      <div className="flex items-start justify-between">
        <div className="pr-2">
          <div className="text-sm font-medium text-left mb-1">Job #{job.jobNumber}</div>
          {!hideCustomer && job.customer && (
            <div className="text-xs text-muted-foreground font-medium text-left">{job.customer}</div>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Due Date Badge */}
          {job.readyDate && (
            <div className="text-xs font-medium">
              {(() => {
                const today = new Date();
                const dueDate = new Date(job.readyDate);
                const daysRemaining = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
                
                let textColor = 'text-blue-600';
                if (daysRemaining < 3) textColor = daysRemaining < 2 ? 'text-red-600' : 'text-orange-600';
                
                return (
                  <div className={`${textColor} font-bold`}>{daysRemaining > 0 ? `${daysRemaining}d` : 'OVERDUE'}</div>
                );
              })()}
            </div>
          )}

          {/* Collapse Toggle Button */}
          <button
            type="button"
            aria-label={isCollapsed ? 'Expand job' : 'Collapse job'}
            onClick={(e) => { e.stopPropagation(); setIsCollapsed(!isCollapsed); }}
            className="text-muted-foreground hover:text-foreground p-1"
          >
            <svg className={cn('h-4 w-4 transition-transform', isCollapsed ? 'rotate-90' : 'rotate-0')} viewBox="0 0 20 20" fill="none" stroke="currentColor">
              <path strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" d="M6 8l4 4 4-4" />
            </svg>
          </button>
        </div>
      </div>

      {/* Collapsible Content */}
      {!isCollapsed && (
        <div className="mt-3 space-y-1 text-left">
          {job.quantity && (
            <div className="text-xs text-muted-foreground">Qty: {job.quantity.toLocaleString()}</div>
          )}

          {!hideMaterial && job.material && (
            <div className="text-xs text-muted-foreground">Material: {job.material}</div>
          )}
          {!hideFinishing && job.finishing && (
            <div className="text-xs text-muted-foreground">Finishing: {job.finishing}</div>
          )}
        </div>
      )}
    </div>
  );
}

function LabexJobGroup({ 
  groupName, 
  jobs, 
  color, 
  columnId, 
  onDragStart, 
  onDrop,
  groupBy,
  allCollapsed
}: { 
  groupName: string; 
  jobs: LabexJob[]; 
  color: string;
  columnId: string;
  onDragStart: (e: React.DragEvent, jobId: string, sourceColumnId: string) => void;
  onDrop: (e: React.DragEvent, targetColumnId: string, targetGroupName?: string) => void;
  groupBy?: 'customer' | 'material' | 'finishing' | 'material_finishing' | null;
  allCollapsed?: boolean;
}) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  // Sync with global collapse state
  useEffect(() => {
    setIsCollapsed(allCollapsed || false);
  }, [allCollapsed]);

  // Handle group drag start
  const handleGroupDragStart = (e: React.DragEvent) => {
    e.stopPropagation();
    setIsDragging(true);
    e.dataTransfer.setData('application/json', JSON.stringify({ 
      type: 'group', 
      groupName, 
      columnId,
      jobIds: jobs.map(job => job.id)
    }));
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleGroupDragEnd = () => {
    setIsDragging(false);
  };

  return (
    <div 
      className={cn(
        "space-y-2 p-2 rounded-md transition-all duration-200",
        isDragging ? "opacity-50 scale-95" : "hover:bg-muted/30",
        "border border-transparent hover:border-muted-foreground/20"
      )}
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => onDrop(e, columnId, groupName)}
    >
      {/* Group Header - Collapsible and Draggable */}
      <div 
        className="flex items-center justify-between cursor-pointer select-none"
        onClick={() => setIsCollapsed(!isCollapsed)}
        draggable
        onDragStart={handleGroupDragStart}
        onDragEnd={handleGroupDragEnd}
      >
        <div className="flex items-center gap-2">
          <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {groupBy === 'customer' && 'Customer: '}
            {groupBy === 'material' && 'Material: '}
            {groupBy === 'finishing' && 'Finishing: '}
            {groupBy === 'material_finishing' && 'Material + Finishing: '}
            {groupName}
          </div>
          <span className="text-xs text-muted-foreground">({jobs.length})</span>
        </div>
        <div className="flex items-center gap-1">
          <svg 
            className={cn(
              "h-3 w-3 text-muted-foreground transition-transform",
              isCollapsed ? "rotate-90" : "rotate-0"
            )} 
            fill="none" 
            viewBox="0 0 24 24" 
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </div>
      </div>
      
      {/* Group Content - Collapsible */}
      {!isCollapsed && (
        <div className="space-y-2">
          {jobs.map((job) => (
            <LabexJobCard 
              key={job.id} 
              job={job} 
              color={color}
              columnId={columnId}
              onDragStart={onDragStart}
              hideCustomer={groupBy === 'customer'}
              hideMaterial={groupBy === 'material'}
              hideFinishing={groupBy === 'finishing'}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function LabexKanbanColumn({ 
  column, 
  onDragStart, 
  onDragOver, 
  onDrop,
  allCollapsed
}: { 
  column: LabexColumnData;
  onDragStart: (e: React.DragEvent, jobId: string, sourceColumnId: string) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent, targetColumnId: string, targetGroupName?: string) => void;
  allCollapsed?: boolean;
}) {
  const groupedJobs = useMemo(() => {
    if (!column.groupBy) return { 'All Jobs': column.jobs } as Record<string, LabexJob[]>;
    return groupJobsBy(column.jobs, column.groupBy);
  }, [column.jobs, column.groupBy]);

  return (
    <Card 
      className="w-full min-h-[24rem] p-3 bg-background border rounded-lg shadow-sm hover:shadow-md transition-all duration-300"
      onDragOver={onDragOver}
      onDrop={(e) => onDrop(e, column.id)}
    >
      <div className="pb-3">
        <h3 className="font-semibold text-sm uppercase tracking-wide text-center">{column.title}</h3>
      </div>
      <div className="space-y-3">
        {Object.entries(groupedJobs).map(([groupName, jobs]) => (
          <LabexJobGroup 
            key={groupName} 
            groupName={groupName} 
            jobs={jobs} 
            color={column.color}
            columnId={column.id}
            onDragStart={onDragStart}
            onDrop={onDrop}
            groupBy={column.groupBy}
            allCollapsed={allCollapsed}
          />
        ))}
      </div>
    </Card>
  );
}

export function LabexKanbanBoard({ 
  allCollapsed, 
  onToggleAllGroups 
}: { 
  allCollapsed: boolean;
  onToggleAllGroups: () => void;
}) {
  const [columns, setColumns] = useState<LabexColumnData[]>([]);
  const [loading, setLoading] = useState(true);
  // Limit selector: number or 'all'
  const [limit, setLimit] = useState<number | 'all'>(100);

  // Helper to map kanban column IDs to order_status values
  const getOrderStatusForColumn = (columnId?: string): string | undefined => {
    if (!columnId) return undefined;
    switch (columnId) {
      case 'print-ready':
        return 'Print Ready';
      case 'finishing-ready':
        return 'Finishing Ready';
      case 'digital-cut':
        return 'Digital Cut';
      case 'slitting':
        return 'Slitting';
      case 'dispatched':
        return 'Dispatched';
      default:
        return undefined;
    }
  };

  const fetchLabexJobs = useCallback(async () => {
    try {
      setLoading(true);
      // Build limit param (use large number for 'all')
      const limitParam = limit === 'all' ? 10000 : limit;
      // Ask the API to exclude already dispatched rows (front-end preference)
      const response = await fetch(`/api/kanban-data?company=labex&filter=labex&limit=${limitParam}&excludeDispatched=true`);
      const result = await response.json();

      // Debug: dump the raw JSON so we can inspect server response in browser console
      console.debug('GET /api/kanban-data result:', result);
      console.debug('kanban-data length:', result?.data?.length, 'sample row:', result?.data?.[0]);

      // TEMP DEBUG: log how many rows came back and a sample so we can diagnose empty UI
      try {
        console.debug('fetchLabexJobs: result.success=', result.success, 'data.length=', Array.isArray(result.data) ? result.data.length : 'N/A');
        if (Array.isArray(result.data) && result.data.length > 0) console.debug('fetchLabexJobs: sample row=', result.data[0]);
      } catch (e) {
        console.debug('fetchLabexJobs: debug log failed', e);
      }

      if (result.success && result.data) {
        // Transform rows returned by the API to LabexJob[]
        const labexJobs: LabexJob[] = Array.isArray(result.data) ? result.data.map((item: any) => {
          const rawId = String(item.id || '');
          // remove leading 'labex_' or 'labex-' (case-insensitive) so the job number shows the numeric part immediately
          const jobNum = rawId.replace(/^labex[_-]?/i, '');
          return {
            id: rawId,
            jobNumber: jobNum,
            customer: item.customername || undefined,
            material: item.materialname || undefined,
            finishing: item.finishingname || undefined,
            readyDate: item.duedate || undefined,
            orderDate: item.orderdate || undefined,
            quantity: item.quantity || undefined,
            // include orderstatus from API (backend coerces NULL to 'Print Ready')
            orderstatus: item.orderstatus || undefined,
            // tool intentionally left out from display; kept in data if needed
            processed: item.processed || false,
            quoteId: item.quoteid ? String(item.quoteid) : undefined
          } as LabexJob;
        }) : [];

        // Exclude already dispatched jobs from the board display.
        // The Dispatched column remains available as a target for drops, but existing dispatched rows are hidden.
        const visibleJobs = labexJobs.filter(job => {
          const status = String(job.orderstatus || '').toLowerCase();
          const isDispatchedStatus = status === 'dispatched';
          return !isDispatchedStatus && !job.processed;
        });

        // Helper to map order_status string to our column IDs
        const columnForStatus = (orderstatus?: string, processed?: boolean) => {
          if (processed) return 'dispatched';
          if (!orderstatus) return 'print-ready';
          switch ((orderstatus || '').toLowerCase()) {
            case 'print ready':
            case 'print_ready':
            case 'print-ready':
              return 'print-ready';
            case 'finishing ready':
            case 'finishing_ready':
            case 'finishing-ready':
              return 'finishing-ready';
            case 'digital cut':
            case 'digital_cut':
            case 'digital-cut':
              return 'digital-cut';
            case 'slitting':
            case 'slit':
              return 'slitting';
            case 'dispatched':
              return 'dispatched';
            default:
              return 'print-ready';
          }
        };

        const labexColumns: LabexColumnData[] = [
          { id: 'print-ready', title: 'Print Ready', groupBy: 'material_finishing', color: 'border-l-blue-500', jobs: [] },
          { id: 'finishing-ready', title: 'Finishing Ready', groupBy: 'customer', color: 'border-l-amber-500', jobs: [] },
          { id: 'digital-cut', title: 'Digital Cut', groupBy: 'customer', color: 'border-l-fuchsia-500', jobs: [] },
          { id: 'slitting', title: 'Slitting', groupBy: 'customer', color: 'border-l-indigo-500', jobs: [] },
          { id: 'dispatched', title: 'Dispatched', groupBy: 'customer', color: 'border-l-green-500', jobs: [] }
        ];

        // Place each visible job into the column determined by its orderstatus (status-driven placement). Grouping is applied inside each column.
        for (const job of visibleJobs) {
          const colId = columnForStatus(job.orderstatus as any, job.processed);
          const col = labexColumns.find(c => c.id === colId);
          if (col) col.jobs.push(job);
        }

        setColumns(labexColumns);
      }
    } catch (error) {
      console.error('Failed to fetch Labex jobs:', error);
      // Fallback to empty columns on error
      setColumns([]);
    } finally {
      setLoading(false);
    }
  }, [limit]);

  // Initial load / refetch when limit changes
  useEffect(() => {
    fetchLabexJobs();
  }, [fetchLabexJobs]);

  // Handler for limit change
  const handleLimitChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const v = e.target.value;
    if (v === 'all') setLimit('all');
    else setLimit(Number(v));
  };

  // Drag and drop handlers
  const handleDragStart = useCallback((e: React.DragEvent, jobId: string, sourceColumnId: string) => {
    e.dataTransfer.setData('application/json', JSON.stringify({ 
      type: 'job',
      jobId, 
      sourceColumnId 
    }));
    e.dataTransfer.effectAllowed = 'move';
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent, targetColumnId: string, targetGroupName?: string) => {
    e.preventDefault();
    
    try {
      const data = JSON.parse(e.dataTransfer.getData('application/json'));
      
      // Handle group drops
      if (data.type === 'group') {
        const { groupName, columnId: sourceColumnId, jobIds } = data;
        
        if (sourceColumnId === targetColumnId) {
          return; // Moving group within same column - just reorder
        } else {
          // Moving group between columns
          setColumns(prevColumns => {
            const sourceColumn = prevColumns.find(col => col.id === sourceColumnId);
            const targetColumn = prevColumns.find(col => col.id === targetColumnId);
            
            if (!sourceColumn || !targetColumn) return prevColumns;
            
            const jobsToMove = sourceColumn.jobs.filter(job => jobIds.includes(job.id));
            if (jobsToMove.length === 0) return prevColumns;
            
            return prevColumns.map(column => {
              if (column.id === sourceColumnId) {
                return { ...column, jobs: column.jobs.filter(job => !jobIds.includes(job.id)) };
              }
              if (column.id === targetColumnId) {
                return { ...column, jobs: [...column.jobs, ...jobsToMove] };
              }
              return column;
            });
          });
          
          // Persist status changes for group
          const processed = targetColumnId === 'dispatched';
          // Map column to orderstatus for persistence
          const orderstatusForTarget = getOrderStatusForColumn(targetColumnId);
          for (const jobId of jobIds) {
            try {
              const resp = await fetch(`/api/jobs/${jobId}/status`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ processed, orderstatus: orderstatusForTarget })
              });
              if (!resp.ok) {
                const text = await resp.text();
                console.error(`Failed to update job ${jobId}: ${resp.status} ${resp.statusText} - ${text}`);
              }
            } catch (error) {
              console.error(`Failed to update job ${jobId}:`, error);
            }
          }

          // After attempting group updates, refresh from DB to reconcile any differences
          await fetchLabexJobs();
        }
        return;
      }
      
      // Handle individual job drops
      const { jobId, sourceColumnId } = data;
      
      if (!jobId || !sourceColumnId) return;
      
      if (sourceColumnId === targetColumnId) {
        // Moving within the same column - reorder
        setColumns(prevColumns => 
          prevColumns.map(column => {
            if (column.id === targetColumnId) {
              const jobIndex = column.jobs.findIndex(job => job.id === jobId);
              if (jobIndex !== -1) {
                const [movedJob] = column.jobs.splice(jobIndex, 1);
                if (!movedJob) return column;
                
                const newJobs = [...column.jobs];
                
                if (targetGroupName && targetGroupName !== 'All Jobs') {
                  const targetGroupIndex = newJobs.findIndex(job => {
                    const groupKey = column.groupBy ? (job as any)[column.groupBy] || 'Unassigned' : null;
                    return groupKey === targetGroupName;
                  });
                  
                  if (targetGroupIndex !== -1) {
                    newJobs.splice(targetGroupIndex, 0, movedJob);
                  } else {
                    newJobs.push(movedJob);
                  }
                } else {
                  newJobs.push(movedJob);
                }
                
                return { ...column, jobs: newJobs };
              }
            }
            return column;
          })
        );
      } else {
        // Moving between columns
        setColumns(prevColumns => {
          const sourceColumn = prevColumns.find(col => col.id === sourceColumnId);
          const targetColumn = prevColumns.find(col => col.id === targetColumnId);
          
          if (!sourceColumn || !targetColumn) return prevColumns;
          
          const jobToMove = sourceColumn.jobs.find(job => job.id === jobId);
          if (!jobToMove) return prevColumns;
          
          return prevColumns.map(column => {
            if (column.id === sourceColumnId) {
              return { ...column, jobs: column.jobs.filter(job => job.id !== jobId) };
            }
            if (column.id === targetColumnId) {
              return { ...column, jobs: [...column.jobs, jobToMove] };
            }
            return column;
          });
        });
        
        // Persist status change
        const processed = targetColumnId === 'dispatched';
        const orderstatusForTarget = getOrderStatusForColumn(targetColumnId);
        try {
          const resp = await fetch(`/api/jobs/${jobId}/status`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ processed, orderstatus: orderstatusForTarget })
          });
          if (!resp.ok) {
            const text = await resp.text();
            console.error(`Failed to update job ${jobId}: ${resp.status} ${resp.statusText} - ${text}`);
          }
        } catch (error) {
          console.error(`Failed to update job ${jobId}:`, error);
        }

        // Refresh to ensure UI matches DB
        await fetchLabexJobs();
      }
    } catch (error) {
      console.error('Error processing drop:', error);
    }
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading Labex jobs...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">
      {columns.some(col => col.jobs.length > 0) ? (
        <>
          {/* Controls: limit selector + refresh */}
          <div className="flex items-center justify-end gap-3 mb-4">
            <label className="text-xs text-muted-foreground">Show:</label>
            <select value={String(limit)} onChange={handleLimitChange} className="text-sm p-1 border rounded">
              <option value="50">50</option>
              <option value="100">100</option>
              <option value="all">All</option>
            </select>
            <button type="button" onClick={fetchLabexJobs} className="text-sm px-3 py-1 border rounded bg-muted/10">Refresh</button>
          </div>
          <div className="grid gap-4 w-full" style={{ gridTemplateColumns: `repeat(${columns.length || 1}, 1fr)` }}>
            {columns.map((column) => (
              <LabexKanbanColumn 
                key={column.id} 
                column={column} 
                onDragStart={handleDragStart}
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                allCollapsed={allCollapsed}
              />
            ))}
          </div>
          <div className="mt-6 text-center text-xs text-muted-foreground">
            Labex: Complete production workflow from print ready to dispatch
          </div>
        </>
      ) : (
        <div className="text-center py-12">
          <div className="text-gray-500 mb-4">
            <svg className="h-16 w-16 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 012 2h2a2 2 0 012-2" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Labex Jobs Found</h3>
          <p className="text-gray-600 mb-4">
            The Labex board is ready but there are no jobs in the database yet.
          </p>
          <div className="text-sm text-gray-500">
            <p>To add Labex jobs:</p>
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li>Add jobs to the database with job IDs starting with "labex_"</li>
              <li>Or modify the API filter to use a different field</li>
              <li>Jobs will automatically appear in the appropriate columns</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
