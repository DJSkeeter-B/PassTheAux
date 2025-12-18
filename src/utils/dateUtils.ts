import { Event } from '../types';

export type EventCategory = 'Today' | 'Upcoming' | 'This Past Week' | 'This Past Month' | 'Older';

export interface CategorizedEvents {
    category: EventCategory;
    events: Event[];
}

export const groupEventsByDate = (events: Event[]): CategorizedEvents[] => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const oneWeekAgo = new Date(today);
    oneWeekAgo.setDate(today.getDate() - 7);

    const oneMonthAgo = new Date(today);
    oneMonthAgo.setDate(today.getDate() - 30);

    const categorized: Record<EventCategory, Event[]> = {
        'Today': [],
        'Upcoming': [],
        'This Past Week': [],
        'This Past Month': [],
        'Older': []
    };

    events.forEach(event => {
        // Handle potentially missing date or invalid date strings gracefully
        if (!event.date) return;

        // Parse date string (YYYY-MM-DD) as LOCAL time to match "Today" logic
        // new Date("YYYY-MM-DD") parses as UTC, which causes issues in Western timezones (shows as yesterday)
        let eventDateNormalized: Date;
        if (event.date.includes('-')) {
            const [y, m, d] = event.date.split('-').map(Number);
            eventDateNormalized = new Date(y, m - 1, d);
        } else {
            // Fallback for unlikely other formats
            eventDateNormalized = new Date(event.date);
            eventDateNormalized.setHours(0, 0, 0, 0);
        }

        if (eventDateNormalized.getTime() === today.getTime()) {
            categorized['Today'].push(event);
        } else if (eventDateNormalized > today) {
            categorized['Upcoming'].push(event);
        } else if (eventDateNormalized >= oneWeekAgo) {
            categorized['This Past Week'].push(event);
        } else if (eventDateNormalized >= oneMonthAgo) {
            categorized['This Past Month'].push(event);
        } else {
            categorized['Older'].push(event);
        }
    });

    // Sort events within categories
    // Upcoming: Ascending (soonest first)
    categorized['Upcoming'].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    // Others: Descending (newest first)
    const descSort = (a: Event, b: Event) => new Date(b.date).getTime() - new Date(a.date).getTime();
    categorized['Today'].sort(descSort);
    categorized['This Past Week'].sort(descSort);
    categorized['This Past Month'].sort(descSort);
    categorized['Older'].sort(descSort);

    // Return as array in specific order
    const order: EventCategory[] = ['Today', 'Upcoming', 'This Past Week', 'This Past Month', 'Older'];

    return order
        .map(category => ({
            category,
            events: categorized[category]
        }))
        .filter(group => group.events.length > 0);
};
