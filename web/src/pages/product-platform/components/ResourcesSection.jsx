import React from 'react';
import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';

const ResourcesSection = () => {
  const whitepapers = [
    {
      title: "AI Accuracy in Dental Diagnostics: A Comprehensive Study",
      description: "Peer-reviewed research on YOLOv8 performance in dental condition detection across 35,000 patient cases.",
      type: "Research Paper",
      pages: "24 pages",
      downloadCount: "2,847",
      icon: "FileText"
    },
    {
      title: "Clinical Integration Guide for Dental AI",
      description: "Best practices for implementing AI-powered diagnostic tools in dental practice workflows.",
      type: "Implementation Guide",
      pages: "16 pages", 
      downloadCount: "1,923",
      icon: "BookOpen"
    },
    {
      title: "ROI Analysis: AI vs Traditional Dental Diagnostics",
      description: "Economic impact study showing cost savings and efficiency gains from AI adoption in dental practices.",
      type: "Business Case",
      pages: "12 pages",
      downloadCount: "3,156",
      icon: "TrendingUp"
    }
  ];

  const caseStudies = [
    {
      title: "Metro Dental Group: 40% Increase in Early Detection",
      practice: "Metro Dental Group",
      location: "Chicago, IL",
      results: ["40% increase in early caries detection", "25% reduction in analysis time", "92% patient satisfaction"],
      image: "https://images.unsplash.com/photo-1629909613654-28e377c37b09?w=400&h=250&fit=crop"
    },
    {
      title: "University Dental Clinic: Enhanced Student Training",
      practice: "NYU College of Dentistry",
      location: "New York, NY", 
      results: ["Enhanced diagnostic training", "Improved learning outcomes", "Standardized assessments"],
      image: "https://images.unsplash.com/photo-1576091160399-112ba8d25d1f?w=400&h=250&fit=crop"
    },
    {
      title: "Rural Health Network: Expanding Access to Care",
      practice: "Mountain View Health Network",
      location: "Colorado",
      results: ["Expanded specialist access", "Reduced referral delays", "Improved rural care quality"],
      image: "https://images.unsplash.com/photo-1551601651-2a8555f1a136?w=400&h=250&fit=crop"
    }
  ];

  return (
    <section className="py-16 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            Research & Resources
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Access comprehensive research, case studies, and implementation guides to understand the impact and benefits of AI-powered dental diagnostics.
          </p>
        </div>

        {/* Whitepapers Section */}
        <div className="mb-16">
          <h3 className="text-2xl font-semibold text-gray-900 mb-8">Research Publications & Whitepapers</h3>
          <div className="grid md:grid-cols-3 gap-8">
            {whitepapers?.map((paper, index) => (
              <div key={index} className="bg-white rounded-lg shadow-brand border border-gray-200 p-6 hover:shadow-brand-hover transition-all duration-300">
                <div className="flex items-start space-x-4 mb-4">
                  <div className="flex-shrink-0 w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                    <Icon name={paper?.icon} size={24} className="text-primary" />
                  </div>
                  <div className="flex-1">
                    <div className="inline-block bg-gray-100 text-gray-700 text-xs font-medium px-2 py-1 rounded-full mb-2">
                      {paper?.type}
                    </div>
                    <h4 className="text-lg font-semibold text-gray-900 mb-2">{paper?.title}</h4>
                  </div>
                </div>
                
                <p className="text-gray-600 text-sm mb-4 leading-relaxed">
                  {paper?.description}
                </p>
                
                <div className="flex items-center justify-between text-sm text-gray-500 mb-4">
                  <span>{paper?.pages}</span>
                  <span>{paper?.downloadCount} downloads</span>
                </div>
                
                <Button variant="outline" fullWidth iconName="Download" iconPosition="left">
                  Download PDF
                </Button>
              </div>
            ))}
          </div>
        </div>

        {/* Case Studies Section */}
        <div className="mb-16">
          <h3 className="text-2xl font-semibold text-gray-900 mb-8">Success Stories & Case Studies</h3>
          <div className="grid lg:grid-cols-3 gap-8">
            {caseStudies?.map((study, index) => (
              <div key={index} className="bg-white rounded-lg shadow-brand border border-gray-200 overflow-hidden hover:shadow-brand-hover transition-all duration-300">
                <div className="aspect-video overflow-hidden">
                  <img
                    src={study?.image}
                    alt={study?.practice}
                    className="w-full h-full object-cover"
                  />
                </div>
                
                <div className="p-6">
                  <h4 className="text-lg font-semibold text-gray-900 mb-2">{study?.title}</h4>
                  <div className="flex items-center space-x-2 text-sm text-gray-600 mb-4">
                    <Icon name="MapPin" size={14} />
                    <span>{study?.practice} • {study?.location}</span>
                  </div>
                  
                  <div className="space-y-2 mb-4">
                    {study?.results?.map((result, resultIndex) => (
                      <div key={resultIndex} className="flex items-center space-x-2">
                        <Icon name="CheckCircle" size={14} className="text-green-600" />
                        <span className="text-sm text-gray-700">{result}</span>
                      </div>
                    ))}
                  </div>
                  
                  <Button variant="ghost" fullWidth iconName="ArrowRight" iconPosition="right">
                    Read Full Case Study
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Clinical Validation Banner */}
        <div className="bg-gradient-to-r from-green-50 to-blue-50 rounded-2xl p-8 border border-green-200">
          <div className="grid lg:grid-cols-2 gap-8 items-center">
            <div>
              <div className="flex items-center space-x-2 mb-4">
                <Icon name="Award" size={24} className="text-green-600" />
                <span className="text-green-800 font-semibold">Clinical Validation</span>
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4">
                Peer-Reviewed & Clinically Validated
              </h3>
              <p className="text-gray-700 mb-6">
                Our AI models have undergone rigorous clinical validation through multi-center trials and peer-reviewed research, ensuring reliability and accuracy in real-world clinical settings.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Button variant="default" iconName="FileText" iconPosition="left">
                  View Publications
                </Button>
                <Button variant="outline" iconName="Users" iconPosition="left">
                  Meet Our Advisory Board
                </Button>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white rounded-lg p-4 text-center shadow-sm">
                <div className="text-2xl font-bold text-primary mb-1">15</div>
                <div className="text-sm text-gray-600">Clinical Sites</div>
              </div>
              <div className="bg-white rounded-lg p-4 text-center shadow-sm">
                <div className="text-2xl font-bold text-primary mb-1">35K+</div>
                <div className="text-sm text-gray-600">Patient Cases</div>
              </div>
              <div className="bg-white rounded-lg p-4 text-center shadow-sm">
                <div className="text-2xl font-bold text-primary mb-1">18</div>
                <div className="text-sm text-gray-600">Months Study</div>
              </div>
              <div className="bg-white rounded-lg p-4 text-center shadow-sm">
                <div className="text-2xl font-bold text-primary mb-1">94.7%</div>
                <div className="text-sm text-gray-600">Accuracy Rate</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ResourcesSection;