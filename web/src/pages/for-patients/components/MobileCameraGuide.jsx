import React, { useState } from 'react';
import Button from '../../../components/ui/Button';
import Image from '../../../components/AppImage';
import Icon from '../../../components/AppIcon';

const MobileCameraGuide = () => {
  const [activeStep, setActiveStep] = useState(0);

  const cameraSteps = [
    {
      id: 1,
      title: 'Prepare Your Environment',
      description: 'Set up optimal lighting and positioning for the best AI analysis results.',
      image: 'https://images.unsplash.com/photo-1559757148-5c350d0d3c56?w=400&h=300&fit=crop',
      tips: [
        'Find a well-lit area with natural daylight',
        'Face a window or use bright white LED light',
        'Avoid yellow/warm lighting or shadows',
        'Clean your teeth and rinse your mouth'
      ],
      icon: 'Lightbulb'
    },
    {
      id: 2,
      title: 'Position Your Phone',
      description: 'Hold your device at the correct distance and angle for clear dental photos.',
      image: 'https://images.pexels.com/photos/3845810/pexels-photo-3845810.jpeg?w=400&h=300&fit=crop',
      tips: [
        'Hold phone 6-8 inches from your mouth',
        'Keep camera parallel to your teeth',
        'Use both hands for stability',
        'Follow the guided overlay in the app'
      ],
      icon: 'Smartphone'
    },
    {
      id: 3,
      title: 'Take Front View Photos',
      description: 'Capture clear images of your front teeth with proper lip retraction.',
      image: 'https://images.pixabay.com/photo/2020/05/30/20/52/dentist-5238152_1280.jpg?w=400&h=300&fit=crop',
      tips: [
        'Gently pull your lips back with clean fingers',
        'Show both upper and lower front teeth',
        'Keep your mouth slightly open',
        'Take 2-3 shots for best results'
      ],
      icon: 'Camera'
    },
    {
      id: 4,
      title: 'Capture Upper & Lower Views',
      description: 'Get detailed shots of your upper and lower teeth surfaces.',
      image: 'https://images.unsplash.com/photo-1606811841689-23dfddce3e95?w=400&h=300&fit=crop',
      tips: [
        'Tilt your head back for upper teeth view',
        'Tilt your head forward for lower teeth view',
        'Use a small dental mirror if available',
        'Ensure all teeth are visible and in focus'
      ],
      icon: 'Eye'
    },
    {
      id: 5,
      title: 'Side Profile Shots',
      description: 'Complete your analysis with left and right side profile images.',
      image: 'https://images.unsplash.com/photo-1588776814546-1ffcf47267a5?w=400&h=300&fit=crop',
      tips: [
        'Turn your head 90 degrees to each side',
        'Keep your mouth slightly open',
        'Show the bite relationship clearly',
        'Capture both left and right sides'
      ],
      icon: 'RotateCw'
    }
  ];

  const commonMistakes = [
    {
      mistake: 'Poor lighting creates shadows',
      solution: 'Use natural daylight or bright white LED',
      icon: 'AlertTriangle'
    },
    {
      mistake: 'Camera too far or too close',
      solution: 'Maintain 6-8 inch distance from mouth',
      icon: 'Move'
    },
    {
      mistake: 'Blurry or out-of-focus images',
      solution: 'Hold steady and tap to focus before shooting',
      icon: 'Focus'
    },
    {
      mistake: 'Incomplete tooth visibility',
      solution: 'Retract lips fully and open mouth wider',
      icon: 'Eye'
    }
  ];

  const nextStep = () => {
    setActiveStep((prev) => (prev + 1) % cameraSteps?.length);
  };

  const prevStep = () => {
    setActiveStep((prev) => (prev - 1 + cameraSteps?.length) % cameraSteps?.length);
  };

  return (
    <section className="py-20 bg-brand-canvas">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-text-primary mb-4">
            Perfect Photo Guide
          </h2>
          <p className="text-lg text-text-secondary max-w-3xl mx-auto">
            Follow our step-by-step guide to capture the best dental photos for AI analysis. 
            Quality images lead to more accurate insights and better recommendations.
          </p>
        </div>

        {/* Step Navigation */}
        <div className="flex justify-center mb-8">
          <div className="flex items-center space-x-2 bg-white rounded-full p-2 shadow-brand">
            {cameraSteps?.map((step, index) => (
              <button
                key={step?.id}
                onClick={() => setActiveStep(index)}
                className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium transition-gentle ${
                  index === activeStep
                    ? 'bg-primary text-primary-foreground shadow-brand'
                    : index < activeStep
                    ? 'bg-trust-green text-white' :'bg-muted text-text-secondary hover:bg-primary/10'
                }`}
              >
                {index < activeStep ? (
                  <Icon name="Check" size={16} />
                ) : (
                  index + 1
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Current Step */}
        <div className="bg-white rounded-2xl shadow-brand overflow-hidden">
          <div className="grid lg:grid-cols-2 gap-8">
            {/* Step Content */}
            <div className="p-8">
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                  <Icon name={cameraSteps?.[activeStep]?.icon} size={24} className="text-primary" />
                </div>
                <div>
                  <div className="text-sm text-primary font-medium">
                    Step {activeStep + 1} of {cameraSteps?.length}
                  </div>
                  <h3 className="text-2xl font-bold text-text-primary">
                    {cameraSteps?.[activeStep]?.title}
                  </h3>
                </div>
              </div>

              <p className="text-text-secondary mb-6 text-lg">
                {cameraSteps?.[activeStep]?.description}
              </p>

              <div className="space-y-3 mb-8">
                {cameraSteps?.[activeStep]?.tips?.map((tip, index) => (
                  <div key={index} className="flex items-start space-x-3">
                    <Icon name="CheckCircle" size={18} className="text-trust-green mt-0.5 flex-shrink-0" />
                    <span className="text-text-primary">{tip}</span>
                  </div>
                ))}
              </div>

              {/* Navigation Buttons */}
              <div className="flex gap-4">
                <Button
                  variant="outline"
                  onClick={prevStep}
                  iconName="ChevronLeft"
                  iconPosition="left"
                  iconSize={18}
                  disabled={activeStep === 0}
                >
                  Previous
                </Button>
                <Button
                  variant="default"
                  onClick={nextStep}
                  iconName={activeStep === cameraSteps?.length - 1 ? "Camera" : "ChevronRight"}
                  iconPosition="right"
                  iconSize={18}
                  className={activeStep === cameraSteps?.length - 1 ? "" : ""}
                >
                  {activeStep === cameraSteps?.length - 1 ? "Start Taking Photos" : "Next Step"}
                </Button>
              </div>
            </div>

            {/* Step Image */}
            <div className="relative">
              <Image
                src={cameraSteps?.[activeStep]?.image}
                alt={cameraSteps?.[activeStep]?.title}
                className="w-full h-full object-cover lg:min-h-[500px]"
              />
              
              {/* Overlay Guide */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent flex items-end">
                <div className="p-6 text-white">
                  <div className="flex items-center space-x-2 mb-2">
                    <Icon name="Info" size={16} />
                    <span className="text-sm font-medium">Pro Tip</span>
                  </div>
                  <p className="text-sm opacity-90">
                    {activeStep === 0 && "Natural lighting produces the most accurate AI analysis results"}
                    {activeStep === 1 && "Steady hands and proper distance ensure sharp, clear images"}
                    {activeStep === 2 && "Front view photos are crucial for detecting alignment issues"}
                    {activeStep === 3 && "Upper and lower views help identify cavities and gum problems"}
                    {activeStep === 4 && "Side profiles show bite relationships and jaw alignment"}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Common Mistakes */}
        <div className="mt-16">
          <h3 className="text-2xl font-bold text-text-primary text-center mb-8">
            Avoid These Common Mistakes
          </h3>
          
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {commonMistakes?.map((item, index) => (
              <div key={index} className="bg-white rounded-xl p-6 shadow-brand text-center">
                <div className="w-12 h-12 bg-error/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Icon name={item?.icon} size={24} className="text-error" />
                </div>
                <h4 className="font-semibold text-text-primary mb-2">
                  {item?.mistake}
                </h4>
                <p className="text-sm text-text-secondary">
                  {item?.solution}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Start CTA
        <div className="mt-16 text-center">
          <div className="bg-primary/5 rounded-2xl p-8 border border-primary/20">
            <Icon name="Smartphone" size={48} className="text-primary mx-auto mb-4" />
            <h3 className="text-2xl font-bold text-text-primary mb-4">
              Ready to Get Started?
            </h3>
            <p className="text-text-secondary mb-6 max-w-2xl mx-auto">
              Download the Serene AI app and start your dental health journey today. 
              Our guided camera interface will walk you through each step.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button
                variant="default"
                size="lg"
                iconName="Download"
                iconPosition="left"
                iconSize={20}
              >
                Download iOS App
              </Button>
              <Button
                variant="outline"
                size="lg"
                iconName="Download"
                iconPosition="left"
                iconSize={20}
              >
                Download Android App
              </Button>
            </div>
          </div>
        </div> */}
      </div>
    </section>
  );
};

export default MobileCameraGuide;