
import React, { createContext, useContext, useEffect, useState } from 'react';
import { Event, Venue, AppConfig } from '../types';
import { subscribeToEvents, subscribeToVenues, subscribeToGlobalConfig, isSpotifyTokenNearExpiry, triggerRefreshSpotifyToken } from '../services/firebase';
import { useAuth } from './AuthContext';

interface DataContextType {
    events: Event[];
    venues: Venue[];
    config: AppConfig;
    loading: boolean;
}

const DataContext = createContext<DataContextType>({
    events: [],
    venues: [],
    config: {},
    loading: true,
});

export const useData = () => useContext(DataContext);

export const DataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { user } = useAuth();
    const [events, setEvents] = useState<Event[]>([]);
    const [venues, setVenues] = useState<Venue[]>([]);
    const [config, setConfig] = useState<AppConfig>({});

    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let mounted = true;

        // Safety timeout for data loading (10 seconds)
        const timeoutId = setTimeout(() => {
            if (mounted && loading) {
                console.warn("Data subscription timed out - forcing loading completion");
                setLoading(false);
            }
        }, 10000);

        const unsubEvents = subscribeToEvents((d) => { if (mounted) setEvents(d); });
        const unsubVenues = subscribeToVenues((d) => { if (mounted) setVenues(d); });
        const unsubConfig = subscribeToGlobalConfig((d) => {
            if (mounted) {
                setConfig(d);
                // We consider "loaded" once config arrives, or at least one piece of data
                setLoading(false);
            }
        });

        return () => {
            mounted = false;
            clearTimeout(timeoutId);
            unsubEvents();
            unsubVenues();
            unsubConfig();
        };
    }, []);

    // Auto-refresh Spotify token
    useEffect(() => {
        if (user?.role === 'ADMIN' && config && isSpotifyTokenNearExpiry(config)) {
            triggerRefreshSpotifyToken()
                .then((result) => {
                    if (result.ok) console.log('✓ Spotify token refreshed');
                    else console.warn('✗ Token refresh failed', result.message);
                })
                .catch(console.error);
        }
    }, [user, config]);

    return (
        <DataContext.Provider value={{ events, venues, config, loading }}>
            {children}
        </DataContext.Provider>
    );
};
