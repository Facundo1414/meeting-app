'use client';

import { memo, useState } from 'react';
import { Send, Paperclip, Mic, X, Smile } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface MessageInputBarProps {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  onAttach?: () => void;
  onCamera?: () => void;
  onVoiceRecord?: () => void;
  onVoiceStart?: () => void;
  onVoiceStop?: () => void;
  onVoiceCancel?: () => void;
  disabled?: boolean;
  placeholder?: string;
  replyTo?: {
    message: string;
    senderName: string;
  };
  onCancelReply?: () => void;
  editingMessage?: string;
  onCancelEdit?: () => void;
  isTyping?: boolean;
  isRecording?: boolean;
  recordingTime?: number;
  audioBlob?: Blob | null;
  onSendAudio?: () => void;
  mediaPreview?: {
    url: string;
    type: 'image' | 'video';
    onRemove: () => void;
  };
  children?: React.ReactNode;
}

export const MessageInputBar = memo(function MessageInputBar({
  value,
  onChange,
  onSend,
  onAttach,
  onCamera,
  onVoiceRecord,
  onVoiceStart,
  onVoiceStop,
  onVoiceCancel,
  disabled = false,
  placeholder = 'Escribir mensaje...',
  replyTo,
  onCancelReply,
  editingMessage,
  onCancelEdit,
  isRecording = false,
  recordingTime = 0,
  audioBlob,
  onSendAudio,
  mediaPreview,
  children,
}: MessageInputBarProps) {
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  const commonEmojis = [
    '😀', '😂', '🤣', '😊', '😍', '🥰', '😘', '😎', '🤔', '🙄',
    '😴', '🤤', '😭', '😡', '🤯', '🥳', '🤩', '😱', '😨', '🤗',
    '🤭', '🤫', '🤥', '😶', '😐', '😑', '😬', '🙃', '😉', '😌',
    '👍', '👎', '👏', '🙌', '🙏', '💪', '🤝', '✌️', '🤞', '👌',
    '❤️', '💔', '💕', '💖', '💗', '💙', '💚', '💛', '🧡', '💜',
    '🔥', '⭐', '✨', '💯', '💢', '💥', '💦', '💨', '🎉', '🎊',
  ];

  const handleEmojiClick = (emoji: string) => {
    onChange(value + emoji);
    setShowEmojiPicker(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (value.trim() && !disabled) {
        onSend();
      }
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="bg-[#202C33] border-t border-[#2A3942]">
      {/* Reply preview */}
      {replyTo && (
        <div className="px-4 py-2 bg-[#111B21] border-b border-[#2A3942] flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <p className="text-xs text-[#00A884] font-medium mb-0.5">{replyTo.senderName}</p>
            <p className="text-xs text-[#8696A0] truncate">{replyTo.message}</p>
          </div>
          {onCancelReply && (
            <button
              onClick={onCancelReply}
              className="ml-2 text-[#8696A0] hover:text-white transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      )}

      {/* Edit preview */}
      {editingMessage && (
        <div className="px-4 py-2 bg-[#111B21] border-b border-[#2A3942] flex items-start justify-between">
          <div className="flex-1">
            <p className="text-xs text-[#00A884] font-medium">✏️ {editingMessage}</p>
          </div>
          {onCancelEdit && (
            <button
              onClick={onCancelEdit}
              className="ml-2 text-[#8696A0] hover:text-white transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      )}

      {/* Audio preview */}
      {audioBlob && !isRecording && (
        <div className="px-4 py-3 bg-[#111B21] border-b border-[#2A3942]">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-[#E9EDEF]">🎤 Audio grabado</span>
            {onVoiceCancel && (
              <button
                onClick={onVoiceCancel}
                className="text-[#8696A0] hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          <audio src={URL.createObjectURL(audioBlob)} controls className="w-full" />
          {onSendAudio && (
            <Button
              onClick={onSendAudio}
              className="mt-2 w-full bg-[#00A884] hover:bg-[#00916A] text-black"
              disabled={disabled}
            >
              Enviar Audio
            </Button>
          )}
        </div>
      )}

      {/* Media preview */}
      {mediaPreview && (
        <div className="px-4 py-3 bg-[#111B21] border-b border-[#2A3942]">
          <div className="relative inline-block">
            {mediaPreview.type === 'image' ? (
              <img src={mediaPreview.url} alt="Preview" className="max-h-32 rounded-lg" />
            ) : (
              <video src={mediaPreview.url} className="max-h-32 rounded-lg" />
            )}
            <button
              onClick={mediaPreview.onRemove}
              className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center hover:bg-red-600"
            >
              ×
            </button>
          </div>
        </div>
      )}

      {/* Recording indicator */}
      {isRecording && (
        <div className="px-4 py-3 bg-[#111B21] flex items-center gap-3">
          <div className="flex items-center gap-2 flex-1">
            <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
            <span className="text-sm text-[#E9EDEF]">Grabando audio...</span>
            <span className="text-sm text-[#8696A0] font-mono">{formatTime(recordingTime)}</span>
          </div>
        </div>
      )}

      {/* Input bar */}
      <div className="p-2 md:p-3 flex items-end gap-2">
        {/* Attach button */}
        {onAttach && !isRecording && (
          <Button
            type="button"
            onClick={onAttach}
            variant="ghost"
            size="icon"
            className="flex-shrink-0 text-[#8696A0] hover:text-white hover:bg-[#2A3942] rounded-full h-10 w-10"
            disabled={disabled}
          >
            <Paperclip className="h-5 w-5" />
          </Button>
        )}

        {/* Text input */}
        <div className="flex-1 relative bg-[#2A3942] rounded-lg">
          <textarea
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={disabled || isRecording}
            className="
              w-full 
              bg-transparent 
              text-[#E9EDEF]
              placeholder:text-[#8696A0]
              px-4 py-3
              pr-12
              text-sm
              resize-none
              max-h-32
              focus:outline-none
              disabled:opacity-50
            "
            rows={1}
            style={{
              minHeight: '44px',
              maxHeight: '128px',
              overflowY: value.split('\n').length > 3 ? 'auto' : 'hidden',
            }}
          />
          
          {/* Emoji button */}
          <button
            type="button"
            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
            className="absolute right-3 bottom-3 text-[#8696A0] hover:text-white transition-colors"
            disabled={disabled || isRecording}
          >
            <Smile className="h-5 w-5" />
          </button>

          {/* Emoji picker */}
          {showEmojiPicker && (
            <>
              <div 
                className="fixed inset-0 z-40" 
                onClick={() => setShowEmojiPicker(false)}
              />
              <div className="absolute bottom-full right-0 mb-2 bg-[#202C33] rounded-lg shadow-xl border border-[#2A3942] p-3 w-72 max-h-64 overflow-y-auto z-50">
                <div className="grid grid-cols-8 gap-2">
                  {commonEmojis.map((emoji, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleEmojiClick(emoji)}
                      className="text-2xl hover:scale-125 transition-transform p-1 hover:bg-[#2A3942] rounded"
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Send or Voice button */}
        {value.trim() ? (
          <Button
            type="button"
            onClick={onSend}
            disabled={disabled}
            className="flex-shrink-0 bg-[#00A884] hover:bg-[#06CF9C] text-white rounded-full h-10 w-10 p-0"
          >
            <Send className="h-5 w-5" />
          </Button>
        ) : isRecording && onVoiceStop ? (
          <Button
            type="button"
            onClick={onVoiceStop}
            variant="ghost"
            size="icon"
            className="flex-shrink-0 text-red-400 hover:text-red-300 hover:bg-[#2A3942] rounded-full h-10 w-10"
            disabled={disabled}
          >
            ⏹️
          </Button>
        ) : (onVoiceRecord || onVoiceStart) && (
          <Button
            type="button"
            onClick={onVoiceRecord || onVoiceStart}
            variant="ghost"
            size="icon"
            className="flex-shrink-0 text-[#8696A0] hover:text-white hover:bg-[#2A3942] rounded-full h-10 w-10"
            disabled={disabled}
          >
            <Mic className="h-5 w-5" />
          </Button>
        )}
        {children}
      </div>
    </div>
  );
});
