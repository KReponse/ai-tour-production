// src/components/provider/DeleteListingModal.jsx
// ✅ New component - Wrapper for DeleteTourModal with listing defaults

import React from 'react';
import DeleteTourModal from './DeleteTourModal';

const DeleteListingModal = ({ 
  listing, 
  isOpen, 
  onClose, 
  onSuccess 
}) => {
  return (
    <DeleteTourModal
      listing={listing}
      isOpen={isOpen}
      onClose={onClose}
      onSuccess={onSuccess}
      entityType="listing"
    />
  );
};

export default DeleteListingModal;