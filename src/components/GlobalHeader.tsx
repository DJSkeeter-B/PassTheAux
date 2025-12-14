import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Music } from 'lucide-react';

export const GlobalHeader: React.FC = () => {
    const navigate = useNavigate();

    return (
        <div className="fixed top-0 left-0 right-0 bg-slate-950/80 backdrop-blur-md border-b border-slate-800 z-50 px-4 py-3 max-w-md mx-auto flex items-center justify-between">
            <button
                onClick={() => navigate('/')}
                className="flex items-center gap-2 group"
            >
                <div className="bg-gradient-to-br from-purple-600 to-blue-600 p-1.5 rounded-lg group-hover:scale-105 transition-transform shadow-lg shadow-purple-900/20">
                    <Music size={20} className="text-white" strokeWidth={2.5} />
                </div>
                <span className="font-bold text-lg bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400 group-hover:to-white transition-all">
                    PassTheAux
                </span>
            </button>
        </div>
    );
};
