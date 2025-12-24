'use client';

import { useRef, useEffect, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Eraser, Trash2, Palette } from 'lucide-react';

interface CanvasDrawProps {
  onDrawingChange?: (dataUrl: string) => void;
  disabled?: boolean;
  initialDrawing?: string;
  readOnly?: boolean;
}

const COLORS = [
  '#000000', // Negro
  '#FF0000', // Rojo
  '#0000FF', // Azul
  '#00FF00', // Verde
  '#FFFF00', // Amarillo
  '#FF00FF', // Magenta
  '#00FFFF', // Cian
  '#FFA500', // Naranja
];

const BRUSH_SIZES = [2, 5, 10, 15];

export function CanvasDraw({ 
  onDrawingChange, 
  disabled = false,
  initialDrawing,
  readOnly = false
}: CanvasDrawProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const isDrawingRef = useRef(false);
  const [context, setContext] = useState<CanvasRenderingContext2D | null>(null);
  const contextRef = useRef<CanvasRenderingContext2D | null>(null);
  const [currentColor, setCurrentColor] = useState('#000000');
  const currentColorRef = useRef('#000000');
  const [brushSize, setBrushSize] = useState(5);
  const brushSizeRef = useRef(5);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);
  const hasDrawnRef = useRef(false);
  const onDrawingChangeRef = useRef(onDrawingChange);

  // Keep refs in sync with state
  useEffect(() => {
    currentColorRef.current = currentColor;
  }, [currentColor]);

  useEffect(() => {
    brushSizeRef.current = brushSize;
  }, [brushSize]);

  useEffect(() => {
    contextRef.current = context;
  }, [context]);

  useEffect(() => {
    onDrawingChangeRef.current = onDrawingChange;
  }, [onDrawingChange]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    // Set canvas size
    const updateSize = () => {
      const container = canvas.parentElement;
      if (container) {
        const width = container.clientWidth;
        const height = Math.min(window.innerHeight * 0.5, 400);
        
        // Save current drawing
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        
        canvas.width = width;
        canvas.height = height;
        
        // Restore drawing
        if (canvas.width > 0 && canvas.height > 0) {
          ctx.putImageData(imageData, 0, 0);
        }
        
        // Set white background
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Draw placeholder if hasn't drawn yet
        if (!hasDrawn && !readOnly && !initialDrawing) {
          ctx.save();
          ctx.fillStyle = '#9ca3af';
          ctx.font = 'bold 32px system-ui, -apple-system, sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('✏️ Dibuja aquí', canvas.width / 2, canvas.height / 2);
          ctx.restore();
        }
        
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
      }
    };

    updateSize();
    window.addEventListener('resize', updateSize);
    
    setContext(ctx);

    return () => window.removeEventListener('resize', updateSize);
  }, [hasDrawn, readOnly, initialDrawing]);

  // Draw placeholder when canvas is ready
  useEffect(() => {
    if (context && canvasRef.current && !hasDrawn && !readOnly && !initialDrawing) {
      context.save();
      context.fillStyle = '#9ca3af';
      context.font = 'bold 32px system-ui, -apple-system, sans-serif';
      context.textAlign = 'center';
      context.textBaseline = 'middle';
      context.fillText('✏️ Dibuja aquí', canvasRef.current.width / 2, canvasRef.current.height / 2);
      context.restore();
    }
  }, [context, hasDrawn, readOnly, initialDrawing]);

  useEffect(() => {
    if (initialDrawing && context && canvasRef.current) {
      const img = new Image();
      img.onload = () => {
        if (context && canvasRef.current) {
          context.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
          context.fillStyle = '#ffffff';
          context.fillRect(0, 0, canvasRef.current.width, canvasRef.current.height);
          context.drawImage(img, 0, 0);
        }
      };
      img.src = initialDrawing;
    }
  }, [initialDrawing, context]);

  // Native touch event handlers to prevent scrolling while drawing
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || disabled || readOnly) return;

    const handleTouchStart = (e: TouchEvent) => {
      const ctx = contextRef.current;
      if (!ctx || !canvas) return;
      
      // Clear placeholder on first draw
      if (!hasDrawnRef.current) {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        hasDrawnRef.current = true;
        setHasDrawn(true);
      }
      
      e.preventDefault();
      isDrawingRef.current = true;
      setIsDrawing(true);

      const rect = canvas.getBoundingClientRect();
      const x = e.touches[0].clientX - rect.left;
      const y = e.touches[0].clientY - rect.top;

      ctx.beginPath();
      ctx.moveTo(x, y);
    };

    const handleTouchMove = (e: TouchEvent) => {
      const ctx = contextRef.current;
      if (!isDrawingRef.current || !ctx || !canvas) return;
      
      e.preventDefault();

      const rect = canvas.getBoundingClientRect();
      const x = e.touches[0].clientX - rect.left;
      const y = e.touches[0].clientY - rect.top;

      ctx.strokeStyle = currentColorRef.current;
      ctx.lineWidth = brushSizeRef.current;
      ctx.lineTo(x, y);
      ctx.stroke();
    };

    const handleTouchEnd = () => {
      if (!isDrawingRef.current) return;
      
      isDrawingRef.current = false;
      setIsDrawing(false);
      
      const ctx = contextRef.current;
      if (ctx && canvas && onDrawingChangeRef.current) {
        ctx.closePath();
        const dataUrl = canvas.toDataURL('image/png');
        onDrawingChangeRef.current(dataUrl);
      }
    };

    // Add native event listeners with passive: false to allow preventDefault
    canvas.addEventListener('touchstart', handleTouchStart, { passive: false });
    canvas.addEventListener('touchmove', handleTouchMove, { passive: false });
    canvas.addEventListener('touchend', handleTouchEnd);

    return () => {
      canvas.removeEventListener('touchstart', handleTouchStart);
      canvas.removeEventListener('touchmove', handleTouchMove);
      canvas.removeEventListener('touchend', handleTouchEnd);
    };
  }, [disabled, readOnly]);

  const startDrawing = (e: React.MouseEvent) => {
    if (disabled || readOnly || !context || !canvasRef.current) return;
    
    // Clear placeholder on first draw
    if (!hasDrawn) {
      context.fillStyle = '#ffffff';
      context.fillRect(0, 0, canvasRef.current.width, canvasRef.current.height);
      setHasDrawn(true);
      hasDrawnRef.current = true;
    }
    
    setIsDrawing(true);
    isDrawingRef.current = true;

    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    context.beginPath();
    context.moveTo(x, y);
  };

  const draw = (e: React.MouseEvent) => {
    if (!isDrawing || disabled || readOnly || !context || !canvasRef.current) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    context.strokeStyle = currentColor;
    context.lineWidth = brushSize;
    context.lineTo(x, y);
    context.stroke();
  };

  const stopDrawing = () => {
    if (!isDrawing) return;
    
    setIsDrawing(false);
    isDrawingRef.current = false;
    
    if (context && canvasRef.current && onDrawingChange) {
      context.closePath();
      const dataUrl = canvasRef.current.toDataURL('image/png');
      onDrawingChange(dataUrl);
    }
  };

  const clearCanvas = () => {
    if (!context || !canvasRef.current || disabled || readOnly) return;
    
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    
    // Reset hasDrawn and show placeholder again
    setHasDrawn(false);
    
    // Draw placeholder
    context.save();
    context.fillStyle = '#9ca3af';
    context.font = 'bold 32px system-ui, -apple-system, sans-serif';
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillText('✏️ Dibuja aquí', canvasRef.current.width / 2, canvasRef.current.height / 2);
    context.restore();
    
    if (onDrawingChange) {
      const dataUrl = canvasRef.current.toDataURL('image/png');
      onDrawingChange(dataUrl);
    }
  };

  return (
    <div className="space-y-4">
      <canvas
        ref={canvasRef}
        className={`w-full border-4 border-gray-800 dark:border-gray-400 rounded-lg touch-none bg-white shadow-lg ${
          disabled || readOnly ? 'opacity-50 cursor-not-allowed' : 'cursor-crosshair'
        }`}
        onMouseDown={startDrawing}
        onMouseMove={draw}
        onMouseUp={stopDrawing}
        onMouseLeave={stopDrawing}
      />
      
      {!readOnly && (
        <div className="flex flex-wrap gap-2 items-center justify-between">
          <div className="flex gap-2 items-center">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowColorPicker(!showColorPicker)}
              disabled={disabled}
              className="gap-2"
            >
              <Palette className="h-4 w-4" />
              <div 
                className="w-6 h-6 rounded border-2 border-gray-300"
                style={{ backgroundColor: currentColor }}
              />
            </Button>
            
            <div className="flex gap-1">
              {BRUSH_SIZES.map(size => (
                <Button
                  key={size}
                  variant={brushSize === size ? "default" : "outline"}
                  size="sm"
                  onClick={() => setBrushSize(size)}
                  disabled={disabled}
                  className="w-10 h-10 p-0"
                >
                  <div 
                    className="rounded-full bg-current"
                    style={{ width: size + 2, height: size + 2 }}
                  />
                </Button>
              ))}
            </div>
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setCurrentColor('#ffffff');
                setBrushSize(15);
              }}
              disabled={disabled}
              className="gap-2"
            >
              <Eraser className="h-4 w-4" />
              Borrador
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={clearCanvas}
              disabled={disabled}
              className="gap-2"
            >
              <Trash2 className="h-4 w-4" />
              Limpiar
            </Button>
          </div>
        </div>
      )}

      {showColorPicker && !readOnly && (
        <div className="grid grid-cols-8 gap-2 p-4 border rounded-lg bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600">
          {COLORS.map(color => (
            <button
              key={color}
              onClick={() => {
                setCurrentColor(color);
                setShowColorPicker(false);
              }}
              disabled={disabled}
              className={`w-10 h-10 rounded-full border-2 transition-transform ${
                currentColor === color ? 'border-gray-800 dark:border-gray-200 scale-110' : 'border-gray-300 dark:border-gray-600'
              }`}
              style={{ backgroundColor: color }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
