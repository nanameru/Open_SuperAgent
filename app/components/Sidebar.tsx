'use client';

import { useState } from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { TooltipProvider, Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { Separator } from '@/components/ui/separator';
import { Aperture, Settings, User, BotMessageSquare, ChevronRight, ChevronLeft, BrainCircuit, Wrench, Film, Folder, Sparkles } from 'lucide-react';
import { usePathname } from 'next/navigation';

interface SidebarProps extends React.HTMLAttributes<HTMLDivElement> {}

export function Sidebar({ className }: SidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const pathname = usePathname();

  const toggleSidebar = () => {
    setIsCollapsed(!isCollapsed);
  }

  return (
    <div className={cn('h-full', className)}>
      <TooltipProvider>
        <div className={cn('h-full bg-black border-r flex flex-col text-white', isCollapsed ? 'w-16' : 'w-64')}>
          <div className="flex items-center justify-between p-2">
            {!isCollapsed && <span className="text-lg font-semibold">Mastra</span>}
            <button onClick={toggleSidebar} className="p-2 rounded-lg hover:bg-gray-800">
              {isCollapsed ? <ChevronRight /> : <ChevronLeft />}
            </button>
          </div>
          <Separator className="bg-gray-700" />
          <nav className="flex-1 p-2 space-y-2">
            <SidebarItem icon={<BotMessageSquare size={20} />} href="/" text="Agent" isCollapsed={isCollapsed} isActive={pathname === '/'} />
            <SidebarItem icon={<BrainCircuit size={20} />} href="/multi-agent" text="Multi Agent" isCollapsed={isCollapsed} isActive={pathname === '/multi-agent'} />
            <SidebarItem icon={<Wrench size={20} />} href="/tools" text="Tools" isCollapsed={isCollapsed} isActive={pathname.startsWith('/tools')} />
            <SidebarItem icon={<Sparkles size={20} />} href="/usecases" text="Usecases" isCollapsed={isCollapsed} isActive={pathname.startsWith('/usecases')} />
          </nav>
          <Separator className="bg-gray-700" />
          <div className="p-2">
            <SidebarItem icon={<User size={20} />} href="/settings" text="Account" isCollapsed={isCollapsed} isActive={pathname.startsWith('/settings')} />
          </div>
        </div>
      </TooltipProvider>
    </div>
  );
}

interface SidebarItemProps {
  icon: React.ReactNode;
  text: string;
  href: string;
  isCollapsed: boolean;
  isActive: boolean;
}

function SidebarItem({ icon, text, href, isCollapsed, isActive }: SidebarItemProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Link
          href={href}
          className={cn(
            'flex items-center p-2 rounded-lg text-white hover:bg-gray-800',
            isActive && 'bg-gray-700',
            isCollapsed ? 'justify-center' : ''
          )}
        >
          {icon}
          {!isCollapsed && <span className="ml-4">{text}</span>}
        </Link>
      </TooltipTrigger>
      {isCollapsed && (
        <TooltipContent side="right">
          <p>{text}</p>
        </TooltipContent>
      )}
    </Tooltip>
  );
}