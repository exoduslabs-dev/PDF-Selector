import type { BaseEntity } from './common.js';

// Job types
export interface Job extends BaseEntity {
  job_id: number;
  customer_name: string;
  project_name?: string;
  status?: string;
  priority?: string;
  due_date?: string;
  start_date?: string;
  completion_date?: string;
  notes?: string;
  is_active?: boolean;
  quote_id?: number;
}

export interface CreateJobRequest {
  customer_name: string;
  project_name?: string;
  status?: string;
  priority?: string;
  due_date?: string;
  start_date?: string;
  notes?: string;
  quote_id?: number;
}

export interface UpdateJobRequest extends Partial<CreateJobRequest> {
  job_id: number;
}

// Job line items
export interface JobLine extends BaseEntity {
  line_id: string;
  job_id: number;
  item_description: string;
  quantity: number;
  material_id?: string;
  specifications?: string;
  status?: string;
  notes?: string;
  process_step?: string;
  completion_percentage?: number;
}

export interface CreateJobLineRequest {
  job_id: number;
  item_description: string;
  quantity: number;
  material_id?: string;
  specifications?: string;
  status?: string;
  notes?: string;
  process_step?: string;
}

// Process steps
export interface ProcessStep extends BaseEntity {
  step_id: string;
  job_line_id: string;
  step_name: string;
  status?: string;
  start_time?: string;
  end_time?: string;
  operator?: string;
  notes?: string;
  sort_order?: number;
}

// Kanban data types
export interface KanbanColumn {
  id: string;
  title: string;
  items: KanbanItem[];
}

export interface KanbanItem {
  id: string;
  customer_name: string;
  project_name?: string;
  due_date?: string;
  status?: string;
  priority?: string;
  type: 'job' | 'quote';
  notes?: string;
  overdue?: boolean;
}
