'use client';

import React from 'react';
import { Aperture, Home, Settings, User, BotMessageSquare } from 'lucide-react'; // Removed unused icons

export const Sidebar = () => {
  const menuItems = [
    { name: 'Home', href: '#', icon: Home, current: false },
    { name: 'Super Agent', href: '#', icon: BotMessageSquare, current: true },
    // Removed other menu items: AI Slides, AI Sheets, Image Studio, Video Generation, All Agents
  ];

  const bottomMenuItems = [
    { name: 'Me', href: '#', icon: User, current: false },
  ];

  return (
    // Open-SuperAgent sidebar has a dark background
    <aside className="w-60 bg-slate-900 text-slate-300 flex flex-col h-screen">
      {/* Logo Area */}
      <div className="p-4 h-16 flex items-center border-b border-slate-700">
        <Aperture className="h-8 w-8 text-sky-400 mr-2" /> {/* Open-SuperAgent logo icon */}
        <span className="text-xl font-semibold text-white">Open-SuperAgent</span>
      </div>

      {/* Navigation */}
      <nav className="flex-grow p-3 space-y-1">
        {menuItems.map((item) => (
          <a
            key={item.name}
            href={item.href}
            className={`flex items-center px-3 py-2.5 text-sm font-medium rounded-md transition-colors
              ${item.current 
                ? 'bg-slate-700 text-white' 
                : 'hover:bg-slate-800 hover:text-slate-100'
              }
            `}
          >
            <item.icon className="mr-3 h-5 w-5" aria-hidden="true" />
            {item.name}
          </a>
        ))}
      </nav>

      {/* Bottom Section (User/Settings) */}
      <div className="p-3 border-t border-slate-700">
        {bottomMenuItems.map((item) => (
            <a
              key={item.name}
              href={item.href}
              className={`flex items-center px-3 py-2.5 text-sm font-medium rounded-md hover:bg-slate-800 hover:text-slate-100 transition-colors`}
            >
              <item.icon className="mr-3 h-5 w-5" aria-hidden="true" />
              {item.name}
            </a>
          ))}
        <button 
          className="mt-1 w-full flex items-center px-3 py-2.5 text-sm font-medium rounded-md hover:bg-slate-800 hover:text-slate-100 transition-colors"
        >
          <Settings className="mr-3 h-5 w-5" aria-hidden="true" />
          {/* Could add text "Settings" if desired, or just keep icon */}
        </button>
      </div>
    </aside>
  );
}; 