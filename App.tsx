import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './src/contexts/AuthContext';
import { DataProvider } from './src/contexts/DataContext';
import { AuthPage } from './src/pages/AuthPage';
import { FeedPage } from './src/pages/FeedPage';
import { MapHomePage } from './src/pages/MapHomePage';
import { EventDetailsPage } from './src/pages/EventDetailsPage';
import { EventQueuePage } from './src/pages/EventQueuePage';
import { EventSearchPage } from './src/pages/EventSearchPage';
import { AdminDashboardPage } from './src/pages/AdminDashboardPage';
import { DjHubPage } from './src/pages/DjHubPage';
import { EventSeriesPage } from './src/pages/EventSeriesPage';
import { BottomNav } from './src/components/BottomNav';
import { GlobalHeader } from './src/components/GlobalHeader';
import { ProfilePage } from './src/pages/ProfilePage';
import { CrateModePage } from './src/pages/CrateModePage';
import { ExplorePage } from './src/pages/ExplorePage';
import { VenuePage } from './src/pages/VenuePage';


// ... (other imports same)

import { isAdmin } from './src/utils/adminUtils';

/*
    Route Guard Component
*/
const ProtectedRoute = ({ children, allowedRoles, allowGuest }: { children: JSX.Element, allowedRoles?: string[], allowGuest?: boolean }) => {
    const { user, loading, loginAnonymously } = useAuth();

    // Auto-Login Guest if permitted
    React.useEffect(() => {
        if (!loading && !user && allowGuest) {
            loginAnonymously();
        }
    }, [user, loading, allowGuest]);

    if (loading) return <div className="p-10 text-white">Loading...</div>;

    // If waiting for guest login
    if (!user && allowGuest) {
        return <div className="p-10 text-white flex flex-col items-center justify-center">
            <div className="animate-spin h-8 w-8 border-4 border-purple-500 rounded-full border-t-transparent mb-4"></div>
            <p>Entering as Guest...</p>
        </div>;
    }

    if (!user) return <Navigate to="/login" replace />;

    if (allowedRoles) {
        const hasPermission = allowedRoles.some(role => {
            if (role === 'ADMIN') return isAdmin(user);
            return user.role === role;
        });

        if (!hasPermission) return <Navigate to="/" replace />;
    }

    return children;
};
// ... (ProtectedRoute same)

/*
    App Layout Wrapper (Handles Conditional Layouts)
*/
import { useLocation } from 'react-router-dom';

const AppLayout = () => {
    const location = useLocation();
    const isCrateMode = location.pathname.startsWith('/crate');

    // If Crate Mode, just render content without container constraints or headers
    if (isCrateMode) {
        return (
            <div className="w-screen h-screen bg-transparent">
                <Routes>
                    <Route path="/crate/:id" element={
                        <ProtectedRoute allowedRoles={['DJ', 'ADMIN']}>
                            <CrateModePage />
                        </ProtectedRoute>
                    } />
                </Routes>
            </div>
        );
    }

    // Standard App Layout
    return (
        <div
            className="max-w-md mx-auto min-h-screen bg-slate-950 text-white shadow-2xl relative pb-24 pt-16"
        >
            <GlobalHeader />
            <Routes>
                <Route path="/login" element={<AuthPage />} />

                <Route path="/" element={
                    <ProtectedRoute>
                        <MapHomePage />
                    </ProtectedRoute>
                } />

                <Route path="/explore" element={
                    <ProtectedRoute>
                        <ExplorePage />
                    </ProtectedRoute>
                } />

                <Route path="/event/:id" element={
                    <ProtectedRoute allowGuest>
                        <EventDetailsPage />
                    </ProtectedRoute>
                } />

                <Route path="/venue/:id" element={
                    <ProtectedRoute>
                        <VenuePage />
                    </ProtectedRoute>
                } />

                <Route path="/event/:id/queue" element={
                    <ProtectedRoute allowGuest>
                        <EventQueuePage />
                    </ProtectedRoute>
                } />

                <Route path="/event/:id/search" element={
                    <ProtectedRoute allowGuest>
                        <EventSearchPage />
                    </ProtectedRoute>
                } />

                <Route path="/admin" element={
                    <ProtectedRoute allowedRoles={['ADMIN']}>
                        <AdminDashboardPage />
                    </ProtectedRoute>
                } />

                <Route path="/dj" element={
                    <ProtectedRoute allowedRoles={['DJ', 'ADMIN']}>
                        <DjHubPage />
                    </ProtectedRoute>
                } />

                <Route path="/series/:id" element={
                    <ProtectedRoute allowedRoles={['DJ', 'ADMIN']}>
                        <EventSeriesPage />
                    </ProtectedRoute>
                } />

                <Route path="/profile" element={
                    <ProtectedRoute>
                        <ProfilePage />
                    </ProtectedRoute>
                } />

                {/* Fallback */}
                <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>

            <BottomNav />
        </div>
    );
};

export default function App() {
    return (
        <AuthProvider>
            <DataProvider>
                <BrowserRouter>
                    <AppLayout />
                </BrowserRouter>
            </DataProvider>
        </AuthProvider>
    );
}
