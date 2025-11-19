import React, { useState } from 'react';
import Button from '../../../components/ui/Button';
import Input from '../../../components/ui/Input';
import Select from '../../../components/ui/Select';
import Image from '../../../components/AppImage';
import Icon from '../../../components/AppIcon';

const AppointmentBooking = () => {
  const [selectedDentist, setSelectedDentist] = useState('');
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTime, setSelectedTime] = useState('');
  const [patientInfo, setPatientInfo] = useState({
    name: '',
    email: '',
    phone: '',
    concern: ''
  });
  const [showBookingForm, setShowBookingForm] = useState(false);

  const nearbyDentists = [
    {
      id: 1,
      name: 'Dr. Jennifer Martinez',
      practice: 'Serene Dental Partners',
      specialty: 'General Dentistry',
      rating: 4.9,
      reviews: 127,
      distance: '0.8 miles',
      image: 'https://randomuser.me/api/portraits/women/45.jpg',
      address: '123 Health Street, San Francisco, CA',
      phone: '(555) 123-4567',
      serenePartner: true,
      nextAvailable: 'Today at 2:30 PM',
      acceptsInsurance: ['Delta Dental', 'Blue Cross', 'Aetna']
    },
    {
      id: 2,
      name: 'Dr. Robert Chen',
      practice: 'Advanced Dental Care',
      specialty: 'Cosmetic & Restorative',
      rating: 4.8,
      reviews: 89,
      distance: '1.2 miles',
      image: 'https://randomuser.me/api/portraits/men/56.jpg',
      address: '456 Wellness Ave, San Francisco, CA',
      phone: '(555) 234-5678',
      serenePartner: true,
      nextAvailable: 'Tomorrow at 10:00 AM',
      acceptsInsurance: ['Cigna', 'MetLife', 'Guardian']
    },
    {
      id: 3,
      name: 'Dr. Sarah Thompson',
      practice: 'Family Dental Group',
      specialty: 'Family & Pediatric',
      rating: 4.7,
      reviews: 156,
      distance: '1.5 miles',
      image: 'https://randomuser.me/api/portraits/women/32.jpg',
      address: '789 Care Blvd, San Francisco, CA',
      phone: '(555) 345-6789',
      serenePartner: false,
      nextAvailable: 'Friday at 9:15 AM',
      acceptsInsurance: ['Delta Dental', 'United Healthcare']
    }
  ];

  const timeSlots = [
    { value: '09:00', label: '9:00 AM' },
    { value: '10:30', label: '10:30 AM' },
    { value: '14:00', label: '2:00 PM' },
    { value: '15:30', label: '3:30 PM' },
    { value: '17:00', label: '5:00 PM' }
  ];

  const concernOptions = [
    { value: 'routine', label: 'Routine Checkup' },
    { value: 'pain', label: 'Tooth Pain' },
    { value: 'sensitivity', label: 'Sensitivity' },
    { value: 'cleaning', label: 'Professional Cleaning' },
    { value: 'cosmetic', label: 'Cosmetic Consultation' },
    { value: 'emergency', label: 'Emergency' },
    { value: 'other', label: 'Other Concern' }
  ];

  const handleInputChange = (field, value) => {
    setPatientInfo(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleBookAppointment = () => {
    // Mock booking logic
    alert('Appointment booked successfully! You will receive a confirmation email shortly.');
    setShowBookingForm(false);
  };

  return (
    <section className="py-20 bg-surface">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-text-primary mb-4">
            Find Serene-Certified Dentists Near You
          </h2>
          <p className="text-lg text-text-secondary max-w-3xl mx-auto">
            Connect with dental professionals who use Serene's AI platform for enhanced diagnosis and treatment planning. 
            Book appointments with confidence knowing your dentist has access to your AI analysis.
          </p>
        </div>

        {!showBookingForm ? (
          <div className="space-y-8">
            {/* Search Bar */}
            <div className="max-w-2xl mx-auto">
              <div className="flex gap-4">
                <Input
                  type="text"
                  placeholder="Enter your zip code or city"
                  className="flex-1"
                />
                <Button
                  variant="default"
                  iconName="Search"
                  iconPosition="left"
                  iconSize={18}
                >
                  Search
                </Button>
              </div>
            </div>

            {/* Dentist Cards */}
            <div className="grid lg:grid-cols-2 xl:grid-cols-3 gap-6">
              {nearbyDentists?.map((dentist) => (
                <div key={dentist?.id} className="bg-white rounded-2xl shadow-brand hover:shadow-brand-hover transition-gentle hover-lift overflow-hidden">
                  {/* Header */}
                  <div className="relative p-6 pb-4">
                    {dentist?.serenePartner && (
                      <div className="absolute top-4 right-4">
                        <div className="flex items-center space-x-1 px-3 py-1 bg-primary text-primary-foreground text-xs font-medium rounded-full">
                          <Icon name="CheckCircle" size={12} />
                          <span>Serene Partner</span>
                        </div>
                      </div>
                    )}

                    <div className="flex items-start space-x-4">
                      <Image
                        src={dentist?.image}
                        alt={dentist?.name}
                        className="w-16 h-16 rounded-full object-cover"
                      />
                      <div className="flex-1">
                        <h3 className="text-xl font-bold text-text-primary">{dentist?.name}</h3>
                        <p className="text-text-secondary font-medium">{dentist?.practice}</p>
                        <p className="text-sm text-text-secondary">{dentist?.specialty}</p>
                      </div>
                    </div>
                  </div>

                  {/* Details */}
                  <div className="px-6 space-y-4">
                    {/* Rating & Reviews */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <div className="flex items-center space-x-1">
                          <Icon name="Star" size={16} className="text-accent fill-current" />
                          <span className="font-medium text-text-primary">{dentist?.rating}</span>
                        </div>
                        <span className="text-sm text-text-secondary">({dentist?.reviews} reviews)</span>
                      </div>
                      <div className="flex items-center space-x-1 text-sm text-text-secondary">
                        <Icon name="MapPin" size={14} />
                        <span>{dentist?.distance}</span>
                      </div>
                    </div>

                    {/* Address & Phone */}
                    <div className="space-y-2 text-sm">
                      <div className="flex items-start space-x-2">
                        <Icon name="MapPin" size={14} className="text-text-secondary mt-0.5 flex-shrink-0" />
                        <span className="text-text-secondary">{dentist?.address}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Icon name="Phone" size={14} className="text-text-secondary" />
                        <span className="text-text-secondary">{dentist?.phone}</span>
                      </div>
                    </div>

                    {/* Next Available */}
                    <div className="bg-trust-green/10 p-3 rounded-lg">
                      <div className="flex items-center space-x-2">
                        <Icon name="Clock" size={16} className="text-trust-green" />
                        <span className="text-sm font-medium text-trust-green">
                          Next available: {dentist?.nextAvailable}
                        </span>
                      </div>
                    </div>

                    {/* Insurance */}
                    <div>
                      <p className="text-xs text-text-secondary mb-2">Accepts Insurance:</p>
                      <div className="flex flex-wrap gap-1">
                        {dentist?.acceptsInsurance?.map((insurance, index) => (
                          <span key={index} className="px-2 py-1 bg-muted text-xs text-text-primary rounded">
                            {insurance}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="p-6 pt-4 space-y-3">
                    <Button
                      variant="default"
                      fullWidth
                      onClick={() => {
                        setSelectedDentist(dentist?.id);
                        setShowBookingForm(true);
                      }}
                      iconName="Calendar"
                      iconPosition="left"
                      iconSize={16}
                    >
                      Book Appointment
                    </Button>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        fullWidth
                        iconName="Phone"
                        iconPosition="left"
                        iconSize={16}
                      >
                        Call
                      </Button>
                      <Button
                        variant="outline"
                        fullWidth
                        iconName="MessageCircle"
                        iconPosition="left"
                        iconSize={16}
                      >
                        Message
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Load More */}
            <div className="text-center">
              <Button
                variant="outline"
                iconName="MoreHorizontal"
                iconPosition="left"
                iconSize={18}
              >
                Show More Dentists
              </Button>
            </div>
          </div>
        ) : (
          /* Booking Form */
          (<div className="max-w-2xl mx-auto">
            <div className="bg-white rounded-2xl shadow-brand p-8">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-2xl font-bold text-text-primary">Book Your Appointment</h3>
                <Button
                  variant="ghost"
                  onClick={() => setShowBookingForm(false)}
                  iconName="X"
                  iconSize={20}
                />
              </div>

              {/* Selected Dentist Info */}
              <div className="bg-surface p-4 rounded-lg mb-6">
                <div className="flex items-center space-x-3">
                  <Image
                    src={nearbyDentists?.find(d => d?.id === selectedDentist)?.image}
                    alt="Selected dentist"
                    className="w-12 h-12 rounded-full object-cover"
                  />
                  <div>
                    <p className="font-medium text-text-primary">
                      {nearbyDentists?.find(d => d?.id === selectedDentist)?.name}
                    </p>
                    <p className="text-sm text-text-secondary">
                      {nearbyDentists?.find(d => d?.id === selectedDentist)?.practice}
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                {/* Patient Information */}
                <div className="grid sm:grid-cols-2 gap-4">
                  <Input
                    label="Full Name"
                    type="text"
                    required
                    value={patientInfo?.name}
                    onChange={(e) => handleInputChange('name', e?.target?.value)}
                    placeholder="Enter your full name"
                  />
                  <Input
                    label="Email Address"
                    type="email"
                    required
                    value={patientInfo?.email}
                    onChange={(e) => handleInputChange('email', e?.target?.value)}
                    placeholder="your.email@example.com"
                  />
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  <Input
                    label="Phone Number"
                    type="tel"
                    required
                    value={patientInfo?.phone}
                    onChange={(e) => handleInputChange('phone', e?.target?.value)}
                    placeholder="(555) 123-4567"
                  />
                  <Select
                    label="Reason for Visit"
                    options={concernOptions}
                    value={patientInfo?.concern}
                    onChange={setPatientInfo?.concern}
                    placeholder="Select your concern"
                    required
                  />
                </div>

                {/* Date & Time Selection */}
                <div className="grid sm:grid-cols-2 gap-4">
                  <Input
                    label="Preferred Date"
                    type="date"
                    required
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e?.target?.value)}
                    min={new Date()?.toISOString()?.split('T')?.[0]}
                  />
                  <Select
                    label="Preferred Time"
                    options={timeSlots}
                    value={selectedTime}
                    onChange={setSelectedTime}
                    placeholder="Select time slot"
                    required
                  />
                </div>

                {/* AI Analysis Integration */}
                <div className="bg-brand-canvas p-4 rounded-lg border border-primary/20">
                  <div className="flex items-start space-x-3">
                    <Icon name="Brain" size={20} className="text-primary mt-0.5" />
                    <div>
                      <h4 className="font-medium text-text-primary mb-2">Share Your AI Analysis</h4>
                      <p className="text-sm text-text-secondary mb-3">
                        If you've completed a Serene AI analysis, we can share the results with your dentist 
                        to help them prepare for your visit.
                      </p>
                      <Button
                        variant="outline"
                        size="sm"
                        iconName="Upload"
                        iconPosition="left"
                        iconSize={16}
                      >
                        Attach AI Report
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row gap-4">
                  <Button
                    variant="outline"
                    fullWidth
                    onClick={() => setShowBookingForm(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="default"
                    fullWidth
                    onClick={handleBookAppointment}
                    iconName="Calendar"
                    iconPosition="left"
                    iconSize={16}
                    className="pulse-heartbeat"
                  >
                    Confirm Appointment
                  </Button>
                </div>
              </div>
            </div>
          </div>)
        )}
      </div>
    </section>
  );
};

export default AppointmentBooking;