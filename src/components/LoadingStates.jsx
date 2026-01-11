'use client';

export function ChatListSkeleton() {
    return (
        <div className="space-y-2">
            {[1, 2, 3, 4, 5].map((i) => (
                <div
                    key={i}
                    className="h-16 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse"
                />
            ))}
        </div>
    );
}

export function ChatViewSkeleton() {
    return (
        <div className="flex flex-col h-full p-6 space-y-4">
            <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/3 animate-pulse" />
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/4 animate-pulse" />
            <div className="flex-1 space-y-2">
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-5/6 animate-pulse" />
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-4/6 animate-pulse" />
            </div>
        </div>
    );
}

export function EmptyState({ icon: Icon, title, description }) {
    return (
        <div className="flex flex-col items-center justify-center h-full text-center p-8">
            {Icon && <Icon className="w-16 h-16 text-gray-400 dark:text-gray-600 mb-4" />}
            <h3 className="text-xl font-semibold text-gray-700 dark:text-gray-300 mb-2">
                {title}
            </h3>
            <p className="text-gray-500 dark:text-gray-400 max-w-md">{description}</p>
        </div>
    );
}
