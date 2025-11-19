import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Link } from 'react-router-dom';
import Icon from '../../../components/AppIcon';
import Image from '../../../components/AppImage';
import Button from '../../../components/ui/Button';

/** Zero-dependency rotating words */
function RotatingWords({ words, interval = 3000 }) {
  const [i, setI] = useState(0);
  const [phase, setPhase] = useState('in'); // 'in' | 'out'
  const timeoutRef = useRef(null);
  const intervalRef = useRef(null);

  const longest = useMemo(
    () => words.reduce((a, b) => (a.length >= b.length ? a : b), ''),
    [words]
  );

  useEffect(() => {
    const tick = () => {
      setPhase('out');
      timeoutRef.current = setTimeout(() => {
        setI((x) => (x + 1) % words.length);
        setPhase('in');
      }, 220); // keep in sync with transition duration
    };
    intervalRef.current = setInterval(tick, interval);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [interval, words.length]);

  return (
    <span className="relative inline-flex align-baseline">
      {/* spacer locks layout to the longest phrase so width won't jump */}
      <span aria-hidden="true" className="invisible whitespace-nowrap">
        {longest}
      </span>
      <span
        className={`absolute inset-0 transition-all duration-200 ease-out whitespace-nowrap
          ${phase === 'in' ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2'}`}
      >
        <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent dark:from-purple-400 dark:to-pink-400">
          {words[i]}
        </span>
      </span>
    </span>
  );
}

const HeroSection = () => {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const rotatingTexts = [
    'you can trust',
    'will assist you', // fixed grammar
  ];

  const demoImages = [
    {
      src: 'https://images.unsplash.com/photo-1606811841689-23dfddce3e95?w=400&h=300&fit=crop',
      alt: 'Dental X-ray showing healthy teeth structure',
      analysis:
        'Healthy dental structure detected with no visible cavities or abnormalities.',
    },
    {
      src: 'https://images.pexels.com/photos/6812540/pexels-photo-6812540.jpeg?w=400&h=300&fit=crop',
      alt: 'Close-up of dental examination',
      analysis:
        'Minor plaque buildup detected. Recommend professional cleaning within 2 weeks.',
    },
    {
      src: 'https://images.pixabay.com/photo/2020/05/18/16/17/teeth-5187256_1280.jpg?w=400&h=300&fit=crop',
      alt: 'Dental model showing tooth alignment',
      analysis:
        'Slight misalignment detected. Consider orthodontic consultation for optimal results.',
    },
  ];

  useEffect(() => {
    const id = setInterval(
      () => setCurrentImageIndex((i) => (i + 1) % demoImages.length),
      4000
    );
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleAnalysisDemo = () => {
    setIsAnalyzing(true);
    setTimeout(() => setIsAnalyzing(false), 2000);
  };

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* 1) Soft blobs (under any effects) */}
      <div className="absolute inset-0 z-0 pointer-events-none opacity-[0.03]">
        <div className="absolute top-20 left-20 w-32 h-32 bg-primary rounded-full blur-3xl" />
        <div className="absolute bottom-20 right-20 w-40 h-40 bg-accent rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-secondary rounded-full blur-3xl" />
      </div>

      {/* 2) Aurora placeholder (top 10% height) */}
      <div className="absolute top-0 left-0 right-0 h-1/10 z-[1] pointer-events-none">
        {/* <Aurora
          colorStops={['#6366F1', '#A855F7', '#EC4899']}
          blend={0.4}
          amplitude={1.2}
          speed={0.8}
        /> */}
      </div>

      {/* 3) Content */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left */}
          <div className="text-center lg:text-left space-y-8">
            <div className="space-y-4">
              <div className="inline-flex items-center space-x-2 bg-white/80 backdrop-blur-sm rounded-full px-4 py-2 shadow-brand">
                <div className="w-2 h-2 bg-trust-green rounded-full animate-pulse" />
                <span className="text-sm font-medium text-text-secondary">
                  Trusted by 50,000+ patients
                </span>
              </div>

              <h1 className="text-hero text-text-primary font-bold leading-tight">
                AI-powered dental insights{' '}
                <RotatingWords words={rotatingTexts} interval={3000} />
              </h1>

              <p className="text-value-prop text-text-secondary max-w-2xl mx-auto lg:mx-0">
                Get professional-grade dental analysis in seconds. Our YOLOv8
                computer vision technology, powered by Serene, provides accurate
                insights to help you make informed decisions about your oral
                health.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
              <Button
                variant="default"
                size="lg"
                iconName="Camera"
                iconPosition="left"
                iconSize={20}
                onClick={handleAnalysisDemo}
              >
                Try Free Analysis
              </Button>
              <Link to="/for-dentists">
                <Button
                  variant="outline"
                  size="lg"
                  className="hover-lift"
                  iconName="Stethoscope"
                  iconPosition="left"
                  iconSize={20}
                >
                  See Clinical Demo
                </Button>
              </Link>
            </div>

            <div className="flex flex-wrap items-center justify-center lg:justify-start gap-6 pt-4">
              <div className="flex items-center space-x-2">
                <Icon name="Shield" size={20} className="text-trust-green" />
                <span className="text-sm font-medium text-text-secondary">
                  HIPAA Compliant
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <Icon name="Award" size={20} className="text-accent" />
                <span className="text-sm font-medium text-text-secondary">
                  FDA Registered
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <Icon name="Users" size={20} className="text-primary" />
                <span className="text-sm font-medium text-text-secondary">
                  100,000+ Analyses
                </span>
              </div>
            </div>
          </div>

          {/* Right */}
          <div className="relative">
            <div className="bg-white rounded-2xl shadow-brand-hover p-8 border border-border">
              <div className="text-center mb-6">
                <h3 className="text-xl font-semibold text-text-primary mb-2">
                  Live AI Analysis Demo
                </h3>
                <p className="text-sm text-text-secondary">
                  Watch our AI analyze dental images in real-time
                </p>
              </div>

              <div className="relative mb-6">
                <div className="aspect-video bg-muted rounded-lg overflow-hidden border-2 border-dashed border-border">
                  <Image
                    src={demoImages[currentImageIndex].src}
                    alt={demoImages[currentImageIndex].alt}
                    className="w-full h-full object-cover transition-all duration-500"
                  />
                  {isAnalyzing && (
                    <div className="absolute inset-0 bg-primary/10 flex items-center justify-center">
                      <div className="bg-white rounded-lg p-4 shadow-brand">
                        <div className="flex items-center space-x-3">
                          <div className="animate-spin">
                            <Icon name="Brain" size={24} className="text-primary" />
                          </div>
                          <span className="text-sm font-medium text-text-primary">
                            Analyzing...
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <div className="mt-4 p-4 bg-muted rounded-lg">
                  <div className="flex items-start space-x-3">
                    <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center flex-shrink-0">
                      <Icon name="Brain" size={16} color="white" />
                    </div>
                    <div className="flex-1">
                      <h4 className="text-sm font-semibold text-text-primary mb-1">
                        AI Analysis Result
                      </h4>
                      <p className="text-sm text-text-secondary">
                        {demoImages[currentImageIndex].analysis}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex space-x-2">
                  {demoImages.map((_, index) => (
                    <button
                      key={index}
                      onClick={() => setCurrentImageIndex(index)}
                      className={`w-3 h-3 rounded-full transition-all ${
                        index === currentImageIndex ? 'bg-primary' : 'bg-border'
                      }`}
                      aria-label={`Show demo image ${index + 1}`}
                    />
                  ))}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleAnalysisDemo}
                  iconName="RotateCcw"
                  iconPosition="left"
                  iconSize={16}
                >
                  Analyze Again
                </Button>
              </div>
            </div>

            <div className="absolute -top-4 -right-4 bg-white rounded-lg shadow-brand p-4 border border-border">
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">98.7%</div>
                <div className="text-xs text-text-secondary">Accuracy Rate</div>
              </div>
            </div>

            <div className="absolute -bottom-4 -left-4 bg-white rounded-lg shadow-brand p-4 border border-border">
              <div className="text-center">
                <div className="text-2xl font-bold text-trust-green">&lt;2s</div>
                <div className="text-xs text-text-secondary">Analysis Time</div>
              </div>
            </div>
          </div>
          {/* /Right */}
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
