
import {
  collection, doc, addDoc, updateDoc, onSnapshot,
  query, where, limit, getDocs, deleteDoc, setDoc, getDoc, documentId, runTransaction, serverTimestamp,
  orderBy, startAt, endAt, increment
} from "firebase/firestore";
import {
  signInAnonymously,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  updateProfile,
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup,
  linkWithPopup,
  UserCredential,
  EmailAuthProvider,
  reauthenticateWithCredential,
  reauthenticateWithPopup
} from "firebase/auth";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, auth, storage } from "../../firebaseConfig";
import { Song, SongStatus, Event, UserProfile, AppConfig, UserRole, SocialLink, Series, HistoryItem, Venue, GlobalSearchResult } from "../types";

const sanitizeData = (data: any) => {
  return JSON.parse(JSON.stringify(data));
};

// --- USER PERSISTENCE ---

const syncUserToFirestore = async (user: UserProfile) => {
  try {
    const userRef = doc(db, "users", user.id);
    await setDoc(userRef, {
      name: user.name,
      username: user.username,
      avatarUrl: user.avatarUrl,
      lastLogin: serverTimestamp(),
      role: user.role
    }, { merge: true });
  } catch (e) {
    console.error("Error syncing user:", e);
  }
}

export const updateUserProfile = async (userId: string, data: Partial<UserProfile>) => {
  const userRef = doc(db, "users", userId);

  // Create a clean object with only allowed fields
  const updates: any = {};
  if (data.name !== undefined) updates.name = data.name;
  if (data.username !== undefined) updates.username = data.username;
  if (data.avatarUrl !== undefined) updates.avatarUrl = data.avatarUrl;
  if (data.lexiconConnectionEnabled !== undefined) updates.lexiconConnectionEnabled = data.lexiconConnectionEnabled;
  if (data.allowRepeatRequests !== undefined) updates.allowRepeatRequests = data.allowRepeatRequests;

  if (Object.keys(updates).length > 0) {
    await updateDoc(userRef, updates);

    // Also update Auth profile if name/avatar changed
    if (auth.currentUser && (updates.name || updates.avatarUrl)) {
      await updateProfile(auth.currentUser, {
        displayName: updates.name || auth.currentUser.displayName,
        photoURL: updates.avatarUrl || auth.currentUser.photoURL
      });
    }
  }
};

// Hardcoded Admin Emails (Security Override)
const ADMIN_EMAILS = ['brandon.skeeterb@gmail.com', 'djskeeterb@gmail.com'];

export const subscribeToUserProfile = (uid: string, callback: (profile: UserProfile | null) => void) => {
  return onSnapshot(doc(db, "users", uid), (docSnap) => {
    if (docSnap.exists()) {
      const data = docSnap.data();
      let role = (data.role as UserRole) || 'LISTENER';

      // ENFORCE ADMIN ROLE IF EMAIL MATCHES (Frontend Side)
      if (auth.currentUser?.email && ADMIN_EMAILS.includes(auth.currentUser.email)) {
        role = 'ADMIN';
        // Auto-fix DB if needed (Ensure DB reflects Admin status so security rules pass)
        if (data.role !== 'ADMIN') {
          updateDoc(doc(db, "users", uid), { role: 'ADMIN' }).catch(console.error);
        }
      }

      const profile: UserProfile = {
        id: uid,
        name: data.name || 'User',
        username: data.username || 'user',
        role: role,
        avatarUrl: data.avatarUrl,
        isAuthenticated: true,
        djStatus: data.djStatus || 'NONE',
        bio: data.bio,
        socialLinks: data.socialLinks,
        appliedAt: data.appliedAt,
        isAnonymous: auth.currentUser?.isAnonymous,
        checkedInEventId: data.checkedInEventId,
        deletionRequested: data.deletionRequested || false,
        deletionRequestedAt: data.deletionRequestedAt || null,
        lexiconConnectionEnabled: data.lexiconConnectionEnabled,
        allowRepeatRequests: data.allowRepeatRequests
      };
      callback(profile);
    } else {
      callback(null);
    }
  }, (error) => {
    console.warn("Profile subscription error:", error);
  });
};

export const subscribeToAuthChanges = (callback: (user: UserProfile | null, unsubscribeProfile?: () => void) => void) => {
  return onAuthStateChanged(auth, async (firebaseUser) => {
    if (!firebaseUser) {
      callback(null);
      return;
    }

    const unsubscribeProfile = subscribeToUserProfile(firebaseUser.uid, (profile) => {
      if (profile) {
        callback(profile);
      } else {
        const username = firebaseUser.displayName
          ? firebaseUser.displayName.toLowerCase().replace(/\s/g, '')
          : `guest_${firebaseUser.uid.substring(0, 6)}`;

        const fallbackProfile: UserProfile = {
          id: firebaseUser.uid,
          name: firebaseUser.displayName || 'Guest',
          username: username,
          role: 'LISTENER',
          avatarUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=${username}`,
          isAuthenticated: true,
          isAnonymous: firebaseUser.isAnonymous
        };
        callback(fallbackProfile);
      }
    });
  });
};

// --- AUTH ACTIONS ---

export const loginListener = async (displayName: string): Promise<UserProfile> => {
  const result = await signInAnonymously(auth);

  if (displayName && displayName !== 'Guest') {
    await updateProfile(result.user, {
      displayName: displayName
    });
  }

  const nameToUse = displayName || 'Guest';
  const username = nameToUse.toLowerCase().replace(/\s/g, '');

  const profile: UserProfile = {
    id: result.user.uid,
    name: nameToUse,
    username: username,
    role: 'LISTENER',
    isAuthenticated: true,
    avatarUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=${username}`,
    djStatus: 'NONE',
    isAnonymous: true
  };

  await syncUserToFirestore(profile);
  return profile;
};

export const registerUser = async (email: string, pass: string, name: string): Promise<UserProfile> => {
  try {
    const result = await createUserWithEmailAndPassword(auth, email, pass);
    await updateProfile(result.user, { displayName: name });

    const username = email.split('@')[0];
    const profile: UserProfile = {
      id: result.user.uid,
      name: name,
      username: username,
      role: 'LISTENER',
      isAuthenticated: true,
      avatarUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=${username}`,
      djStatus: 'NONE',
      isAnonymous: false
    };

    await syncUserToFirestore(profile);
    return profile;
  } catch (e) {
    console.error("Registration Failed:", e);
    throw e;
  }
};

export const signInWithGoogle = async (): Promise<UserProfile> => {
  try {
    const provider = new GoogleAuthProvider();
    const result = await signInWithPopup(auth, provider);
    const user = result.user;
    const email = user.email || '';

    // Check if user doc exists, if not sync it
    const userDocRef = doc(db, "users", user.uid);
    const docSnap = await getDoc(userDocRef);

    let profile: UserProfile;

    if (docSnap.exists()) {
      const data = docSnap.data();
      let role = (data.role as UserRole) || 'LISTENER';

      // CRITICAL SECURITY ENFORCEMENT
      if (ADMIN_EMAILS.includes(email)) {
        if (role !== 'ADMIN') {
          role = 'ADMIN'; // Force upgrade correct user
          await updateDoc(userDocRef, { role: 'ADMIN' });
        }
      } else if (role === 'ADMIN') {
        // Demote imposter
        role = data.djStatus === 'APPROVED' ? 'DJ' : 'LISTENER';
        await updateDoc(userDocRef, { role });
      }

      profile = {
        id: user.uid,
        name: data.name || user.displayName || 'User',
        username: data.username || email.split('@')[0] || 'user',
        role,
        avatarUrl: data.avatarUrl || user.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.uid}`,
        isAuthenticated: true,
        djStatus: data.djStatus || 'NONE',
        isAnonymous: false
      };
    } else {
      // New Google User
      const username = email.split('@')[0] || `user_${user.uid.substring(0, 6)}`;

      // Auto-grant Admin on first sign-up
      const role = ADMIN_EMAILS.includes(email) ? 'ADMIN' : 'LISTENER';

      profile = {
        id: user.uid,
        name: user.displayName || 'User',
        username: username,
        role,
        isAuthenticated: true,
        avatarUrl: user.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${username}`,
        djStatus: 'NONE',
        isAnonymous: false
      };
      await syncUserToFirestore(profile);
    }

    return profile;
  } catch (error) {
    console.error("Google Sign-In Error:", error);
    throw error;
  }
};

export const linkGoogleAccount = async () => {
  if (!auth.currentUser) throw new Error("No user logged in");
  try {
    const provider = new GoogleAuthProvider();
    await linkWithPopup(auth.currentUser, provider);
    return true;
  } catch (error) {
    console.error("Link Google Error:", error);
    throw error;
  }
};

export const loginAdminOrDj = async (email: string, pass: string, role: UserRole): Promise<UserProfile> => {
  if (!email || !pass) {
    throw new Error("Email and password are required.");
  }

  try {
    const result = await signInWithEmailAndPassword(auth, email, pass);
    const existingData = await getDoc(doc(db, "users", result.user.uid));
    const data = existingData.data();

    const profile: UserProfile = {
      id: result.user.uid,
      name: result.user.displayName || role,
      username: email.split('@')[0],
      role: (data?.role as UserRole) || role,
      isAuthenticated: true,
      avatarUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=${email}`,
      djStatus: data?.djStatus || 'NONE',
      isAnonymous: false
    };

    return profile;
  } catch (e: any) {
    console.error("Firebase Login Failed:", e.code, e.message);
    throw e;
  }
};

export const logout = async () => {
  await firebaseSignOut(auth);
};

export const reauthenticateUser = async (password?: string) => {
  if (!auth.currentUser) return;

  // Check if ANY linked provider is Google
  const isGoogle = auth.currentUser.providerData.some(p => p.providerId === 'google.com');

  if (isGoogle) {
    // Google Re-auth
    const provider = new GoogleAuthProvider();
    await reauthenticateWithPopup(auth.currentUser, provider);
  } else if (password && auth.currentUser.email) {
    // Email/Password Re-auth
    const cred = EmailAuthProvider.credential(auth.currentUser.email, password);
    await reauthenticateWithCredential(auth.currentUser, cred);
  } else {
    throw new Error("Unsupported auth provider or missing password.");
  }
};

export const deleteUserAccount = async () => {
  if (!auth.currentUser) return;
  const uid = auth.currentUser.uid;

  // 1. Delete Firestore User Data
  await deleteDoc(doc(db, "users", uid));

  // 2. Delete Auth Account
  await auth.currentUser.delete();
};

export const requestAccountDeletion = async (userId: string) => {
  await updateDoc(doc(db, "users", userId), {
    deletionRequested: true,
    deletionRequestedAt: serverTimestamp()
  });
};

export const cancelAccountDeletion = async (userId: string) => {
  await updateDoc(doc(db, "users", userId), {
    deletionRequested: false,
    deletionRequestedAt: null
  });
};

import { getFunctions, httpsCallable } from "firebase/functions";
export const adminDeleteUser = async (targetUserId: string) => {
  const functions = getFunctions();
  const deleteFn = httpsCallable(functions, 'deleteAccountAdmin');
  await deleteFn({ targetUserId });
};

export const subscribeToDeletionRequests = (callback: (users: UserProfile[]) => void) => {
  const q = query(collection(db, "users"), where("deletionRequested", "==", true));
  return onSnapshot(q, (snapshot) => {
    const users = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as UserProfile));
    callback(users);
  }, (error) => {
    console.warn("Deletion requests subscription error:", error);
  });
};

// --- USER HISTORY ---

export const getUserPastActivity = async (userId: string): Promise<HistoryItem[]> => {
  try {
    const songsQuery = query(collection(db, "songs"), where("requesterId", "==", userId));
    const songsSnap = await getDocs(songsQuery);
    const allRequests = songsSnap.docs.map(d => ({ ...d.data(), id: d.id } as Song));

    const eventMap: { [key: string]: Song[] } = {};
    allRequests.forEach(song => {
      if (!eventMap[song.eventId]) eventMap[song.eventId] = [];
      eventMap[song.eventId].push(song);
    });

    const eventIds = Object.keys(eventMap);
    if (eventIds.length === 0) return [];

    const events: Event[] = [];
    const chunks = [];
    for (let i = 0; i < eventIds.length; i += 10) {
      chunks.push(eventIds.slice(i, i + 10));
    }

    for (const chunk of chunks) {
      const eventsQuery = query(collection(db, "events"), where(documentId(), "in", chunk));
      const eventsSnap = await getDocs(eventsQuery);
      eventsSnap.forEach(d => events.push({ ...d.data(), id: d.id } as Event));
    }

    return events.map(event => ({
      event,
      myRequests: eventMap[event.id] || []
    }));

  } catch (e) {
    console.error("Error fetching history:", e);
    return [];
  }
};

export const getEventSetlist = async (eventId: string): Promise<Song[]> => {
  try {
    const q = query(
      collection(db, "songs"),
      where("eventId", "==", eventId),
      where("status", "in", ["APPROVED", "PLAYED"]),
      limit(200)
    );
    const snap = await getDocs(q);
    const songs = snap.docs.map(d => ({ ...d.data(), id: d.id } as Song));

    return songs.sort((a, b) => {
      if (a.status === 'PLAYED' && b.status !== 'PLAYED') return -1;
      if (b.status === 'PLAYED' && a.status !== 'PLAYED') return 1;
      return 0;
    });
  } catch (e) {
    console.error("Error fetching setlist", e);
    return [];
  }
}

// --- DJ APPLICATIONS ---

export const submitDjApplication = async (userId: string, bio: string, socialLinks: SocialLink[]) => {
  const userRef = doc(db, "users", userId);
  await updateDoc(userRef, sanitizeData({
    djStatus: 'PENDING',
    bio,
    socialLinks,
    appliedAt: serverTimestamp()
  }));
};

export const subscribeToDjRequests = (callback: (users: UserProfile[]) => void) => {
  const q = query(collection(db, "users"), where("djStatus", "==", "PENDING"));
  return onSnapshot(q, (snapshot) => {
    const users = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as UserProfile));
    callback(users);
  }, (error) => {
    console.warn("DJ Requests subscription error:", error);
  });
};

export const subscribeToAllDjs = (callback: (users: UserProfile[]) => void) => {
  const q = query(collection(db, "users"), where("role", "in", ["DJ", "ADMIN"]));
  return onSnapshot(q, (snapshot) => {
    const users = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as UserProfile));
    callback(users);
  }, (error) => {
    console.warn("All DJs subscription error:", error);
  });
};

export const processDjApplication = async (userId: string, isApproved: boolean) => {
  const userRef = doc(db, "users", userId);
  await updateDoc(userRef, {
    djStatus: isApproved ? 'APPROVED' : 'DENIED',
    role: isApproved ? 'DJ' : 'LISTENER',
    isActive: isApproved // Auto-activate on approval
  });
};

export const toggleDjActiveStatus = async (userId: string, currentStatus: boolean) => {
  const userRef = doc(db, "users", userId);
  await updateDoc(userRef, {
    isActive: !currentStatus
  });
};

// --- ADMIN / SAFETY ---

export const searchUsers = async (searchTerm: string): Promise<UserProfile[]> => {
  if (!searchTerm || searchTerm.length < 3) return [];

  const lowerTerm = searchTerm.toLowerCase();

  // Parallel Query: Search by Username AND Name
  // Note: For 'name' search to work case-insensitively effectively, we ideally need a 'searchName' field in Firestore lowercased.
  // Since we don't have that yet, 'name' search will only work partially if we use startAt/endAt on the Case Sensitive 'name' field
  // OR we simulate it if the user types Case Sensitive. 
  // However, for typical "Search", users expect case-insensitive.
  // Standard Firestore Fix: We usually store a 'keywords' array or a 'nameLower'.
  // FALLBACK: For now, we will search 'username' (which is lower) confidently.
  // BLENDED APPROACH: We will query 'username' as primary. We will also query 'name' assuming Capitalized First Letter if user typed lowercase?
  // Let's rely on two queries:
  // 1. Username (Strict prefix)
  // 2. Name (Prefix) - Warning: Case sensitivty on 'name' field.

  const qUsername = query(
    collection(db, "users"),
    orderBy("username"),
    startAt(lowerTerm),
    endAt(lowerTerm + '\uf8ff'),
    limit(5)
  );

  const qName = query(
    collection(db, "users"),
    orderBy("name"),
    startAt(searchTerm), // Use original term for Name (Case Sensitive match)
    endAt(searchTerm + '\uf8ff'),
    limit(5)
  );

  try {
    const [snapUsername, snapName] = await Promise.all([
      getDocs(qUsername),
      getDocs(qName)
    ]);

    const results = new Map<string, UserProfile>();

    snapUsername.forEach(d => results.set(d.id, { ...d.data(), id: d.id } as UserProfile));
    snapName.forEach(d => results.set(d.id, { ...d.data(), id: d.id } as UserProfile));

    return Array.from(results.values()).slice(0, 10);
  } catch (e) {
    console.error("User search error", e);
    return [];
  }
}

export const searchDjs = async (searchTerm: string): Promise<UserProfile[]> => {
  const users = await searchUsers(searchTerm);
  return users.filter(u => u.role === 'DJ' || u.role === 'ADMIN');
};

export const resetDjRoles = async () => {
  const ALLOWED_DJS = ['TestAdmin', 'Auxmaster', 'PartyHost'];
  const ADMIN_EMAILS = ['brandon.skeeterb@gmail.com', 'djskeeterb@gmail.com'];

  // Get all users with DJ or ADMIN role
  const q = query(collection(db, "users"), where("role", "in", ["DJ", "ADMIN"]));
  const snap = await getDocs(q);

  let count = 0;
  for (const d of snap.docs) {
    const data = d.data();
    const isAllowedDj = ALLOWED_DJS.includes(data.name) || ALLOWED_DJS.includes(data.username);
    // Note: We don't have email in public profile usually, but for Admins checking by ID might be safer if we knew them. 
    // For now, rely on strict Admin login check for Admins. 
    // Logic: If NOT Admin Email AND NOT Allowed DJ -> Demote.

    // Wait, we can't check email easily if it isn't stored in 'users' collection (it usually isn't for privacy).
    // But the ADMIN_EMAILS check happens on Login. So here we just need to clear random DJs.

    if (data.role === 'ADMIN') continue; // Skip admins, they are handled by login check

    if (!isAllowedDj) {
      await updateDoc(doc(db, "users", d.id), {
        role: 'LISTENER',
        djStatus: 'NONE'
      });
      count++;
    }
  }
  console.log(`Reset ${count} users to Listener.`);
  return count;
};

// --- SERIES ---

export const subscribeToSeries = (ownerId: string, callback: (series: Series[]) => void) => {
  const q = query(collection(db, "series"), where("ownerId", "==", ownerId));
  return onSnapshot(q, (snapshot) => {
    const series = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Series));
    callback(series);
  }, (error) => {
    console.warn("Series subscription error:", error);
  });
};

export const subscribeToAllSeries = (callback: (series: Series[]) => void) => {
  const q = query(collection(db, "series"));
  return onSnapshot(q, (snapshot) => {
    const series = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Series));
    callback(series);
  }, (error) => {
    console.warn("All Series subscription error:", error);
  });
};

export const createSeries = async (seriesData: Omit<Series, 'id'>): Promise<string> => {
  const docRef = await addDoc(collection(db, "series"), sanitizeData(seriesData));
  return docRef.id;
};

export const getSeriesById = async (seriesId: string): Promise<Series | null> => {
  try {
    const docSnap = await getDoc(doc(db, "series", seriesId));
    if (docSnap.exists()) return { id: docSnap.id, ...docSnap.data() } as Series;
    return null;
  } catch (e) {
    return null;
  }
};

export const getSeriesByVenueId = async (venueId: string): Promise<Series[]> => {
  try {
    const q = query(
      collection(db, "series"),
      where("venueId", "==", venueId)
    );
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ ...d.data(), id: d.id } as Series));
  } catch (e) {
    console.warn("Error fetching series by venue:", e);
    return [];
  }
};

export const getSeriesEvents = async (seriesId: string): Promise<Event[]> => {
  try {
    const q = query(collection(db, "events"), where("seriesId", "==", seriesId));
    const snap = await getDocs(q);
    const events = snap.docs.map(d => ({ ...d.data(), id: d.id } as Event));
    return events.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  } catch (e) {
    console.error("Error fetching series events:", e);
    return [];
  }
}

// --- EVENTS ---

export const subscribeToEvents = (callback: (events: Event[]) => void) => {
  const q = query(collection(db, "events"), limit(100));
  return onSnapshot(q, (snapshot) => {
    const events = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Event));
    callback(events);
  }, (error) => {
    console.warn("Events subscription error:", error);
  });
};

export const createEvent = async (eventData: Omit<Event, 'id'>, userId?: string): Promise<string> => {
  let allowRepeats = false;

  if (userId) {
    const userSnap = await getDoc(doc(db, "users", userId));
    if (userSnap.exists()) {
      allowRepeats = userSnap.data().allowRepeatRequests || false;
    }
  }

  const docRef = await addDoc(collection(db, "events"), sanitizeData({ ...eventData, allowRepeats }));
  return docRef.id;
};

export const updateEvent = async (eventId: string, data: Partial<Event>) => {
  await updateDoc(doc(db, "events", eventId), sanitizeData(data));
};

export const getEventsByVenueName = async (venueName: string): Promise<Event[]> => {
  try {
    const q = query(
      collection(db, "events"),
      where("venue.name", "==", venueName)
    );
    const snap = await getDocs(q);
    const events = snap.docs.map(d => ({ ...d.data(), id: d.id } as Event));
    return events;
  } catch (e) {
    console.error("Error fetching events by venue name:", e);
    return [];
  }
};

export const updateEventAsAdmin = async (eventId: string, data: Partial<Event>) => {
  const functions = getFunctions();
  const updateFn = httpsCallable(functions, 'updateEventAdmin');
  await updateFn({ eventId, data });
};

export const deleteEvent = async (eventId: string) => {
  await deleteDoc(doc(db, "events", eventId));
};

export const toggleEventRequests = async (eventId: string, currentStatus: boolean, pausedUntil: number | null = null) => {
  // Logic:
  // If pausing with time (pausedUntil != null): acceptingRequests = false, requestsPausedUntil = time
  // If toggling normally:
  //   - If Valid (Accepting=true): Turn OFF (Accepting=false, PausedUntil=null)
  //   - If Invalid (Accepting=false): Turn ON (Accepting=true, PausedUntil=null)

  if (pausedUntil) {
    await updateDoc(doc(db, "events", eventId), {
      acceptingRequests: false,
      requestsPausedUntil: pausedUntil
    });
  } else {
    // Standard Toggle (Manual ON/OFF)
    await updateDoc(doc(db, "events", eventId), {
      acceptingRequests: !currentStatus,
      requestsPausedUntil: null
    });
  }
};

// --- VENUES ---

// Utility: Client-side Image Compression
export const compressImage = (file: File, maxWidth = 1200, quality = 0.8): Promise<File> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Could not get canvas context'));
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);

        // Force JPEG for consistency and size
        canvas.toBlob((blob) => {
          if (blob) {
            // Correct extension to .jpg
            const newName = file.name.replace(/\.[^/.]+$/, "") + ".jpg";
            const newFile = new File([blob], newName, {
              type: 'image/jpeg',
              lastModified: Date.now(),
            });
            console.log(`[Compression] Original: ${file.size}, New: ${newFile.size}`);
            resolve(newFile);
          } else {
            reject(new Error('Canvas is empty'));
          }
        }, 'image/jpeg', quality);
      };
      img.onerror = (err) => reject(err);
    };
    reader.onerror = (err) => reject(err);
  });
};

export const uploadEventImage = async (file: File) => {
  let fileToUpload = file;
  try {
    // Only compress if image
    if (file.type.startsWith('image/')) {
      const compressed = await compressImage(file);
      fileToUpload = compressed;
    }
  } catch (e) {
    console.warn("Image compression failed, uploading original.", e);
  }

  try {
    const sanitizedName = fileToUpload.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const storageRef = ref(storage, `covers/${Date.now()}_${sanitizedName}`);
    const snapshot = await uploadBytes(storageRef, fileToUpload);
    return getDownloadURL(snapshot.ref);
  } catch (error: any) {
    console.error("Firebase Storage Upload Error:", error);
    // Re-throw to let UI know
    throw new Error(error.message || "Upload failed");
  }
};

export const resetEventsAndRequests = async () => {
  // CLIENT-SIDE WIPE (Bypassing Cloud Function to ensure Series are wiped immediately without redeploy)
  const collections = ['events', 'songs', 'series'];
  let totalDeleted = 0;

  for (const colName of collections) {
    const q = query(collection(db, colName));
    const snap = await getDocs(q);
    const deletePromises = snap.docs.map(d => deleteDoc(d.ref));
    await Promise.all(deletePromises);
    console.log(`Deleted ${snap.size} documents from ${colName}`);
    totalDeleted += snap.size;
  }

  return { success: true, count: totalDeleted };
};

export const subscribeToVenues = (callback: (venues: Venue[]) => void) => {
  const q = query(collection(db, "venues"), limit(500));
  return onSnapshot(q, (snapshot) => {
    const venues = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Venue));
    callback(venues);
  }, (error) => {
    console.warn("Venues subscription error:", error);
  });
};

export const createVenue = async (venueData: Omit<Venue, 'id'>): Promise<string> => {
  const docRef = await addDoc(collection(db, "venues"), sanitizeData(venueData));
  return docRef.id;
};

export const approveVenue = async (venueId: string) => {
  await updateDoc(doc(db, "venues", venueId), { status: 'APPROVED' });
};

export const updateVenue = async (venueId: string, data: Partial<Venue>) => {
  const ref = doc(db, "venues", venueId);
  await updateDoc(ref, data);
};

export const deleteVenue = async (venueId: string) => {
  await deleteDoc(doc(db, "venues", venueId));
};

// --- SYSTEM SETTINGS (Global Config) ---

export const saveGlobalConfig = async (config: AppConfig) => {
  await setDoc(doc(db, "settings", "global"), sanitizeData(config), { merge: true });
};

export const subscribeToGlobalConfig = (callback: (config: AppConfig) => void) => {
  return onSnapshot(doc(db, "settings", "global"), (doc) => {
    if (doc.exists()) {
      callback(doc.data() as AppConfig);
    } else {
      callback({});
    }
  }, (error) => {
    console.warn("Global config subscription error:", error);
  });
};

// --- SPOTIFY REFRESH HELPERS ---

export const isSpotifyTokenNearExpiry = (config: AppConfig, marginMs = 5 * 60 * 1000) => {
  // Returns true if token is missing or will expire within marginMs
  const expiresAt = (config && (config as any).spotifyTokenExpiresAt) as number | undefined;
  if (!expiresAt) return true;
  return Date.now() > (expiresAt - marginMs);
};

export const triggerRefreshSpotifyToken = async (): Promise<{ ok: boolean; message?: string }> => {
  // Use the deployed Cloud Function URL by default; you can override with env var
  const defaultUrl = 'https://refreshspotifytokenhttp-3pkk43mtxq-uc.a.run.app';
  const url = (import.meta.env.VITE_SPOTIFY_REFRESH_URL as string) || defaultUrl;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json'
  };

  try {
    if (auth && auth.currentUser) {
      const idToken = await auth.currentUser.getIdToken();
      if (idToken) headers['Authorization'] = `Bearer ${idToken}`;
    }

    const resp = await fetch(url, {
      method: 'POST',
      headers
    });

    const text = await resp.text();
    if (!resp.ok) {
      console.error('Refresh endpoint error:', resp.status, text);
      return { ok: false, message: text || resp.statusText };
    }

    try {
      const json = JSON.parse(text || '{}');
      return { ok: true, message: json.message || json.ok || text };
    } catch (e) {
      return { ok: true, message: text };
    }
  } catch (e: any) {
    console.error('Failed to call refresh endpoint:', e);
    return { ok: false, message: e.message };
  }
};

// --- QUEUE / SONGS ---

export const subscribeToQueue = (eventId: string, callback: (songs: Song[]) => void) => {
  const q = query(
    collection(db, "songs"),
    where("eventId", "==", eventId),
    limit(100)
  );

  return onSnapshot(q, (snapshot) => {
    const songs = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Song));
    callback(songs);
  }, (error) => {
    console.warn("Queue subscription error:", error);
  });
};

export const addSongRequest = async (song: Omit<Song, 'id'>) => {
  // 1. Check for duplicates / constraints
  const q = query(
    collection(db, "songs"),
    where("eventId", "==", song.eventId),
    where("title", "==", song.title),
    where("artist", "==", song.artist)
  );

  const snap = await getDocs(q);

  if (!snap.empty) {
    // Song exists in history of this event
    const existing = snap.docs[0].data() as Song;

    if (existing.status === 'PLAYED') {
      // Check Event Rule
      const eventSnap = await getDoc(doc(db, "events", song.eventId));
      if (eventSnap.exists()) {
        const event = eventSnap.data() as Event;
        if (!event.allowRepeats) {
          throw new Error("This song has already been played.");
        }
        // If allowed, we proceed to add duplicate request
      }
    } else {
      // PENDING, APPROVED, REJECTED
      // If Rejected, user wants it to be blocked ("Turning off this search and request limitation..." implies limit exists)
      // If Pending/Approved, definitely block.
      throw new Error("This song is already in the queue.");
    }
  }

  await addDoc(collection(db, "songs"), sanitizeData({
    ...song,
    votes: 0,
    upvotedUserIds: [],
    downvotedUserIds: []
  }));

  // Increment Event Request Count
  if (song.eventId) {
    try {
      const eventRef = doc(db, "events", song.eventId);
      await updateDoc(eventRef, {
        requestCount: increment(1)
      });
    } catch (e) {
      console.error("Failed to increment request count", e);
    }
  }
};

export const updateSongStatus = async (songId: string, status: SongStatus) => {
  await updateDoc(doc(db, "songs", songId), { status });
};

export const voteSong = async (songId: string, direction: 'up' | 'down', userId: string) => {
  const songRef = doc(db, "songs", songId);
  try {
    await runTransaction(db, async (transaction) => {
      const songDoc = await transaction.get(songRef);
      if (!songDoc.exists()) { throw "Song does not exist!"; }

      const data = songDoc.data() as Song;
      if (data.status === 'PLAYED' || data.status === 'REJECTED') {
        throw "Voting is closed for this song.";
      }
      const upvoted = data.upvotedUserIds || [];
      const downvoted = data.downvotedUserIds || [];
      let newVotes = data.votes || 0;

      const newUpvoted = [...upvoted];
      const newDownvoted = [...downvoted];

      const isUp = upvoted.includes(userId);
      const isDown = downvoted.includes(userId);

      if (direction === 'up') {
        if (isUp) {
          // Toggle Off
          newVotes -= 1;
          const idx = newUpvoted.indexOf(userId);
          if (idx > -1) newUpvoted.splice(idx, 1);
        } else if (isDown) {
          // Switch Down -> Up (+2)
          newVotes += 2;
          const idx = newDownvoted.indexOf(userId);
          if (idx > -1) newDownvoted.splice(idx, 1);
          newUpvoted.push(userId);
        } else {
          // Fresh Up
          newVotes += 1;
          newUpvoted.push(userId);
        }
      } else {
        if (isDown) {
          // Toggle Off
          newVotes += 1;
          const idx = newDownvoted.indexOf(userId);
          if (idx > -1) newDownvoted.splice(idx, 1);
        } else if (isUp) {
          // Switch Up -> Down (-2)
          newVotes -= 2;
          const idx = newUpvoted.indexOf(userId);
          if (idx > -1) newUpvoted.splice(idx, 1);
          newDownvoted.push(userId);
        } else {
          // Fresh Down
          newVotes -= 1;
          newDownvoted.push(userId);
        }
      }

      transaction.update(songRef, {
        votes: newVotes,
        upvotedUserIds: newUpvoted,
        downvotedUserIds: newDownvoted
      });
    });
  } catch (e: any) {
    if (e.code === 'resource-exhausted') {
      throw new Error("Daily Quota Exceeded. Please try again tomorrow.");
    }
    throw e;
  }
};

// --- CHECK-IN / ACTIVE USERS ---

export const checkInUser = async (userId: string, eventId: string) => {
  const userRef = doc(db, "users", userId);
  await updateDoc(userRef, {
    checkedInEventId: eventId,
    lastActive: serverTimestamp()
  });
};

export const checkOutUser = async (userId: string) => {
  const userRef = doc(db, "users", userId);
  await updateDoc(userRef, {
    checkedInEventId: null,
    lastActive: serverTimestamp()
  });
};

export const subscribeToCheckedInUsers = (eventId: string, callback: (users: UserProfile[]) => void) => {
  try {
    const q = query(collection(db, "users"), where("checkedInEventId", "==", eventId), limit(100));
    return onSnapshot(q, (snapshot) => {
      const users = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as UserProfile));
      callback(users);
    }, (error) => {
      if (error.code !== 'permission-denied') {
        console.warn("Checked-in users subscription error:", error);
      }
    });
  } catch (e) {
    return () => { };
  }
};

// --- GLOBAL SEARCH ---

export const searchEventsGlobal = async (term: string, limitCount: number = 5): Promise<GlobalSearchResult[]> => {
  if (!term || term.length < 2) return [];
  // Note: Firestore doesn't support native full-text search. 
  // We use a simple prefix match on 'title' for this implementation.
  const q = query(
    collection(db, "events"),
    where("isPublic", "==", true),
    orderBy("title"),
    startAt(term),
    endAt(term + '\uf8ff'),
    limit(limitCount)
  );

  try {
    const snap = await getDocs(q);
    return snap.docs.map(d => {
      const data = d.data() as Event;
      return {
        id: d.id,
        type: 'EVENT',
        title: data.title,
        subtitle: `${data.date} @ ${data.venueName}`,
        imageUrl: data.imageUrl,
        metadata: data
      };
    });
  } catch (e) {
    console.warn("Event search error:", e);
    return [];
  }
};

export const searchDjsGlobal = async (term: string, limitCount: number = 5): Promise<GlobalSearchResult[]> => {
  if (!term || term.length < 2) return [];
  const q = query(
    collection(db, "users"),
    where("role", "in", ["DJ", "ADMIN"]),
    orderBy("username"),
    startAt(term.toLowerCase()),
    endAt(term.toLowerCase() + '\uf8ff'),
    limit(limitCount)
  );

  try {
    const snap = await getDocs(q);
    return snap.docs.map(d => {
      const data = d.data() as UserProfile;
      return {
        id: d.id,
        type: 'DJ',
        title: data.name,
        subtitle: `@${data.username}`,
        imageUrl: data.avatarUrl,
        metadata: data
      };
    });
  } catch (e) {
    console.warn("DJ search error:", e);
    return [];
  }
};

export const searchVenuesGlobal = async (term: string, limitCount: number = 5): Promise<GlobalSearchResult[]> => {
  if (!term || term.length < 2) return [];
  const q = query(
    collection(db, "venues"),
    orderBy("name"),
    startAt(term),
    endAt(term + '\uf8ff'),
    limit(limitCount)
  );

  try {
    const snap = await getDocs(q);
    return snap.docs.map(d => {
      const data = d.data() as Venue;
      return {
        id: d.id,
        type: 'VENUE',
        title: data.name,
        subtitle: data.address,
        metadata: data
      };
    });
  } catch (e) {
    console.warn("Venue search error:", e);
    return [];
  }
};
