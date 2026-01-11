'use client';

import { useState, useEffect } from 'react';
import { Search, X } from 'lucide-react';
import useDebounce from '@/hooks/useDebounce';

export default function SearchBar({ onSearch, onClear }) {
    const [query, setQuery] = useState('');
    const debouncedQuery = useDebounce(query, 300);

    useEffect(() => {
        if (debouncedQuery.trim()) {
            onSearch(debouncedQuery);
        } else if (debouncedQuery === '') {
            onClear();
        }
    }, [debouncedQuery, onSearch, onClear]);

    const handleClear = () => {
        setQuery('');
        onClear();
    };

    return (
        <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search notes..."
                className="w-full pl-10 pr-10 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-600 transition-all"
            />
            {query && (
                <button
                    onClick={handleClear}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                    <X className="w-5 h-5" />
                </button>
            )}
        </div>
    );
}
