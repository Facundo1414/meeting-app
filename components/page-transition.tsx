'use client';

import { motion, AnimatePresence, Variants } from 'framer-motion';
import { ReactNode, createContext, useContext, useState } from 'react';

// Tipos de transiciones disponibles
type TransitionType = 'fade' | 'slide' | 'scale' | 'slideUp' | 'slideDown' | 'none';

interface PageTransitionProps {
  children: ReactNode;
  className?: string;
  type?: TransitionType;
  duration?: number;
}

// Variantes de animación para diferentes tipos
const transitionVariants: Record<TransitionType, Variants> = {
  fade: {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 },
  },
  slide: {
    initial: { opacity: 0, x: 20 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -20 },
  },
  scale: {
    initial: { opacity: 0, scale: 0.95 },
    animate: { opacity: 1, scale: 1 },
    exit: { opacity: 0, scale: 0.95 },
  },
  slideUp: {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -20 },
  },
  slideDown: {
    initial: { opacity: 0, y: -20 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: 20 },
  },
  none: {
    initial: {},
    animate: {},
    exit: {},
  },
};

export function PageTransition({ 
  children, 
  className,
  type = 'fade',
  duration = 0.2
}: PageTransitionProps) {
  const variants = transitionVariants[type];

  return (
    <motion.div
      initial="initial"
      animate="animate"
      exit="exit"
      variants={variants}
      transition={{ 
        duration, 
        ease: [0.25, 0.1, 0.25, 1] // Curva suave
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// Wrapper para animaciones de lista
interface AnimatedListProps {
  children: ReactNode[];
  className?: string;
  staggerDelay?: number;
}

export function AnimatedList({ 
  children, 
  className,
  staggerDelay = 0.05
}: AnimatedListProps) {
  return (
    <motion.div
      initial="hidden"
      animate="visible"
      className={className}
      variants={{
        hidden: { opacity: 0 },
        visible: {
          opacity: 1,
          transition: {
            staggerChildren: staggerDelay,
          },
        },
      }}
    >
      {children.map((child, index) => (
        <motion.div
          key={index}
          variants={{
            hidden: { opacity: 0, y: 20 },
            visible: { 
              opacity: 1, 
              y: 0,
              transition: {
                type: 'spring',
                stiffness: 300,
                damping: 24,
              }
            },
          }}
        >
          {child}
        </motion.div>
      ))}
    </motion.div>
  );
}

// Componente para animar la entrada de elementos individuales
interface FadeInProps {
  children: ReactNode;
  delay?: number;
  duration?: number;
  className?: string;
  direction?: 'up' | 'down' | 'left' | 'right' | 'none';
}

export function FadeIn({ 
  children, 
  delay = 0, 
  duration = 0.3,
  className,
  direction = 'up'
}: FadeInProps) {
  const getInitialPosition = () => {
    switch (direction) {
      case 'up': return { y: 20 };
      case 'down': return { y: -20 };
      case 'left': return { x: 20 };
      case 'right': return { x: -20 };
      default: return {};
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, ...getInitialPosition() }}
      animate={{ opacity: 1, x: 0, y: 0 }}
      transition={{ 
        duration, 
        delay,
        ease: [0.25, 0.1, 0.25, 1]
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// Animación de escala con rebote
interface ScaleInProps {
  children: ReactNode;
  delay?: number;
  className?: string;
}

export function ScaleIn({ 
  children, 
  delay = 0,
  className
}: ScaleInProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ 
        type: 'spring',
        stiffness: 400,
        damping: 20,
        delay
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// Componente para animar aparición al hacer scroll
interface ScrollRevealProps {
  children: ReactNode;
  className?: string;
}

export function ScrollReveal({ children, className }: ScrollRevealProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 50 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-50px' }}
      transition={{ 
        duration: 0.5,
        ease: [0.25, 0.1, 0.25, 1]
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// Animación de pulsación para elementos interactivos
interface PulseProps {
  children: ReactNode;
  className?: string;
}

export function Pulse({ children, className }: PulseProps) {
  return (
    <motion.div
      animate={{ 
        scale: [1, 1.02, 1],
      }}
      transition={{ 
        duration: 2,
        repeat: Infinity,
        ease: 'easeInOut'
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// Botón con efecto de presión
interface PressableProps {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
  disabled?: boolean;
}

export function Pressable({ 
  children, 
  className, 
  onClick,
  disabled 
}: PressableProps) {
  return (
    <motion.button
      whileTap={{ scale: disabled ? 1 : 0.95 }}
      whileHover={{ scale: disabled ? 1 : 1.02 }}
      transition={{ type: 'spring', stiffness: 400, damping: 17 }}
      className={className}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </motion.button>
  );
}

// Animación de shake para errores
interface ShakeProps {
  children: ReactNode;
  trigger?: boolean;
  className?: string;
}

export function Shake({ children, trigger, className }: ShakeProps) {
  return (
    <motion.div
      animate={trigger ? {
        x: [0, -10, 10, -10, 10, 0],
        transition: { duration: 0.4 }
      } : {}}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// Skeleton con animación de shimmer
interface ShimmerSkeletonProps {
  className?: string;
  width?: string | number;
  height?: string | number;
}

export function ShimmerSkeleton({ 
  className,
  width,
  height 
}: ShimmerSkeletonProps) {
  return (
    <div 
      className={`relative overflow-hidden bg-muted rounded-md ${className}`}
      style={{ width, height }}
    >
      <motion.div
        className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
        animate={{ x: ['-100%', '100%'] }}
        transition={{ 
          duration: 1.5, 
          repeat: Infinity,
          ease: 'linear'
        }}
      />
    </div>
  );
}

