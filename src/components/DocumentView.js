import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useDarkMode } from '../contexts/DarkModeContext';
import { 
  ArrowLeft, 
  FileText, 
  Image, 
  Paperclip,
  Calendar,
  User,
  Download,
  ExternalLink,
  Edit3,
  Save,
  X,
  Trash2,
  Eye,
  Loader,
  MessageCircle,
  Send
} from 'lucide-react';
import { 
  doc, 
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  collection,
  addDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  serverTimestamp
} from 'firebase/firestore';
import { db } from '../firebase';
import DarkModeToggle from './DarkModeToggle';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';

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

function DocumentView() {
  const { documentId } = useParams();
  const navigate = useNavigate();
  const { currentUser, userData, isGuest, canDeleteDocuments } = useAuth();
  const { isDarkMode } = useDarkMode();

  const [document, setDocument] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({
    title: '',
    content: ''
  });
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [imageLoadingStates, setImageLoadingStates] = useState({});
  const [expandedImages, setExpandedImages] = useState({});
  
  // Comment functionality
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [isCommenting, setIsCommenting] = useState(false);
  const [submittingComment, setSubmittingComment] = useState(false);
  const [userNameMap, setUserNameMap] = useState({});

  // Rich text editor configuration
  const quillModules = {
    toolbar: [
      [{ 'header': [1, 2, 3, false] }],
      ['bold', 'italic', 'underline', 'strike', 'blockquote'],
      [{ 'list': 'ordered'}, { 'list': 'bullet' }],
      [{ 'indent': '-1'}, { 'indent': '+1' }],
      [{ 'color': [] }, { 'background': [] }],
      [{ 'align': [] }],
      ['link'],
      ['clean']
    ],
  };

  const quillFormats = [
    'header', 'blockquote',
    'bold', 'italic', 'underline', 'strike',
    'list', 'bullet', 'indent',
    'color', 'background',
    'align', 'link'
  ];

  // Helper functions - defined before useCallback hooks
  const getFileIcon = (fileUrl) => {
    if (fileUrl.includes('.pdf')) return FileText;
    if (fileUrl.match(/\.(jpg|jpeg|png|gif|webp)$/i)) return Image;
    return Paperclip;
  };

  const getFileType = (fileUrl) => {
    // Decode URL-encoded filename and extract extension
    const decodedUrl = decodeURIComponent(fileUrl);
    const filename = decodedUrl.split('/').pop().split('?')[0];
    const extension = filename.split('.').pop().toLowerCase();
    
    console.log('File type detection:', { fileUrl, decodedUrl, filename, extension });
    
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

  const handleImageLoad = (index) => {
    console.log(`Image loaded successfully for attachment ${index}`);
    setImageLoadingStates(prev => ({
      ...prev,
      [index]: 'loaded'
    }));
  };

  const handleImageError = (index) => {
    console.log(`Image failed to load for attachment ${index}`);
    console.log('Image URL:', document.attachments[index]);
    setImageLoadingStates(prev => ({
      ...prev,
      [index]: 'error'
    }));
  };

  const toggleImageExpansion = (index) => {
    setExpandedImages(prev => ({
      ...prev,
      [index]: !prev[index]
    }));
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

  // Comment functions
  const loadComments = useCallback(() => {
    console.log('Loading comments for documentId:', documentId);
    if (!documentId) return;
    
    try {
      const commentsQuery = query(
        collection(db, 'comments'),
        where('documentId', '==', documentId)
      );
      
      console.log('Setting up comments listener');
      const unsubscribe = onSnapshot(commentsQuery, (snapshot) => {
        const commentsData = [];
        snapshot.forEach((doc) => {
          commentsData.push({
            id: doc.id,
            ...doc.data()
          });
        });
        // Sort comments by createdAt in ascending order
        commentsData.sort((a, b) => {
          const aTime = a.createdAt?.toDate?.() || new Date(a.createdAt);
          const bTime = b.createdAt?.toDate?.() || new Date(b.createdAt);
          return aTime - bTime;
        });
        console.log('Comments loaded:', commentsData);
        setComments(commentsData);
      }, (error) => {
        console.error('Error in comments listener:', error);
      });
      
      return unsubscribe;
    } catch (error) {
      console.error('Error loading comments:', error);
    }
  }, [documentId]);

  const handleSubmitComment = async () => {
    console.log('Submitting comment:', { newComment, document, currentUser });
    if (!newComment.trim() || !document || !currentUser) {
      console.log('Validation failed:', { hasComment: !!newComment.trim(), hasDocument: !!document, hasUser: !!currentUser });
      return;
    }
    
    try {
      setSubmittingComment(true);
      const commentData = {
        documentId: documentId,
        content: newComment.trim(),
        author: userData?.fullName || currentUser.email,
        createdAt: serverTimestamp()
      };
      console.log('Adding comment to Firestore:', commentData);
      await addDoc(collection(db, 'comments'), commentData);
      console.log('Comment added successfully');
      setNewComment('');
      setIsCommenting(false);
    } catch (error) {
      console.error('Error submitting comment:', error);
    } finally {
      setSubmittingComment(false);
    }
  };

  const handleDeleteComment = async (commentId) => {
    if (!canDeleteDocuments()) {
      alert('Only team leads and captains can delete comments.');
      return;
    }

    const confirmDelete = window.confirm(
      '⚠️ WARNING: This action cannot be undone!\n\n' +
      'Are you sure you want to permanently delete this comment?\n\n' +
      'This action is permanent and cannot be recovered.'
    );

    if (confirmDelete) {
      try {
        await deleteDoc(doc(db, 'comments', commentId));
      } catch (error) {
        console.error('Error deleting comment:', error);
        alert('Failed to delete comment. Please try again.');
      }
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmitComment();
    }
  };

  const loadDocument = useCallback(async () => {
    try {
      setLoading(true);
      const docRef = doc(db, 'documents', documentId);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        const docData = {
          id: docSnap.id,
          ...docSnap.data()
        };
        setDocument(docData);
        
        // Initialize image loading states for all image attachments
        if (docData.attachments) {
          console.log('Document attachments:', docData.attachments);
          const imageStates = {};
          docData.attachments.forEach((attachment, index) => {
            if (isImageFile(attachment)) {
              console.log(`Setting loading state for image ${index}:`, attachment);
              imageStates[index] = 'loading';
            }
          });
          setImageLoadingStates(imageStates);
        }
      } else {
        setError('Document not found');
      }
    } catch (error) {
      console.error('Error loading document:', error);
      setError('Failed to load document');
    } finally {
      setLoading(false);
    }
  }, [documentId]);

  useEffect(() => {
    loadDocument();
    loadUserNames();
  }, [loadDocument]);

  useEffect(() => {
    const unsubscribe = loadComments();
    return () => {
      if (unsubscribe && typeof unsubscribe === 'function') {
        unsubscribe();
      }
    };
  }, [loadComments]);

  const formatDate = (timestamp) => {
    if (!timestamp) return 'Unknown date';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleDownload = (url, filename) => {
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleEdit = () => {
    setEditData({
      title: document.title || '',
      content: document.content || ''
    });
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditData({
      title: '',
      content: ''
    });
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const docRef = doc(db, 'documents', documentId);
      await updateDoc(docRef, {
        title: editData.title,
        content: editData.content,
        lastModified: new Date()
      });
      
      // Update local state
      setDocument(prev => ({
        ...prev,
        title: editData.title,
        content: editData.content,
        lastModified: new Date()
      }));
      
      setIsEditing(false);
    } catch (error) {
      console.error('Error saving document:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!canDeleteDocuments()) {
      alert('Only team leads and captains can delete documents.');
      return;
    }

    const confirmDelete = window.confirm(
      '⚠️ WARNING: This action cannot be undone!\n\n' +
      'Are you sure you want to permanently delete this document?\n\n' +
      'This will remove:\n' +
      '• The document content\n' +
      '• All attached files\n' +
      '• All comments\n' +
      '• All associated data\n\n' +
      'This action is permanent and cannot be recovered.'
    );

    if (confirmDelete) {
      try {
        setDeleting(true);
        const docRef = doc(db, 'documents', documentId);
        await deleteDoc(docRef);
        
        // Navigate back to the subteam page
        navigate(`/subteam/${document.subteam}`);
      } catch (error) {
        console.error('Error deleting document:', error);
        alert('Failed to delete document. Please try again.');
      } finally {
        setDeleting(false);
      }
    }
  };


  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-49ers-red"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Error</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={() => navigate('/')}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-49ers-red hover:bg-red-700"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  if (!document) {
    return null;
  }

  return (
    <>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 transition-colors">
      {/* Header */}
      <header className="bg-white dark:bg-gray-900 shadow-sm border-b border-gray-200 dark:border-gray-800 transition-colors">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <button
                onClick={() => navigate(`/subteam/${document.subteam}`)}
                className="mr-4 p-2 rounded-md text-gray-400 dark:text-gray-500 hover:text-gray-500 dark:hover:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
              <div>
                <h1 className="text-xl font-semibold text-gray-900 dark:text-white transition-colors">
                  {document.title || `${subteamNames[document.subteam] || 'Subteam'} - ${Array.isArray(document.tag) ? document.tag.join(', ') : document.tag}`}
                </h1>
                <p className="text-sm text-gray-500 dark:text-gray-400 transition-colors">
                  Created by {getAuthorDisplayName(document.author)}
                </p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Tag Cloud Section */}
      {!isEditing && (
        <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 transition-colors">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex flex-wrap gap-2">
              {Array.isArray(document.tag) ? (
                document.tag.map((tag, index) => (
                  <span 
                    key={index} 
                    className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium text-white"
                    style={{ backgroundColor: getSubteamHexColor(document.subteam) }}
                  >
                    {tag}
                  </span>
                ))
              ) : (
                <span 
                  className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium text-white"
                  style={{ backgroundColor: getSubteamHexColor(document.subteam) }}
                >
                  {document.tag}
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="max-w-4xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="bg-white dark:bg-gray-900 shadow rounded-lg border border-gray-200 dark:border-gray-800 transition-colors">
          {/* Document Header */}
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-800">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                {!isEditing && (
                  <div className="flex items-center space-x-4 text-sm text-gray-500 dark:text-gray-400 transition-colors">
                    <div className="flex items-center">
                      <Calendar className="h-4 w-4 mr-1" />
                      {formatDate(document.createdAt)}
                    </div>
                    <div className="flex items-center">
                      <User className="h-4 w-4 mr-1" />
                      {getAuthorDisplayName(document.author)}
                    </div>
                  </div>
                )}
              </div>
              
              <div className="flex items-center space-x-3">
                {isEditing ? (
                  <>
                    {!isGuest && canDeleteDocuments() && (
                      <button
                        onClick={handleDelete}
                        disabled={deleting}
                        className="inline-flex items-center px-4 py-2 border border-red-300 text-sm font-medium rounded-md text-red-700 bg-white hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors disabled:opacity-50"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        {deleting ? 'Deleting...' : 'Delete'}
                      </button>
                    )}
                    <button
                      onClick={handleCancelEdit}
                      className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-colors"
                    >
                      <X className="h-4 w-4 mr-2" />
                      Cancel
                    </button>
                    <button
                      onClick={handleSave}
                      disabled={saving}
                      className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors disabled:opacity-50"
                      style={{
                        backgroundColor: getSubteamHexColor(document.subteam),
                        '--tw-ring-color': getSubteamHexColor(document.subteam)
                      }}
                      onMouseEnter={(e) => {
                        if (!saving) {
                          e.target.style.backgroundColor = getSubteamHoverColor(document.subteam);
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!saving) {
                          e.target.style.backgroundColor = getSubteamHexColor(document.subteam);
                        }
                      }}
                    >
                      <Save className="h-4 w-4 mr-2" />
                      {saving ? 'Saving...' : 'Save'}
                    </button>
                  </>
                ) : (
                  <div className="flex items-center space-x-3">
                    {!isGuest && (
                      <button
                        onClick={handleEdit}
                        className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-colors"
                      >
                        <Edit3 className="h-4 w-4 mr-2" />
                        Edit
                      </button>
                    )}
                    {!isGuest && canDeleteDocuments() && (
                      <button
                        onClick={handleDelete}
                        disabled={deleting}
                        className="inline-flex items-center px-4 py-2 border border-red-300 text-sm font-medium rounded-md text-red-700 bg-white hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors disabled:opacity-50"
                        title="Delete document (Team Leads & Captains only)"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        {deleting ? 'Deleting...' : 'Delete'}
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Document Content */}
          <div className="px-6 py-6">
            {isEditing ? (
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 transition-colors">
                    Title
                  </label>
                  <input
                    type="text"
                    value={editData.title}
                    onChange={(e) => setEditData(prev => ({ ...prev, title: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:border-transparent transition-colors bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                    style={{
                      '--tw-ring-color': getSubteamHexColor(document.subteam),
                      '--tw-border-opacity': '1',
                      'border-color': getSubteamHexColor(document.subteam)
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = getSubteamHexColor(document.subteam);
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = isDarkMode ? '#4B5563' : '#D1D5DB'; // gray-300
                    }}
                    placeholder="Document title"
                  />
                </div>
                {document.serialNumber && (
                  <div>
                    <p className="text-xl font-mono font-semibold text-gray-600">
                      {document.serialNumber}
                    </p>
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 transition-colors">
                    Content
                  </label>
                  <div className="bg-white dark:bg-gray-800 rounded-md border border-gray-300 dark:border-gray-600">
                    <ReactQuill
                      theme="snow"
                      value={editData.content}
                      onChange={(value) => setEditData(prev => ({ ...prev, content: value }))}
                      modules={quillModules}
                      formats={quillFormats}
                      placeholder="Edit document content..."
                      className="document-editor"
                    />
                  </div>
                </div>
              </div>
            ) : (
              <>
                {document.title && (
                  <div className="mb-6">
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2 transition-colors">
                      {document.title}
                    </h2>
                    {document.serialNumber && (
                      <p className="text-xl font-mono font-semibold text-gray-600 dark:text-gray-300 transition-colors">
                        {document.serialNumber}
                      </p>
                    )}
                  </div>
                )}
                <div 
                  className="portfolio-content prose prose-lg dark:prose-invert max-w-none text-gray-700 dark:text-gray-300"
                  dangerouslySetInnerHTML={{ __html: document.content }}
                />
              </>
            )}
          </div>

          {/* Attachments */}
          {document.attachments && document.attachments.length > 0 && (
            <div className="px-6 py-4 border-t border-gray-200">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Attachments</h3>
              <div className="grid gap-4">
                {document.attachments.map((attachment, index) => {
                  const FileIcon = getFileIcon(attachment);
                  // Decode URL-encoded filename
                  const decodedUrl = decodeURIComponent(attachment);
                  const filename = decodedUrl.split('/').pop().split('?')[0];
                  const fileType = getFileType(attachment);
                  const isImage = isImageFile(attachment);
                  const isLoading = imageLoadingStates[index] === 'loading';
                  const hasError = imageLoadingStates[index] === 'error';
                  const isExpanded = expandedImages[index];
                  
                  console.log(`Attachment ${index}:`, {
                    filename,
                    fileType,
                    isImage,
                    url: attachment,
                    loadingState: imageLoadingStates[index]
                  });
                  
                  return (
                    <div key={index} className="bg-gray-50 rounded-lg overflow-hidden border border-gray-200">
                      {/* Image Preview */}
                      {isImage && (
                        <div className="relative">
                          {/* Loading State */}
                          {isLoading && (
                            <div className="w-full h-48 bg-gray-100 flex items-center justify-center">
                              <div className="text-center">
                                <Loader className="h-8 w-8 text-gray-400 mx-auto mb-2 animate-spin" />
                                <p className="text-sm text-gray-500">Loading image...</p>
                              </div>
                            </div>
                          )}
                          
                          {/* Error State */}
                          {hasError && (
                            <div className="w-full h-48 bg-gray-100 flex items-center justify-center">
                              <div className="text-center">
                                <Image className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                                <p className="text-sm text-gray-500">Failed to load image</p>
                                <p className="text-xs text-gray-400 mt-1">Click view to open image</p>
                              </div>
                            </div>
                          )}
                          
                          {/* Image Element - Always render for images */}
                          <div className={`relative group ${isLoading || hasError ? 'hidden' : ''}`}>
                            <img
                              src={attachment}
                              alt={filename}
                              className={`w-full transition-all duration-300 ${
                                isExpanded ? 'h-96' : 'h-48'
                              } object-cover cursor-pointer`}
                              onLoad={() => handleImageLoad(index)}
                              onError={() => handleImageError(index)}
                              onClick={() => toggleImageExpansion(index)}
                            />
                            <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all duration-300 flex items-center justify-center">
                              <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                                <button
                                  onClick={() => toggleImageExpansion(index)}
                                  className="bg-white bg-opacity-90 rounded-full p-2 shadow-lg hover:bg-opacity-100 transition-all duration-200"
                                  title={isExpanded ? "Collapse image" : "Expand image"}
                                >
                                  <Eye className="h-5 w-5 text-gray-700" />
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                      
                      {/* File Info */}
                      <div className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center">
                            <div className={`p-2 rounded-lg mr-3 ${
                              fileType === 'image' ? 'bg-blue-100' :
                              fileType === 'pdf' ? 'bg-red-100' :
                              fileType === 'document' ? 'bg-green-100' :
                              fileType === 'spreadsheet' ? 'bg-yellow-100' :
                              fileType === 'presentation' ? 'bg-purple-100' :
                              fileType === 'archive' ? 'bg-orange-100' :
                              'bg-gray-100'
                            }`}>
                              <FileIcon className={`h-5 w-5 ${
                                fileType === 'image' ? 'text-blue-600' :
                                fileType === 'pdf' ? 'text-red-600' :
                                fileType === 'document' ? 'text-green-600' :
                                fileType === 'spreadsheet' ? 'text-yellow-600' :
                                fileType === 'presentation' ? 'text-purple-600' :
                                fileType === 'archive' ? 'text-orange-600' :
                                'text-gray-600'
                              }`} />
                            </div>
                            <div>
                              <p className="text-sm font-medium text-gray-900">{filename}</p>
                              <p className="text-xs text-gray-500 capitalize">
                                {fileType === 'image' ? 'Image' :
                                 fileType === 'pdf' ? 'PDF Document' :
                                 fileType === 'document' ? 'Word Document' :
                                 fileType === 'spreadsheet' ? 'Spreadsheet' :
                                 fileType === 'presentation' ? 'Presentation' :
                                 fileType === 'archive' ? 'Archive' :
                                 'File'}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            {isImage && !isLoading && !hasError && (
                              <button
                                onClick={() => toggleImageExpansion(index)}
                                className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
                                title={isExpanded ? "Collapse image" : "Expand image"}
                              >
                                <Eye className="h-4 w-4" />
                              </button>
                            )}
                            <button
                              onClick={() => window.open(attachment, '_blank')}
                              className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
                              title="View attachment"
                            >
                              <ExternalLink className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleDownload(attachment, filename)}
                              className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
                              title="Download attachment"
                            >
                              <Download className="h-4 w-4" />
                            </button>
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
        </main>

        {/* Comments Section - Floating Card */}
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pb-8">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium text-gray-900 flex items-center">
                  <MessageCircle className="h-5 w-5 mr-2 text-gray-500" />
                  Comments ({comments.length})
                </h3>
              </div>
            </div>

            <div className="p-6">
              {/* Comment Input */}
              {!isGuest && (
                <div className="mb-6">
                  {!isCommenting ? (
                    <button
                      onClick={() => setIsCommenting(true)}
                      className="w-full text-left p-3 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-400 dark:hover:border-gray-500 transition-colors bg-white dark:bg-gray-800"
                    >
                      Add a comment...
                    </button>
                  ) : (
                    <div className="space-y-3">
                      <textarea
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        onKeyPress={handleKeyPress}
                        placeholder="Type your comment..."
                        className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg resize-none focus:outline-none focus:ring-2 focus:border-transparent transition-colors bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                        style={{
                          '--tw-ring-color': getSubteamHexColor(document.subteam)
                        }}
                        rows={3}
                        autoFocus
                      />
                      <div className="flex items-center justify-between">
                        <button
                          onClick={() => {
                            setIsCommenting(false);
                            setNewComment('');
                          }}
                          className="text-sm text-gray-500 hover:text-gray-700"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={handleSubmitComment}
                          disabled={!newComment.trim() || submittingComment}
                          className="inline-flex items-center px-3 py-1.5 text-sm font-medium rounded-md text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          style={{
                            backgroundColor: getSubteamHexColor(document.subteam)
                          }}
                        >
                          <Send className="h-4 w-4 mr-1" />
                          {submittingComment ? 'Posting...' : 'Post'}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Comments List */}
              <div className="space-y-4">
                {comments.map((comment) => (
                  <div key={comment.id} className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 transition-colors">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          <span className="text-sm font-medium text-gray-900 dark:text-white transition-colors">
                            {comment.author}
                          </span>
                          <span className="text-xs text-gray-500 dark:text-gray-400 transition-colors">
                            {formatDate(comment.createdAt)}
                          </span>
                        </div>
                        <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap transition-colors">
                          {comment.content}
                        </p>
                      </div>
                                                    {comment.author === (userData?.fullName || currentUser?.email) && !isGuest && canDeleteDocuments() && (
                        <button
                          onClick={() => handleDeleteComment(comment.id)}
                          className="ml-2 p-1 text-gray-400 hover:text-red-500 transition-colors"
                          title="Delete comment (Team Leads & Captains only)"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
                
                {comments.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    <MessageCircle className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                    <p className="text-sm">No comments yet. Be the first to add one!</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
      <DarkModeToggle />
      
      {/* Version Display */}
      <div className="fixed bottom-4 right-20 z-50">
        <div className="text-xs text-gray-500 dark:text-gray-400 font-mono transition-colors">
          v1.0.2
        </div>
      </div>
    </>
  );
}

export default DocumentView; 