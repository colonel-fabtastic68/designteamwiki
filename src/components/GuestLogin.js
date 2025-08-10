import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Eye, Loader, ArrowLeft } from 'lucide-react';

function GuestLogin() {
  const [teamPassword, setTeamPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { guestLogin } = useAuth();
  const navigate = useNavigate();

  const handleBackToLogin = () => {
    navigate('/login');
  };

  async function handleSubmit(e) {
    e.preventDefault();

    try {
      setError('');
      setLoading(true);
      await guestLogin(teamPassword);
      navigate('/');
    } catch (error) {
      console.error('Guest login error:', error);
      setError('Invalid team password. Please try again.');
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
          
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2 transition-colors">Guest Access</h2>
          <p className="text-gray-600 dark:text-gray-400 transition-colors">View-only access to team documentation</p>
        </div>
        
        <div className="bg-white dark:bg-gray-900 rounded-xl shadow-lg border border-gray-100 dark:border-gray-800 p-8 transition-colors">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
              {error}
            </div>
          )}
          
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="teamPassword" className="block text-sm font-medium text-gray-700 mb-2">
                Team Password
              </label>
              <input
                id="teamPassword"
                type="password"
                required
                value={teamPassword}
                onChange={(e) => setTeamPassword(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                placeholder="Enter team password"
              />
            </div>
            
            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? (
                <Loader className="h-5 w-5 animate-spin" />
              ) : (
                <>
                  <Eye className="h-5 w-5 mr-2" />
                  Access as Guest
                </>
              )}
            </button>
          </form>
          
          <div className="mt-6 pt-6 border-t border-gray-200">
            <button
              onClick={handleBackToLogin}
              className="w-full flex justify-center items-center py-3 px-4 border border-gray-300 rounded-lg shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-colors"
            >
              <ArrowLeft className="h-5 w-5 mr-2" />
              Back to Login
            </button>
          </div>
        </div>
        
        <div className="text-center">
          <p className="text-sm text-gray-500 dark:text-gray-400 transition-colors">
            Guest access is view-only. No editing capabilities.
          </p>
        </div>
      </div>
    </div>
  );
}

export default GuestLogin; 