import React from 'react';
import { X, Info, CheckCircle2 } from 'lucide-react';

interface TutorialPopupProps {
    isOpen: boolean;
    onClose: () => void;
}

export const TutorialPopup: React.FC<TutorialPopupProps> = ({ isOpen, onClose }) => {

    const handleDismiss = () => {
        // We still set this here so that if they close it, it remembers.
        // But the parent controls visibility.
        localStorage.setItem('hasSeenTutorialV1', 'true');
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="bg-slate-900 border border-purple-500/30 rounded-2xl w-full max-w-lg shadow-2xl relative flex flex-col overflow-hidden animate-in zoom-in-95 duration-300">

                {/* Decorative gradients */}
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-purple-500 via-pink-500 to-blue-500"></div>
                <div className="absolute -top-10 -right-10 w-32 h-32 bg-purple-600/20 rounded-full blur-3xl"></div>
                <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-blue-600/20 rounded-full blur-3xl"></div>

                {/* Close Button */}
                <button
                    onClick={handleDismiss}
                    className="absolute top-4 right-4 text-slate-400 hover:text-white transition z-10 p-1 hover:bg-slate-800 rounded-full"
                >
                    <X size={20} />
                </button>

                <div className="p-6 md:p-8 flex flex-col h-full relative z-0 max-h-[85vh]">

                    {/* Header */}
                    <div className="flex items-center gap-3 mb-6">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center shadow-lg shadow-purple-900/30">
                            <Info className="text-white" size={20} />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-white leading-none mb-1">Welcome to PassTheAux</h2>
                            <p className="text-xs text-slate-400 font-medium uppercase tracking-wider">Your Live Music Companion</p>
                        </div>
                    </div>

                    {/* Content */}
                    <div className="flex-1 overflow-y-auto hide-scrollbar">
                        <p className="text-slate-300 text-sm leading-relaxed mb-6">
                            PassTheAux connects you directly with the DJ in real-time. Discover local events, interact with performers, and earn the respect of the dancefloor and the DJ.
                            Think of it as a <span className="text-purple-400 font-bold">digital bridge</span> between the dance floor and the DJ booth.
                        </p>

                        <div className="space-y-4">
                            <h3 className="text-white font-bold text-sm uppercase tracking-wide border-b border-slate-800 pb-2 mb-3">
                                How to Get Started
                            </h3>

                            <div className="flex gap-3">
                                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-slate-800 text-purple-400 font-bold text-xs flex items-center justify-center border border-slate-700">1</div>
                                <div>
                                    <h4 className="text-white font-bold text-sm">Find Your Event</h4>
                                    <p className="text-slate-400 text-xs mt-0.5 leading-relaxed">Browse nearby events using the map or list view.</p>
                                </div>
                            </div>

                            <div className="flex gap-3">
                                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-slate-800 text-purple-400 font-bold text-xs flex items-center justify-center border border-slate-700">2</div>
                                <div>
                                    <h4 className="text-white font-bold text-sm">Check-In at the Venue</h4>
                                    <p className="text-slate-400 text-xs mt-0.5 leading-relaxed">Some events will require your geolocation before allowing you to check-in to the event. Once within the 2km range, tap "Check-In" on the Event Details page or scan the venue or event QR code.</p>
                                </div>
                            </div>

                            <div className="flex gap-3">
                                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-slate-800 text-purple-400 font-bold text-xs flex items-center justify-center border border-slate-700">3</div>
                                <div>
                                    <h4 className="text-white font-bold text-sm">Request & Submit</h4>
                                    <p className="text-slate-400 text-xs mt-0.5 leading-relaxed">Search Spotify or the DJ's Music Library (when made available) for tracks, Submit requests, and Upvote others to help their tunes climb the leaderboard.</p>
                                </div>
                            </div>

                            <div className="flex gap-3">
                                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-slate-800 text-purple-400 font-bold text-xs flex items-center justify-center border border-slate-700">4</div>
                                <div>
                                    <h4 className="text-white font-bold text-sm">Vote & Await your DJ's Response</h4>
                                    <p className="text-slate-400 text-xs mt-0.5 leading-relaxed">Keep in mind that you're searching through a virtually endless Library of Music. Not every DJ has access to the songs you may find or request. If the song isn't available, try looking for something closer to the vibe or more popular.</p>
                                </div>
                            </div>
                        </div>

                        <div className="mt-6 bg-slate-800/50 rounded-lg p-3 border border-slate-700">
                            <p className="text-xs text-slate-400 italic">
                                <span className="text-amber-400 font-bold not-italic">Pro-Tip:</span> Keep in mind that DJs are live-mixing professionals who manage the night's flow, so even approved songs may take some time to play. You will receive real-time notifications as soon as your request is approved or denied.
                            </p>
                        </div>
                    </div>

                    {/* Footer Action */}
                    <div className="mt-6 pt-4 border-t border-slate-800 flex justify-end">
                        <button
                            onClick={handleDismiss}
                            className="bg-purple-600 hover:bg-purple-500 text-white px-6 py-2 rounded-lg font-bold text-sm transition shadow-lg shadow-purple-900/20 flex items-center gap-2"
                        >
                            Got it, Let's Party <CheckCircle2 size={16} />
                        </button>
                    </div>

                </div>
            </div>
        </div>
    );
};
