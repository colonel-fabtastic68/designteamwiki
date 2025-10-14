import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { ArrowLeft, Save, ExternalLink, AlertCircle, Lock } from 'lucide-react';
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
    // Only allow lowercase letters, numbers, and hyphens
    const regex = /^[a-z0-9-]+$/;
    return regex.test(slug);
  };

  const handleSlugChange = (e) => {
    // Don't allow slug changes if portfolio already exists
    if (hasPortfolio) return;
    
    const value = e.target.value.toLowerCase().replace(/\s+/g, '-');
    setUrlSlug(value);
    setError('');
  };

  // Rich text editor modules configuration (no image upload to avoid size limits)
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
    setSections([...sections, {
      id: newId,
      title: 'New Section',
      content: '',
      required: false
    }]);
  };

  const handleRemoveSection = (sectionId) => {
    const section = sections.find(s => s.id === sectionId);
    if (section?.required) {
      setError('Cannot remove required sections');
      setTimeout(() => setError(''), 3000);
      return;
    }
    setSections(sections.filter(s => s.id !== sectionId));
  };

  const handleSectionTitleChange = (sectionId, newTitle) => {
    setSections(sections.map(s => 
      s.id === sectionId ? { ...s, title: newTitle } : s
    ));
  };

  const handleSectionContentChange = (sectionId, newContent) => {
    setSections(sections.map(s => 
      s.id === sectionId ? { ...s, content: newContent } : s
    ));
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

    // Validate required sections have content
    const requiredSections = sections.filter(s => s.required);
    const emptyRequired = requiredSections.find(s => !s.content.trim() || s.content === '<p><br></p>');
    if (emptyRequired) {
      setError(`Please add content to the "${emptyRequired.title}" section`);
      return;
    }

    // Check total content size
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
      // Check if slug is already taken by another user
      const slugRef = doc(db, 'portfolio-slugs', urlSlug);
      const slugDoc = await getDoc(slugRef);
      
      if (slugDoc.exists() && slugDoc.data().userId !== currentUser.uid) {
        setError('This URL slug is already taken. Please choose another one.');
        setSaving(false);
        return;
      }

      // Save the portfolio
      const portfolioRef = doc(db, 'portfolios', currentUser.uid);
      const portfolioData = {
        userId: currentUser.uid,
        userEmail: currentUser.email,
        urlSlug: urlSlug,
        sections: sections,
        updatedAt: serverTimestamp()
      };
      
      // Only add createdAt for new portfolios
      if (!hasPortfolio) {
        portfolioData.createdAt = serverTimestamp();
      }
      
      await setDoc(portfolioRef, portfolioData, { merge: true });

      // Save the slug mapping
      await setDoc(slugRef, {
        userId: currentUser.uid,
        userEmail: currentUser.email
      });

      setSuccess('Portfolio saved successfully!');
      setHasPortfolio(true);
      
      // Clear success message after 3 seconds
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
      <header className="bg-white dark:bg-gray-900 shadow-sm border-b border-gray-200 dark:border-gray-800">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <button
                onClick={() => navigate('/')}
                className="inline-flex items-center px-3 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-colors"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Dashboard
              </button>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">My Portfolio</h1>
            <div className="w-32"></div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-5xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="bg-white dark:bg-gray-900 shadow rounded-lg p-6 space-y-6">
          {/* URL Slug Input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Portfolio URL Slug {hasPortfolio && <span className="text-xs text-gray-500">(locked)</span>}
            </label>
            <div className="flex items-center space-x-2">
              <span className="text-gray-500 dark:text-gray-400">49ersicdesign.team/</span>
              <div className="relative flex-1">
                <input
                  type="text"
                  value={urlSlug}
                  onChange={handleSlugChange}
                  placeholder="your-name"
                  className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 transition-colors ${
                    hasPortfolio 
                      ? 'bg-gray-100 dark:bg-gray-800 border-gray-300 dark:border-gray-700 text-gray-600 dark:text-gray-400 cursor-not-allowed' 
                      : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white'
                  }`}
                  style={{ '--tw-ring-color': '#a49665' }}
                  disabled={saving || hasPortfolio}
                />
                {hasPortfolio && (
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                    <Lock className="h-4 w-4 text-gray-400" />
                  </div>
                )}
              </div>
              {hasPortfolio && urlSlug && (
                <button
                  onClick={handleViewPublic}
                  className="inline-flex items-center px-3 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-colors"
                  title="View public portfolio"
                >
                  <ExternalLink className="h-4 w-4" />
                </button>
              )}
            </div>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              {hasPortfolio 
                ? '🔒 Your URL slug is permanently set and cannot be changed' 
                : 'Choose a unique URL for your portfolio (lowercase letters, numbers, and hyphens only)'
              }
            </p>
          </div>

          {/* Portfolio Sections */}
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Portfolio Sections</h3>
              <button
                onClick={handleAddSection}
                disabled={saving}
                className="inline-flex items-center px-3 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-colors"
              >
                <Save className="h-4 w-4 mr-2" />
                Add Section
              </button>
            </div>

            {sections.map((section, index) => (
              <div key={section.id} className="border border-gray-300 dark:border-gray-600 rounded-lg p-6 bg-gray-50 dark:bg-gray-800 transition-colors">
                {/* Section Header */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex-1">
                    <input
                      type="text"
                      value={section.title}
                      onChange={(e) => handleSectionTitleChange(section.id, e.target.value)}
                      disabled={section.required}
                      className={`text-xl font-bold bg-transparent border-b-2 focus:outline-none transition-colors ${
                        section.required 
                          ? 'border-transparent text-gray-700 dark:text-gray-300 cursor-not-allowed' 
                          : 'border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white hover:border-gray-400 dark:hover:border-gray-500'
                      }`}
                      style={{ '--tw-ring-color': '#a49665' }}
                      placeholder="Section Title"
                    />
                    {section.required && (
                      <span className="ml-2 text-xs text-red-500">*Required</span>
                    )}
                  </div>
                  {!section.required && (
                    <button
                      onClick={() => handleRemoveSection(section.id)}
                      disabled={saving}
                      className="ml-4 p-2 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md transition-colors"
                      title="Remove section"
                    >
                      <AlertCircle className="h-5 w-5" />
                    </button>
                  )}
                </div>

                {/* Section Content Editor */}
                <div className="bg-white dark:bg-gray-900 rounded-md border border-gray-300 dark:border-gray-600">
                  <ReactQuill
                    theme="snow"
                    value={section.content}
                    onChange={(value) => handleSectionContentChange(section.id, value)}
                    modules={modules}
                    formats={formats}
                    placeholder={`Add content to your ${section.title.toLowerCase()} section...`}
                    className="portfolio-editor"
                    readOnly={saving}
                  />
                </div>
                <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                  Section {index + 1} of {sections.length} • {section.required ? 'Required section' : 'Optional section'}
                </p>
              </div>
            ))}

            <p className="text-sm text-gray-500 dark:text-gray-400 italic">
              💡 Tip: Add sections to organize your portfolio (Projects, Skills, Education, etc.)
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="flex items-center p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
              <AlertCircle className="h-5 w-5 text-red-500 mr-2" />
              <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
            </div>
          )}

          {/* Success Message */}
          {success && (
            <div className="flex items-center p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-md">
              <p className="text-sm text-green-700 dark:text-green-400">{success}</p>
            </div>
          )}

          {/* Save Button */}
          <div className="flex justify-end">
            <button
              onClick={handleSave}
              disabled={saving}
              className="inline-flex items-center px-6 py-3 border border-transparent text-sm font-medium rounded-md text-white focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors"
              style={{
                backgroundColor: saving ? '#8a7d4f' : '#a49665',
                '--tw-ring-color': '#a49665'
              }}
              onMouseEnter={(e) => {
                if (!saving) e.target.style.backgroundColor = '#8a7d4f';
              }}
              onMouseLeave={(e) => {
                if (!saving) e.target.style.backgroundColor = '#a49665';
              }}
            >
              <Save className="h-4 w-4 mr-2" />
              {saving ? 'Saving...' : 'Save Portfolio'}
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}

export default Portfolio;

