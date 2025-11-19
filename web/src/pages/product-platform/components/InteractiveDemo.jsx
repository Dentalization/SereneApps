import React, { useState } from 'react';
import Icon from '../../../components/AppIcon';
import Image from '../../../components/AppImage';
import Button from '../../../components/ui/Button';

const InteractiveDemo = () => {
  const [selectedImage, setSelectedImage] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState(null);

  const sampleImages = [
    {
      id: 1,
      name: "Cavity Detection Sample",
      url: "https://images.unsplash.com/photo-1606811841689-23dfddce3e95?w=400&h=300&fit=crop",
      conditions: ["Dental Caries", "Enamel Erosion"],
      confidence: 92
    },
    {
      id: 2,
      name: "Gum Disease Analysis",
      url: "https://images.unsplash.com/photo-1559757148-5c350d0d3c56?w=400&h=300&fit=crop",
      conditions: ["Gingivitis", "Plaque Buildup"],
      confidence: 87
    },
    {
      id: 3,
      name: "Healthy Teeth Reference",
      url: "https://images.unsplash.com/photo-1588776814546-1ffcf47267a5?w=400&h=300&fit=crop",
      conditions: ["No Issues Detected"],
      confidence: 96
    }
  ];

  const handleImageSelect = (image) => {
    setSelectedImage(image);
    setAnalysisResult(null);
  };

  const handleAnalyze = () => {
    if (!selectedImage) return;
    
    setIsAnalyzing(true);
    
    // Simulate AI analysis
    setTimeout(() => {
      setAnalysisResult({
        conditions: selectedImage?.conditions,
        confidence: selectedImage?.confidence,
        recommendations: [
          "Schedule dental consultation within 2 weeks",
          "Maintain regular brushing and flossing routine",
          "Consider fluoride treatment for enamel protection"
        ],
        riskLevel: selectedImage?.confidence > 90 ? "Low" : "Medium"
      });
      setIsAnalyzing(false);
    }, 3000);
  };

  return (
    <section className="py-16 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            Interactive AI Analysis Demo
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Experience our AI-powered dental analysis in real-time. Select a sample image or upload your own to see how Serene identifies conditions and provides insights.
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-12">
          {/* Image Selection */}
          <div className="space-y-6">
            <h3 className="text-xl font-semibold text-gray-900">Choose Sample Image</h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-4">
              {sampleImages?.map((image) => (
                <div
                  key={image?.id}
                  onClick={() => handleImageSelect(image)}
                  className={`cursor-pointer rounded-lg border-2 transition-all duration-200 hover:shadow-lg ${
                    selectedImage?.id === image?.id
                      ? 'border-primary shadow-brand'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="p-4">
                    <div className="aspect-video rounded-lg overflow-hidden mb-3">
                      <Image
                        src={image?.url}
                        alt={image?.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <h4 className="font-medium text-gray-900">{image?.name}</h4>
                    <p className="text-sm text-gray-500 mt-1">
                      {image?.conditions?.join(", ")}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-primary transition-colors">
              <Icon name="Upload" size={48} className="mx-auto text-gray-400 mb-4" />
              <p className="text-gray-600 mb-2">Or upload your own dental image</p>
              <Button variant="outline" iconName="Camera" iconPosition="left">
                Upload Image
              </Button>
            </div>
          </div>

          {/* Analysis Results */}
          <div className="space-y-6">
            <h3 className="text-xl font-semibold text-gray-900">AI Analysis Results</h3>
            
            {!selectedImage ? (
              <div className="bg-gray-50 rounded-lg p-8 text-center">
                <Icon name="ImageIcon" size={48} className="mx-auto text-gray-400 mb-4" />
                <p className="text-gray-600">Select an image to begin analysis</p>
              </div>
            ) : (
              <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
                <div className="flex items-center justify-between mb-6">
                  <h4 className="font-semibold text-gray-900">Analysis for: {selectedImage?.name}</h4>
                  <Button
                    onClick={handleAnalyze}
                    loading={isAnalyzing}
                    disabled={isAnalyzing}
                    iconName="Play"
                    iconPosition="left"
                  >
                    {isAnalyzing ? 'Analyzing...' : 'Start Analysis'}
                  </Button>
                </div>

                {isAnalyzing && (
                  <div className="space-y-4">
                    <div className="flex items-center space-x-3">
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary"></div>
                      <span className="text-sm text-gray-600">Processing image with YOLOv8...</span>
                    </div>
                    <div className="flex items-center space-x-3">
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-secondary"></div>
                      <span className="text-sm text-gray-600">Generating insights with GPT-4...</span>
                    </div>
                    <div className="flex items-center space-x-3">
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-accent"></div>
                      <span className="text-sm text-gray-600">Compiling recommendations...</span>
                    </div>
                  </div>
                )}

                {analysisResult && (
                  <div className="space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-primary/5 rounded-lg p-4">
                        <div className="flex items-center space-x-2 mb-2">
                          <Icon name="Target" size={16} className="text-primary" />
                          <span className="text-sm font-medium text-primary">Confidence</span>
                        </div>
                        <span className="text-2xl font-bold text-gray-900">{analysisResult?.confidence}%</span>
                      </div>
                      <div className={`rounded-lg p-4 ${
                        analysisResult?.riskLevel === 'Low' ? 'bg-green-50' : 'bg-yellow-50'
                      }`}>
                        <div className="flex items-center space-x-2 mb-2">
                          <Icon name="AlertTriangle" size={16} className={
                            analysisResult?.riskLevel === 'Low' ? 'text-green-600' : 'text-yellow-600'
                          } />
                          <span className={`text-sm font-medium ${
                            analysisResult?.riskLevel === 'Low' ? 'text-green-600' : 'text-yellow-600'
                          }`}>Risk Level</span>
                        </div>
                        <span className="text-2xl font-bold text-gray-900">{analysisResult?.riskLevel}</span>
                      </div>
                    </div>

                    <div>
                      <h5 className="font-medium text-gray-900 mb-3">Detected Conditions</h5>
                      <div className="space-y-2">
                        {analysisResult?.conditions?.map((condition, index) => (
                          <div key={index} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                            <Icon name="CheckCircle" size={16} className="text-green-600" />
                            <span className="text-gray-900">{condition}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div>
                      <h5 className="font-medium text-gray-900 mb-3">AI Recommendations</h5>
                      <div className="space-y-2">
                        {analysisResult?.recommendations?.map((rec, index) => (
                          <div key={index} className="flex items-start space-x-3 p-3 bg-blue-50 rounded-lg">
                            <Icon name="Lightbulb" size={16} className="text-blue-600 mt-0.5" />
                            <span className="text-gray-900 text-sm">{rec}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};

export default InteractiveDemo;