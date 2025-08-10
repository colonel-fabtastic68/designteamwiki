import React, { useState, useEffect } from 'react';
import { 
  X, 
  User,
  Crown
} from 'lucide-react';
import { 
  collection, 
  query,
  where,
  getDocs
} from 'firebase/firestore';
import { db } from '../firebase';

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



function TeamMembersModal({ isOpen, onClose, subteamId }) {
  const [teamMembers, setTeamMembers] = useState({
    teamLeads: [],
    designTeam: []
  });
  const [loading, setLoading] = useState(false);

  // Load team members when modal opens
  useEffect(() => {
    if (isOpen && subteamId) {
      loadTeamMembers();
    }
  }, [isOpen, subteamId]);

  const loadTeamMembers = async () => {
    try {
      setLoading(true);
      
      // Get approved users for this subteam
      const usersQuery = query(
        collection(db, 'users'),
        where('subteam', '==', subteamId),
        where('status', '==', 'active')
      );
      const usersSnapshot = await getDocs(usersQuery);
      
      const teamLeads = [];
      const designTeam = [];
      
      usersSnapshot.forEach((userDoc) => {
        const userData = userDoc.data();
        if (userData.role === 'team-lead') {
          teamLeads.push(userData.fullName);
        } else if (userData.role === 'design-team') {
          designTeam.push(userData.fullName);
        }
      });
      
      setTeamMembers({
        teamLeads,
        designTeam
      });
    } catch (error) {
      console.error('Error loading team members:', error);
    } finally {
      setLoading(false);
    }
  };



  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <div className="flex items-center">
            <h2 className="text-xl font-semibold text-gray-900">
              {subteamNames[subteamId]} Team Members
            </h2>
          </div>
          <button
            onClick={onClose}
            className="inline-flex items-center px-3 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Content */}
        <div className="px-6 py-6 overflow-y-auto max-h-[calc(90vh-120px)]">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Team Leads Section */}
              <div>
                <div className="flex items-center mb-3">
                  <Crown className="h-5 w-5 text-yellow-500 mr-2" />
                  <h3 className="text-lg font-medium text-gray-900">Team Leads</h3>
                </div>

                {teamMembers.teamLeads.length === 0 ? (
                  <div className="px-4 py-3 bg-gray-50 rounded-md">
                    <p className="text-gray-500">No team leads assigned yet</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {teamMembers.teamLeads.map((teamLead, index) => (
                      <div key={index} className="flex items-center px-4 py-3 bg-yellow-50 rounded-md border border-yellow-200">
                        <Crown className="h-4 w-4 text-yellow-600 mr-2" />
                        <span className="text-gray-900 font-medium">{teamLead}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Design Team Section */}
              <div>
                <div className="flex items-center mb-3">
                  <User className="h-5 w-5 text-gray-500 mr-2" />
                  <h3 className="text-lg font-medium text-gray-900">Design Team</h3>
                </div>

                {teamMembers.designTeam.length === 0 ? (
                  <div className="px-4 py-3 bg-gray-50 rounded-md">
                    <p className="text-gray-500">No design team members added yet</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {teamMembers.designTeam.map((member, index) => (
                      <div key={index} className="flex items-center px-4 py-3 bg-gray-50 rounded-md">
                        <span className="text-gray-900">{member}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default TeamMembersModal; 