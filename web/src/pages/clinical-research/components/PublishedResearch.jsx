import React, { useState } from 'react';
import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';

const PublishedResearch = () => {
  const [activeCategory, setActiveCategory] = useState('all');

  const categories = [
    { id: 'all', name: 'All Research', count: 15 },
    { id: 'caries', name: 'Caries Detection', count: 6 },
    { id: 'periodontal', name: 'Periodontal', count: 4 },
    { id: 'pathology', name: 'Oral Pathology', count: 3 },
    { id: 'orthodontic', name: 'Orthodontic', count: 2 }
  ];

  const publications = [
    {
      id: 1,
      title: "Deep Learning-Based Automated Caries Detection in Dental Radiographs: A Multi-Center Clinical Trial",
      authors: "Dr. Sarah Chen, Dr. Michael Rodriguez, Dr. Lisa Wang, et al.",
      journal: "Journal of Dental Research",
      year: 2023,
      impact: 4.8,
      category: 'caries',
      status: 'published',
      citations: 127,
      doi: "10.1177/00220345231234567",
      abstract: `This multi-center clinical trial evaluated the diagnostic accuracy of a deep learning algorithm for automated caries detection in dental radiographs. The study included 2,847 patients across 12 dental practices, comparing AI-assisted diagnosis with traditional methods. Results demonstrated 96.2% accuracy in caries detection with significantly reduced diagnostic time.`,
      keyFindings: [
        "96.2% diagnostic accuracy for caries detection",
        "85% reduction in diagnostic time",
        "Consistent performance across different radiographic systems",
        "High inter-observer agreement (κ = 0.92)"
      ],
      downloadUrl: "#"
    },
    {
      id: 2,
      title: "AI-Powered Periodontal Disease Assessment: Validation Study in Clinical Practice",
      authors: "Dr. James Thompson, Dr. Maria Garcia, Dr. David Kim, et al.",
      journal: "Periodontology 2000",
      year: 2023,
      impact: 5.2,
      category: 'periodontal',
      status: 'published',
      citations: 89,
      doi: "10.1111/prd.12456",
      abstract: `A comprehensive validation study assessing the clinical utility of AI-powered periodontal disease assessment tools. The research involved 1,543 patients and demonstrated superior accuracy in staging and grading periodontal conditions compared to traditional clinical examination alone.`,
      keyFindings: [
        "93.8% accuracy in periodontal staging",
        "Improved early detection of disease progression",
        "Enhanced treatment planning precision",
        "Reduced need for specialist referrals by 34%"
      ],
      downloadUrl: "#"
    },
    {
      id: 3,
      title: "Machine Learning Approaches for Oral Pathology Screening: A Systematic Review and Meta-Analysis",
      authors: "Dr. Emily Foster, Dr. Robert Chang, Dr. Anna Petrov, et al.",
      journal: "Oral Oncology",
      year: 2023,
      impact: 6.1,
      category: 'pathology',
      status: 'published',
      citations: 156,
      doi: "10.1016/j.oraloncology.2023.106234",
      abstract: `A systematic review and meta-analysis of machine learning approaches for oral pathology screening. This comprehensive analysis evaluated 47 studies and established benchmarks for AI-assisted oral cancer and precancer detection, highlighting the potential for early intervention.`,
      keyFindings: [
        "91.5% pooled sensitivity for malignant lesion detection",
        "94.2% specificity in distinguishing benign from malignant",
        "Significant improvement in early-stage detection",
        "Cost-effective screening implementation"
      ],
      downloadUrl: "#"
    },
    {
      id: 4,
      title: "Automated Orthodontic Analysis Using Computer Vision: Clinical Validation and Treatment Planning Integration",
      authors: "Dr. Kevin Liu, Dr. Sophie Anderson, Dr. Mark Johnson, et al.",
      journal: "American Journal of Orthodontics",
      year: 2023,
      impact: 3.9,
      category: 'orthodontic',
      status: 'published',
      citations: 73,
      doi: "10.1016/j.ajodo.2023.03.012",
      abstract: `Clinical validation of automated orthodontic analysis using computer vision technology. The study evaluated treatment planning accuracy and efficiency improvements in orthodontic practice, demonstrating significant benefits for both practitioners and patients.`,
      keyFindings: [
        "88.9% accuracy in malocclusion classification",
        "67% reduction in treatment planning time",
        "Improved patient communication and understanding",
        "Enhanced treatment outcome predictability"
      ],
      downloadUrl: "#"
    },
    {
      id: 5,
      title: "Comparative Analysis of AI Diagnostic Tools vs. Specialist Diagnosis in Dental Practice",
      authors: "Dr. Rachel Green, Dr. Thomas Wilson, Dr. Jennifer Lee, et al.",
      journal: "Clinical Oral Investigations",
      year: 2024,
      impact: 4.3,
      category: 'all',
      status: 'in-press',
      citations: 0,
      doi: "10.1007/s00784-024-05123",
      abstract: `A comprehensive comparative study evaluating AI diagnostic tools against specialist diagnosis across multiple dental conditions. This research provides evidence for the clinical utility and reliability of AI-assisted dental diagnosis in routine practice.`,
      keyFindings: [
        "94.7% concordance with specialist diagnosis",
        "Significant improvement in diagnostic confidence",
        "Reduced diagnostic variability between practitioners",
        "Enhanced patient satisfaction scores"
      ],
      downloadUrl: "#"
    }
  ];

  const filteredPublications = activeCategory === 'all' 
    ? publications 
    : publications?.filter(pub => pub?.category === activeCategory);

  return (
    <section className="py-20 bg-muted">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center space-x-2 bg-primary/10 text-primary px-4 py-2 rounded-full text-sm font-medium mb-4">
            <Icon name="BookOpen" size={16} />
            <span>Published Research</span>
          </div>
          <h2 className="text-4xl font-bold text-text-primary mb-4">
            Peer-Reviewed Publications
          </h2>
          <p className="text-xl text-text-secondary max-w-3xl mx-auto">
            Our research is published in leading dental and medical journals, establishing scientific credibility and advancing the field of AI-powered dental diagnostics.
          </p>
        </div>

        {/* Category Filter */}
        <div className="flex flex-wrap justify-center gap-3 mb-12">
          {categories?.map((category) => (
            <button
              key={category?.id}
              onClick={() => setActiveCategory(category?.id)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
                activeCategory === category?.id
                  ? 'bg-primary text-primary-foreground shadow-brand'
                  : 'bg-white text-text-secondary hover:bg-primary/10 hover:text-primary border border-border'
              }`}
            >
              {category?.name}
              <span className="ml-2 text-xs opacity-75">({category?.count})</span>
            </button>
          ))}
        </div>

        {/* Publications Grid */}
        <div className="space-y-8">
          {filteredPublications?.map((publication) => (
            <div key={publication?.id} className="bg-white rounded-xl p-8 border border-border hover-lift shadow-brand">
              <div className="grid lg:grid-cols-3 gap-8">
                {/* Main Content */}
                <div className="lg:col-span-2 space-y-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          publication?.status === 'published' ?'bg-success/10 text-success' :'bg-warning/10 text-warning'
                        }`}>
                          {publication?.status === 'published' ? 'Published' : 'In Press'}
                        </span>
                        <span className="text-sm text-text-secondary">
                          {publication?.year}
                        </span>
                      </div>
                      
                      <h3 className="text-xl font-bold text-text-primary mb-2 leading-tight">
                        {publication?.title}
                      </h3>
                      
                      <p className="text-text-secondary mb-3">
                        {publication?.authors}
                      </p>
                      
                      <div className="flex items-center space-x-4 text-sm text-text-secondary mb-4">
                        <span className="font-medium text-primary">
                          {publication?.journal}
                        </span>
                        <span>Impact Factor: {publication?.impact}</span>
                        <span>Citations: {publication?.citations}</span>
                      </div>
                    </div>
                  </div>
                  
                  <p className="text-text-secondary leading-relaxed">
                    {publication?.abstract}
                  </p>
                  
                  <div className="flex flex-wrap gap-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      iconName="Download"
                      iconPosition="left"
                    >
                      Download PDF
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      iconName="ExternalLink"
                      iconPosition="right"
                    >
                      View DOI
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      iconName="Quote"
                      iconPosition="left"
                    >
                      Cite
                    </Button>
                  </div>
                </div>
                
                {/* Key Findings */}
                <div className="bg-muted rounded-lg p-6">
                  <h4 className="font-semibold text-text-primary mb-4 flex items-center">
                    <Icon name="TrendingUp" size={18} className="mr-2" />
                    Key Findings
                  </h4>
                  <ul className="space-y-3">
                    {publication?.keyFindings?.map((finding, index) => (
                      <li key={index} className="flex items-start space-x-2 text-sm">
                        <Icon name="CheckCircle" size={16} className="text-success mt-0.5 flex-shrink-0" />
                        <span className="text-text-secondary">{finding}</span>
                      </li>
                    ))}
                  </ul>
                  
                  <div className="mt-6 pt-4 border-t border-border">
                    <div className="text-xs text-text-secondary">
                      DOI: {publication?.doi}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Research Stats */}
        <div className="mt-16 bg-white rounded-2xl p-8 border border-border">
          <div className="grid md:grid-cols-4 gap-8 text-center">
            <div>
              <div className="text-3xl font-bold text-primary mb-2">15+</div>
              <div className="text-text-secondary">Published Papers</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-primary mb-2">450+</div>
              <div className="text-text-secondary">Total Citations</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-primary mb-2">4.9</div>
              <div className="text-text-secondary">Avg Impact Factor</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-primary mb-2">8</div>
              <div className="text-text-secondary">Journal Partners</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default PublishedResearch;