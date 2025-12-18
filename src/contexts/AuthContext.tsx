
import React, { createContext, useContext, useEffect, useState } from 'react';
import { UserProfile } from '../types';
import { subscribeToAuthChanges, logout } from '../services/firebase';

interface AuthContextType {
    user: UserProfile | null;
    loading: boolean;
    logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
    user: null,
    loading: true,
    logout: async () => { },
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    console.log("DEBUG: AuthProvider rendering");
    const [user, setUser] = useState<UserProfile | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let mounted = true;
        // Safety timeout: If Firebase doesn't respond in 8s, stop loading
        const timeoutId = setTimeout(() => {
            if (mounted && loading) {
                console.warn("Auth subscription timed out - forcing loading completion");
                setLoading(false);
            }
        }, 8000);

        const unsubscribe = subscribeToAuthChanges((u) => {
            if (mounted) {
                setUser(u);
                setLoading(false);
            }
        });

        return () => {
            mounted = false;
            clearTimeout(timeoutId);
            unsubscribe();
        };
    }, []);

    const handleLogout = async () => {
        await logout();
    };

    return (
        <AuthContext.Provider value={{ user, loading, logout: handleLogout }}>
            {children}
        </AuthContext.Provider>
    );
};
