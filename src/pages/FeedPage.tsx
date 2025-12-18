
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Music, Calendar, PlusCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useData } from '../contexts/DataContext';
import { EventCard } from '../components/EventCard';
import { Event } from '../types';

export const FeedPage: React.FC = () => {
    const { user } = useAuth();
    const { events, venues } = useData();
    const navigate = useNavigate();

    const today = new Date().toLocaleDateString('en-CA'); // YYYY-MM-DD local

    // Helper: Is Valid Venue?
    const isVenueApproved = (evt: Event) => {
        // If specific ID linked, check it
        if (evt.venueId) {
            const v = venues.find(v => v.id === evt.venueId);
            return v ? v.status === 'APPROVED' : true; // If ID exists but not found? Assume true/legacy or deleted. Strict would be false. Let's assume true to avoid breaking legacy unless explicitly pending.
            // Wait, if it IS found and PENDING, return false.
        }
        // Fallback: Check by Name
        if (evt.venueName) {
            const v = venues.find(v => v.name.toLowerCase() === evt.venueName.toLowerCase());
            if (v && v.status === 'PENDING') return false;
        }
        return true;
    };

    // 1. "Happening Tonight"
    const now = new Date();
    const currentHours = now.getHours();
    const currentMinutes = now.getMinutes();
    const currentTimeVal = currentHours * 60 + currentMinutes;

    const tonightEvents = events.filter(e => {
        // Venue Check
        if (!isVenueApproved(e)) return false;

        // Basic Checks
        if (e.date !== today) return false;
        if (e.isPublic === false) return false;
        if (e.isArchived) return false;

        // Time Check: Exclude if passed
        if (e.endTime && e.startTime) {
            const [startH, startM] = e.startTime.split(':').map(Number);
            const [endH, endM] = e.endTime.split(':').map(Number);

            const startVal = startH * 60 + startM;
            const endVal = endH * 60 + endM;

            // Handle Midnight Crossing (e.g. 10pm - 2am)
            if (startVal > endVal) {
                // If it ends tomorrow, and we are currently on the start date (today), 
                // it naturally hasn't ended yet (unless it's insane length).
                return true;
            } else {
                // Same day event. Check if 'now' is past 'end'.
                if (currentTimeVal > endVal) return false;
            }
        } else if (e.endTime) {
            // Fallback if no start time but has end time (rare)
            const [endH, endM] = e.endTime.split(':').map(Number);
            if (currentTimeVal > (endH * 60 + endM)) return false;
        }

        return true;
    });

    // 2. "Upcoming" (Future dates)
    const upcomingEvents = events.filter(e =>
        e.date > today &&
        e.isPublic !== false &&
        !e.isArchived &&
        isVenueApproved(e)
    ).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    // Group Upcoming by Date
    const groupedUpcoming: { [date: string]: Event[] } = {};
    upcomingEvents.forEach(e => {
        if (!groupedUpcoming[e.date]) groupedUpcoming[e.date] = [];
        groupedUpcoming[e.date].push(e);
    });

    const hasEvents = tonightEvents.length > 0 || upcomingEvents.length > 0;

    // Helper to format "2023-12-14" -> "Saturday, Dec 14"
    const formatDateHeader = (dateStr: string) => {
        const date = new Date(dateStr + "T00:00:00"); // Force local midnight to avoid timezone shifts
        return date.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
    };

    return (
        <div className="pb-24 pt-4 px-4 space-y-8">

            {/* 1. TONIGHT Section */}
            <div>
                <h2 className="text-xl font-bold mb-4 text-white flex items-center gap-2">
                    <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
                    Tonight
                </h2>

                {tonightEvents.length === 0 ? (
                    <p className="text-slate-500 text-sm italic">Nothing happening tonight.</p>
                ) : (
                    <div className="grid gap-4">
                        {tonightEvents.map(evt => (
                            <EventCard key={evt.id} event={evt} userCheckedInEventId={user?.checkedInEventId} />
                        ))}
                    </div>
                )}
            </div>

            {/* 2. UPCOMING Section */}
            {Object.keys(groupedUpcoming).length > 0 && (
                <div>
                    <h2 className="text-xl font-bold mb-4 text-white">Upcoming</h2>
                    <div className="space-y-6">
                        {Object.entries(groupedUpcoming).map(([date, evts]) => (
                            <div key={date}>
                                <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-2 border-b border-slate-800 pb-1">
                                    {formatDateHeader(date)}
                                </h3>
                                <div className="grid gap-4">
                                    {evts.map(evt => (
                                        <EventCard key={evt.id} event={evt} userCheckedInEventId={user?.checkedInEventId} />
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* 3. EMPTY STATES (User / DJ / Admin) */}
            {!hasEvents && (
                <div className="mt-10 bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center animate-in fade-in slide-in-from-bottom-4">
                    {/* Common Icon */}
                    <div className="mx-auto w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center mb-4 text-slate-500">
                        <Calendar size={32} />
                    </div>

                    {/* Logic for Message & Action */}
                    {(user?.role === 'DJ' || user?.role === 'ADMIN') ? (
                        <>
                            <h3 className="text-lg font-bold text-white mb-2">Oh no! No upcoming events!</h3>
                            <p className="text-slate-400 mb-6">It's too quiet in here. Get the party started!</p>

                            <button
                                onClick={() => navigate(user.role === 'ADMIN' ? '/admin' : '/dj')}
                                className="bg-gradient-to-r from-purple-600 to-blue-600 hover:opacity-90 text-white font-bold py-3 px-6 rounded-xl flex items-center gap-2 mx-auto transition shadow-lg shadow-purple-900/20"
                            >
                                <PlusCircle size={20} />
                                {user.role === 'ADMIN' ? 'Go to Admin Dashboard' : 'Go to DJ Hub'}
                            </button>
                        </>
                    ) : (
                        <>
                            <h3 className="text-lg font-bold text-white mb-2">No Upcoming Events</h3>
                            <p className="text-slate-400">
                                There are currently no upcoming events. Check in with us next week!
                            </p>
                        </>
                    )}
                </div>
            )}
        </div>
    );
};
