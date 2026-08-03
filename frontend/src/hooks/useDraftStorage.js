// frontend/src/hooks/useDraftStorage.js
// ✅ NEW - Auto-save draft with debounce, restore, and beforeunload protection

import { useState, useEffect, useCallback, useRef } from 'react';

const DEFAULT_DEBOUNCE = 500;

/**
 * useDraftStorage Hook
 * 
 * Automatically saves form data to localStorage with debounce.
 * Restores draft on page load with user confirmation.
 * Shows warning before closing browser with unsaved changes.
 * 
 * @param {string} key - localStorage key (unique per form)
 * @param {object} initialState - Initial form state
 * @param {object} options - Configuration options
 * @param {number} options.debounce - Debounce delay in ms (default: 500)
 * @param {boolean} options.enabled - Enable/disable draft (default: true)
 * @param {function} options.onRestore - Callback when draft is restored
 * @param {function} options.onSave - Callback when draft is saved
 * 
 * @returns {object} { formData, setFormData, clearDraft, hasDraft, restoreDraft, hasUnsavedChanges, saveDraft }
 */
export const useDraftStorage = (key, initialState, options = {}) => {
  const {
    debounce = DEFAULT_DEBOUNCE,
    enabled = true,
    onRestore = null,
    onSave = null,
  } = options;

  // ✅ State for form data
  const [formData, setFormData] = useState(() => {
    if (!enabled) return initialState;
    
    // ✅ Try to restore from localStorage
    const saved = localStorage.getItem(key);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // ✅ Check if draft has any data (not empty)
        const hasData = Object.keys(parsed).some(k => 
          parsed[k] !== null && 
          parsed[k] !== undefined && 
          parsed[k] !== '' &&
          !(Array.isArray(parsed[k]) && parsed[k].length === 0) &&
          !(typeof parsed[k] === 'object' && Object.keys(parsed[k]).length === 0)
        );
        if (hasData) {
          console.log(`📦 Draft restored for: ${key}`);
          if (onRestore) onRestore(parsed);
          return parsed;
        }
      } catch (e) {
        console.warn(`⚠️ Failed to parse draft for ${key}:`, e);
        localStorage.removeItem(key);
      }
    }
    return initialState;
  });

  // ✅ Track if there are unsaved changes
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  
  // ✅ Refs for debounce and initial state
  const saveTimeoutRef = useRef(null);
  const initialDataRef = useRef(initialState);
  const isFirstRenderRef = useRef(true);

  // ✅ Function to save draft to localStorage
  const saveDraft = useCallback((data) => {
    if (!enabled) return;

    // ✅ Check if data has changed from initial state
    const hasChanges = JSON.stringify(data) !== JSON.stringify(initialDataRef.current);
    setHasUnsavedChanges(hasChanges);

    // ✅ Clear existing timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    // ✅ If no changes, remove draft from localStorage
    if (!hasChanges) {
      localStorage.removeItem(key);
      console.log(`🗑️ Draft cleared (no changes) for: ${key}`);
      return;
    }

    // ✅ Debounce save
    saveTimeoutRef.current = setTimeout(() => {
      try {
        localStorage.setItem(key, JSON.stringify(data));
        console.log(`💾 Draft saved for: ${key} (${Object.keys(data).length} fields)`);
        if (onSave) onSave(data);
      } catch (e) {
        console.warn(`⚠️ Failed to save draft for ${key}:`, e);
      }
    }, debounce);
  }, [key, debounce, enabled, onSave]);

  // ✅ Update form data and auto-save
  const setFormDataWithSave = useCallback((data) => {
    setFormData(data);
    saveDraft(data);
  }, [saveDraft]);

  // ✅ Clear draft from localStorage
  const clearDraft = useCallback(() => {
    localStorage.removeItem(key);
    setFormData(initialState);
    setHasUnsavedChanges(false);
    console.log(`🗑️ Draft cleared for: ${key}`);
  }, [key, initialState]);

  // ✅ Check if draft exists in localStorage
  const hasDraft = useCallback(() => {
    const saved = localStorage.getItem(key);
    if (!saved) return false;
    try {
      const parsed = JSON.parse(saved);
      // ✅ Check if draft has any meaningful data
      return Object.keys(parsed).some(k => 
        parsed[k] !== null && 
        parsed[k] !== undefined && 
        parsed[k] !== '' &&
        !(Array.isArray(parsed[k]) && parsed[k].length === 0) &&
        !(typeof parsed[k] === 'object' && Object.keys(parsed[k]).length === 0)
      );
    } catch {
      return false;
    }
  }, [key]);

  // ✅ Restore draft from localStorage
  const restoreDraft = useCallback(() => {
    const saved = localStorage.getItem(key);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setFormData(parsed);
        setHasUnsavedChanges(true);
        console.log(`📦 Draft restored for: ${key}`);
        if (onRestore) onRestore(parsed);
        return parsed;
      } catch (e) {
        console.warn(`⚠️ Failed to restore draft for ${key}:`, e);
      }
    }
    return null;
  }, [key, onRestore]);

  // ✅ Before unload - warn user about unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = 'You have unsaved changes. Are you sure you want to leave?';
        return e.returnValue;
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges]);

  // ✅ Save on unmount (cleanup)
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
        // ✅ Save immediately on unmount
        const currentData = formData;
        const hasChanges = JSON.stringify(currentData) !== JSON.stringify(initialDataRef.current);
        if (hasChanges) {
          try {
            localStorage.setItem(key, JSON.stringify(currentData));
            console.log(`💾 Draft saved on unmount for: ${key}`);
          } catch (e) {
            console.warn(`⚠️ Failed to save draft on unmount for ${key}:`, e);
          }
        }
      }
    };
  }, [formData, key]);

  // ✅ Skip initial save on first render
  useEffect(() => {
    if (isFirstRenderRef.current) {
      isFirstRenderRef.current = false;
      return;
    }
    // ✅ Auto-save on form data change (already handled by setFormDataWithSave)
  }, [formData]);

  // ✅ Remove draft when form is submitted successfully (call this from component)
  const clearOnSuccess = useCallback(() => {
    clearDraft();
  }, [clearDraft]);

  return {
    // ✅ Form data and setter
    formData,
    setFormData: setFormDataWithSave,
    
    // ✅ Draft management
    clearDraft,
    clearOnSuccess,
    hasDraft,
    restoreDraft,
    saveDraft,
    
    // ✅ Status
    hasUnsavedChanges,
  };
};

export default useDraftStorage;