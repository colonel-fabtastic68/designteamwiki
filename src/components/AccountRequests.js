import React, { useState, useEffect } from 'react';
import { 
  Check, 
  X, 
  Clock, 
  User, 
  Mail, 
  Crown, 
  Users, 
  Building,
  Car,
  Cpu,
  Gauge,
  Wind,
  Wrench,
  Settings,
  Trash2,
  ChevronDown,
  ChevronRight,
  Edit3,
  Save,
  RefreshCw
} from 'lucide-react';
import { 
  collection, 
  query, 
  where, 
  orderBy, 
  getDocs, 
  updateDoc, 
  doc, 
  deleteDoc,
  addDoc,
  serverTimestamp 
} from 'firebase/firestore';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { db, auth } from '../firebase';

const subteamIcons = {
  'driver-controls': Settings,
  'chassis': Car,
  'electronics': Cpu,
  'vehicle-dynamics': Gauge,
  'aerodynamics': Wind,
  'business': Building,
  'powertrain': Wrench,
  'general': Users
};

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

const roleNames = {
  'team-lead': 'Team Lead',
  'design-team': 'Design Team'
};

function AccountRequests() {
  const [activeTab, setActiveTab] = useState('requests');
  const [requests, setRequests] = useState([]);
  const [duplicates, setDuplicates] = useState([]);
  const [teamMembers, setTeamMembers] = useState({});
  const [expandedSubteams, setExpandedSubteams] = useState({});
  const [editingMember, setEditingMember] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(null);
  const [message, setMessage] = useState({ type: '', text: '' });

  useEffect(() => {
    loadRequests();
    loadTeamMembers();
  }, []);

  const loadRequests = async () => {
    try {
      setLoading(true);
      
      // Get all pending requests
      let requestsData = [];
      try {
        const q = query(
          collection(db, 'accountRequests'),
          where('status', '==', 'pending'),
          orderBy('createdAt', 'desc')
        );
        const querySnapshot = await getDocs(q);
        querySnapshot.forEach((doc) => {
          requestsData.push({ id: doc.id, ...doc.data() });
        });
      } catch (indexError) {
        // If index is not ready, fall back to client-side filtering
        console.log('Index not ready, using client-side filtering...');
        const allRequestsQuery = query(collection(db, 'accountRequests'));
        const allRequestsSnapshot = await getDocs(allRequestsQuery);
        allRequestsSnapshot.forEach((doc) => {
          const data = doc.data();
          if (data.status === 'pending') {
            requestsData.push({ id: doc.id, ...data });
          }
        });
      }

      // Get all existing users to filter out already approved emails
      const usersQuery = query(collection(db, 'users'));
      const usersSnapshot = await getDocs(usersQuery);
      const existingEmails = new Set();
      usersSnapshot.forEach((doc) => {
        const userData = doc.data();
        if (userData.email) {
          existingEmails.add(userData.email.toLowerCase());
        }
      });

      // Filter out requests for emails that already have accounts
      requestsData = requestsData.filter(request => 
        !existingEmails.has(request.email.toLowerCase())
      );

      // Sort by createdAt descending
      requestsData.sort((a, b) => {
        const aTime = a.createdAt?.toDate?.() || new Date(a.createdAt);
        const bTime = b.createdAt?.toDate?.() || new Date(b.createdAt);
        return bTime - aTime;
      });
      
      // Find duplicates based on email
      const emailGroups = {};
      requestsData.forEach(request => {
        const email = request.email.toLowerCase();
        if (!emailGroups[email]) {
          emailGroups[email] = [];
        }
        emailGroups[email].push(request);
      });
      
      const uniqueRequests = [];
      const duplicateGroups = [];
      
      Object.values(emailGroups).forEach(group => {
        if (group.length === 1) {
          uniqueRequests.push(group[0]);
        } else {
          // Keep the most recent request, mark others as duplicates
          group.sort((a, b) => {
            const aTime = a.createdAt?.toDate?.() || new Date(a.createdAt);
            const bTime = b.createdAt?.toDate?.() || new Date(b.createdAt);
            return bTime - aTime;
          });
          uniqueRequests.push(group[0]);
          duplicateGroups.push(group.slice(1));
        }
      });
      
      setRequests(uniqueRequests);
      setDuplicates(duplicateGroups.flat());
    } catch (error) {
      console.error('Error loading requests:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (requestId, requestData) => {
    try {
      setProcessing(requestId);
      
      // Check if user already exists
      const usersQuery = query(collection(db, 'users'), where('email', '==', requestData.email));
      const usersSnapshot = await getDocs(usersQuery);
      
      if (!usersSnapshot.empty) {
        // User already exists, just update the request status and remove from pending
        await updateDoc(doc(db, 'accountRequests', requestId), {
          status: 'approved',
          approvedAt: serverTimestamp(),
          note: 'User already had an existing account'
        });
        
        // Remove from pending requests
        setRequests(prev => prev.filter(req => req.id !== requestId));
        showMessage('success', 'Request marked as approved (user already had account)!');
        return;
      }
      
      // Create Firebase Auth account with the stored password
      if (requestData.password) {
        await createUserWithEmailAndPassword(auth, requestData.email, requestData.password);
      }
      
      // Update the request status to approved
      await updateDoc(doc(db, 'accountRequests', requestId), {
        status: 'approved',
        approvedAt: serverTimestamp()
      });

      // Create a user account record
      await addDoc(collection(db, 'users'), {
        email: requestData.email,
        firstName: requestData.firstName,
        lastName: requestData.lastName,
        fullName: requestData.fullName,
        role: requestData.role,
        subteam: requestData.subteam,
        status: 'active',
        createdAt: serverTimestamp(),
        approvedAt: serverTimestamp()
      });

      // Remove from pending requests
      setRequests(prev => prev.filter(req => req.id !== requestId));
      showMessage('success', 'Request approved successfully!');
    } catch (error) {
      console.error('Error approving request:', error);
      if (error.code === 'auth/email-already-in-use') {
        // Handle the case where auth account exists but user record doesn't
        try {
          // Update the request status to approved
          await updateDoc(doc(db, 'accountRequests', requestId), {
            status: 'approved',
            approvedAt: serverTimestamp(),
            note: 'Auth account already existed'
          });
          
          // Remove from pending requests
          setRequests(prev => prev.filter(req => req.id !== requestId));
          showMessage('success', 'Request approved (auth account already existed)!');
        } catch (updateError) {
          console.error('Error updating request status:', updateError);
          showMessage('error', 'Failed to update request status. Please try again.');
        }
      } else {
        showMessage('error', 'Failed to approve request. Please try again.');
      }
    } finally {
      setProcessing(null);
    }
  };

  const handleDeny = async (requestId) => {
    try {
      setProcessing(requestId);
      
      // Update the request status to denied
      await updateDoc(doc(db, 'accountRequests', requestId), {
        status: 'denied',
        deniedAt: serverTimestamp()
      });

      // Remove from pending requests
      setRequests(prev => prev.filter(req => req.id !== requestId));
      showMessage('success', 'Request denied successfully!');
    } catch (error) {
      console.error('Error denying request:', error);
      showMessage('error', 'Failed to deny request. Please try again.');
    } finally {
      setProcessing(null);
    }
  };

  const handleDeleteDuplicate = async (requestId) => {
    if (!window.confirm('Are you sure you want to delete this duplicate request?')) {
      return;
    }

    try {
      setProcessing(requestId);
      
      // Delete the duplicate request
      await deleteDoc(doc(db, 'accountRequests', requestId));

      // Remove from duplicates list
      setDuplicates(prev => prev.filter(req => req.id !== requestId));
      showMessage('success', 'Duplicate request deleted successfully!');
    } catch (error) {
      console.error('Error deleting duplicate:', error);
      showMessage('error', 'Failed to delete duplicate. Please try again.');
    } finally {
      setProcessing(null);
    }
  };

  const showMessage = (type, text) => {
    setMessage({ type, text });
    setTimeout(() => setMessage({ type: '', text: '' }), 5000);
  };

  const cleanupOrphanedRequests = async () => {
    try {
      setLoading(true);
      
      // Get all pending requests
      const requestsQuery = query(collection(db, 'accountRequests'), where('status', '==', 'pending'));
      const requestsSnapshot = await getDocs(requestsQuery);
      
      // Get all existing users
      const usersQuery = query(collection(db, 'users'));
      const usersSnapshot = await getDocs(usersQuery);
      const existingEmails = new Set();
      usersSnapshot.forEach((doc) => {
        const userData = doc.data();
        if (userData.email) {
          existingEmails.add(userData.email.toLowerCase());
        }
      });
      
      // Find orphaned requests (pending requests for emails that already have accounts)
      const orphanedRequests = [];
      requestsSnapshot.forEach((doc) => {
        const requestData = doc.data();
        if (existingEmails.has(requestData.email.toLowerCase())) {
          orphanedRequests.push({ id: doc.id, ...requestData });
        }
      });
      
      // Update orphaned requests to approved status
      for (const request of orphanedRequests) {
        await updateDoc(doc(db, 'accountRequests', request.id), {
          status: 'approved',
          approvedAt: serverTimestamp(),
          note: 'Auto-approved: User already had account'
        });
      }
      
      // Reload requests to reflect changes
      await loadRequests();
      
      if (orphanedRequests.length > 0) {
        showMessage('success', `Cleaned up ${orphanedRequests.length} orphaned requests.`);
      } else {
        showMessage('info', 'No orphaned requests found.');
      }
    } catch (error) {
      console.error('Error cleaning up orphaned requests:', error);
      showMessage('error', 'Failed to cleanup orphaned requests. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const loadTeamMembers = async () => {
    try {
      const q = query(
        collection(db, 'users'),
        where('status', '==', 'active')
      );
      const querySnapshot = await getDocs(q);
      const membersBySubteam = {};
      
      querySnapshot.forEach((doc) => {
        const member = { id: doc.id, ...doc.data() };
        const subteam = member.subteam || 'general';
        if (!membersBySubteam[subteam]) {
          membersBySubteam[subteam] = [];
        }
        membersBySubteam[subteam].push(member);
      });
      
      setTeamMembers(membersBySubteam);
    } catch (error) {
      console.error('Error loading team members:', error);
    }
  };

  const handleToggleSubteam = (subteamId) => {
    setExpandedSubteams(prev => ({
      ...prev,
      [subteamId]: !prev[subteamId]
    }));
  };

  const handleEditMember = (member) => {
    setEditingMember(member.id);
    setEditForm({
      firstName: member.firstName || '',
      lastName: member.lastName || '',
      email: member.email || '',
      role: member.role || 'design-team',
      subteam: member.subteam || 'general'
    });
  };

  const handleSaveMember = async () => {
    try {
      setProcessing(editingMember);
      
      const updatedData = {
        ...editForm,
        fullName: `${editForm.firstName} ${editForm.lastName}`,
        updatedAt: serverTimestamp()
      };

      await updateDoc(doc(db, 'users', editingMember), updatedData);
      
      setEditingMember(null);
      setEditForm({});
      await loadTeamMembers(); // Reload team members
      showMessage('success', 'Member updated successfully!');
    } catch (error) {
      console.error('Error updating member:', error);
      showMessage('error', 'Failed to update member. Please try again.');
    } finally {
      setProcessing(null);
    }
  };

  const handleDeleteMember = async (memberId) => {
    if (!window.confirm('Are you sure you want to remove this team member?')) {
      return;
    }

    try {
      setProcessing(memberId);
      
      await deleteDoc(doc(db, 'users', memberId));
      await loadTeamMembers(); // Reload team members
      showMessage('success', 'Member removed successfully!');
    } catch (error) {
      console.error('Error deleting member:', error);
      showMessage('error', 'Failed to delete member. Please try again.');
    } finally {
      setProcessing(null);
    }
  };

  const handleCancelEdit = () => {
    setEditingMember(null);
    setEditForm({});
  };

  const handleEditFormChange = (e) => {
    const { name, value } = e.target;
    setEditForm(prev => ({
      ...prev,
      [name]: value
    }));
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

  const getSubteamIcon = (subteamId) => {
    const IconComponent = subteamIcons[subteamId];
    return IconComponent || Users;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('requests')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'requests'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Pending Requests ({requests.length + duplicates.length})
          </button>
          <button
            onClick={() => setActiveTab('team')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'team'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Team Overview
          </button>
        </nav>
      </div>

      {/* Message Display */}
      {message.text && (
        <div className={`rounded-md p-4 ${
          message.type === 'success' ? 'bg-green-50 border border-green-200 text-green-800' :
          message.type === 'error' ? 'bg-red-50 border border-red-200 text-red-800' :
          'bg-blue-50 border border-blue-200 text-blue-800'
        }`}>
          <div className="flex">
            <div className="flex-shrink-0">
              {message.type === 'success' ? (
                <Check className="h-5 w-5 text-green-400" />
              ) : message.type === 'error' ? (
                <X className="h-5 w-5 text-red-400" />
              ) : (
                <Clock className="h-5 w-5 text-blue-400" />
              )}
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium">{message.text}</p>
            </div>
          </div>
        </div>
      )}

      {/* Tab Content */}
      {activeTab === 'requests' && (
        <div>
          {requests.length === 0 && duplicates.length === 0 ? (
            <div className="bg-white rounded-lg shadow border border-gray-200 p-8 text-center">
              <Clock className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Pending Requests</h3>
              <p className="text-gray-500">All account requests have been processed.</p>
              <div className="mt-4">
                <button
                  onClick={cleanupOrphanedRequests}
                  disabled={loading}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <Settings className="h-4 w-4 mr-2" />
                  Check for Orphaned Requests
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Pending Requests */}
              {requests.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-medium text-gray-900">Pending Requests ({requests.length})</h3>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={loadRequests}
                        disabled={loading}
                        className="inline-flex items-center px-3 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Refresh
                      </button>
                      <button
                        onClick={cleanupOrphanedRequests}
                        disabled={loading}
                        className="inline-flex items-center px-3 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        <Settings className="h-4 w-4 mr-2" />
                        Cleanup Orphaned
                      </button>
                    </div>
                  </div>
                  <div className="space-y-4">
                    {requests.map((request) => {
                      const SubteamIcon = getSubteamIcon(request.subteam);
                      const RoleIcon = request.role === 'team-lead' ? Crown : Users;
                      
                      return (
                        <div key={request.id} className="bg-white rounded-lg shadow border border-gray-200 p-6">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center space-x-3 mb-4">
                                <div className="flex items-center space-x-2">
                                  <User className="h-5 w-5 text-gray-500" />
                                  <h3 className="text-lg font-semibold text-gray-900">
                                    {request.fullName}
                                  </h3>
                                </div>
                                <div className="flex items-center space-x-2">
                                  <Mail className="h-4 w-4 text-gray-400" />
                                  <span className="text-sm text-gray-600">{request.email}</span>
                                </div>
                              </div>

                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                <div className="flex items-center space-x-2">
                                  <RoleIcon className="h-4 w-4 text-gray-500" />
                                  <span className="text-sm text-gray-600">
                                    Role: <span className="font-medium">{roleNames[request.role]}</span>
                                  </span>
                                </div>
                                
                                <div className="flex items-center space-x-2">
                                  <SubteamIcon className="h-4 w-4 text-gray-500" />
                                  <span className="text-sm text-gray-600">
                                    Subteam: <span className="font-medium">{subteamNames[request.subteam]}</span>
                                  </span>
                                </div>
                              </div>

                              <div className="flex items-center space-x-2 text-sm text-gray-500">
                                <Clock className="h-4 w-4" />
                                <span>Requested on {formatDate(request.createdAt)}</span>
                              </div>
                            </div>

                            <div className="flex items-center space-x-2 ml-4">
                              <button
                                onClick={() => handleApprove(request.id, request)}
                                disabled={processing === request.id}
                                className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                              >
                                {processing === request.id ? (
                                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                ) : (
                                  <>
                                    <Check className="h-4 w-4 mr-1" />
                                    Approve
                                  </>
                                )}
                              </button>
                              
                              <button
                                onClick={() => handleDeny(request.id)}
                                disabled={processing === request.id}
                                className="inline-flex items-center px-3 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                              >
                                {processing === request.id ? (
                                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-700"></div>
                                ) : (
                                  <>
                                    <X className="h-4 w-4 mr-1" />
                                    Deny
                                  </>
                                )}
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Duplicate Requests */}
              {duplicates.length > 0 && (
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Duplicate Requests ({duplicates.length})</h3>
                  <div className="space-y-4">
                    {duplicates.map((request) => {
                      const SubteamIcon = getSubteamIcon(request.subteam);
                      const RoleIcon = request.role === 'team-lead' ? Crown : Users;
                      
                      return (
                        <div key={request.id} className="bg-yellow-50 rounded-lg shadow border border-yellow-200 p-6">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center space-x-3 mb-4">
                                <div className="flex items-center space-x-2">
                                  <User className="h-5 w-5 text-gray-500" />
                                  <h3 className="text-lg font-semibold text-gray-900">
                                    {request.fullName}
                                  </h3>
                                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                                    Duplicate
                                  </span>
                                </div>
                                <div className="flex items-center space-x-2">
                                  <Mail className="h-4 w-4 text-gray-400" />
                                  <span className="text-sm text-gray-600">{request.email}</span>
                                </div>
                              </div>

                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                <div className="flex items-center space-x-2">
                                  <RoleIcon className="h-4 w-4 text-gray-500" />
                                  <span className="text-sm text-gray-600">
                                    Role: <span className="font-medium">{roleNames[request.role]}</span>
                                  </span>
                                </div>
                                
                                <div className="flex items-center space-x-2">
                                  <SubteamIcon className="h-4 w-4 text-gray-500" />
                                  <span className="text-sm text-gray-600">
                                    Subteam: <span className="font-medium">{subteamNames[request.subteam]}</span>
                                  </span>
                                </div>
                              </div>

                              <div className="flex items-center space-x-2 text-sm text-gray-500">
                                <Clock className="h-4 w-4" />
                                <span>Requested on {formatDate(request.createdAt)}</span>
                              </div>
                            </div>

                            <div className="flex items-center space-x-2 ml-4">
                              <button
                                onClick={() => handleDeleteDuplicate(request.id)}
                                disabled={processing === request.id}
                                className="inline-flex items-center px-3 py-2 border border-red-300 text-sm font-medium rounded-md text-red-700 bg-white hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                              >
                                {processing === request.id ? (
                                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-700"></div>
                                ) : (
                                  <>
                                    <Trash2 className="h-4 w-4 mr-1" />
                                    Delete Duplicate
                                  </>
                                )}
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Team Overview Tab */}
      {activeTab === 'team' && (
        <div className="space-y-4">
          {Object.keys(teamMembers).length === 0 ? (
            <div className="bg-white rounded-lg shadow border border-gray-200 p-8 text-center">
              <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Team Members</h3>
              <p className="text-gray-500">No active team members found.</p>
            </div>
          ) : (
            Object.entries(teamMembers).map(([subteamId, members]) => {
              const SubteamIcon = getSubteamIcon(subteamId);
              const isExpanded = expandedSubteams[subteamId];
              
              return (
                <div key={subteamId} className="bg-white rounded-lg shadow border border-gray-200">
                  <button
                    onClick={() => handleToggleSubteam(subteamId)}
                    className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center space-x-3">
                      <SubteamIcon className="h-5 w-5 text-gray-500" />
                      <h3 className="text-lg font-medium text-gray-900">
                        {subteamNames[subteamId]} ({members.length})
                      </h3>
                    </div>
                    {isExpanded ? (
                      <ChevronDown className="h-5 w-5 text-gray-500" />
                    ) : (
                      <ChevronRight className="h-5 w-5 text-gray-500" />
                    )}
                  </button>
                  
                  {isExpanded && (
                    <div className="border-t border-gray-200">
                      <div className="p-6 space-y-4">
                        {members.map((member) => {
                          const RoleIcon = member.role === 'captain' ? Crown : member.role === 'team-lead' ? Crown : Users;
                          
                          return (
                            <div key={member.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                              {editingMember === member.id ? (
                                <div className="flex-1 space-y-3">
                                  <div className="grid grid-cols-2 gap-3">
                                    <input
                                      type="text"
                                      name="firstName"
                                      value={editForm.firstName}
                                      onChange={handleEditFormChange}
                                      placeholder="First Name"
                                      className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    />
                                    <input
                                      type="text"
                                      name="lastName"
                                      value={editForm.lastName}
                                      onChange={handleEditFormChange}
                                      placeholder="Last Name"
                                      className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    />
                                  </div>
                                  <input
                                    type="email"
                                    name="email"
                                    value={editForm.email}
                                    onChange={handleEditFormChange}
                                    placeholder="Email"
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                  />
                                  <div className="grid grid-cols-2 gap-3">
                                    <select
                                      name="role"
                                      value={editForm.role}
                                      onChange={handleEditFormChange}
                                      className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    >
                                      <option value="design-team">Design Team</option>
                                      <option value="team-lead">Team Lead</option>
                                      <option value="captain">Captain</option>
                                    </select>
                                    <select
                                      name="subteam"
                                      value={editForm.subteam}
                                      onChange={handleEditFormChange}
                                      className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    >
                                      {Object.keys(subteamNames).map(subteam => (
                                        <option key={subteam} value={subteam}>
                                          {subteamNames[subteam]}
                                        </option>
                                      ))}
                                    </select>
                                  </div>
                                  <div className="flex items-center space-x-2">
                                    <button
                                      onClick={handleSaveMember}
                                      disabled={processing === member.id}
                                      className="inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                    >
                                      {processing === member.id ? (
                                        <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div>
                                      ) : (
                                        <>
                                          <Save className="h-3 w-3 mr-1" />
                                          Save
                                        </>
                                      )}
                                    </button>
                                    <button
                                      onClick={handleCancelEdit}
                                      className="inline-flex items-center px-3 py-1 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-colors"
                                    >
                                      Cancel
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <>
                                  <div className="flex items-center space-x-3">
                                    <RoleIcon className="h-4 w-4 text-gray-500" />
                                    <div>
                                      <h4 className="text-sm font-medium text-gray-900">
                                        {member.fullName}
                                      </h4>
                                      <p className="text-xs text-gray-500">{member.email}</p>
                                      <p className="text-xs text-gray-500">
                                        {roleNames[member.role]} • {subteamNames[member.subteam]}
                                      </p>
                                    </div>
                                  </div>
                                  <div className="flex items-center space-x-2">
                                    <button
                                      onClick={() => handleEditMember(member)}
                                      className="inline-flex items-center px-2 py-1 border border-gray-300 text-xs font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-colors"
                                    >
                                      <Edit3 className="h-3 w-3 mr-1" />
                                      Edit
                                    </button>
                                    <button
                                      onClick={() => handleDeleteMember(member.id)}
                                      disabled={processing === member.id}
                                      className="inline-flex items-center px-2 py-1 border border-red-300 text-xs font-medium rounded-md text-red-700 bg-white hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                    >
                                      {processing === member.id ? (
                                        <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-red-700"></div>
                                      ) : (
                                        <>
                                          <Trash2 className="h-3 w-3 mr-1" />
                                          Remove
                                        </>
                                      )}
                                    </button>
                                  </div>
                                </>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}

export default AccountRequests; 