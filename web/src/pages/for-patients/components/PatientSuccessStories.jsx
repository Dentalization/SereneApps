import React, { useState } from 'react';
import Button from '../../../components/ui/Button';
import Image from '../../../components/AppImage';
import Icon from '../../../components/AppIcon';

const PatientSuccessStories = () => {
  const [activeStory, setActiveStory] = useState(0);

  const successStories = [
    {
      id: 1,
      name: 'Sarah Chen',
      age: 34,
      location: 'San Francisco, CA',
      avatar: 'https://randomuser.me/api/portraits/women/44.jpg',
      condition: 'Early Cavity Detection',
      timeframe: '3 months ago',
      story: `I was having minor sensitivity but wasn't sure if it was serious enough for a dental visit. Using Serene's AI analysis, I uploaded a photo and discovered early signs of a cavity that wasn't visible to me. The AI recommended I see a dentist within two weeks.`,outcome: 'Caught early, treated with a simple filling instead of needing a crown',
      beforeImage: 'https://images.unsplash.com/photo-1606811841689-23dfddce3e95?w=300&h=200&fit=crop',afterImage: 'https://images.pexels.com/photos/3845810/pexels-photo-3845810.jpeg?w=300&h=200&fit=crop',savings: '$800',rating: 5,quote: 'Serene AI saved me from a much more expensive and painful procedure. Early detection changed everything!'
    },
    {
      id: 2,
      name: 'Michael Rodriguez',age: 42,location: 'Austin, TX',avatar: 'https://randomuser.me/api/portraits/men/32.jpg',condition: 'Gum Disease Prevention',timeframe: '6 months ago',
      story: `As someone who travels frequently for work, I often neglected my oral health. Serene's AI detected early signs of gum inflammation that I completely missed. The app guided me through proper brushing techniques and recommended specific products.`,
      outcome: 'Prevented progression to periodontitis through early intervention',
      beforeImage: 'https://images.pixabay.com/photo/2020/05/30/20/52/dentist-5238152_1280.jpg?w=300&h=200&fit=crop',
      afterImage: 'https://images.unsplash.com/photo-1607613009820-a29f7bb81c04?w=300&h=200&fit=crop',
      savings: '$1,200',
      rating: 5,
      quote: 'The AI caught what I missed during my daily routine. Now my gums are healthier than they\'ve been in years.'
    },
    {
      id: 3,
      name: 'Emily Watson',
      age: 28,
      location: 'Denver, CO',
      avatar: 'https://randomuser.me/api/portraits/women/68.jpg',
      condition: 'Wisdom Tooth Monitoring',
      timeframe: '4 months ago',
      story: `I was experiencing occasional jaw pain but wasn't sure if it was related to my wisdom teeth. The AI analysis identified crowding issues and recommended monitoring. Regular check-ins with the app helped track changes over time.`,
      outcome: 'Planned extraction at optimal time, avoiding emergency situation',
      beforeImage: 'https://images.unsplash.com/photo-1588776814546-1ffcf47267a5?w=300&h=200&fit=crop',afterImage: 'https://images.pexels.com/photos/3845623/pexels-photo-3845623.jpeg?w=300&h=200&fit=crop',savings: '$600',rating: 5,quote: 'Having a timeline and understanding what to expect made the whole process so much less stressful.'
    }
  ];

  const nextStory = () => {
    setActiveStory((prev) => (prev + 1) % successStories?.length);
  };

  const prevStory = () => {
    setActiveStory((prev) => (prev - 1 + successStories?.length) % successStories?.length);
  };

  const currentStory = successStories?.[activeStory];

  return (
    <section className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-text-primary mb-4">
            Real Patient Success Stories
          </h2>
          <p className="text-lg text-text-secondary max-w-3xl mx-auto">
            Discover how early detection and AI-powered insights have helped thousands of patients 
            avoid costly procedures and maintain better oral health.
          </p>
        </div>

        <div className="max-w-5xl mx-auto">
          {/* Main Story Display */}
          <div className="bg-surface rounded-2xl p-8 shadow-brand">
            <div className="grid lg:grid-cols-2 gap-8 items-center">
              {/* Story Content */}
              <div className="space-y-6">
                {/* Patient Info */}
                <div className="flex items-center space-x-4">
                  <Image
                    src={currentStory?.avatar}
                    alt={currentStory?.name}
                    className="w-16 h-16 rounded-full object-cover"
                  />
                  <div>
                    <h3 className="text-xl font-bold text-text-primary">{currentStory?.name}</h3>
                    <p className="text-text-secondary">
                      Age {currentStory?.age} • {currentStory?.location}
                    </p>
                    <div className="flex items-center space-x-1 mt-1">
                      {[...Array(currentStory?.rating)]?.map((_, i) => (
                        <Icon key={i} name="Star" size={16} className="text-accent fill-current" />
                      ))}
                    </div>
                  </div>
                </div>

                {/* Condition Badge */}
                <div className="inline-flex items-center px-4 py-2 bg-primary/10 rounded-full">
                  <Icon name="CheckCircle" size={16} className="text-primary mr-2" />
                  <span className="text-sm font-medium text-primary">{currentStory?.condition}</span>
                </div>

                {/* Story */}
                <div className="space-y-4">
                  <p className="text-text-primary leading-relaxed">
                    {currentStory?.story}
                  </p>
                  
                  <div className="bg-trust-green/10 p-4 rounded-lg border border-trust-green/20">
                    <h4 className="font-semibold text-trust-green mb-2">Outcome:</h4>
                    <p className="text-text-primary">{currentStory?.outcome}</p>
                  </div>
                </div>

                {/* Quote */}
                <blockquote className="border-l-4 border-primary pl-4 italic text-text-primary">
                  "{currentStory?.quote}"
                </blockquote>

                {/* Savings */}
                <div className="flex items-center justify-between p-4 bg-accent/10 rounded-lg">
                  <div className="flex items-center space-x-2">
                    <Icon name="DollarSign" size={20} className="text-accent" />
                    <span className="font-medium text-text-primary">Estimated Savings:</span>
                  </div>
                  <span className="text-2xl font-bold text-accent">{currentStory?.savings}</span>
                </div>
              </div>

              {/* Before/After Images */}
              <div className="space-y-6">
                <div className="text-center">
                  <h4 className="text-lg font-semibold text-text-primary mb-4">
                    Progress Comparison
                  </h4>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <div className="relative">
                      <Image
                        src={currentStory?.beforeImage}
                        alt="Before treatment"
                        className="w-full h-32 object-cover rounded-lg"
                      />
                      <div className="absolute top-2 left-2 px-2 py-1 bg-error text-white text-xs font-medium rounded">
                        Before
                      </div>
                    </div>
                    <p className="text-sm text-text-secondary text-center">Initial condition</p>
                  </div>

                  <div className="space-y-2">
                    <div className="relative">
                      <Image
                        src={currentStory?.afterImage}
                        alt="After treatment"
                        className="w-full h-32 object-cover rounded-lg"
                      />
                      <div className="absolute top-2 left-2 px-2 py-1 bg-trust-green text-white text-xs font-medium rounded">
                        After
                      </div>
                    </div>
                    <p className="text-sm text-text-secondary text-center">Healthy outcome</p>
                  </div>
                </div>

                <div className="text-center text-sm text-text-secondary">
                  <Icon name="Clock" size={16} className="inline mr-1" />
                  Treatment completed {currentStory?.timeframe}
                </div>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <div className="flex items-center justify-between mt-8">
            <Button
              variant="outline"
              onClick={prevStory}
              iconName="ChevronLeft"
              iconPosition="left"
              iconSize={18}
            >
              Previous Story
            </Button>

            {/* Story Indicators */}
            <div className="flex space-x-2">
              {successStories?.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setActiveStory(index)}
                  className={`w-3 h-3 rounded-full transition-gentle ${
                    index === activeStory ? 'bg-primary' : 'bg-border hover:bg-primary/50'
                  }`}
                  aria-label={`Go to story ${index + 1}`}
                />
              ))}
            </div>

            <Button
              variant="outline"
              onClick={nextStory}
              iconName="ChevronRight"
              iconPosition="right"
              iconSize={18}
            >
              Next Story
            </Button>
          </div>

          {/* Stats Section */}
          <div className="grid sm:grid-cols-3 gap-6 mt-12">
            <div className="text-center p-6 bg-white rounded-xl shadow-brand">
              <div className="text-3xl font-bold text-primary mb-2">94%</div>
              <p className="text-text-secondary">Early Detection Rate</p>
            </div>
            <div className="text-center p-6 bg-white rounded-xl shadow-brand">
              <div className="text-3xl font-bold text-accent mb-2">$1,200</div>
              <p className="text-text-secondary">Average Savings</p>
            </div>
            <div className="text-center p-6 bg-white rounded-xl shadow-brand">
              <div className="text-3xl font-bold text-trust-green mb-2">15,000+</div>
              <p className="text-text-secondary">Success Stories</p>
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="text-center mt-12">
          <Button
            variant="default"
            size="lg"
            iconName="Camera"
            iconPosition="left"
            iconSize={20}
          >
            Start Your Success Story
          </Button>
        </div>
      </div>
    </section>
  );
};

export default PatientSuccessStories;