// Script to create a captain user in the database
// Run this in the browser console or as a Node.js script

const { initializeApp } = require('firebase/app');
const { getFirestore, doc, setDoc, serverTimestamp } = require('firebase/firestore');

// Your Firebase config (replace with your actual config)
const firebaseConfig = {
  // Add your Firebase config here
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function createCaptain() {
  try {
    // Create captain user document
    await setDoc(doc(db, 'users', 'captain@example.com'), {
      email: 'captain@example.com',
      firstName: 'Team',
      lastName: 'Captain',
      fullName: 'Team Captain',
      role: 'captain',
      subteam: 'general',
      status: 'active',
      createdAt: serverTimestamp(),
      approvedAt: serverTimestamp()
    });
    
    console.log('Captain user created successfully!');
  } catch (error) {
    console.error('Error creating captain user:', error);
  }
}

createCaptain(); 