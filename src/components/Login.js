import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { LogIn, Loader, UserPlus, Mail, Eye } from 'lucide-react';

function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const { login, resetPassword } = useAuth();
  const navigate = useNavigate();

  const handleRequestAccount = () => {
    navigate('/request-account');
  };

  const handleGuestAccess = () => {
    navigate('/guest');
  };

  const handlePasswordReset = async () => {
    if (!email) {
      setError('Please enter your email address first.');
      return;
    }

    try {
      setResetLoading(true);
      setError('');
      await resetPassword(email);
      setResetSent(true);
    } catch (error) {
      console.error('Password reset error:', error);
      if (error.code === 'auth/user-not-found') {
        setError('No account found with this email address.');
      } else if (error.code === 'auth/invalid-email') {
        setError('Invalid email address.');
      } else {
        setError('Failed to send password reset email. Please try again.');
      }
    } finally {
      setResetLoading(false);
    }
  };

  async function handleSubmit(e) {
    e.preventDefault();

    try {
      setError('');
      setResetSent(false);
      setLoading(true);
      await login(email, password);
      navigate('/');
    } catch (error) {
      console.error('Login error:', error);
      if (error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
        setError('Incorrect password. Please try again.');
      } else if (error.code === 'auth/user-not-found') {
        setError('Account not found. Please check your email address or request an account.');
      } else if (error.code === 'auth/invalid-email') {
        setError('Invalid email address. Please check your email.');
      } else if (error.code === 'auth/too-many-requests') {
        setError('Too many failed attempts. Please try again later.');
      } else {
        setError('Failed to sign in. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950 transition-colors">
      <div className="max-w-md w-full space-y-8 p-8">
        <div className="text-center">
          {/* 49ers Racing IC Logo */}
          <div className="mx-auto mb-8">
            <div className="mx-auto h-24 w-24 bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center mb-4">
              <span className="text-2xl font-bold text-gray-600 dark:text-gray-300">49</span>
            </div>
          </div>
          
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2 transition-colors">Design Team Wiki</h2>
          <p className="text-gray-600 dark:text-gray-400 transition-colors">Sign in to access team documentation</p>
        </div>
        
        <div className="bg-white dark:bg-gray-900 rounded-xl shadow-lg border border-gray-100 dark:border-gray-800 p-8 transition-colors">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
              <div className="flex flex-col space-y-3">
                <p>{error}</p>
                {error.includes('Incorrect password') && (
                  <button
                    onClick={handlePasswordReset}
                    disabled={resetLoading || resetSent}
                    className="flex items-center justify-center px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {resetLoading ? (
                      <Loader className="h-4 w-4 animate-spin mr-2" />
                    ) : resetSent ? (
                      <>
                        <Mail className="h-4 w-4 mr-2" />
                        Reset Email Sent
                      </>
                    ) : (
                      <>
                        <Mail className="h-4 w-4 mr-2" />
                        Reset Password
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          )}
          
          {resetSent && !error && (
            <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg mb-6">
              <div className="flex items-center">
                <Mail className="h-5 w-5 mr-2" />
                <p>Password reset email sent! Check your inbox and follow the link to reset your password.</p>
              </div>
            </div>
          )}
          
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                Email Address
              </label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                placeholder="Enter your email"
              />
            </div>
            
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                Password
              </label>
              <input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                placeholder="Enter your password"
              />
            </div>
            
            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? (
                <Loader className="h-5 w-5 animate-spin" />
              ) : (
                <>
                  <LogIn className="h-5 w-5 mr-2" />
                  Sign In
                </>
              )}
            </button>
          </form>
          
          <div className="mt-6 pt-6 border-t border-gray-200 space-y-3">
            <button
              onClick={handleRequestAccount}
              className="w-full flex justify-center items-center py-3 px-4 border border-gray-300 rounded-lg shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-colors"
            >
              <UserPlus className="h-5 w-5 mr-2" />
              Request Account
            </button>
            <button
              onClick={handleGuestAccess}
              className="w-full flex justify-center items-center py-3 px-4 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-colors"
            >
              <Eye className="h-5 w-5 mr-2" />
              Guest Access (View Only)
            </button>
          </div>
        </div>
        
        <div className="text-center">
          <p className="text-sm text-gray-500 dark:text-gray-400 transition-colors">
            © 2024 49ers Racing IC Design Team
          </p>
        </div>
      </div>
    </div>
  );
}

export default Login; 