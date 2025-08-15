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
}

export interface LabexColumnData {
  id: string;
  title: string;
  groupBy?: 'customer' | 'material' | 'finishing' | null;
  jobs: LabexJob[];
  color: string;
}

function groupJobsBy(jobs: LabexJob[], key: 'customer' | 'material' | 'finishing') {
  const groups: Record<string, LabexJob[]> = {};
  for (const job of jobs) {
    const groupKey = (job as any)[key] || 'Unassigned';
    if (!groups[groupKey]) groups[groupKey] = [];
    groups[groupKey].push(job);
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
      {/* Due Date - Top Right */}
      {job.readyDate && (
        <div className="absolute top-2 right-2 text-xs font-medium">
          {(() => {
            const today = new Date();
            const dueDate = new Date(job.readyDate);
            const daysRemaining = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
            
            let textColor = 'text-blue-600';
            if (daysRemaining < 3) textColor = daysRemaining < 2 ? 'text-red-600' : 'text-orange-600';
            
            return (
              <div className={`${textColor} font-bold`}>
                {daysRemaining > 0 ? `${daysRemaining}d` : 'OVERDUE'}
              </div>
            );
          })()}
        </div>
      )}
      
      {/* Job Number - Top Left */}
      <div className="text-sm font-medium text-left mb-2">Job #{job.jobNumber}</div>
      
      {/* Customer - Only show if not hidden by grouping */}
      {!hideCustomer && job.customer && (
        <div className="text-xs text-muted-foreground font-medium mb-1 text-left">{job.customer}</div>
      )}
      
      {/* Job Details - Avoid duplicates */}
      <div className="space-y-1 text-left">
        {job.quantity && (
          <div className="text-xs text-muted-foreground text-left">Qty: {job.quantity.toLocaleString()}</div>
        )}
        {job.tool && (
          <div className="text-xs text-muted-foreground text-left">Tool: {job.tool}</div>
        )}
        {!hideMaterial && job.material && (
          <div className="text-xs text-muted-foreground text-left">Material: {job.material}</div>
        )}
        {!hideFinishing && job.finishing && (
          <div className="text-xs text-muted-foreground text-left">Finishing: {job.finishing}</div>
        )}
      </div>
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
  groupBy?: 'customer' | 'material' | 'finishing' | null;
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

  // Initialize with sample Labex data
  useEffect(() => {
    const sampleLabexJobs: LabexJob[] = [
      {
        id: '1',
        jobNumber: 'labex_1001',
        customer: 'Acme Corp',
        material: 'Vinyl',
        finishing: 'Lamination',
        readyDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(), // 2 days from now
        orderDate: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
        quantity: 500,
        tool: 'Digital Press',
        processed: false,
        quoteId: 'q1001'
      },
      {
        id: '2',
        jobNumber: 'labex_1002',
        customer: 'Tech Solutions',
        material: 'Polyester',
        finishing: 'Die Cut',
        readyDate: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString(), // 1 day from now
        orderDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        quantity: 1000,
        tool: 'UV Printer',
        processed: false,
        quoteId: 'q1002'
      },
      {
        id: '3',
        jobNumber: 'labex_1003',
        customer: 'Global Industries',
        material: 'Paper',
        finishing: 'Slitting',
        readyDate: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000).toISOString(), // 4 days from now
        orderDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
        quantity: 2500,
        tool: 'Offset Press',
        processed: false,
        quoteId: 'q1003'
      },
      {
        id: '4',
        jobNumber: 'labex_1004',
        customer: 'Acme Corp',
        material: 'Vinyl',
        finishing: 'Lamination',
        readyDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(), // 1 day ago (overdue)
        orderDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
        quantity: 750,
        tool: 'Digital Press',
        processed: false,
        quoteId: 'q1004'
      },
      {
        id: '5',
        jobNumber: 'labex_1005',
        customer: 'Tech Solutions',
        material: 'Polyester',
        finishing: 'Die Cut',
        readyDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(), // 3 days from now
        orderDate: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
        quantity: 1500,
        tool: 'UV Printer',
        processed: false,
        quoteId: 'q1005'
      }
    ];

    const sampleLabexColumns: LabexColumnData[] = [
      { 
        id: 'print-ready', 
        title: 'Print Ready', 
        groupBy: 'customer', 
        color: 'border-l-blue-500', 
        jobs: sampleLabexJobs.filter(job => !job.processed && !job.finishing)
      },
      { 
        id: 'finishing-ready', 
        title: 'Finishing Ready', 
        groupBy: 'customer', 
        color: 'border-l-amber-500', 
        jobs: sampleLabexJobs.filter(job => !job.processed && job.finishing && !job.finishing.toLowerCase().includes('cut') && !job.finishing.toLowerCase().includes('slit'))
      },
      { 
        id: 'digital-cut', 
        title: 'Digital Cut', 
        groupBy: 'customer', 
        color: 'border-l-fuchsia-500', 
        jobs: sampleLabexJobs.filter(job => !job.processed && job.finishing && job.finishing.toLowerCase().includes('cut'))
      },
      { 
        id: 'slitting', 
        title: 'Slitting', 
        groupBy: 'customer', 
        color: 'border-l-indigo-500', 
        jobs: sampleLabexJobs.filter(job => !job.processed && job.finishing && job.finishing.toLowerCase().includes('slit'))
      },
      { 
        id: 'dispatched', 
        title: 'Dispatched', 
        groupBy: 'customer', 
        color: 'border-l-green-500', 
        jobs: sampleLabexJobs.filter(job => job.processed)
      }
    ];
    
    setColumns(sampleLabexColumns);
  }, []);

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

  const handleDrop = useCallback((e: React.DragEvent, targetColumnId: string, targetGroupName?: string) => {
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
      }
    } catch (error) {
      console.error('Error processing drop:', error);
    }
  }, []);

  // No loading or error states needed for blank board

  return (
    <div className="w-full">
      {columns.some(col => col.jobs.length > 0) ? (
        <>
          <div className="grid gap-4 w-full" style={{ gridTemplateColumns: 'repeat(5, 1fr)' }}>
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
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Labex Jobs Found</h3>
          <p className="text-gray-600 mb-4">
            The Labex board is ready but there are no jobs in the database yet.
          </p>
          <div className="text-sm text-gray-500">
            <p>To add Labex jobs:</p>
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li>Add jobs to the database with job numbers starting with "labex_"</li>
              <li>Or modify the API filter to use a different field</li>
              <li>Jobs will automatically appear in the appropriate columns</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
