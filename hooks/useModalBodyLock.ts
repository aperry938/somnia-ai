import { useEffect } from 'react';

/**
 * Prevents background scroll when a modal is open.
 * Adds `modal-open` class to body (defined in index.html/index.css).
 * Properly handles nested modals by only removing the class when
 * the last modal unmounts.
 */
let modalCount = 0;

export const useModalBodyLock = () => {
    useEffect(() => {
        modalCount++;
        document.body.classList.add('modal-open');

        return () => {
            modalCount--;
            if (modalCount <= 0) {
                modalCount = 0;
                document.body.classList.remove('modal-open');
            }
        };
    }, []);
};
