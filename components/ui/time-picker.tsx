'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { ChevronUp, ChevronDown, Clock } from 'lucide-react';

interface TimePickerProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  label?: string;
  disabled?: boolean;
}

export function TimePicker({ 
  value, 
  onChange, 
  min = 0, 
  max = 24, 
  label,
  disabled = false 
}: TimePickerProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [startY, setStartY] = useState(0);
  const [startValue, setStartValue] = useState(value);
  const containerRef = useRef<HTMLDivElement>(null);

  const increment = useCallback(() => {
    if (value < max && !disabled) {
      onChange(value + 1);
    }
  }, [value, max, onChange, disabled]);

  const decrement = useCallback(() => {
    if (value > min && !disabled) {
      onChange(value - 1);
    }
  }, [value, min, onChange, disabled]);

  // Touch/Mouse drag handling
  const handleStart = useCallback((clientY: number) => {
    if (disabled) return;
    setIsDragging(true);
    setStartY(clientY);
    setStartValue(value);
  }, [value, disabled]);

  const handleMove = useCallback((clientY: number) => {
    if (!isDragging || disabled) return;
    
    const diff = startY - clientY;
    const hoursDiff = Math.round(diff / 20); // 20px = 1 hour
    const newValue = Math.max(min, Math.min(max, startValue + hoursDiff));
    
    if (newValue !== value) {
      onChange(newValue);
    }
  }, [isDragging, startY, startValue, min, max, value, onChange, disabled]);

  const handleEnd = useCallback(() => {
    setIsDragging(false);
  }, []);

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => handleMove(e.clientY);
    const handleTouchMove = (e: TouchEvent) => handleMove(e.touches[0].clientY);
    const handleMouseUp = () => handleEnd();
    const handleTouchEnd = () => handleEnd();

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('touchmove', handleTouchMove);
    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('touchend', handleTouchEnd);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('touchend', handleTouchEnd);
    };
  }, [isDragging, handleMove, handleEnd]);

  // Quick select hours
  const quickHours = label === 'Desde' 
    ? [6, 9, 12, 14, 18, 21] 
    : [9, 12, 14, 18, 21, 24];

  return (
    <div className="space-y-2">
      {label && (
        <label className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-1">
          <Clock className="h-3 w-3" />
          {label}
        </label>
      )}
      
      <div 
        ref={containerRef}
        className={`flex flex-col items-center select-none ${disabled ? 'opacity-50' : ''}`}
      >
        {/* Increment Button */}
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={increment}
          disabled={value >= max || disabled}
          className="h-8 w-full hover:bg-blue-50 dark:hover:bg-blue-900/30"
        >
          <ChevronUp className="h-5 w-5" />
        </Button>

        {/* Time Display */}
        <div
          className={`relative w-full py-4 text-center rounded-lg border-2 transition-all ${
            isDragging 
              ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30' 
              : 'border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800'
          } ${!disabled ? 'cursor-ns-resize' : ''}`}
          onMouseDown={(e) => handleStart(e.clientY)}
          onTouchStart={(e) => handleStart(e.touches[0].clientY)}
        >
          <div className="text-3xl font-bold text-gray-900 dark:text-white">
            {value.toString().padStart(2, '0')}:00
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            {isDragging ? 'Arrastra para ajustar' : 'Toca y arrastra'}
          </div>
        </div>

        {/* Decrement Button */}
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={decrement}
          disabled={value <= min || disabled}
          className="h-8 w-full hover:bg-blue-50 dark:hover:bg-blue-900/30"
        >
          <ChevronDown className="h-5 w-5" />
        </Button>
      </div>

      {/* Quick Select */}
      <div className="flex flex-wrap gap-1 justify-center">
        {quickHours.map((hour) => (
          <Button
            key={hour}
            type="button"
            variant={value === hour ? 'default' : 'outline'}
            size="sm"
            onClick={() => onChange(hour)}
            disabled={disabled || hour < min || hour > max}
            className="text-xs px-2 py-1 h-7"
          >
            {hour.toString().padStart(2, '0')}:00
          </Button>
        ))}
      </div>
    </div>
  );
}

interface TimeRangePickerProps {
  startHour: number;
  endHour: number;
  onStartChange: (value: number) => void;
  onEndChange: (value: number) => void;
  disabled?: boolean;
}

export function TimeRangePicker({
  startHour,
  endHour,
  onStartChange,
  onEndChange,
  disabled = false
}: TimeRangePickerProps) {
  // Visual representation of the time range
  const hours = Array.from({ length: 25 }, (_, i) => i);
  
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <TimePicker
          value={startHour}
          onChange={onStartChange}
          min={0}
          max={endHour - 1}
          label="Desde"
          disabled={disabled}
        />
        <TimePicker
          value={endHour}
          onChange={onEndChange}
          min={startHour + 1}
          max={24}
          label="Hasta"
          disabled={disabled}
        />
      </div>

      {/* Visual Timeline */}
      <div className="relative h-8 bg-gray-100 dark:bg-gray-700 rounded-lg overflow-hidden">
        {/* Selected Range */}
        <div
          className="absolute h-full bg-gradient-to-r from-blue-500 to-indigo-500 transition-all duration-200"
          style={{
            left: `${(startHour / 24) * 100}%`,
            width: `${((endHour - startHour) / 24) * 100}%`,
          }}
        />
        
        {/* Hour Markers */}
        <div className="absolute inset-0 flex justify-between px-1">
          {[0, 6, 12, 18, 24].map((hour) => (
            <div key={hour} className="flex flex-col items-center">
              <div className="h-2 w-px bg-gray-400 dark:bg-gray-500" />
              <span className="text-[10px] text-gray-500 dark:text-gray-400">
                {hour.toString().padStart(2, '0')}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Duration Display */}
      <div className="text-center text-sm text-gray-600 dark:text-gray-400">
        Duración: <span className="font-bold text-blue-600 dark:text-blue-400">{endHour - startHour} horas</span>
        <span className="ml-2">
          ({startHour.toString().padStart(2, '0')}:00 - {endHour.toString().padStart(2, '0')}:00)
        </span>
      </div>
    </div>
  );
}
