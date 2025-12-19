export enum SongStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  PLAYED = 'PLAYED'
}

export type UserRole = 'LISTENER' | 'DJ' | 'VENUE' | 'GUEST' | 'ADMIN';

export type DjRequestStatus = 'NONE' | 'PENDING' | 'APPROVED' | 'DENIED';

export interface SocialLink {
  platform: 'Instagram' | 'Facebook' | 'SoundCloud' | 'MixCloud' | 'Spotify' | 'Other';
  url: string;
  title?: string;
}

export interface UserProfile {
  id: string;
  email?: string;
  name: string;
  username: string;
  role: UserRole;
  avatarUrl?: string;
  isAuthenticated: boolean;
  checkedInEventId?: string | null;
  deletionRequested?: boolean;
  deletionRequestedAt?: any; // Timestamp
  isAnonymous?: boolean;
  djStatus?: DjRequestStatus;
  bio?: string;
  socialLinks?: SocialLink[];
  appliedAt?: any;
  attendedEvents?: Event[];
  allowRepeatRequests?: boolean; // DJ Default Setting
  isActive?: boolean;
  lexiconConfig?: LexiconConfig;
  lexiconConnectionEnabled?: boolean; // Integration Feature
}

export interface Series {
  id: string;
  ownerId: string;
  title: string;
  description: string;
  djIds: string[]; // Phase 7
  djName?: string; // Cache for display
  venueId?: string; // Phase 7
  posterUrl?: string; // Phase 7
  // Recurrence Config
  isRecurring?: boolean;
  frequency?: 'WEEKLY' | 'MONTHLY';
  dayOfWeek?: number; // 0=Sun, 1=Mon...
  weekOfMonth?: number; // 1=1st, 2=2nd... (for Monthly)
  autoCreate?: boolean; // If true, system auto-creates pending events
  hasAdminViewed?: boolean; // Notification Tracking
}

export interface Event {
  id: string;
  ownerId: string;
  seriesId?: string;
  title: string;
  venueName: string;
  venueId?: string; // Link to Venue Doc
  djName: string; // Legacy display name
  djIds?: string[]; // Phase 7: Array of User IDs
  secondDjId?: string; // Phase 7: Helper for UI, but djIds is source of truth
  status?: 'PENDING' | 'READY'; // Phase 7
  date: string;
  startTime: string;
  endTime: string;
  imageUrl: string;
  description: string;
  distance: string;
  latitude?: number;
  longitude?: number;
  genreTags: string[];
  requestCount?: number;
  isLive: boolean;
  acceptingRequests: boolean;
  isArchived?: boolean;
  isPublic?: boolean;
  customQrImageUrl?: string;
  seriesOrder?: number;
  allowRepeats?: boolean; // Phase 8: If true, previously played songs can be requested again
  requestsPausedUntil?: number; // Timestamp for when requests automatically turn back on
  searchSources?: ('SPOTIFY' | 'LEXICON')[]; // Which services to search
  lexiconPlaylistIds?: string[]; // If using Lexicon, limit to these playlists
  // Search Integrations
  allowLexiconSearch?: boolean; // Defaults to false
  allowSpotifySearch?: boolean; // Defaults to true
  hasAdminViewed?: boolean; // Notification Tracking
}

export interface LexiconConfig {
  enabled: boolean;
  host: string;
  apiKey?: string;
}

export interface Venue {
  id: string;
  name: string;
  linkedEmail?: string;
  address?: string;
  latitude?: number;
  longitude?: number;
  status: 'PENDING' | 'APPROVED';
  hours?: string;
  description?: string;
}

export interface Song {
  id: string;
  eventId: string;
  title: string;
  artist: string;
  album: string;
  coverUrl: string;
  status: SongStatus;
  votes: number;
  upvotedUserIds?: string[];
  downvotedUserIds?: string[];
  requesterName?: string;
  requesterId?: string;
  timestamp: number;
  userVoted?: 'up' | 'down' | null;
  votedUserIds?: string[];
}

export interface SearchResult {
  id: string;
  title: string;
  artist: string;
  album: string;
  coverUrl: string;
  previewUrl?: string | null;
  source?: 'LEXICON' | 'SPOTIFY' | 'GEMINI' | 'OTHER';
}

export interface AppConfig {
  spotifyToken?: string;
  adminPassword?: string;
  blacklistedWords?: string[];
}

export type GlobalResourceType = 'EVENT' | 'DJ' | 'VENUE' | 'SONG';

export interface GlobalSearchResult {
  id: string;
  type: GlobalResourceType;
  title: string; // Event Title, DJ Name, Venue Name
  subtitle?: string; // Date, @username, Address
  imageUrl?: string;
  metadata?: any; // Extra data like coordinates, eventId etc.
}

export interface HistoryItem {
  event: Event;
  myRequests: Song[];
}

export type ViewMode =
  | 'AUTH_LOGIN'
  | 'ADMIN_LOGIN'
  | 'AUTH_ROLE_SELECT'
  | 'FEED_TONIGHT'
  | 'EVENT_DETAILS'
  | 'REQUEST_SEARCH'
  | 'QUEUE'
  | 'PROFILE'
  | 'DJ_DASHBOARD'
  | 'DJ_HUB'
  | 'ADMIN_DASHBOARD'
  | 'SERIES_LANDING'
  | 'SEARCH_GLOBAL';
