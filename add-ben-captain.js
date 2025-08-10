// Script to add Ben as a captain in the database
// Run this in the browser console or as a Node.js script

const { initializeApp } = require('firebase/app');
const { getFirestore, doc, setDoc, serverTimestamp } = require('firebase/firestore');

// Your Firebase config
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