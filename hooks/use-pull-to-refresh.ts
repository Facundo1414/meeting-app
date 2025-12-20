"use client";

import { useEffect, useRef, useState } from "react";

interface UsePullToRefreshProps {
  onRefresh: () => Promise<void>;
  threshold?: number;
}

export function usePullToRefresh({
  onRefresh,
  threshold = 80,
}: UsePullToRefreshProps) {
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const startY = useRef(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const canPull = useRef(false);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleTouchStart = (e: TouchEvent) => {
      // Solo permitir pull to refresh si estamos en la parte superior
      if (container.scrollTop === 0) {
        startY.current = e.touches[0].clientY;
        canPull.current = true;
      } else {
        canPull.current = false;
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!canPull.current || isRefreshing) return;

      const currentY = e.touches[0].clientY;
      const distance = currentY - startY.current;

      // CRÍTICO: Verificar que TODAVÍA estamos en scrollTop === 0
      // Esto previene activaciones cuando se está haciendo scroll normal
      if (container.scrollTop !== 0) {
        canPull.current = false;
        setPullDistance(0);
        return;
      }

      // Solo activar si:
      // 1. Estamos en la parte superior del contenedor
      // 2. El movimiento es hacia abajo (distancia positiva)
      // 3. La distancia es significativa (más de 10px para evitar movimientos accidentales)
      if (distance > 10 && container.scrollTop === 0) {
        e.preventDefault();
        setPullDistance(Math.min(distance * 0.5, threshold * 1.5));
      } else if (distance <= 0 || container.scrollTop > 0) {
        // Si el usuario mueve hacia arriba o scrollea, cancelar el pull
        canPull.current = false;
        setPullDistance(0);
      }
    };

    const handleTouchEnd = async () => {
      if (!canPull.current) {
        setPullDistance(0);
        return;
      }

      canPull.current = false;

      if (pullDistance >= threshold && !isRefreshing) {
        setIsRefreshing(true);
        await onRefresh();
        setIsRefreshing(false);
      }

      setPullDistance(0);
    };

    container.addEventListener("touchstart", handleTouchStart, {
      passive: true,
    });
    container.addEventListener("touchmove", handleTouchMove, {
      passive: false,
    });
    container.addEventListener("touchend", handleTouchEnd);

    return () => {
      container.removeEventListener("touchstart", handleTouchStart);
      container.removeEventListener("touchmove", handleTouchMove);
      container.removeEventListener("touchend", handleTouchEnd);
    };
  }, [pullDistance, threshold, onRefresh, isRefreshing]);

  return {
    containerRef,
    pullDistance,
    isRefreshing,
  };
}
