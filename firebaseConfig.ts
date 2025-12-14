import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyAzqQHR766ju98ZsvGQ9wF_DSeQvXoea1g",
  authDomain: "passtheaux-f0585.firebaseapp.com",
  projectId: "passtheaux-f0585",
  storageBucket: "passtheaux-f0585.firebasestorage.app",
  messagingSenderId: "903610325003",
  appId: "1:903610325003:web:8c2b07b1fb02a10d14cf0e",
  measurementId: "G-X69Y5B9T4P"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
export const storage = getStorage(app);
