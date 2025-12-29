import React, { useEffect, useState, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { useData } from '../contexts/DataContext';
import { Event, Venue } from '../types';
import { renderToString } from 'react-dom/server';
import { MapPin, Music, Mic2, Users, SlidersHorizontal, Sparkles, X, ChevronUp, ChevronDown } from 'lucide-react';
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
    dimmed: createCustomIcon('bg-slate-600'),
};

// --- MAP CONTROLLER ---
const MapController = ({ selectedVenueIds, venues }: { selectedVenueIds: string[], venues: Venue[] }) => {
    const map = useMap();
    useEffect(() => {
        if (selectedVenueIds.length === 0) return;
        if (selectedVenueIds.length === 1) {
            const v = venues.find(v => v.id === selectedVenueIds[0]);
            if (v && v.latitude && v.longitude) map.flyTo([v.latitude, v.longitude], 14.5, { duration: 1.2 });
        } else {
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

    // Filters & UI State
    const [selectedVenueIds, setSelectedVenueIds] = useState<string[]>([]);
    const [selectedDjNames, setSelectedDjNames] = useState<string[]>([]);
    const [selectedVibeTags, setSelectedVibeTags] = useState<string[]>([]);
    const [filterMode, setFilterMode] = useState<'VENUES' | 'DJS' | 'VIBES'>('VENUES');

    // UI Layout State: "isFullMap" toggles between compact map (default) and full view
    // Actually user wants "Effective Space". We will use a fixed flex approach. 
    // But maybe allow expanding/collapsing the filter row specifically.
    const [isFilterExpanded, setIsFilterExpanded] = useState(true);

    const center: [number, number] = [44.6488, -63.5752];
    const zoom = 11;

    // DATA PREP (Same logic as before)
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

    const activeDjs = useMemo(() => {
        const djs = new Set<string>();
        activeEvents.forEach(e => { if (e.djName) djs.add(e.djName); });
        return Array.from(djs).sort();
    }, [activeEvents]);

    const activeVibes = useMemo(() => {
        const vibes = new Set<string>();
        activeEvents.forEach(e => {
            e.vibeTags?.forEach(tag => vibes.add(tag));
        });
        return Array.from(vibes).sort();
    }, [activeEvents]);

    const displayedEvents = useMemo(() => {
        return activeEvents.filter(e => {
            const venueMatch = selectedVenueIds.length === 0 ||
                (e.venueId && selectedVenueIds.includes(e.venueId)) ||
                (e.venueName && venues.some(v => v.name.toLowerCase() === e.venueName.toLowerCase() && selectedVenueIds.includes(v.id)));
            const djMatch = selectedDjNames.length === 0 || (e.djName && selectedDjNames.includes(e.djName));
            const vibeMatch = selectedVibeTags.length === 0 || (e.vibeTags && e.vibeTags.some(tag => selectedVibeTags.includes(tag)));
            return venueMatch && djMatch && vibeMatch;
        });
    }, [activeEvents, selectedVenueIds, selectedDjNames, selectedVibeTags, venues]);

    const scrollItems = useMemo(() => {
        type ScrollItem = { type: 'header'; label: string; id: string } | { type: 'event'; data: Event; id: string };
        const items: ScrollItem[] = [];
        const todayDate = new Date();
        const tomorrowDate = new Date(todayDate); tomorrowDate.setDate(tomorrowDate.getDate() + 1);
        const nextWeekDate = new Date(todayDate); nextWeekDate.setDate(nextWeekDate.getDate() + 7);
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

    const mapMarkers = useMemo(() => {
        const m = new Map<string, { venue: Venue, events: Event[] }>();
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

    const clearFilters = () => {
        setSelectedVenueIds([]);
        setSelectedDjNames([]);
        setSelectedVibeTags([]);
    };

    const hasFilters = selectedVenueIds.length > 0 || selectedDjNames.length > 0 || selectedVibeTags.length > 0;
    const filterCount = selectedVenueIds.length + selectedDjNames.length + selectedVibeTags.length;

    return (
        <div className="flex flex-col h-[calc(100vh-6rem)] relative overflow-hidden bg-slate-950">

            {/* 1. MAP SECTION - Fixed 30vh, but flexible minimum */}
            <div className="flex-[0_0_30vh] min-h-[160px] relative z-0 border-b border-slate-800">
                <MapContainer
                    center={center}
                    zoom={zoom}
                    className="w-full h-full"
                    zoomControl={false}
                    attributionControl={false}
                >
                    <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" />
                    <MapController selectedVenueIds={selectedVenueIds} venues={venues} />
                    {mapMarkers.map(({ venue, events }) => {
                        const isVenueKeyMatch = selectedVenueIds.length === 0 || selectedVenueIds.includes(venue.id);
                        const hasMatchingDjEvents = selectedDjNames.length === 0 || events.some(e => selectedDjNames.includes(e.djName));
                        const hasMatchingVibeEvents = selectedVibeTags.length === 0 || events.some(e => e.vibeTags && e.vibeTags.some(t => selectedVibeTags.includes(t)));
                        const isHighlighted = isVenueKeyMatch && hasMatchingDjEvents && hasMatchingVibeEvents;
                        return (
                            <Marker
                                key={venue.id}
                                position={[venue.latitude!, venue.longitude!]}
                                icon={hasFilters && !isHighlighted ? Icons.dimmed : selectedVenueIds.includes(venue.id) ? Icons.selected : Icons.active}
                                eventHandlers={{
                                    click: () => {
                                        setFilterMode('VENUES');
                                        setSelectedVenueIds(prev => prev.includes(venue.id) ? prev.filter(x => x !== venue.id) : [...prev, venue.id]);
                                    }
                                }}
                            />
                        );
                    })}
                </MapContainer>
                {/* Overlay: Minimal Title */}
                <div className="absolute top-2 left-2 z-[400] bg-slate-900/80 backdrop-blur px-2 py-1 rounded-full border border-slate-700/50 flex items-center gap-2 pointer-events-none">
                    <span className="w-1.5 h-1.5 bg-purple-500 rounded-full animate-pulse"></span>
                    <span className="text-[10px] font-bold text-slate-300 uppercase tracking-widest leading-none">Nova Scotia</span>
                </div>
            </div>

            {/* 2. COMPACT FILTER BAR */}
            <div className="flex-none bg-slate-950 border-b border-slate-800 shadow-xl z-20">
                {/* Top Row: Search/Mode Toggles + Expand Button */}
                <div className="flex items-center justify-between p-2">
                    {/* Mode Tabs */}
                    <div className="flex gap-1 bg-slate-900/50 p-0.5 rounded-lg border border-slate-800">
                        {(['VENUES', 'DJS', 'VIBES'] as const).map(mode => (
                            <button
                                key={mode}
                                onClick={() => { setFilterMode(mode); setIsFilterExpanded(true); }}
                                className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase flex items-center gap-1 transition-all
                                    ${filterMode === mode
                                        ? 'bg-purple-600 text-white shadow-sm'
                                        : 'text-slate-500 hover:text-slate-300'}`}
                            >
                                {mode === 'VENUES' && <MapPin size={10} />}
                                {mode === 'DJS' && <Users size={10} />}
                                {mode === 'VIBES' && <Sparkles size={10} />}
                                {mode}
                            </button>
                        ))}
                    </div>

                    {/* Right Side: Clear + Collapse */}
                    <div className="flex items-center gap-2">
                        {hasFilters && (
                            <button onClick={clearFilters} className="text-[10px] font-bold text-red-400 hover:text-red-300 uppercase bg-slate-900 px-2 py-1 rounded border border-red-900/30">
                                Clear ({filterCount})
                            </button>
                        )}
                        <button
                            onClick={() => setIsFilterExpanded(!isFilterExpanded)}
                            className="w-6 h-6 flex items-center justify-center text-slate-500 hover:text-white bg-slate-900 rounded border border-slate-800"
                        >
                            {isFilterExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                        </button>
                    </div>
                </div>

                {/* Expanded Filter Area (Chips) */}
                {isFilterExpanded && (
                    <div className="w-full overflow-x-auto flex gap-2 px-2 pb-2 snap-x hide-scrollbar">
                        {filterMode === 'VENUES' && activeVenues.map(v => (
                            <button
                                key={v.id}
                                onClick={() => setSelectedVenueIds(p => p.includes(v.id) ? p.filter(x => x !== v.id) : [...p, v.id])}
                                className={`flex-shrink-0 text-xs font-bold px-3 py-1 rounded-full border transition whitespace-nowrap flex items-center gap-1.5 snap-start
                                    ${selectedVenueIds.includes(v.id)
                                        ? 'bg-purple-900/40 border-purple-500 text-white'
                                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-600'}`}
                            >
                                <MapPin size={10} />
                                {v.name}
                            </button>
                        ))}
                        {filterMode === 'DJS' && activeDjs.map(dj => (
                            <button
                                key={dj}
                                onClick={() => setSelectedDjNames(p => p.includes(dj) ? p.filter(x => x !== dj) : [...p, dj])}
                                className={`flex-shrink-0 text-xs font-bold px-3 py-1 rounded-full border transition whitespace-nowrap flex items-center gap-1.5 snap-start
                                    ${selectedDjNames.includes(dj)
                                        ? 'bg-blue-900/40 border-blue-500 text-white'
                                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-600'}`}
                            >
                                <Users size={10} />
                                {dj}
                            </button>
                        ))}
                        {filterMode === 'VIBES' && activeVibes.map(tag => (
                            <button
                                key={tag}
                                onClick={() => setSelectedVibeTags(p => p.includes(tag) ? p.filter(x => x !== tag) : [...p, tag])}
                                className={`flex-shrink-0 text-xs font-bold px-3 py-1 rounded-full border transition whitespace-nowrap flex items-center gap-1.5 snap-start
                                    ${selectedVibeTags.includes(tag)
                                        ? 'bg-amber-900/40 border-amber-500 text-white'
                                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-600'}`}
                            >
                                <Sparkles size={10} />
                                {tag}
                            </button>
                        ))}
                        {/* Empty States */}
                        {filterMode === 'VENUES' && activeVenues.length === 0 && <span className="text-xs text-slate-600 px-2 italic">None found</span>}
                        {filterMode === 'DJS' && activeDjs.length === 0 && <span className="text-xs text-slate-600 px-2 italic">None found</span>}
                    </div>
                )}
            </div>

            {/* 3. EVENT WHEEL (Flexible Remaining Space) */}
            <div className="flex-1 min-h-0 bg-slate-950 px-2 relative pt-2">
                {/* Internal scroll container using full height of flex item */}
                <div className="h-full w-full overflow-y-hidden overflow-x-auto flex items-center gap-3 snap-x hide-scrollbar pb-2">
                    {scrollItems.length === 0 ? (
                        <div className="w-full flex flex-col items-center justify-center opacity-50">
                            <Mic2 size={32} className="text-slate-600 mb-2" />
                            <p className="text-sm font-bold text-slate-500">No Events Found</p>
                        </div>
                    ) : (
                        scrollItems.map(item => {
                            if (item.type === 'header') {
                                return (
                                    <div key={item.id} className="min-w-[40px] h-[80%] snap-center flex flex-col justify-center items-center relative group">
                                        <div className="h-full w-[1px] bg-slate-800 absolute left-1/2 -translate-x-1/2" />
                                        <div className="bg-slate-950 py-2 z-10 rotate-180" style={{ writingMode: 'vertical-rl' }}>
                                            <h3 className="text-sm font-black text-slate-700 uppercase tracking-widest whitespace-nowrap">
                                                {item.label}
                                            </h3>
                                        </div>
                                    </div>
                                );
                            } else {
                                return (
                                    <div key={item.id} className="min-w-[280px] max-w-[300px] snap-center">
                                        <EventCard
                                            event={item.data}
                                            userCheckedInEventId={user?.checkedInEventId}
                                            onCardClick={() => {
                                                if (item.data.venueId) setSelectedVenueIds([item.data.venueId]);
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
