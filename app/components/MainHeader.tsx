'use client';

import React from 'react';
import { Globe, Plus, Upload } from 'lucide-react'; // Using lucide-react for icons

export const MainHeader = () => {
  return (
    // Open-SuperAgent header is clean, typically white or light, with minimal borders if content dictates.
    // It's part of the main content flow, so its background matches the main content area.
    <header className="h-16 bg-white flex items-center justify-between px-6 border-b border-slate-200">
      {/* Title aligned to the left (or center, Open-SuperAgent image shows it more left-aligned with sidebar context) */}
      <div>
        <h1 className="text-lg font-semibold text-slate-800">Open-SuperAgent</h1>
      </div>

      {/* Icons on the right */}
      <div className="flex items-center space-x-2">
        <button className="p-2 rounded-md hover:bg-slate-100 text-slate-600 hover:text-slate-800 transition-colors">
          <Globe className="h-5 w-5" /> 
        </button>
        <button className="p-2 rounded-md hover:bg-slate-100 text-slate-600 hover:text-slate-800 transition-colors">
          <Plus className="h-5 w-5" />
        </button>
        <button className="p-2 rounded-md hover:bg-slate-100 text-slate-600 hover:text-slate-800 transition-colors">
          <Upload className="h-5 w-5" /> 
        </button>
      </div>
    </header>
  );
}; 