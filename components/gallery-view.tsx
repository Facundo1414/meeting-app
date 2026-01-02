"use client";

import { useEffect, useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { getMediaMessages, Message } from '@/lib/storage-supabase';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';

export function GalleryView() {
  const router = useRouter();
  const [items, setItems] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Message | null>(null);
  const [filterType, setFilterType] = useState<'all' | 'image' | 'video' | 'audio'>('all');
  const [visibleItems, setVisibleItems] = useState<Set<string>>(new Set());
  const [page, setPage] = useState(1);
  const [loadingMore, setLoadingMore] = useState(false);
  const itemsPerPage = 12;
  const observerRef = useRef<IntersectionObserver | null>(null);

  // Callback para observar elementos
  const observeElement = useCallback((element: Element | null) => {
    if (!element || !observerRef.current) return;
    observerRef.current.observe(element);
  }, []);

  useEffect(() => {
    // Configurar Intersection Observer para lazy loading más eficiente
    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const id = entry.target.getAttribute('data-id');
            if (id) {
              setVisibleItems(prev => new Set(prev).add(id));
            }
          }
        });
      },
      { rootMargin: '50px' } // Cargar cuando esté a 50px de ser visible
    );

    return () => {
      observerRef.current?.disconnect();
    };
  }, []);

  useEffect(() => {
    let mounted = true;
    
    const loadMedia = async () => {
      try {
        const media = await getMediaMessages();
        if (mounted) {
          setItems(media);
          setLoading(false);
        }
      } catch (err) {
        console.error('Error loading gallery items', err);
        if (mounted) setLoading(false);
      }
    };

    loadMedia();

    // Subscribe to real-time updates
    const channel = supabase
      .channel('gallery_updates')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages_meeting_app' },
        async (payload) => {
          const newMsg = payload.new as any;
          if (newMsg.media_url) {
            const formattedMsg: Message = {
              id: newMsg.id,
              senderId: newMsg.sender_id,
              senderUsername: newMsg.sender_username,
              message: newMsg.message,
              timestamp: newMsg.created_at,
              readBy: newMsg.read_by || [],
              mediaUrl: newMsg.media_url,
              mediaType: newMsg.media_type,
              reactions: newMsg.reactions || [],
              replyToId: newMsg.reply_to_id,
              editedAt: newMsg.edited_at,
            };
            if (mounted) {
              setItems(prev => [formattedMsg, ...prev]);
            }
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'messages_meeting_app' },
        (payload) => {
          const deletedId = (payload.old as any).id;
          if (mounted) {
            setItems(prev => prev.filter(m => m.id !== deletedId));
          }
        }
      )
      .subscribe();

    return () => {
      mounted = false;
      supabase.removeChannel(channel);
    };
  }, []);

  const handleImageLoad = (id: string) => {
    // Imagen cargada exitosamente
  };

  const filteredItems = items.filter(item => 
    filterType === 'all' || item.mediaType === filterType
  );

  // Paginar items
  const paginatedItems = filteredItems.slice(0, page * itemsPerPage);
  const hasMore = paginatedItems.length < filteredItems.length;

  const loadMore = () => {
    setLoadingMore(true);
    setTimeout(() => {
      setPage(prev => prev + 1);
      setLoadingMore(false);
    }, 300);
  };

  const stats = {
    images: items.filter(m => m.mediaType === 'image').length,
    videos: items.filter(m => m.mediaType === 'video').length,
    audios: items.filter(m => m.mediaType === 'audio').length,
  };

  // Reset page cuando cambia el filtro
  useEffect(() => {
    setPage(1);
  }, [filterType]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b dark:border-gray-700 p-3 sticky top-0 z-20 shadow-sm">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => router.back()}
                className="dark:border-gray-600 dark:text-gray-200 px-2 h-8"
              >
                ←
              </Button>
              <div>
                <h1 className="text-lg font-bold text-gray-800 dark:text-gray-100">Galería en Común</h1>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {filteredItems.length} {filterType === 'all' ? 'archivos' : filterType === 'image' ? 'fotos' : filterType === 'video' ? 'videos' : 'audios'}
                </p>
              </div>
            </div>
          </div>

          {/* Filtros */}
          <div className="flex gap-2 overflow-x-auto pb-1">
            <button
              onClick={() => setFilterType('all')}
              className={`px-3 py-1.5 rounded-full text-sm whitespace-nowrap transition-colors ${
                filterType === 'all' 
                  ? 'bg-blue-500 text-white' 
                  : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
              }`}
            >
              Todos ({items.length})
            </button>
            <button
              onClick={() => setFilterType('image')}
              className={`px-3 py-1.5 rounded-full text-sm whitespace-nowrap transition-colors ${
                filterType === 'image' 
                  ? 'bg-blue-500 text-white' 
                  : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
              }`}
            >
              📷 Fotos ({stats.images})
            </button>
            <button
              onClick={() => setFilterType('video')}
              className={`px-3 py-1.5 rounded-full text-sm whitespace-nowrap transition-colors ${
                filterType === 'video' 
                  ? 'bg-blue-500 text-white' 
                  : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
              }`}
            >
              🎥 Videos ({stats.videos})
            </button>
            {stats.audios > 0 && (
              <button
                onClick={() => setFilterType('audio')}
                className={`px-3 py-1.5 rounded-full text-sm whitespace-nowrap transition-colors ${
                  filterType === 'audio' 
                    ? 'bg-blue-500 text-white' 
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                }`}
              >
                🎤 Audios ({stats.audios})
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Contenido */}
      <div className="max-w-3xl mx-auto p-3">
        {loading ? (
          <div className="grid grid-cols-3 gap-2">
            {[...Array(9)].map((_, i) => (
              <div key={i} className="w-full h-28 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse" />
            ))}
          </div>
        ) : paginatedItems.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-5xl mb-3">📷</div>
            <p className="text-gray-500 dark:text-gray-400">
              {filterType === 'all' 
                ? 'No hay archivos multimedia aún.' 
                : `No hay ${filterType === 'image' ? 'fotos' : filterType === 'video' ? 'videos' : 'audios'} aún.`}
            </p>
            <Button 
              onClick={() => router.push('/messages')} 
              className="mt-4"
              size="sm"
            >
              Ir a Mensajes
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-2">
            {paginatedItems.map((it) => {
              const isVisible = visibleItems.has(it.id);
              
              return (
                <div 
                  key={it.id} 
                  className="relative group"
                  data-id={it.id}
                  ref={observeElement}
                >
                  {it.mediaType === 'image' ? (
                    <div className="relative w-full h-28 bg-gray-200 dark:bg-gray-700 rounded-lg overflow-hidden">
                      {isVisible ? (
                        <img
                          src={it.mediaUrl}
                          alt={`Foto ${it.id}`}
                          className="w-full h-full object-cover cursor-pointer transition-opacity duration-200 hover:opacity-80"
                          loading="lazy"
                          onClick={() => setSelected(it)}
                          onLoad={() => handleImageLoad(it.id)}
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <div className="w-6 h-6 border-2 border-gray-300 dark:border-gray-600 border-t-blue-500 rounded-full animate-spin" />
                        </div>
                      )}
                    </div>
                  ) : it.mediaType === 'video' ? (
                    <div 
                      className="relative w-full h-28 bg-black rounded-lg overflow-hidden cursor-pointer hover:opacity-80 transition-opacity"
                      onClick={() => setSelected(it)}
                    >
                      {isVisible ? (
                        <>
                          <video
                            src={it.mediaUrl}
                            className="w-full h-full object-cover"
                            muted
                            playsInline
                            preload="metadata"
                          />
                          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                            <div className="w-10 h-10 bg-black/50 rounded-full flex items-center justify-center">
                              <span className="text-white text-xl">▶</span>
                            </div>
                          </div>
                        </>
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <div className="w-6 h-6 border-2 border-gray-600 border-t-blue-500 rounded-full animate-spin" />
                        </div>
                      )}
                    </div>
                  ) : it.mediaType === 'audio' ? (
                    <div 
                      className="w-full h-28 flex flex-col items-center justify-center bg-gradient-to-br from-purple-100 to-pink-100 dark:from-purple-900 dark:to-pink-900 rounded-lg cursor-pointer hover:opacity-80 transition-opacity"
                      onClick={() => setSelected(it)}
                    >
                      <span className="text-3xl mb-1">🎤</span>
                      <span className="text-xs text-gray-600 dark:text-gray-300">Audio</span>
                    </div>
                  ) : null}

                  {/* Overlay con info */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity rounded-lg pointer-events-none">
                    <div className="absolute bottom-1 left-1 right-1">
                      <p className="text-white text-xs font-medium truncate">{it.senderUsername}</p>
                    </div>
                  </div>
                  
                  {/* Badge de fecha siempre visible */}
                  <div className="absolute left-1 top-1 bg-black/60 text-white text-xs px-2 py-0.5 rounded backdrop-blur-sm">
                    {format(new Date(it.timestamp), 'dd/MM')}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Botón cargar más */}
        {!loading && hasMore && (
          <div className="flex justify-center mt-6 mb-4">
            <Button 
              onClick={loadMore}
              disabled={loadingMore}
              className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-2"
            >
              {loadingMore ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                  Cargando...
                </>
              ) : (
                `Cargar más (${filteredItems.length - paginatedItems.length} restantes)`
              )}
            </Button>
          </div>
        )}
      </div>

      {/* Modal */}
      {selected && (
        <div className="fixed inset-0 z-50 bg-black/95 flex flex-col" onClick={() => setSelected(null)}>
          {/* Header del modal */}
          <div className="flex items-center justify-between p-4 bg-black/50 backdrop-blur-sm">
            <div className="text-white">
              <p className="font-semibold">{selected.senderUsername}</p>
              <p className="text-xs text-gray-300">{format(new Date(selected.timestamp), 'dd/MM/yyyy HH:mm')}</p>
            </div>
            <button
              onClick={() => setSelected(null)}
              className="text-white text-3xl w-10 h-10 flex items-center justify-center hover:bg-white/10 rounded-full transition-colors"
              aria-label="Cerrar"
            >
              ×
            </button>
          </div>

          {/* Contenido */}
          <div className="flex-1 flex items-center justify-center p-4" onClick={(e) => e.stopPropagation()}>
            {selected.mediaType === 'image' ? (
              <img 
                src={selected.mediaUrl} 
                alt="Selected" 
                className="max-w-full max-h-full object-contain" 
              />
            ) : selected.mediaType === 'video' ? (
              <video 
                src={selected.mediaUrl} 
                controls 
                autoPlay
                className="max-w-full max-h-full rounded-lg" 
              />
            ) : selected.mediaType === 'audio' ? (
              <div className="bg-white dark:bg-gray-800 p-6 rounded-lg max-w-md w-full">
                <div className="text-center mb-4">
                  <span className="text-5xl">🎤</span>
                  <p className="text-sm text-gray-600 dark:text-gray-300 mt-2">Mensaje de audio</p>
                </div>
                <audio src={selected.mediaUrl} controls className="w-full" autoPlay />
              </div>
            ) : null}
          </div>

          {/* Footer con mensaje si existe */}
          {selected.message && (
            <div className="p-4 bg-black/50 backdrop-blur-sm">
              <p className="text-white text-center">{selected.message}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default GalleryView;
