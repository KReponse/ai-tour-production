// frontend/src/pages/provider/Travelers.jsx
// ✅ COMPLETE FIXED - Properly handle provider-specific travelers data

import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  User,
  Mail,
  Phone,
  Calendar,
  MapPin,
  Search,
  Loader2,
  Eye,
  Sparkles,
  ArrowUpRight,
  ChevronDown,
  Filter,
  Clock,
  CheckCircle,
  XCircle,
  MessageCircle,
} from 'lucide-react';
import { getProviderTravelers } from '../../services/bookingService';
import { useAuth } from '../../contexts/AuthContext';
import { getOrCreateRoom } from '../../services/chatService';
import toast from 'react-hot-toast';

// ===============================
// AI TOUR COLORS
// ===============================
// Teal  : #0D9488
// Gold  : #F59E0B
// Slate : #374151
// White : #FFFFFF
// ===============================

const Travelers = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [travelers, setTravelers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState('all');
  const [chatLoading, setChatLoading] = useState({});
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    completed: 0,
    pending: 0,
  });

  useEffect(() => {
    fetchTravelers();
  }, []);

  const fetchTravelers = async () => {
    try {
      setLoading(true);
      
      // ✅ This now only returns travelers for the authenticated provider
      const data = await getProviderTravelers();
      
      console.log('📊 Provider travelers response:', data);
      
      // ✅ Handle different response formats
      let travelersList = [];
      if (data.success && data.travelers) {
        travelersList = data.travelers;
      } else if (Array.isArray(data)) {
        travelersList = data;
      } else if (data.data && Array.isArray(data.data)) {
        travelersList = data.data;
      }
      
      setTravelers(travelersList);

      // Calculate stats
      const total = travelersList.length;
      const active = travelersList.filter(t => 
        t.status === 'confirmed' || t.status === 'in_progress'
      ).length;
      const completed = travelersList.filter(t => 
        t.status === 'completed'
      ).length;
      const pending = travelersList.filter(t => 
        t.status === 'pending_payment' || t.status === 'pending'
      ).length;

      setStats({ total, active, completed, pending });
    } catch (error) {
      console.error('Error fetching travelers:', error);
      setTravelers([]);
      setStats({ total: 0, active: 0, completed: 0, pending: 0 });
      toast.error('Failed to load travelers');
    } finally {
      setLoading(false);
    }
  };

  // ✅ Handle Chat with Traveler
  const handleChatWithTraveler = async (travelerId, travelerName) => {
    if (!travelerId) {
      toast.error('Traveler information not available');
      return;
    }

    // Set loading state for this specific traveler
    setChatLoading(prev => ({ ...prev, [travelerId]: true }));

    try {
      const response = await getOrCreateRoom(travelerId);
      if (response.success) {
        navigate(`/chat/${response.room._id}`);
      } else {
        toast.error(response.message || 'Failed to start chat');
      }
    } catch (error) {
      console.error('Error starting chat:', error);
      toast.error('Failed to start chat. Please try again.');
    } finally {
      setChatLoading(prev => ({ ...prev, [travelerId]: false }));
    }
  };

  const getStatusBadge = (status) => {
    const styles = {
      confirmed: { bg: 'bg-[#0D9488]/10 text-[#0D9488]', icon: CheckCircle, label: 'Confirmed' },
      pending: { bg: 'bg-[#F59E0B]/10 text-[#F59E0B]', icon: Clock, label: 'Pending' },
      pending_payment: { bg: 'bg-[#F59E0B]/10 text-[#F59E0B]', icon: Clock, label: 'Pending Payment' },
      completed: { bg: 'bg-green-100 text-green-600', icon: CheckCircle, label: 'Completed' },
      cancelled: { bg: 'bg-red-100 text-red-600', icon: XCircle, label: 'Cancelled' },
      in_progress: { bg: 'bg-blue-100 text-blue-600', icon: Clock, label: 'In Progress' },
    };
    return styles[status] || styles.pending;
  };

  const filteredTravelers = travelers.filter((traveler) => {
    const search = searchTerm.toLowerCase();
    const name = (traveler.fullName || traveler.user?.name || '').toLowerCase();
    const email = (traveler.email || traveler.user?.email || '').toLowerCase();
    const phone = (traveler.phone || traveler.user?.phone || '').toLowerCase();
    
    const matchesSearch = name.includes(search) || email.includes(search) || phone.includes(search);
    const matchesFilter = filter === 'all' || traveler.status === filter;
    
    return matchesSearch && matchesFilter;
  });

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-96">
        <div className="relative w-16 h-16">
          <div className="absolute inset-0 rounded-full border-4 border-[#0D9488]/20" />
          <div className="absolute inset-0 rounded-full border-4 border-[#0D9488] border-t-transparent animate-spin" />
        </div>
        <p className="mt-4 text-gray-500 dark:text-gray-400">Loading travelers...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* HEADER */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#0D9488] to-[#F59E0B] flex items-center justify-center shadow-lg">
              <Users className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-black text-[#374151] dark:text-white">
                Travelers
              </h1>
              <p className="text-gray-500 dark:text-gray-400 mt-1">
                Manage your travelers and their bookings
              </p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-400">
          <Sparkles className="w-4 h-4 text-[#0D9488]" />
          <span>{travelers.length} total travelers</span>
        </div>
      </div>

      {/* STATS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-900 rounded-2xl p-4 border border-gray-100 dark:border-gray-800 shadow-sm">
          <p className="text-sm text-gray-500 dark:text-gray-400">Total Travelers</p>
          <p className="text-2xl font-bold text-[#374151] dark:text-white">{stats.total}</p>
        </div>
        <div className="bg-white dark:bg-gray-900 rounded-2xl p-4 border border-gray-100 dark:border-gray-800 shadow-sm">
          <p className="text-sm text-gray-500 dark:text-gray-400">Active</p>
          <p className="text-2xl font-bold text-[#0D9488]">{stats.active}</p>
        </div>
        <div className="bg-white dark:bg-gray-900 rounded-2xl p-4 border border-gray-100 dark:border-gray-800 shadow-sm">
          <p className="text-sm text-gray-500 dark:text-gray-400">Completed</p>
          <p className="text-2xl font-bold text-green-600">{stats.completed}</p>
        </div>
        <div className="bg-white dark:bg-gray-900 rounded-2xl p-4 border border-gray-100 dark:border-gray-800 shadow-sm">
          <p className="text-sm text-gray-500 dark:text-gray-400">Pending</p>
          <p className="text-2xl font-bold text-[#F59E0B]">{stats.pending}</p>
        </div>
      </div>

      {/* SEARCH & FILTER */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search by name, email, or phone..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full h-12 pl-12 pr-4 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 focus:ring-2 focus:ring-[#0D9488] focus:border-transparent transition outline-none"
          />
        </div>
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="h-12 px-4 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 focus:ring-2 focus:ring-[#0D9488] focus:border-transparent outline-none"
        >
          <option value="all">All Status</option>
          <option value="confirmed">Confirmed</option>
          <option value="in_progress">In Progress</option>
          <option value="completed">Completed</option>
          <option value="pending_payment">Pending Payment</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>

      {/* TRAVELERS TABLE */}
      {filteredTravelers.length === 0 ? (
        <div className="bg-white dark:bg-gray-900 rounded-3xl p-16 text-center border border-gray-200 dark:border-gray-800 shadow-sm">
          <div className="w-20 h-20 rounded-full bg-[#0D9488]/10 flex items-center justify-center mx-auto mb-4">
            <Users className="w-10 h-10 text-[#0D9488]" />
          </div>
          <h2 className="text-2xl font-bold text-[#374151] dark:text-white mb-2">
            {searchTerm ? 'No Travelers Found' : 'No Travelers Yet'}
          </h2>
          <p className="text-gray-500 dark:text-gray-400">
            {searchTerm
              ? 'Try adjusting your search'
              : 'Travelers will appear here once they book your experiences'}
          </p>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-900 rounded-3xl border border-gray-200 dark:border-gray-800 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-800/50">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Traveler
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Contact
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Trip Date
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Travelers
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-4 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Chat
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                {filteredTravelers.map((traveler) => {
                  const statusStyle = getStatusBadge(traveler.status);
                  const StatusIcon = statusStyle.icon;
                  const name = traveler.fullName || traveler.user?.name || 'Unknown';
                  const email = traveler.email || traveler.user?.email || 'N/A';
                  const phone = traveler.phone || traveler.user?.phone || 'N/A';
                  const travelDate = traveler.travelDate || traveler.tripDate;
                  const travelersCount = traveler.travelers || 1;
                  const travelerId = traveler.user?._id || traveler.userId || traveler._id;
                  const isChatLoading = chatLoading[travelerId];

                  return (
                    <tr key={traveler._id || Math.random().toString()} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#0D9488] to-[#F59E0B] flex items-center justify-center text-white font-bold">
                            {name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-medium text-[#374151] dark:text-white">
                              {name}
                            </p>
                            <p className="text-xs text-gray-500">ID: {traveler._id?.slice(-8) || 'N/A'}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="space-y-1">
                          <p className="text-sm text-gray-600 dark:text-gray-300 flex items-center gap-1">
                            <Mail className="w-3 h-3 text-gray-400" />
                            {email}
                          </p>
                          <p className="text-sm text-gray-600 dark:text-gray-300 flex items-center gap-1">
                            <Phone className="w-3 h-3 text-gray-400" />
                            {phone}
                          </p>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                          <Calendar className="w-4 h-4 text-[#0D9488]" />
                          {travelDate ? new Date(travelDate).toLocaleDateString() : 'N/A'}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-300">
                        {travelersCount} person{travelersCount > 1 ? 's' : ''}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${statusStyle.bg} ${statusStyle.text}`}>
                          <StatusIcon className="w-3 h-3" />
                          {statusStyle.label}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        {travelerId ? (
                          <button
                            onClick={() => handleChatWithTraveler(travelerId, name)}
                            disabled={isChatLoading}
                            className="p-2 rounded-xl hover:bg-[#0D9488]/10 transition text-gray-400 hover:text-[#0D9488] disabled:opacity-50 disabled:cursor-not-allowed"
                            title={`Chat with ${name}`}
                          >
                            {isChatLoading ? (
                              <Loader2 className="w-5 h-5 animate-spin text-[#0D9488]" />
                            ) : (
                              <MessageCircle className="w-5 h-5" />
                            )}
                          </button>
                        ) : (
                          <span className="text-xs text-gray-400">N/A</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-gray-100 dark:border-gray-800 flex justify-between items-center text-sm text-gray-500">
            <span>Showing {filteredTravelers.length} of {travelers.length} travelers</span>
            <span>Last updated: {new Date().toLocaleString()}</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default Travelers;