"use client";

import { useRef, useEffect } from "react";

interface UseSwipeNavigationProps {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  threshold?: number;
}

// Elementos y selectores que deben ignorar el swipe
const INTERACTIVE_SELECTORS = [
  "input",
  "textarea",
  "select",
  "button",
  "[role='dialog']",
  "[role='menu']",
  "[data-radix-popper-content-wrapper]",
  ".bottom-sheet",
  "[data-state='open']",
  ".swipe-ignore",
];

function isInteractiveElement(element: HTMLElement | null): boolean {
  if (!element) return false;

  // Verificar si el elemento o algún ancestro es interactivo
  let current: HTMLElement | null = element;
  while (current) {
    // Verificar por tag name
    const tagName = current.tagName.toLowerCase();
    if (["input", "textarea", "select", "button"].includes(tagName)) {
      return true;
    }

    // Verificar por selectores
    for (const selector of INTERACTIVE_SELECTORS) {
      try {
        if (current.matches(selector)) {
          return true;
        }
      } catch {
        // Ignorar errores de selector inválido
      }
    }

    // Verificar si es un contenedor scrolleable con contenido
    if (
      current.scrollHeight > current.clientHeight &&
      current.clientHeight > 100
    ) {
      const style = window.getComputedStyle(current);
      if (style.overflowY === "auto" || style.overflowY === "scroll") {
        return true;
      }
    }

    current = current.parentElement;
  }

  return false;
}

export function useSwipeNavigation({
  onSwipeLeft,
  onSwipeRight,
  threshold = 50,
}: UseSwipeNavigationProps) {
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);
  const touchEndX = useRef(0);
  const touchEndY = useRef(0);
  const shouldIgnore = useRef(false);

  useEffect(() => {
    const handleTouchStart = (e: TouchEvent) => {
      const target = e.target as HTMLElement;

      // Ignorar si se toca un elemento interactivo
      shouldIgnore.current = isInteractiveElement(target);

      touchStartX.current = e.touches[0].clientX;
      touchStartY.current = e.touches[0].clientY;
      touchEndX.current = e.touches[0].clientX;
      touchEndY.current = e.touches[0].clientY;
    };

    const handleTouchMove = (e: TouchEvent) => {
      touchEndX.current = e.touches[0].clientX;
      touchEndY.current = e.touches[0].clientY;
    };

    const handleTouchEnd = () => {
      // No hacer nada si debemos ignorar este swipe
      if (shouldIgnore.current) {
        shouldIgnore.current = false;
        return;
      }

      const diffX = touchStartX.current - touchEndX.current;
      const diffY = touchStartY.current - touchEndY.current;

      // Ignorar si el movimiento es más vertical que horizontal (scroll)
      if (Math.abs(diffY) > Math.abs(diffX)) {
        return;
      }

      // Solo activar si el swipe horizontal es mayor al threshold
      if (Math.abs(diffX) > threshold) {
        if (diffX > 0 && onSwipeLeft) {
          onSwipeLeft();
        } else if (diffX < 0 && onSwipeRight) {
          onSwipeRight();
        }
      }
    };

    document.addEventListener("touchstart", handleTouchStart, {
      passive: true,
    });
    document.addEventListener("touchmove", handleTouchMove, { passive: true });
    document.addEventListener("touchend", handleTouchEnd);

    return () => {
      document.removeEventListener("touchstart", handleTouchStart);
      document.removeEventListener("touchmove", handleTouchMove);
      document.removeEventListener("touchend", handleTouchEnd);
    };
  }, [onSwipeLeft, onSwipeRight, threshold]);
}
