'use client';

import React, { useState, useEffect, ReactNode } from 'react';
import type { Message } from 'ai';
import { ChevronDownIcon, ChevronUpIcon, CogIcon, CheckCircleIcon, ExclamationCircleIcon } from '@heroicons/react/24/solid';
import { PuzzlePieceIcon } from '@heroicons/react/24/outline';
import { PresentationPreviewPanel } from './PresentationPreviewPanel';
import { ImagePreviewPanel } from './ImagePreviewPanel';
import { EyeIcon, DocumentTextIcon, PhotoIcon } from '@heroicons/react/24/outline';

// 拡張メッセージパートの型
type MessageContentPart = {
  type: string;
  text?: string;
};

// AIメッセージの拡張された型（ツール呼び出しなどの情報を含む）
interface ExtendedMessage {
  id: string;
  role: 'user' | 'assistant' | 'system' | 'tool' | 'data';
  content: string | MessageContentPart[];
  createdAt?: Date;
  tool_name?: string;
  tool_calls?: Array<{
    toolCallId: string;
    toolName: string;
    args: any;
  }>;
  tool_results?: Array<{
    toolCallId: string;
    result: any;
    isError?: boolean;
    autoOpen?: boolean;
  }>;
  toolInvocations?: Array<any>;
  parts?: Array<{
    type: string;
    text?: string;
    toolInvocation?: {
      toolCallId: string;
      toolName: string;
      args?: any;
      state?: string;
      result?: any;
    };
  }>;
}

interface ChatMessageProps {
  message: ExtendedMessage;
  onPreviewOpen?: () => void; // プレビューが開かれたときのコールバック
  onPreviewClose?: () => void; // プレビューが閉じられたときのコールバック
  onPreviewWidthChange?: (width: number) => void; // プレビューパネルの幅が変更されたときのコールバック
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

// プレゼンテーションプレビュー状態
interface PresentationPreviewState {
  isOpen: boolean;
  htmlContent: string;
  title: string;
}

// 画像プレビュー状態
interface ImagePreviewState {
  isOpen: boolean;
  images: Array<{
    url: string;
    b64Json: string;
  }>;
  title: string;
}

// 折りたたみ可能なツールセクションコンポーネント
const CollapsibleToolSection = ({
  toolName,
  toolState,
  children,
  isLoading,
  isPreviewTool = false,
  isImageTool = false,
  onPreviewClick = () => {},
  onImageClick = () => {},
  previewHtml = '',
  imageUrls = [],
}: {
  toolName: string;
  toolState: 'call' | 'partial-call' | 'result' | string;
  children: React.ReactNode;
  isLoading: boolean;
  isPreviewTool?: boolean;
  isImageTool?: boolean;
  onPreviewClick?: () => void;
  onImageClick?: () => void;
  previewHtml?: string;
  imageUrls?: string[];
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  // ツールの状態に応じた背景色クラスを設定
  const getBgColorClass = () => {
    switch (toolState) {
      case 'call':
      case 'partial-call':
      case 'running':
        return isLoading 
          ? 'bg-gray-100 border-gray-200' 
          : 'bg-[rgb(245,245,245)] border-[rgb(245,245,245)]';
      case 'result':
      case 'success':
        return 'bg-gray-50 border-gray-200';
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
        return 'text-gray-600';
      case 'result':
      case 'success':
        return 'text-gray-700';
      case 'error':
        return 'text-red-500';
      default:
        return 'text-gray-500';
    }
  };

  // ツールの状態に応じたアイコンを表示
  const getStateIcon = () => {
    switch (toolState) {
      case 'call':
      case 'partial-call':
      case 'running':
        return isLoading ? <CogIcon className="h-4 w-4 animate-spin" /> : <PuzzlePieceIcon className="h-4 w-4" />;
      case 'result':
      case 'success':
        return <CheckCircleIcon className="h-4 w-4" />;
      case 'error':
        return <ExclamationCircleIcon className="h-4 w-4" />;
      default:
        return <PuzzlePieceIcon className="h-4 w-4" />;
    }
  };

  const handleHeaderClick = () => {
    setIsExpanded(!isExpanded);
  };

  return (
    <div className={`rounded-lg border ${getBgColorClass()} overflow-hidden transition-colors duration-200 mb-3 shadow-sm`}>
      <div className="flex items-center justify-between px-3 py-2">
        <div 
          className="flex items-center space-x-2 cursor-pointer select-none hover:bg-gray-200/50 transition-colors flex-grow rounded px-2 py-1"
          onClick={handleHeaderClick}
        >
          <div className={`flex items-center justify-center h-5 w-5 ${getIconColorClass()}`}>
            {getStateIcon()}
          </div>
          <span className="font-medium text-sm flex items-center">
            {toolName === 'geminiImageGenerationTool' ? 'Gemini画像生成' : 
             toolName === 'gemini-image-generation' ? 'Gemini画像生成' : 
             toolName === 'imagen4-generation' ? 'Imagen 4画像生成' :
             toolName === 'htmlSlideTool' ? 'HTMLスライド生成' : 
             toolName}
            {(isLoading && (toolState === 'running' || toolState === 'call')) && (
              <span className="ml-2 inline-block text-gray-600 text-xs font-normal animate-pulse">処理中...</span>
            )}
            {toolState === 'error' && (
              <span className="ml-2 text-red-500 text-xs font-normal">(エラー)</span>
            )}
            {(toolState === 'success' || toolState === 'result') && (
              <span className="ml-2 text-gray-600 text-xs font-normal">(完了)</span>
            )}
          </span>
        </div>

        <div className="flex items-center">
          {/* プレビューツールの場合はプレビューボタンを表示 */}
          {isPreviewTool && (toolState === 'success' || toolState === 'result') && previewHtml && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onPreviewClick();
              }}
              className="mr-2 px-3 py-1 bg-gray-800 text-white rounded-md text-xs flex items-center hover:bg-gray-700 transition-colors"
              title="スライドをプレビュー表示"
            >
              <EyeIcon className="h-3 w-3 mr-1" />
              <span>プレビュー</span>
            </button>
          )}
          
          {/* 画像ツールの場合は画像プレビューボタンを表示 */}
          {isImageTool && (toolState === 'success' || toolState === 'result') && imageUrls && imageUrls.length > 0 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onImageClick();
              }}
              className="mr-2 px-3 py-1 bg-gray-800 text-white rounded-md text-xs flex items-center hover:bg-gray-700 transition-colors"
              title="生成された画像をプレビュー表示"
            >
              <PhotoIcon className="h-3 w-3 mr-1" />
              <span>プレビュー</span>
            </button>
          )}
          
          <button 
            className="text-gray-500 hover:text-gray-700 transition-colors p-1 rounded-full hover:bg-gray-200/50"
            aria-label={isExpanded ? "折りたたむ" : "展開する"}
            onClick={handleHeaderClick}
          >
            {isExpanded ? (
              <ChevronUpIcon className="h-5 w-5" />
            ) : (
              <ChevronDownIcon className="h-5 w-5" />
            )}
          </button>
        </div>
      </div>
      
      {isExpanded && (
        <div className="px-3 pb-3 pt-0">
          {children}
        </div>
      )}
    </div>
  );
};

export const ChatMessage: React.FC<ChatMessageProps> = ({ message, onPreviewOpen, onPreviewClose, onPreviewWidthChange }) => {
  // デバッグモード（ノンプロダクション環境のみ）
  const DEBUG_MODE = process.env.NODE_ENV !== 'production';
  const [isLoading, setIsLoading] = useState(false);
  
  // プレゼンテーションプレビュー状態
  const [presentationPreview, setPresentationPreview] = useState<PresentationPreviewState>({
    isOpen: false,
    htmlContent: '',
    title: 'プレゼンテーションプレビュー'
  });
  
  // 画像プレビュー状態
  const [imagePreview, setImagePreview] = useState<ImagePreviewState>({
    isOpen: false,
    images: [],
    title: '生成された画像'
  });
  
  // 画像ツールの情報を保持
  const [imageTool, setImageTool] = useState<{
    [key: string]: {
      images: Array<{
        url: string;
        b64Json: string;
      }>;
      title: string;
    }
  }>({});
  
  // プレゼンテーションツールの情報を保持
  const [presentationTools, setPresentationTools] = useState<{
    [key: string]: {
      htmlContent: string;
      title: string;
    }
  }>({});
  
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
          message.tool_calls?.forEach(tc => {
            const existingState = prevStates[tc.toolCallId];
                          // 特定のツールタイプの場合は、デフォルトで展開表示
              const shouldExpandByDefault = 
                tc.toolName === 'gemini-image-generation' || 
                tc.toolName === 'geminiImageGenerationTool' || 
                tc.toolName === 'imagen4-generation';
                
              newStates[tc.toolCallId] = {
                id: tc.toolCallId,
                toolName: tc.toolName,
                args: tc.args,
                result: existingState?.result, // Keep existing result if any
                status: existingState?.result 
                  ? (existingState.status === 'error' ? 'error' : 'success') 
                  : 'running', // If result exists, it's success/error, else running
                isExpanded: existingState?.isExpanded !== undefined ? existingState.isExpanded : shouldExpandByDefault,
              };
            
            // presentationPreviewToolのデータを保存（ただし自動表示はしない）
            if (tc.toolName === 'presentationPreviewTool' && tc.args.htmlContent) {
              setPresentationTools(prev => ({
                ...prev,
                [tc.toolCallId]: {
                  htmlContent: tc.args.htmlContent as string,
                  title: (tc.args.title as string) || 'プレゼンテーションプレビュー'
                }
              }));
            }
          });
          return newStates;
        });
      }
      
      // ツール結果の処理
      if (message.tool_results && message.tool_results.length > 0) {
        setToolCallStates(prevStates => {
          const updatedStates = { ...prevStates };
          message.tool_results?.forEach(tr => {
            if (updatedStates[tr.toolCallId]) {
              // 特定のツールタイプの場合は、デフォルトで展開表示
              const shouldExpandByDefault = 
                updatedStates[tr.toolCallId].toolName === 'gemini-image-generation' || 
                updatedStates[tr.toolCallId].toolName === 'geminiImageGenerationTool' || 
                updatedStates[tr.toolCallId].toolName === 'imagen4-generation';
              
              updatedStates[tr.toolCallId] = {
                ...updatedStates[tr.toolCallId],
                result: tr.result,
                status: tr.isError ? 'error' : 'success',
                isExpanded: shouldExpandByDefault || updatedStates[tr.toolCallId].isExpanded,
              };
              // presentationPreviewToolの結果データを保存（ただし自動表示はしない）
              const toolState = updatedStates[tr.toolCallId];
              if ((toolState.toolName === 'presentationPreviewTool' || toolState.toolName === 'htmlSlideTool') && tr.result?.htmlContent) {
                setPresentationTools(prev => ({
                  ...prev,
                  [tr.toolCallId]: {
                    htmlContent: tr.result.htmlContent,
                    title: tr.result.title || 'プレゼンテーションプレビュー'
                  }
                }));
                // autoOpen: true なら自動でプレビューパネルを開く
                if (tr.result.autoOpen) {
                  setPresentationPreview({
                    isOpen: true,
                    htmlContent: tr.result.htmlContent,
                    title: tr.result.title || 'プレゼンテーションプレビュー'
                  });
                }
              }
              
              // 画像生成ツールの結果データを保存
              if ((toolState.toolName === 'gemini-image-generation' || toolState.toolName === 'geminiImageGenerationTool' || toolState.toolName === 'imagen4-generation') && tr.result?.images && tr.result.images.length > 0) {
                setImageTool(prev => ({
                  ...prev,
                  [tr.toolCallId]: {
                    images: tr.result.images,
                    title: tr.result.title || `生成された画像（${tr.result.images.length}枚）`
                  }
                }));
                
                // autoOpenPreviewが設定されていれば自動的に画像プレビューを開く
                if (tr.result.autoOpenPreview) {
                  setImagePreview({
                    isOpen: true,
                    images: tr.result.images,
                    title: tr.result.title || `生成された画像（${tr.result.images.length}枚）`
                  });
                }
              }
            }
          });
          return updatedStates;
        });
      }
      
      // tool_invocationを持つメッセージのパーツから情報を抽出
      if (message.parts && message.parts.length > 0) {
        setToolCallStates(prev => {
          const updatedStates = { ...prev };
          message.parts?.forEach(part => {
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
                
                // presentationPreviewToolのデータを保存（ただし自動表示はしない）
                if (toolName === 'presentationPreviewTool') {
                  if (args && (args as any).htmlContent) {
                    setPresentationTools(prev => ({
                      ...prev,
                      [toolCallId]: {
                        htmlContent: (args as any).htmlContent,
                        title: (args as any).title || 'プレゼンテーションプレビュー'
                      }
                    }));
                  }
                  
                  // 結果が既に存在する場合
                  if (state === 'result' && result && result.htmlContent) {
                    setPresentationTools(prev => ({
                      ...prev,
                      [toolCallId]: {
                        htmlContent: result.htmlContent,
                        title: result.title || 'プレゼンテーションプレビュー'
                      }
                    }));
                  }
                }
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
          message.toolInvocations?.forEach(inv => {
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
            
            // presentationPreviewToolのデータを保存（ただし自動表示はしない）
            if (toolName === 'presentationPreviewTool') {
              // 引数からHTMLコンテンツを取得
              if (args && args.htmlContent) {
                setPresentationTools(prev => ({
                  ...prev,
                  [toolCallId]: {
                    htmlContent: args.htmlContent,
                    title: args.title || 'プレゼンテーションプレビュー'
                  }
                }));
              }
              
              // 結果からHTMLコンテンツを取得
              if (result && result.htmlContent) {
                setPresentationTools(prev => ({
                  ...prev,
                  [toolCallId]: {
                    htmlContent: result.htmlContent,
                    title: result.title || 'プレゼンテーションプレビュー'
                  }
                }));
              }
            }
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
  
  // プレゼンテーションプレビューパネルを開く
  const openPreviewPanel = (htmlContent: string, title: string) => {
    setPresentationPreview({
      isOpen: true,
      htmlContent,
      title
    });
    onPreviewOpen?.(); // 親コンポーネントに通知
  };
  
  // プレゼンテーションプレビューパネルを閉じる
  const closePreviewPanel = () => {
    setPresentationPreview(prev => ({
      ...prev,
      isOpen: false
    }));
    onPreviewClose?.(); // 親コンポーネントに通知
  };

  // 画像プレビューパネルを開く
  const openImagePreviewPanel = (images: Array<{url: string; b64Json: string}>, title: string) => {
    setImagePreview({
      isOpen: true,
      images,
      title
    });
    
    // 親コンポーネントに通知（必要な場合）
    onPreviewOpen?.();
  };
  
  // 画像プレビューパネルを閉じる
  const closeImagePreviewPanel = () => {
    setImagePreview(prev => ({
      ...prev,
      isOpen: false
    }));
    
    // 親コンポーネントに通知（必要な場合）
    onPreviewClose?.();
  };

  // プレゼンテーションプレビューパネルの幅が変更されたときの処理
  const handlePreviewPanelWidthChange = (width: number) => {
    onPreviewWidthChange?.(width); // 親コンポーネントに通知
  };

  // HTML文字列から純粋なテキストのみを抽出する関数
  const stripHtmlTags = (html: string) => {
    // ... existing code ...
  };

  // ツール実行結果のレンダリング
  const renderToolResult = (toolState: ToolCallState) => {
    const { toolName, args, result } = toolState;
    
    // ツール名に基づいて結果を表示
    switch (toolName) {
      case 'presentationPreviewTool':
      case 'htmlSlideTool':
        // ... existing code ...
        
      case 'gemini-image-generation':
      case 'geminiImageGenerationTool':
      case 'imagen4-generation':
        if (result?.images && result.images.length > 0) {
          // 画像生成結果をグリッド表示
          return (
            <div className="mt-2">
              <div className="text-sm text-gray-700 mb-2">
                {result.images.length}枚の画像が生成されました
              </div>
              <div className="grid grid-cols-2 gap-3">
                {result.images.slice(0, 4).map((img: any, index: number) => (
                  <div 
                    key={index} 
                    className="relative aspect-square overflow-hidden rounded-lg border border-gray-200 bg-gray-100 cursor-pointer hover:opacity-90 transition-opacity"
                    onClick={() => openImagePreviewPanel(result.images, result.title || `生成された画像（${result.images.length}枚）`)}
                  >
                    <img 
                      src={img.url} 
                      alt={`生成画像 ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </div>
                ))}
                {result.images.length > 4 && (
                  <div 
                    className="relative aspect-square overflow-hidden rounded-lg border border-gray-200 bg-gray-800 flex items-center justify-center text-white text-lg font-medium cursor-pointer hover:bg-gray-700 transition-colors"
                    onClick={() => openImagePreviewPanel(result.images, result.title || `生成された画像（${result.images.length}枚）`)}
                  >
                    +{result.images.length - 4}
                  </div>
                )}
              </div>
              <div className="mt-4">
                <button
                  onClick={() => openImagePreviewPanel(result.images, result.title || `生成された画像（${result.images.length}枚）`)}
                  className="flex items-center px-4 py-2 bg-gray-700 text-white rounded-md text-sm hover:bg-gray-600 transition-colors"
                >
                  <PhotoIcon className="h-4 w-4 mr-2" />
                  画像をプレビュー表示
                </button>
              </div>
            </div>
          );
        } else if (result?.error) {
          return <div className="mt-2 text-red-500 text-sm">{result.error}</div>;
        }
        return null;
        
      case 'braveSearchTool':
        // ... existing code ...
      
      default:
        // ... existing code ...
    }
  };

  // ユーザーメッセージ
  if (message.role === 'user') {
    return (
      <div className="flex justify-end mb-4">
        <div className="max-w-xl lg:max-w-2xl p-3 rounded-lg bg-gray-800 text-white shadow">
          {typeof message.content === 'string'
            ? message.content.split('\n').map((line, i) => <p key={i} className="mb-1">{line}</p>)
            : Array.isArray(message.content)
              ? message.content.flatMap((part, index) => {
                  if (part.type === 'text' && part.text) {
                    return part.text.split('\n').map((line, i) => (
                      <p key={`${index}-${i}`} className="mb-1">{line}</p>
                    ));
                  }
                  return [];
                })
              : null}
        </div>
      </div>
    );
  }

  // アシスタントメッセージ
  if (message.role === 'assistant') {
    // ツールの呼び出しUIを構築
    const toolCallUiElements = Object.values(toolCallStates).map(toolState => {
      // プレゼンテーションプレビューツールかどうかを確認
      const isPresentationTool = toolState.toolName === 'presentationPreviewTool' || 
                               toolState.toolName === 'htmlSlideTool';
      
      // このツールのHTMLコンテンツを取得
      const previewData = presentationTools[toolState.id];
      
      // このツールの画像データを取得
      const imageData = imageTool[toolState.id];
      
      return (
        <CollapsibleToolSection 
          key={toolState.id} 
          toolName={toolState.toolName} 
          toolState={toolState.status} 
          isLoading={isLoading}
          isPreviewTool={isPresentationTool}
          isImageTool={toolState.toolName === 'gemini-image-generation' || toolState.toolName === 'geminiImageGenerationTool' || toolState.toolName === 'imagen4-generation'}
          onPreviewClick={() => {
            if (previewData) {
              openPreviewPanel(previewData.htmlContent, previewData.title);
            } else if (toolState.result?.htmlContent) {
              openPreviewPanel(
                toolState.result.htmlContent, 
                toolState.result.title || 'プレゼンテーションプレビュー'
              );
            }
          }}
          onImageClick={() => {
            if (imageData) {
              openImagePreviewPanel(imageData.images, imageData.title);
            } else if (toolState.result?.images && toolState.result.images.length > 0) {
              openImagePreviewPanel(
                toolState.result.images,
                `生成された画像（${toolState.result.images.length}枚）`
              );
            }
          }}
          previewHtml={previewData?.htmlContent || toolState.result?.htmlContent}
          imageUrls={imageData?.images?.map(img => img.url) || 
                    (toolState.result?.images ? toolState.result.images.map((img: {url: string}) => img.url) : [])}
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
                
                {/* 画像生成ツールの結果表示 */}
                {(toolState.toolName === 'gemini-image-generation' || toolState.toolName === 'geminiImageGenerationTool' || toolState.toolName === 'imagen4-generation') && toolState.result?.images && toolState.result.images.length > 0 && (
                  <div className="mt-3">
                    <h4 className="text-xs font-medium text-gray-500 mb-2">生成された画像</h4>
                    <div className="grid grid-cols-2 gap-3">
                      {toolState.result.images.slice(0, 4).map((image: { url: string, b64Json: string }, index: number) => (
                        <div 
                          key={`img-${index}`} 
                          className="relative aspect-square overflow-hidden rounded-lg border border-gray-200 bg-gray-100 cursor-pointer hover:opacity-90 transition-opacity"
                          onClick={() => openImagePreviewPanel(
                            toolState.result.images,
                            `生成された画像（${toolState.result.images.length}枚）`
                          )}
                        >
                          <img 
                            src={image.url} 
                            alt={`生成画像 ${index + 1}`}
                            className="w-full h-full object-cover"
                            loading="lazy"
                          />
                        </div>
                      ))}
                      {toolState.result.images.length > 4 && (
                        <div 
                          className="relative aspect-square overflow-hidden rounded-lg border border-gray-200 bg-gray-800 flex items-center justify-center text-white text-lg font-medium cursor-pointer hover:bg-gray-700 transition-colors"
                          onClick={() => openImagePreviewPanel(
                            toolState.result.images,
                            `生成された画像（${toolState.result.images.length}枚）`
                          )}
                        >
                          +{toolState.result.images.length - 4}
                        </div>
                      )}
                    </div>
                    
                    {/* 画像プレビューボタン */}
                    <div className="mt-4">
                      <button
                        onClick={() => openImagePreviewPanel(
                          toolState.result.images,
                          `生成された画像（${toolState.result.images.length}枚）`
                        )}
                        className="flex items-center px-4 py-2 bg-gray-700 text-white rounded-md text-sm hover:bg-gray-600 transition-colors"
                      >
                        <PhotoIcon className="h-4 w-4 mr-2" />
                        画像をプレビュー表示
                      </button>
                    </div>
                  </div>
                )}
                
                {/* プレゼンテーションプレビューボタン（結果の下にも表示） */}
                {isPresentationTool && toolState.result?.htmlContent && (
                  <div className="mt-3">
                    <button
                      onClick={() => openPreviewPanel(
                        toolState.result.htmlContent, 
                        toolState.result.title || 'プレゼンテーションプレビュー'
                      )}
                      className="flex items-center px-4 py-2 bg-gray-700 text-white rounded-md text-sm hover:bg-gray-600 transition-colors"
                    >
                      <DocumentTextIcon className="h-4 w-4 mr-2" />
                      スライドをプレビュー表示
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </CollapsibleToolSection>
      );
    });
    
    const hasTextContent = typeof message.content === 'string' && message.content.trim().length > 0;
    const hasUiParts = message.content && typeof message.content !== 'string' && message.content.length > 0;

    return (
      <>
        <div className="flex justify-start mb-4 flex-col items-start">
          {/* アシスタントテキストコンテンツ */}
          {(hasTextContent || hasUiParts) && (
            <div className="max-w-xl lg:max-w-2xl p-3 rounded-lg bg-gray-100 text-gray-800 border border-gray-200 shadow-sm mb-2">
              {typeof message.content === 'string'
                ? message.content.split('\n').map((line, i) => <p key={i} className="mb-1">{line}</p>)
                : Array.isArray(message.content) && message.content.map((part, index) => {
                    if (part.type === 'text' && part.text) {
                      return part.text.split('\n').map((line, i) => (
                        <p key={`${index}-${i}`} className="mb-1">{line}</p>
                      ));
                    }
                    return null; 
                  })}
            </div>
          )}
          
          {/* 画像生成ツールの結果を直接表示 */}
          {Object.values(toolCallStates).some(
            tool => (tool.toolName === 'gemini-image-generation' || tool.toolName === 'geminiImageGenerationTool' || tool.toolName === 'imagen4-generation') && 
                   tool.status === 'success' && 
                   tool.result?.images?.length > 0
          ) && (
            <div className="max-w-xl lg:max-w-2xl p-3 rounded-lg bg-gray-100 text-gray-800 border border-gray-200 shadow-sm mb-2">
              <h3 className="font-medium text-base mb-2">生成された画像</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {Object.values(toolCallStates)
                  .filter(tool => 
                    (tool.toolName === 'gemini-image-generation' || tool.toolName === 'geminiImageGenerationTool' || tool.toolName === 'imagen4-generation') && 
                    tool.status === 'success' && 
                    tool.result?.images?.length > 0
                  )
                  .flatMap(tool => 
                    tool.result.images.map((image: { url: string; b64Json: string }, index: number) => (
                      <div 
                        key={`direct-img-${tool.id}-${index}`} 
                        className="aspect-square border border-gray-200 rounded-md overflow-hidden bg-white shadow-sm hover:shadow-md transition-all cursor-pointer"
                        onClick={() => openImagePreviewPanel(
                          tool.result.images, 
                          tool.result.title || `生成された画像（${tool.result.images.length}枚）`
                        )}
                      >
                        <img 
                          src={image.url} 
                          alt={`Generated image ${index + 1}`}
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                      </div>
                    ))
                  )
                }
              </div>
              
              {/* 画像プレビューボタン */}
              <div className="mt-4">
                <button
                  onClick={() => {
                    const tool = Object.values(toolCallStates).find(t => 
                      (t.toolName === 'gemini-image-generation' || t.toolName === 'geminiImageGenerationTool' || t.toolName === 'imagen4-generation') && 
                      t.status === 'success' && 
                      t.result?.images?.length > 0
                    );
                    
                    if (tool) {
                      openImagePreviewPanel(
                        tool.result.images,
                        tool.result.title || `生成された画像（${tool.result.images.length}枚）`
                      );
                    }
                  }}
                  className="flex items-center px-4 py-2 bg-gray-700 text-white rounded-md text-sm hover:bg-gray-600 transition-colors"
                >
                  <PhotoIcon className="h-4 w-4 mr-2" />
                  画像をプレビュー表示
                </button>
              </div>
            </div>
          )}
          
          {/* ツールUIの表示 */}
          {toolCallUiElements.length > 0 && (
            <div className="w-full max-w-xl lg:max-w-2xl">
              {toolCallUiElements}
            </div>
          )}
        </div>
        
        {/* プレゼンテーションプレビューパネル */}
        {presentationPreview.htmlContent && (
          <PresentationPreviewPanel
            htmlContent={presentationPreview.htmlContent}
            title={presentationPreview.title}
            isOpen={presentationPreview.isOpen}
            onClose={closePreviewPanel}
            onWidthChange={handlePreviewPanelWidthChange}
          />
        )}
        
        {/* 画像プレビューパネル */}
        {imagePreview.images.length > 0 && (
          <ImagePreviewPanel
            images={imagePreview.images}
            title={imagePreview.title}
            isOpen={imagePreview.isOpen}
            onClose={closeImagePreviewPanel}
            onWidthChange={handlePreviewPanelWidthChange}
          />
        )}
      </>
    );
  }

  // role: 'tool' メッセージ（レガシーまたはアシスタントにマージされていないツール結果）
  if (message.role === 'tool') {
    return (
      <div className="flex justify-center my-3">
        <div className="p-3 rounded-md bg-yellow-100 border border-yellow-300 text-yellow-700 text-xs shadow-sm max-w-xl lg:max-w-2xl">
          <p className="font-semibold">ツール結果 ({ message.tool_name || 'Unknown Tool'}):</p>
          <pre className="whitespace-pre-wrap break-all mt-1">{typeof message.content === 'string' ? message.content : JSON.stringify(message.content, null, 2)}</pre>
        </div>
      </div>
    );
  }

  return null; // その他のroleやempty messagesのフォールバック
}; 