import React from 'react';
import { Song } from '../../types';
import { ThumbsUp, ThumbsDown } from 'lucide-react';

interface KioskQueueListProps {
    songs: Song[];
}

export const KioskQueueList: React.FC<KioskQueueListProps> = ({ songs }) => {
    // Show top 3 after the "Now Playing" song (which is usually index 0)
    // So if the parent passes the full sorted queue, we might want to slice it here or let parent slice.
    // Let's assume parent passes "Next" songs.

    if (songs.length === 0) {
        return null;
    }

    return (
        <div className="space-y-6">
            {songs.map((song, index) => (
                <div
                    key={song.id}
                    className="flex items-center gap-6 p-6 bg-white/5 backdrop-blur-md rounded-2xl border border-white/5 shadow-lg transform translate-y-0 hover:scale-[1.02] transition-all duration-300"
                >
                    <div className="relative shrink-0">
                        <div className="w-24 h-24 bg-slate-800 rounded-xl overflow-hidden shadow-lg">
                            <img src={song.coverUrl} alt={song.title} className="w-full h-full object-cover" />
                        </div>
                        <div className="absolute -top-3 -left-3 w-10 h-10 bg-indigo-600 rounded-full flex items-center justify-center text-xl font-bold border-4 border-slate-900">
                            {index + 2}
                        </div>
                    </div>

                    <div className="flex-1 min-w-0">
                        <h3 className="text-3xl font-bold text-white truncate leading-tight mb-1">{song.title}</h3>
                        <p className="text-2xl text-slate-400 truncate">{song.artist}</p>
                    </div>

                    <div className="flex flex-col items-end px-4 gap-2">
                        <div className="flex items-center gap-4 bg-slate-900/40 px-3 py-1.5 rounded-lg border border-white/5">
                            {/* Upvotes */}
                            <div className="flex items-center gap-1.5 text-green-400">
                                <ThumbsUp size={16} fill="currentColor" />
                                <span className="text-sm font-bold">{song.upvotedUserIds?.length || 0}</span>
                            </div>

                            {/* Net Score */}
                            <div className={`text-lg font-black ${song.votes > 0 ? 'text-white' : 'text-slate-400'}`}>
                                {song.votes > 0 ? '+' : ''}{song.votes}
                            </div>

                            {/* Downvotes */}
                            <div className="flex items-center gap-1.5 text-red-400">
                                <span className="text-sm font-bold">{song.downvotedUserIds?.length || 0}</span>
                                <ThumbsDown size={16} fill="currentColor" />
                            </div>
                        </div>

                        <div className="text-right">
                            <p className="text-xs text-slate-500 uppercase tracking-wider font-bold mb-0.5">Requested by</p>
                            <p className="text-base text-indigo-300 font-bold max-w-[150px] truncate">{song.requesterName || 'Guest'}</p>
                            {song.timestamp && (
                                <p className="text-xs text-slate-500 mt-0.5 font-medium bg-slate-800/50 px-2 py-0.5 rounded inline-block">
                                    {new Date(song.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </p>
                            )}
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
};
