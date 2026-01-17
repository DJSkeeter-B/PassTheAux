import React from 'react';
import { Song, SongStatus } from '../types';
import { ThumbsUp, ThumbsDown, Check, X, Clock, Play, Sparkles, AlertCircle } from 'lucide-react';
import { ScrollingText } from './ScrollingText';

interface SongCardProps {
  song: Song;
  isDjMode: boolean;
  isAdmin?: boolean;
  currentUserId?: string;
  onVote?: (id: string, direction: 'up' | 'down') => void;
  onApprove?: (id: string) => void;
  onReject?: (id: string) => void;
  onUnavailable?: (id: string) => void;
  onMarkPlayed?: (id: string) => void;
  onReset?: (id: string) => void;
  onInspectUser?: (name: string) => void;
  isMenuOpen?: boolean;
  onToggleMenu?: () => void;
}

export const SongCard: React.FC<SongCardProps> = (props) => {
  const {
    song,
    isDjMode,
    isAdmin,
    currentUserId,
    onVote,
    onApprove,
    onReject,
    onUnavailable,
    onMarkPlayed,
    onReset,
    isMenuOpen,
    onToggleMenu,
  } = props;
  const isPending = song.status === SongStatus.PENDING;
  const isApproved = song.status === SongStatus.APPROVED;
  const showModeration = isDjMode || isAdmin;
  const isUpvoted = currentUserId && song.upvotedUserIds?.includes(currentUserId);
  const isDownvoted = currentUserId && song.downvotedUserIds?.includes(currentUserId);
  const isOwner = currentUserId && song.requesterId === currentUserId;
  const canVote = !isOwner && !!currentUserId;

  const isRejected = song.status === SongStatus.REJECTED;
  const isUnavailable = song.status === SongStatus.UNAVAILABLE;

  // Hybrid State: Use props if controlled, otherwise local state
  const [internalMenuOpen, setInternalMenuOpen] = React.useState(false);
  const isControlled = onToggleMenu !== undefined;
  const showMenu = isControlled ? (isMenuOpen || false) : internalMenuOpen;

  const handleToggle = () => {
    if (isControlled) {
      onToggleMenu?.();
    } else {
      setInternalMenuOpen(!showMenu);
    }
  };

  const closeMenu = () => {
    if (isControlled) {
      if (isMenuOpen) onToggleMenu?.();
    } else {
      setInternalMenuOpen(false);
    }
  };

  // Close menu when clicking outside
  React.useEffect(() => {
    if (!showMenu) return;

    const handleClickOutside = () => closeMenu();
    // Use setTimeout to avoid immediate trigger from the opening click
    const timer = setTimeout(() => {
      document.addEventListener('click', handleClickOutside);
    }, 0);

    return () => {
      clearTimeout(timer);
      document.removeEventListener('click', handleClickOutside);
    };
  }, [showMenu, isControlled, isMenuOpen, onToggleMenu]); // Dependencies for effect

  const handleContainerClick = (e: React.MouseEvent) => {
    if (isDjMode && !isPending) {
      e.stopPropagation();
      handleToggle();
    }
  };

  // Compact View for Rejected / Unavailable Songs
  if (isRejected || isUnavailable) {
    const isUnavail = song.status === SongStatus.UNAVAILABLE;
    const colorClass = isUnavail ? 'amber' : 'red';
    const LabelIcon = isUnavail ? AlertCircle : X;
    const labelText = isUnavail ? 'Unavailable' : 'Denied';

    return (
      <div
        onClick={handleContainerClick}
        className={`relative overflow-hidden rounded-lg border border-${colorClass}-900/30 bg-${colorClass}-950/10 p-2 flex items-center gap-3 opacity-70 transition-all ${isDjMode ? 'cursor-pointer hover:opacity-100 hover:bg-' + colorClass + '-900/20' : ''}`}
      >
        <div className="h-10 w-10 flex-shrink-0 rounded overflow-hidden bg-slate-800 grayscale">
          <img src={song.coverUrl} alt={song.album} className="h-full w-full object-cover opacity-50" loading="lazy" />
        </div>
        <div className="flex-1 min-w-0 flex items-center justify-between gap-2">
          <div className="min-w-0">
            <h3 className={`font-semibold text-${colorClass}-200/50 text-sm truncate line-through decoration-${colorClass}-500/30`}>{song.title}</h3>
            <p className="text-slate-600 text-xs truncate">{song.artist}</p>
          </div>
          <div className={`px-2 py-0.5 bg-${colorClass}-900/20 rounded border border-${colorClass}-900/30 flex items-center gap-1`}>
            <LabelIcon size={10} className={`text-${colorClass}-500/50`} />
            <span className={`text-[10px] text-${colorClass}-500/50 font-bold uppercase tracking-wider`}>{labelText}</span>
          </div>
        </div>

        {/* DJ MENU OVERLAY */}
        {showMenu && isDjMode && (
          <div className="absolute inset-x-0 bottom-0 top-0 bg-slate-900/95 flex items-center justify-end px-4 gap-2 animate-in fade-in duration-200 z-10" onClick={(e) => { e.stopPropagation(); handleToggle(); }}>
            <span className="text-xs text-slate-400 mr-auto font-medium">Change Decision:</span>
            <button onClick={(e) => { e.stopPropagation(); props.onReset?.(song.id); }} className="px-3 py-1.5 rounded-full bg-slate-800 text-slate-300 text-xs font-bold hover:bg-slate-700">Undo</button>
            <button onClick={(e) => { e.stopPropagation(); onApprove?.(song.id); }} className="px-3 py-1.5 rounded-full bg-green-600 text-white text-xs font-bold hover:bg-green-500">Approve</button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      onClick={handleContainerClick}
      className={`relative overflow-hidden rounded-xl border p-3 flex items-center gap-4 transition-all
      ${song.status === SongStatus.PLAYED ? 'bg-slate-800/50 border-slate-700 opacity-60' :
          'bg-slate-800 border-slate-700 hover:border-purple-500/50'}
      ${isPending && isDjMode ? 'border-yellow-500/50 bg-yellow-900/10' : ''}
      ${isApproved ? 'border-green-500/50 shadow-sm shadow-green-900/20' : ''}
      ${isDjMode && !isPending ? 'cursor-pointer' : ''}
    `}>
      {/* DJ MENU OVERLAY - FULL CARD COVER */}
      {showMenu && isDjMode && !isPending && (
        <div className="absolute inset-0 bg-slate-900/95 flex items-center justify-center gap-3 animate-in fade-in duration-200 z-50 px-4" onClick={(e) => { e.stopPropagation(); handleToggle(); }}>
          <button onClick={(e) => { e.stopPropagation(); handleToggle(); }} className="absolute top-2 right-2 p-1 text-slate-500 hover:text-white"><X size={16} /></button>

          {isApproved && (
            <>
              <button onClick={(e) => { e.stopPropagation(); onMarkPlayed?.(song.id); }} className="flex flex-col items-center gap-1 text-purple-400 hover:scale-110 transition"><div className="p-3 bg-purple-900/30 rounded-full"><Play size={24} /></div><span className="text-[10px] font-bold uppercase">Played</span></button>
              <div className="w-px h-8 bg-slate-700 mx-2"></div>
              <button onClick={(e) => { e.stopPropagation(); props.onReset?.(song.id); }} className="flex flex-col items-center gap-1 text-slate-400 hover:text-white hover:scale-110 transition"><div className="p-3 bg-slate-800 rounded-full"><Clock size={20} /></div><span className="text-[10px] font-bold uppercase">Reset</span></button>
              <button onClick={(e) => { e.stopPropagation(); onReject?.(song.id); }} className="flex flex-col items-center gap-1 text-red-400 hover:scale-110 transition"><div className="p-3 bg-red-900/30 rounded-full"><X size={20} /></div><span className="text-[10px] font-bold uppercase">Deny</span></button>
            </>
          )}

          {song.status === SongStatus.PLAYED && (
            <>
              <span className="text-green-500 font-bold text-sm mr-2 flex items-center gap-1"><Check size={16} /> Played</span>
              <button onClick={(e) => { e.stopPropagation(); props.onReset?.(song.id); }} className="px-4 py-2 bg-slate-800 rounded-full text-xs font-bold hover:bg-slate-700">Undo (Reset to Pending)</button>
              <button onClick={(e) => { e.stopPropagation(); onApprove?.(song.id); }} className="px-4 py-2 bg-slate-800 rounded-full text-xs font-bold hover:bg-slate-700">Set Approved</button>
            </>
          )}
        </div>
      )}


      <div className="relative h-16 w-16 flex-shrink-0 rounded-lg overflow-hidden bg-slate-700 shadow-lg">
        <img src={song.coverUrl} alt={song.album} className="h-full w-full object-cover" loading="lazy" />
        {song.status === SongStatus.PLAYED && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center"><Check className="text-green-400 h-6 w-6" /></div>
        )}
      </div>

      <div className="flex-1 min-w-0 overflow-hidden">
        <ScrollingText
          text={song.title}
          className="font-semibold text-white text-lg leading-tight"
        />
        <ScrollingText
          text={song.artist}
          className="text-slate-400 text-sm mt-0.5"
        />
        <p className="text-slate-500 text-xs truncate mt-0.5">{song.album}</p>
        {song.requesterName && (
          <p className="text-purple-400 text-xs mt-1 flex items-center gap-1">
            <span className="opacity-70">Requested by</span>
            <span>{song.requesterName}</span>
            {isOwner && <span className="bg-slate-700 text-[9px] px-1 rounded text-slate-300 ml-1">YOU</span>}
          </p>
        )}
      </div>

      {showModeration && !showMenu && (
        <div className="flex items-center gap-2 border-l border-slate-700 pl-2">
          {isPending && (
            <div className="flex flex-col gap-1 items-end sm:flex-row sm:items-center">
              <button onClick={(e) => { e.stopPropagation(); onMarkPlayed?.(song.id); }} title="Already Played" className="p-2 rounded-full bg-slate-700/50 text-slate-400 hover:bg-slate-600 hover:text-white transition"><Check size={14} className="opacity-50" /></button>

              {/* Unavailable Button */}
              <button onClick={(e) => { e.stopPropagation(); onUnavailable?.(song.id); }} title="Unavailable (Can't Play)" className="p-2 rounded-full bg-amber-500/10 text-amber-500 hover:bg-amber-500 hover:text-white transition"><AlertCircle size={18} /></button>

              <button onClick={(e) => { e.stopPropagation(); onReject?.(song.id); }} title="Deny" className="p-2 rounded-full bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white transition"><X size={18} /></button>
              <button onClick={(e) => { e.stopPropagation(); onApprove?.(song.id); }} title="Approve" className="p-2 rounded-full bg-green-500/10 text-green-400 hover:bg-green-500 hover:text-white transition"><Check size={18} /></button>
            </div>
          )}
          {isApproved && (
            <button onClick={(e) => { e.stopPropagation(); onMarkPlayed?.(song.id); }} className="px-3 py-1.5 rounded-full bg-slate-700 text-slate-300 text-xs font-medium hover:bg-purple-600 hover:text-white transition flex items-center gap-1"><Play size={12} /> <span className="hidden sm:inline">Mark Played</span></button>
          )}
        </div>
      )}

      {/* Listener Vote UI kept same... */}
      {!isDjMode && (isApproved || isPending) && (
        <div className="flex flex-col items-center gap-1 min-w-[3rem]">
          <button onClick={(e) => { e.stopPropagation(); canVote && onVote?.(song.id, 'up'); }} disabled={!canVote} className={`p-1 rounded transition ${isUpvoted ? 'bg-green-500 text-white' : canVote ? 'text-slate-500 hover:text-green-400' : 'text-slate-700 cursor-not-allowed'}`}><ThumbsUp size={18} fill={isUpvoted ? "currentColor" : "none"} /></button>
          <span className={`font-bold text-sm ${song.votes > 0 ? 'text-green-400' : song.votes < 0 ? 'text-red-400' : 'text-slate-400'}`}>{song.votes > 0 ? '+' : ''}{song.votes}</span>
          <button onClick={(e) => { e.stopPropagation(); canVote && onVote?.(song.id, 'down'); }} disabled={!canVote} className={`p-1 rounded transition ${isDownvoted ? 'bg-red-500 text-white' : canVote ? 'text-slate-500 hover:text-red-400' : 'text-slate-700 cursor-not-allowed'}`}><ThumbsDown size={18} fill={isDownvoted ? "currentColor" : "none"} /></button>
        </div>
      )}

      {!isDjMode && isPending && !isAdmin && (
        <div className="flex flex-col items-center justify-center px-2 opacity-50"><Clock className="text-slate-500 mb-1" size={16} /></div>
      )}
      {!isDjMode && isApproved && (
        <div className="flex flex-col items-center justify-center px-2"><Check className="text-green-400 mb-1" size={18} /><span className="text-[9px] text-green-400 font-bold uppercase tracking-wider text-center leading-none">Accepted</span></div>
      )}
    </div>
  );
};
