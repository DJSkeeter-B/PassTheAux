import { onSchedule } from "firebase-functions/v2/scheduler";
import { onRequest } from "firebase-functions/v2/https";
import * as functionsV1 from 'firebase-functions';
import { defineSecret } from "firebase-functions/params";
import * as admin from "firebase-admin";
import { FieldValue } from "firebase-admin/firestore";
import axios from "axios";

admin.initializeApp();
const db = admin.firestore();

// Define secrets (will be fetched from Firebase Secret Manager)
const spotifyClientId = defineSecret('SPOTIFY_CLIENT_ID');
const spotifyClientSecret = defineSecret('SPOTIFY_CLIENT_SECRET');

const SPOTIFY_TOKEN_URL = "https://accounts.spotify.com/api/token";

// Fetch a new access token from Spotify using Client Credentials flow
async function fetchSpotifyToken(clientId: string, clientSecret: string) {
  // Strip any whitespace/newlines from credentials
  const cleanClientId = clientId.trim();
  const cleanClientSecret = clientSecret.trim();
  const authString = Buffer.from(`${cleanClientId}:${cleanClientSecret}`).toString('base64');
  const response = await axios.post(
    SPOTIFY_TOKEN_URL,
    'grant_type=client_credentials',
    {
      headers: {
        'Authorization': `Basic ${authString}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    }
  );
  return response.data; // { access_token, token_type, expires_in }
}

// Write token to Firestore
async function writeTokenToFirestore(accessToken: string, expiresIn: number) {
  const expiresAt = Date.now() + expiresIn * 1000; // convert to ms
  await db.doc('settings/global').set({
    spotifyToken: accessToken,
    spotifyTokenExpiresAt: expiresAt,
    lastUpdated: FieldValue.serverTimestamp()
  }, { merge: true });
}

// Scheduled function: run every 45 minutes (Spotify tokens last 60 mins)
export const refreshSpotifyToken = onSchedule(
  { schedule: "every 45 minutes", secrets: [spotifyClientId, spotifyClientSecret] },
  async () => {
    const clientId = spotifyClientId.value();
    const clientSecret = spotifyClientSecret.value();

    if (!clientId || !clientSecret) {
      console.error("Missing Spotify Credentials in secrets");
      return;
    }

    try {
      const data = await fetchSpotifyToken(clientId, clientSecret);
      await writeTokenToFirestore(data.access_token, data.expires_in);
      console.log("Spotify Token Refreshed Successfully!");
    } catch (error) {
      console.error("Failed to refresh Spotify Token", error);
    }
  }
);

// HTTP endpoint: on-demand refresh (requires authenticated admin)
export const refreshSpotifyTokenHttp = onRequest(
  { secrets: [spotifyClientId, spotifyClientSecret] },
  async (req, res) => {
    try {
      // 1) Verify Firebase ID token in Authorization header
      const authHeader = (req.get('Authorization') || req.get('authorization') || '').toString();
      if (!authHeader.startsWith('Bearer ')) {
        res.status(401).json({ ok: false, error: 'Missing or invalid Authorization header' });
        return;
      }
      const idToken = authHeader.split(' ')[1];

      let decoded: admin.auth.DecodedIdToken;
      try {
        decoded = await admin.auth().verifyIdToken(idToken);
      } catch (err) {
        res.status(401).json({ ok: false, error: 'Invalid ID token' });
        return;
      }

      // 2) Confirm user is an ADMIN or USER in your users collection
      const userDocRef = db.doc(`users/${decoded.uid}`);
      let userDoc = await userDocRef.get();

      // Handle race condition: if onAuthCreate hasn't run yet, create the doc now
      if (!userDoc.exists) {
        console.log(`User doc missing for ${decoded.uid}, creating lazily...`);
        const newUserData = {
          email: decoded.email || null,
          role: 'USER',
          createdAt: FieldValue.serverTimestamp()
        };
        await userDocRef.set(newUserData, { merge: true });
        userDoc = await userDocRef.get(); // Re-fetch
      }

      const userData = userDoc.data() as any;
      if (!userData || (userData.role !== 'ADMIN' && userData.role !== 'USER')) {
        res.status(403).json({ ok: false, error: 'Forbidden: registered user required' });
        return;
      }

      // 3) Read secrets and refresh token
      const clientId = spotifyClientId.value();
      const clientSecret = spotifyClientSecret.value();

      if (!clientId || !clientSecret) {
        res.status(500).json({ ok: false, error: 'Spotify credentials not configured' });
        return;
      }

      const data = await fetchSpotifyToken(clientId, clientSecret);
      await writeTokenToFirestore(data.access_token, data.expires_in);
      res.json({ ok: true, message: 'Spotify token refreshed' });
    } catch (error: any) {
      console.error('Failed to refresh (http)', error);
      res.status(500).json({ ok: false, error: error.message || String(error) });
    }
  }
);

// Create a Firestore `users/{uid}` document when a new Firebase Auth user is created.
// This ensures the frontend can read `users/{uid}.role` immediately after signup.
export const createUserDoc = functionsV1.auth.user().onCreate(async (user: any) => {
  try {
    const userDoc = db.doc(`users/${user.uid}`);
    await userDoc.set({
      email: user.email || null,
      displayName: user.displayName || null,
      role: 'USER',
      createdAt: FieldValue.serverTimestamp()
    }, { merge: true });
    console.log(`Created users/${user.uid} document`);
  } catch (err) {
    console.error('Failed to create user doc for', user.uid, err);
  }
});

// TRIGGER: cleanupUserData REMOVED per user request to preserve event history.

// Admin Callable Function to Delete Users
import { onCall, HttpsError } from "firebase-functions/v2/https";

export const deleteAccountAdmin = onCall(async (request) => {
  // 1. Verify Caller is Admin
  const callerUid = request.auth?.uid;
  if (!callerUid) {
    throw new HttpsError('unauthenticated', 'User must be logged in.');
  }

  const callerDoc = await db.collection('users').doc(callerUid).get();
  const callerData = callerDoc.data();

  if (!callerData || callerData.role !== 'ADMIN') {
    throw new HttpsError('permission-denied', 'Only admins can delete accounts.');
  }

  const targetUserId = request.data.targetUserId;
  if (!targetUserId) {
    throw new HttpsError('invalid-argument', 'Target User ID required.');
  }

  try {
    console.log(`Admin ${callerUid} deleting user ${targetUserId} (keeping data)...`);

    // 2. Archive User for potential future reconnection
    const targetUserDoc = await db.collection('users').doc(targetUserId).get();
    const targetUserData = targetUserDoc.data();

    if (targetUserData && targetUserData.email) {
      // Use Email as ID for easy lookup by new account
      await db.collection('archived_users').doc(targetUserData.email).set({
        originalUid: targetUserId,
        email: targetUserData.email,
        displayName: targetUserData.name || targetUserData.displayName || 'Unknown',
        deletedAt: FieldValue.serverTimestamp(),
        reconnectedToUid: null
      });
      console.log(`Archived user ${targetUserId} under email ${targetUserData.email}`);
    }

    // 3. Delete Auth User
    await admin.auth().deleteUser(targetUserId);

    // 4. Delete Firestore User Doc
    await db.collection('users').doc(targetUserId).delete();

    console.log(`Admin ${callerUid} deleted user ${targetUserId}. Data preserved.`);
    return { success: true };
  } catch (error: any) {
    console.error("Delete Account Error:", error);
    throw new HttpsError('internal', error.message || "Failed to delete user");
  }
});

export const toggleUserHistory = onCall(async (request) => {
  // 1. Verify Admin
  const callerUid = request.auth?.uid;
  if (!callerUid) throw new HttpsError('unauthenticated', 'User must be logged in.');
  const callerDoc = await db.collection('users').doc(callerUid).get();
  if (callerDoc.data()?.role !== 'ADMIN') throw new HttpsError('permission-denied', 'Only admins can toggle history.');

  const { targetUserId, email, action } = request.data; // action: 'CONNECT' | 'DISCONNECT'

  if (!targetUserId || !email || !action) {
    throw new HttpsError('invalid-argument', 'Missing targetUserId, email, or action.');
  }

  const archiveRef = db.collection('archived_users').doc(email);
  const archiveDoc = await archiveRef.get();

  if (!archiveDoc.exists) {
    throw new HttpsError('not-found', 'No archived history found for this email.');
  }

  const archiveData = archiveDoc.data();
  const originalUid = archiveData?.originalUid;

  if (!originalUid) throw new HttpsError('internal', 'Corrupt archive record.');

  const batch = db.batch();
  let count = 0;

  try {
    if (action === 'CONNECT') {
      // Transfer Old -> New
      if (archiveData?.reconnectedToUid && archiveData.reconnectedToUid !== targetUserId) {
        throw new HttpsError('failed-precondition', 'History already connected to another user.');
      }

      // 1. Events
      const events = await db.collection('events').where('ownerId', '==', originalUid).get();
      events.docs.forEach(doc => {
        batch.update(doc.ref, {
          ownerId: targetUserId,
          'meta.originalOwnerId': originalUid // breadcrumb for revert
        });
        count++;
      });

      // 2. Series
      const series = await db.collection('series').where('ownerId', '==', originalUid).get();
      series.docs.forEach(doc => {
        batch.update(doc.ref, {
          ownerId: targetUserId,
          'meta.originalOwnerId': originalUid
        });
        count++;
      });

      // 3. Songs (Requests)
      const songs = await db.collection('songs').where('requesterId', '==', originalUid).get();
      songs.docs.forEach(doc => {
        batch.update(doc.ref, {
          requesterId: targetUserId,
          'meta.originalRequesterId': originalUid
        });
        count++;
      });

      // Update Archive Status
      batch.update(archiveRef, { reconnectedToUid: targetUserId });

    } else if (action === 'DISCONNECT') {
      // Revert New -> Old (Only items that have the breadcrumb)

      // 1. Events
      const events = await db.collection('events')
        .where('ownerId', '==', targetUserId)
        .where('meta.originalOwnerId', '==', originalUid)
        .get();

      events.docs.forEach(doc => {
        batch.update(doc.ref, {
          ownerId: originalUid,
          'meta.originalOwnerId': FieldValue.delete()
        });
        count++;
      });

      // 2. Series
      const series = await db.collection('series')
        .where('ownerId', '==', targetUserId)
        .where('meta.originalOwnerId', '==', originalUid)
        .get();

      series.docs.forEach(doc => {
        batch.update(doc.ref, {
          ownerId: originalUid,
          'meta.originalOwnerId': FieldValue.delete()
        });
        count++;
      });

      // 3. Songs
      const songs = await db.collection('songs')
        .where('requesterId', '==', targetUserId)
        .where('meta.originalRequesterId', '==', originalUid)
        .get();

      songs.docs.forEach(doc => {
        batch.update(doc.ref, {
          requesterId: originalUid,
          'meta.originalRequesterId': FieldValue.delete()
        });
        count++;
      });

      // Update Archive Status
      batch.update(archiveRef, { reconnectedToUid: null });
    }

    if (count > 0 || action === 'DISCONNECT') {
      await batch.commit();
    }

    console.log(`History ${action} for ${targetUserId} / ${originalUid}. Moved ${count} items.`);
    return { success: true, count };

  } catch (error: any) {
    console.error("History Toggle Error:", error);
    throw new HttpsError('internal', error.message);
  }
});

export const wipeDatabaseAdmin = onCall(async (request) => {
  // 1. Verify Caller is Admin
  const callerUid = request.auth?.uid;
  if (!callerUid) {
    throw new HttpsError('unauthenticated', 'User must be logged in.');
  }

  const callerDoc = await db.collection('users').doc(callerUid).get();
  const callerData = callerDoc.data();
  if (!callerData || callerData.role !== 'ADMIN') {
    throw new HttpsError('permission-denied', 'Only admins can wipe database.');
  }

  try {
    // 2. Batch Delete Collections using firebase-tools helper logic style (recursive)
    // or manually iterate batches.

    // Delete Events
    const eventsRef = db.collection('events');
    const eventsSnapshot = await eventsRef.get();
    const eventBatch = db.batch();
    eventsSnapshot.docs.forEach((doc: any) => {
      eventBatch.delete(doc.ref);
    });
    // Note: If > 500 items, we need chunks. For MVP assume < 500 or just loop delete.
    // For robustness, let's use parallel deletes if large, but batch for atomicity is hard across collections.
    // Let's just do bulk delete promise all.

    const deletePromises: Promise<any>[] = [];
    eventsSnapshot.docs.forEach((doc: any) => deletePromises.push(doc.ref.delete()));

    // Delete Songs
    const songsRef = db.collection('songs');
    const songsSnapshot = await songsRef.get();
    songsSnapshot.docs.forEach((doc: any) => deletePromises.push(doc.ref.delete()));

    await Promise.all(deletePromises);

    console.log(`Admin ${callerUid} wiped ${eventsSnapshot.size} events and ${songsSnapshot.size} songs.`);
    return {
      success: true,
      deletedEvents: eventsSnapshot.size,
      deletedSongs: songsSnapshot.size
    };

  } catch (error: any) {
    console.error("Wipe Database Error:", error);
    throw new HttpsError('internal', error.message);
  }
});

export const updateEventAdmin = onCall(async (request) => {
  // 1. Verify Caller is Admin
  const callerUid = request.auth?.uid;
  if (!callerUid) {
    throw new HttpsError('unauthenticated', 'User must be logged in.');
  }

  const callerDoc = await db.collection('users').doc(callerUid).get();
  const callerData = callerDoc.data();
  if (!callerData || callerData.role !== 'ADMIN') {
    throw new HttpsError('permission-denied', 'Only admins can force update events.');
  }

  const { eventId, data } = request.data;
  if (!eventId || !data) {
    throw new HttpsError('invalid-argument', 'Event ID and Data required.');
  }

  try {
    // 2. Update Event
    await db.collection('events').doc(eventId).update(data);
    console.log(`Admin ${callerUid} force updated event ${eventId}`);
    return { success: true };
  } catch (error: any) {
    console.error("Update Event Error:", error);
    throw new HttpsError('internal', error.message);
  }
});
