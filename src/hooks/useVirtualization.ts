import { useState, useEffect, useCallback, useRef } from "react";

type VirtualizationOptions = {
  itemHeight: number;
  containerHeight: number;
  overscan?: number;
};

type VirtualizationResult<T> = {
  visibleItems: T[];
  totalHeight: number;
  offsetY: number;
  onScroll: (e: React.UIEvent<HTMLDivElement>) => void;
  containerRef: React.RefObject<HTMLDivElement | null>;
};

export function useVirtualization<T>(
  items: T[],
  options: VirtualizationOptions,
): VirtualizationResult<T> {
  const { itemHeight, containerHeight, overscan = 3 } = options;
  const [scrollTop, setScrollTop] = useState(0);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const totalHeight = items.length * itemHeight;
  const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
  const endIndex = Math.min(
    items.length - 1,
    Math.ceil((scrollTop + containerHeight) / itemHeight) + overscan,
  );

  const visibleItems = items.slice(startIndex, endIndex + 1);

  const onScroll = useCallback(
    (e: React.UIEvent<HTMLDivElement>) => {
      setScrollTop(e.currentTarget.scrollTop);
    },
    [],
  );

  return {
    visibleItems,
    totalHeight,
    offsetY: startIndex * itemHeight,
    onScroll,
    containerRef,
  };
}
