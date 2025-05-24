'use client';

import React from 'react';
import { SidebarTrigger } from '@/components/ui/sidebar';

export const MainHeader = () => {
  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-40 w-full">
      <div className="flex h-14 items-center px-6">
        {/* Left side with sidebar trigger */}
        <div className="mr-4 hidden md:flex">
          <SidebarTrigger />
        </div>
      </div>
    </header>
  );
}; 