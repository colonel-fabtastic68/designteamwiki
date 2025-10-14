import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { ArrowLeft, User, Calendar } from 'lucide-react';

function PublicPortfolio() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [portfolio, setPortfolio] = useState(null);
  const [notFound, setNotFound] = useState(false);

  const loadPortfolio = useCallback(async () => {
    setLoading(true);
    setNotFound(false);

    try {
      // First, look up the user ID from the slug
      const slugRef = doc(db, 'portfolio-slugs', slug);
      const slugDoc = await getDoc(slugRef);

      if (!slugDoc.exists()) {
        setNotFound(true);
        setLoading(false);
        return;
      }

      const userId = slugDoc.data().userId;

      // Then get the portfolio data
      const portfolioRef = doc(db, 'portfolios', userId);
      const portfolioDoc = await getDoc(portfolioRef);

      if (!portfolioDoc.exists()) {
        setNotFound(true);
        setLoading(false);
        return;
      }

      setPortfolio(portfolioDoc.data());
    } catch (error) {
      console.error('Error loading portfolio:', error);
      setNotFound(true);
    }

    setLoading(false);
  }, [slug]);

  useEffect(() => {
    loadPortfolio();
  }, [loadPortfolio]);

  const formatDate = (timestamp) => {
    if (!timestamp) return '';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 dark:border-white"></div>
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">Portfolio Not Found</h1>
          <p className="text-gray-600 dark:text-gray-400 mb-8">
            The portfolio you're looking for doesn't exist or has been removed.
          </p>
          <button
            onClick={() => navigate('/')}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors"
            style={{
              backgroundColor: '#a49665',
              '--tw-ring-color': '#a49665'
            }}
            onMouseEnter={(e) => {
              e.target.style.backgroundColor = '#8a7d4f';
            }}
            onMouseLeave={(e) => {
              e.target.style.backgroundColor = '#a49665';
            }}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 transition-colors">
      {/* Header */}
      <header className="bg-white dark:bg-gray-900 shadow-sm border-b border-gray-200 dark:border-gray-800">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <button
              onClick={() => navigate('/')}
              className="inline-flex items-center px-3 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-colors"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </button>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">49ers Racing</h1>
            <div className="w-20"></div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
        <div className="bg-white dark:bg-gray-900 shadow-lg rounded-lg overflow-hidden">
          {/* Portfolio Header */}
          <div className="bg-gradient-to-r from-gray-700 to-gray-900 px-8 py-12">
            <div className="flex items-center space-x-4">
              <div className="w-20 h-20 rounded-full bg-white dark:bg-gray-800 flex items-center justify-center">
                <User className="h-10 w-10 text-gray-600 dark:text-gray-400" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-white mb-2">
                  {portfolio.userEmail.split('@')[0]}
                </h1>
                <p className="text-gray-300 text-sm">
                  49ers Racing Team Member
                </p>
              </div>
            </div>
          </div>

          {/* Portfolio Content */}
          <div className="px-8 py-8">
            <div 
              className="portfolio-content prose prose-lg dark:prose-invert max-w-none text-gray-700 dark:text-gray-300"
              dangerouslySetInnerHTML={{ __html: portfolio.content }}
            />

            {/* Metadata */}
            {portfolio.updatedAt && (
              <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-800">
                <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
                  <Calendar className="h-4 w-4 mr-2" />
                  Last updated: {formatDate(portfolio.updatedAt)}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center text-sm text-gray-500 dark:text-gray-400">
          <p>Charlotte 49ers Racing - Formula SAE Electric</p>
        </div>
      </main>
    </div>
  );
}

export default PublicPortfolio;

