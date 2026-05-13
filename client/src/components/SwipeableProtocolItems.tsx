import { useState, useRef, useCallback, ReactNode } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SwipeableProtocolItemsProps {
  items: any[];
  renderItem: (item: any, index: number, isActive: boolean) => ReactNode;
  className?: string;
  onItemChange?: (index: number) => void;
}

export function SwipeableProtocolItems({
  items,
  renderItem,
  className,
  onItemChange,
}: SwipeableProtocolItemsProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [swipeOffset, setSwipeOffset] = useState(0);
  const [isSwiping, setIsSwiping] = useState(false);
  const startX = useRef(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    startX.current = e.touches[0].clientX;
    setIsSwiping(true);
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isSwiping) return;

    const currentX = e.touches[0].clientX;
    const diff = currentX - startX.current;
    
    // Limit swipe distance
    const maxSwipe = 150;
    const clampedDiff = Math.max(-maxSwipe, Math.min(maxSwipe, diff));
    setSwipeOffset(clampedDiff);
  }, [isSwiping]);

  const handleTouchEnd = useCallback(() => {
    if (!isSwiping) return;

    setIsSwiping(false);
    const threshold = 50;

    if (swipeOffset < -threshold && currentIndex < items.length - 1) {
      // Swipe left - go to next
      const newIndex = currentIndex + 1;
      setCurrentIndex(newIndex);
      onItemChange?.(newIndex);
    } else if (swipeOffset > threshold && currentIndex > 0) {
      // Swipe right - go to previous
      const newIndex = currentIndex - 1;
      setCurrentIndex(newIndex);
      onItemChange?.(newIndex);
    }

    setSwipeOffset(0);
  }, [isSwiping, swipeOffset, currentIndex, items.length, onItemChange]);

  const goToItem = (index: number) => {
    if (index >= 0 && index < items.length) {
      setCurrentIndex(index);
      onItemChange?.(index);
    }
  };

  if (items.length === 0) {
    return null;
  }

  return (
    <div className={cn('relative', className)}>
      {/* Navigation arrows for desktop */}
      <div className="hidden md:flex absolute left-0 top-1/2 -translate-y-1/2 -translate-x-4 z-10">
        <button
          onClick={() => goToItem(currentIndex - 1)}
          disabled={currentIndex === 0}
          className={cn(
            'w-10 h-10 rounded-full bg-white shadow-lg flex items-center justify-center border border-gray-200 transition-all',
            currentIndex === 0 ? 'opacity-30 cursor-not-allowed' : 'hover:bg-gray-50 hover:shadow-xl'
          )}
        >
          <ChevronLeft className="h-5 w-5 text-gray-600" />
        </button>
      </div>
      <div className="hidden md:flex absolute right-0 top-1/2 -translate-y-1/2 translate-x-4 z-10">
        <button
          onClick={() => goToItem(currentIndex + 1)}
          disabled={currentIndex === items.length - 1}
          className={cn(
            'w-10 h-10 rounded-full bg-white shadow-lg flex items-center justify-center border border-gray-200 transition-all',
            currentIndex === items.length - 1 ? 'opacity-30 cursor-not-allowed' : 'hover:bg-gray-50 hover:shadow-xl'
          )}
        >
          <ChevronRight className="h-5 w-5 text-gray-600" />
        </button>
      </div>

      {/* Swipeable container */}
      <div
        ref={containerRef}
        className="overflow-hidden touch-pan-y"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <div
          className="flex transition-transform duration-300 ease-out"
          style={{
            transform: `translateX(calc(-${currentIndex * 100}% + ${swipeOffset}px))`,
            transition: isSwiping ? 'none' : 'transform 0.3s ease-out',
          }}
        >
          {items.map((item, index) => (
            <div
              key={item.id || index}
              className="w-full flex-shrink-0 px-2"
            >
              {renderItem(item, index, index === currentIndex)}
            </div>
          ))}
        </div>
      </div>

      {/* Swipe hint for mobile */}
      <div className="md:hidden flex items-center justify-center gap-2 mt-4 text-xs text-gray-400">
        <ChevronLeft className="h-4 w-4" />
        <span>Swipe to navigate</span>
        <ChevronRight className="h-4 w-4" />
      </div>

      {/* Dot indicators */}
      <div className="flex items-center justify-center gap-2 mt-4">
        {items.map((_, index) => (
          <button
            key={index}
            onClick={() => goToItem(index)}
            className={cn(
              'w-2 h-2 rounded-full transition-all',
              index === currentIndex
                ? 'bg-amber-500 w-4'
                : 'bg-gray-300 hover:bg-gray-400'
            )}
            aria-label={`Go to item ${index + 1}`}
          />
        ))}
      </div>

      {/* Item counter */}
      <div className="text-center mt-2 text-sm text-gray-500">
        {currentIndex + 1} of {items.length}
      </div>
    </div>
  );
}

// Hook for using swipe gestures on any element
export function useSwipeGesture(options: {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  threshold?: number;
}) {
  const { onSwipeLeft, onSwipeRight, threshold = 50 } = options;
  const startX = useRef(0);
  const [isSwiping, setIsSwiping] = useState(false);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    startX.current = e.touches[0].clientX;
    setIsSwiping(true);
  }, []);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (!isSwiping) return;

    const endX = e.changedTouches[0].clientX;
    const diff = endX - startX.current;

    if (diff < -threshold) {
      onSwipeLeft?.();
    } else if (diff > threshold) {
      onSwipeRight?.();
    }

    setIsSwiping(false);
  }, [isSwiping, threshold, onSwipeLeft, onSwipeRight]);

  return {
    onTouchStart: handleTouchStart,
    onTouchEnd: handleTouchEnd,
  };
}
