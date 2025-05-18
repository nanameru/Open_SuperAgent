'use client';

import React, { useState, useEffect } from 'react';
import type { Message, ToolCallPart, ToolResultPart } from '@ai-sdk/react';
import { ChevronDownIcon, ChevronUpIcon, CogIcon, CheckCircleIcon, ExclamationCircleIcon } from '@heroicons/react/24/solid';
import { PuzzlePieceIcon } from '@heroicons/react/24/outline';

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

// 折りたたみ可能なツールセクションコンポーネント
const CollapsibleToolSection = ({
  toolName,
  toolState,
  children,
  isLoading,
}: {
  toolName: string;
  toolState: 'call' | 'partial-call' | 'result' | string;
  children: React.ReactNode;
  isLoading: boolean;
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  // ツールの状態に応じた背景色クラスを設定
  const getBgColorClass = () => {
    switch (toolState) {
      case 'call':
      case 'partial-call':
      case 'running':
        return isLoading 
          ? 'bg-[rgb(245,245,245)] border-[rgb(245,245,245)]' 
          : 'bg-[rgb(245,245,245)] border-[rgb(245,245,245)]';
      case 'result':
      case 'success':
        return 'bg-[rgb(245,245,245)] border-[rgb(245,245,245)]';
      case 'error':
        return 'bg-red-50 border-red-200';
      default:
        return 'bg-[rgb(245,245,245)] border-[rgb(245,245,245)]';
    }
  };

  // ツールアイコンの色を状態に応じて設定
  const getIconColorClass = () => {
    switch (toolState) {
      case 'call':
      case 'partial-call':
      case 'running':
        return 'text-blue-500';
      case 'result':
      case 'success':
        return 'text-green-500';
      case 'error':
        return 'text-red-500';
      default:
        return 'text-gray-500';
    }
  };

  return (
    <div className={`rounded-lg border ${getBgColorClass()} overflow-hidden transition-colors duration-200 mb-3`}>
      <div 
        className="flex items-center justify-between px-3 py-2 cursor-pointer select-none hover:bg-gray-200 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center space-x-2">
          <PuzzlePieceIcon className={`h-5 w-5 ${getIconColorClass()}`} />
          <span className="font-medium text-sm">
            {toolName}
            {(isLoading && (toolState === 'running' || toolState === 'call')) && (
              <span className="ml-2 inline-block animate-pulse">処理中...</span>
            )}
            {toolState === 'error' && (
              <span className="ml-2 text-red-500">(エラー)</span>
            )}
          </span>
        </div>
        <button 
          className="text-gray-500 hover:text-gray-700 transition-colors"
          aria-label={isExpanded ? "折りたたむ" : "展開する"}
        >
          {isExpanded ? (
            <ChevronUpIcon className="h-5 w-5" />
          ) : (
            <ChevronDownIcon className="h-5 w-5" />
          )}
        </button>
      </div>
      
      {isExpanded && (
        <div className="px-3 pb-3 pt-0">
          {children}
        </div>
      )}
    </div>
  );
};

export const ChatMessage: React.FC<ChatMessageProps> = ({ message }) => {
  // デバッグモード（ノンプロダクション環境のみ）
  const DEBUG_MODE = process.env.NODE_ENV !== 'production';
  const [isLoading, setIsLoading] = useState(false);
  
  // デバッグ情報を表示
  useEffect(() => {
    if (DEBUG_MODE && (message as any).role === 'tool') {
      console.log('Tool message detected:', message);
    }
  }, [message, DEBUG_MODE]);

  const [toolCallStates, setToolCallStates] = useState<Record<string, ToolCallState>>({});

  // ツールメッセージの処理
  useEffect(() => {
    if (message.role === 'assistant') {
      // ローディング状態の検出
      const inProgress = message.id.startsWith('loading-');
      setIsLoading(inProgress);
      
      // ツール呼び出しの処理
      if (message.tool_calls && message.tool_calls.length > 0) {
        setToolCallStates(prevStates => {
          const newStates = { ...prevStates };
          message.tool_calls.forEach(tc => {
            const existingState = prevStates[tc.toolCallId];
            newStates[tc.toolCallId] = {
              id: tc.toolCallId,
              toolName: tc.toolName,
              args: tc.args,
              result: existingState?.result, // Keep existing result if any
              status: existingState?.result 
                ? (existingState.status === 'error' ? 'error' : 'success') 
                : 'running', // If result exists, it's success/error, else running
              isExpanded: existingState?.isExpanded || false,
            };
          });
          return newStates;
        });
      }
      
      // ツール結果の処理
      if (message.tool_results && message.tool_results.length > 0) {
        setToolCallStates(prevStates => {
          const updatedStates = { ...prevStates };
          message.tool_results.forEach(tr => {
            if (updatedStates[tr.toolCallId]) {
              updatedStates[tr.toolCallId] = {
                ...updatedStates[tr.toolCallId],
                result: tr.result,
                status: tr.isError ? 'error' : 'success',
              };
            }
          });
          return updatedStates;
        });
      }
      
      // tool_invocationを持つメッセージのパーツから情報を抽出
      if (message.parts && message.parts.length > 0) {
        setToolCallStates(prev => {
          const updatedStates = { ...prev };
          message.parts.forEach(part => {
            if (part.type === 'tool-invocation' && part.toolInvocation) {
              const { toolCallId, toolName, args, state } = part.toolInvocation;
              
              if (toolCallId && toolName) {
                let result: any = undefined;
                let status: ToolCallState['status'] = 'pending';
                
                if (state === 'result') {
                  result = (part.toolInvocation as any).result;
                  status = 'success';
                } else if (state === 'call' || state === 'partial-call') {
                  status = 'running';
                }
                
                updatedStates[toolCallId] = {
                  ...updatedStates[toolCallId],
                  id: toolCallId,
                  toolName,
                  args: args || {},
                  result,
                  status,
                  isExpanded: updatedStates[toolCallId]?.isExpanded || false,
                };
              }
            }
          });
          return updatedStates;
        });
      }
      
      // toolInvocationsから情報を抽出（代替フォーマット）
      if (message.toolInvocations && message.toolInvocations.length > 0) {
        setToolCallStates(prev => {
          const updatedStates = { ...prev };
          message.toolInvocations.forEach(inv => {
            const genericInv = inv as any;
            const toolName = genericInv.toolName || (genericInv.function ? genericInv.function.name : 'unknown_tool');
            const toolCallId = genericInv.toolCallId || genericInv.id || `fallback-id-${Math.random()}`;
            const args = genericInv.args || (genericInv.function ? genericInv.function.arguments : undefined);
            const state = genericInv.state;
            const result = genericInv.result;
            
            let status: ToolCallState['status'] = 'pending';
            if (state === 'result') {
              status = 'success';
            } else if (state === 'call') {
              status = 'running';
            } else if (result) {
              status = 'success';
            }
            
            updatedStates[toolCallId] = {
              ...updatedStates[toolCallId],
              id: toolCallId,
              toolName,
              args: args || {},
              result,
              status,
              isExpanded: updatedStates[toolCallId]?.isExpanded || false,
            };
          });
          return updatedStates;
        });
      }
    }
  }, [message]);

  const toggleSection = (id: string) => {
    setToolCallStates(prev => ({
      ...prev,
      [id]: { ...prev[id], isExpanded: !prev[id]?.isExpanded }
    }));
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
    // ツールの呼び出しUIを構築
    const toolCallUiElements = Object.values(toolCallStates).map(toolState => (
      <CollapsibleToolSection 
        key={toolState.id} 
        toolName={toolState.toolName} 
        toolState={toolState.status} 
        isLoading={isLoading}
      >
        <div className="space-y-3">
          <div>
            <h4 className="text-xs font-medium text-gray-500 mb-1">ツール引数</h4>
            <pre className="text-xs bg-black/5 p-2 rounded-md overflow-auto">
              {JSON.stringify(toolState.args, null, 2)}
            </pre>
          </div>
          
          {(toolState.status === 'success' || toolState.status === 'error') && toolState.result !== undefined && (
            <div>
              <h4 className="text-xs font-medium text-gray-500 mb-1">ツール結果</h4>
              <pre className={`text-xs ${toolState.status === 'error' ? 'bg-red-50 text-red-700' : 'bg-black/5'} p-2 rounded-md overflow-auto`}>
                {typeof toolState.result === 'string' 
                  ? toolState.result 
                  : JSON.stringify(toolState.result, null, 2)}
              </pre>
            </div>
          )}
        </div>
      </CollapsibleToolSection>
    ));
    
    const hasTextContent = typeof message.content === 'string' && message.content.trim().length > 0;
    const hasUiParts = message.content && typeof message.content !== 'string' && message.content.length > 0;

    return (
      <div className="flex justify-start mb-4 flex-col items-start">
        {/* アシスタントテキストコンテンツ */}
        {(hasTextContent || hasUiParts) && (
          <div className="max-w-xl lg:max-w-2xl p-3 rounded-lg bg-gray-100 text-gray-800 border border-gray-300 shadow-sm mb-2">
            {typeof message.content === 'string'
              ? message.content.split('\n').map((line, i) => <p key={i} className="mb-1">{line}</p>)
              : message.content.map((part, index) => {
                  if (part.type === 'text') {
                    return part.text.split('\n').map((line, i) => <p key={`${index}-${i}`} className="mb-1">{line}</p>);
                  }
                  return null; 
                })}
          </div>
        )}
        
        {/* ツールUIの表示 */}
        {toolCallUiElements.length > 0 && (
          <div className="w-full max-w-xl lg:max-w-2xl">
            {toolCallUiElements}
          </div>
        )}
      </div>
    );
  }

  // role: 'tool' メッセージ（レガシーまたはアシスタントにマージされていないツール結果）
  if (message.role === 'tool') {
    return (
      <div className="flex justify-center my-3">
        <div className="p-3 rounded-md bg-yellow-100 border border-yellow-300 text-yellow-700 text-xs shadow-sm max-w-xl lg:max-w-2xl">
          <p className="font-semibold">ツール結果 ({ (message as any).tool_name || 'Unknown Tool'}):</p>
          <pre className="whitespace-pre-wrap break-all mt-1">{typeof message.content === 'string' ? message.content : JSON.stringify(message.content, null, 2)}</pre>
        </div>
      </div>
    );
  }

  return null; // その他のroleやempty messagesのフォールバック
}; 