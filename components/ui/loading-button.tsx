'use client';

import { motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';
import { Button, buttonVariants } from './button';
import { cn } from '@/lib/utils';
import type { VariantProps } from 'class-variance-authority';

interface LoadingButtonProps
  extends React.ComponentProps<'button'>,
    VariantProps<typeof buttonVariants> {
  isLoading?: boolean;
  loadingText?: string;
  children: React.ReactNode;
}

export function LoadingButton({
  isLoading = false,
  loadingText,
  children,
  disabled,
  className,
  variant,
  size,
  ...props
}: LoadingButtonProps) {
  return (
    <Button
      disabled={isLoading || disabled}
      className={cn('relative', className)}
      variant={variant}
      size={size}
      {...props}
    >
      <motion.span
        animate={{ opacity: isLoading ? 0 : 1 }}
        transition={{ duration: 0.15 }}
        className="flex items-center gap-2"
      >
        {children}
      </motion.span>

      {isLoading && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="absolute inset-0 flex items-center justify-center gap-2"
        >
          <Loader2 className="w-4 h-4 animate-spin" />
          {loadingText && <span className="text-sm">{loadingText}</span>}
        </motion.div>
      )}
    </Button>
  );
}
