import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail
} from 'firebase/auth';
import { doc, getDoc, query, where, getDocs, collection } from 'firebase/firestore';
import { auth, db } from '../firebase';

const AuthContext = createContext();

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isGuest, setIsGuest] = useState(false);

  function signup(email, password) {
    return createUserWithEmailAndPassword(auth, email, password);
  }

  function login(email, password) {
    return signInWithEmailAndPassword(auth, email, password);
  }

  function logout() {
    return signOut(auth);
  }

  function resetPassword(email) {
    return sendPasswordResetEmail(auth, email);
  }

  function guestLogin(teamPassword) {
    if (teamPassword === '2under6bird49') {
      setIsGuest(true);
      return Promise.resolve();
    } else {
      return Promise.reject(new Error('Invalid team password'));
    }
  }

  function guestLogout() {
    setIsGuest(false);
    return Promise.resolve();
  }





  // Check if user is captain (has captain role)
  const isCaptain = () => {
    return userData?.role === 'captain';
  };

  // Check if user is team lead (has team lead role)
  const isTeamLead = () => {
    return userData?.role === 'team-lead';
  };

  // Check if user can delete documents (captain or team lead)
  const canDeleteDocuments = () => {
    return userData?.role === 'captain' || userData?.role === 'team-lead';
  };

  // Check if user is authenticated (either logged in or guest)
  const isAuthenticated = () => {
    return currentUser || isGuest;
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      
      if (user) {
        try {
          // Get user data from Firestore using UID
          const userDoc = await getDoc(doc(db, 'users', user.uid));
          if (userDoc.exists()) {
            setUserData(userDoc.data());
          } else {
            // Fallback: try to find by email
            const emailQuery = query(
              collection(db, 'users'),
              where('email', '==', user.email)
            );
            const emailSnapshot = await getDocs(emailQuery);
            if (!emailSnapshot.empty) {
              setUserData(emailSnapshot.docs[0].data());
            } else {
              setUserData(null);
            }
          }
        } catch (error) {
          console.error('Error fetching user data:', error);
          setUserData(null);
        }
      } else {
        setUserData(null);
      }
      
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const value = {
    currentUser,
    userData,
    isGuest,
    isCaptain,
    isTeamLead,
    canDeleteDocuments,
    isAuthenticated,
    signup,
    login,
    logout,
    resetPassword,
    guestLogin,
    guestLogout
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
} 