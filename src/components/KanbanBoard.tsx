import React, { useMemo, useState, useCallback, useEffect } from 'react';
import { Card } from './ui/card';
import { cn } from '../lib/utils';
import { apiCall } from '../config/api';

export interface Job {
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

export interface ColumnData {
  id: string;
  title: string;
  groupBy?: 'customer' | 'material' | 'finishing' | null;
  jobs: Job[];
  color: string; // Tailwind border-l-* class
}

function groupJobsBy(jobs: Job[], key: 'customer' | 'material' | 'finishing') {
  const groups: Record<string, Job[]> = {};
  for (const job of jobs) {
    const groupKey = (job as any)[key] || 'Unassigned';
    if (!groups[groupKey]) groups[groupKey] = [];
    groups[groupKey].push(job);
  }
  return groups;
}

function JobCard({ 
  job, 
  color, 
  columnId, 
  onDragStart,
  hideCustomer = false,
  hideMaterial = false,
  hideFinishing = false,
  activeTab = ''
}: { 
  job: Job; 
  color: string;
  columnId: string;
  onDragStart: (e: React.DragEvent, jobId: string, sourceColumnId: string) => void;
  hideCustomer?: boolean;
  hideMaterial?: boolean;
  hideFinishing?: boolean;
  activeTab?: string;
}) {
  // Calculate days remaining and determine color based on workflow stage
  const getDueDateColor = () => {
    if (!job.readyDate) return color; // Use default color if no due date
    
    const today = new Date();
    const dueDate = new Date(job.readyDate);
    const daysRemaining = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    
    // Different thresholds for different workflow stages
    if (activeTab === 'printing') {
      if (daysRemaining >= 6) return 'border-l-green-500';
      if (daysRemaining >= 5) return 'border-l-orange-500';
      if (daysRemaining >= 4) return 'border-l-red-500';
    } else if (activeTab === 'finishing') {
      if (daysRemaining >= 5) return 'border-l-green-500';
      if (daysRemaining >= 4) return 'border-l-orange-500';
      if (daysRemaining >= 3) return 'border-l-red-500';
    } else if (['coated', 'digital-cut-ready', 'slitting-ready'].includes(columnId)) {
      if (daysRemaining >= 3) return 'border-l-green-500';
      if (daysRemaining >= 2) return 'border-l-orange-500';
      if (daysRemaining >= 1) return 'border-l-red-500';
    }
    
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
            if (activeTab === 'printing') {
              if (daysRemaining < 6) textColor = daysRemaining < 5 ? 'text-red-600' : 'text-orange-600';
            } else if (activeTab === 'finishing') {
              if (daysRemaining < 5) textColor = daysRemaining < 4 ? 'text-red-600' : 'text-orange-600';
            } else if (['coated', 'digital-cut-ready', 'slitting-ready'].includes(columnId)) {
              if (daysRemaining < 3) textColor = daysRemaining < 2 ? 'text-red-600' : 'text-orange-600';
            }
            
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
        {!hideMaterial && job.material && activeTab !== 'finishing' && (
          <div className="text-xs text-muted-foreground text-left">Material: {job.material}</div>
        )}
        {!hideFinishing && job.finishing && (
          <div className="text-xs text-muted-foreground text-left">Finishing: {job.finishing}</div>
        )}
        

      </div>
    </div>
  );
}

function JobGroup({ 
  groupName, 
  jobs, 
  color, 
  columnId, 
  onDragStart, 
  onDrop,
  groupBy,
  activeTab,
  allCollapsed
}: { 
  groupName: string; 
  jobs: Job[]; 
  color: string;
  columnId: string;
  onDragStart: (e: React.DragEvent, jobId: string, sourceColumnId: string) => void;
  onDrop: (e: React.DragEvent, targetColumnId: string, targetGroupName?: string) => void;
  groupBy?: 'customer' | 'material' | 'finishing' | null;
  activeTab?: string;
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
    // Set data for group drag
    e.dataTransfer.setData('application/json', JSON.stringify({ 
      type: 'group', 
      groupName, 
      columnId,
      jobIds: jobs.map(job => job.id)
    }));
    e.dataTransfer.effectAllowed = 'move';
  };

  // Handle group drag end
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
            <JobCard 
              key={job.id} 
              job={job} 
              color={color}
              columnId={columnId}
              onDragStart={onDragStart}
              hideCustomer={groupBy === 'customer'} // Hide customer if grouped by customer
              hideMaterial={groupBy === 'material'} // Hide material if grouped by material
              hideFinishing={groupBy === 'finishing'} // Hide finishing if grouped by finishing
              activeTab={activeTab}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function KanbanColumn({ 
  column, 
  onDragStart, 
  onDragOver, 
  onDrop,
  activeTab,
  allCollapsed
}: { 
  column: ColumnData;
  onDragStart: (e: React.DragEvent, jobId: string, sourceColumnId: string) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent, targetColumnId: string, targetGroupName?: string) => void;
  activeTab?: string;
  allCollapsed?: boolean;
}) {
  const groupedJobs = useMemo(() => {
    if (!column.groupBy) return { 'All Jobs': column.jobs } as Record<string, Job[]>;
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
          <JobGroup 
            key={groupName} 
            groupName={groupName} 
            jobs={jobs} 
            color={column.color}
            columnId={column.id}
            onDragStart={onDragStart}
            onDrop={onDrop}
            groupBy={column.groupBy}
            activeTab={activeTab}
            allCollapsed={allCollapsed}
          />
        ))}
      </div>
    </Card>
  );
}

const sampleData: ColumnData[] = [
  {
    id: 'waiting-artwork',
    title: 'Waiting for Artwork',
    groupBy: 'customer',
    color: 'border-l-red-500',
    jobs: [
      { id: 'ja1', jobNumber: '123', customer: 'Customer A' },
      { id: 'ja2', jobNumber: '124', customer: 'Customer A' },
      { id: 'jb1', jobNumber: '125', customer: 'Customer B' },
      { id: 'jc1', jobNumber: '126', customer: 'Customer C' },
    ],
  },
  {
    id: 'print-ready',
    title: 'Print Ready',
    groupBy: 'material',
    color: 'border-l-blue-500',
    jobs: [
      { id: 'm1', jobNumber: '456', material: 'PP60' },
      { id: 'm2', jobNumber: '457', material: 'Paper' },
      { id: 'm3', jobNumber: '458', material: 'Estate 8' },
      { id: 'm4', jobNumber: '459', material: 'PE' },
      { id: 'm5', jobNumber: '460', material: 'Polywhite' },
    ],
  },
  {
    id: 'finishing-ready',
    title: 'Finishing Ready',
    groupBy: 'finishing',
    color: 'border-l-amber-500',
    jobs: [
      { id: 'f1', jobNumber: '789', finishing: 'Laminate' },
      { id: 'f2', jobNumber: '790', finishing: 'TT Varnish' },
      { id: 'f3', jobNumber: '791', finishing: 'RT Varnish' },
      { id: 'f4', jobNumber: '792', finishing: 'Matte Varnish' },
    ],
  },
  { id: 'coated', title: 'Coated', groupBy: null, color: 'border-l-emerald-500', jobs: [
    { id: 'c1', jobNumber: '901' },
    { id: 'c2', jobNumber: '902' },
  ]},
  { id: 'digital-cut-ready', title: 'Digital Cut Ready', groupBy: null, color: 'border-l-fuchsia-500', jobs: [
    { id: 'd1', jobNumber: '903' },
  ]},
  { id: 'slitting-ready', title: 'Slitting Ready', groupBy: null, color: 'border-l-cyan-500', jobs: [
    { id: 's1', jobNumber: '904' },
  ]},
  { id: 'finished-production', title: 'Finished Production', groupBy: null, color: 'border-l-lime-500', jobs: [
    { id: 'fp1', jobNumber: '906' },
  ]},
  { id: 'distribution-ready', title: 'Distribution Ready', groupBy: null, color: 'border-l-violet-500', jobs: [
    { id: 'dr1', jobNumber: '907', readyDate: 'Today' },
    { id: 'dr2', jobNumber: '908', readyDate: 'Tomorrow' },
  ]},
];

export function KanbanBoard({ 
  activeTab, 
  boardType,
  allCollapsed, 
  onToggleAllGroups 
}: { 
  activeTab: 'printing' | 'finishing' | 'dispatch';
  boardType: 'next-labels';
  allCollapsed: boolean;
  onToggleAllGroups: () => void;
}) {
  const [columns, setColumns] = useState<ColumnData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch real data from API
  useEffect(() => {
    const fetchKanbanData = async () => {
      try {
        setLoading(true);
        // For now, use the same data source for both boards
        // Later you can modify the API to filter by company: boardType
        const response = await apiCall('/api/kanban-data?limit=20&company=next-labels');
        if (!response.ok) {
          throw new Error('Failed to fetch kanban data');
        }
        
        const result = await response.json();
        if (!result.success) {
          throw new Error(result.error || 'Failed to fetch data');
        }

        // Transform API data into column structure for Next Labels
        const realData: ColumnData[] = [
          {
            id: 'waiting-artwork',
            title: 'Waiting for Artwork',
            groupBy: 'customer',
            color: 'border-l-red-500',
            jobs: result.data.filter((job: any) => !job.processed && !job.finishing)
              .map((job: any) => ({
                id: job.id,
                jobNumber: job.jobNumber,
                customer: job.customer,
                material: job.material,
                finishing: job.finishing,
                readyDate: job.readyDate,
                orderDate: job.orderDate,
                quantity: job.quantity,
                tool: job.tool,
                processed: job.processed,
                quoteId: job.quoteId
              }))
              .sort((a: any, b: any) => {
                if (!a.readyDate && !b.readyDate) return 0;
                if (!a.readyDate) return 1;
                if (!b.readyDate) return -1;
                return new Date(a.readyDate).getTime() - new Date(b.readyDate).getTime();
              })
          },
          {
            id: 'print-ready',
            title: 'Print Ready',
            groupBy: 'material',
            color: 'border-l-blue-500',
            jobs: result.data.filter((job: any) => !job.processed && job.material && !job.finishing)
              .map((job: any) => ({
                id: job.id,
                jobNumber: job.jobNumber,
                customer: job.customer,
                material: job.material,
                finishing: job.finishing,
                readyDate: job.readyDate,
                orderDate: job.orderDate,
                quantity: job.quantity,
                tool: job.tool,
                processed: job.processed,
                quoteId: job.quoteId
              }))
              .sort((a: any, b: any) => {
                if (!a.readyDate && !b.readyDate) return 0;
                if (!a.readyDate) return 1;
                if (!b.readyDate) return -1;
                return new Date(a.readyDate).getTime() - new Date(b.readyDate).getTime();
              })
          },
          {
            id: 'finishing-ready',
            title: 'Finishing Ready',
            groupBy: 'finishing',
            color: 'border-l-amber-500',
            jobs: result.data.filter((job: any) => !job.processed && job.finishing)
              .map((job: any) => ({
                id: job.id,
                jobNumber: job.jobNumber,
                customer: job.customer,
                material: job.material,
                finishing: job.finishing,
                readyDate: job.readyDate,
                orderDate: job.orderDate,
                quantity: job.quantity,
                tool: job.tool,
                processed: job.processed,
                quoteId: job.quoteId
              }))
              .sort((a: any, b: any) => {
                if (!a.readyDate && !b.readyDate) return 0;
                if (!a.readyDate) return 1;
                if (!b.readyDate) return -1;
                return new Date(a.readyDate).getTime() - new Date(b.readyDate).getTime();
              })
          },
          {
            id: 'coated',
            title: 'Coated',
            groupBy: null,
            color: 'border-l-emerald-500',
            jobs: result.data.filter((job: any) => !job.processed && job.finishing && job.finishing.toLowerCase().includes('coat'))
              .map((job: any) => ({
                id: job.id,
                jobNumber: job.jobNumber,
                customer: job.customer,
                material: job.material,
                finishing: job.finishing,
                readyDate: job.readyDate,
                orderDate: job.orderDate,
                quantity: job.quantity,
                tool: job.tool,
                processed: job.processed,
                quoteId: job.quoteId
              }))
              .sort((a: any, b: any) => {
                if (!a.readyDate && !b.readyDate) return 0;
                if (!a.readyDate) return 1;
                if (!b.readyDate) return -1;
                return new Date(a.readyDate).getTime() - new Date(b.readyDate).getTime();
              })
          },
          {
            id: 'digital-cut-ready',
            title: 'Digital Cut Ready',
            groupBy: null,
            color: 'border-l-fuchsia-500',
            jobs: result.data.filter((job: any) => !job.processed && job.finishing && job.finishing.toLowerCase().includes('cut'))
              .map((job: any) => ({
                id: job.id,
                jobNumber: job.jobNumber,
                customer: job.customer,
                material: job.material,
                finishing: job.finishing,
                readyDate: job.readyDate,
                orderDate: job.orderDate,
                quantity: job.quantity,
                tool: job.tool,
                processed: job.processed,
                quoteId: job.quoteId
              }))
              .sort((a: any, b: any) => {
                if (!a.readyDate && !b.readyDate) return 0;
                if (!a.readyDate) return 1;
                if (!b.readyDate) return -1;
                return new Date(a.readyDate).getTime() - new Date(b.readyDate).getTime();
              })
          },
          {
            id: 'slitting-ready',
            title: 'Slitting Ready',
            groupBy: null,
            color: 'border-l-indigo-500',
            jobs: result.data.filter((job: any) => !job.processed && job.finishing && job.finishing.toLowerCase().includes('slit'))
              .map((job: any) => ({
                id: job.id,
                jobNumber: job.jobNumber,
                customer: job.customer,
                material: job.material,
                finishing: job.finishing,
                readyDate: job.readyDate,
                orderDate: job.orderDate,
                quantity: job.quantity,
                tool: job.tool,
                processed: job.processed,
                quoteId: job.quoteId
              }))
              .sort((a: any, b: any) => {
                if (!a.readyDate && !b.readyDate) return 0;
                if (!a.readyDate) return 1;
                if (!b.readyDate) return -1;
                return new Date(a.readyDate).getTime() - new Date(b.readyDate).getTime();
              })
          },
          {
            id: 'finished-production',
            title: 'Finished Production',
            groupBy: null,
            color: 'border-l-lime-500',
            jobs: result.data.filter((job: any) => job.processed)
              .map((job: any) => ({
                id: job.id,
                jobNumber: job.jobNumber,
                customer: job.customer,
                material: job.material,
                finishing: job.finishing,
                readyDate: job.readyDate,
                orderDate: job.orderDate,
                quantity: job.quantity,
                tool: job.tool,
                processed: job.processed,
                quoteId: job.quoteId
              }))
              .sort((a: any, b: any) => {
                if (!a.readyDate && !b.readyDate) return 0;
                if (!a.readyDate) return 1;
                if (!b.readyDate) return -1;
                return new Date(a.readyDate).getTime() - new Date(b.readyDate).getTime();
              })
          },
          {
            id: 'distribution-ready',
            title: 'Distribution Ready',
            groupBy: null,
            color: 'border-l-violet-500',
            jobs: result.data.filter((job: any) => job.processed && job.readyDate && new Date(job.readyDate) <= new Date())
              .map((job: any) => ({
                id: job.id,
                jobNumber: job.jobNumber,
                customer: job.customer,
                material: job.material,
                finishing: job.finishing,
                readyDate: job.readyDate,
                orderDate: job.orderDate,
                quantity: job.quantity,
                tool: job.tool,
                processed: job.processed,
                quoteId: job.quoteId
              }))
              .sort((a: any, b: any) => {
                if (!a.readyDate && !b.readyDate) return 0;
                if (!a.readyDate) return 1;
                if (!b.readyDate) return -1;
                return new Date(a.readyDate).getTime() - new Date(b.readyDate).getTime();
              })
          }
        ];

        setColumns(realData);
        setError(null);
      } catch (err: any) {
        console.error('Error fetching kanban data:', err);
        setError(err.message || 'Failed to fetch data');
        
        // Fallback to sample data for Next Labels
        setColumns(sampleData);
      } finally {
        setLoading(false);
      }
    };

    fetchKanbanData();
  }, []);



  // Filter columns based on active tab
  const filteredColumns = columns.filter(column => {
    switch (activeTab) {
      case 'printing':
        return ['waiting-artwork', 'print-ready', 'finishing-ready'].includes(column.id);
      case 'finishing':
        return ['finishing-ready', 'coated', 'digital-cut-ready', 'slitting-ready', 'finished-production'].includes(column.id);
      case 'dispatch':
        return ['finished-production', 'distribution-ready'].includes(column.id);
      default:
        return false;
    }
  });

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
          // Moving group within same column - just reorder
          return;
        } else {
          // Moving group between columns
          setColumns(prevColumns => {
            const sourceColumn = prevColumns.find(col => col.id === sourceColumnId);
            const targetColumn = prevColumns.find(col => col.id === targetColumnId);
            
            if (!sourceColumn || !targetColumn) return prevColumns;
            
            // Find all jobs in the group
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
                if (!movedJob) return column; // Guard against undefined
                
                const newJobs = [...column.jobs];
                
                // If target group is specified, move to that group
                if (targetGroupName && targetGroupName !== 'All Jobs') {
                  // Find the target group and add the job
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

  // Show loading state
  if (loading) {
    return (
      <div className="w-full flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading production data...</p>
        </div>
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className="w-full flex items-center justify-center py-12">
        <div className="text-center">
          <div className="text-red-500 mb-4">
            <svg className="h-12 w-12 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <p className="text-red-600 font-medium mb-2">Failed to load data</p>
          <p className="text-muted-foreground text-sm">{error}</p>
          <button 
            onClick={() => window.location.reload()} 
            className="mt-4 px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="grid gap-4 w-full" style={{
        gridTemplateColumns: activeTab === 'printing' 
          ? 'repeat(3, 1fr)'
          : activeTab === 'finishing'
            ? 'repeat(5, 1fr)'
            : 'repeat(2, 1fr)'
      }}>
        {filteredColumns.map((column) => (
          <KanbanColumn 
            key={column.id} 
            column={column} 
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            activeTab={activeTab}
            allCollapsed={allCollapsed}
          />
        ))}
      </div>
      <div className="mt-6 text-center text-xs text-muted-foreground">
        {activeTab === 'printing' && 'Printing: Waiting for artwork, print ready, and finishing preparation'}
        {activeTab === 'finishing' && 'Finishing: Coating, digital cutting, slitting, and production completion'}
        {activeTab === 'dispatch' && 'Dispatch: Quality check and shipping preparation'}
      </div>
    </div>
  );
}


