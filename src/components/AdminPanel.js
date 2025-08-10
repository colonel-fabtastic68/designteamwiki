import React, { useState, useEffect } from 'react';
import { 
  Shield, 
  UserPlus, 
  Trash2, 
  Edit3, 
  Save, 
  X,
  Crown,
  Mail,
  User,
  Check,
  AlertCircle
} from 'lucide-react';
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  addDoc, 
  updateDoc, 
  doc, 
  deleteDoc,
  serverTimestamp 
} from 'firebase/firestore';
import { db } from '../firebase';

function AdminPanel() {
  const [captains, setCaptains] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingCaptain, setEditingCaptain] = useState(null);
  const [formData, setFormData] = useState({
    email: '',
    firstName: '',
    lastName: '',
    subteam: 'general'
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const subteams = [
    { id: 'driver-controls', name: 'Driver Controls' },
    { id: 'chassis', name: 'Chassis' },
    { id: 'electronics', name: 'Electronics' },
    { id: 'vehicle-dynamics', name: 'Vehicle Dynamics' },
    { id: 'aerodynamics', name: 'Aerodynamics' },
    { id: 'business', name: 'Business' },
    { id: 'powertrain', name: 'Powertrain' },
    { id: 'general', name: 'General' }
  ];

  useEffect(() => {
    loadCaptains();
  }, []);

  const loadCaptains = async () => {
    try {
      setLoading(true);
      const q = query(
        collection(db, 'users'),
        where('role', '==', 'captain')
      );
      const querySnapshot = await getDocs(q);
      const captainsData = [];
      querySnapshot.forEach((doc) => {
        captainsData.push({ id: doc.id, ...doc.data() });
      });
      setCaptains(captainsData);
    } catch (error) {
      console.error('Error loading captains:', error);
      setError('Failed to load captains');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.email || !formData.firstName || !formData.lastName) {
      setError('Please fill in all required fields');
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      setError('Please enter a valid email address');
      return;
    }

    try {
      setError('');
      setSuccess('');

      const captainData = {
        email: formData.email,
        firstName: formData.firstName,
        lastName: formData.lastName,
        fullName: `${formData.firstName} ${formData.lastName}`,
        role: 'captain',
        subteam: formData.subteam,
        status: 'active',
        createdAt: serverTimestamp(),
        approvedAt: serverTimestamp()
      };

      if (editingCaptain) {
        // Update existing captain
        await updateDoc(doc(db, 'users', editingCaptain.id), captainData);
        setSuccess('Captain updated successfully!');
      } else {
        // Add new captain
        await addDoc(collection(db, 'users'), captainData);
        setSuccess('Captain added successfully!');
      }

      // Reset form
      setFormData({
        email: '',
        firstName: '',
        lastName: '',
        subteam: 'general'
      });
      setEditingCaptain(null);
      setShowAddForm(false);
      
      // Reload captains
      await loadCaptains();
    } catch (error) {
      console.error('Error saving captain:', error);
      setError('Failed to save captain. Please try again.');
    }
  };

  const handleEdit = (captain) => {
    setEditingCaptain(captain);
    setFormData({
      email: captain.email,
      firstName: captain.firstName,
      lastName: captain.lastName,
      subteam: captain.subteam
    });
    setShowAddForm(true);
  };

  const handleDelete = async (captainId) => {
    if (!window.confirm('Are you sure you want to remove this captain?')) {
      return;
    }

    try {
      await deleteDoc(doc(db, 'users', captainId));
      setSuccess('Captain removed successfully!');
      await loadCaptains();
    } catch (error) {
      console.error('Error deleting captain:', error);
      setError('Failed to remove captain. Please try again.');
    }
  };

  const handleCancel = () => {
    setFormData({
      email: '',
      firstName: '',
      lastName: '',
      subteam: 'general'
    });
    setEditingCaptain(null);
    setShowAddForm(false);
    setError('');
    setSuccess('');
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

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <Shield className="h-6 w-6 text-gray-600 mr-3" />
          <h2 className="text-2xl font-bold text-gray-900">Captain Management</h2>
        </div>
        <button
          onClick={() => setShowAddForm(true)}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
        >
          <UserPlus className="h-4 w-4 mr-2" />
          Add Captain
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          <div className="flex items-center">
            <AlertCircle className="h-5 w-5 mr-2" />
            {error}
          </div>
        </div>
      )}

      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg">
          <div className="flex items-center">
            <Check className="h-5 w-5 mr-2" />
            {success}
          </div>
        </div>
      )}

      {/* Add/Edit Form */}
      {showAddForm && (
        <div className="bg-white dark:bg-gray-900 rounded-lg shadow border border-gray-200 dark:border-gray-700 p-6 transition-colors">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white transition-colors">
              {editingCaptain ? 'Edit Captain' : 'Add New Captain'}
            </h3>
            <button
              onClick={handleCancel}
              className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-400 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 transition-colors">
                  First Name *
                </label>
                <input
                  id="firstName"
                  name="firstName"
                  type="text"
                  required
                  value={formData.firstName}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 transition-colors"
                />
              </div>
              
              <div>
                <label htmlFor="lastName" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 transition-colors">
                  Last Name *
                </label>
                <input
                  id="lastName"
                  name="lastName"
                  type="text"
                  required
                  value={formData.lastName}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 transition-colors"
                />
              </div>
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 transition-colors">
                Email Address *
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                value={formData.email}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 transition-colors"
              />
            </div>

            <div>
              <label htmlFor="subteam" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 transition-colors">
                Primary Subteam
              </label>
              <select
                id="subteam"
                name="subteam"
                value={formData.subteam}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white transition-colors"
              >
                {subteams.map(subteam => (
                  <option key={subteam.id} value={subteam.id}>
                    {subteam.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center justify-end space-x-3 pt-4">
              <button
                type="button"
                onClick={handleCancel}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
              >
                {editingCaptain ? 'Update Captain' : 'Add Captain'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Captains List */}
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow border border-gray-200 dark:border-gray-700 transition-colors">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white transition-colors">Current Captains</h3>
        </div>
        
        {captains.length === 0 ? (
          <div className="px-6 py-8 text-center">
            <Crown className="h-12 w-12 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2 transition-colors">No Captains Found</h3>
            <p className="text-gray-500 dark:text-gray-400 transition-colors">Add the first captain to get started.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {captains.map((captain) => (
              <div key={captain.id} className="px-6 py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="flex items-center">
                      <Crown className="h-5 w-5 text-yellow-500 mr-2" />
                      <div>
                        <h4 className="text-lg font-medium text-gray-900 dark:text-white transition-colors">
                          {captain.fullName}
                        </h4>
                        <div className="flex items-center space-x-4 text-sm text-gray-500 dark:text-gray-400 transition-colors">
                          <div className="flex items-center">
                            <Mail className="h-4 w-4 mr-1" />
                            {captain.email}
                          </div>
                          <div className="flex items-center">
                            <User className="h-4 w-4 mr-1" />
                            {subteams.find(s => s.id === captain.subteam)?.name || captain.subteam}
                          </div>
                        </div>
                        <p className="text-xs text-gray-400 dark:text-gray-500 mt-1 transition-colors">
                          Added: {formatDate(captain.createdAt)}
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handleEdit(captain)}
                      className="inline-flex items-center px-3 py-1 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-colors"
                    >
                      <Edit3 className="h-4 w-4 mr-1" />
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(captain.id)}
                      className="inline-flex items-center px-3 py-1 border border-red-300 dark:border-red-600 text-sm font-medium rounded-md text-red-700 dark:text-red-400 bg-white dark:bg-gray-800 hover:bg-red-50 dark:hover:bg-red-900/20 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors"
                    >
                      <Trash2 className="h-4 w-4 mr-1" />
                      Remove
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      
      {/* Version Display */}
      <div className="fixed bottom-4 right-20 z-50">
        <div className="text-xs text-gray-500 dark:text-gray-400 font-mono transition-colors">
          v1.0.2
        </div>
      </div>
    </div>
  );
}

export default AdminPanel; 