'use client';

import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { TimeSlot } from '@/lib/storage-supabase';

interface SlotCardProps {
  slot: TimeSlot;
  isOwn: boolean;
  onEdit?: () => void;
  onDelete?: () => void;
}

function getSlotStyles(type: string) {
  switch (type) {
    case 'plan':
      return {
        bgClass: 'bg-green-50 dark:bg-green-950',
        borderClass: 'border-green-200 dark:border-green-800',
        textClass: 'text-green-900 dark:text-green-200',
        emoji: '🟢',
        label: 'Plan',
      };
    case 'meeting':
      return {
        bgClass: 'bg-blue-50 dark:bg-blue-950',
        borderClass: 'border-blue-200 dark:border-blue-800',
        textClass: 'text-blue-900 dark:text-blue-200',
        emoji: '🔵',
        label: 'Reunión',
      };
    case 'tentative':
      return {
        bgClass: 'bg-yellow-50 dark:bg-yellow-950',
        borderClass: 'border-yellow-200 dark:border-yellow-800',
        textClass: 'text-yellow-900 dark:text-yellow-200',
        emoji: '🟡',
        label: 'Charlemos',
      };
    case 'other':
      return {
        bgClass: 'bg-purple-50 dark:bg-purple-950',
        borderClass: 'border-purple-200 dark:border-purple-800',
        textClass: 'text-purple-900 dark:text-purple-200',
        emoji: '🟣',
        label: 'Otro',
      };
    default:
      return {
        bgClass: 'bg-red-50 dark:bg-red-950',
        borderClass: 'border-red-200 dark:border-red-800',
        textClass: 'text-red-900 dark:text-red-200',
        emoji: '🔴',
        label: 'Ocupado',
      };
  }
}

export function SlotCard({ slot, isOwn, onEdit, onDelete }: SlotCardProps) {
  const type = slot.eventType || 'unavailable';
  const { bgClass, borderClass, textClass, emoji, label } = getSlotStyles(type);

  if (isOwn) {
    return (
      <motion.div
        variants={{
          hidden: { opacity: 0, y: 20 },
          visible: { opacity: 1, y: 0 }
        }}
        className={`p-3 ${bgClass} border-2 ${borderClass} rounded-lg`}
      >
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className={`font-semibold ${textClass}`}>
              {emoji} {parseInt(slot.startTime).toString().padStart(2, '0')}:00 - {parseInt(slot.endTime).toString().padStart(2, '0')}:00
            </div>
            <div className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">{label}</div>
            {slot.note && (
              <div className="text-sm text-gray-700 dark:text-gray-300 mt-1">{slot.note}</div>
            )}
          </div>
          <div className="flex gap-1 items-center">
            <Button
              variant="ghost"
              size="sm"
              onClick={onEdit}
              className="text-blue-600 hover:text-blue-800 hover:bg-blue-100 dark:text-blue-400 dark:hover:text-blue-300 dark:hover:bg-blue-950"
            >
              ✏️
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={onDelete}
              className="text-red-600 hover:text-red-800 hover:bg-red-100 dark:text-red-400 dark:hover:text-red-300 dark:hover:bg-red-950"
            >
              ✕
            </Button>
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <div className={`p-3 ${bgClass} border-2 ${borderClass} rounded-lg`}>
      <div className={`font-semibold ${textClass}`}>
        {emoji} {parseInt(slot.startTime).toString().padStart(2, '0')}:00 - {parseInt(slot.endTime).toString().padStart(2, '0')}:00
      </div>
      <div className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">{label}</div>
      {slot.note && (
        <div className="text-sm text-gray-700 dark:text-gray-300 mt-1">{slot.note}</div>
      )}
    </div>
  );
}
