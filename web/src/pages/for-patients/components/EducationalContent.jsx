import React, { useState } from 'react';
import Button from '../../../components/ui/Button';
import Image from '../../../components/AppImage';
import Icon from '../../../components/AppIcon';

const EducationalContent = () => {
  const [activeCategory, setActiveCategory] = useState('prevention');

  const categories = [
    { id: 'prevention', label: 'Prevention', icon: 'Shield' },
    { id: 'conditions', label: 'Common Conditions', icon: 'AlertCircle' },
    { id: 'treatments', label: 'Treatments', icon: 'Wrench' },
    { id: 'oral-care', label: 'Daily Care', icon: 'Sparkles' }
  ];

  const educationalContent = {
    prevention: [
      {
        id: 1,
        title: 'The Complete Guide to Preventing Cavities',
        description: 'Learn evidence-based strategies to protect your teeth from decay, including proper brushing techniques, fluoride use, and dietary recommendations.',
        image: 'https://images.pexels.com/photos/3845810/pexels-photo-3845810.jpeg?w=400&h=250&fit=crop',
        readTime: '8 min read',
        category: 'Prevention',
        aiInsight: 'AI analysis shows that patients who follow these prevention protocols reduce cavity risk by 73%'
      },
      {
        id: 2,
        title: 'Gum Disease Prevention: What You Need to Know',
        description: 'Understanding the early signs of gum disease and how to prevent it through proper oral hygiene and professional care.',
        image: 'https://images.unsplash.com/photo-1606811841689-23dfddce3e95?w=400&h=250&fit=crop',
        readTime: '6 min read',
        category: 'Prevention',
        aiInsight: 'Our AI detects early gum inflammation 2 weeks before visible symptoms appear'
      },
      {
        id: 3,
        title: 'Nutrition for Optimal Dental Health',
        description: 'Discover which foods strengthen your teeth and which ones to limit for better oral health outcomes.',
        image: 'https://images.pixabay.com/photo/2017/05/11/19/44/fresh-fruits-2305192_1280.jpg?w=400&h=250&fit=crop',
        readTime: '5 min read',
        category: 'Prevention',
        aiInsight: 'Patients following our nutrition guidelines show 45% improvement in enamel strength'
      }
    ],
    conditions: [
      {
        id: 4,
        title: 'Understanding Tooth Sensitivity',
        description: 'Learn about the causes of tooth sensitivity and effective treatment options to reduce discomfort.',
        image: 'https://images.unsplash.com/photo-1588776814546-1ffcf47267a5?w=400&h=250&fit=crop',
        readTime: '7 min read',
        category: 'Conditions',
        aiInsight: 'AI can identify sensitivity patterns from photos with 89% accuracy'
      },
      {
        id: 5,
        title: 'Recognizing Signs of Oral Cancer',
        description: 'Important information about oral cancer symptoms and the importance of regular screenings.',
        image: 'https://images.pexels.com/photos/3845623/pexels-photo-3845623.jpeg?w=400&h=250&fit=crop',
        readTime: '10 min read',
        category: 'Conditions',
        aiInsight: 'Early detection through AI screening improves treatment success rates by 60%'
      }
    ],
    treatments: [
      {
        id: 6,
        title: 'Modern Root Canal Treatment',
        description: 'Debunking myths about root canals and understanding the modern, comfortable treatment process.',
        image: 'https://images.unsplash.com/photo-1629909613654-28e377c37b09?w=400&h=250&fit=crop',
        readTime: '9 min read',
        category: 'Treatments',
        aiInsight: 'AI pre-treatment analysis reduces procedure time by 25%'
      },
      {
        id: 7,
        title: 'Dental Implants: A Complete Guide',
        description: 'Everything you need to know about dental implants, from candidacy to recovery.',
        image: 'https://images.pixabay.com/photo/2020/05/30/20/52/dentist-5238152_1280.jpg?w=400&h=250&fit=crop',
        readTime: '12 min read',
        category: 'Treatments',
        aiInsight: 'AI planning increases implant success rates to 98.5%'
      }
    ],
    'oral-care': [
      {
        id: 8,
        title: 'Perfect Brushing Technique',
        description: 'Master the proper brushing technique with step-by-step instructions and common mistakes to avoid.',
        image: 'https://images.unsplash.com/photo-1607613009820-a29f7bb81c04?w=400&h=250&fit=crop',
        readTime: '4 min read',
        category: 'Daily Care',
        aiInsight: 'Proper technique removes 40% more plaque than standard brushing'
      },
      {
        id: 9,
        title: 'Flossing: Beyond the Basics',
        description: 'Advanced flossing techniques and alternatives for different dental situations.',
        image: 'https://images.pexels.com/photos/3845810/pexels-photo-3845810.jpeg?w=400&h=250&fit=crop',
        readTime: '6 min read',
        category: 'Daily Care',
        aiInsight: 'Daily flossing reduces gum disease risk by 85% according to our patient data'
      }
    ]
  };

  return (
    <section className="py-20 bg-brand-canvas">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-text-primary mb-4">
            Your Dental Health Library
          </h2>
          <p className="text-lg text-text-secondary max-w-3xl mx-auto">
            Access comprehensive, AI-enhanced educational content to understand your dental health better. 
            Learn from expert insights combined with real patient data analysis.
          </p>
        </div>

        {/* Category Tabs */}
        <div className="flex flex-wrap justify-center gap-2 mb-12">
          {categories?.map((category) => (
            <button
              key={category?.id}
              onClick={() => setActiveCategory(category?.id)}
              className={`flex items-center space-x-2 px-6 py-3 rounded-full font-medium transition-gentle hover-lift ${
                activeCategory === category?.id
                  ? 'bg-primary text-primary-foreground shadow-brand'
                  : 'bg-white text-text-primary hover:bg-muted hover:text-primary border border-border'
              }`}
            >
              <Icon name={category?.icon} size={18} />
              <span>{category?.label}</span>
            </button>
          ))}
        </div>

        {/* Content Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {educationalContent?.[activeCategory]?.map((article) => (
            <article key={article?.id} className="bg-white rounded-2xl shadow-brand hover:shadow-brand-hover transition-gentle hover-lift overflow-hidden">
              <div className="relative">
                <Image
                  src={article?.image}
                  alt={article?.title}
                  className="w-full h-48 object-cover"
                />
                <div className="absolute top-4 left-4">
                  <span className="px-3 py-1 bg-primary text-primary-foreground text-xs font-medium rounded-full">
                    {article?.category}
                  </span>
                </div>
                <div className="absolute top-4 right-4">
                  <span className="px-3 py-1 bg-white/90 text-text-primary text-xs font-medium rounded-full">
                    {article?.readTime}
                  </span>
                </div>
              </div>

              <div className="p-6">
                <h3 className="text-xl font-bold text-text-primary mb-3 line-clamp-2">
                  {article?.title}
                </h3>
                
                <p className="text-text-secondary mb-4 line-clamp-3">
                  {article?.description}
                </p>

                {/* AI Insight */}
                <div className="bg-brand-canvas p-3 rounded-lg mb-4 border border-primary/20">
                  <div className="flex items-start space-x-2">
                    <Icon name="Brain" size={16} className="text-primary mt-0.5 flex-shrink-0" />
                    <p className="text-sm text-text-primary">
                      <span className="font-medium text-primary">AI Insight:</span> {article?.aiInsight}
                    </p>
                  </div>
                </div>

                <Button
                  variant="outline"
                  fullWidth
                  iconName="ArrowRight"
                  iconPosition="right"
                  iconSize={16}
                >
                  Read Article
                </Button>
              </div>
            </article>
          ))}
        </div>

        {/* CTA Section */}
        <div className="mt-16 text-center">
          <div className="bg-white rounded-2xl p-8 shadow-brand max-w-2xl mx-auto">
            <Icon name="BookOpen" size={48} className="text-primary mx-auto mb-4" />
            <h3 className="text-2xl font-bold text-text-primary mb-4">
              Want Personalized Health Insights?
            </h3>
            <p className="text-text-secondary mb-6">
              Get AI-powered analysis of your specific dental concerns with personalized educational content 
              tailored to your oral health needs.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button
                variant="default"
                iconName="Camera"
                iconPosition="left"
                iconSize={18}
              >
                Start Personal Analysis
              </Button>
              <Button
                variant="outline"
                iconName="MessageCircle"
                iconPosition="left"
                iconSize={18}
              >
                Ask Our AI Assistant
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default EducationalContent;