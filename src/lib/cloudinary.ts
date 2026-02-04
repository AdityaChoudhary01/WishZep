/**
 * Utility for uploading images to Cloudinary using unsigned presets.
 */
export async function uploadToCloudinary(file: File): Promise<string> {
  const cloudName = 'dygtsoclj';
  const uploadPreset = 'shivloxai';
  
  const formData = new FormData();
  formData.append('file', file);
  formData.append('upload_preset', uploadPreset);

  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
    {
      method: 'POST',
      body: formData,
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to upload image to Cloudinary');
  }

  const data = await response.json();
  return data.secure_url;
}
