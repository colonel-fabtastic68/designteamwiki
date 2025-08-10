import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useDarkMode } from '../contexts/DarkModeContext';
import { 
  LogOut, 
  Plus, 
  Settings, 
  Car, 
  Cpu, 
  Gauge, 
  Wind, 
  Building, 
  Wrench,
  Search,
  FileText,
  Calendar,
  User,
  Tag,
  Users,
  Clock,
  Shield,
  X,
  Flag,
  Eye
} from 'lucide-react';
import { collection, getDocs, query } from 'firebase/firestore';
import { db } from '../firebase';
import TeamMembersModal from './TeamMembersModal';
import AccountRequests from './AccountRequests';
import DarkModeToggle from './DarkModeToggle';

const subteams = [
  { id: 'driver-controls', name: 'Driver Controls', icon: Settings, color: 'bg-blue-500' },
  { id: 'chassis', name: 'Chassis', icon: Car, color: 'bg-red-400' },
  { id: 'electronics', name: 'Electronics', icon: Cpu, color: 'bg-amber-700' },
  { id: 'vehicle-dynamics', name: 'Vehicle Dynamics', icon: Gauge, color: 'bg-green-500' },
  { id: 'aerodynamics', name: 'Aerodynamics', icon: Wind, color: 'bg-sky-400' },
  { id: 'business', name: 'Business', icon: Building, color: 'bg-green-700' },
  { id: 'powertrain', name: 'Powertrain', icon: Wrench, color: 'bg-red-800' },
  { id: 'general', name: 'General', icon: Users, color: 'bg-gray-400' }
];

const teamsWithMembers = ['driver-controls', 'chassis', 'electronics', 'vehicle-dynamics', 'aerodynamics', 'business', 'powertrain'];

// Competition date - May 12th, 2026
const COMPETITION_DATE = new Date('2026-05-12T00:00:00');

function Dashboard() {
  const { logout, isCaptain, isGuest, guestLogout } = useAuth();
  const { isDarkMode } = useDarkMode();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [allDocuments, setAllDocuments] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [showTeamMembersModal, setShowTeamMembersModal] = useState(false);
  const [selectedSubteam, setSelectedSubteam] = useState(null);
  const [countdown, setCountdown] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  const [showAccountRequests, setShowAccountRequests] = useState(false);
  const [userNameMap, setUserNameMap] = useState({});

  const handleLogout = async () => {
    try {
      setLoading(true);
      if (isGuest) {
        await guestLogout();
      } else {
        await logout();
      }
      navigate('/login');
    } catch (error) {
      console.error('Failed to log out:', error);
    }
    setLoading(false);
  };

  const handleCreateNew = () => {
    navigate('/create');
  };

  const handleSubteamClick = (subteamId) => {
    navigate(`/subteam/${subteamId}`);
  };

  const handleViewMembersClick = (subteamId) => {
    setSelectedSubteam(subteamId);
    setShowTeamMembersModal(true);
  };

  const handleCloseTeamMembersModal = () => {
    setShowTeamMembersModal(false);
    setSelectedSubteam(null);
  };

  const handleAccountRequests = () => {
    setShowAccountRequests(true);
  };

  const handleCloseAccountRequests = () => {
    setShowAccountRequests(false);
  };

  const handleFeedback = () => {
    window.open('https://forms.gle/rHjPYdH39xNqTPmz5', '_blank');
  };

  // Countdown timer effect
  useEffect(() => {
    const updateCountdown = () => {
      const now = new Date();
      const timeLeft = COMPETITION_DATE - now;

      if (timeLeft > 0) {
        const days = Math.floor(timeLeft / (1000 * 60 * 60 * 24));
        const hours = Math.floor((timeLeft % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((timeLeft % (1000 * 60)) / 1000);

        setCountdown({ days, hours, minutes, seconds });
      } else {
        setCountdown({ days: 0, hours: 0, minutes: 0, seconds: 0 });
      }
    };

    // Update immediately
    updateCountdown();
    
    // Update every second
    const interval = setInterval(updateCountdown, 1000);

    return () => clearInterval(interval);
  }, []);

  // Load all documents for search
  useEffect(() => {
    const loadAllDocuments = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, 'documents'));
        const docs = [];
        querySnapshot.forEach((doc) => {
          docs.push({ id: doc.id, ...doc.data() });
        });
        setAllDocuments(docs);
      } catch (error) {
        console.error('Error loading documents for search:', error);
      }
    };

    loadAllDocuments();
    loadUserNames();
  }, []);

  // Search function
  const performSearch = (query) => {
    if (!query.trim()) {
      setSearchResults([]);
      setShowSearchResults(false);
      return;
    }

    const searchTerm = query.toLowerCase();
    const results = allDocuments.filter(doc => {
      // Search in title
      if (doc.title && doc.title.toLowerCase().includes(searchTerm)) return true;
      
      // Search in serial number
      if (doc.serialNumber && doc.serialNumber.toLowerCase().includes(searchTerm)) return true;
      
      // Search in tags
      if (doc.tag) {
        const tags = Array.isArray(doc.tag) ? doc.tag : [doc.tag];
        if (tags.some(tag => tag.toLowerCase().includes(searchTerm))) return true;
      }
      
      // Search in content
      if (doc.content && doc.content.toLowerCase().includes(searchTerm)) return true;
      
      // Search in author
      if (doc.author && doc.author.toLowerCase().includes(searchTerm)) return true;
      
      return false;
    });

    setSearchResults(results);
    setShowSearchResults(true);
  };

  const handleSearch = (e) => {
    e.preventDefault();
    setIsSearching(true);
    performSearch(searchQuery);
    setIsSearching(false);
    // Keep the search results visible after Enter
    setShowSearchResults(true);

    // If there's exactly one search result, navigate to it
    if (searchResults.length === 1) {
      navigate(`/document/${searchResults[0].id}`);
    }
  };

  const handleSearchInputChange = (e) => {
    const query = e.target.value;
    setSearchQuery(query);
    
    // Perform real-time search as user types
    if (query.trim()) {
      performSearch(query);
    } else {
      setSearchResults([]);
      setShowSearchResults(false);
    }
  };

  const handleSearchInputBlur = () => {
    // Hide search results after a short delay to allow clicking on results
    setTimeout(() => {
      setShowSearchResults(false);
    }, 200);
  };

  const handleResultClick = (docId) => {
    navigate(`/document/${docId}`);
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return 'Unknown date';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const loadUserNames = async () => {
    try {
      const usersQuery = query(collection(db, 'users'));
      const usersSnapshot = await getDocs(usersQuery);
      const emailToNameMap = {};
      
      usersSnapshot.forEach((userDoc) => {
        const userData = userDoc.data();
        if (userData.email && userData.fullName) {
          emailToNameMap[userData.email] = userData.fullName;
        }
      });
      
      setUserNameMap(emailToNameMap);
    } catch (error) {
      console.error('Error loading user names:', error);
    }
  };

  const getAuthorDisplayName = (author) => {
    // If it's already a name (not an email), return as is
    if (!author.includes('@')) {
      return author;
    }
    
    // If it's an email, try to convert to name
    return userNameMap[author] || author;
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 relative transition-colors">
      {/* Header */}
      <header className="bg-white dark:bg-gray-900 shadow-sm border-b border-gray-200 dark:border-gray-800 transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white transition-colors">49ers Racing Wiki</h1>
            </div>
            <div className="flex items-center space-x-4">
              {!isGuest && (
                <button
                  onClick={handleCreateNew}
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
                  <Plus className="h-4 w-4 mr-2" />
                  Create New Doc
                </button>
              )}
              {isGuest && (
                <div className="inline-flex items-center px-3 py-2 border border-green-300 text-sm font-medium rounded-md text-green-700 bg-green-50">
                  <Eye className="h-4 w-4 mr-2" />
                  Guest Mode (View Only)
                </div>
              )}
              <button
                onClick={handleLogout}
                disabled={loading}
                className="inline-flex items-center px-3 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors"
              >
                <LogOut className="h-4 w-4 mr-2" />
                {isGuest ? 'Exit Guest Mode' : 'Logout'}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          {/* Search Section */}
          <div className="mb-8 relative">
            
            <form onSubmit={handleSearch} className="relative">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search className="h-5 w-5 text-gray-400 dark:text-gray-500" />
                </div>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={handleSearchInputChange}
                  onBlur={handleSearchInputBlur}
                  placeholder="Search for documents (e.g., KB20001, 'wheels', 'aerodynamics', 'title')..."
                  className="block w-full pl-10 pr-3 py-3 border border-gray-300 dark:border-gray-600 rounded-lg leading-5 bg-white dark:bg-gray-800 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:placeholder-gray-400 dark:focus:placeholder-gray-500 focus:ring-2 text-lg text-gray-900 dark:text-white transition-colors"
                  style={{
                    '--tw-ring-color': '#a49665',
                    '--tw-border-opacity': '1'
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = '#a49665';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = isDarkMode ? '#4B5563' : '#D1D5DB';
                  }}
                />
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                  {isSearching && (
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-49ers-red"></div>
                  )}
                </div>
              </div>
            </form>

            {/* Search Results */}
            {showSearchResults && searchResults.length > 0 && (
              <div className="absolute top-full left-0 right-0 z-50 bg-white dark:bg-gray-900 shadow-xl rounded-lg border border-gray-200 dark:border-gray-800 max-h-96 overflow-y-auto transition-colors">
                <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                  <h3 className="text-md font-medium text-gray-900 dark:text-white transition-colors">
                    Search Results ({searchResults.length})
                  </h3>
                </div>
                <div className="divide-y divide-gray-200 dark:divide-gray-800">
                  {searchResults.map((doc) => {
                    const subteam = subteams.find(s => s.id === doc.subteam);
                    const IconComponent = subteam?.icon;
                    return (
                      <div
                        key={doc.id}
                        onClick={() => handleResultClick(doc.id)}
                        className="p-4 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer transition-colors duration-150"
                      >
                        <div className="flex items-start space-x-3">
                          {/* Subteam Icon */}
                          {subteam && IconComponent && (
                            <div className={`flex-shrink-0 w-10 h-10 rounded-lg ${subteam.color} flex items-center justify-center`}>
                              <IconComponent className="h-5 w-5 text-white" />
                            </div>
                          )}
                          
                          <div className="flex-1">
                            {/* Title and Serial Number */}
                            <div className="mb-2">
                              {doc.title && (
                                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1 transition-colors">
                                  {doc.title}
                                </h3>
                              )}
                              {doc.serialNumber && (
                                <p className="text-lg font-mono font-semibold text-gray-700 dark:text-gray-300 transition-colors">
                                  {doc.serialNumber}
                                </p>
                              )}
                            </div>

                            {/* Tags */}
                            {doc.tag && (
                              <div className="flex flex-wrap gap-1 mb-2">
                                {Array.isArray(doc.tag) ? (
                                  doc.tag.map((tag, index) => (
                                    <span key={index} className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                                      <Tag className="h-3 w-3 mr-1" />
                                      {tag}
                                    </span>
                                  ))
                                ) : (
                                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                                    <Tag className="h-3 w-3 mr-1" />
                                    {doc.tag}
                                  </span>
                                )}
                              </div>
                            )}

                            {/* Content Preview */}
                            {doc.content && (
                              <p className="text-gray-600 dark:text-gray-400 text-sm mb-2 line-clamp-2 transition-colors">
                                {doc.content.substring(0, 120)}
                                {doc.content.length > 120 && '...'}
                              </p>
                            )}

                            {/* Metadata */}
                            <div className="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400 transition-colors">
                              <div className="flex items-center space-x-4">
                                <div className="flex items-center">
                                  <Calendar className="h-4 w-4 mr-1" />
                                  {formatDate(doc.createdAt)}
                                </div>
                                <div className="flex items-center">
                                  <User className="h-4 w-4 mr-1" />
                                  {getAuthorDisplayName(doc.author)}
                                </div>
                              </div>
                              <div className="flex items-center">
                                <FileText className="h-4 w-4 mr-1" />
                                {subteam?.name || doc.subteam}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Subteams Section */}
          <div className="mb-8">
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {subteams.map((subteam) => {
                const IconComponent = subteam.icon;
                return (
                  <div
                    key={subteam.id}
                    onClick={() => handleSubteamClick(subteam.id)}
                    className="bg-white dark:bg-gray-900 overflow-hidden shadow rounded-lg hover:shadow-md transition-shadow duration-200 cursor-pointer border border-gray-200 dark:border-gray-800 transition-colors"
                  >
                    <div className="p-6">
                      <div className="flex items-center">
                        <div className={`flex-shrink-0 w-12 h-12 rounded-lg ${subteam.color} flex items-center justify-center`}>
                          <IconComponent className="h-6 w-6 text-white" />
                        </div>
                        <div className="ml-4">
                          <h3 className="text-lg font-medium text-gray-900 dark:text-white transition-colors">
                            {subteam.name}
                          </h3>
                          <p className="text-sm text-gray-500 dark:text-gray-400 transition-colors">
                            View documentation
                          </p>
                        </div>
                      </div>
                      {teamsWithMembers.includes(subteam.id) && (
                        <div className="mt-4 flex justify-end">
                          <button
                            onClick={(e) => {
                              e.stopPropagation(); // Prevent subteam click from triggering
                              handleViewMembersClick(subteam.id);
                            }}
                            className="inline-flex items-center justify-center w-8 h-8 rounded-full border border-gray-300 text-gray-600 hover:text-gray-800 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-colors"
                            title="View team members"
                          >
                            <Users className="h-4 w-4" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </main>

      {/* Feedback Button - Bottom Left Corner */}
      <div className="fixed bottom-20 left-4 z-50">
        <button
          onClick={handleFeedback}
          className="inline-flex items-center justify-center w-10 h-10 bg-orange-500 hover:bg-orange-600 text-white rounded-full shadow-lg hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 transition-all duration-200 transform hover:scale-105"
          title="Send Feedback"
        >
          <Flag className="h-5 w-5" />
        </button>
      </div>

      {/* Countdown Timer - Bottom Left Corner */}
      <div className="fixed bottom-4 left-4 z-50">
        <div className="bg-white dark:bg-gray-900 rounded-lg shadow-lg border border-gray-200 dark:border-gray-800 px-3 py-2 transition-colors">
          <div className="flex items-center space-x-2">
            <Clock className="h-4 w-4 text-gray-500 dark:text-gray-400" />
            <div className="text-xs text-gray-600 dark:text-gray-300">
              <div className="font-mono text-gray-800 dark:text-gray-200">
                {countdown.days}d {countdown.hours.toString().padStart(2, '0')}h {countdown.minutes.toString().padStart(2, '0')}m {countdown.seconds.toString().padStart(2, '0')}s
              </div>
              <div className="text-gray-500 dark:text-gray-400 text-xs mt-1">
                designed by Baker Cobb
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Version Number - Bottom Right Corner */}
      <div className="fixed bottom-4 right-20 z-50">
        <div className="text-xs text-gray-500 dark:text-gray-400 font-mono transition-colors">
                              v1.0.2
        </div>
      </div>

      {/* Dark Mode Toggle */}
      <DarkModeToggle />

      {/* Floating Account Requests Button - Bottom Right Corner */}
      {isCaptain() && !isGuest && (
        <div className="fixed bottom-4 right-16 z-50">
          <button
            onClick={handleAccountRequests}
            className="inline-flex items-center justify-center w-14 h-14 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-lg hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-200 transform hover:scale-105"
            title="Account Management"
          >
            <Shield className="h-6 w-6" />
          </button>
        </div>
      )}

      {/* Team Members Modal */}
      <TeamMembersModal
        isOpen={showTeamMembersModal}
        subteamId={selectedSubteam}
        onClose={handleCloseTeamMembersModal}
      />

      {/* Account Requests Modal */}
      {showAccountRequests && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-hidden">
            {/* Header */}
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <div className="flex items-center">
                <Shield className="h-6 w-6 text-gray-600 mr-3" />
                <h2 className="text-xl font-semibold text-gray-900">
                  Account Management
                </h2>
              </div>
              <button
                onClick={handleCloseAccountRequests}
                className="inline-flex items-center px-3 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Content */}
            <div className="px-6 py-6 overflow-y-auto max-h-[calc(90vh-120px)]">
              <AccountRequests />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Dashboard; 