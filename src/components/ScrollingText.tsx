import React, { useEffect, useRef, useState } from 'react';

interface ScrollingTextProps {
    text: string;
    className?: string;
    maxWidth?: string; // Optional manual max width
}

export const ScrollingText: React.FC<ScrollingTextProps> = ({ text, className = '', maxWidth = '100%' }) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const textRef = useRef<HTMLSpanElement>(null);
    const [shouldScroll, setShouldScroll] = useState(false);
    const [duration, setDuration] = useState(0);

    useEffect(() => {
        const checkOverflow = () => {
            if (containerRef.current && textRef.current) {
                const containerWidth = containerRef.current.clientWidth;
                const textWidth = textRef.current.scrollWidth;

                // Only scroll if text is larger than container
                const overflow = textWidth > containerWidth;
                setShouldScroll(overflow);

                if (overflow) {
                    // Calculate duration based on width difference for consistent speed
                    // e.g., 50px per second
                    const distance = textWidth - containerWidth;
                    // Add buffer time for the pause
                    const calculatedDuration = Math.max(3, distance / 30);
                    setDuration(calculatedDuration);
                }
            }
        };

        checkOverflow();

        // Re-check on window resize
        window.addEventListener('resize', checkOverflow);
        return () => window.removeEventListener('resize', checkOverflow);
    }, [text]);

    return (
        <div
            ref={containerRef}
            className={`relative overflow-hidden whitespace-nowrap ${className}`}
            style={{ maxWidth }}
            title={text} // Tooltip fallback
        >
            <span
                ref={textRef}
                className={`inline-block ${shouldScroll ? 'animate-marquee' : ''}`}
                style={shouldScroll ? {
                    animationDuration: `${duration}s`,
                    animationTimingFunction: 'linear',
                    animationIterationCount: 'infinite',
                    // Use CSS variables for start/end if we wanted pure CSS keyframes dynamic logic
                    // but standard marquee keyframes in index.css will work if we translate 
                    // a specific percentage. 
                    // Actually, generic 'marquee' assumes specific translation.
                    // Better approach for pausing:
                    // 0% -> 20%: translateX(0)
                    // 20% -> 80%: translateX(calc(-100% + containerWidth))
                    // 80% -> 100%: translateX(calc(-100% + containerWidth)) (pause at end?)
                    // Let's rely on standard 'animate-scroll' class we will define in index.css
                    // and use --scroll-amount variable.
                    ['--scroll-width' as any]: `-${textRef.current!.scrollWidth - containerRef.current!.clientWidth}px`
                } : {}}
            >
                {text}
            </span>
        </div>
    );
};
