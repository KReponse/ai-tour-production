// frontend/src/components/ui/UploadProgress.jsx
// ✅ Upload Progress UI Component

import React from 'react';
import { Loader2, CheckCircle, XCircle, Upload, Image, Video, FileImage, FileVideo } from 'lucide-react';
import clsx from 'clsx';

const UploadProgress = ({
  isUploading = false,
  progress = 0,
  status = '',
  completed = 0,
  total = 0,
  errors = [],
  onCancel,
  className,
}) => {
  if (!isUploading && progress === 0 && !status && errors.length === 0) {
    return null;
  }

  const isComplete = progress === 100 && !isUploading && errors.length === 0;

  return (
    <div className={clsx('w-full bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 p-4 shadow-lg', className)}>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className={clsx(
            'w-10 h-10 rounded-xl flex items-center justify-center',
            isComplete ? 'bg-green-100 dark:bg-green-900/30' : 
            errors.length > 0 ? 'bg-red-100 dark:bg-red-900/30' :
            'bg-[#0D9488]/10 dark:bg-[#0D9488]/20'
          )}>
            {isComplete ? (
              <CheckCircle className="w-5 h-5 text-green-500" />
            ) : errors.length > 0 ? (
              <XCircle className="w-5 h-5 text-red-500" />
            ) : (
              <Upload className="w-5 h-5 text-[#0D9488] animate-pulse" />
            )}
          </div>
          <div>
            <p className="font-semibold text-[#374151] dark:text-white">
              {isComplete ? 'Upload Complete!' : 
               errors.length > 0 ? 'Upload Failed' : 
               'Uploading Media'}
            </p>
            {status && (
              <p className="text-sm text-gray-500 dark:text-gray-400">{status}</p>
            )}
          </div>
        </div>
        {onCancel && !isComplete && errors.length === 0 && (
          <button
            onClick={onCancel}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition"
          >
            Cancel
          </button>
        )}
      </div>

      {/* Progress Bar */}
      {!isComplete && errors.length === 0 && (
        <div className="relative h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-[#0D9488] to-[#F59E0B] rounded-full transition-all duration-300"
            style={{ width: `${Math.min(progress, 100)}%` }}
          />
        </div>
      )}

      {/* Stats */}
      {total > 0 && !isComplete && errors.length === 0 && (
        <div className="flex items-center justify-between mt-3 text-sm text-gray-500 dark:text-gray-400">
          <span>
            {completed} of {total} files uploaded
          </span>
          <span className="font-medium text-[#0D9488]">
            {Math.min(progress, 100)}%
          </span>
        </div>
      )}

      {/* Errors */}
      {errors.length > 0 && (
        <div className="mt-3 space-y-1">
          {errors.map((err, index) => (
            <div key={index} className="text-sm text-red-600 dark:text-red-400 flex items-start gap-2">
              <XCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>{err.file ? `${err.file}: ` : ''}{err.error}</span>
            </div>
          ))}
        </div>
      )}

      {/* Completion State */}
      {isComplete && (
        <div className="mt-3 flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
          <CheckCircle className="w-4 h-4" />
          <span>All files uploaded successfully</span>
        </div>
      )}
    </div>
  );
};

export default UploadProgress;