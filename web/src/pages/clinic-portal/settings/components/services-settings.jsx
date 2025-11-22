import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../../contexts/AuthContext';
import Icon from '../../../../components/AppIcon';
import { authHttp } from '../../../../utils/httpClient';

const CATEGORIES = [
  { value: 'general', label: 'General' },
  { value: 'specialist', label: 'Specialist' },
];

const SPECIALTIES = [
  'Ortodonti (Sp.Ort)',
  'Konservasi Gigi (Sp.KG)',
  'Bedah Mulut (Sp.BM)',
  'Periodonsia (Sp.Perio)',
  'Prostodonsia (Sp.Pros)',
  'Kedokteran Gigi Anak (Sp.KGA)',
  'Penyakit Mulut (Sp.PM)',
  'Radiologi Kedokteran Gigi (Sp.RKG)',
  'Odontologi Forensik',
];

const ServicesSettings = () => {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [services, setServices] = useState([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingService, setEditingService] = useState(null);

  const userRole = user?.roles?.[0] || user?.role || 'staff';
  const canEdit = ['owner', 'clinic_owner', 'manager', 'admin', 'clinic_staff'].includes(userRole);

  const fetchServices = async () => {
    try {
      setIsLoading(true);
      const response = await authHttp.get('/clinic/services');
      setServices(response.data.services || []);
    } catch (error) {
      console.error('Error fetching services:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (canEdit) {
      fetchServices();
    }
  }, [canEdit]);

  if (!canEdit) {
    return (
      <div className="text-center py-8">
        <Icon name="Lock" size={48} className="mx-auto mb-4 text-secondary opacity-50" />
        <p className="text-secondary">You don't have permission to manage services.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-primary flex items-center space-x-2">
          <Icon name="Wrench" size={20} />
          <span>Services & Pricing</span>
        </h2>
      </div>

      {isLoading ? (
        <div className="text-center py-8">
          <Icon name="Loader2" size={32} className="mx-auto mb-2 opacity-50 animate-spin" />
          <p className="text-secondary">Loading services...</p>
        </div>
      ) : (
        <div className="text-center py-8 border border-dashed border-primary/20 rounded-lg">
          <Icon name="Wrench" size={32} className="mx-auto mb-2 opacity-50" />
          <p className="text-secondary">Services management coming soon</p>
          <p className="text-sm text-secondary mt-2">Count: {services.length}</p>
        </div>
      )}
    </div>
  );
};

export default ServicesSettings;
