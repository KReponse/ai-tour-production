// frontend/src/hooks/useMediaUpload.js
// ✅ FIXED - Infinite loop resolved

import { useState, useCallback, useRef } from 'react';
import {
  uploadImage,
  uploadVideo,
  uploadMultipleImages,
  uploadMultipleVideos,
  uploadCoverMedia,
} from '../services/mediaUploadService';

export const useMediaUpload = () => {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState('');
  const [currentFile, setCurrentFile] = useState(null);
  const [totalFiles, setTotalFiles] = useState(0);
  const [completedFiles, setCompletedFiles] = useState(0);
  const [errors, setErrors] = useState([]);
  
  // ✅ Use refs to prevent infinite loops
  const isUploadingRef = useRef(false);
  const progressRef = useRef(0);
  const completedRef = useRef(0);
  const totalRef = useRef(0);

  const reset = useCallback(() => {
    setUploading(false);
    setProgress(0);
    setStatus('');
    setCurrentFile(null);
    setTotalFiles(0);
    setCompletedFiles(0);
    setErrors([]);
    isUploadingRef.current = false;
    progressRef.current = 0;
    completedRef.current = 0;
    totalRef.current = 0;
  }, []);

  // ✅ Stable progress update - uses refs to prevent re-renders
  const updateProgress = useCallback((percent, completed, total, type) => {
    // ✅ Only update if values changed
    if (progressRef.current !== percent) {
      progressRef.current = percent;
      setProgress(percent);
    }
    if (completedRef.current !== completed) {
      completedRef.current = completed;
      setCompletedFiles(completed || 0);
    }
    if (totalRef.current !== total) {
      totalRef.current = total;
      setTotalFiles(total || 0);
    }
    if (type && status !== `Uploading ${type} ${completed + 1 || 1}/${total || 1}`) {
      setStatus(`Uploading ${type} ${completed + 1 || 1}/${total || 1}`);
    }
  }, [status]);

  const uploadSingleImage = useCallback(async (file, category = 'general') => {
    setUploading(true);
    isUploadingRef.current = true;
    setProgress(0);
    setStatus('Uploading image...');
    setErrors([]);

    try {
      const result = await uploadImage(file, (percent) => {
        setProgress(percent);
        setStatus(`Uploading image... ${percent}%`);
      }, category);
      return result;
    } catch (error) {
      setErrors(prev => [...prev, { file: file.name, error: error.message }]);
      throw error;
    } finally {
      setUploading(false);
      isUploadingRef.current = false;
      setStatus('Upload complete');
    }
  }, []);

  const uploadSingleVideo = useCallback(async (file, category = 'general') => {
    setUploading(true);
    isUploadingRef.current = true;
    setProgress(0);
    setStatus('Uploading video...');
    setErrors([]);

    try {
      const result = await uploadVideo(file, (percent) => {
        setProgress(percent);
        setStatus(`Uploading video... ${percent}%`);
      }, category);
      return result;
    } catch (error) {
      setErrors(prev => [...prev, { file: file.name, error: error.message }]);
      throw error;
    } finally {
      setUploading(false);
      isUploadingRef.current = false;
      setStatus('Upload complete');
    }
  }, []);

  // ✅ FIXED: No infinite loop - progress updates are stable
  const uploadMultipleImagesFn = useCallback(async (files, category = 'general') => {
    setUploading(true);
    isUploadingRef.current = true;
    setProgress(0);
    setStatus('Uploading images...');
    setErrors([]);
    setTotalFiles(files.length);
    setCompletedFiles(0);
    totalRef.current = files.length;
    completedRef.current = 0;
    progressRef.current = 0;

    try {
      const results = await uploadMultipleImages(files, (percent, completed, total) => {
        // ✅ Use refs to prevent infinite updates
        if (progressRef.current !== percent) {
          progressRef.current = percent;
          setProgress(percent);
        }
        if (completedRef.current !== completed) {
          completedRef.current = completed;
          setCompletedFiles(completed);
        }
        if (totalRef.current !== total) {
          totalRef.current = total;
          setTotalFiles(total);
        }
        setStatus(`Uploading images ${completed}/${total}`);
      }, category);
      return results;
    } catch (error) {
      setErrors(prev => [...prev, { error: error.message }]);
      throw error;
    } finally {
      setUploading(false);
      isUploadingRef.current = false;
      setStatus('Upload complete');
    }
  }, []);

  const uploadMultipleVideosFn = useCallback(async (files, category = 'general') => {
    setUploading(true);
    isUploadingRef.current = true;
    setProgress(0);
    setStatus('Uploading videos...');
    setErrors([]);
    setTotalFiles(files.length);
    setCompletedFiles(0);
    totalRef.current = files.length;
    completedRef.current = 0;
    progressRef.current = 0;

    try {
      const results = await uploadMultipleVideos(files, (percent, completed, total) => {
        if (progressRef.current !== percent) {
          progressRef.current = percent;
          setProgress(percent);
        }
        if (completedRef.current !== completed) {
          completedRef.current = completed;
          setCompletedFiles(completed);
        }
        if (totalRef.current !== total) {
          totalRef.current = total;
          setTotalFiles(total);
        }
        setStatus(`Uploading videos ${completed}/${total}`);
      }, category);
      return results;
    } catch (error) {
      setErrors(prev => [...prev, { error: error.message }]);
      throw error;
    } finally {
      setUploading(false);
      isUploadingRef.current = false;
      setStatus('Upload complete');
    }
  }, []);

  const uploadCover = useCallback(async (file, category = 'listings') => {
    setUploading(true);
    isUploadingRef.current = true;
    setProgress(0);
    setStatus('Uploading cover media...');
    setErrors([]);

    try {
      const result = await uploadCoverMedia(file, (percent) => {
        setProgress(percent);
        setStatus(`Uploading cover... ${percent}%`);
      }, category);
      return result;
    } catch (error) {
      setErrors(prev => [...prev, { file: file.name, error: error.message }]);
      throw error;
    } finally {
      setUploading(false);
      isUploadingRef.current = false;
      setStatus('Upload complete');
    }
  }, []);

  return {
    uploading,
    progress,
    status,
    currentFile,
    totalFiles,
    completedFiles,
    errors,
    reset,
    uploadSingleImage,
    uploadSingleVideo,
    uploadMultipleImages: uploadMultipleImagesFn,
    uploadMultipleVideos: uploadMultipleVideosFn,
    uploadCover,
  };
};

export default useMediaUpload;