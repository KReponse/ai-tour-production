// frontend/src/hooks/useRequests.js
import { useState, useEffect, useCallback } from 'react';
import { 
  getMyRequests, 
  createRequest,
  updateRequestStatus,
  deleteRequest 
} from '../services/request.service';

export const useRequests = (token) => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Load requests
  const loadRequests = useCallback(async () => {
    if (!token) return;
    
    try {
      setLoading(true);
      const response = await getMyRequests(token);
      setRequests(response.requests || []);
      setError(null);
    } catch (err) {
      setError(err.message || 'Failed to load requests');
      console.error('Error loading requests:', err);
    } finally {
      setLoading(false);
    }
  }, [token]);

  // Create request
  const createNewRequest = useCallback(async (data) => {
    try {
      const response = await createRequest(data, token);
      await loadRequests(); // Reload
      return response;
    } catch (err) {
      setError(err.message || 'Failed to create request');
      throw err;
    }
  }, [token, loadRequests]);

  // Update status
  const updateStatus = useCallback(async (id, status, adminNote) => {
    try {
      const response = await updateRequestStatus(id, status, adminNote, token);
      await loadRequests(); // Reload
      return response;
    } catch (err) {
      setError(err.message || 'Failed to update request');
      throw err;
    }
  }, [token, loadRequests]);

  // Delete request
  const deleteRequestById = useCallback(async (id) => {
    try {
      const response = await deleteRequest(id, token);
      await loadRequests(); // Reload
      return response;
    } catch (err) {
      setError(err.message || 'Failed to delete request');
      throw err;
    }
  }, [token, loadRequests]);

  // Load on mount
  useEffect(() => {
    loadRequests();
  }, [loadRequests]);

  return {
    requests,
    loading,
    error,
    loadRequests,
    createNewRequest,
    updateStatus,
    deleteRequestById
  };
};