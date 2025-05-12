'use client';

import React, { useState, useEffect } from 'react';
import type { Message } from '@ai-sdk/react';
import { ChevronDownIcon, ChevronRightIcon } from '@heroicons/react/24/solid';

interface ChatMessageProps {
  message: Message;
}

export const ChatMessage: React.FC<ChatMessageProps> = ({ message }) => {
  // Enhanced debug logging to understand the message structure
  useEffect(() => {
    if ((message as any).content && typeof (message as any).content === 'string') {
      if ((message as any).content.includes('toolCallId') || 
          (message as any).content.includes('htmlSlideTool')) {
        console.log('Potential tool message detected:', message);
        try {
          const content = JSON.parse((message as any).content);
          console.log('Parsed content:', content);
        } catch (e) {
          // Not JSON, which is fine
        }
      }
    }
  }, [message]);

  // State for collapsible sections
  const [toolCallsExpanded, setToolCallsExpanded] = useState<Record<string, boolean>>({});
  
  // Helper function for toggle section visibility
  const toggleSection = (id: string) => {
    setToolCallsExpanded(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  // Extract message role safely
  const role = ((message as any).role || '').toLowerCase();
  
  // Handle special case for tool execution messages
  if (role === 'assistant' || role === 'tool') {
    // Check if this message contains a tool call
    // This tries to detect various formats of tool call data
    let toolCalls: Array<{id: string, name: string, args: any}> = [];
    let toolResults: Array<{id: string, result: any}> = [];
    
    // Try to parse structured tool calls from various possible locations
    try {
      const content = message.content;
      
      // Check if we have structured tool_calls directly on the message
      if ((message as any).tool_calls && Array.isArray((message as any).tool_calls)) {
        toolCalls = (message as any).tool_calls.map((tc: any) => ({
          id: tc.toolCallId || tc.id || 'unknown',
          name: tc.toolName || tc.name || 'unknown',
          args: tc.args || {}
        }));
      }
      // Check if message content is a JSON string with tool call info
      else if (typeof content === 'string') {
        try {
          const parsed = JSON.parse(content);
          
          // Format 1: Direct tool call from Mastra format
          if (parsed.toolName && parsed.args) {
            toolCalls.push({
              id: parsed.toolCallId || 'unknown',
              name: parsed.toolName,
              args: parsed.args
            });
          }
          // Format 2: Tool result from Mastra format
          else if (parsed.toolCallId && parsed.result) {
            toolResults.push({
              id: parsed.toolCallId,
              result: parsed.result
            });
          }
        } catch (e) {
          // Not JSON, ignore
        }
      }
    } catch (e) {
      console.warn('Error parsing tool information:', e);
    }

    // If this message represents a tool call (with arguments)
    if (toolCalls.length > 0) {
      return (
        <div className="mb-4">
          {toolCalls.map((tool) => (
            <div key={tool.id} className="rounded-md overflow-hidden border border-gray-200 bg-white mb-2">
              {/* Tool header */}
              <div 
                className="flex items-center px-3 py-2 bg-gray-50 cursor-pointer"
                onClick={() => toggleSection(tool.id)}
              >
                <div className="mr-2">
                  {toolCallsExpanded[tool.id] ? 
                    <ChevronDownIcon className="w-4 h-4 text-gray-500" /> : 
                    <ChevronRightIcon className="w-4 h-4 text-gray-500" />}
                </div>
                <div className="flex items-center">
                  <svg className="w-4 h-4 text-amber-500 mr-2" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 22C6.477 22 2 17.523 2 12S6.477 2 12 2s10 4.477 10 10-4.477 10-10 10zm0-2a8 8 0 100-16 8 8 0 000 16zm-1-5h2v2h-2v-2zm0-8h2v6h-2V7z"/>
                  </svg>
                  <span className="font-medium">{tool.name}</span>
                </div>
              </div>
              
              {/* Tool arguments */}
              {toolCallsExpanded[tool.id] && (
                <div className="p-4">
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Tool arguments</h4>
                  <div className="bg-gray-50 rounded p-3 font-mono text-xs overflow-auto">
                    <pre>{JSON.stringify(tool.args, null, 2)}</pre>
                  </div>
                  
                  {/* If we have a result for this tool, show it */}
                  {toolResults.find(r => r.id === tool.id) && (
                    <div className="mt-4">
                      <h4 className="text-sm font-medium text-gray-700 mb-2">Tool result</h4>
                      <div className="bg-gray-50 rounded p-3 font-mono text-xs overflow-auto">
                        <pre>{JSON.stringify(toolResults.find(r => r.id === tool.id)?.result, null, 2)}</pre>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      );
    }
    
    // If this message represents a tool result (without a matching call in this render context)
    if (toolResults.length > 0 && toolCalls.length === 0) {
      return (
        <div className="mb-4">
          {toolResults.map((result) => (
            <div key={result.id} className="rounded-md overflow-hidden border border-gray-200 bg-white mb-2">
              {/* Tool header */}
              <div 
                className="flex items-center px-3 py-2 bg-gray-50 cursor-pointer"
                onClick={() => toggleSection(result.id)}
              >
                <div className="mr-2">
                  {toolCallsExpanded[result.id] ? 
                    <ChevronDownIcon className="w-4 h-4 text-gray-500" /> : 
                    <ChevronRightIcon className="w-4 h-4 text-gray-500" />}
                </div>
                <div className="flex items-center">
                  <svg className="w-4 h-4 text-green-500 mr-2" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 22C6.477 22 2 17.523 2 12S6.477 2 12 2s10 4.477 10 10-4.477 10-10 10zm-1.177-7.86l-2.765-2.767L7 12.431l3.823 3.827L18 8.966l-1.060-1.06-6.117 6.234z"/>
                  </svg>
                  <span className="font-medium">Tool result</span>
                </div>
              </div>
              
              {/* Tool result content */}
              {toolCallsExpanded[result.id] && (
                <div className="p-4">
                  <div className="bg-gray-50 rounded p-3 font-mono text-xs overflow-auto">
                    <pre>{JSON.stringify(result.result, null, 2)}</pre>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      );
    }
  }

  // For standard message types (user, assistant)
  const isUser = role === 'user';
  
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4`}>
      <div
        className={`max-w-3xl p-3 rounded-lg ${
          isUser 
            ? 'bg-blue-50 text-blue-800' 
            : 'bg-white border border-gray-200 text-gray-800'
        }`}
      >
        {typeof message.content === 'string' ? message.content : 
          JSON.stringify(message.content)}
      </div>
    </div>
  );
}; 