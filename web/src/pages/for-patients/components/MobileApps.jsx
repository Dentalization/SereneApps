import React from 'react';
import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';

const MobileApps = () => {
  const features = [
    {
      icon: 'Camera',
      title: 'Instant Dental Scan',
      description: 'Take photos of your teeth and get immediate AI analysis'
    },
    {
      icon: 'MessageCircle',
      title: 'First Diagnosis with AI',
      description: 'Get Result of your tooth, anywhere'
    },
    {
      icon: 'Calendar',
      title: 'Smart Scheduling',
      description: 'Book appointments easily'
    },
    {
      icon: 'FileText',
      title: 'Health Records',
      description: 'Keep track of your dental history and progress'
    }
  ];

  return (
    <section className="py-24 bg-gradient-to-br from-blue-50 via-white to-indigo-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full text-sm font-medium mb-4">
            <Icon name="Smartphone" size={16} />
            Mobile Apps
          </div>
          <h2 className="text-4xl sm:text-5xl font-bold text-gray-900 dark:text-white mb-6">
            Your Dental Health
            <span className="block bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              In Your Pocket
            </span>
          </h2>
          <p className="text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">
            Download our mobile app and access AI-powered dental analysis wherever you are. 
            Professional-grade insights at your fingertips.
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-16 items-center">
          {/* Features List */}
          <div className="space-y-8">
            <div className="space-y-6">
              {features.map((feature, index) => (
                <div key={index} className="flex items-start gap-4 group">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-r from-primary to-secondary flex items-center justify-center text-white shadow-lg group-hover:scale-110 transition-transform duration-300">
                    <Icon name={feature.icon} size={20} />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                      {feature.title}
                    </h3>
                    <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
                      {feature.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* Download Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 pt-8">
              <Button 
                variant="default" 
                iconName="Smartphone" 
                iconPosition="left" 
                iconSize={20}
                className="justify-center"
              >
                Download for iOS
              </Button>
              <Button 
                variant="outline" 
                iconName="Smartphone" 
                iconPosition="left" 
                iconSize={20}
                className="justify-center"
              >
                Download for Android
              </Button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-8 pt-8 border-t border-gray-200 dark:border-gray-700">
              <div className="text-center">
                <div className="text-2xl font-bold text-primary mb-1">50k+</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Downloads</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-primary mb-1">4.9★</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">App Rating</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-primary mb-1">99%</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Accuracy</div>
              </div>
            </div>
          </div>

          {/* iPhone Mockups */}
          <div className="relative">
            {/* Background decoration */}
            <div className="absolute inset-0 bg-gradient-to-r from-primary/20 to-secondary/20 rounded-3xl blur-3xl transform rotate-6"></div>
            
            {/* Main iPhone */}
            <div className="relative z-10 max-w-sm mx-auto">
              {/* iPhone Frame */}
              <div className="relative bg-gray-900 rounded-[3rem] p-2 shadow-2xl">
                {/* Screen */}
                <div className="bg-white rounded-[2.5rem] overflow-hidden relative">
                  {/* Status Bar */}
                  <div className="bg-gray-50 h-12 flex items-center justify-between px-6 text-xs font-medium text-gray-900">
                    <span>9:41</span>
                    <div className="flex items-center gap-1">
                      <div className="w-4 h-2 bg-gray-400 rounded-sm"></div>
                      <div className="w-6 h-3 border border-gray-400 rounded-sm">
                        <div className="w-4 h-2 bg-green-500 rounded-sm m-0.5"></div>
                      </div>
                    </div>
                  </div>

                  {/* App Header */}
                  <div className="bg-gradient-to-r from-primary to-secondary text-white p-6">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center">
                        <Icon name="Sparkles" size={20} className="text-primary" />
                      </div>
                      <div>
                        <h3 className="font-semibold">Serene AI</h3>
                        <p className="text-xs opacity-90">Dental Assistant</p>
                      </div>
                    </div>
                    <p className="text-sm opacity-90">Welcome back! Ready for your dental check?</p>
                  </div>

                  {/* Main Content */}
                  <div className="p-6 space-y-4">
                    {/* Quick Actions */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-blue-50 rounded-xl p-4 text-center">
                        <Icon name="Camera" size={24} className="text-primary mx-auto mb-2" />
                        <p className="text-xs font-medium text-gray-700">Take Photo</p>
                      </div>
                      <div className="bg-green-50 rounded-xl p-4 text-center">
                        <Icon name="MessageCircle" size={24} className="text-green-600 mx-auto mb-2" />
                        <p className="text-xs font-medium text-gray-700">Ask AI</p>
                      </div>
                    </div>

                    {/* Recent Analysis */}
                    <div className="bg-gray-50 rounded-xl p-4">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                          <Icon name="CheckCircle" size={16} className="text-white" />
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-900">Recent Analysis</p>
                          <p className="text-xs text-gray-500">2 hours ago</p>
                        </div>
                      </div>
                      <p className="text-xs text-gray-600 leading-relaxed">
                        Great news! Your dental health looks good. No immediate concerns detected.
                      </p>
                    </div>

                    {/* Progress */}
                    <div className="bg-gradient-to-r from-green-50 to-blue-50 rounded-xl p-4">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-sm font-medium text-gray-900">Health Score</p>
                        <p className="text-sm font-bold text-green-600">92%</p>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div className="bg-gradient-to-r from-green-500 to-blue-500 h-2 rounded-full" style={{width: '92%'}}></div>
                      </div>
                    </div>
                  </div>

                  {/* Bottom Navigation */}
                  <div className="bg-white border-t border-gray-100 px-6 py-4">
                    <div className="flex justify-around">
                      <div className="text-center">
                        <Icon name="Home" size={20} className="text-primary mx-auto mb-1" />
                        <p className="text-xs text-primary font-medium">Home</p>
                      </div>
                      <div className="text-center">
                        <Icon name="Camera" size={20} className="text-gray-400 mx-auto mb-1" />
                        <p className="text-xs text-gray-400">Scan</p>
                      </div>
                      <div className="text-center">
                        <Icon name="FileText" size={20} className="text-gray-400 mx-auto mb-1" />
                        <p className="text-xs text-gray-400">Reports</p>
                      </div>
                      <div className="text-center">
                        <Icon name="User" size={20} className="text-gray-400 mx-auto mb-1" />
                        <p className="text-xs text-gray-400">Profile</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Home Indicator */}
                <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 w-32 h-1 bg-white rounded-full"></div>
              </div>
            </div>

            {/* Secondary iPhone (Smaller, positioned behind) */}
            <div className="absolute top-8 -right-8 w-48 opacity-75 transform rotate-12 scale-75">
              <div className="bg-gray-900 rounded-[2rem] p-1.5 shadow-xl">
                <div className="bg-white rounded-[1.5rem] overflow-hidden">
                  <div className="bg-gray-50 h-8 flex items-center justify-center text-xs">
                    <div className="w-12 h-1 bg-gray-300 rounded-full"></div>
                  </div>
                  <div className="bg-gradient-to-r from-secondary to-primary h-24 flex items-center justify-center">
                    <Icon name="Camera" size={32} className="text-white" />
                  </div>
                  <div className="p-4 space-y-2">
                    <div className="h-3 bg-gray-200 rounded w-3/4"></div>
                    <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                    <div className="grid grid-cols-2 gap-2 mt-4">
                      <div className="h-8 bg-blue-100 rounded"></div>
                      <div className="h-8 bg-green-100 rounded"></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default MobileApps;