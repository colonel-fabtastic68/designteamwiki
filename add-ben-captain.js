// Script to add Ben as a captain in the database
// Run this in the browser console or as a Node.js script

const { initializeApp } = require('firebase/app');
const { getFirestore, doc, setDoc, serverTimestamp } = require('firebase/firestore');

// Your Firebase config
const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.REACT_APP_FIREBASE_APP_ID
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function addBenAsCaptain() {
  try {
    // Ben's Firebase Auth UID
    const benUID = 'IWCMut35XJYx9mYk48wfSHWi5Fo1';
    
    // Create captain user document
    await setDoc(doc(db, 'users', benUID), {
      email: 'ben@example.com', // You'll need to update this with Ben's actual email
      firstName: 'Ben',
      lastName: 'Captain',
      fullName: 'Ben Captain',
      role: 'captain',
      subteam: 'general',
      status: 'active',
      createdAt: serverTimestamp(),
      approvedAt: serverTimestamp(),
      firebaseUID: benUID
    });
    
    console.log('Ben has been added as a captain successfully!');
    console.log('Note: You may need to update the email address with Ben\'s actual email.');
  } catch (error) {
    console.error('Error adding Ben as captain:', error);
  }
}

addBenAsCaptain(); 