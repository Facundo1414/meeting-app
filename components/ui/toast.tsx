'use client';

import { Toaster as Sonner, toast as sonnerToast } from 'sonner';
import { CheckCircle2, AlertCircle, Info, AlertTriangle, Loader2, Heart, Calendar, Image, Send } from 'lucide-react';

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            'group toast group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg group-[.toaster]:rounded-2xl',
          description: 'group-[.toast]:text-muted-foreground',
          actionButton:
            'group-[.toast]:bg-primary group-[.toast]:text-primary-foreground group-[.toast]:rounded-lg',
          cancelButton:
            'group-[.toast]:bg-muted group-[.toast]:text-muted-foreground group-[.toast]:rounded-lg',
        },
      }}
      icons={{
        success: <CheckCircle2 className="h-5 w-5 text-emerald-500" />,
        error: <AlertCircle className="h-5 w-5 text-red-500" />,
        info: <Info className="h-5 w-5 text-blue-500" />,
        warning: <AlertTriangle className="h-5 w-5 text-amber-500" />,
        loading: <Loader2 className="h-5 w-5 text-purple-500 animate-spin" />,
      }}
      expand={false}
      richColors
      closeButton
      {...props}
    />
  );
};

// Enhanced toast functions with custom icons and styling
const toast = {
  // Basic toasts
  success: (message: string, description?: string) => 
    sonnerToast.success(message, { description }),
  
  error: (message: string, description?: string) => 
    sonnerToast.error(message, { description }),
  
  info: (message: string, description?: string) => 
    sonnerToast.info(message, { description }),
  
  warning: (message: string, description?: string) => 
    sonnerToast.warning(message, { description }),
  
  loading: (message: string) => 
    sonnerToast.loading(message),
  
  // Custom themed toasts
  message: (message: string, description?: string) => 
    sonnerToast(message, { 
      description,
      icon: <Send className="h-5 w-5 text-purple-500" />
    }),
  
  calendar: (message: string, description?: string) => 
    sonnerToast(message, { 
      description,
      icon: <Calendar className="h-5 w-5 text-pink-500" />
    }),
  
  gallery: (message: string, description?: string) => 
    sonnerToast(message, { 
      description,
      icon: <Image className="h-5 w-5 text-indigo-500" />
    }),
  
  love: (message: string, description?: string) => 
    sonnerToast(message, { 
      description,
      icon: <Heart className="h-5 w-5 text-rose-500 fill-rose-500" />
    }),
  
  // Promise toast for async operations
  promise: <T,>(
    promise: Promise<T>,
    messages: {
      loading: string;
      success: string | ((data: T) => string);
      error: string | ((error: Error) => string);
    }
  ) => sonnerToast.promise(promise, messages),
  
  // Dismiss toast
  dismiss: (id?: string | number) => sonnerToast.dismiss(id),
  
  // Custom toast with full control
  custom: sonnerToast,
};

export { Toaster, toast };
