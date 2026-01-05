# PassTheAux - Application Context & Design Brief

## 1. Project Overview
**PassTheAux** is a web and desktop (Electron) application designed to bridge the gap between DJs, Venues, and the Crowd (Listeners). It facilitates real-time song requests, event discovery, and venue management, aiming to modernize the nightlife experience.

### Core Value Propositions
- **For DJs**: "Zero Config" play, manage song requests digitally, protect the vibe (Accept/Deny/Unavailable), and integrate with existing libraries (Lexicon, Spotify).
- **For Venues**: Manage events, promote series, and gain insights into crowd preferences.
- **For Listeners**: Discover local events (Map/Explore), request songs, vote on the queue, and interact with the DJ.

## 2. Technology Stack
- **Frontend Framework**: React 18 (Vite) with TypeScript.
- **Styling**: TailwindCSS (Custom configuration, dark mode focused).
- **Backend / BaaS**: Google Firebase (Firestore, Auth, Storage, Hosting).
- **Desktop Wrapper**: Electron (for reliable DJ performance and system integration).
- **Key Libraries**:
    - `react-router-dom` (Navigation)
    - `leaflet` / `react-leaflet` (Map features)
    - `@google/generative-ai` (AI helpers)
    - `lucide-react` (Iconography)
    - `react-qr-code` (Sharing)

## 3. Application Structure & Architecture

### Directory Structure
- `/src/pages`: Main views (Auth, MapHome, DJHub, EventDetails, etc.).
- `/src/components`: Reusable UI components.
- `/src/services`: API wrappers (`firebase.ts`, `spotifyService.ts`, `lexiconService.ts`, `geminiService.ts`).
- `/src/contexts`: Global state (`AuthContext`, `DataContext`).
- `/src/types.ts`: Central Type definitions.

### Key Workflows & Roles
The app uses Role-Based Access Control (RBAC) with the following roles: `LISTENER`, `DJ`, `VENUE`, `GUEST`, `ADMIN`.

#### **Host (DJ) Workflow**
1.  **Login/Dashboard**: Access `DjHubPage` or `DjDashboardPage`.
2.  **Event Management**: Create `Series` (recurring) or single `Events`.
3.  **Crate Mode** (`/crate/:id`): A specialized, distraction-free view for live performance.
    -   View incoming song requests in real-time.
    -   Actions: **Accept**, **Reject**, **Mark Unavailable** (new feature).
    -   See metadata (BPM, Key, Energy) from Lexicon/Spotify.
4.  **Library**: Integration with **Lexicon** (local DJ library) and **Spotify**.

#### **Guest (Listener) Workflow**
1.  **Discovery**:
    -   **Map Home**: See nearby active events.
    -   **Explore Page**: Browse Events, Venues, and DJs.
2.  **Interaction**:
    -   Check into an event.
    -   Search songs (via Spotify API or DJ's specific Lexicon library).
    -   **Request** a track.
    -   **Vote** on existing requests in the generic queue.

#### **Venue & Admin Workflow**
-   **Venue Page**: Public profile showing upcoming events/series.
-   **Admin Dashboard**: Manage venue approvals, potential user mod tools.

## 4. Current State & Recent Developments
The application is in active development with a functional core.

### Recent Features Implemented
-   **Explore & Venue Profile**: A dedicated area to find content, including a specific page for Venues (`VenuePage.tsx`) displaying their vibe and history.
-   **Song Status "Unavailable"**: Distinguishing between "I don't start this" (Reject) and "I don't have this/Can't play this" (Unavailable).
-   **Admin Role Fixes**: Hardening security to ensure Super Admins are correctly recognized across the app.
-   **Share Series**: QR Code generation for easy event sharing.
-   **Lexicon Pagination**: Handling large DJ libraries by chunking requests.

### Known Pain Points / WIP
-   **Venue Updates**: Recently debugged issues with updating venue details in the dashboard.
-   **Admin Permissions**: Some legacy code checked for raw string roles instead of using the `isAdmin` utility, which has now been standardized.

## 5. Design & Aesthetics
-   **Theme**: "Premium Nightlife". Dark mode driven (`bg-slate-950`), use of glassmorphism, gradients, and vibrant accents (likely purples/blues/neons suitable for clubs).
-   **Typography**: Moving towards `Inter` for clean, modern readability.
-   **UX Philosophy**: "Wow the user". High interactivity, micro-animations, and fluid transitions.

## 6. Future Roadmap (For AI Research Context)
The following features are planned and should be considered in design research:
-   **Interactive Overlay Tutorial**: To guide new users/DJs through the complex UI features.
-   **DJ Tipping**: Integrated monetization.
-   **Gamification**: Rewards and accolades (e.g., "Taste Maker" for listeners whose requests get played often).
-   **Event Templates**: Simplifying the creation flow for recurring gigs.
-   **Music Trivia Mode**: Engagement feature during downtime.
-   **P2P Chat**: Direct communication (optional/controlled).
-   **Public Display Mode**: A "Live Mode" for venues to show the visual queue on TV screens.

## 7. Data Model Summary
-   **Event**: The central node. Links a `DJ`, a `Venue`, and a `Series`. Has `status`, `searchSources`, and `geoRestriction`.
-   **Song**: Represents a request. Has `status` (PENDING, APPROVED, etc.), `votes`, `source` (SPOTIFY/LEXICON).
-   **Series**: Template for recurring events.
-   **Venue**: Physical location with `lat/long` and `status` (APPROVED/PENDING).

## Appendix: Data Types
Below are the core TypeScript definitions used in the application.

```typescript
export enum SongStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  UNAVAILABLE = 'UNAVAILABLE',
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
  vibes?: string[];
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
  // Series Templating
  defaultVibes?: string[]; // Vibe Tags to autofill
  defaultStartTime?: string;
  defaultEndTime?: string;
  defaultCoverUrl?: string; // Phase 8: Specific cover for series if different from poster
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
  useSeriesTitle?: boolean; // If true, use Series.title instead of this.title
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
  // Recurrence
  allowRepeats?: boolean; // Phase 8: If true, previously played songs can be requested again
  isRecurringInstance?: boolean; // Icon indicator
  recurrenceRule?: string; // Optional: Override series rule

  requestsPausedUntil?: number; // Timestamp for when requests automatically turn back on
  searchSources?: ('SPOTIFY' | 'LEXICON')[]; // Which services to search
  lexiconPlaylistIds?: string[]; // If using Lexicon, limit to these playlists
  // Search Integrations
  allowLexiconSearch?: boolean; // Defaults to false
  allowSpotifySearch?: boolean; // Defaults to true
  hasAdminViewed?: boolean; // Notification Tracking
  geoRestrictionEnabled?: boolean; // If true, requires user to be within 2km
  autoStartRequests?: boolean; // If true, requests open automatically/stay open
  vibeTags?: string[]; // Phase 9: Vibe Tags
}

export interface LexiconConfig {
  enabled: boolean;
  host?: string;
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
  // Metadata for DJ Crate
  bpm?: number;
  key?: string;
  energy?: number;
  source?: 'LEXICON' | 'SPOTIFY' | 'GEMINI' | 'OTHER';
}
```
