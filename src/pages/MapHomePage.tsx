import React, { useEffect, useState, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { useData } from '../contexts/DataContext';
import { Event, Venue } from '../types';
import { renderToString } from 'react-dom/server';
import { MapPin, Music, Mic2, Users, SlidersHorizontal, Sparkles } from 'lucide-react';
import { EventCard } from '../components/EventCard';
import { useAuth } from '../contexts/AuthContext';

// --- ICONS ---
const createCustomIcon = (color: string) => {
    return L.divIcon({
        className: 'custom-map-marker',
        html: renderToString(
            <div className={`relative flex items-center justify-center w-10 h-10`}>
                <div className={`absolute w-10 h-10 ${color} rounded-full opacity-30 animate-pulse`}></div>
                <div className={`relative w-8 h-8 ${color} rounded-full border-2 border-white shadow-lg flex items-center justify-center text-white`}>
                    <Music size={14} />
                </div>
                <div className="absolute -bottom-1 w-2 h-2 bg-slate-900 rotate-45"></div>
            </div>
        ),
        iconSize: [40, 40],
        iconAnchor: [20, 40],
        popupAnchor: [0, -40]
    });
};

const Icons = {
    default: createCustomIcon('bg-purple-600'),
    active: createCustomIcon('bg-red-500'),
    selected: createCustomIcon('bg-blue-500'),
    dimmed: createCustomIcon('bg-slate-600'), // For unselected items when filter is active
};

// --- MAP CONTROLLER ---
const MapController = ({
    selectedVenueIds,
    venues
}: {
    selectedVenueIds: string[],
    venues: Venue[]
}) => {
    const map = useMap();

    useEffect(() => {
        if (selectedVenueIds.length === 0) return;

        // If single venue, fly to it
        if (selectedVenueIds.length === 1) {
            const v = venues.find(v => v.id === selectedVenueIds[0]);
            if (v && v.latitude && v.longitude) {
                map.flyTo([v.latitude, v.longitude], 14.5, {
                    duration: 1.2,
                    easeLinearity: 0.25
                });
            }
        }
        // If multiple, maybe fit bounds (future enhancement), for now just don't fly wildly
        // or calculating bounds of all selected venues
        else {
            const latLngs: [number, number][] = [];
            selectedVenueIds.forEach(id => {
                const v = venues.find(v => v.id === id);
                if (v && v.latitude && v.longitude) latLngs.push([v.latitude, v.longitude]);
            });

            if (latLngs.length > 1) {
                const bounds = L.latLngBounds(latLngs);
                map.flyToBounds(bounds, { padding: [50, 50], duration: 1.2 });
            }
        }
    }, [selectedVenueIds, venues, map]);

    return null;
};

// --- MAIN COMPONENT ---
export const MapHomePage: React.FC = () => {
    const { events, venues } = useData();
    const { user } = useAuth();

    // Filters
    const [selectedVenueIds, setSelectedVenueIds] = useState<string[]>([]);
    const [selectedDjNames, setSelectedDjNames] = useState<string[]>([]); // Using names as IDs for DJs might be safer if no ID present, but let's assume we use names based on Event object type
    const [selectedVibeTags, setSelectedVibeTags] = useState<string[]>([]);
    const [filterMode, setFilterMode] = useState<'VENUES' | 'DJS' | 'VIBES'>('VENUES');

    // Initial Center: Halifax, NS
    const center: [number, number] = [44.6488, -63.5752];
    const zoom = 11;

    // 1. DATA PREP
    const todayStr = new Date().toLocaleDateString('en-CA');
    const activeEvents = useMemo(() => {
        return events
            .filter(e => !e.isArchived && e.date >= todayStr)
            .sort((a, b) => {
                const dateA = new Date(`${a.date}T${a.startTime}`);
                const dateB = new Date(`${b.date}T${b.startTime}`);
                return dateA.getTime() - dateB.getTime();
            });
    }, [events, todayStr]);

    // Active Venues (Only those with events currently in the list)
    const activeVenues = useMemo(() => {
        const vSet = new Set<string>();
        activeEvents.forEach(e => {
            if (e.venueId) vSet.add(e.venueId);
            else if (e.venueName) {
                const v = venues.find(v => v.name.toLowerCase() === e.venueName.toLowerCase());
                if (v) vSet.add(v.id);
            }
        });
        return venues.filter(v => vSet.has(v.id));
    }, [activeEvents, venues]);

    // Active DJs (Set of names)
    const activeDjs = useMemo(() => {
        const djs = new Set<string>();
        activeEvents.forEach(e => {
            if (e.djName) djs.add(e.djName);
        });
        return Array.from(djs).sort();
    }, [activeEvents]);

    // Active Vibes
    const activeVibes = useMemo(() => {
        const vibes = new Set<string>();
        activeEvents.forEach(e => {
            if (e.vibeTags) {
                e.vibeTags.forEach(tag => vibes.add(tag));
            }
        });
        return Array.from(vibes).sort();
    }, [activeEvents]);

    // Filtered Events for Bottom List
    const displayedEvents = useMemo(() => {
        return activeEvents.filter(e => {
            // Venue Filter (OR logic within venues)
            const venueMatch = selectedVenueIds.length === 0 ||
                (e.venueId && selectedVenueIds.includes(e.venueId)) ||
                (e.venueName && venues.some(v => v.name.toLowerCase() === e.venueName.toLowerCase() && selectedVenueIds.includes(v.id)));

            // DJ Filter (OR logic within DJs)
            // Note: Filter is AND between categories (Venue AND DJ)
            const djMatch = selectedDjNames.length === 0 ||
                (e.djName && selectedDjNames.includes(e.djName));

            // Vibe Filter (OR logic within Vibes)
            const vibeMatch = selectedVibeTags.length === 0 ||
                (e.vibeTags && e.vibeTags.some(tag => selectedVibeTags.includes(tag)));

            return venueMatch && djMatch && vibeMatch;
        });
    }, [activeEvents, selectedVenueIds, selectedDjNames, selectedVibeTags, venues]);

    // List Logic (Headers + Events)
    const scrollItems = useMemo(() => {
        type ScrollItem =
            | { type: 'header'; label: string; id: string }
            | { type: 'event'; data: Event; id: string };

        const items: ScrollItem[] = [];
        const todayDate = new Date();
        const tomorrowDate = new Date(todayDate);
        tomorrowDate.setDate(tomorrowDate.getDate() + 1);
        const nextWeekDate = new Date(todayDate);
        nextWeekDate.setDate(nextWeekDate.getDate() + 7);

        let hasTonight = false, hasTomorrow = false, hasWeek = false, hasMonth = false;

        displayedEvents.forEach((evt) => {
            const evtDate = new Date(evt.date + "T00:00:00");

            if (evt.date === todayStr) {
                if (!hasTonight) { items.push({ type: 'header', label: 'Tonight', id: 'hdr-tonight' }); hasTonight = true; }
            } else if (evt.date === tomorrowDate.toLocaleDateString('en-CA')) {
                if (!hasTomorrow) { items.push({ type: 'header', label: 'Tomorrow', id: 'hdr-tomorrow' }); hasTomorrow = true; }
            } else if (evtDate <= nextWeekDate) {
                if (!hasWeek) { items.push({ type: 'header', label: 'This Week', id: 'hdr-week' }); hasWeek = true; }
            } else {
                if (!hasMonth) { items.push({ type: 'header', label: 'Coming Up', id: 'hdr-month' }); hasMonth = true; }
            }
            items.push({ type: 'event', data: evt, id: evt.id });
        });

        return items;
    }, [displayedEvents, todayStr]);


    // Map Markers grouped by Venue
    const mapMarkers = useMemo(() => {
        const m = new Map<string, { venue: Venue, events: Event[] }>();
        // Map ALL active events, but style differently if filtered out?
        // Or only map filtered events? 
        // User wants to see map. Usually map shows context. 
        // Let's show ALL active venues, but "Dim" the ones that are filtered out.

        activeEvents.forEach(evt => {
            let v: Venue | undefined;
            if (evt.venueId) v = venues.find(x => x.id === evt.venueId);
            else if (evt.venueName) v = venues.find(x => x.name.toLowerCase() === evt.venueName.toLowerCase());

            if (v && v.latitude && v.longitude) {
                if (!m.has(v.id)) m.set(v.id, { venue: v, events: [] });
                m.get(v.id)?.events.push(evt);
            }
        });
        return Array.from(m.values());
    }, [activeEvents, venues]);

    const handleVenueToggle = (venueId: string) => {
        setSelectedVenueIds(prev => {
            if (prev.includes(venueId)) return prev.filter(id => id !== venueId);
            return [...prev, venueId];
        });
    };

    const handleDjToggle = (djName: string) => {
        setSelectedDjNames(prev => {
            if (prev.includes(djName)) return prev.filter(n => n !== djName);
            return [...prev, djName];
        });
    };

    const handleVibeToggle = (tag: string) => {
        setSelectedVibeTags(prev => {
            if (prev.includes(tag)) return prev.filter(t => t !== tag);
            return [...prev, tag];
        });
    };

    const clearFilters = () => {
        setSelectedVenueIds([]);
        setSelectedDjNames([]);
        setSelectedVibeTags([]);
    };

    const hasFilters = selectedVenueIds.length > 0 || selectedDjNames.length > 0 || selectedVibeTags.length > 0;

    return (
        <div className="flex flex-col h-[calc(100vh-6rem)] relative overflow-hidden bg-slate-950">

            {/* 1. MAP SECTION */}
            <div className="w-full h-[35vh] min-h-[220px] relative z-0">
                <MapContainer
                    center={center}
                    zoom={zoom}
                    className="w-full h-full"
                    width="100%"
                    height="100%"
                    scrollWheelZoom={true}
                    zoomControl={false}
                    attributionControl={false}
                >
                    <TileLayer
                        url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                        attribution='&copy; CARTO'
                    />
                    <MapController selectedVenueIds={selectedVenueIds} venues={venues} />

                    {mapMarkers.map(({ venue, events }) => {
                        // Check if this venue is effectively visible in current filter
                        // It is visible if:
                        // 1. Venue Filter is Empty OR Venue is IN selectedVenueIds
                        // 2. AND (If DJ Filter is active) at least one event at this venue matches a selected DJ

                        const isVenueKeyMatch = selectedVenueIds.length === 0 || selectedVenueIds.includes(venue.id);
                        const hasMatchingDjEvents = selectedDjNames.length === 0 || events.some(e => selectedDjNames.includes(e.djName));
                        const hasMatchingVibeEvents = selectedVibeTags.length === 0 || events.some(e => e.vibeTags && e.vibeTags.some(t => selectedVibeTags.includes(t)));
                        const isHighlighted = isVenueKeyMatch && hasMatchingDjEvents && hasMatchingVibeEvents;

                        return (
                            <Marker
                                key={venue.id}
                                position={[venue.latitude!, venue.longitude!]}
                                icon={
                                    // If we have filters and this doesn't match, DIM it.
                                    hasFilters && !isHighlighted ? Icons.dimmed :
                                        // If this is specifically selected in venue filter, make it BLUE
                                        selectedVenueIds.includes(venue.id) ? Icons.selected :
                                            // Default active style
                                            Icons.active
                                }
                                eventHandlers={{
                                    click: () => {
                                        // Auto-switch to Venues tab if clicking map?
                                        setFilterMode('VENUES');
                                        handleVenueToggle(venue.id);
                                    }
                                }}
                            />
                        );
                    })}
                </MapContainer>

                {/* Map Overlay: Title Pill */}
                <div className="absolute top-3 left-3 z-[400] pointer-events-none">
                    <div className="bg-slate-900/80 backdrop-blur px-3 py-1.5 rounded-full border border-slate-700/50 shadow-lg flex items-center gap-2">
                        <div className="w-2 h-2 bg-purple-500 rounded-full animate-pulse"></div>
                        <span className="text-xs font-bold text-slate-200 uppercase tracking-widest">Nova Scotia</span>
                    </div>
                </div>
            </div>

            {/* 2. FILTER HEADER SECTION */}
            <div className="pt-4 px-4 bg-slate-950 -mt-4 rounded-t-3xl relative z-10 border-t border-slate-800 shadow-[0_-5px_20px_rgba(0,0,0,0.5)]">
                <div className="flex items-center justify-between mb-4">
                    {/* Tab Switcher */}
                    <div className="flex bg-slate-900/50 p-1 rounded-xl border border-slate-800/50">
                        <button
                            onClick={() => setFilterMode('VENUES')}
                            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold uppercase transition-all ${filterMode === 'VENUES' ? 'bg-slate-700 text-white shadow' : 'text-slate-500 hover:text-slate-300'}`}
                        >
                            <MapPin size={12} />
                            Venues
                            {selectedVenueIds.length > 0 && <span className="bg-purple-600 text-white w-4 h-4 flex items-center justify-center rounded-full text-[9px]">{selectedVenueIds.length}</span>}
                        </button>
                        <button
                            onClick={() => setFilterMode('DJS')}
                            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold uppercase transition-all ${filterMode === 'DJS' ? 'bg-slate-700 text-white shadow' : 'text-slate-500 hover:text-slate-300'}`}
                        >
                            <Users size={12} />
                            DJs
                            {selectedDjNames.length > 0 && <span className="bg-purple-600 text-white w-4 h-4 flex items-center justify-center rounded-full text-[9px]">{selectedDjNames.length}</span>}
                        </button>
                        <button
                            onClick={() => setFilterMode('VIBES')}
                            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold uppercase transition-all ${filterMode === 'VIBES' ? 'bg-slate-700 text-white shadow' : 'text-slate-500 hover:text-slate-300'}`}
                        >
                            <Sparkles size={12} />
                            Vibes
                            {selectedVibeTags.length > 0 && <span className="bg-purple-600 text-white w-4 h-4 flex items-center justify-center rounded-full text-[9px]">{selectedVibeTags.length}</span>}
                        </button>
                    </div>

                    {hasFilters && (
                        <button
                            onClick={clearFilters}
                            className="text-xs font-bold text-slate-400 hover:text-white uppercase flex items-center gap-1"
                        >
                            Clear All
                        </button>
                    )}
                </div>

                {/* 3. DYNAMIC FILTER LIST (Venues or DJs or Vibes) */}
                <div className="flex overflow-x-auto gap-3 pb-4 snap-x hide-scrollbar mb-2 min-h-[40px]">
                    {filterMode === 'VENUES' ? (
                        // VENUES LIST
                        activeVenues.length === 0 ? (
                            <p className="text-slate-500 text-xs italic w-full text-center">No active venues found.</p>
                        ) : (
                            activeVenues.map(v => {
                                const isSelected = selectedVenueIds.includes(v.id);
                                return (
                                    <button
                                        key={v.id}
                                        onClick={() => handleVenueToggle(v.id)}
                                        className={`flex-shrink-0 flex items-center gap-2 border rounded-full pl-1 pr-4 py-1 transition group snap-start
                                            ${isSelected
                                                ? 'bg-purple-900/30 border-purple-500'
                                                : 'bg-slate-900 border-slate-800 hover:border-slate-600'
                                            }`}
                                    >
                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center transition
                                            ${isSelected ? 'bg-purple-500 text-white' : 'bg-slate-800 text-slate-400 group-hover:text-white'}`}>
                                            <MapPin size={14} />
                                        </div>
                                        <span className={`text-sm font-bold whitespace-nowrap ${isSelected ? 'text-white' : 'text-slate-300 group-hover:text-white'}`}>
                                            {v.name}
                                        </span>
                                    </button>
                                );
                            })
                        )
                    ) : filterMode === 'DJS' ? (
                        // DJS LIST
                        activeDjs.length === 0 ? (
                            <p className="text-slate-500 text-xs italic w-full text-center">No active DJs found.</p>
                        ) : (
                            activeDjs.map(djName => {
                                const isSelected = selectedDjNames.includes(djName);
                                return (
                                    <button
                                        key={djName}
                                        onClick={() => handleDjToggle(djName)}
                                        className={`flex-shrink-0 flex items-center gap-2 border rounded-full pl-1 pr-4 py-1 transition group snap-start
                                            ${isSelected
                                                ? 'bg-blue-900/30 border-blue-500'
                                                : 'bg-slate-900 border-slate-800 hover:border-slate-600'
                                            }`}
                                    >
                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center transition
                                            ${isSelected ? 'bg-blue-500 text-white' : 'bg-slate-800 text-slate-400 group-hover:text-white'}`}>
                                            <HeadphonesIcon size={14} />
                                        </div>
                                        <span className={`text-sm font-bold whitespace-nowrap ${isSelected ? 'text-white' : 'text-slate-300 group-hover:text-white'}`}>
                                            {djName}
                                        </span>
                                    </button>
                                );
                            })
                        )
                    ) : (
                        // VIBES LIST
                        activeVibes.length === 0 ? (
                            <p className="text-slate-500 text-xs italic w-full text-center">No active vibes found.</p>
                        ) : (
                            activeVibes.map(tag => {
                                const isSelected = selectedVibeTags.includes(tag);
                                return (
                                    <button
                                        key={tag}
                                        onClick={() => handleVibeToggle(tag)}
                                        className={`flex-shrink-0 flex items-center gap-2 border rounded-full pl-1 pr-4 py-1 transition group snap-start
                                            ${isSelected
                                                ? 'bg-amber-900/30 border-amber-500'
                                                : 'bg-slate-900 border-slate-800 hover:border-slate-600'
                                            }`}
                                    >
                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center transition
                                            ${isSelected ? 'bg-amber-500 text-white' : 'bg-slate-800 text-slate-400 group-hover:text-white'}`}>
                                            <Sparkles size={14} />
                                        </div>
                                        <span className={`text-sm font-bold whitespace-nowrap ${isSelected ? 'text-white' : 'text-slate-300 group-hover:text-white'}`}>
                                            {tag}
                                        </span>
                                    </button>
                                );
                            })
                        )
                    )}
                </div>
            </div>

            {/* 4. SCROLLING EVENTS LIST */}
            <div className="flex-1 overflow-y-auto bg-slate-950 px-4 pb-24 relative">
                <div className="overflow-x-auto flex items-stretch gap-4 pb-4 snap-x hide-scrollbar min-h-[200px] h-full items-center">
                    {scrollItems.length === 0 ? (
                        <div className="w-full text-center py-10">
                            <div className="mx-auto w-12 h-12 bg-slate-900 rounded-full flex items-center justify-center text-slate-600 mb-2">
                                <Mic2 size={24} />
                            </div>
                            <p className="text-slate-500 text-sm italic">
                                {hasFilters ? 'No events match your filters.' : 'No upcoming events found.'}
                            </p>
                            {hasFilters && (
                                <button onClick={clearFilters} className="mt-4 text-purple-400 text-sm font-bold hover:underline">
                                    Clear Filters
                                </button>
                            )}
                        </div>
                    ) : (
                        scrollItems.map(item => {
                            if (item.type === 'header') {
                                return (
                                    <div key={item.id} className="min-w-[60px] snap-center flex flex-col justify-center items-center self-stretch relative group">
                                        <div className="h-full w-[1px] bg-slate-800 absolute left-1/2 -translate-x-1/2 group-hover:bg-slate-700 transition" />
                                        <div className="bg-slate-950 py-4 z-10">
                                            <h3 className="text-lg font-black text-slate-700 uppercase tracking-widest -rotate-90 whitespace-nowrap origin-center group-hover:text-slate-500 transition">
                                                {item.label}
                                            </h3>
                                        </div>
                                    </div>
                                );
                            } else {
                                return (
                                    <div key={item.id} className="min-w-[300px] max-w-[320px] snap-center self-center">
                                        <EventCard
                                            event={item.data}
                                            userCheckedInEventId={user?.checkedInEventId}
                                            onCardClick={(evt) => {
                                                if (evt.venueId && !selectedVenueIds.includes(evt.venueId)) {
                                                    // Add to filter if not present? Or just fly to?
                                                    // Let's just fly map logic via side effect or something, but usually card click opens details in native app. 
                                                    // Current request: user sees list.
                                                }
                                            }}
                                        />
                                    </div>
                                );
                            }
                        })
                    )}
                </div>
            </div>

        </div>
    );
};

// Helper Icon for DJ
const HeadphonesIcon = ({ size }: { size: number }) => (
    <svg
        xmlns="http://www.w3.org/2000/svg"
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
    >
        <path d="M3 14v3a2 2 0 0 0 2 2h2v-5H3z" /><path d="M17 14v5h2a2 2 0 0 0 2-2v-3h-4z" /><path d="M3 14V9a9 9 0 0 1 18 0v5" />
    </svg>
);
