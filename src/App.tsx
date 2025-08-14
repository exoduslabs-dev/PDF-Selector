import { Card, CardContent } from "@/components/ui/card";
import { APITester } from "./APITester";
import "./index.css";
import logo from "./logo.svg";
import reactLogo from "./react.svg";
import React, { useState } from "react";
import { QuotesPage } from "./pages/QuotesPage";
import { JobPage } from "./pages/JobPage";
import { ProductionPage } from "./pages/ProductionPage";
import { ArchivePage } from "./pages/ArchivePage";

export function App() {
  const [activeTab, setActiveTab] = useState("quotes");

  return (
    <div className="container mx-auto p-8 text-center relative z-10">
      {/* Fixed Header Tabs */}
      <header className="fixed top-0 left-0 w-full bg-white/80 backdrop-blur-md shadow z-20 flex justify-center gap-4 py-4 border-b border-gray-200">
        <button
          className={`px-6 py-2 rounded font-semibold transition-colors ${
            activeTab === "quotes"
              ? "bg-blue-600 text-white"
              : "bg-muted text-black"
          }`}
          onClick={() => setActiveTab("quotes")}
        >
          Quotes
        </button>
        <button
          className={`px-6 py-2 rounded font-semibold transition-colors ${
            activeTab === "job"
              ? "bg-blue-600 text-white"
              : "bg-muted text-black"
          }`}
          onClick={() => setActiveTab("job")}
        >
          Job
        </button>
        <button
          className={`px-6 py-2 rounded font-semibold transition-colors ${
            activeTab === "production"
              ? "bg-blue-600 text-white"
              : "bg-muted text-black"
          }`}
          onClick={() => setActiveTab("production")}
        >
          Production
        </button>
        <button
          className={`px-6 py-2 rounded font-semibold transition-colors ${
            activeTab === "archive"
              ? "bg-blue-600 text-white"
              : "bg-muted text-black"
          }`}
          onClick={() => setActiveTab("archive")}
        >
          Archive
        </button>
      </header>

      {/* Add spacing for fixed header */}
      <div className="h-20" />

      {/* Tab Content */}
      <Card className="bg-card/50 backdrop-blur-sm border-muted">
        <CardContent className="pt-6">
          {activeTab === "quotes" && <QuotesPage />}
          {activeTab === "job" && <JobPage />}
          {activeTab === "production" && <ProductionPage />}
          {activeTab === "archive" && <ArchivePage />}
        </CardContent>
      </Card>
    </div>
  );
}

export default App;