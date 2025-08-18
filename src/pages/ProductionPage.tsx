import React, { useMemo, useState } from "react";
import { KanbanBoard } from "../components/KanbanBoard";
import { LabexKanbanBoard } from "../components/LabexKanbanBoard";
import { cn } from "../lib/utils";
import { ProductionList } from "../pages/ProductionList";
import { Button } from "../components/ui/button";
import { Label } from "../components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";

type TabType = 'printing' | 'finishing' | 'dispatch';
type BoardType = 'next-labels' | 'labex';
type ViewMode = 'kanban' | 'list';

type SortOrder = 'asc' | 'desc';
type SortColumn = 'dueDate' | 'orderDate' | 'customer' | 'material' | 'finishing' | 'quantity' | 'jobNumber' | 'tool';
interface SortRule { column: SortColumn; order: SortOrder }

const tabs: { id: TabType; label: string; description: string }[] = [
  { id: 'printing', label: 'Printing', description: '' },
  { id: 'finishing', label: 'Finishing', description: '' },
  { id: 'dispatch', label: 'Dispatch', description: '' },
];

export function ProductionPage() {
  const [activeTab, setActiveTab] = useState<TabType>('printing');
  const [activeBoard, setActiveBoard] = useState<BoardType>('next-labels');
  const [allCollapsed, setAllCollapsed] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('kanban');
  const [showSortConfig, setShowSortConfig] = useState(false);
  const [sortRules, setSortRules] = useState<SortRule[]>([
    { column: 'dueDate', order: 'asc' },
  ]);

  const toggleAllGroups = () => {
    setAllCollapsed(prev => !prev);
  };

  return (
                    <div className="p-4 bg-gradient-to-br from-slate-50 to-slate-100 min-h-screen">
                  {/* Fixed Layout with Permanent Board Toggle */}
                  <div className="flex justify-between items-center mb-4">
                    {/* Left Side - Collapse All Button */}
                    <div className="flex-1 flex items-center gap-2 justify-start">
                      <button
                        onClick={toggleAllGroups}
                        className="px-4 py-2 text-sm font-medium rounded-md transition-all duration-200 bg-gray-100 text-gray-600 hover:text-gray-900 hover:bg-gray-200 flex items-center gap-2"
                      >
                        <svg 
                          className="h-4 w-4" 
                          fill="none" 
                          viewBox="0 0 24 24" 
                          stroke="currentColor"
                        >
                          {allCollapsed ? (
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7 7" />
                          ) : (
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          )}
                        </svg>
                        {allCollapsed ? 'Expand All' : 'Collapse All'}
                      </button>
                      {viewMode === 'list' && (
                        <button
                          onClick={() => setShowSortConfig(v => !v)}
                          className="px-4 py-2 text-sm font-medium rounded-md transition-all duration-200 bg-white text-gray-700 hover:text-gray-900 hover:bg-gray-100 border"
                        >
                          Sorting
                        </button>
                      )}
                    </div>

                    {/* Center - Workflow Tabs (Only for Next Labels) */}
                    <div className="flex-1 flex justify-center">
                      {activeBoard === 'next-labels' && (
                        <div className="flex space-x-1 bg-white rounded-lg p-1 shadow-sm">
                          {tabs.map((tab) => (
                            <button
                              key={tab.id}
                              onClick={() => setActiveTab(tab.id)}
                              className={cn(
                                "px-4 py-2 text-sm font-medium rounded-md transition-all duration-200",
                                activeTab === tab.id
                                  ? "bg-blue-500 text-white shadow-sm"
                                  : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                              )}
                            >
                              <div className="text-center">
                                <div className="font-semibold">{tab.label}</div>
                                {tab.description && (
                                  <div className="text-xs opacity-80">{tab.description}</div>
                                )}
                              </div>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Right Side - Board Selection + View Mode Toggle */}
                    <div className="flex-1 flex justify-end">
                      <div className="flex space-x-1 bg-white rounded-lg p-1 shadow-sm">
                        <button
                          onClick={() => setActiveBoard('next-labels')}
                          className={cn(
                            "px-4 py-2 text-sm font-medium rounded-md transition-all duration-200",
                            activeBoard === 'next-labels'
                              ? "bg-green-500 text-white shadow-sm"
                              : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                          )}
                        >
                          <div className="text-center">
                            <div className="font-semibold">Next Labels</div>
                          </div>
                        </button>
                        <button
                          onClick={() => setActiveBoard('labex')}
                          className={cn(
                            "px-4 py-2 text-sm font-medium rounded-md transition-all duration-200",
                            activeBoard === 'labex'
                              ? "bg-green-500 text-white shadow-sm"
                              : "text-gray-500 hover:text-gray-900 hover:bg-gray-100"
                          )}
                        >
                          <div className="text-center">
                            <div className="font-semibold">Labex</div>
                          </div>
                        </button>
                        <div className="w-px bg-gray-200 mx-2" />
                        <button
                          onClick={() => setViewMode('kanban')}
                          className={cn(
                            "px-4 py-2 text-sm font-medium rounded-md transition-all duration-200",
                            viewMode === 'kanban' ? "bg-blue-500 text-white shadow-sm" : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                          )}
                        >
                          Kanban
                        </button>
                        <button
                          onClick={() => setViewMode('list')}
                          className={cn(
                            "px-4 py-2 text-sm font-medium rounded-md transition-all duration-200",
                            viewMode === 'list' ? "bg-blue-500 text-white shadow-sm" : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                          )}
                        >
                          List
                        </button>
                      </div>
                    </div>
                  </div>
                  {viewMode === 'list' && showSortConfig && (
                    <div className="mb-4 p-3 bg-white rounded-lg shadow border">
                      <div className="flex items-center justify-between mb-2">
                        <div className="text-sm font-semibold">Sorting Rules</div>
                        <div className="flex items-center gap-2">
                          <Button size="sm" variant="outline" onClick={() => setSortRules(r => [...r, { column: 'dueDate', order: 'asc' }])}>Add Rule</Button>
                          <Button size="sm" onClick={() => setShowSortConfig(false)}>Done</Button>
                        </div>
                      </div>
                      <div className="space-y-2">
                        {sortRules.map((rule, idx) => {
                          const usedColumns = new Set(sortRules.map(r => r.column));
                          return (
                          <div key={idx} className="grid grid-cols-12 items-center gap-2">
                            <div className="col-span-5 flex items-center gap-2">
                              <Label className="text-xs w-16">Column</Label>
                              <Select value={rule.column} onValueChange={(val) => {
                                // Prevent duplicate columns
                                setSortRules(r => {
                                  if (r.some((rr, i) => i !== idx && rr.column === (val as SortColumn))) {
                                    return r; // ignore change if duplicate
                                  }
                                  return r.map((rr, i) => i===idx ? { ...rr, column: val as SortColumn } : rr);
                                });
                              }}>
                                <SelectTrigger className="h-8">
                                  <SelectValue placeholder="Column" />
                                </SelectTrigger>
                                <SelectContent>
                                  {(['dueDate','orderDate','customer','material','finishing','quantity','jobNumber','tool'] as SortColumn[]).map(col => (
                                    <SelectItem key={col} value={col} disabled={col !== rule.column && usedColumns.has(col)}>{
                                      col === 'dueDate' ? 'Due Date' :
                                      col === 'orderDate' ? 'Order Date' :
                                      col === 'customer' ? 'Customer' :
                                      col === 'material' ? 'Material' :
                                      col === 'finishing' ? 'Finishing' :
                                      col === 'quantity' ? 'Quantity' :
                                      col === 'jobNumber' ? 'Job Number' :
                                      'Tool'
                                    }</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="col-span-5 flex items-center gap-2">
                              <Label className="text-xs w-16">Order</Label>
                              <Select value={rule.order} onValueChange={(val) => setSortRules(r => r.map((rr, i) => i===idx ? { ...rr, order: val as SortOrder } : rr))}>
                                <SelectTrigger className="h-8">
                                  <SelectValue placeholder="Order" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="asc">Ascending</SelectItem>
                                  <SelectItem value="desc">Descending</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="col-span-2 flex justify-end">
                              <Button size="sm" variant="outline" onClick={() => setSortRules(r => r.filter((_, i) => i !== idx))}>Remove</Button>
                            </div>
                          </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                        {/* Tab Content */}
                  {viewMode === 'kanban' ? (
                    activeBoard === 'labex' ? (
                      <LabexKanbanBoard 
                        allCollapsed={allCollapsed}
                        onToggleAllGroups={toggleAllGroups}
                      />
                    ) : (
                      <KanbanBoard 
                        activeTab={activeTab} 
                        boardType={activeBoard}
                        allCollapsed={allCollapsed}
                        onToggleAllGroups={toggleAllGroups}
                      />
                    )
                  ) : (
                    <ProductionList sortRules={sortRules} />
                  )}
    </div>
  );
}
