import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../../contexts/AuthContext';
import { authHttp } from '../../../../utils/httpClient';
import Button from '../../../../components/ui/Button';
import ModalPortal from '../../../../components/ui/ModalPortal';
import { cn } from '../../../../utils/cn';
import { resolveMediaUrl } from '../../../../utils/media';
import AppIcon from '../../../../components/AppIcon';

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
  const canEdit = ['owner', 'clinic_owner', 'manager', 'admin', 'clinic_staff'].includes(userRole);

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
      <div className="bg-warning/10 border border-warning/20 rounded-2xl p-6 text-warning flex items-center gap-3">
        <AppIcon name="ShieldAlert" size={22} className="shrink-0" />
        <span className="font-medium">You don't have permission to manage gallery. Contact your clinic owner or manager.</span>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Message Alert */}
      {message.text && (
        <div className={cn(
          "rounded-2xl p-4 border flex items-center gap-3 shadow-sm animate-in fade-in slide-in-from-top-2",
          message.type === 'success' ? "bg-emerald-50 border-emerald-200 text-emerald-800 dark:bg-emerald-900/20 dark:border-emerald-800 dark:text-emerald-300" : "bg-red-50 border-red-200 text-red-800 dark:bg-red-900/20 dark:border-red-800 dark:text-red-300"
        )}>
          <AppIcon name={message.type === 'success' ? 'CircleCheck' : 'CircleAlert'} size={18} className="shrink-0" />
          {message.text}
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-foreground tracking-tight">Gallery & Photos</h2>
          <p className="text-muted-foreground mt-1">Showcase your clinic's environment and facilities</p>
        </div>
        <Button onClick={() => setShowDialog(true)} className="inline-flex items-center gap-2 rounded-xl shadow-sm transition-all">
          <AppIcon name="ImagePlus" size={16} /> Upload Image
        </Button>
      </div>

      {/* Gallery Grid */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 space-y-4">
          <AppIcon name="LoaderCircle" size={30} className="animate-spin text-brand-primary" />
          <p className="text-muted-foreground">Loading gallery...</p>
        </div>
      ) : images.length === 0 ? (
        <div className="rounded-2xl border border-primary/15 bg-surface-elevated p-12 text-center">
          <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-xl border border-primary/15 bg-surface text-secondary">
            <AppIcon name="Images" size={25} />
          </div>
          <h3 className="text-xl font-semibold text-foreground mb-2">Gallery is Empty</h3>
          <p className="text-muted-foreground mb-6 max-w-md mx-auto">Upload high-quality photos of your clinic to build trust with potential patients.</p>
          <Button variant="outline" onClick={() => setShowDialog(true)} className="rounded-xl">
            Upload First Photo
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {images.map((image) => (
            <div key={image.id} className="group relative overflow-hidden rounded-2xl border border-primary/15 bg-surface-elevated transition-colors hover:border-accent/35">
              <div className="aspect-[4/3] w-full relative bg-gray-100 dark:bg-gray-700 overflow-hidden">
                <img
                  src={image.image_url}
                  alt={image.caption || 'Clinic image'}
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                />

                {/* Overlay Gradient */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                {/* Checkbox / Badge Top Left */}
                <div className="absolute top-3 left-3">
                  <span className="inline-flex items-center px-2.5 py-1 text-xs font-semibold bg-white/90 backdrop-blur-sm text-foreground rounded-lg shadow-sm border border-white/20">
                    {imageTypes.find(t => t.value === image.image_type)?.label || image.image_type}
                  </span>
                </div>

                {/* Delete Action Top Right */}
                <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-all duration-200 transform translate-y-2 group-hover:translate-y-0">
                  <button
                    onClick={() => handleDelete(image.id)}
                    className="p-2 bg-white/90 backdrop-blur-sm text-red-500 hover:bg-red-500 hover:text-white rounded-lg shadow-sm transition-colors"
                    title="Delete Image"
                  >
                    <AppIcon name="Trash2" size={16} />
                  </button>
                </div>
              </div>

              <div className="p-4">
                <p className="text-sm font-medium text-foreground line-clamp-2 min-h-[1.25rem]">
                  {image.caption || <span className="text-muted-foreground italic">No caption provided</span>}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Upload Dialog */}
      {showDialog && (
        <ModalPortal>
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6">
            <div
              className="absolute inset-0 bg-black/40 backdrop-blur-sm transition-all duration-300 animate-in fade-in"
              onClick={() => {
                setShowDialog(false);
                setUploadData({ imageType: 'general', caption: '', file: null });
              }}
            />
            <div
              className="relative w-full max-w-lg bg-white dark:bg-gray-900 rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200 border border-white/20 dark:border-gray-700"
              onClick={(e) => e.stopPropagation()}
              style={{ boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)' }}
            >
              <div className="px-8 py-6 border-b border-gray-100 dark:border-gray-800 bg-white/50 dark:bg-gray-900/50 backdrop-blur-md flex justify-between items-center sticky top-0 z-10">
                <div>
                  <h3 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">Upload Photo</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Add visuals to showcase your clinic</p>
                </div>
                <button
                  onClick={() => {
                    setShowDialog(false);
                    setUploadData({ imageType: 'general', caption: '', file: null });
                  }}
                  className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
                >
                  <AppIcon name="X" size={22} />
                </button>
              </div>

              <div className="p-8 overflow-y-auto custom-scrollbar">
                <form id="uploadForm" onSubmit={handleUpload} className="space-y-6">
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Image Category <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <select
                        className="w-full pl-4 pr-10 py-3 border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-800/50 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-primary/50 appearance-none"
                        value={uploadData.imageType}
                        onChange={(e) => setUploadData({ ...uploadData, imageType: e.target.value })}
                        required
                      >
                        {imageTypes.map((type) => (
                          <option key={type.value} value={type.value}>{type.label}</option>
                        ))}
                      </select>
                      <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                        <AppIcon name="ChevronDown" size={18} />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Caption (Optional)</label>
                    <input
                      type="text"
                      className="w-full px-4 py-3 border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-800/50 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-primary/50"
                      value={uploadData.caption}
                      onChange={(e) => setUploadData({ ...uploadData, caption: e.target.value })}
                      placeholder="e.g., Front desk area, Dental chair view..."
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Image File <span className="text-red-500">*</span>
                    </label>
                    <div className="flex items-center justify-center w-full group">
                      <label className="flex flex-col items-center justify-center w-full h-40 border-2 border-brand-primary/20 border-dashed rounded-2xl cursor-pointer bg-brand-primary/5 hover:bg-brand-primary/10 hover:border-brand-primary/40 transition-all">
                        <div className="flex flex-col items-center justify-center pt-5 pb-6 text-center px-4">
                          {uploadData.file ? (
                            <>
                              <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl border border-brand-primary/20 bg-brand-primary/10 text-brand-primary">
                                <AppIcon name="FileCheck2" size={21} />
                              </div>
                              <p className="text-sm text-gray-900 dark:text-white font-medium truncate max-w-full px-4">{uploadData.file.name}</p>
                              <p className="text-xs text-brand-primary mt-1">Click to change file</p>
                            </>
                          ) : (
                            <>
                              <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl border border-primary/15 bg-surface text-secondary transition-colors group-hover:border-brand-primary/30 group-hover:text-brand-primary">
                                <AppIcon name="UploadCloud" size={21} />
                              </div>
                              <p className="text-sm text-gray-600 dark:text-gray-400"><span className="font-semibold text-brand-primary">Click to upload</span> or drag and drop</p>
                              <p className="text-xs text-gray-400 mt-1">PNG, JPG, WebP (Max 5MB)</p>
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
                </form>
              </div>

              <div className="p-6 border-t border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/50 backdrop-blur-sm flex justify-end gap-3 sticky bottom-0">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowDialog(false);
                    setUploadData({ imageType: 'general', caption: '', file: null });
                  }}
                  className="rounded-xl hover:bg-white dark:hover:bg-gray-700 px-6"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  form="uploadForm"
                  disabled={!uploadData.file}
                  className="rounded-xl shadow-lg shadow-brand-primary/20 px-8 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Upload Photo
                </Button>
              </div>
            </div>
          </div>
        </ModalPortal>
      )}
    </div>
  );
};

export default GalleryManagement;
