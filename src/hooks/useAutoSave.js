import { useEffect, useRef, useCallback } from 'react';
import useDebounce from './useDebounce';

export default function useAutoSave(content, chatId, delay = 1000) {
    const debouncedContent = useDebounce(content, delay);
    const isSaving = useRef(false);
    const lastSavedContent = useRef(content);

    const saveContent = useCallback(async () => {
        if (
            !chatId ||
            isSaving.current ||
            debouncedContent === lastSavedContent.current
        ) {
            return;
        }

        isSaving.current = true;

        try {
            const response = await fetch(`/api/chat/${chatId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ content: debouncedContent }),
            });

            if (response.ok) {
                lastSavedContent.current = debouncedContent;
                console.log('✅ Auto-saved');
            } else {
                console.error('Auto-save failed:', await response.text());
            }
        } catch (error) {
            console.error('Auto-save error:', error);
        } finally {
            isSaving.current = false;
        }
    }, [debouncedContent, chatId]);

    useEffect(() => {
        if (chatId && debouncedContent !== lastSavedContent.current) {
            saveContent();
        }
    }, [debouncedContent, chatId, saveContent]);

    // Update lastSavedContent when chatId changes
    useEffect(() => {
        lastSavedContent.current = content;
    }, [chatId, content]);

    return { isSaving: isSaving.current };
}
