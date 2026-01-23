import React, { useEffect, useState, useRef, useCallback } from 'react';
import { motion, PanInfo } from 'framer-motion';
import haptics from '../../services/hapticsService';
import { useBackButton } from '../../hooks/useBackButton';
import { useFocusTrap } from '../../hooks/useFocusTrap';

interface ImageModalProps {
    src: string;
    onClose: () => void;
}

export const ImageModal: React.FC<ImageModalProps> = ({ src, onClose }) => {
    // Handle hardware back button (Android) - always true since modal only renders when open
    useBackButton(true, onClose);

    // Focus trap for accessibility
    const modalRef = useFocusTrap<HTMLDivElement>(true);

    // Pinch-to-zoom state
    const [scale, setScale] = useState(1);
    const [position, setPosition] = useState({ x: 0, y: 0 });
    const lastScale = useRef(1);
    const lastDistance = useRef(0);
    const lastCenter = useRef({ x: 0, y: 0 });
    const isPinching = useRef(false);
    const imageContainerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                onClose();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [onClose]);

    // Calculate distance between two touch points
    const getDistance = (touches: React.TouchList): number => {
        if (touches.length < 2) return 0;
        const touch0 = touches[0];
        const touch1 = touches[1];
        if (!touch0 || !touch1) return 0;
        const dx = touch0.clientX - touch1.clientX;
        const dy = touch0.clientY - touch1.clientY;
        return Math.sqrt(dx * dx + dy * dy);
    };

    // Calculate center point between two touches
    const getCenter = (touches: React.TouchList): { x: number; y: number } => {
        if (touches.length < 2) return { x: 0, y: 0 };
        const touch0 = touches[0];
        const touch1 = touches[1];
        if (!touch0 || !touch1) return { x: 0, y: 0 };
        return {
            x: (touch0.clientX + touch1.clientX) / 2,
            y: (touch0.clientY + touch1.clientY) / 2,
        };
    };

    const handleTouchStart = useCallback((e: React.TouchEvent) => {
        if (e.touches.length === 2) {
            e.preventDefault();
            e.stopPropagation();
            isPinching.current = true;
            lastDistance.current = getDistance(e.touches);
            lastCenter.current = getCenter(e.touches);
            lastScale.current = scale;
        }
    }, [scale]);

    const handleTouchMove = useCallback((e: React.TouchEvent) => {
        if (e.touches.length === 2 && isPinching.current) {
            e.preventDefault();
            e.stopPropagation();

            const distance = getDistance(e.touches);
            const center = getCenter(e.touches);

            // Calculate new scale
            const scaleDiff = distance / lastDistance.current;
            let newScale = lastScale.current * scaleDiff;

            // Clamp scale between 1 and 4
            newScale = Math.max(1, Math.min(4, newScale));
            setScale(newScale);

            // Pan while zooming
            if (newScale > 1) {
                const dx = center.x - lastCenter.current.x;
                const dy = center.y - lastCenter.current.y;
                setPosition(prev => ({
                    x: prev.x + dx * 0.5,
                    y: prev.y + dy * 0.5,
                }));
                lastCenter.current = center;
            }
        }
    }, []);

    const handleTouchEnd = useCallback((e: React.TouchEvent) => {
        if (e.touches.length < 2) {
            isPinching.current = false;
            // Reset position if scale is back to 1
            if (scale <= 1.05) {
                setScale(1);
                setPosition({ x: 0, y: 0 });
            }
        }
    }, [scale]);

    // Double tap to zoom
    const lastTap = useRef(0);
    const handleDoubleTap = useCallback((e: React.TouchEvent) => {
        const now = Date.now();
        if (now - lastTap.current < 300 && e.touches.length === 1) {
            e.preventDefault();
            if (scale > 1) {
                // Zoom out
                setScale(1);
                setPosition({ x: 0, y: 0 });
            } else {
                // Zoom in to 2x at tap location
                setScale(2);
            }
            haptics.light();
        }
        lastTap.current = now;
    }, [scale]);

    const handleDragEnd = (_event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
        // Only allow drag-to-close when not zoomed in
        if (scale > 1.1) return;

        // Close if dragged down >100px or with high velocity
        if (info.offset.y > 100 || info.velocity.y > 500) {
            haptics.medium();
            onClose();
        }
    };

    return (
        <motion.div
            ref={modalRef}
            className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center px-4 pt-4 pb-[calc(6.5rem+var(--safe-area-inset-bottom))] sm:pb-4 z-50"
            onClick={scale > 1 ? undefined : onClose}
            role="dialog"
            aria-modal="true"
            aria-label="Full-screen dream image viewer. Pinch to zoom, double-tap to toggle zoom, drag down to close."
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
        >
            <div
                ref={imageContainerRef}
                className="relative max-w-full max-h-full touch-none"
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
                onTouchStartCapture={handleDoubleTap}
            >
                <motion.img
                    src={src}
                    alt="Full-screen dream visualization"
                    className="max-w-full max-h-full object-contain rounded-lg cursor-grab active:cursor-grabbing select-none"
                    onClick={(e) => e.stopPropagation()}
                    drag={scale <= 1.05 ? "y" : true}
                    dragConstraints={scale <= 1.05 ? { top: 0, bottom: 0 } : { left: -200, right: 200, top: -200, bottom: 200 }}
                    dragElastic={scale <= 1.05 ? 0.5 : 0.1}
                    onDragEnd={handleDragEnd}
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{
                        scale: scale,
                        opacity: 1,
                        x: position.x,
                        y: position.y,
                    }}
                    exit={{ scale: 0.9, opacity: 0, y: 100 }}
                    transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                    style={{ touchAction: 'none' }}
                    draggable={false}
                />
            </div>

            {/* Zoom indicator */}
            {scale > 1 && (
                <motion.div
                    className="absolute bottom-24 left-1/2 -translate-x-1/2 px-3 py-1.5 bg-black/60 rounded-full text-white text-sm"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                >
                    {Math.round(scale * 100)}%
                </motion.div>
            )}

            <button
                onClick={onClose}
                className="absolute top-4 right-4 text-white bg-black/50 rounded-full p-2 min-h-[44px] min-w-[44px] flex items-center justify-center"
                aria-label="Close image viewer"
            >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
            </button>
        </motion.div>
    );
};