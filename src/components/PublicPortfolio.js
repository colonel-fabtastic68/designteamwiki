import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { ArrowLeft, User, Calendar, Menu, X, Mail, Phone, Briefcase, ChevronDown } from 'lucide-react';

function PublicPortfolio() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [portfolio, setPortfolio] = useState(null);
  const [notFound, setNotFound] = useState(false);
  const [activeSection, setActiveSection] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [expandedExperienceIds, setExpandedExperienceIds] = useState([]);

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

      const portfolioData = portfolioDoc.data();
      setPortfolio(portfolioData);
      
      // Set first section as active
      if (portfolioData.sections && portfolioData.sections.length > 0) {
        setActiveSection(portfolioData.sections[0].id);
      }
    } catch (error) {
      console.error('Error loading portfolio:', error);
      setNotFound(true);
    }

    setLoading(false);
  }, [slug]);

  useEffect(() => {
    loadPortfolio();
  }, [loadPortfolio]);

  useEffect(() => {
    // Handle scroll spy for active section
    const handleScroll = () => {
      if (!portfolio?.sections) return;

      const scrollPosition = window.scrollY + 100;

      for (let i = portfolio.sections.length - 1; i >= 0; i--) {
        const section = portfolio.sections[i];
        const element = document.getElementById(`section-${section.id}`);
        
        if (element && element.offsetTop <= scrollPosition) {
          setActiveSection(section.id);
          break;
        }
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [portfolio]);

  const scrollToSection = (sectionId) => {
    const element = document.getElementById(`section-${sectionId}`);
    if (element) {
      const offset = 80; // Header offset
      const elementPosition = element.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.pageYOffset - offset;

      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth'
      });
    }
    setSidebarOpen(false);
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return '';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const toggleExperienceExpanded = (expId) => {
    if (expandedExperienceIds.includes(expId)) {
      setExpandedExperienceIds(expandedExperienceIds.filter(id => id !== expId));
    } else {
      setExpandedExperienceIds([...expandedExperienceIds, expId]);
    }
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
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">49ers Racing</h1>
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="lg:hidden inline-flex items-center px-3 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none transition-colors"
            >
              {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
            <div className="hidden lg:block w-20"></div>
          </div>
        </div>
      </header>

      {/* Main Content with Sidebar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Sidebar Navigation - Desktop */}
          <aside className="hidden lg:block w-64 flex-shrink-0">
            <div className="sticky top-24 space-y-2">
              <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-4">
                Sections
              </h3>
              {portfolio.sections?.map((section) => (
                <button
                  key={section.id}
                  onClick={() => scrollToSection(section.id)}
                  className={`block w-full text-left px-4 py-2 rounded-md transition-colors ${
                    activeSection === section.id
                      ? 'bg-gray-200 dark:bg-gray-800 text-gray-900 dark:text-white font-medium'
                      : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white'
                  }`}
                >
                  {section.title}
                </button>
              ))}
            </div>
          </aside>

          {/* Mobile Sidebar */}
          {sidebarOpen && (
            <div className="lg:hidden fixed inset-0 z-50 bg-black bg-opacity-50" onClick={() => setSidebarOpen(false)}>
              <div className="bg-white dark:bg-gray-900 w-64 h-full shadow-xl p-6 space-y-2" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Sections
                  </h3>
                  <button
                    onClick={() => setSidebarOpen(false)}
                    className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
                {portfolio.sections?.map((section) => (
                  <button
                    key={section.id}
                    onClick={() => scrollToSection(section.id)}
                    className={`block w-full text-left px-4 py-2 rounded-md transition-colors ${
                      activeSection === section.id
                        ? 'bg-gray-200 dark:bg-gray-800 text-gray-900 dark:text-white font-medium'
                        : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white'
                    }`}
                  >
                    {section.title}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Main Content Area */}
          <main className="flex-1 min-w-0">
            {/* Portfolio Header */}
            <div className="bg-gradient-to-r from-gray-700 to-gray-900 px-8 py-12 rounded-t-lg shadow-lg mb-8">
              <div className="flex items-center space-x-6">
                <div className="w-24 h-24 rounded-full bg-white dark:bg-gray-800 flex items-center justify-center overflow-hidden">
                  {portfolio.profilePicture ? (
                    <img src={portfolio.profilePicture} alt="Profile" className="w-full h-full object-cover" />
                  ) : (
                    <User className="h-12 w-12 text-gray-600 dark:text-gray-400" />
                  )}
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-white mb-2">
                    {portfolio.firstName && portfolio.lastName 
                      ? `${portfolio.firstName} ${portfolio.lastName}`
                      : portfolio.userEmail?.split('@')[0] || 'Portfolio'}
                  </h1>
                  <p className="text-gray-300">
                    {portfolio.subtitle || '49ers Racing Team Member'}
                  </p>
                </div>
              </div>
            </div>

            {/* Portfolio Sections */}
            <div className="space-y-12">
              {portfolio.sections?.map((section, index) => (
                <section
                  key={section.id}
                  id={`section-${section.id}`}
                  className="bg-white dark:bg-gray-900 rounded-lg shadow-lg p-8 scroll-mt-24 transition-colors"
                >
                  <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-6 pb-4 border-b-2 border-gray-200 dark:border-gray-700">
                    {section.title}
                  </h2>
                  
                  {section.id === 'contact' ? (
                    /* Contact Section - Special rendering */
                    <div className="space-y-6">
                      {(portfolio.contactEmail || portfolio.contactPhone) && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          {portfolio.contactEmail && (
                            <a
                              href={`mailto:${portfolio.contactEmail}`}
                              className="flex items-center gap-3 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors group"
                            >
                              <div className="p-3 bg-blue-100 dark:bg-blue-900 rounded-full group-hover:bg-blue-200 dark:group-hover:bg-blue-800 transition-colors">
                                <Mail className="h-5 w-5 text-blue-600 dark:text-blue-300" />
                              </div>
                              <div>
                                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Email</p>
                                <p className="text-lg font-semibold text-gray-900 dark:text-white">{portfolio.contactEmail}</p>
                              </div>
                            </a>
                          )}
                          {portfolio.contactPhone && (
                            <a
                              href={`tel:${portfolio.contactPhone}`}
                              className="flex items-center gap-3 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors group"
                            >
                              <div className="p-3 bg-green-100 dark:bg-green-900 rounded-full group-hover:bg-green-200 dark:group-hover:bg-green-800 transition-colors">
                                <Phone className="h-5 w-5 text-green-600 dark:text-green-300" />
                              </div>
                              <div>
                                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Phone</p>
                                <p className="text-lg font-semibold text-gray-900 dark:text-white">{portfolio.contactPhone}</p>
                              </div>
                            </a>
                          )}
                        </div>
                      )}
                      {section.content && section.content !== '<p><br></p>' && (
                        <div 
                          className="portfolio-content prose prose-lg dark:prose-invert max-w-none text-gray-700 dark:text-gray-300"
                          dangerouslySetInnerHTML={{ __html: section.content }}
                        />
                      )}
                    </div>
                  ) : section.id === 'experience' ? (
                    /* Experience Section - Special rendering with accordion */
                    <div className="space-y-6">
                      {portfolio.experiences && portfolio.experiences.length > 0 ? (
                        portfolio.experiences.map((exp) => (
                          <div key={exp.id} className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden hover:shadow-md transition-shadow">
                            {/* Experience Header - Clickable */}
                            <div 
                              onClick={() => toggleExperienceExpanded(exp.id)}
                              className="p-6 bg-gray-50 dark:bg-gray-800 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                            >
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
                                    <Briefcase className="h-5 w-5 text-blue-500" />
                                    {exp.jobTitle}
                                  </h3>
                                  <p className="text-lg text-gray-700 dark:text-gray-300 mb-2">{exp.company}</p>
                                  <p className="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-2">
                                    <Calendar className="h-4 w-4" />
                                    {exp.startMonth && exp.startYear ? `${exp.startMonth} ${exp.startYear}` : 'Start Date'} - {exp.current ? 'Present' : exp.endMonth && exp.endYear ? `${exp.endMonth} ${exp.endYear}` : 'End Date'}
                                  </p>
                                </div>
                                <button className="p-2 transition-transform" style={{ transform: expandedExperienceIds.includes(exp.id) ? 'rotate(180deg)' : 'rotate(0deg)' }}>
                                  <ChevronDown className="h-6 w-6 text-gray-400" />
                                </button>
                              </div>
                            </div>

                            {/* Experience Content - Collapsible */}
                            {expandedExperienceIds.includes(exp.id) && (exp.photo || exp.description || (exp.skills && exp.skills.length > 0)) && (
                              <div className="p-6 bg-white dark:bg-gray-900 space-y-4">
                                {exp.photo && (
                                  <div>
                                    <img src={exp.photo} alt={exp.jobTitle} className="w-full max-w-md rounded-lg border border-gray-300 dark:border-gray-600 shadow-md" />
                                  </div>
                                )}
                                {exp.description && exp.description !== '<p><br></p>' && (
                                  <div 
                                    className="portfolio-content prose prose-lg dark:prose-invert max-w-none text-gray-700 dark:text-gray-300"
                                    dangerouslySetInnerHTML={{ __html: exp.description }}
                                  />
                                )}
                                {exp.skills && exp.skills.length > 0 && (
                                  <div>
                                    <h4 className="text-sm font-semibold text-gray-600 dark:text-gray-400 mb-3 uppercase tracking-wider">
                                      Skills Utilized
                                    </h4>
                                    <div className="flex flex-wrap gap-2">
                                      {exp.skills.map((skill, idx) => (
                                        <span
                                          key={idx}
                                          className="px-3 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded-full text-sm font-medium"
                                        >
                                          {skill}
                                        </span>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        ))
                      ) : (
                        <p className="text-gray-500 dark:text-gray-400 italic">No experience entries yet.</p>
                      )}
                    </div>
                  ) : (
                    /* Normal Section */
                    <div 
                      className="portfolio-content prose prose-lg dark:prose-invert max-w-none text-gray-700 dark:text-gray-300"
                      dangerouslySetInnerHTML={{ __html: section.content }}
                    />
                  )}
                </section>
              ))}
            </div>

            {/* Footer */}
            <div className="mt-12 pt-8 border-t border-gray-200 dark:border-gray-800">
              <div className="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400">
                <p>Charlotte 49ers Racing - Formula SAE Electric</p>
                {portfolio.updatedAt && (
                  <div className="flex items-center">
                    <Calendar className="h-4 w-4 mr-2" />
                    Last updated: {formatDate(portfolio.updatedAt)}
                  </div>
                )}
              </div>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}

export default PublicPortfolio;
