import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useDarkMode } from '../contexts/DarkModeContext';
import { 
  ArrowLeft, 
  Plus, 
  FileText, 
  Paperclip,
  Calendar,
  User,
  RefreshCw,
  Pin,
  ChevronDown,
  ChevronRight,
  Image
} from 'lucide-react';
import { 
  collection, 
  getDocs, 
  query, 
  where, 
  orderBy,
  updateDoc,
  doc
} from 'firebase/firestore';
import { db } from '../firebase';
import DarkModeToggle from './DarkModeToggle';

const subteamNames = {
  'driver-controls': 'Driver Controls',
  'chassis': 'Chassis',
  'electronics': 'Electronics',
  'vehicle-dynamics': 'Vehicle Dynamics',
  'aerodynamics': 'Aerodynamics',
  'business': 'Business',
  'powertrain': 'Powertrain',
  'general': 'General'
};

const subteamColors = {
  'driver-controls': 'bg-blue-500',
  'chassis': 'bg-red-400',
  'electronics': 'bg-amber-700',
  'vehicle-dynamics': 'bg-green-500',
  'aerodynamics': 'bg-sky-400',
  'business': 'bg-green-700',
  'powertrain': 'bg-red-800',
  'general': 'bg-gray-400'
};

// Function to get subteam hex color for dynamic styling
const getSubteamHexColor = (subteamId) => {
  if (!subteamId) return '#AA0000'; // 49ers red fallback
  
  // Map color classes to hex values
  const colorMap = {
    'bg-blue-500': '#3B82F6',
    'bg-red-400': '#F87171',
    'bg-amber-700': '#A16207',
    'bg-green-500': '#10B981',
    'bg-sky-400': '#38BDF8',
    'bg-green-700': '#047857',
    'bg-red-800': '#991B1B',
    'bg-gray-400': '#9CA3AF'
  };
  
  return colorMap[subteamColors[subteamId]] || '#AA0000';
};

// Function to get darker hover color
const getSubteamHoverColor = (subteamId) => {
  if (!subteamId) return '#DC2626'; // red-600 fallback
  
  const colorMap = {
    'bg-blue-500': '#2563EB', // blue-600
    'bg-red-400': '#EF4444', // red-500
    'bg-amber-700': '#92400E', // amber-600
    'bg-green-500': '#059669', // green-600
    'bg-sky-400': '#0EA5E9', // sky-500
    'bg-green-700': '#065F46', // green-600
    'bg-red-800': '#DC2626', // red-600
    'bg-gray-400': '#6B7280' // gray-500
  };
  
  return colorMap[subteamColors[subteamId]] || '#DC2626';
};

function SubteamPosts() {
  const { subteamId } = useParams();
  const navigate = useNavigate();
  const { isDarkMode } = useDarkMode();

  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedFilters, setSelectedFilters] = useState([]);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [pinnedSectionOpen, setPinnedSectionOpen] = useState(true);
  const [userNameMap, setUserNameMap] = useState({});

  // Helper functions for file handling
  const getFileType = (fileUrl) => {
    // Decode URL-encoded filename and extract extension
    const decodedUrl = decodeURIComponent(fileUrl);
    const filename = decodedUrl.split('/').pop().split('?')[0];
    const extension = filename.split('.').pop().toLowerCase();
    
    console.log('File type detection (SubteamPosts):', { fileUrl, decodedUrl, filename, extension });
    
    if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(extension)) return 'image';
    if (extension === 'pdf') return 'pdf';
    if (['doc', 'docx'].includes(extension)) return 'document';
    if (['xls', 'xlsx'].includes(extension)) return 'spreadsheet';
    if (['ppt', 'pptx'].includes(extension)) return 'presentation';
    if (['zip', 'rar', '7z'].includes(extension)) return 'archive';
    return 'other';
  };

  const isImageFile = (fileUrl) => {
    return getFileType(fileUrl) === 'image';
  };

  const getImageAttachments = (attachments) => {
    if (!attachments || !Array.isArray(attachments)) return [];
    return attachments.filter(attachment => isImageFile(attachment));
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

  const loadDocuments = useCallback(async () => {
    try {
      setLoading(true);
      console.log('Loading documents for subteam:', subteamId);
      
      let querySnapshot;
      
      try {
        // Try the optimized query with composite index
        const q = query(
          collection(db, 'documents'),
          where('subteam', '==', subteamId),
          orderBy('createdAt', 'desc')
        );
        
        querySnapshot = await getDocs(q);
        console.log('Query result:', querySnapshot.size, 'documents found');
      } catch (indexError) {
        console.log('Composite index not ready, falling back to client-side filtering...');
        
        // Fallback: get all documents and filter client-side
        const allDocsQuery = query(collection(db, 'documents'));
        const allDocsSnapshot = await getDocs(allDocsQuery);
        
        // Filter by subteam and sort by createdAt
        const filteredDocs = [];
        allDocsSnapshot.forEach((doc) => {
          const data = doc.data();
          if (data.subteam === subteamId) {
            filteredDocs.push({
              id: doc.id,
              ...data,
              createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : data.createdAt
            });
          }
        });
        
        // Sort by createdAt (most recent first)
        filteredDocs.sort((a, b) => {
          const dateA = a.createdAt instanceof Date ? a.createdAt : new Date(a.createdAt);
          const dateB = b.createdAt instanceof Date ? b.createdAt : new Date(b.createdAt);
          return dateB - dateA;
        });
        
        console.log('Fallback query result:', filteredDocs.length, 'documents found');
        setDocuments(filteredDocs);
        setLastUpdated(new Date());
        setLoading(false);
        return;
      }
      
      const docs = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        console.log('Document data:', { id: doc.id, subteam: data.subteam, tag: data.tag });
        docs.push({
          id: doc.id,
          ...data,
          // Ensure proper date handling for sorting
          createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : data.createdAt
        });
      });
      
      // Additional sort to ensure chronological order
      docs.sort((a, b) => {
        const dateA = a.createdAt instanceof Date ? a.createdAt : new Date(a.createdAt);
        const dateB = b.createdAt instanceof Date ? b.createdAt : new Date(b.createdAt);
        return dateB - dateA; // Most recent first
      });
      
      console.log('Final documents array:', docs);
      setDocuments(docs);
      setLastUpdated(new Date());
    } catch (error) {
      console.error('Error loading documents:', error);
      console.error('Error details:', error.message);
    } finally {
      setLoading(false);
    }
  }, [subteamId]);

  useEffect(() => {
    loadDocuments();
    loadUserNames();
  }, [loadDocuments]);

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

  // Separate pinned and unpinned documents
  const pinnedDocs = documents.filter(doc => doc.isPinned);
  const unpinnedDocs = documents.filter(doc => !doc.isPinned);

  const filteredDocuments = selectedFilters.length === 0 
    ? unpinnedDocs 
    : unpinnedDocs.filter(doc => {
        const docTags = Array.isArray(doc.tag) ? doc.tag : [doc.tag];
        return selectedFilters.every(filterTag => docTags.includes(filterTag));
      });

  const uniqueTags = [...new Set(unpinnedDocs.flatMap(doc => {
    if (Array.isArray(doc.tag)) {
      return doc.tag;
    } else {
      return [doc.tag];
    }
  }).filter(Boolean))];

  const handleTagFilter = (tag) => {
    setSelectedFilters(prev => {
      if (prev.includes(tag)) {
        return prev.filter(t => t !== tag);
      } else {
        return [...prev, tag];
      }
    });
  };

  const clearAllFilters = () => {
    setSelectedFilters([]);
  };

  const handlePinToggle = async (docId, isPinned) => {
    try {
      const docRef = doc(db, 'documents', docId);
      await updateDoc(docRef, {
        isPinned: !isPinned
      });
      
      // Update local state
      setDocuments(prev => prev.map(doc => 
        doc.id === docId ? { ...doc, isPinned: !isPinned } : doc
      ));
    } catch (error) {
      console.error('Error toggling pin status:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 transition-colors">
      {/* Header */}
      <header className="bg-white dark:bg-gray-900 shadow-sm border-b border-gray-200 dark:border-gray-800 transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <button
                onClick={() => navigate('/')}
                className="mr-4 p-2 rounded-md text-gray-400 dark:text-gray-500 hover:text-gray-500 dark:hover:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
              <div>
                <h1 className="text-xl font-semibold text-gray-900 dark:text-white transition-colors">
                  {subteamNames[subteamId] || 'Subteam'} Documentation
                </h1>
                {lastUpdated && (
                  <p className="text-sm text-gray-500 dark:text-gray-400 transition-colors">
                    Last updated: {lastUpdated.toLocaleTimeString()}
                  </p>
                )}
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <button
                onClick={loadDocuments}
                disabled={loading}
                className="inline-flex items-center px-3 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-49ers-red transition-colors"
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </button>
              <button
                onClick={() => navigate(`/create/${subteamId}`)}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors"
                style={{
                  backgroundColor: getSubteamHexColor(subteamId),
                  '--tw-ring-color': getSubteamHexColor(subteamId)
                }}
                onMouseEnter={(e) => {
                  e.target.style.backgroundColor = getSubteamHoverColor(subteamId);
                }}
                onMouseLeave={(e) => {
                  e.target.style.backgroundColor = getSubteamHexColor(subteamId);
                }}
              >
                <Plus className="h-4 w-4 mr-2" />
                Create New Doc
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          {/* Filter Tabs */}
          <div className="mb-6">
            <div className="flex flex-wrap gap-2">
                              <button
                  onClick={clearAllFilters}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                    selectedFilters.length === 0
                      ? `${subteamColors[subteamId] || 'bg-49ers-red'} text-white`
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  All ({unpinnedDocs.length})
                </button>
              {uniqueTags.map((tag) => (
                <button
                  key={tag}
                  onClick={() => handleTagFilter(tag)}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                    selectedFilters.includes(tag)
                      ? `${subteamColors[subteamId] || 'bg-49ers-red'} text-white`
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {tag} ({unpinnedDocs.filter(doc => {
                    if (Array.isArray(doc.tag)) {
                      return doc.tag.includes(tag);
                    } else {
                      return doc.tag === tag;
                    }
                  }).length})
                </button>
              ))}
            </div>
            {selectedFilters.length > 0 && (
              <div className="mt-3">
                <button
                  onClick={clearAllFilters}
                  className="text-sm text-gray-500 hover:text-gray-700 underline"
                >
                  Clear filters
                </button>
              </div>
            )}
          </div>

          {/* Pinned Documents Section */}
          {pinnedDocs.length > 0 && (
            <div className="mb-6">
              <button
                onClick={() => setPinnedSectionOpen(!pinnedSectionOpen)}
                className="flex items-center space-x-2 text-sm font-medium text-gray-700 hover:text-gray-900 mb-3"
              >
                {pinnedSectionOpen ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
                <Pin className="h-4 w-4" />
                <span>Pinned Documents ({pinnedDocs.length})</span>
              </button>
              
              {pinnedSectionOpen && (
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="space-y-2">
                    {pinnedDocs.map((doc) => (
                      <div
                        key={doc.id}
                        className="flex items-center justify-between p-3 bg-white rounded-md border-2 transition-colors cursor-pointer"
                        style={{ borderColor: getSubteamHexColor(subteamId) }}
                        onClick={() => navigate(`/document/${doc.id}`)}
                      >
                        <div className="flex-1">
                          <div className="flex items-center space-x-2">
                            <h4 className="text-sm font-medium text-gray-900">
                              {doc.title || 'Untitled Document'}
                            </h4>
                            {doc.serialNumber && (
                              <span className="text-xs font-mono text-gray-500">
                                {doc.serialNumber}
                              </span>
                            )}
                            {doc.attachments && getImageAttachments(doc.attachments).length > 0 && (
                              <div className="flex items-center space-x-1">
                                <Image className="h-3 w-3 text-blue-500" />
                                <span className="text-xs text-blue-500">
                                  {getImageAttachments(doc.attachments).length}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handlePinToggle(doc.id, true);
                          }}
                          className="p-1 text-gray-600 hover:text-gray-800"
                          title="Unpin document"
                        >
                          <Pin className="h-4 w-4 fill-current" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Documents List */}
          {loading ? (
            <div className="flex justify-center items-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-49ers-red"></div>
            </div>
          ) : filteredDocuments.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No documents</h3>
              <p className="mt-1 text-sm text-gray-500">
                {selectedFilters.length === 0 
                  ? 'Get started by creating a new document.' 
                  : `No documents found with tags: ${selectedFilters.join(', ')}.`
                }
              </p>
              {selectedFilters.length === 0 && unpinnedDocs.length === 0 && (
                <div className="mt-6">
                  <button
                    onClick={() => navigate(`/create/${subteamId}`)}
                    className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors"
                    style={{
                      backgroundColor: getSubteamHexColor(subteamId),
                      '--tw-ring-color': getSubteamHexColor(subteamId)
                    }}
                    onMouseEnter={(e) => {
                      e.target.style.backgroundColor = getSubteamHoverColor(subteamId);
                    }}
                    onMouseLeave={(e) => {
                      e.target.style.backgroundColor = getSubteamHexColor(subteamId);
                    }}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Create Document
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="grid gap-6">
              {filteredDocuments.map((doc) => (
                <div
                  key={doc.id}
                  className="bg-white overflow-hidden shadow rounded-lg hover:shadow-md transition-shadow duration-200 cursor-pointer border border-gray-200"
                >
                  <div className="p-6">
                    <div className="flex items-start justify-between">
                      <div 
                        className="flex-1 cursor-pointer"
                        onClick={() => navigate(`/document/${doc.id}`)}
                      >
                        <div className="mb-4">
                          {doc.title && (
                            <h3 className="text-xl font-semibold text-gray-900 mb-2">
                              {doc.title}
                            </h3>
                          )}
                          {doc.serialNumber && (
                            <p className="text-lg font-mono font-semibold text-gray-700 mb-3">
                              {doc.serialNumber}
                            </p>
                          )}
                        </div>

                        <div className="flex flex-wrap gap-1 mb-3">
                          {Array.isArray(doc.tag) ? (
                            doc.tag.map((tag, index) => (
                              <span key={index} className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium text-white ${subteamColors[subteamId] || 'bg-49ers-red'}`}>
                                {tag}
                              </span>
                            ))
                          ) : (
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium text-white ${subteamColors[subteamId] || 'bg-49ers-red'}`}>
                              {doc.tag}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-4 text-sm text-gray-500">
                            <div className="flex items-center">
                              <Calendar className="h-4 w-4 mr-1" />
                              {formatDate(doc.createdAt)}
                            </div>
                            <div className="flex items-center">
                              <User className="h-4 w-4 mr-1" />
                              {getAuthorDisplayName(doc.author)}
                            </div>
                          </div>

                          {doc.attachments && doc.attachments.length > 0 && (
                            <div className="flex items-center space-x-2">
                              {/* Image Thumbnails */}
                              {getImageAttachments(doc.attachments).length > 0 && (
                                <div className="flex items-center space-x-1">
                                  {getImageAttachments(doc.attachments).slice(0, 3).map((imageUrl, index) => (
                                    <div key={index} className="relative">
                                      <img
                                        src={imageUrl}
                                        alt={`Preview ${index + 1}`}
                                        className="w-8 h-8 object-cover rounded border border-gray-200"
                                        onError={(e) => {
                                          e.target.style.display = 'none';
                                        }}
                                      />
                                      {index === 2 && getImageAttachments(doc.attachments).length > 3 && (
                                        <div className="absolute inset-0 bg-black bg-opacity-50 rounded flex items-center justify-center">
                                          <span className="text-white text-xs font-medium">
                                            +{getImageAttachments(doc.attachments).length - 3}
                                          </span>
                                        </div>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              )}
                              
                              {/* Attachment Count */}
                              <div className="flex items-center space-x-1">
                                <Paperclip className="h-4 w-4 text-gray-400" />
                                <span className="text-sm text-gray-500">
                                  {doc.attachments.length} attachment{doc.attachments.length !== 1 ? 's' : ''}
                                </span>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                      
                      {/* Pin Button */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handlePinToggle(doc.id, doc.isPinned);
                        }}
                        className={`ml-3 p-2 rounded-full transition-colors ${
                          doc.isPinned 
                            ? 'text-yellow-600 hover:text-yellow-800 bg-yellow-100 hover:bg-yellow-200' 
                            : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'
                        }`}
                        title={doc.isPinned ? 'Unpin document' : 'Pin document'}
                      >
                        <Pin className={`h-4 w-4 ${doc.isPinned ? 'fill-current' : ''}`} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Dark Mode Toggle */}
      <DarkModeToggle />
      
      {/* Version Display */}
      <div className="fixed bottom-4 right-20 z-50">
        <div className="text-xs text-gray-500 dark:text-gray-400 font-mono transition-colors">
          v1.0.2
        </div>
      </div>
    </div>
  );
}

export default SubteamPosts; 