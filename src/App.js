import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { DarkModeProvider } from './contexts/DarkModeContext';
import Login from './components/Login';
import GuestLogin from './components/GuestLogin';
import RequestAccount from './components/RequestAccount';
import Dashboard from './components/Dashboard';
import SubteamPosts from './components/SubteamPosts';
import DocumentView from './components/DocumentView';
import CreateDocument from './components/CreateDocument';
import AdminPanel from './components/AdminPanel';

// Protected Route Component
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated } = useAuth();
  return isAuthenticated() ? children : <Navigate to="/login" />;
};

// Authenticated User Route Component (no guests)
const AuthenticatedUserRoute = ({ children }) => {
  const { currentUser } = useAuth();
  return currentUser ? children : <Navigate to="/login" />;
};

function App() {
  return (
    <DarkModeProvider>
      <AuthProvider>
        <Router>
          <div className="min-h-screen bg-gray-50 dark:bg-gray-950 transition-colors">
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/guest" element={<GuestLogin />} />
              <Route path="/request-account" element={<RequestAccount />} />
              <Route path="/admin" element={<AdminPanel />} />
              <Route 
                path="/" 
                element={
                  <ProtectedRoute>
                    <Dashboard />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/subteam/:subteamId" 
                element={
                  <ProtectedRoute>
                    <SubteamPosts />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/document/:documentId" 
                element={
                  <ProtectedRoute>
                    <DocumentView />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/create" 
                element={
                  <AuthenticatedUserRoute>
                    <CreateDocument />
                  </AuthenticatedUserRoute>
                } 
              />
              <Route 
                path="/create/:subteamId" 
                element={
                  <AuthenticatedUserRoute>
                    <CreateDocument />
                  </AuthenticatedUserRoute>
                } 
              />
            </Routes>
          </div>
        </Router>
      </AuthProvider>
    </DarkModeProvider>
  );
}

export default App; 