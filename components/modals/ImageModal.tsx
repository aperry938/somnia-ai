import React, { useEffect } from 'react';
import { motion, PanInfo } from 'framer-motion';
import haptics from '../../services/hapticsService';
import { useBackButton } from '../../hooks/useBackButton';

interface ImageModalProps {
    src: string;
    onClose: () => void;
}

export const ImageModal: React.FC<ImageModalProps> = ({ src, onClose }) => {
    // Handle hardware back button (Android) - always true since modal only renders when open
    useBackButton(true, onClose);

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

    const handleDragEnd = (_event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
        // Close if dragged down >100px or with high velocity
        if (info.offset.y > 100 || info.velocity.y > 500) {
            haptics.medium();
            onClose();
        }
    };

    return (
        <motion.div
            className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 z-50"
            onClick={onClose}
            role="dialog"
            aria-modal="true"
            aria-label="Full-screen dream image viewer"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
        >
            <motion.img
                src={src}
                alt="Full-screen dream visualization"
                className="max-w-full max-h-full object-contain rounded-lg cursor-grab active:cursor-grabbing"
                onClick={(e) => e.stopPropagation()}
                drag="y"
                dragConstraints={{ top: 0, bottom: 0 }}
                dragElastic={0.5}
                onDragEnd={handleDragEnd}
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0, y: 100 }}
                transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            />
            <button
                onClick={onClose}
                className="absolute top-4 right-4 text-white bg-black/50 rounded-full p-2 min-h-[44px] min-w-[44px] flex items-center justify-center"
                aria-label="Close image viewer"
            >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
            </button>
        </motion.div>
    );
};