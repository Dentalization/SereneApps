import React, { useState } from 'react';
import Header from '../../components/ui/Header';
import SplashScreen from './components/SplashScreen';
import HowToUse from './components/HowToUse';
import SereneChat from './components/serenechat';

const SereneAIPage = () => {
  const [currentStep, setCurrentStep] = useState('splash'); // 'splash' | 'howto' | 'chat'

  const handleSplashContinue = () => {
    setCurrentStep('howto');
  };

  const handleHowToContinue = () => {
    setCurrentStep('chat');
  };

  // Render different components based on current step
  if (currentStep === 'splash') {
    return <SplashScreen onContinue={handleSplashContinue} />;
  }

  if (currentStep === 'howto') {
    return <HowToUse onContinue={handleHowToContinue} />;
  }

  // Default: show the main chat interface
  return (
    <div className="min-h-screen bg-white dark:bg-gray-900">
      <Header />
      
      {/* Hero Section */}
      <section className="pt-24 pb-8 bg-gradient-to-br from-primary/5 to-secondary/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center space-y-6">
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-text-primary">
              Serene AI{' '}
              <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                Agentic
              </span>
            </h1>
            <p className="text-xl text-text-secondary max-w-3xl mx-auto">
              Advanced AI-powered dental analysis with conversational intelligence. 
              Upload your dental images and get professional insights through natural conversation.
            </p>
            <div className="flex flex-wrap justify-center gap-4 text-sm text-text-secondary">
              <span className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-trust-green rounded-full"></div>
                <span>Real-time Analysis</span>
              </span>
              <span className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-primary rounded-full"></div>
                <span>Conversational AI</span>
              </span>
              <span className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-accent rounded-full"></div>
                <span>Professional Grade</span>
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Chat Interface */}
      <main className="pb-8">
        <SereneChat />
      </main>
    </div>
  );
};

export default SereneAIPage;
