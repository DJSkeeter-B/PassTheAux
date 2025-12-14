import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Home, Music, User } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export const BottomNav: React.FC = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { user } = useAuth();

    if (!user || location.pathname === '/login') return null;

    const isActive = (path: string) => {
        if (path === '/') return location.pathname === '/';
        if (path === '/profile') return location.pathname === '/profile';
        // For queue, checking if we are in a queue page
        return location.pathname.includes('/queue');
    };

    const handleQueueClick = () => {
        if (user.checkedInEventId) {
            navigate(`/event/${user.checkedInEventId}/queue`);
        } else {
            // Simple feedback for now. 
            // In a real app we might use a toast, but alert is safe standard behavior for "blocked" action feedback if no UI lib.
            // Alternatively, we could just shake the icon or do nothing.
            // Let's do a simple alert for clarity as per plan "toast message" substitute.
            alert("You must be checked into an event to view the Queue.");
        }
    };

    return (
        <div className="fixed bottom-0 left-0 right-0 bg-slate-950 border-t border-slate-800 p-2 pb-6 z-50 max-w-md mx-auto">
            <div className="flex justify-around items-center">
                {/* Home / Feed */}
                <button
                    onClick={() => navigate('/')}
                    className={`flex flex-col items-center gap-1 p-2 rounded-lg transition min-w-[60px] ${isActive('/') ? 'text-white' : 'text-slate-500 hover:text-slate-300'}`}
                >
                    <Home size={24} strokeWidth={isActive('/') ? 2.5 : 2} />
                    <span className={`text-[10px] font-medium ${isActive('/') ? 'text-white' : 'text-slate-500'}`}>Events</span>
                </button>

                {/* Queue - Only active if checked in, but always visible */}
                <button
                    onClick={handleQueueClick}
                    className={`flex flex-col items-center gap-1 p-2 rounded-lg transition min-w-[60px] ${isActive('/event/queue') ? 'text-green-400' : 'text-slate-500 hover:text-slate-300'} ${!user.checkedInEventId ? 'opacity-70' : ''}`}
                >
                    <Music size={24} strokeWidth={isActive('/event/queue') ? 2.5 : 2} />
                    <span className={`text-[10px] font-medium ${isActive('/event/queue') ? 'text-green-400' : 'text-slate-500'}`}>Queue</span>
                </button>

                {/* Profile (New) */}
                <button
                    onClick={() => navigate('/profile')}
                    className={`flex flex-col items-center gap-1 p-2 rounded-lg transition min-w-[60px] ${isActive('/profile') ? 'text-purple-400' : 'text-slate-500 hover:text-slate-300'}`}
                >
                    <User size={24} strokeWidth={isActive('/profile') ? 2.5 : 2} />
                    <span className={`text-[10px] font-medium ${isActive('/profile') ? 'text-purple-400' : 'text-slate-500'}`}>Profile</span>
                </button>
            </div>
        </div>
    );
};
