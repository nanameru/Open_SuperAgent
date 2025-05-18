'use client';

import React, { useState, useEffect } from 'react';
import type { Message, ToolCallPart, ToolResultPart } from '@ai-sdk/react';
import { ChevronDownIcon, ChevronRightIcon, CogIcon, CheckCircleIcon, ExclamationCircleIcon } from '@heroicons/react/24/solid';

interface ChatMessageProps {
  message: Message;
}

// ツール呼び出しの状態を管理するための型
interface ToolCallState {
  id: string;
  toolName: string;
  args: object;
  result?: any;
  status: 'pending' | 'running' | 'success' | 'error'; // 実行中、成功、エラー
  isExpanded: boolean;
}

export const ChatMessage: React.FC<ChatMessageProps> = ({ message }) => {
  // デバッグモード（ノンプロダクション環境のみ）
  const DEBUG_MODE = process.env.NODE_ENV !== 'production';
  
  // デバッグ情報を表示
  useEffect(() => {
    if (DEBUG_MODE && (message as any).role === 'tool') {
      console.log('Tool message detected:', message);
    }
  }, [message, DEBUG_MODE]);

  const [toolCallStates, setToolCallStates] = useState<Record<string, ToolCallState>>({});

  useEffect(() => {
    if (message.role === 'assistant' && message.tool_calls && message.tool_calls.length > 0) {
      const newStates: Record<string, ToolCallState> = {};
      message.tool_calls.forEach(tc => {
        const existingState = toolCallStates[tc.toolCallId];
        newStates[tc.toolCallId] = {
          id: tc.toolCallId,
          toolName: tc.toolName,
          args: tc.args,
          result: existingState?.result, // Keep existing result if any
          status: existingState?.result ? (existingState.status === 'error' ? 'error' : 'success') : 'running', // If result exists, it's success/error, else running
          isExpanded: existingState?.isExpanded || false,
        };
      });
      setToolCallStates(prevStates => ({ ...prevStates, ...newStates }));
    }
    // Handle tool_results parts if they arrive separately (though usually merged into tool_calls)
    if (message.role === 'assistant' && message.tool_results && message.tool_results.length > 0) {
      const updatedStates: Record<string, ToolCallState> = {};
      message.tool_results.forEach(tr => {
        if (toolCallStates[tr.toolCallId]) {
          updatedStates[tr.toolCallId] = {
            ...toolCallStates[tr.toolCallId],
            result: tr.result,
            status: tr.isError ? 'error' : 'success',
          };
        }
      });
      setToolCallStates(prevStates => ({ ...prevStates, ...updatedStates }));
    }
  }, [message.tool_calls, message.tool_results, toolCallStates]); // Ensure toolCallStates is in dependency array if it's read

  const toggleSection = (id: string) => {
    setToolCallStates(prev => ({
      ...prev,
      [id]: { ...prev[id], isExpanded: !prev[id]?.isExpanded }
    }));
  };

  const renderToolCall = (toolState: ToolCallState) => {
    return (
      <div key={toolState.id} className="rounded-md overflow-hidden border border-gray-300 bg-gray-50 mb-3 shadow-sm">
        <div
          className="flex items-center px-4 py-3 bg-gray-100 cursor-pointer hover:bg-gray-200 transition-colors"
          onClick={() => toggleSection(toolState.id)}
        >
          <div className="mr-2">
            {toolState.isExpanded ?
              <ChevronDownIcon className="w-5 h-5 text-gray-600" /> :
              <ChevronRightIcon className="w-5 h-5 text-gray-600" />}
          </div>
          <div className="flex items-center flex-1">
            {toolState.status === 'running' && <CogIcon className="w-5 h-5 text-blue-500 mr-2 animate-spin" />}
            {toolState.status === 'success' && <CheckCircleIcon className="w-5 h-5 text-green-500 mr-2" />}
            {toolState.status === 'error' && <ExclamationCircleIcon className="w-5 h-5 text-red-500 mr-2" />}
            <span className="font-medium text-gray-800 text-sm">{toolState.toolName}</span>
            {toolState.status === 'running' && <span className="text-xs text-gray-500 ml-2">(実行中...)</span>}
            {toolState.status === 'error' && <span className="text-xs text-red-500 ml-2">(エラー)</span>}
          </div>
        </div>

        {toolState.isExpanded && (
          <div className="p-4 bg-white border-t border-gray-300">
            <h4 className="text-xs font-semibold text-gray-500 mb-1 uppercase tracking-wider">引数:</h4>
            <div className="bg-gray-50 rounded p-3 font-mono text-xs overflow-auto max-h-40 mb-3 border border-gray-200">
              <pre>{JSON.stringify(toolState.args, null, 2)}</pre>
            </div>

            {toolState.status === 'success' && toolState.result !== undefined && (
              <div>
                <h4 className="text-xs font-semibold text-gray-500 mb-1 uppercase tracking-wider">結果:</h4>
                <div className="bg-gray-50 rounded p-3 font-mono text-xs overflow-auto max-h-60 border border-gray-200">
                  <pre>{typeof toolState.result === 'string' ? toolState.result : JSON.stringify(toolState.result, null, 2)}</pre>
                </div>
              </div>
            )}
            {toolState.status === 'error' && toolState.result !== undefined && (
               <div>
                <h4 className="text-xs font-semibold text-red-500 mb-1 uppercase tracking-wider">エラー内容:</h4>
                <div className="bg-red-50 text-red-700 rounded p-3 font-mono text-xs overflow-auto max-h-60 border border-red-200">
                  <pre>{typeof toolState.result === 'string' ? toolState.result : JSON.stringify(toolState.result, null, 2)}</pre>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };
  
  // ユーザーメッセージ
  if (message.role === 'user') {
    return (
      <div className="flex justify-end mb-4">
        <div className="max-w-xl lg:max-w-2xl p-3 rounded-lg bg-blue-500 text-white shadow">
          {message.content}
        </div>
      </div>
    );
  }

  // アシスタントメッセージ
  if (message.role === 'assistant') {
    const toolCallUiElements = Object.values(toolCallStates)
      .filter(ts => message.tool_calls?.some(tc => tc.toolCallId === ts.id)) // Only show tools present in current message's tool_calls
      .map(renderToolCall);
      
    // If the message only contains tool calls that are now completed (have results),
    // and no other text content, we might not need to show a separate assistant text bubble.
    // However, for simplicity, we'll always show the text content if present.
    const hasTextContent = typeof message.content === 'string' && message.content.trim().length > 0;
    const hasUiParts = message.content && typeof message.content !== 'string' && message.content.length > 0;


    return (
      <div className="flex justify-start mb-4 flex-col items-start">
        {/* Assistant Text Content */}
        {(hasTextContent || hasUiParts) && (
          <div className="max-w-xl lg:max-w-2xl p-3 rounded-lg bg-gray-100 text-gray-800 border border-gray-300 shadow-sm mb-2">
            {typeof message.content === 'string'
              ? message.content.split('\\n').map((line, i) => <p key={i}>{line}</p>) // Basic multiline
              : message.content.map((part, index) => {
                  if (part.type === 'text') {
                    return part.text.split('\\n').map((line, i) => <p key={`${index}-${i}`}>{line}</p>);
                  }
                  // ToolCallPart and ToolResultPart are handled by toolCallStates logic below
                  return null; 
                })}
          </div>
        )}
        {/* Tool Calls and Results */}
        {toolCallUiElements.length > 0 && (
          <div className="w-full max-w-xl lg:max-w-2xl">
            {toolCallUiElements}
          </div>
        )}
      </div>
    );
  }

  // role: 'tool' messages (legacy or direct tool results not merged into assistant message)
  // This part might become less relevant if all tool interactions are via assistant.tool_calls
  if (message.role === 'tool') {
    // Try to find a matching tool call state if this 'tool' role message is a result
    const matchingToolCallState = Object.values(toolCallStates).find(ts => ts.id === (message as any).tool_call_id && ts.status !== 'success' && ts.status !== 'error');
    if (matchingToolCallState) {
      // Update the state (this is a bit of a side-effect here, ideally handled in useEffect)
      // For now, we assume useEffect on message.tool_results covers this, or that 'tool' role messages are deprecated.
    }

    return (
      <div className="flex justify-center my-3">
        <div className="p-3 rounded-md bg-yellow-100 border border-yellow-300 text-yellow-700 text-xs shadow-sm max-w-xl lg:max-w-2xl">
          <p className="font-semibold">ツール結果 ({ (message as any).tool_name || 'Unknown Tool'}):</p>
          <pre className="whitespace-pre-wrap break-all mt-1">{typeof message.content === 'string' ? message.content : JSON.stringify(message.content, null, 2)}</pre>
        </div>
      </div>
    );
  }

  return null; // Fallback for other roles or empty messages
}; 