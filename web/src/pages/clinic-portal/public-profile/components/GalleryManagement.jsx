import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../../contexts/AuthContext';
import { authHttp } from '../../../../utils/httpClient';
import Button from '../../../../components/ui/Button';
import { cn } from '../../../../utils/cn';
import { resolveMediaUrl } from '../../../../utils/media';

const GalleryManagement = () => {
  const { user } = useAuth();
  const [images, setImages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showDialog, setShowDialog] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [uploadData, setUploadData] = useState({
    imageType: 'general',
    caption: '',
    file: null,
  });

  const userRole = user?.roles?.[0] || user?.role || 'staff';
  const canEdit = ['owner', 'manager', 'admin'].includes(userRole);

  const imageTypes = [
    { value: 'hero', label: 'Hero Image' },
    { value: 'cover', label: 'Cover Photo' },
    { value: 'facility', label: 'Facility' },
    { value: 'general', label: 'General' },
  ];

  useEffect(() => {
    if (canEdit) {
      fetchGallery();
    }
  }, [canEdit]);

  const fetchGallery = async () => {
    try {
      setIsLoading(true);
      console.log('🔄 Fetching gallery from /clinic/gallery...');
      const response = await authHttp.get('/clinic/gallery');
      console.log('✅ Gallery response:', response.data);
      const gallery = (response.data.images || []).map((img) => ({
        ...img,
        image_url: resolveMediaUrl(img.image_url),
      }));
      setImages(gallery);
    } catch (error) {
      console.error('❌ Error fetching gallery:', error);
      console.error('Error response:', error.response?.data);
      showMessage('error', `Failed to load gallery: ${error.response?.data?.error || error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const showMessage = (type, text) => {
    setMessage({ type, text });
    setTimeout(() => setMessage({ type: '', text: '' }), 5000);
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        showMessage('error', 'File size must be less than 5MB');
        return;
      }
      if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
        showMessage('error', 'Only JPEG, PNG, and WebP formats are allowed');
        return;
      }
      setUploadData({ ...uploadData, file });
    }
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!uploadData.file) {
      showMessage('error', 'Please select an image');
      return;
    }

    try {
      const formData = new FormData();
      formData.append('image', uploadData.file);
      formData.append('imageType', uploadData.imageType);
      if (uploadData.caption) {
        formData.append('caption', uploadData.caption);
      }

      await authHttp.post('/clinic/gallery', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      showMessage('success', 'Image uploaded successfully');
      setUploadData({ imageType: 'general', caption: '', file: null });
      setShowDialog(false);
      await fetchGallery();
    } catch (error) {
      console.error('Error uploading image:', error);
      showMessage('error', error.response?.data?.error || 'Failed to upload image');
    }
  };

  const handleDelete = async (imageId) => {
    if (!window.confirm('Are you sure you want to delete this image?')) return;

    try {
      await authHttp.delete(`/clinic/gallery/${imageId}`);
      showMessage('success', 'Image deleted successfully');
      await fetchGallery();
    } catch (error) {
      console.error('Error deleting image:', error);
      showMessage('error', 'Failed to delete image');
    }
  };

  if (!canEdit) {
    return (
      <div className="bg-warning/10 border border-warning/20 rounded-lg p-4 text-warning">
        You don't have permission to manage gallery. Contact your clinic owner or manager.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Message Alert */}
      {message.text && (
        <div className={cn(
          "rounded-lg p-4 border",
          message.type === 'success' ? "bg-success/10 border-success/20 text-success" : "bg-error/10 border-error/20 text-error"
        )}>
          {message.text}
        </div>
      )}

      {/* Header */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-foreground">Gallery</h2>
        <Button onClick={() => setShowDialog(true)}>
          + Upload Image
        </Button>
      </div>

      {/* Gallery Grid */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-primary"></div>
        </div>
      ) : images.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-8 text-center">
          <p className="text-muted-foreground mb-4">No images in gallery yet</p>
          <Button variant="outline" onClick={() => setShowDialog(true)}>
            Upload First Image
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {images.map((image) => (
            <div key={image.id} className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden group">
              <div className="aspect-video relative bg-gray-100 dark:bg-gray-700">
                <img
                  src={image.image_url}
                  alt={image.caption || 'Clinic image'}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="p-4">
                <div className="flex justify-between items-start mb-2">
                  <span className="inline-block px-2 py-1 text-xs bg-brand-primary/10 text-brand-primary rounded">
                    {imageTypes.find(t => t.value === image.image_type)?.label || image.image_type}
                  </span>
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => handleDelete(image.id)}
                  >
                    Delete
                  </Button>
                </div>
                {image.caption && (
                  <p className="text-sm text-muted-foreground">{image.caption}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Upload Dialog */}
      {showDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full">
            <form onSubmit={handleUpload}>
              <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                <h3 className="text-xl font-semibold text-foreground">Upload Image</h3>
              </div>

              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Image Type <span className="text-destructive">*</span>
                  </label>
                  <select
                    className="w-full px-3 py-2 border border-input rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring h-10"
                    value={uploadData.imageType}
                    onChange={(e) => setUploadData({ ...uploadData, imageType: e.target.value })}
                    required
                  >
                    {imageTypes.map((type) => (
                      <option key={type.value} value={type.value}>{type.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Caption (optional)</label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 border border-input rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    value={uploadData.caption}
                    onChange={(e) => setUploadData({ ...uploadData, caption: e.target.value })}
                    placeholder="Describe the image..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Image File <span className="text-destructive">*</span>
                  </label>
                  <div className="flex items-center justify-center w-full">
                    <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-input border-dashed rounded-lg cursor-pointer bg-background hover:bg-gray-50 dark:hover:bg-gray-700">
                      <div className="flex flex-col items-center justify-center pt-5 pb-6">
                        {uploadData.file ? (
                          <p className="text-sm text-foreground font-medium">{uploadData.file.name}</p>
                        ) : (
                          <>
                            <svg className="w-8 h-8 mb-2 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path>
                            </svg>
                            <p className="text-xs text-muted-foreground">PNG, JPG, WebP (Max 5MB)</p>
                          </>
                        )}
                      </div>
                      <input
                        type="file"
                        className="hidden"
                        accept="image/jpeg,image/png,image/webp"
                        onChange={handleFileChange}
                      />
                    </label>
                  </div>
                </div>
              </div>

              <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowDialog(false);
                    setUploadData({ imageType: 'general', caption: '', file: null });
                  }}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={!uploadData.file}>
                  Upload
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default GalleryManagement;
