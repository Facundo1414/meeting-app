'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, X, ChevronUp, ChevronDown, Calendar, Image, Mic, Video } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Message } from '@/lib/storage-supabase';

interface MessageSearchProps {
  messages: Message[];
  isOpen: boolean;
  onClose: () => void;
  onResultClick: (messageId: string) => void;
}

type FilterType = 'all' | 'text' | 'image' | 'video' | 'audio';

export function MessageSearch({ messages, isOpen, onClose, onResultClick }: MessageSearchProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Message[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [filterType, setFilterType] = useState<FilterType>('all');
  const [dateFilter, setDateFilter] = useState<string>('');
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus input when opened
  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  // Search logic
  const searchMessages = useCallback(() => {
    if (!query.trim() && filterType === 'all' && !dateFilter) {
      setResults([]);
      return;
    }

    let filtered = [...messages];

    // Filter by type
    if (filterType !== 'all') {
      filtered = filtered.filter(m => {
        if (filterType === 'text') return !m.mediaType;
        return m.mediaType === filterType;
      });
    }

    // Filter by date
    if (dateFilter) {
      filtered = filtered.filter(m => {
        const msgDate = new Date(m.timestamp).toISOString().split('T')[0];
        return msgDate === dateFilter;
      });
    }

    // Filter by query text
    if (query.trim()) {
      const lowerQuery = query.toLowerCase();
      filtered = filtered.filter(m => 
        m.message?.toLowerCase().includes(lowerQuery) ||
        m.senderUsername?.toLowerCase().includes(lowerQuery)
      );
    }

    // Sort by date descending (newest first)
    filtered.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    setResults(filtered);
    setCurrentIndex(0);
  }, [messages, query, filterType, dateFilter]);

  useEffect(() => {
    const debounce = setTimeout(searchMessages, 200);
    return () => clearTimeout(debounce);
  }, [searchMessages]);

  const navigateResult = (direction: 'prev' | 'next') => {
    if (results.length === 0) return;
    
    if (direction === 'next') {
      const newIndex = (currentIndex + 1) % results.length;
      setCurrentIndex(newIndex);
      onResultClick(results[newIndex].id);
    } else {
      const newIndex = currentIndex === 0 ? results.length - 1 : currentIndex - 1;
      setCurrentIndex(newIndex);
      onResultClick(results[newIndex].id);
    }
  };

  const handleResultClick = (message: Message, index: number) => {
    setCurrentIndex(index);
    onResultClick(message.id);
  };

  const formatDate = (timestamp: string) => {
    const date = new Date(timestamp);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return `Hoy ${date.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}`;
    } else if (date.toDateString() === yesterday.toDateString()) {
      return `Ayer ${date.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}`;
    }
    return date.toLocaleDateString('es-AR', { 
      day: '2-digit', 
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getMediaIcon = (type?: string) => {
    switch (type) {
      case 'image': return <Image className="h-4 w-4 text-blue-400" />;
      case 'video': return <Video className="h-4 w-4 text-purple-400" />;
      case 'audio': return <Mic className="h-4 w-4 text-green-400" />;
      default: return null;
    }
  };

  const highlightText = (text: string, highlight: string) => {
    if (!highlight.trim() || !text) return text;
    
    const parts = text.split(new RegExp(`(${highlight})`, 'gi'));
    return parts.map((part, i) => 
      part.toLowerCase() === highlight.toLowerCase() 
        ? <mark key={i} className="bg-yellow-300 dark:bg-yellow-600 text-black dark:text-white rounded px-0.5">{part}</mark>
        : part
    );
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className="absolute inset-x-0 top-0 z-50 bg-white dark:bg-gray-900 border-b dark:border-gray-700 shadow-lg"
      >
        {/* Search Input */}
        <div className="p-3 space-y-3">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                ref={inputRef}
                type="text"
                placeholder="Buscar en mensajes..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="pl-10 pr-4 bg-gray-100 dark:bg-gray-800 border-none"
              />
            </div>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-5 w-5" />
            </Button>
          </div>

          {/* Filters */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
              {[
                { type: 'all' as FilterType, label: 'Todo' },
                { type: 'text' as FilterType, label: '💬' },
                { type: 'image' as FilterType, label: '📷' },
                { type: 'video' as FilterType, label: '🎬' },
                { type: 'audio' as FilterType, label: '🎤' },
              ].map(({ type, label }) => (
                <button
                  key={type}
                  onClick={() => setFilterType(type)}
                  className={`px-2 py-1 text-xs rounded transition-colors ${
                    filterType === type 
                      ? 'bg-blue-500 text-white' 
                      : 'hover:bg-gray-200 dark:hover:bg-gray-700'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
            
            <div className="flex items-center gap-1">
              <Calendar className="h-4 w-4 text-gray-400" />
              <input
                type="date"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="text-xs bg-gray-100 dark:bg-gray-800 rounded px-2 py-1 border-none"
              />
              {dateFilter && (
                <button 
                  onClick={() => setDateFilter('')}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>
          </div>

          {/* Results count and navigation */}
          {results.length > 0 && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500 dark:text-gray-400">
                {results.length} resultado{results.length !== 1 ? 's' : ''} encontrado{results.length !== 1 ? 's' : ''}
              </span>
              <div className="flex items-center gap-1">
                <span className="text-gray-500 dark:text-gray-400 text-xs">
                  {currentIndex + 1} / {results.length}
                </span>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => navigateResult('prev')}>
                  <ChevronUp className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => navigateResult('next')}>
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Results List */}
        {results.length > 0 && (
          <div className="max-h-64 overflow-y-auto border-t dark:border-gray-700">
            {results.slice(0, 20).map((message, index) => (
              <motion.div
                key={message.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: index * 0.02 }}
                onClick={() => handleResultClick(message, index)}
                className={`p-3 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer border-b dark:border-gray-700 last:border-b-0 ${
                  index === currentIndex ? 'bg-blue-50 dark:bg-blue-900/30' : ''
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white text-xs font-bold">
                    {message.senderUsername?.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm dark:text-white">
                        {message.senderUsername}
                      </span>
                      {message.mediaType && getMediaIcon(message.mediaType)}
                      <span className="text-xs text-gray-400">
                        {formatDate(message.timestamp)}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-300 truncate">
                      {message.mediaType && !message.message 
                        ? `[${message.mediaType === 'image' ? 'Imagen' : message.mediaType === 'video' ? 'Video' : 'Audio'}]`
                        : highlightText(message.message || '', query)
                      }
                    </p>
                  </div>
                </div>
              </motion.div>
            ))}
            {results.length > 20 && (
              <div className="p-2 text-center text-xs text-gray-400">
                Mostrando 20 de {results.length} resultados
              </div>
            )}
          </div>
        )}

        {/* No results */}
        {(query || filterType !== 'all' || dateFilter) && results.length === 0 && (
          <div className="p-6 text-center border-t dark:border-gray-700">
            <Search className="h-8 w-8 text-gray-300 mx-auto mb-2" />
            <p className="text-gray-500 dark:text-gray-400">No se encontraron mensajes</p>
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
}
