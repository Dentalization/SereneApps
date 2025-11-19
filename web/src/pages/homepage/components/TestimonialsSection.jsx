import React, { useState } from 'react';
import Icon from '../../../components/AppIcon';
import Image from '../../../components/AppImage';

const TestimonialsSection = () => {
  const [activeTab, setActiveTab] = useState('patients');

  const patientTestimonials = [
    {
      id: 1,
      name: "Sarah Johnson",
      role: "Marketing Manager",
      location: "San Francisco, CA",
      avatar: "https://images.unsplash.com/photo-1494790108755-2616b612b786?w=80&h=80&fit=crop&crop=face",
      rating: 5,
      content: `I was terrified of going to the dentist after years of avoiding checkups. Serene AI helped me understand what was happening in my mouth before my appointment. The early cavity detection saved me from a root canal!`,
      highlight: "Saved from root canal",
      date: "2 weeks ago"
    },
    {
      id: 2,
      name: "Michael Chen",
      role: "Software Engineer",
      location: "Seattle, WA",
      avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=80&h=80&fit=crop&crop=face",
      rating: 5,
      content: `As someone who travels frequently for work, having 24/7 access to dental insights is incredible. The AI caught early signs of gum disease that I would have missed until my next routine cleaning.`,
      highlight: "Early gum disease detection",
      date: "1 month ago"
    },
    {
      id: 3,
      name: "Emily Rodriguez",
      role: "Teacher",
      location: "Austin, TX",
      avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=80&h=80&fit=crop&crop=face",
      rating: 5,
      content: `The anxiety I used to feel about dental visits is completely gone. Knowing what to expect and having clear explanations of my oral health has been life-changing. My kids love using it too!`,
      highlight: "Eliminated dental anxiety",
      date: "3 weeks ago"
    }
  ];

  const professionalTestimonials = [
    {
      id: 1,
      name: "Dr. Amanda Foster",
      role: "General Dentist",
      location: "Boston Dental Associates",
      avatar: "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=80&h=80&fit=crop&crop=face",
      rating: 5,
      content: `Serene AI has transformed how I practice dentistry. The AI analysis helps me catch details I might miss and provides excellent visual aids for patient education. My patients are more engaged and compliant with treatment plans.`,
      highlight: "85% treatment acceptance rate",
      date: "1 month ago"
    },
    {
      id: 2,
      name: "Dr. James Park",
      role: "Oral Surgeon",
      location: "Pacific Oral Surgery",
      avatar: "https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=80&h=80&fit=crop&crop=face",
      rating: 5,
      content: `The accuracy of Serene AI's analysis is remarkable. It's like having a second opinion on every case. The technology has helped me identify complex cases earlier and plan better treatment approaches.`,
      highlight: "Improved surgical planning",
      date: "2 weeks ago"
    },
    {
      id: 3,
      name: "Dr. Lisa Thompson",
      role: "Pediatric Dentist",
      location: "Children\'s Dental Care",
      avatar: "https://images.unsplash.com/photo-1582750433449-648ed127bb54?w=80&h=80&fit=crop&crop=face",
      rating: 5,
      content: `Working with children requires extra patience and clear communication. Serene AI's visual explanations help kids understand their oral health in a fun, non-scary way. Parents love the detailed reports too.`,
      highlight: "Better pediatric communication",
      date: "1 week ago"
    }
  ];

  const currentTestimonials = activeTab === 'patients' ? patientTestimonials : professionalTestimonials;

  const renderStars = (rating) => {
    return Array.from({ length: 5 }, (_, index) => (
      <Icon
        key={index}
        name="Star"
        size={16}
        className={index < rating ? "text-yellow-400 fill-current" : "text-gray-300"}
      />
    ));
  };

  return (
    <section className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center mb-12">
          <h2 className="text-3xl lg:text-4xl font-bold text-text-primary mb-4">
            Trusted by Thousands
          </h2>
          <p className="text-lg text-text-secondary max-w-3xl mx-auto mb-8">
            Real stories from patients and dental professionals who have experienced 
            the transformative power of AI-driven dental insights.
          </p>

          {/* Tab Navigation */}
          <div className="inline-flex bg-muted rounded-lg p-1">
            <button
              onClick={() => setActiveTab('patients')}
              className={`px-6 py-3 rounded-md text-sm font-medium transition-all ${
                activeTab === 'patients' ?'bg-white text-primary shadow-brand' :'text-text-secondary hover:text-text-primary'
              }`}
            >
              <Icon name="Heart" size={16} className="inline mr-2" />
              Patient Stories
            </button>
            <button
              onClick={() => setActiveTab('professionals')}
              className={`px-6 py-3 rounded-md text-sm font-medium transition-all ${
                activeTab === 'professionals' ?'bg-white text-primary shadow-brand' :'text-text-secondary hover:text-text-primary'
              }`}
            >
              <Icon name="Stethoscope" size={16} className="inline mr-2" />
              Professional Reviews
            </button>
          </div>
        </div>

        {/* Testimonials Grid */}
        <div className="grid lg:grid-cols-3 gap-8">
          {currentTestimonials?.map((testimonial) => (
            <div
              key={testimonial?.id}
              className="bg-white border border-border rounded-xl p-6 hover-lift transition-gentle shadow-brand"
            >
              {/* Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 rounded-full overflow-hidden">
                    <Image
                      src={testimonial?.avatar}
                      alt={`${testimonial?.name} avatar`}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-text-primary">{testimonial?.name}</h4>
                    <p className="text-xs text-text-secondary">{testimonial?.role}</p>
                    <p className="text-xs text-text-secondary">{testimonial?.location}</p>
                  </div>
                </div>
                <div className="text-xs text-text-secondary">{testimonial?.date}</div>
              </div>

              {/* Rating */}
              <div className="flex items-center space-x-1 mb-4">
                {renderStars(testimonial?.rating)}
              </div>

              {/* Content */}
              <blockquote className="text-text-secondary text-sm leading-relaxed mb-4">
                "{testimonial?.content}"
              </blockquote>

              {/* Highlight */}
              <div className="inline-flex items-center space-x-2 bg-trust-green/10 rounded-full px-3 py-1">
                <Icon name="CheckCircle" size={14} className="text-trust-green" />
                <span className="text-xs font-medium text-trust-green">{testimonial?.highlight}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Success Metrics */}
        <div className="mt-16 bg-muted rounded-2xl p-8 lg:p-12">
          <div className="text-center mb-8">
            <h3 className="text-2xl font-bold text-text-primary mb-2">
              Real Results, Real Impact
            </h3>
            <p className="text-text-secondary">
              The numbers speak for themselves - Serene AI is making a difference
            </p>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="text-center">
              <div className="text-3xl font-bold text-primary mb-2">50,000+</div>
              <div className="text-sm text-text-secondary">Happy Patients</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-primary mb-2">1,200+</div>
              <div className="text-sm text-text-secondary">Dental Professionals</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-primary mb-2">87%</div>
              <div className="text-sm text-text-secondary">Anxiety Reduction</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-primary mb-2">4.9/5</div>
              <div className="text-sm text-text-secondary">Average Rating</div>
            </div>
          </div>
        </div>

        {/* Call to Action */}
        <div className="text-center mt-12">
          <p className="text-text-secondary mb-4">
            Join thousands of satisfied users who trust Serene AI
          </p>
          <div className="flex items-center justify-center space-x-2 text-sm text-text-secondary">
            <Icon name="Shield" size={16} className="text-trust-green" />
            <span>30-day money-back guarantee</span>
            <span>•</span>
            <Icon name="Lock" size={16} className="text-trust-green" />
            <span>HIPAA compliant</span>
            <span>•</span>
            <Icon name="Clock" size={16} className="text-trust-green" />
            <span>24/7 support</span>
          </div>
        </div>
      </div>
    </section>
  );
};

export default TestimonialsSection;