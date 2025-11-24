import { useState, useCallback } from 'react';

/**
 * Custom hook untuk menampilkan ValidationToast
 * Menggantikan console.warn, console.error, dan alert
 * 
 * @returns {Object} { toast, showToast, hideToast, ToastComponent }
 * 
 * @example
 * const { toast, showToast, ToastComponent } = useToast();
 * 
 * // Di dalam komponen
 * showToast('Data berhasil disimpan', 'success');
 * showToast('Gagal memuat data', 'error');
 * showToast('Periksa koneksi internet', 'warning');
 * showToast('Sedang memproses...', 'info');
 * 
 * // Di return JSX
 * return (
 *   <View>
 *     {/* ... komponen lain ... *\/}
 *     <ToastComponent />
 *   </View>
 * );
 */
export const useToast = () => {
  const [toast, setToast] = useState({
    visible: false,
    message: '',
    status: 'info', // 'success' | 'error' | 'warning' | 'info'
  });

  /**
   * Menampilkan toast notification
   * @param {string} message - Pesan yang akan ditampilkan
   * @param {'success'|'error'|'warning'|'info'} status - Status/tipe toast
   */
  const showToast = useCallback((message, status = 'info') => {
    setToast({
      visible: true,
      message,
      status,
    });
  }, []);

  /**
   * Menyembunyikan toast notification
   */
  const hideToast = useCallback(() => {
    setToast(prev => ({
      ...prev,
      visible: false,
    }));
  }, []);

  return {
    toast,
    showToast,
    hideToast,
    setToast, // For backward compatibility
  };
};

export default useToast;
