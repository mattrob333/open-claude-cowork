import { useState, useCallback, useEffect, useRef } from 'react';
import { Chat, Message, ToolCall, StreamChunk } from '../types';
import { streamChat } from '../services/chatService';
import { DEFAULT_PROVIDER, getDefaultModel } from '../constants';

function generateId(): string {
  return 'chat_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

function generateMessageId(): string {
  return 'msg_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

function generateToolId(): string {
  return 'tool_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

interface UseChatReturn {
  chats: Chat[];
  currentChat: Chat | null;
  currentChatId: string | null;
  isStreaming: boolean;
  provider: string;
  model: string;
  toolCalls: ToolCall[];
  setProvider: (provider: string) => void;
  setModel: (model: string) => void;
  sendMessage: (content: string) => Promise<void>;
  createNewChat: () => void;
  switchChat: (chatId: string) => void;
  deleteChat: (chatId: string) => void;
  updateMessageContent: (messageId: string, content: string) => void;
  appendToMessage: (messageId: string, content: string, isReasoning?: boolean) => void;
}

export function useChat(): UseChatReturn {
  const [chats, setChats] = useState<Chat[]>([]);
  const [currentChatId, setCurrentChatId] = useState<string | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [provider, setProviderState] = useState(DEFAULT_PROVIDER);
  const [model, setModelState] = useState(getDefaultModel(DEFAULT_PROVIDER));
  const [toolCalls, setToolCalls] = useState<ToolCall[]>([]);

  const pendingToolCallsRef = useRef<Map<string, string>>(new Map());

  // Load state from localStorage on mount
  useEffect(() => {
    try {
      const savedChats = localStorage.getItem('allChats');
      const savedChatId = localStorage.getItem('currentChatId');
      const savedProvider = localStorage.getItem('selectedProvider');
      const savedModel = localStorage.getItem('selectedModel');

      if (savedChats) {
        setChats(JSON.parse(savedChats));
      }
      if (savedChatId) {
        setCurrentChatId(savedChatId);
      }
      if (savedProvider) {
        setProviderState(savedProvider);
      }
      if (savedModel) {
        setModelState(savedModel);
      }
    } catch (error) {
      console.warn('localStorage not available:', error);
    }
  }, []);

  // Save chats to localStorage
  const saveChats = useCallback((updatedChats: Chat[]) => {
    try {
      localStorage.setItem('allChats', JSON.stringify(updatedChats));
    } catch (error) {
      console.warn('Failed to save chats to localStorage:', error);
    }
  }, []);

  // Get current chat
  const currentChat = chats.find(c => c.id === currentChatId) || null;

  // Set provider and update model
  const setProvider = useCallback((newProvider: string) => {
    setProviderState(newProvider);
    const newModel = getDefaultModel(newProvider);
    setModelState(newModel);
    try {
      localStorage.setItem('selectedProvider', newProvider);
      localStorage.setItem('selectedModel', newModel);
    } catch (error) {
      console.warn('Failed to save provider/model:', error);
    }
  }, []);

  // Set model
  const setModel = useCallback((newModel: string) => {
    setModelState(newModel);
    try {
      localStorage.setItem('selectedModel', newModel);
    } catch (error) {
      console.warn('Failed to save model:', error);
    }
  }, []);

  // Create new chat
  const createNewChat = useCallback(() => {
    setCurrentChatId(null);
    setToolCalls([]);
    try {
      localStorage.removeItem('currentChatId');
    } catch (error) {
      console.warn('Failed to clear currentChatId:', error);
    }
  }, []);

  // Switch to existing chat
  const switchChat = useCallback((chatId: string) => {
    setCurrentChatId(chatId);
    try {
      localStorage.setItem('currentChatId', chatId);
    } catch (error) {
      console.warn('Failed to save currentChatId:', error);
    }
    const chat = chats.find(c => c.id === chatId);
    if (chat) {
      setProviderState(chat.provider);
      setModelState(chat.model);
    }
    setToolCalls([]);
  }, [chats]);

  // Delete chat
  const deleteChat = useCallback((chatId: string) => {
    setChats(prev => {
      const updated = prev.filter(c => c.id !== chatId);
      saveChats(updated);
      return updated;
    });

    if (currentChatId === chatId) {
      setCurrentChatId(null);
      try {
        localStorage.removeItem('currentChatId');
      } catch (error) {
        console.warn('Failed to clear currentChatId:', error);
      }
    }
  }, [currentChatId, saveChats]);

  // Update message content
  const updateMessageContent = useCallback((messageId: string, content: string) => {
    setChats(prev => {
      const updated = prev.map(chat => {
        if (chat.id !== currentChatId) return chat;
        return {
          ...chat,
          messages: chat.messages.map(msg =>
            msg.id === messageId ? { ...msg, content } : msg
          ),
          updatedAt: Date.now()
        };
      });
      saveChats(updated);
      return updated;
    });
  }, [currentChatId, saveChats]);

  // Append to message
  const appendToMessage = useCallback((messageId: string, content: string, isReasoning = false) => {
    setChats(prev => {
      const updated = prev.map(chat => {
        if (chat.id !== currentChatId) return chat;
        return {
          ...chat,
          messages: chat.messages.map(msg => {
            if (msg.id !== messageId) return msg;
            if (isReasoning) {
              return { ...msg, thinking: (msg.thinking || '') + content };
            }
            return { ...msg, content: msg.content + content };
          }),
          updatedAt: Date.now()
        };
      });
      saveChats(updated);
      return updated;
    });
  }, [currentChatId, saveChats]);

  // Add tool call
  const addToolCall = useCallback((name: string, input: Record<string, unknown>, apiId?: string): ToolCall => {
    const localId = generateToolId();
    const toolCall: ToolCall = {
      id: localId,
      name,
      input,
      status: 'running'
    };

    if (apiId) {
      pendingToolCallsRef.current.set(apiId, localId);
    }

    setToolCalls(prev => [...prev, toolCall]);
    return toolCall;
  }, []);

  // Update tool call status
  const updateToolCallStatus = useCallback((localId: string, status: 'success' | 'error') => {
    setToolCalls(prev => prev.map(tc =>
      tc.id === localId ? { ...tc, status } : tc
    ));
  }, []);

  // Update tool call result
  const updateToolCallResult = useCallback((localId: string, result: unknown) => {
    setToolCalls(prev => prev.map(tc =>
      tc.id === localId ? { ...tc, result, status: 'success' } : tc
    ));
  }, []);

  // Send message
  const sendMessage = useCallback(async (content: string) => {
    if (!content.trim() || isStreaming) return;

    let chatId = currentChatId;
    const isNewChat = !chatId;

    // Create new chat if needed
    if (!chatId) {
      chatId = generateId();
      const newChat: Chat = {
        id: chatId,
        title: content.length > 30 ? content.substring(0, 30) + '...' : content,
        messages: [],
        provider,
        model,
        createdAt: Date.now(),
        updatedAt: Date.now()
      };

      setChats(prev => {
        const updated = [newChat, ...prev];
        saveChats(updated);
        return updated;
      });
      setCurrentChatId(chatId);
      try {
        localStorage.setItem('currentChatId', chatId);
      } catch (error) {
        console.warn('Failed to save currentChatId:', error);
      }
    }

    // Add user message
    const userMessage: Message = {
      id: generateMessageId(),
      role: 'user',
      content,
      timestamp: Date.now()
    };

    // Add assistant message placeholder
    const assistantMessageId = generateMessageId();
    const assistantMessage: Message = {
      id: assistantMessageId,
      role: 'assistant',
      content: '',
      timestamp: Date.now()
    };

    setChats(prev => {
      const updated = prev.map(chat => {
        if (chat.id !== chatId) return chat;
        return {
          ...chat,
          messages: [...chat.messages, userMessage, assistantMessage],
          updatedAt: Date.now()
        };
      });
      saveChats(updated);
      return updated;
    });

    setIsStreaming(true);
    pendingToolCallsRef.current.clear();

    try {
      for await (const chunk of streamChat(content, chatId, provider, model)) {
        await processChunk(chunk, assistantMessageId, chatId);
      }

      // Mark remaining pending tool calls as complete
      for (const localId of pendingToolCallsRef.current.values()) {
        updateToolCallStatus(localId, 'success');
      }
    } catch (error) {
      console.error('Error streaming message:', error);
      appendToMessage(assistantMessageId, `\n\nError: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsStreaming(false);
    }

    async function processChunk(chunk: StreamChunk, messageId: string, _chatId: string) {
      switch (chunk.type) {
        case 'text':
          if (chunk.content) {
            if (chunk.isReasoning) {
              appendToMessage(messageId, chunk.content, true);
            } else {
              appendToMessage(messageId, chunk.content);
            }
          }
          break;

        case 'tool_use':
          if (chunk.name && chunk.input) {
            addToolCall(chunk.name, chunk.input, chunk.id);
          }
          break;

        case 'tool_result':
          if (chunk.tool_use_id) {
            const localId = pendingToolCallsRef.current.get(chunk.tool_use_id);
            if (localId) {
              updateToolCallResult(localId, chunk.result);
              pendingToolCallsRef.current.delete(chunk.tool_use_id);
            }
          }
          break;

        case 'assistant':
          if (chunk.message?.content) {
            for (const block of chunk.message.content) {
              if (block.type === 'text' && block.text) {
                appendToMessage(messageId, block.text);
              } else if (block.type === 'tool_use' && block.name && block.input) {
                addToolCall(block.name, block.input, block.id);
              }
            }
          }
          break;

        case 'done':
          // Stream completed
          break;

        case 'error':
          appendToMessage(messageId, `\n\nError: ${chunk.content || 'Unknown error'}`);
          break;
      }
    }
  }, [currentChatId, isStreaming, provider, model, saveChats, appendToMessage, addToolCall, updateToolCallStatus, updateToolCallResult]);

  return {
    chats,
    currentChat,
    currentChatId,
    isStreaming,
    provider,
    model,
    toolCalls,
    setProvider,
    setModel,
    sendMessage,
    createNewChat,
    switchChat,
    deleteChat,
    updateMessageContent,
    appendToMessage
  };
}
