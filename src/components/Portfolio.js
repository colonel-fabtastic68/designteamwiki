import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../firebase';
import { ArrowLeft, Save, ExternalLink, AlertCircle, Lock, Plus, GripVertical, Trash2, Edit3, Check, X as XIcon, Upload, User as UserIcon } from 'lucide-react';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';

function Portfolio() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [urlSlug, setUrlSlug] = useState('');
  const [hasPortfolio, setHasPortfolio] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [sections, setSections] = useState([
    { id: 'intro', title: 'Introduction', content: '', required: true },
    { id: 'experience', title: 'Experience', content: '', required: true },
    { id: 'contact', title: 'Contact', content: '', required: true }
  ]);
  const [editingSectionId, setEditingSectionId] = useState(null);
  const [editingTitleId, setEditingTitleId] = useState(null);
  const [tempTitle, setTempTitle] = useState('');
  
  // Header info
  const [profilePicture, setProfilePicture] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [subtitle, setSubtitle] = useState('49ers Racing Team Member');
  const [uploadingImage, setUploadingImage] = useState(false);

  const loadPortfolio = useCallback(async () => {
    if (!currentUser) return;
    
    setLoading(true);
    try {
      const portfolioRef = doc(db, 'portfolios', currentUser.uid);
      const portfolioDoc = await getDoc(portfolioRef);
      
      if (portfolioDoc.exists()) {
        const data = portfolioDoc.data();
        setUrlSlug(data.urlSlug || '');
        
        // Load sections or use defaults
        if (data.sections && data.sections.length > 0) {
          setSections(data.sections);
        }
        
        // Load header info
        setProfilePicture(data.profilePicture || '');
        setFirstName(data.firstName || '');
        setLastName(data.lastName || '');
        setSubtitle(data.subtitle || '49ers Racing Team Member');
        
        setHasPortfolio(true);
      }
    } catch (error) {
      console.error('Error loading portfolio:', error);
      setError('Failed to load portfolio');
    }
    setLoading(false);
  }, [currentUser]);

  useEffect(() => {
    loadPortfolio();
  }, [loadPortfolio]);

  const validateSlug = (slug) => {
    const regex = /^[a-z0-9-]+$/;
    return regex.test(slug);
  };

  const handleSlugChange = (e) => {
    if (hasPortfolio) return;
    const value = e.target.value.toLowerCase().replace(/\s+/g, '-');
    setUrlSlug(value);
    setError('');
  };

  const modules = {
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

  const formats = [
    'header', 'blockquote',
    'bold', 'italic', 'underline', 'strike',
    'list', 'bullet', 'indent',
    'color', 'background',
    'align', 'link'
  ];

  const handleAddSection = () => {
    const newId = `section-${Date.now()}`;
    const newSection = {
      id: newId,
      title: 'New Section',
      content: '',
      required: false
    };
    setSections([...sections, newSection]);
    setEditingSectionId(newId);
  };

  const handleRemoveSection = (sectionId) => {
    const section = sections.find(s => s.id === sectionId);
    if (section?.required) {
      setError('Cannot remove required sections');
      setTimeout(() => setError(''), 3000);
      return;
    }
    setSections(sections.filter(s => s.id !== sectionId));
    if (editingSectionId === sectionId) {
      setEditingSectionId(null);
    }
  };

  const handleStartEditTitle = (section) => {
    if (section.required) return;
    setEditingTitleId(section.id);
    setTempTitle(section.title);
  };

  const handleSaveTitle = (sectionId) => {
    if (tempTitle.trim()) {
      setSections(sections.map(s => 
        s.id === sectionId ? { ...s, title: tempTitle } : s
      ));
    }
    setEditingTitleId(null);
    setTempTitle('');
  };

  const handleCancelEditTitle = () => {
    setEditingTitleId(null);
    setTempTitle('');
  };

  const handleSectionContentChange = (sectionId, newContent) => {
    setSections(sections.map(s => 
      s.id === sectionId ? { ...s, content: newContent } : s
    ));
  };

  const moveSection = (index, direction) => {
    const newSections = [...sections];
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    
    if (newIndex < 0 || newIndex >= newSections.length) return;
    
    [newSections[index], newSections[newIndex]] = [newSections[newIndex], newSections[index]];
    setSections(newSections);
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError('Please upload an image file');
      setTimeout(() => setError(''), 3000);
      return;
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      setError('Image must be less than 2MB');
      setTimeout(() => setError(''), 3000);
      return;
    }

    setUploadingImage(true);
    try {
      // Upload to Firebase Storage
      const storageRef = ref(storage, `portfolio-images/${currentUser.uid}/${Date.now()}_${file.name}`);
      await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(storageRef);
      
      setProfilePicture(downloadURL);
      setSuccess('Profile picture uploaded!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (error) {
      console.error('Error uploading image:', error);
      setError('Failed to upload image');
      setTimeout(() => setError(''), 3000);
    }
    setUploadingImage(false);
  };

  const handleSave = async () => {
    if (!urlSlug.trim()) {
      setError('Please enter a URL slug');
      return;
    }

    if (!validateSlug(urlSlug)) {
      setError('URL slug can only contain lowercase letters, numbers, and hyphens');
      return;
    }

    const requiredSections = sections.filter(s => s.required);
    const emptyRequired = requiredSections.find(s => !s.content.trim() || s.content === '<p><br></p>');
    if (emptyRequired) {
      setError(`Please add content to the "${emptyRequired.title}" section`);
      return;
    }

    const totalContent = JSON.stringify(sections);
    const contentSize = new Blob([totalContent]).size;
    if (contentSize > 900000) {
      setError('Your portfolio content is too large. Please reduce the amount of text or formatting.');
      return;
    }

    setSaving(true);
    setError('');
    setSuccess('');

    try {
      const slugRef = doc(db, 'portfolio-slugs', urlSlug);
      const slugDoc = await getDoc(slugRef);
      
      if (slugDoc.exists() && slugDoc.data().userId !== currentUser.uid) {
        setError('This URL slug is already taken. Please choose another one.');
        setSaving(false);
        return;
      }

      const portfolioRef = doc(db, 'portfolios', currentUser.uid);
      const portfolioData = {
        userId: currentUser.uid,
        userEmail: currentUser.email,
        urlSlug: urlSlug,
        sections: sections,
        profilePicture: profilePicture,
        firstName: firstName,
        lastName: lastName,
        subtitle: subtitle,
        updatedAt: serverTimestamp()
      };
      
      if (!hasPortfolio) {
        portfolioData.createdAt = serverTimestamp();
      }
      
      await setDoc(portfolioRef, portfolioData, { merge: true });

      await setDoc(slugRef, {
        userId: currentUser.uid,
        userEmail: currentUser.email
      });

      setSuccess('Portfolio saved successfully!');
      setHasPortfolio(true);
      setEditingSectionId(null);
      
      setTimeout(() => setSuccess(''), 3000);
    } catch (error) {
      console.error('Error saving portfolio:', error);
      setError('Failed to save portfolio. Please try again.');
    }

    setSaving(false);
  };

  const handleViewPublic = () => {
    if (urlSlug) {
      window.open(`/${urlSlug}`, '_blank');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 dark:border-white"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 transition-colors">
      {/* Header */}
      <header className="bg-white dark:bg-gray-900 shadow-sm border-b border-gray-200 dark:border-gray-800 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <button
              onClick={() => navigate('/')}
              className="inline-flex items-center px-3 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-colors"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </button>
            
            {/* URL Slug Display */}
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-500 dark:text-gray-400">49ersicdesign.team/</span>
              <input
                type="text"
                value={urlSlug}
                onChange={handleSlugChange}
                placeholder="your-slug"
                disabled={hasPortfolio}
                className={`px-2 py-1 text-sm border rounded-md transition-colors ${
                  hasPortfolio 
                    ? 'bg-gray-100 dark:bg-gray-800 border-gray-300 dark:border-gray-700 text-gray-600 dark:text-gray-400 cursor-not-allowed' 
                    : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white'
                }`}
              />
              {hasPortfolio && <Lock className="h-4 w-4 text-gray-400" />}
            </div>

            <div className="flex items-center space-x-3">
              {hasPortfolio && urlSlug && (
                <button
                  onClick={handleViewPublic}
                  className="inline-flex items-center px-3 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-colors"
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Preview
                </button>
              )}
              <button
                onClick={handleSave}
                disabled={saving}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors"
                style={{
                  backgroundColor: saving ? '#8a7d4f' : '#a49665',
                  '--tw-ring-color': '#a49665'
                }}
              >
                <Save className="h-4 w-4 mr-2" />
                {saving ? 'Saving...' : 'Save Portfolio'}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Error/Success Messages */}
      {error && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-4">
          <div className="flex items-center p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
            <AlertCircle className="h-5 w-5 text-red-500 mr-2" />
            <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
          </div>
        </div>
      )}

      {success && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-4">
          <div className="flex items-center p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-md">
            <p className="text-sm text-green-700 dark:text-green-400">{success}</p>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Left Sidebar - Section Management */}
          <aside className="lg:w-64 flex-shrink-0">
            <div className="bg-white dark:bg-gray-900 rounded-lg shadow-lg p-6 sticky top-24">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Sections</h3>
              
              <div className="space-y-2 mb-4">
                {sections.map((section, index) => (
                  <div 
                    key={section.id}
                    className={`flex items-center gap-2 p-2 rounded-md transition-colors ${
                      editingSectionId === section.id 
                        ? 'bg-gray-200 dark:bg-gray-800' 
                        : 'hover:bg-gray-100 dark:hover:bg-gray-800'
                    }`}
                  >
                    <div className="flex flex-col gap-1">
                      <button
                        onClick={() => moveSection(index, 'up')}
                        disabled={index === 0}
                        className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 disabled:opacity-30 disabled:cursor-not-allowed"
                      >
                        <GripVertical className="h-3 w-3" />
                      </button>
                      <button
                        onClick={() => moveSection(index, 'down')}
                        disabled={index === sections.length - 1}
                        className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 disabled:opacity-30 disabled:cursor-not-allowed"
                      >
                        <GripVertical className="h-3 w-3" />
                      </button>
                    </div>
                    
                    <button
                      onClick={() => setEditingSectionId(section.id)}
                      className="flex-1 text-left text-sm text-gray-700 dark:text-gray-300 truncate"
                    >
                      {section.title}
                      {section.required && <span className="text-xs text-red-500 ml-1">*</span>}
                    </button>
                    
                    {!section.required && (
                      <button
                        onClick={() => handleRemoveSection(section.id)}
                        className="text-red-500 hover:text-red-700 p-1"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>

              <button
                onClick={handleAddSection}
                className="w-full inline-flex items-center justify-center px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-colors"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Section
              </button>
            </div>
          </aside>

          {/* Main Portfolio Preview/Edit Area */}
          <main className="flex-1 min-w-0">
            {/* Header Section */}
            <div className="bg-gradient-to-r from-gray-700 to-gray-900 px-8 py-12 rounded-lg shadow-lg mb-8">
              <div className="flex items-center space-x-6">
                {/* Profile Picture */}
                <div className="relative">
                  <div className="w-24 h-24 rounded-full bg-white dark:bg-gray-800 flex items-center justify-center overflow-hidden">
                    {profilePicture ? (
                      <img src={profilePicture} alt="Profile" className="w-full h-full object-cover" />
                    ) : (
                      <UserIcon className="h-12 w-12 text-gray-600 dark:text-gray-400" />
                    )}
                  </div>
                  <label 
                    htmlFor="profile-upload"
                    className="absolute bottom-0 right-0 bg-white dark:bg-gray-800 rounded-full p-2 shadow-lg cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                  >
                    {uploadingImage ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-900 dark:border-white"></div>
                    ) : (
                      <Upload className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                    )}
                  </label>
                  <input
                    id="profile-upload"
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                </div>

                {/* Name and Subtitle */}
                <div className="flex-1 space-y-2">
                  <div className="flex items-center space-x-2">
                    <input
                      type="text"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      placeholder="First Name"
                      className="px-3 py-2 text-2xl font-bold bg-white/10 border border-white/20 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-white/50 transition-colors"
                    />
                    <input
                      type="text"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      placeholder="Last Name"
                      className="px-3 py-2 text-2xl font-bold bg-white/10 border border-white/20 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-white/50 transition-colors"
                    />
                  </div>
                  <input
                    type="text"
                    value={subtitle}
                    onChange={(e) => setSubtitle(e.target.value)}
                    placeholder="Your subtitle (e.g., Mechanical Engineer)"
                    className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-md text-gray-300 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-white/50 transition-colors"
                  />
                </div>
              </div>
            </div>

            {/* Portfolio Sections */}
            <div className="space-y-8">
              {sections.map((section) => (
                <section
                  key={section.id}
                  id={`section-${section.id}`}
                  className={`bg-white dark:bg-gray-900 rounded-lg shadow-lg p-8 transition-all ${
                    editingSectionId === section.id ? 'ring-2 ring-blue-500' : ''
                  }`}
                >
                  {/* Section Header */}
                  <div className="flex items-center justify-between mb-6 pb-4 border-b-2 border-gray-200 dark:border-gray-700">
                    {editingTitleId === section.id ? (
                      <div className="flex items-center gap-2 flex-1">
                        <input
                          type="text"
                          value={tempTitle}
                          onChange={(e) => setTempTitle(e.target.value)}
                          className="flex-1 text-3xl font-bold bg-transparent border-b-2 border-blue-500 focus:outline-none text-gray-900 dark:text-white"
                          autoFocus
                        />
                        <button
                          onClick={() => handleSaveTitle(section.id)}
                          className="p-2 text-green-500 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-md"
                        >
                          <Check className="h-5 w-5" />
                        </button>
                        <button
                          onClick={handleCancelEditTitle}
                          className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md"
                        >
                          <XIcon className="h-5 w-5" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-3 flex-1">
                        <h2 className="text-3xl font-bold text-gray-900 dark:text-white">
                          {section.title}
                        </h2>
                        {!section.required && (
                          <button
                            onClick={() => handleStartEditTitle(section)}
                            className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                          >
                            <Edit3 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Section Content */}
                  {editingSectionId === section.id ? (
                    <div>
                      <div className="bg-gray-50 dark:bg-gray-800 rounded-md border border-gray-300 dark:border-gray-600 mb-4">
                        <ReactQuill
                          theme="snow"
                          value={section.content}
                          onChange={(value) => handleSectionContentChange(section.id, value)}
                          modules={modules}
                          formats={formats}
                          placeholder={`Add content to your ${section.title.toLowerCase()} section...`}
                          className="portfolio-editor"
                        />
                      </div>
                      <div className="flex justify-end">
                        <button
                          onClick={() => setEditingSectionId(null)}
                          className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                        >
                          Done Editing
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div 
                      onClick={() => setEditingSectionId(section.id)}
                      className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 p-4 rounded-md transition-colors group relative"
                    >
                      {section.content && section.content !== '<p><br></p>' ? (
                        <div 
                          className="portfolio-content prose prose-lg dark:prose-invert max-w-none text-gray-700 dark:text-gray-300"
                          dangerouslySetInnerHTML={{ __html: section.content }}
                        />
                      ) : (
                        <p className="text-gray-400 dark:text-gray-500 italic">
                          Click to add content to this section...
                        </p>
                      )}
                      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black bg-opacity-5 dark:bg-opacity-20 rounded-md">
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 px-4 py-2 rounded-md shadow-lg">
                          Click to edit
                        </span>
                      </div>
                    </div>
                  )}
                </section>
              ))}
            </div>

            {/* Helper Text */}
            <div className="mt-8 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
              <p className="text-sm text-blue-700 dark:text-blue-400">
                💡 <strong>Tip:</strong> Click on any section to edit it. Use the sidebar to reorder sections or add new ones. Don't forget to save your changes!
              </p>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}

export default Portfolio;
