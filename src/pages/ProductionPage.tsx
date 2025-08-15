import React, { useState } from "react";
import { KanbanBoard } from "../components/KanbanBoard";
import { LabexKanbanBoard } from "../components/LabexKanbanBoard";
import { cn } from "../lib/utils";

type TabType = 'printing' | 'finishing' | 'dispatch';
type BoardType = 'next-labels' | 'labex';

const tabs: { id: TabType; label: string; description: string }[] = [
  { id: 'printing', label: 'Printing', description: '' },
  { id: 'finishing', label: 'Finishing', description: '' },
  { id: 'dispatch', label: 'Dispatch', description: '' },
];

export function ProductionPage() {
  const [activeTab, setActiveTab] = useState<TabType>('printing');
  const [activeBoard, setActiveBoard] = useState<BoardType>('next-labels');
  const [allCollapsed, setAllCollapsed] = useState(false);

  const toggleAllGroups = () => {
    setAllCollapsed(prev => !prev);
  };

  return (
                    <div className="p-4 bg-gradient-to-br from-slate-50 to-slate-100 min-h-screen">
                  {/* Fixed Layout with Permanent Board Toggle */}
                  <div className="flex justify-between items-center mb-4">
                    {/* Left Side - Collapse All Button */}
                    <div className="flex-1 flex justify-start">
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

                    {/* Right Side - Board Selection (Fixed Position) */}
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
                      </div>
                    </div>
                  </div>

                        {/* Tab Content */}
                  {activeBoard === 'labex' ? (
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
                  )}
    </div>
  );
}
