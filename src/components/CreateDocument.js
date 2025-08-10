import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useDarkMode } from '../contexts/DarkModeContext';
import { 
  ArrowLeft, 
  Save, 
  Upload, 
  X, 
  FileText,
  Image,
  Paperclip
} from 'lucide-react';
import { 
  collection, 
  addDoc, 
  getDocs, 
  query, 
  where,
  orderBy,
  serverTimestamp 
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../firebase';
import DarkModeToggle from './DarkModeToggle';

const subteams = [
  { id: 'driver-controls', name: 'Driver Controls', color: 'bg-blue-500', borderColor: 'border-blue-500', bgColor: 'bg-blue-50', serialPrefix: '4' },
  { id: 'chassis', name: 'Chassis', color: 'bg-red-400', borderColor: 'border-red-400', bgColor: 'bg-red-50', serialPrefix: '3' },
  { id: 'electronics', name: 'Electronics', color: 'bg-amber-700', borderColor: 'border-amber-700', bgColor: 'bg-amber-50', serialPrefix: '5' },
  { id: 'vehicle-dynamics', name: 'Vehicle Dynamics', color: 'bg-green-500', borderColor: 'border-green-500', bgColor: 'bg-green-50', serialPrefix: '7' },
  { id: 'aerodynamics', name: 'Aerodynamics', color: 'bg-sky-400', borderColor: 'border-sky-400', bgColor: 'bg-sky-50', serialPrefix: '2' },
  { id: 'business', name: 'Business', color: 'bg-green-700', borderColor: 'border-green-700', bgColor: 'bg-green-50', serialPrefix: '8' },
  { id: 'powertrain', name: 'Powertrain', color: 'bg-red-800', borderColor: 'border-red-800', bgColor: 'bg-red-50', serialPrefix: '6' },
  { id: 'general', name: 'General', color: 'bg-gray-400', borderColor: 'border-gray-400', bgColor: 'bg-gray-50', serialPrefix: '0' }
];

// Function to generate the next KB serial number for a subteam
const generateNextSerialNumber = async (subteamId) => {
  const subteam = subteams.find(s => s.id === subteamId);
  if (!subteam) {
    throw new Error('Invalid subteam');
  }

  const prefix = subteam.serialPrefix;
  console.log('Looking for subteam:', subteamId, 'with prefix:', prefix);
  
  // Query existing documents for this subteam to find the highest serial number
  const q = query(
    collection(db, 'documents'),
    where('subteam', '==', subteamId)
  );
  
  const querySnapshot = await getDocs(q);
  console.log('Found', querySnapshot.size, 'documents for subteam', subteamId);
  
  if (querySnapshot.empty) {
    // First document for this subteam
    const firstSerial = `KB${prefix}0001`;
    console.log('First document for subteam, using:', firstSerial);
    return firstSerial;
  }
  
  // Find the highest serial number for this subteam
  let highestNumber = 0;
  querySnapshot.forEach((doc) => {
    const data = doc.data();
    console.log('Checking document:', doc.id, 'serialNumber:', data.serialNumber);
    if (data.serialNumber && data.serialNumber.startsWith(`KB${prefix}`)) {
      const numberPart = data.serialNumber.substring(3); // Remove "KB" and prefix
      const number = parseInt(numberPart);
      console.log('Parsed number:', number, 'from serial:', data.serialNumber);
      if (!isNaN(number) && number > highestNumber) {
        highestNumber = number;
      }
    }
  });
  
  const nextNumber = highestNumber + 1;
  const nextSerial = `KB${prefix}${nextNumber.toString().padStart(4, '0')}`;
  console.log('Next serial number:', nextSerial, '(highest was:', highestNumber, ')');
  
  // Format with leading zeros
  return nextSerial;
};

function CreateDocument() {
  const { currentUser, userData } = useAuth();
  const { isDarkMode } = useDarkMode();
  const navigate = useNavigate();
  const { subteamId } = useParams(); // Get subteam from URL if provided
  const [selectedSubteam, setSelectedSubteam] = useState(subteamId || '');
  const [selectedTags, setSelectedTags] = useState([]);
  const [allTags, setAllTags] = useState([]);
  const [showAddTag, setShowAddTag] = useState(false);
  const [newTagInput, setNewTagInput] = useState('');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [attachments, setAttachments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [serialNumber, setSerialNumber] = useState('');

  // Generate serial number when subteam is selected
  useEffect(() => {
    const generateSerial = async () => {
      if (selectedSubteam) {
        try {
          console.log('Generating serial number for subteam:', selectedSubteam);
          const nextSerial = await generateNextSerialNumber(selectedSubteam);
          console.log('Generated serial number:', nextSerial);
          setSerialNumber(nextSerial);
        } catch (error) {
          console.error('Error generating serial number:', error);
          setSerialNumber('');
        }
      } else {
        setSerialNumber('');
      }
    };

    generateSerial();
  }, [selectedSubteam]);

  const loadSubteamTags = async (subteamId) => {
    if (!subteamId) {
      setAllTags([]);
      return;
    }

    try {
      const q = query(
        collection(db, 'documents'),
        where('subteam', '==', subteamId),
        orderBy('createdAt', 'desc')
      );
      const querySnapshot = await getDocs(q);
      const tags = new Set();
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        // Handle both single tag and multiple tags
        if (data.tag) {
          if (Array.isArray(data.tag)) {
            data.tag.forEach(tag => tags.add(tag));
          } else {
            tags.add(data.tag);
          }
        }
      });
      setAllTags(Array.from(tags).sort());
    } catch (error) {
      console.error('Error loading subteam tags:', error);
      setAllTags([]);
    }
  };

  // Load tags when selected subteam changes
  useEffect(() => {
    if (selectedSubteam) {
      loadSubteamTags(selectedSubteam);
      // Clear selected tags when subteam changes
      setSelectedTags([]);
    } else {
      setAllTags([]);
      setSelectedTags([]);
    }
  }, [selectedSubteam]);

  // Set initial subteam from URL only once
  useEffect(() => {
    if (subteamId && !selectedSubteam) {
      setSelectedSubteam(subteamId);
    }
  }, [subteamId]); // Remove selectedSubteam from dependencies

  const handleFileUpload = (e) => {
    const files = Array.from(e.target.files);
    setAttachments(prev => [...prev, ...files]);
  };

  const removeAttachment = (index) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const handleAddTag = () => {
    if (newTagInput.trim() && !allTags.includes(newTagInput.trim())) {
      setAllTags(prev => [...prev, newTagInput.trim()].sort());
      setSelectedTags(prev => [...prev, newTagInput.trim()]);
      setNewTagInput('');
      setShowAddTag(false);
    }
  };

  const handleTagSelect = (tag) => {
    setSelectedTags(prev => {
      if (prev.includes(tag)) {
        return prev.filter(t => t !== tag);
      } else {
        return [...prev, tag];
      }
    });
    setShowAddTag(false);
    setNewTagInput('');
  };



  const uploadFiles = async () => {
    console.log('Starting file upload for', attachments.length, 'files');
    console.log('Storage bucket:', storage.app.options.storageBucket);
    console.log('Storage app config:', storage.app.options);
    
    setUploading(true);
    setUploadProgress(0);
    
    const totalFiles = attachments.length;
    let completedFiles = 0;
    
    const uploadPromises = attachments.map(async (file, index) => {
      try {
        console.log(`Uploading file ${index + 1}:`, file.name, 'Size:', file.size, 'Type:', file.type);
        
        // Create a unique filename to avoid conflicts
        const timestamp = Date.now();
        const uniqueName = `${timestamp}_${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
        const storageRef = ref(storage, `attachments/${uniqueName}`);
        console.log('Storage reference created:', storageRef.fullPath);
        
        // Add metadata to help with CORS
        const metadata = {
          contentType: file.type,
          customMetadata: {
            originalName: file.name,
            uploadedBy: currentUser.email
          }
        };
        
        const snapshot = await uploadBytes(storageRef, file, metadata);
        console.log(`File ${index + 1} uploaded successfully:`, snapshot.ref.fullPath);
        
        const downloadURL = await getDownloadURL(snapshot.ref);
        console.log(`Download URL for file ${index + 1}:`, downloadURL);
        
        // Update progress
        completedFiles++;
        const progress = (completedFiles / totalFiles) * 100;
        setUploadProgress(progress);
        
        return downloadURL;
      } catch (error) {
        console.error(`Error uploading file ${index + 1}:`, file.name, error);
        console.error('Error code:', error.code);
        console.error('Error message:', error.message);
        throw error;
      }
    });
    
    try {
      const urls = await Promise.all(uploadPromises);
      console.log('All files uploaded successfully:', urls);
      setUploadProgress(100);
      return urls;
    } catch (error) {
      console.error('Error in uploadFiles:', error);
      throw error;
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async () => {
    if (!selectedSubteam || !title.trim() || !content.trim()) {
      alert('Please fill in all required fields');
      return;
    }

    try {
      setLoading(true);
      console.log('Starting document creation process...');
      
      let attachmentUrls = [];
      if (attachments.length > 0) {
        console.log('Uploading attachments...');
        try {
          attachmentUrls = await uploadFiles();
          console.log('Attachments uploaded:', attachmentUrls);
        } catch (uploadError) {
          console.error('Upload failed, saving document without attachments:', uploadError);
          // Continue without attachments if upload fails
          attachmentUrls = [];
        }
      } else {
        console.log('No attachments to upload');
      }

      // Ensure we have a serial number
      const finalSerialNumber = serialNumber || `KB${subteams.find(s => s.id === selectedSubteam)?.serialPrefix || '0'}0001`;
      
      const docData = {
        subteam: selectedSubteam,
        tag: selectedTags.length > 0 ? selectedTags : null,
        title: title.trim(),
        content: content,
        attachments: attachmentUrls,
        author: userData?.fullName || currentUser.email,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        serialNumber: finalSerialNumber
      };

      console.log('Saving document with data:', docData);
      console.log('Serial number being saved:', serialNumber);
      const docRef = await addDoc(collection(db, 'documents'), docData);
      console.log('Document saved with ID:', docRef.id);
      navigate(`/subteam/${selectedSubteam}`);
    } catch (error) {
      console.error('Error creating document:', error);
      console.error('Error details:', error.message);
      console.error('Error code:', error.code);
      
      let errorMessage = 'Failed to create document. Please try again.';
      if (error.code === 'storage/unauthorized') {
        errorMessage = 'Storage access denied. Please check Firebase Storage rules.';
      } else if (error.code === 'storage/quota-exceeded') {
        errorMessage = 'Storage quota exceeded. Please try with smaller files.';
      } else if (error.code === 'storage/retry-limit-exceeded') {
        errorMessage = 'Upload failed. Please check your internet connection and try again.';
      }
      
      alert(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileIcon = (file) => {
    if (file.type.startsWith('image/')) return Image;
    if (file.type.includes('pdf')) return FileText;
    return Paperclip;
  };

  // Get current subteam's color for dynamic styling
  const getCurrentSubteamColor = () => {
    if (!selectedSubteam) return '#AA0000'; // 49ers red fallback
    const subteam = subteams.find(s => s.id === selectedSubteam);
    if (!subteam) return '#AA0000';
    
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
    
    return colorMap[subteam.color] || '#AA0000';
  };

  const getCurrentSubteamBorderColor = () => {
    if (!selectedSubteam) return '#AA0000'; // 49ers red fallback
    const subteam = subteams.find(s => s.id === selectedSubteam);
    if (!subteam) return '#AA0000';
    
    // Map border color classes to hex values
    const borderColorMap = {
      'border-blue-500': '#3B82F6',
      'border-red-400': '#F87171',
      'border-amber-700': '#A16207',
      'border-green-500': '#10B981',
      'border-sky-400': '#38BDF8',
      'border-green-700': '#047857',
      'border-red-800': '#991B1B',
      'border-gray-400': '#9CA3AF'
    };
    
    return borderColorMap[subteam.borderColor] || '#AA0000';
  };

  const getSubteamBackgroundColor = (subteamId, isSelected = false) => {
    if (!isSelected) {
      return isDarkMode ? 'bg-gray-800' : 'bg-white';
    }
    
    const subteam = subteams.find(s => s.id === subteamId);
    if (!subteam) return isDarkMode ? 'bg-gray-800' : 'bg-white';
    
    // Map to dark mode background colors
    const darkBgColorMap = {
      'bg-blue-50': 'bg-blue-900/20',
      'bg-red-50': 'bg-red-900/20',
      'bg-amber-50': 'bg-amber-900/20',
      'bg-green-50': 'bg-green-900/20',
      'bg-sky-50': 'bg-sky-900/20',
      'bg-gray-50': 'bg-gray-800'
    };
    
    return isDarkMode ? darkBgColorMap[subteam.bgColor] || 'bg-gray-800' : subteam.bgColor;
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 transition-colors">
      {/* Header */}
      <header className="bg-white dark:bg-gray-900 shadow-sm border-b border-gray-200 dark:border-gray-800 transition-colors">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <button
                onClick={() => navigate('/')}
                className="mr-4 p-2 rounded-md text-gray-400 dark:text-gray-500 hover:text-gray-500 dark:hover:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
              <h1 className="text-xl font-semibold text-gray-900 dark:text-white transition-colors">Create New Document</h1>
            </div>
            <button
              onClick={handleSubmit}
              disabled={loading || uploading || !selectedSubteam || !title.trim() || !content.trim()}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              style={{
                backgroundColor: getCurrentSubteamColor(),
                '--tw-ring-color': getCurrentSubteamColor()
              }}
              onMouseEnter={(e) => {
                const color = getCurrentSubteamColor();
                const darkerColor = color === '#3B82F6' ? '#2563EB' : // blue-600
                                   color === '#F87171' ? '#EF4444' : // red-500
                                   color === '#A16207' ? '#92400E' : // amber-600
                                   color === '#10B981' ? '#059669' : // green-600
                                   color === '#38BDF8' ? '#0EA5E9' : // sky-500
                                   color === '#047857' ? '#065F46' : // green-600
                                   color === '#991B1B' ? '#DC2626' : // red-600
                                   color === '#9CA3AF' ? '#6B7280' : // gray-500
                                   '#DC2626'; // fallback
                e.target.style.backgroundColor = darkerColor;
              }}
              onMouseLeave={(e) => {
                e.target.style.backgroundColor = getCurrentSubteamColor();
              }}
            >
              <Save className="h-4 w-4 mr-2" />
              {uploading ? `Uploading... ${Math.round(uploadProgress)}%` : loading ? 'Saving...' : 'Save Document'}
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="bg-white dark:bg-gray-900 shadow rounded-lg border border-gray-200 dark:border-gray-800 transition-colors">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-800">
            <h2 className="text-lg font-medium text-gray-900 dark:text-white transition-colors">Document Details</h2>
          </div>

          <div className="p-6 space-y-6">
            {/* Subteam Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 transition-colors">
                Subteam *
              </label>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {subteams.map((subteam) => (
                  <button
                    key={subteam.id}
                    onClick={() => setSelectedSubteam(subteam.id)}
                    className={`p-4 text-left rounded-lg border-2 transition-colors ${
                      selectedSubteam === subteam.id
                        ? `${subteam.borderColor} ${getSubteamBackgroundColor(subteam.id, true)}`
                        : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-gray-300 dark:hover:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
                    }`}
                  >
                    <div className="font-medium text-gray-900 dark:text-white transition-colors">{subteam.name}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Title */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 transition-colors">
                Title *
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Enter document title..."
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 transition-colors text-lg font-medium bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                style={{
                  '--tw-ring-color': getCurrentSubteamColor(),
                  '--tw-border-opacity': '1'
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = getCurrentSubteamBorderColor();
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = isDarkMode ? '#4B5563' : '#D1D5DB'; // gray-300
                }}
              />
            </div>

            {/* Serial Number Display */}
            {selectedSubteam && serialNumber && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 transition-colors">
                  Document Serial Number
                </label>
                <div className="px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md transition-colors">
                  <span className="text-lg font-mono font-semibold text-gray-900 dark:text-white transition-colors">
                    {serialNumber}
                  </span>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 transition-colors">
                    This will be the unique identifier for this document
                  </p>
                </div>
              </div>
            )}

            {/* Tag Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 transition-colors">
                Tags
              </label>
              
              {!selectedSubteam ? (
                <div className="text-center w-full py-4">
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-2 transition-colors">Please select a subteam first to see available tags</p>
                </div>
              ) : (
                <>
                  {/* Tag Cloud */}
                  <div className="flex flex-wrap gap-2 mb-4">
                    {allTags.length > 0 ? (
                      <>
                        {allTags.map((tag) => (
                          <button
                            key={tag}
                            onClick={() => handleTagSelect(tag)}
                            className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                              selectedTags.includes(tag)
                                ? `${selectedSubteam ? subteams.find(s => s.id === selectedSubteam)?.color || 'bg-49ers-red' : 'bg-49ers-red'} text-white`
                                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                            }`}
                          >
                            {tag}
                          </button>
                        ))}
                        
                        {/* Add Tag Button */}
                        {!showAddTag && (
                          <button
                            onClick={() => setShowAddTag(true)}
                            className="px-3 py-1 rounded-full text-sm font-medium bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors border-2 border-dashed border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500"
                          >
                            + Add Tag
                          </button>
                        )}
                      </>
                    ) : (
                      <div className="text-center w-full py-4">
                        <p className="text-sm text-gray-500 dark:text-gray-400 mb-2 transition-colors">No tags created for {subteams.find(s => s.id === selectedSubteam)?.name || 'this subteam'} yet</p>
                        <button
                          onClick={() => setShowAddTag(true)}
                          className="px-3 py-1 rounded-full text-sm font-medium bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors border-2 border-dashed border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500"
                        >
                          + Create First Tag
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Add New Tag Input */}
                  {showAddTag && (
                    <div className="flex gap-2 mb-4">
                      <input
                        type="text"
                        value={newTagInput}
                        onChange={(e) => setNewTagInput(e.target.value)}
                        placeholder={`Enter new tag for ${subteams.find(s => s.id === selectedSubteam)?.name || 'subteam'}`}
                        className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 transition-colors bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                        style={{
                          '--tw-ring-color': getCurrentSubteamColor(),
                          '--tw-border-opacity': '1'
                        }}
                        onFocus={(e) => {
                          e.target.style.borderColor = getCurrentSubteamBorderColor();
                        }}
                        onBlur={(e) => {
                          e.target.style.borderColor = isDarkMode ? '#4B5563' : '#D1D5DB'; // gray-300
                        }}
                        onKeyPress={(e) => {
                          if (e.key === 'Enter') {
                            handleAddTag();
                          }
                        }}
                        autoFocus
                      />
                      <button
                        onClick={handleAddTag}
                        disabled={!newTagInput.trim()}
                        className="px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        Add
                      </button>
                      <button
                        onClick={() => {
                          setShowAddTag(false);
                          setNewTagInput('');
                        }}
                        className="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  )}


                </>
              )}
            </div>

            {/* Content */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 transition-colors">
                Content *
              </label>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={12}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 transition-colors bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                style={{
                  '--tw-ring-color': getCurrentSubteamColor(),
                  '--tw-border-opacity': '1'
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = getCurrentSubteamBorderColor();
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = isDarkMode ? '#4B5563' : '#D1D5DB'; // gray-300
                }}
                placeholder="Enter your document content here..."
              />
            </div>

            {/* Attachments */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 transition-colors">
                Attachments
              </label>
              <div 
                className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-6 transition-colors"
                style={{
                  borderColor: getCurrentSubteamBorderColor()
                }}
              >
                <div className="text-center">
                  <Upload className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500" />
                  <div className="mt-4">
                    <label htmlFor="file-upload" className="cursor-pointer">
                      <span className="mt-2 block text-sm font-medium text-gray-900 dark:text-white transition-colors">
                        Upload files
                      </span>
                      <span className="mt-1 block text-xs text-gray-500 dark:text-gray-400 transition-colors">
                        PDF, images, or any file type
                      </span>
                    </label>
                    <input
                      id="file-upload"
                      name="file-upload"
                      type="file"
                      multiple
                      onChange={handleFileUpload}
                      className="sr-only"
                    />
                  </div>
                </div>
              </div>

              {/* Attachment List */}
              {attachments.length > 0 && (
                <div className="mt-4 space-y-2">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300 transition-colors">
                      {attachments.length} file{attachments.length !== 1 ? 's' : ''} selected
                    </span>
                    <span className="text-sm text-gray-500 dark:text-gray-400 transition-colors">
                      Total: {formatFileSize(attachments.reduce((total, file) => total + file.size, 0))}
                    </span>
                  </div>
                  {attachments.map((file, index) => {
                    const FileIcon = getFileIcon(file);
                    return (
                      <div key={index} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg transition-colors">
                        <div className="flex items-center">
                          <FileIcon className="h-5 w-5 text-gray-400 dark:text-gray-500 mr-3" />
                          <div>
                            <span className="text-sm text-gray-900 dark:text-white transition-colors">{file.name}</span>
                            <span className="text-xs text-gray-500 dark:text-gray-400 ml-2 transition-colors">({formatFileSize(file.size)})</span>
                          </div>
                        </div>
                        <button
                          onClick={() => removeAttachment(index)}
                          className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-400 transition-colors"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Upload Progress */}
              {uploading && (
                <div className="mt-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700">Uploading files...</span>
                    <span className="text-sm text-gray-500">{Math.round(uploadProgress)}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="h-2 rounded-full transition-all duration-300"
                      style={{ 
                        width: `${uploadProgress}%`,
                        backgroundColor: getCurrentSubteamColor()
                      }}
                    ></div>
                  </div>
                </div>
              )}
            </div>
          </div>
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

export default CreateDocument; 