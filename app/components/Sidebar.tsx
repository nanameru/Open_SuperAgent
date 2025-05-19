'use client';

import React, { useState } from 'react';
import { Aperture, Home, Settings, User, BotMessageSquare, Image, FileText, Layout, Code, ChevronRight, Sparkles } from 'lucide-react';

export const Sidebar = () => {
  const [isExpanded, setIsExpanded] = useState(false);

  const menuItems = [
    { name: 'Home', href: '#', icon: Home, current: false },
    { name: 'Super Agent', href: '#', icon: BotMessageSquare, current: true },
    { name: 'Slide Creator', href: '#', icon: Layout, current: false },
    { name: 'Image Generator', href: '#', icon: Image, current: false },
    { name: 'Code Assistant', href: '#', icon: Code, current: false },
  ];

  const bottomMenuItems = [
    { name: 'Profile', href: '#', icon: User, current: false },
    { name: 'Settings', href: '#', icon: Settings, current: false },
  ];

  const toggleSidebar = () => {
    setIsExpanded(!isExpanded);
  };

  return (
    <aside 
      className={`${isExpanded ? 'w-64' : 'w-20'} transition-all duration-300 ease-in-out 
                 bg-gradient-to-b from-gray-900 via-gray-800 to-gray-900 
                 text-gray-100 flex flex-col h-screen shadow-[5px_0_15px_rgba(0,0,0,0.1)]
                 relative`}
    >
      {/* Expand/Collapse Button */}
      <button 
        onClick={toggleSidebar}
        className="absolute -right-3 top-20 bg-blue-600 rounded-full w-6 h-6 flex items-center justify-center
                  shadow-md hover:bg-blue-500 transition-colors z-10"
      >
        <ChevronRight className={`h-4 w-4 text-white transform transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`} />
      </button>

      {/* Logo Area */}
      <div className="p-4 h-20 flex items-center border-b border-gray-700/50 bg-gradient-to-r from-blue-600/20 to-transparent">
        <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 shadow-lg mr-3">
          <Aperture className="h-7 w-7 text-white" />
        </div>
        <span className={`text-xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent
                        transition-opacity duration-300 ${isExpanded ? 'opacity-100' : 'opacity-0 hidden'}`}>
          SuperAgent
        </span>
      </div>

      {/* Navigation */}
      <nav className="flex-grow p-3 space-y-1">
        {menuItems.map((item) => (
          <a
            key={item.name}
            href={item.href}
            className={`flex items-center px-3 py-3 rounded-xl transition-all duration-200
              group relative overflow-hidden
              ${item.current 
                ? 'bg-gradient-to-r from-blue-600/80 to-blue-600/20 text-white shadow-md' 
                : 'hover:bg-gray-700/40 hover:shadow-md'
              }
            `}
          >
            <div className={`flex items-center justify-center min-w-10 ${isExpanded ? '' : 'mx-auto'}`}>
              <item.icon className={`h-5 w-5 ${item.current ? 'text-white' : 'text-gray-300 group-hover:text-white'}`} />
            </div>
            <span className={`ml-3 font-medium whitespace-nowrap transition-opacity duration-300 
                            ${isExpanded ? 'opacity-100' : 'opacity-0 hidden'}`}>
              {item.name}
            </span>
            {item.current && (
              <span className="absolute inset-y-0 left-0 w-1 bg-blue-400 rounded-r-full" aria-hidden="true" />
            )}
          </a>
        ))}
      </nav>

      {/* Premium Button */}
      <div className="px-3 mb-4">
        <button 
          className={`w-full flex items-center justify-center p-3 rounded-xl bg-gradient-to-r from-amber-500 to-amber-400
                    text-gray-900 font-medium shadow-md hover:shadow-lg transition-all
                    ${isExpanded ? '' : 'p-2'}`}
        >
          <Sparkles className="h-5 w-5" aria-hidden="true" />
          <span className={`ml-2 transition-opacity duration-300 ${isExpanded ? 'opacity-100' : 'opacity-0 hidden'}`}>
            Upgrade Pro
          </span>
        </button>
      </div>

      {/* Bottom Section */}
      <div className="p-3 border-t border-gray-700/50">
        {bottomMenuItems.map((item) => (
          <a
            key={item.name}
            href={item.href}
            className={`flex items-center px-3 py-3 rounded-xl my-1 transition-all duration-200
                      hover:bg-gray-700/40 group ${isExpanded ? '' : 'justify-center'}`}
          >
            <item.icon className="h-5 w-5 text-gray-400 group-hover:text-gray-100" aria-hidden="true" />
            <span className={`ml-3 text-sm font-medium transition-opacity duration-300 
                            ${isExpanded ? 'opacity-100' : 'opacity-0 hidden'}`}>
              {item.name}
            </span>
          </a>
        ))}
      </div>
    </aside>
  );
}; 