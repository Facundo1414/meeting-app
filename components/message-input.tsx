'use client';

import { useState, useCallback, useRef, useEffect, memo } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

interface MessageInputProps {
  onSend: (message: string) => void;
  onTyping: () => void;
  placeholder?: string;
  disabled?: boolean;
  isEditing?: boolean;
  editingText?: string;
  onCancelEdit?: () => void;
}

// Componente memoizado para evitar re-renders innecesarios
export const MessageInput = memo(function MessageInput({
  onSend,
  onTyping,
  placeholder = "Escribe un mensaje...",
  disabled = false,
  isEditing = false,
  editingText = '',
  onCancelEdit,
}: MessageInputProps) {
  const [value, setValue] = useState(editingText);
  const inputRef = useRef<HTMLInputElement>(null);

  // Sincronizar con editingText cuando cambia
  useEffect(() => {
    setValue(editingText);
  }, [editingText]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setValue(e.target.value);
    onTyping();
  }, [onTyping]);

  const handleSend = useCallback(() => {
    if (value.trim()) {
      onSend(value.trim());
      setValue('');
    }
  }, [value, onSend]);

  const handleKeyPress = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }, [handleSend]);

  const handleCancel = useCallback(() => {
    setValue('');
    onCancelEdit?.();
  }, [onCancelEdit]);

  return (
    <div className="flex gap-2 items-center flex-1">
      <Input
        ref={inputRef}
        value={value}
        onChange={handleChange}
        onKeyPress={handleKeyPress}
        placeholder={placeholder}
        className="flex-1 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100 dark:placeholder-gray-400"
        disabled={disabled}
      />
      {isEditing && (
        <Button
          variant="outline"
          size="sm"
          onClick={handleCancel}
          className="dark:border-gray-600"
        >
          ✕
        </Button>
      )}
      <Button 
        onClick={handleSend}
        disabled={!value.trim() || disabled}
        title={isEditing ? 'Guardar' : 'Enviar'}
      >
        {isEditing ? '💾' : '✈️'}
      </Button>
    </div>
  );
});
