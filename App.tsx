import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './src/contexts/AuthContext';
import { DataProvider } from './src/contexts/DataContext';
import { AuthPage } from './src/pages/AuthPage';
import { FeedPage } from './src/pages/FeedPage';
import { EventDetailsPage } from './src/pages/EventDetailsPage';
import { EventQueuePage } from './src/pages/EventQueuePage';
import { EventSearchPage } from './src/pages/EventSearchPage';
import { AdminDashboardPage } from './src/pages/AdminDashboardPage';
import { DjHubPage } from './src/pages/DjHubPage';
import { BottomNav } from './src/components/BottomNav';
import { GlobalHeader } from './src/components/GlobalHeader';
import { ProfilePage } from './src/pages/ProfilePage';
import { CrateModePage } from './src/pages/CrateModePage';

// ... (other imports same)

/*
    Route Guard Component
*/
const ProtectedRoute = ({ children, allowedRoles }: { children: JSX.Element, allowedRoles?: string[] }) => {
    const { user, loading } = useAuth();
    if (loading) return <div className="p-10 text-white">Loading...</div>;
    if (!user) return <Navigate to="/login" replace />;
    if (allowedRoles && !allowedRoles.includes(user.role)) {
        return <Navigate to="/" replace />;
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
                        <FeedPage />
                    </ProtectedRoute>
                } />

                <Route path="/event/:id" element={
                    <ProtectedRoute>
                        <EventDetailsPage />
                    </ProtectedRoute>
                } />

                <Route path="/event/:id/queue" element={
                    <ProtectedRoute>
                        <EventQueuePage />
                    </ProtectedRoute>
                } />

                <Route path="/event/:id/search" element={
                    <ProtectedRoute>
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
