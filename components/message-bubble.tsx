'use client';

import { memo } from 'react';
import { CheckCheck, Check, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface MessageBubbleProps {
  message: string;
  timestamp: string;
  isOwnMessage: boolean;
  senderName?: string;
  status?: 'sending' | 'sent' | 'delivered' | 'read';
  isEdited?: boolean;
  replyTo?: {
    message: string;
    sender: string;
  };
  reactions?: Record<string, string[]>;
  onReply?: () => void;
  onReact?: () => void;
  onDoubleTap?: () => void;
  onReactionClick?: (emoji: string) => void;
  children?: React.ReactNode;
}

export const MessageBubble = memo(function MessageBubble({
  message,
  timestamp,
  isOwnMessage,
  senderName,
  status = 'sent',
  isEdited = false,
  replyTo,
  reactions,
  onReply,
  onReact,
  onDoubleTap,
  onReactionClick,
  children,
}: MessageBubbleProps) {
  const bubbleColor = isOwnMessage
    ? 'bg-[#005C4B] text-white'
    : 'bg-[#202C33] text-[#E9EDEF]';

  const renderStatus = () => {
    if (!isOwnMessage) return null;

    switch (status) {
      case 'sending':
        return <Clock className="h-3.5 w-3.5 text-[#8696A0]" />;
      case 'sent':
        return <Check className="h-3.5 w-3.5 text-[#8696A0]" />;
      case 'delivered':
        return <CheckCheck className="h-3.5 w-3.5 text-[#8696A0]" />;
      case 'read':
        return <CheckCheck className="h-3.5 w-3.5 text-[#53BDEB]" />;
      default:
        return null;
    }
  };

  return (
    <div className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'} mb-1 px-2 md:px-4`}>
      <div className={`relative max-w-[85%] md:max-w-[65%] ${isOwnMessage ? 'ml-auto' : 'mr-auto'}`}>
        {/* Reply reference */}
        {replyTo && (
          <div className="mb-1 p-2 bg-black/10 border-l-4 border-[#00A884] rounded">
            <p className="text-xs text-[#8696A0] font-medium">{replyTo.sender}</p>
            <p className="text-xs text-[#8696A0] truncate">{replyTo.message}</p>
          </div>
        )}

        {/* Bubble */}
        <div
          onClick={onDoubleTap}
          className={`
            ${bubbleColor}
            px-3 py-2
            rounded-lg
            ${isOwnMessage ? 'rounded-tr-none' : 'rounded-tl-none'}
            shadow-sm
            break-words
            relative
            group
            ${onDoubleTap ? 'cursor-pointer' : ''}
          `}
        >
          {/* Sender name for group chats */}
          {!isOwnMessage && senderName && (
            <p className="text-xs text-[#00A884] font-medium mb-1">
              {senderName}
            </p>
          )}

          {/* Message content */}
          {children ? (
            <>
              {children}
              {message && (
                <p className="text-sm whitespace-pre-wrap break-words mt-2">
                  {message}
                </p>
              )}
            </>
          ) : (
            <p className="text-sm whitespace-pre-wrap break-words">
              {message}
            </p>
          )}

          {/* Timestamp and status */}
          <div className="flex items-center justify-end gap-1 mt-1">
            <span className="text-[10px] text-[#8696A0] select-none">
              {format(new Date(timestamp), 'HH:mm', { locale: es })}
              {isEdited && <span className="ml-1 opacity-60">(editado)</span>}
            </span>
            {renderStatus()}
          </div>
        </div>

        {/* Reactions */}
        {reactions && Object.keys(reactions).length > 0 && (
          <div className="absolute -bottom-2 right-2 flex gap-1 bg-[#111B21] rounded-full px-2 py-0.5 shadow-md border border-[#2A3942]">
            {Object.entries(reactions).map(([emoji, users]) => (
              <button
                key={emoji}
                onClick={(e) => {
                  e.stopPropagation();
                  onReactionClick?.(emoji);
                }}
                className="text-xs flex items-center gap-0.5 hover:scale-110 transition-transform"
              >
                {emoji}
                <span className="text-[10px] text-[#8696A0]">{users.length}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
});
