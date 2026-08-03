// src/services/cloudinaryService.js

import axios from 'axios';

const CLOUD_NAME =
  'dw6po8hag';

const UPLOAD_PRESET =
  'ai-tour-rwanda';

/* ================= IMAGE UPLOAD ================= */

export const uploadImage =
  async (file) => {

    const formData =
      new FormData();

    formData.append(
      'file',
      file
    );

    formData.append(
      'upload_preset',
      UPLOAD_PRESET
    );

    const response =
      await axios.post(
        `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,
        formData
      );

    return response.data.secure_url;

  };

/* ================= VIDEO UPLOAD ================= */

export const uploadVideo =
  async (file) => {

    const formData =
      new FormData();

    formData.append(
      'file',
      file
    );

    formData.append(
      'upload_preset',
      UPLOAD_PRESET
    );

    const response =
      await axios.post(
        `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/video/upload`,
        formData
      );

    return response.data.secure_url;

  };