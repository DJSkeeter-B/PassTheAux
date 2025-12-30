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
  onInspectUser?: (name: string) => void;
}

export const SongCard: React.FC<SongCardProps> = ({
  song,
  isDjMode,
  isAdmin,
  currentUserId,
  onVote,
  onApprove,
  onReject,
  onUnavailable,
  onMarkPlayed,
}) => {
  const isPending = song.status === SongStatus.PENDING;
  const isApproved = song.status === SongStatus.APPROVED;
  const showModeration = isDjMode || isAdmin;
  const isUpvoted = currentUserId && song.upvotedUserIds?.includes(currentUserId);
  const isDownvoted = currentUserId && song.downvotedUserIds?.includes(currentUserId);
  const isOwner = currentUserId && song.requesterId === currentUserId;
  const canVote = !isOwner && !!currentUserId;

  const isRejected = song.status === SongStatus.REJECTED;
  const isUnavailable = song.status === SongStatus.UNAVAILABLE;

  // Compact View for Rejected / Unavailable Songs
  if (isRejected || isUnavailable) {
    const isUnavail = song.status === SongStatus.UNAVAILABLE;
    const colorClass = isUnavail ? 'amber' : 'red';
    const LabelIcon = isUnavail ? AlertCircle : X;
    const labelText = isUnavail ? 'Unavailable' : 'Denied';

    return (
      <div className={`relative overflow-hidden rounded-lg border border-${colorClass}-900/30 bg-${colorClass}-950/10 p-2 flex items-center gap-3 opacity-70 transition-all`}>
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
      </div>
    );
  }

  return (
    <div className={`relative overflow-hidden rounded-xl border p-3 flex items-center gap-4 transition-all
      ${song.status === SongStatus.PLAYED ? 'bg-slate-800/50 border-slate-700 opacity-60' :
        'bg-slate-800 border-slate-700 hover:border-purple-500/50'}
      ${isPending && isDjMode ? 'border-yellow-500/50 bg-yellow-900/10' : ''}
      ${isApproved ? 'border-green-500/50 shadow-sm shadow-green-900/20' : ''}
    `}>
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

      {showModeration && (
        <div className="flex items-center gap-2 border-l border-slate-700 pl-2">
          {isPending && (
            <div className="flex flex-col gap-1 items-end sm:flex-row sm:items-center">
              <button onClick={() => onMarkPlayed?.(song.id)} title="Already Played" className="p-2 rounded-full bg-slate-700/50 text-slate-400 hover:bg-slate-600 hover:text-white transition"><Check size={14} className="opacity-50" /></button>

              {/* Unavailable Button */}
              <button onClick={() => onUnavailable?.(song.id)} title="Unavailable (Can't Play)" className="p-2 rounded-full bg-amber-500/10 text-amber-500 hover:bg-amber-500 hover:text-white transition"><AlertCircle size={18} /></button>

              <button onClick={() => onReject?.(song.id)} title="Deny" className="p-2 rounded-full bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white transition"><X size={18} /></button>
              <button onClick={() => onApprove?.(song.id)} title="Approve" className="p-2 rounded-full bg-green-500/10 text-green-400 hover:bg-green-500 hover:text-white transition"><Check size={18} /></button>
            </div>
          )}
          {isApproved && (
            <button onClick={() => onMarkPlayed?.(song.id)} className="px-3 py-1.5 rounded-full bg-slate-700 text-slate-300 text-xs font-medium hover:bg-purple-600 hover:text-white transition flex items-center gap-1"><Play size={12} /> <span className="hidden sm:inline">Mark Played</span></button>
          )}
        </div>
      )}

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
