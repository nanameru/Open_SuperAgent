'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { PanelLeft } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import { ModelSelector } from './ModelSelector';

interface MainHeaderProps {
  onMenuClick?: () => void;
}

export const MainHeader = ({ onMenuClick }: MainHeaderProps) => {
  const isMobile = useIsMobile();

  return (
    <header className="bg-white sticky top-0 z-40 w-full">
      <div className="flex h-14 items-center px-4 md:px-6">
        {/* Left side: Hamburger Menu on Mobile */}
        <div className="flex items-center w-10">
          {isMobile && (
            <Button
              variant="ghost"
              size="icon"
              className="mr-2"
              onClick={onMenuClick}
            >
              <PanelLeft className="h-5 w-5" />
              <span className="sr-only">Open Menu</span>
            </Button>
          )}
        </div>
        
        {/* Center: Model selector */}
        <div className="flex-1 flex justify-center">
          <ModelSelector />
        </div>
        
        {/* Right side spacer */}
        <div className="flex items-center w-10"></div>
      </div>
    </header>
  );
}; 