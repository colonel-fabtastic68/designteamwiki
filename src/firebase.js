import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

// Firebase configuration for 49ers Racing Wiki
const firebaseConfig = {
  apiKey: "AIzaSyC7PDRoe7hiaEgnpZWTrHJmnddboY20tsA",
  authDomain: "designteam-d7406.firebaseapp.com",
  projectId: "designteam-d7406",
  storageBucket: "designteam-d7406.firebasestorage.app",
  messagingSenderId: "948857435235",
  appId: "1:948857435235:web:a68909d3cb679bd3853456"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

export default app; 