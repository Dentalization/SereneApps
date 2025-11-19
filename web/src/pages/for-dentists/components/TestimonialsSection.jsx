import React from 'react';
import Icon from '../../../components/AppIcon';

const TestimonialsSection = () => {
  const testimonials = [
    {
      name: 'Dr. Michael Chen',
      title: 'General Dentist',
      practice: 'Downtown Dental Clinic',
      location: 'San Francisco, CA',
      image: null,
      rating: 5,
      quote: 'Serene AI has transformed how I approach diagnostics. The accuracy is remarkable, and it\'s given me so much more confidence in my treatment planning. My patients appreciate the detailed explanations the AI provides.',
      metrics: {
        timeSaved: '4 hours daily',
        accuracy: '96% improvement',
        satisfaction: '98% patients'
      }
    },
    {
      name: 'Dr. Sarah Rodriguez',
      title: 'Pediatric Dentist',
      practice: 'Little Smiles Dental',
      location: 'Austin, TX',
      image: null,
      rating: 5,
      quote: 'Working with children requires extra precision and quick decisions. Serene AI helps me identify issues early and explain them to parents with visual evidence. It\'s been a game-changer for my practice.',
      metrics: {
        timeSaved: '3.5 hours daily',
        accuracy: '94% improvement',
        satisfaction: '97% parents'
      }
    },
    {
      name: 'Dr. James Mitchell',
      title: 'Oral Surgeon',
      practice: 'Advanced Oral Surgery',
      location: 'Denver, CO',
      image: null,
      rating: 5,
      quote: 'The surgical planning capabilities are extraordinary. I can visualize complex cases with incredible detail and plan procedures with confidence. My surgical success rate has improved significantly.',
      metrics: {
        timeSaved: '5 hours daily',
        accuracy: '99% surgical planning',
        satisfaction: '99% outcomes'
      }
    }
  ];

  const stats = [
    {
      value: '2,847',
      label: 'Active Practices',
      icon: 'Building'
    },
    {
      value: '96.3%',
      label: 'Satisfaction Rate',
      icon: 'Heart'
    },
    {
      value: '4.8/5',
      label: 'Average Rating',
      icon: 'Star'
    },
    {
      value: '50K+',
      label: 'Analyses Daily',
      icon: 'TrendingUp'
    }
  ];

  return (
    <section className="py-20 bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <div className="inline-flex items-center space-x-2 bg-green-500/10 text-green-600 dark:text-green-400 px-4 py-2 rounded-full text-sm font-medium mb-6">
            <Icon name="Heart" size={16} />
            <span>Dentist Testimonials</span>
          </div>
          
          <h2 className="text-3xl md:text-5xl font-bold text-foreground mb-6">
            Trusted by Dental
            <span className="block text-primary">Professionals Worldwide</span>
          </h2>
          
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Join thousands of dentists who have transformed their practice with Serene AI. 
            See how our platform is making a real difference in dental care.
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-16">
          {stats?.map((stat, index) => (
            <div key={index} className="text-center">
              <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Icon name={stat?.icon} size={32} className="text-primary" />
              </div>
              <div className="text-2xl font-bold text-foreground mb-1">{stat?.value}</div>
              <div className="text-sm text-muted-foreground">{stat?.label}</div>
            </div>
          ))}
        </div>

        {/* Testimonials */}
        <div className="grid lg:grid-cols-3 gap-8">
          {testimonials?.map((testimonial, index) => (
            <div key={index} className="bg-card p-8 rounded-xl border border-border shadow-brand hover-lift transition-gentle">
              {/* Header */}
              <div className="flex items-start justify-between mb-6">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                    <Icon name="User" size={24} className="text-primary" />
                  </div>
                  <div>
                    <div className="font-semibold text-foreground">{testimonial?.name}</div>
                    <div className="text-sm text-muted-foreground">{testimonial?.title}</div>
                    <div className="text-xs text-muted-foreground">{testimonial?.practice}</div>
                  </div>
                </div>
                
                <div className="flex items-center space-x-1">
                  {[...Array(testimonial?.rating)]?.map((_, i) => (
                    <Icon key={i} name="Star" size={16} className="text-yellow-400 fill-current" />
                  ))}
                </div>
              </div>
              
              {/* Quote */}
              <blockquote className="text-muted-foreground mb-6 italic">
                "{testimonial?.quote}"
              </blockquote>
              
              {/* Metrics */}
              <div className="space-y-3 border-t border-border pt-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Time Saved</span>
                  <span className="text-sm font-medium text-primary">{testimonial?.metrics?.timeSaved}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Accuracy</span>
                  <span className="text-sm font-medium text-green-500">{testimonial?.metrics?.accuracy}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Satisfaction</span>
                  <span className="text-sm font-medium text-secondary">{testimonial?.metrics?.satisfaction}</span>
                </div>
              </div>
              
              {/* Location */}
              <div className="mt-4 flex items-center space-x-2 text-xs text-muted-foreground">
                <Icon name="MapPin" size={14} />
                <span>{testimonial?.location}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Success Stories CTA */}
        <div className="mt-16 bg-gradient-to-br from-primary/5 to-secondary/5 rounded-2xl p-8 text-center">
          <h3 className="text-2xl font-bold text-foreground mb-4">
            Ready to Join Our Success Stories?
          </h3>
          <p className="text-muted-foreground mb-6 max-w-2xl mx-auto">
            See how Serene AI can transform your dental practice. Start with a free trial and 
            experience the difference AI-powered diagnostics can make.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button className="inline-flex items-center justify-center px-8 py-4 bg-primary text-primary-foreground font-semibold rounded-lg hover:bg-primary/90 transition-colors shadow-brand">
              <Icon name="Sparkles" size={20} className="mr-2" />
              Start Free Trial
            </button>
            <button className="inline-flex items-center justify-center px-8 py-4 border-2 border-primary text-primary font-semibold rounded-lg hover:bg-primary hover:text-primary-foreground transition-colors">
              <Icon name="Play" size={20} className="mr-2" />
              Watch Success Stories
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default TestimonialsSection;