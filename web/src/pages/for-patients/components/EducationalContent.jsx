import React, { useState } from 'react';
import Button from '../../../components/ui/Button';
import Image from '../../../components/AppImage';
import Icon from '../../../components/AppIcon';

const EducationalContent = () => {
  const [activeCategory, setActiveCategory] = useState('prevention');

  const categories = [
    { id: 'prevention', label: 'Prevention', icon: 'Shield' },
    { id: 'conditions', label: 'Conditions', icon: 'Activity' },
    { id: 'treatments', label: 'Treatments', icon: 'Stethoscope' },
    { id: 'daily-care', label: 'Daily Care', icon: 'Smile' }
  ];

  const contentData = {
    prevention: [
      {
        id: 'p1',
        title: 'The "Spit, Don\'t Rinse" Rule',
        description: 'Most people rinse with water after brushing, but this washes away the protective fluoride. Learn why leaving toothpaste on your teeth reduces cavity risk significantly.',
        image: 'https://images.unsplash.com/photo-1559656914-a30970c1affd?auto=format&fit=crop&w=800&q=80',
        readTime: '4 min read',
        source: 'Oral Health Foundation',
        aiInsight: 'Patients who stop rinsing after brushing show a 25% reduction in new cavity formation over 12 months.',
        featured: true
      },
      {
        id: 'p2',
        title: 'Nutrition: Nature’s Toothbrush',
        description: 'Crunchy vegetables like carrots and celery act as natural cleaners. Avoid sticky sweets that cling to enamel and fuel bacterial acid attacks.',
        image: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=400&q=80',
        readTime: '6 min read',
        source: 'ADA Nutrition Guide',
        aiInsight: 'Diets low in free sugars correlate with 50% fewer caries lesions in AI-analyzed patient cohorts.',
        featured: false
      },
      {
        id: 'p3',
        title: 'Sealants: The Invisible Shield',
        description: 'Dental sealants are a thin coating painted on the chewing surfaces of teeth (usually molars) to prevent decay for many years.',
        image: 'https://images.unsplash.com/photo-1606811841689-23dfddce3e95?auto=format&fit=crop&w=400&q=80',
        readTime: '5 min read',
        source: 'CDC Oral Health',
        aiInsight: 'School-age children without sealants have almost 3x more cavities than children with sealants.',
        featured: false
      }
    ],
    conditions: [
      {
        id: 'c1',
        title: 'Early Detection of Oral Cancer',
        description: 'Oral cancer can appear as a white or red patch, or a small sore that doesn’t heal. Early detection drastically improves survival rates.',
        image: 'https://images.unsplash.com/photo-1579684385127-1ef15d508118?auto=format&fit=crop&w=800&q=80',
        readTime: '7 min read',
        source: 'Oral Cancer Foundation',
        aiInsight: 'AI screening tools can identify suspicious lesions 2-3 years before they are visible to the naked eye.',
        featured: true
      },
      {
        id: 'c2',
        title: 'Gingivitis vs. Periodontitis',
        description: 'Gingivitis is reversible; Periodontitis involves permanent bone loss. Learn to spot the difference before it’s too late.',
        image: 'https://images.unsplash.com/photo-1588776814546-1ffcf47267a5?auto=format&fit=crop&w=400&q=80',
        readTime: '5 min read',
        source: 'Mayo Clinic',
        aiInsight: 'Our scans detect gum recession as small as 0.5mm, often the first sign of progressing periodontitis.',
        featured: false
      },
      {
        id: 'c3',
        title: 'Why Teeth Become Sensitive',
        description: 'Sensitivity often comes from worn enamel or exposed roots. Acidic foods and aggressive brushing are common culprits.',
        image: 'https://images.unsplash.com/photo-1609840114035-3c981b782dfe?auto=format&fit=crop&w=400&q=80',
        readTime: '4 min read',
        source: 'Cleveland Clinic',
        aiInsight: 'AI analysis links 65% of sensitivity cases to identifiable enamel erosion patterns.',
        featured: false
      }
    ],
    treatments: [
      {
        id: 't1',
        title: 'The Truth About Root Canals',
        description: 'Modern root canals are virtually painless—similar to getting a filling. They are the only way to save a deeply infected tooth from extraction.',
        image: 'https://images.unsplash.com/photo-1629909615184-74f495363b67?auto=format&fit=crop&w=800&q=80',
        readTime: '8 min read',
        source: 'American Association of Endodontists',
        aiInsight: 'Success rates for AI-guided endodontic treatments exceed 95% due to precise canal mapping.',
        featured: true
      },
      {
        id: 't2',
        title: 'Implants: The Gold Standard',
        description: 'Dental implants fuse with your jawbone (osseointegration) to provide permanent support for crowns and bridges.',
        image: 'https://images.unsplash.com/photo-1559757148-5c350d0d3c56?auto=format&fit=crop&w=400&q=80',
        readTime: '10 min read',
        source: 'Journal of Implantology',
        aiInsight: 'Implants prevent bone loss, preserving facial structure better than dentures or bridges.',
        featured: false
      }
    ],
    'daily-care': [
      {
        id: 'd1',
        title: 'Mastering the 45-Degree Angle',
        description: 'The most effective brushing technique involves angling bristles 45-degrees towards the gumline to clean the sulcus where bacteria hides.',
        image: 'https://images.unsplash.com/photo-1559599101-f09722fb4948?auto=format&fit=crop&w=800&q=80',
        readTime: '3 min read',
        source: 'ADA Guidelines',
        aiInsight: 'Patients adopting the Modified Bass Technique reduce plaque scores by an average of 40%.',
        featured: true
      },
      {
        id: 'd2',
        title: 'Floss vs. Interdental Brushes',
        description: 'While floss is great for tight contacts, interdental brushes may be more effective for larger gaps and periodontal patients.',
        image: 'https://images.unsplash.com/photo-1621252179027-94459d27d3ee?auto=format&fit=crop&w=400&q=80',
        readTime: '5 min read',
        source: 'European Federation of Periodontology',
        aiInsight: 'Daily interdental cleaning lowers the risk of severe gum disease by over 50%.',
        featured: false
      }
    ]
  };

  const activeArticles = contentData[activeCategory] || [];
  const featuredArticle = activeArticles.find(a => a.featured) || activeArticles[0];
  const standardArticles = activeArticles.filter(a => a.id !== featuredArticle.id);

  return (
    <section className="py-24 bg-slate-50 dark:bg-slate-950 relative overflow-hidden">
      
      {/* Decorative Background */}
      <div className="absolute top-0 left-0 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/clean-gray-paper.png')] opacity-[0.4] mix-blend-multiply dark:opacity-[0.05]" />
      <div className="absolute top-20 right-0 w-[500px] h-[500px] bg-blue-500/5 rounded-full blur-[120px] pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Header */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold uppercase tracking-wider mb-6">
            <Icon name="BookOpen" size={14} />
            <span>Knowledge Hub</span>
          </div>
          <h2 className="text-3xl md:text-5xl font-bold text-slate-900 dark:text-white mb-6">
            Evidence-Based <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-teal-500">
              Dental Education
            </span>
          </h2>
          <p className="text-lg text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
            Demystifying dentistry with verified medical data. Learn how to protect your smile using the same protocols trusted by top clinicians.
          </p>
        </div>

        {/* Category Navigation */}
        <div className="flex flex-wrap justify-center gap-3 mb-16">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`flex items-center gap-2 px-6 py-3 rounded-full text-sm font-bold transition-all duration-300 ${
                activeCategory === cat.id
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30 scale-105'
                  : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800 hover:border-blue-400'
              }`}
            >
              <Icon name={cat.icon} size={16} />
              {cat.label}
            </button>
          ))}
        </div>

        {/* Featured Article (Hero Card) */}
        {featuredArticle && (
          <div className="mb-12 group relative rounded-[2rem] overflow-hidden bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl hover:shadow-2xl transition-all duration-300">
            <div className="grid lg:grid-cols-2">
              <div className="relative h-64 lg:h-auto overflow-hidden">
                <Image
                  src={featuredArticle.image}
                  alt={featuredArticle.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                />
                <div className="absolute top-4 left-4 bg-blue-600 text-white text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wide shadow-md">
                  Featured
                </div>
              </div>
              <div className="p-8 lg:p-12 flex flex-col justify-center">
                <div className="flex items-center gap-2 text-xs font-medium text-slate-400 mb-4">
                  <Icon name="Clock" size={14} /> {featuredArticle.readTime}
                  <span className="mx-2">•</span>
                  <span>Source: {featuredArticle.source}</span>
                </div>
                
                <h3 className="text-2xl lg:text-3xl font-bold text-slate-900 dark:text-white mb-4">
                  {featuredArticle.title}
                </h3>
                <p className="text-slate-600 dark:text-slate-400 text-lg mb-8 leading-relaxed">
                  {featuredArticle.description}
                </p>

                {/* AI Insight Badge */}
                <div className="bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-500 p-4 rounded-r-xl mb-8">
                   <div className="flex items-start gap-3">
                     <Icon name="Database" size={20} className="text-blue-600 dark:text-blue-400 shrink-0 mt-1" />
                     <div>
                       <div className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase mb-1">Clinical Data Point</div>
                       <p className="text-sm text-slate-700 dark:text-slate-300 italic">"{featuredArticle.aiInsight}"</p>
                     </div>
                   </div>
                </div>

                <div className="mt-auto">
                  <Button variant="default" iconName="ArrowRight" iconPosition="right">
                    Read Full Article
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Standard Articles Grid */}
        <div className="grid md:grid-cols-2 gap-8">
          {standardArticles.map((article) => (
            <div 
              key={article.id} 
              className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300 flex flex-col"
            >
              <div className="flex items-start justify-between mb-6">
                <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-blue-600">
                  <Icon name="FileText" size={24} />
                </div>
                <span className="text-xs font-medium text-slate-400">{article.readTime}</span>
              </div>
              
              <h4 className="text-xl font-bold text-slate-900 dark:text-white mb-3 line-clamp-2">
                {article.title}
              </h4>
              <p className="text-slate-600 dark:text-slate-400 text-sm mb-6 line-clamp-3 flex-1">
                {article.description}
              </p>

              {/* Mini Insight */}
              <div className="bg-slate-50 dark:bg-slate-950 p-3 rounded-lg border border-slate-100 dark:border-slate-800 mb-6">
                <div className="flex gap-2 text-xs text-slate-500 dark:text-slate-400">
                   <Icon name="Activity" size={14} className="text-green-500 shrink-0" />
                   <span className="italic">{article.aiInsight}</span>
                </div>
              </div>

              <button className="text-sm font-bold text-blue-600 dark:text-blue-400 hover:text-blue-700 flex items-center gap-1 transition-colors">
                Read More <Icon name="ChevronRight" size={14} />
              </button>
            </div>
          ))}
        </div>

      </div>
    </section>
  );
};

export default EducationalContent;