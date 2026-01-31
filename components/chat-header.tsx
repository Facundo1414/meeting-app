'use client';

import { memo } from 'react';
import { User, ArrowLeft, MoreVertical, Video, Phone, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { HeaderTypingIndicator } from '@/components/typing-indicator';

interface ChatHeaderProps {
  userName: string;
  userStatus?: string;
  isOnline?: boolean;
  isTyping?: boolean;
  onBack?: () => void;
  onVideoCall?: () => void;
  onVoiceCall?: () => void;
  onSearch?: () => void;
  onMoreOptions?: () => void;
}

export const ChatHeader = memo(function ChatHeader({
  userName,
  userStatus,
  isOnline = false,
  isTyping = false,
  onBack,
  onVideoCall,
  onVoiceCall,
  onSearch,
  onMoreOptions,
}: ChatHeaderProps) {
  return (
    <div className="bg-[#202C33] border-b border-[#2A3942] px-3 md:px-4 py-2 md:py-3">
      <div className="flex items-center justify-between">
        {/* Left: Back button + User info */}
        <div className="flex items-center gap-3 flex-1 min-w-0">
          {onBack && (
            <Button
              onClick={onBack}
              variant="ghost"
              size="icon"
              className="flex-shrink-0 text-[#8696A0] hover:text-white hover:bg-[#2A3942] rounded-full h-10 w-10 md:hidden"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
          )}

          {/* Avatar */}
          <div className="relative flex-shrink-0">
            <div className="w-10 h-10 rounded-full bg-[#00A884] flex items-center justify-center">
              <User className="h-5 w-5 text-white" />
            </div>
            {isOnline && (
              <div className="absolute bottom-0 right-0 w-3 h-3 bg-[#00A884] border-2 border-[#202C33] rounded-full" />
            )}
          </div>

          {/* Name and status */}
          <div className="flex-1 min-w-0">
            <h2 className="text-[#E9EDEF] font-medium text-base truncate">
              {userName}
            </h2>
            <div className="h-4">
              {isTyping ? (
                <HeaderTypingIndicator isTyping={isTyping} />
              ) : userStatus ? (
                <p className={`text-xs truncate ${isOnline ? 'text-[#00A884]' : 'text-[#8696A0]'}`}>
                  {userStatus}
                </p>
              ) : null}
            </div>
          </div>
        </div>

        {/* Right: Action buttons */}
        <div className="flex items-center gap-1">
          {onVideoCall && (
            <Button
              onClick={onVideoCall}
              variant="ghost"
              size="icon"
              className="flex-shrink-0 text-[#8696A0] hover:text-white hover:bg-[#2A3942] rounded-full h-10 w-10"
            >
              <Video className="h-5 w-5" />
            </Button>
          )}

          {onVoiceCall && (
            <Button
              onClick={onVoiceCall}
              variant="ghost"
              size="icon"
              className="flex-shrink-0 text-[#8696A0] hover:text-white hover:bg-[#2A3942] rounded-full h-10 w-10"
            >
              <Phone className="h-5 w-5" />
            </Button>
          )}

          {onSearch && (
            <Button
              onClick={onSearch}
              variant="ghost"
              size="icon"
              className="flex-shrink-0 text-[#8696A0] hover:text-white hover:bg-[#2A3942] rounded-full h-10 w-10"
            >
              <Search className="h-5 w-5" />
            </Button>
          )}

          {onMoreOptions && (
            <Button
              onClick={onMoreOptions}
              variant="ghost"
              size="icon"
              className="flex-shrink-0 text-[#8696A0] hover:text-white hover:bg-[#2A3942] rounded-full h-10 w-10"
            >
              <MoreVertical className="h-5 w-5" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
});
