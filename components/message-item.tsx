'use client';

import { memo } from 'react';
import { motion } from 'framer-motion';
import { Message } from '@/lib/storage-supabase';
import { AudioPlayer as SmartAudioPlayer } from '@/components/audio-player';

interface MessageItemProps {
  msg: Message;
  isOwn: boolean;
  repliedMessage?: Message;
  onLongPressStart: (id: string) => void;
  onLongPressEnd: () => void;
  onTouchStart: (e: React.TouchEvent, msg: Message) => void;
  onTouchEnd: (e: React.TouchEvent, msg: Message) => void;
  onDoubleTap: (msg: Message) => void;
  onReaction: (msgId: string, emoji: string) => void;
  formatTime: (timestamp: string) => string;
  showMenu: string | null;
  showReactions: string | null;
  onShowReactions: (id: string) => void;
  onReply: (msg: Message) => void;
  onCopy: (text: string) => void;
  onEdit?: (msg: Message) => void;
  onDelete?: (id: string, mediaUrl?: string) => void;
  onCloseMenu: () => void;
  onCloseReactions: () => void;
}

const REACTIONS = ['❤️', '😂', '👍', '😮', '😢', '🙏'];

// Componente memoizado - solo se re-renderiza si sus props cambian
export const MessageItem = memo(function MessageItem({
  msg,
  isOwn,
  repliedMessage,
  onLongPressStart,
  onLongPressEnd,
  onTouchStart,
  onTouchEnd,
  onDoubleTap,
  onReaction,
  formatTime,
  showMenu,
  showReactions,
  onShowReactions,
  onReply,
  onCopy,
  onEdit,
  onDelete,
  onCloseMenu,
  onCloseReactions,
}: MessageItemProps) {
  const isTemp = msg.id.startsWith('temp-');

  return (
    <div
      className={`flex relative ${isOwn ? 'justify-end' : 'justify-start'}`}
    >
      <div
        className={`max-w-[75%] rounded-lg p-3 relative ${
          isOwn
            ? 'bg-blue-500 text-white'
            : 'bg-white dark:bg-gray-700 border dark:border-gray-600 dark:text-gray-100'
        }`}
        onTouchStart={(e) => {
          if (!isTemp) {
            onLongPressStart(msg.id);
            onTouchStart(e, msg);
          }
        }}
        onTouchEnd={(e) => {
          onLongPressEnd();
          onTouchEnd(e, msg);
        }}
        onMouseDown={() => !isTemp && onLongPressStart(msg.id)}
        onMouseUp={onLongPressEnd}
        onMouseLeave={onLongPressEnd}
        onClick={() => !isTemp && onDoubleTap(msg)}
      >
        {/* Reply reference */}
        {repliedMessage && (
          <div className="bg-black/10 dark:bg-white/10 border-l-2 border-white/50 pl-2 py-1 mb-2 rounded text-xs opacity-80">
            <div className="font-semibold">{repliedMessage.senderUsername}</div>
            <div className="truncate">
              {repliedMessage.message || (repliedMessage.mediaType ? `📎 ${repliedMessage.mediaType}` : 'Mensaje')}
            </div>
          </div>
        )}

        {/* Media content */}
        {msg.mediaUrl && (
          <div className="mb-2">
            {msg.mediaType === 'image' ? (
              <img 
                src={msg.mediaUrl} 
                alt="Imagen" 
                className="max-w-full rounded-lg max-h-80 object-cover"
                loading="lazy"
              />
            ) : msg.mediaType === 'video' ? (
              <video 
                src={msg.mediaUrl} 
                controls 
                className="max-w-full rounded-lg max-h-80"
              />
            ) : msg.mediaType === 'audio' ? (
              <SmartAudioPlayer 
                src={msg.mediaUrl} 
                isOwn={isOwn}
              />
            ) : null}
          </div>
        )}

        {/* Message text */}
        {msg.message && <div className="wrap-break-word">{msg.message}</div>}

        {/* Timestamp and read status */}
        <div className="text-xs opacity-70 mt-1 flex items-center gap-1">
          {formatTime(msg.timestamp)}
          {msg.editedAt && <span className="text-xs opacity-60">(editado)</span>}
          {isOwn && (
            <span>
              {(msg.readBy || []).length > 1 ? (
                <span className="text-green-300" title={`Leído por ${msg.readBy?.length} personas`}>✓✓</span>
              ) : (
                <span className="opacity-50" title="Enviado">✓✓</span>
              )}
            </span>
          )}
        </div>

        {/* Reactions */}
        {msg.reactions && msg.reactions.length > 0 && (
          <div className={`absolute -bottom-2 ${isOwn ? 'left-2' : 'right-2'} flex gap-0.5`}>
            {msg.reactions.map((reaction, idx) => (
              <button
                key={idx}
                onClick={(e) => {
                  e.stopPropagation();
                  onReaction(msg.id, reaction.emoji);
                }}
                className="text-xs leading-none bg-white dark:bg-gray-800 px-1.5 py-0.5 rounded-full shadow-md border border-gray-300 dark:border-gray-600 hover:scale-110 transition-transform"
              >
                {reaction.emoji}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Context menu */}
      {showMenu === msg.id && (
        <div className="absolute bottom-full right-0 mb-2 bg-white dark:bg-gray-800 rounded-lg shadow-xl border dark:border-gray-700 py-1 min-w-35 z-50">
          <button
            onClick={() => onShowReactions(msg.id)}
            className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
          >
            😊 Reaccionar
          </button>
          <button
            onClick={() => onReply(msg)}
            className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
          >
            ↩️ Responder
          </button>
          <button
            onClick={() => onCopy(msg.message)}
            className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
          >
            📋 Copiar
          </button>
          {isOwn && onEdit && (
            <button
              onClick={() => onEdit(msg)}
              className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
            >
              ✏️ Editar
            </button>
          )}
          {isOwn && onDelete && (
            <button
              onClick={() => onDelete(msg.id, msg.mediaUrl)}
              className="w-full px-4 py-2 text-left text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2"
            >
              🗑️ Eliminar
            </button>
          )}
          <button
            onClick={onCloseMenu}
            className="w-full px-4 py-2 text-left text-sm text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            ✕ Cerrar
          </button>
        </div>
      )}

      {/* Reactions picker */}
      {showReactions === msg.id && (
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="absolute bottom-full right-0 mb-2 bg-white dark:bg-gray-800 rounded-full shadow-xl border dark:border-gray-700 px-2 py-1 flex gap-1 z-50"
        >
          {REACTIONS.map((emoji) => (
            <button
              key={emoji}
              onClick={() => {
                onReaction(msg.id, emoji);
                onCloseReactions();
              }}
              className="text-xl hover:scale-125 transition-transform p-1"
            >
              {emoji}
            </button>
          ))}
        </motion.div>
      )}
    </div>
  );
}, (prevProps, nextProps) => {
  // Custom comparison - solo re-renderizar si algo relevante cambió
  return (
    prevProps.msg.id === nextProps.msg.id &&
    prevProps.msg.message === nextProps.msg.message &&
    prevProps.msg.editedAt === nextProps.msg.editedAt &&
    prevProps.msg.readBy?.length === nextProps.msg.readBy?.length &&
    prevProps.msg.reactions?.length === nextProps.msg.reactions?.length &&
    prevProps.isOwn === nextProps.isOwn &&
    prevProps.showMenu === nextProps.showMenu &&
    prevProps.showReactions === nextProps.showReactions &&
    prevProps.repliedMessage?.id === nextProps.repliedMessage?.id
  );
});
