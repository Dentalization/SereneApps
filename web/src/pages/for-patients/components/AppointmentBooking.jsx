import React, { useState } from 'react';
import Button from '../../../components/ui/Button';
import Input from '../../../components/ui/Input';
import Icon from '../../../components/AppIcon';

const AppointmentBooking = () => {
  const [selectedDentist, setSelectedDentist] = useState(null);
  const [showBookingForm, setShowBookingForm] = useState(false);
  
  // State for search inputs
  const [searchQuery, setSearchQuery] = useState('');
  const [availability, setAvailability] = useState('Any Availability');

  // Mock Data
  const dentists = [
    {
      id: 1,
      name: 'Dr. Jennifer Martinez',
      clinic: 'Serene Dental Partners',
      specialty: 'General Dentistry',
      rating: 4.9,
      reviews: 127,
      distance: '0.8 miles',
      image: 'https://randomuser.me/api/portraits/women/45.jpg',
      address: '123 Health Street, San Francisco, CA',
      verified: true,
      nextSlot: 'Today, 2:30 PM',
      insurances: ['Delta', 'Aetna', 'Cigna'],
      badges: ['Top Rated', 'AI-Integrated']
    },
    {
      id: 2,
      name: 'Dr. Robert Chen',
      clinic: 'Advanced Dental Care',
      specialty: 'Cosmetic Specialist',
      rating: 4.8,
      reviews: 89,
      distance: '1.2 miles',
      image: 'https://randomuser.me/api/portraits/men/56.jpg',
      address: '456 Wellness Ave, San Francisco, CA',
      verified: true,
      nextSlot: 'Tomorrow, 10:00 AM',
      insurances: ['MetLife', 'Guardian', 'Blue Cross'],
      badges: ['Video Consults']
    },
    {
      id: 3,
      name: 'Dr. Sarah Thompson',
      clinic: 'Family Dental Group',
      specialty: 'Pediatric Dentistry',
      rating: 4.7,
      reviews: 156,
      distance: '1.5 miles',
      image: 'https://randomuser.me/api/portraits/women/32.jpg',
      address: '789 Care Blvd, San Francisco, CA',
      verified: false,
      nextSlot: 'Fri, 9:15 AM',
      insurances: ['Delta', 'United'],
      badges: ['Family Friendly']
    }
  ];

  const handleBookClick = (dentist) => {
    setSelectedDentist(dentist);
    setShowBookingForm(true);
  };

  return (
    <section className="py-24 bg-slate-50 dark:bg-slate-950 relative overflow-hidden" id="booking">
      
      {/* Background Decor */}
      <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-green-500/5 rounded-full blur-[100px] pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-bold uppercase tracking-wider mb-6">
            <Icon name="MapPin" size={14} />
            <span>Local Partners</span>
          </div>
          <h2 className="text-3xl md:text-5xl font-bold text-slate-900 dark:text-white mb-6">
            Find a Dentist <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-teal-500">
              Who Speaks AI
            </span>
          </h2>
          <p className="text-lg text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
            Connect with certified professionals who can instantly access your Serene AI reports for a seamless care experience.
          </p>
        </div>

        {/* --- SEARCH BAR --- */}
        <div className="max-w-4xl mx-auto mb-16 relative z-20">
          <div className="bg-white dark:bg-slate-900 p-2 rounded-full shadow-xl border border-slate-200 dark:border-slate-800 flex flex-col md:flex-row items-center gap-2">
             
             {/* Location Input */}
             <div className="flex-1 w-full md:w-auto relative group">
               <div className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors">
                 <Icon name="Search" size={20} />
               </div>
               <input 
                 type="text" 
                 value={searchQuery}
                 onChange={(e) => setSearchQuery(e.target.value)}
                 placeholder="Zip code, city, or practice name" 
                 className="w-full h-14 pl-14 pr-6 rounded-full bg-transparent outline-none text-slate-900 dark:text-white placeholder:text-slate-400 font-medium hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer focus:bg-white dark:focus:bg-slate-900"
               />
             </div>

             {/* Divider (Desktop Only) */}
             <div className="hidden md:block w-px h-8 bg-slate-200 dark:bg-slate-700" />

             {/* Availability Select */}
             <div className="flex-1 w-full md:w-auto relative group">
               <div className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors pointer-events-none">
                 <Icon name="Calendar" size={20} />
               </div>
               <div className="absolute right-6 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                 <Icon name="ChevronDown" size={16} />
               </div>
               <select 
                 value={availability}
                 onChange={(e) => setAvailability(e.target.value)}
                 // Added 'bg-none' to remove default arrow background image from forms plugin
                 className="w-full h-14 pl-14 pr-10 rounded-full bg-transparent bg-none outline-none text-slate-900 dark:text-white font-medium appearance-none cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors focus:bg-white dark:focus:bg-slate-900"
               >
                 <option value="Any">Any Availability</option>
                 <option value="Today">Today</option>
                 <option value="Tomorrow">Tomorrow</option>
                 <option value="This Week">This Week</option>
               </select>
             </div>

             {/* Search Button */}
             <button className="w-full md:w-auto h-14 px-8 rounded-full bg-blue-600 hover:bg-blue-500 text-white font-bold shadow-lg shadow-blue-500/30 flex items-center justify-center gap-2 transition-all active:scale-95">
               <span className="hidden md:inline">Find Dentists</span>
               <span className="md:hidden">Search</span>
               <Icon name="ArrowRight" size={18} />
             </button>
          </div>
          
          {/* Quick Filters */}
          <div className="flex flex-wrap justify-center gap-3 mt-6">
            {['Accepts Insurance', 'Video Consult', 'Highly Rated', 'Pediatric', 'Open Weekends'].map((f, i) => (
              <button key={i} className="px-4 py-2 rounded-full border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-bold text-slate-600 dark:text-slate-400 hover:border-blue-500 hover:text-blue-500 transition-colors shadow-sm">
                {f}
              </button>
            ))}
          </div>
        </div>

        {/* Doctor List */}
        {!showBookingForm ? (
          <div className="grid lg:grid-cols-2 xl:grid-cols-3 gap-6 animate-in slide-in-from-bottom-8 duration-700">
            {dentists.map((dentist) => (
              <div key={dentist.id} className="bg-white dark:bg-slate-900 rounded-[1.5rem] border border-slate-200 dark:border-slate-800 p-6 hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 group flex flex-col h-full">
                
                {/* Card Header */}
                <div className="flex gap-4 mb-4">
                  <div className="relative shrink-0">
                    <img src={dentist.image} alt={dentist.name} className="w-16 h-16 rounded-2xl object-cover shadow-sm" />
                    {dentist.verified && (
                      <div className="absolute -bottom-2 -right-2 bg-blue-500 text-white p-1 rounded-full border-2 border-white dark:border-slate-900" title="Verified Partner">
                        <Icon name="Check" size={10} />
                      </div>
                    )}
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white leading-tight mb-1">{dentist.name}</h3>
                    <div className="text-sm text-slate-500 font-medium">{dentist.specialty}</div>
                    <div className="flex items-center gap-1 mt-1">
                      <Icon name="Star" size={14} className="text-amber-400 fill-current" />
                      <span className="text-xs font-bold text-slate-900 dark:text-white">{dentist.rating}</span>
                      <span className="text-xs text-slate-400">({dentist.reviews} reviews)</span>
                    </div>
                  </div>
                </div>

                {/* Badges */}
                <div className="flex flex-wrap gap-2 mb-6">
                   {dentist.badges.map((b, i) => (
                     <span key={i} className="px-2.5 py-1 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-[10px] font-bold uppercase tracking-wide">
                       {b}
                     </span>
                   ))}
                </div>

                {/* Info Rows */}
                <div className="space-y-3 mb-6 flex-1">
                   <div className="flex items-start gap-3 text-sm text-slate-600 dark:text-slate-300">
                     <Icon name="MapPin" size={16} className="shrink-0 mt-0.5 text-slate-400" />
                     <span>{dentist.address} ({dentist.distance})</span>
                   </div>
                   <div className="flex items-start gap-3 text-sm text-green-700 dark:text-green-400 font-bold bg-green-50 dark:bg-green-900/10 p-3 rounded-xl border border-green-100 dark:border-green-900/20">
                     <Icon name="Clock" size={16} className="shrink-0 mt-0.5" />
                     <span>Next Available: {dentist.nextSlot}</span>
                   </div>
                </div>

                {/* Actions */}
                <div className="grid grid-cols-2 gap-3 mt-auto">
                   <Button variant="outline" className="text-xs h-12 rounded-xl border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800">
                     View Profile
                   </Button>
                   <Button className="text-xs h-12 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:opacity-90 shadow-lg" onClick={() => handleBookClick(dentist)}>
                     Book Now
                   </Button>
                </div>

              </div>
            ))}
          </div>
        ) : (
          /* --- BOOKING MODAL --- */
          <div className="max-w-2xl mx-auto bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
            
            {/* Header */}
            <div className="bg-slate-50 dark:bg-slate-950 px-8 py-6 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center">
               <div>
                 <h3 className="text-xl font-bold text-slate-900 dark:text-white">Complete Booking</h3>
                 <p className="text-sm text-slate-500">with {selectedDentist?.name}</p>
               </div>
               <button onClick={() => setShowBookingForm(false)} className="w-8 h-8 flex items-center justify-center hover:bg-slate-200 dark:hover:bg-slate-800 rounded-full transition-colors">
                 <Icon name="X" size={20} className="text-slate-500" />
               </button>
            </div>

            <div className="p-8 space-y-8">
              
              {/* AI Integration Card */}
              <div className="bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-900/30 rounded-2xl p-5 flex gap-4 items-start shadow-sm">
                 <div className="w-12 h-12 rounded-xl bg-blue-100 dark:bg-blue-900/30 text-blue-600 flex items-center justify-center shrink-0">
                   <Icon name="Sparkles" size={24} />
                 </div>
                 <div className="flex-1">
                   <h4 className="text-base font-bold text-slate-900 dark:text-white mb-1">Attach Latest AI Scan?</h4>
                   <p className="text-sm text-slate-600 dark:text-slate-400 mb-3 leading-relaxed">
                     Dr. Martinez is Serene-Certified. Sharing your recent scan (from 2 days ago) 
                     will help speed up your diagnosis.
                   </p>
                   <label className="flex items-center gap-3 p-3 bg-white dark:bg-slate-900 rounded-xl border border-blue-200 dark:border-blue-800 cursor-pointer hover:border-blue-400 transition-colors">
                     <input type="checkbox" className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500" defaultChecked />
                     <span className="text-sm font-bold text-slate-700 dark:text-slate-200">Yes, attach scan report</span>
                   </label>
                 </div>
              </div>

              {/* Form Fields */}
              <div className="space-y-6">
                
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wide ml-1">Reason for Visit</label>
                    <div className="relative">
                      {/* Added bg-none here as well */}
                      <select className="w-full h-12 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 bg-none px-4 text-sm outline-none focus:ring-2 focus:ring-blue-500 appearance-none">
                        <option>General Consultation</option>
                        <option>Cleaning & Hygiene</option>
                        <option>Pain / Emergency</option>
                        <option>Whitening / Cosmetic</option>
                      </select>
                      <Icon name="ChevronDown" size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wide ml-1">Insurance</label>
                    <div className="relative">
                      {/* Added bg-none here as well */}
                      <select className="w-full h-12 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 bg-none px-4 text-sm outline-none focus:ring-2 focus:ring-blue-500 appearance-none">
                        <option>Select Provider...</option>
                        {selectedDentist?.insurances?.map(i => <option key={i}>{i}</option>)}
                      </select>
                      <Icon name="ChevronDown" size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                    </div>
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                   <Input label="Preferred Date" type="date" className="h-12" />
                   <Input label="Preferred Time" type="time" className="h-12" />
                </div>
              </div>

              {/* Footer Actions */}
              <div className="pt-6 flex gap-4 border-t border-slate-100 dark:border-slate-800">
                 <Button variant="ghost" className="flex-1 h-14 rounded-xl text-slate-500" onClick={() => setShowBookingForm(false)}>Cancel</Button>
                 <Button className="flex-[2] h-14 rounded-xl shadow-xl shadow-blue-500/20 text-lg font-bold" iconName="Check">
                   Confirm Booking
                 </Button>
              </div>

            </div>
          </div>
        )}

      </div>
    </section>
  );
};

export default AppointmentBooking;