import React from 'react';

interface ScrollingTextProps {
    text: string;
    className?: string;
    maxWidth?: string; // Optional manual max width
}

// Simplified to prevent DOM node removal crashes during resize/render thrashing
export const ScrollingText: React.FC<ScrollingTextProps> = ({ text, className = '', maxWidth = '100%' }) => {
    return (
        <div
            className={`truncate ${className}`}
            style={{ maxWidth }}
            title={text}
        >
            {text}
        </div>
    );
};
