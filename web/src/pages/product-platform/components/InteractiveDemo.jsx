import React, { useState, useEffect } from 'react';
import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';

const InteractiveDemo = () => {
  const [selectedImage, setSelectedImage] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [analysisResult, setAnalysisResult] = useState(null);

  // DATA: Using Local Images from /public/assets/imagesTesting/
  const sampleImages = [
    {
      id: 1,
      name: "Case #1024: Caries Check",
      category: "Cavity Detection",
      url: "/assets/imagesTesting/test1.png", 
      conditions: ["Interproximal Caries", "Enamel Demineralization"],
      confidence: 94,
      risk: "High"
    },
    {
      id: 2,
      name: "Case #1025: Periodontal",
      category: "Gum Health",
      url: "/assets/imagesTesting/test2.png",
      conditions: ["Gingival Recession (3mm)", "Plaque Accumulation"],
      confidence: 89,
      risk: "Medium"
    },
    {
      id: 3,
      name: "Case #1026: Ortho",
      category: "Alignment",
      url: "/assets/imagesTesting/test3.png",
      conditions: ["Healthy Alignment", "No Malocclusion"],
      confidence: 98,
      risk: "Low"
    },
    {
      id: 4,
      name: "Case #1027: General Scan",
      category: "Routine Checkup",
      url: "/assets/imagesTesting/test4.png",
      conditions: ["Minor Staining", "Healthy Gums"],
      confidence: 92,
      risk: "Low"
    }
  ];

  // Set default selection
  useEffect(() => {
    if (!selectedImage) setSelectedImage(sampleImages[0]);
  }, []);

  const handleImageSelect = (image) => {
    if (isAnalyzing) return;
    setSelectedImage(image);
    setAnalysisResult(null);
    setProgress(0);
  };

  const handleAnalyze = () => {
    if (!selectedImage) return;
    setIsAnalyzing(true);
    setProgress(0);
    setAnalysisResult(null);

    // Simulate realistic AI processing stages
    let currentProgress = 0;
    const interval = setInterval(() => {
      currentProgress += Math.random() * 15;
      if (currentProgress > 100) {
        currentProgress = 100;
        clearInterval(interval);
        
        // Finalize
        setTimeout(() => {
          setAnalysisResult({
            ...selectedImage,
            recommendations: [
              "Schedule follow-up for detailed X-ray",
              "Apply fluoride varnish to affected areas",
              "Review hygiene protocol with patient"
            ]
          });
          setIsAnalyzing(false);
        }, 500);
      }
      setProgress(Math.min(currentProgress, 100));
    }, 300);
  };

  return (
    <section className="relative py-20 bg-slate-50 dark:bg-slate-950 overflow-hidden">
      
      {/* Background Decor */}
      <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-[0.03]" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[500px] bg-blue-500/5 rounded-full blur-[120px] pointer-events-none" />

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs font-bold uppercase tracking-wider mb-4">
            <Icon name="Activity" size={14} />
            <span>Live Demo</span>
          </div>
          <h2 className="text-3xl md:text-4xl font-bold text-slate-900 dark:text-white mb-4">
            Try the Diagnostic Engine
          </h2>
          <p className="text-lg text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
            Select a case file to see how Serene AI identifies pathologies in real-time.
          </p>
        </div>

        <div className="grid lg:grid-cols-12 gap-8 items-start">
          
          {/* LEFT: Case Selection (4 cols) */}
          <div className="lg:col-span-4 space-y-6">
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-sm border border-slate-200 dark:border-slate-800">
              <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4">Select Case File</h3>
              
              <div className="space-y-3">
                {sampleImages.map((image) => (
                  <button
                    key={image.id}
                    onClick={() => handleImageSelect(image)}
                    disabled={isAnalyzing}
                    className={`w-full flex items-center gap-4 p-3 rounded-xl border transition-all duration-200 text-left group ${
                      selectedImage?.id === image.id
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 ring-1 ring-blue-500'
                        : 'border-slate-200 dark:border-slate-800 hover:border-blue-300 dark:hover:border-slate-600 bg-white dark:bg-slate-900'
                    }`}
                  >
                    <div className="w-16 h-16 rounded-lg overflow-hidden flex-shrink-0 bg-slate-200">
                      <img src={image.url} alt={image.name} className="w-full h-full object-cover" />
                    </div>
                    <div>
                      <div className={`font-semibold text-sm ${selectedImage?.id === image.id ? 'text-blue-700 dark:text-blue-400' : 'text-slate-700 dark:text-slate-200'}`}>
                        {image.name}
                      </div>
                      <div className="text-xs text-slate-500 mt-1">{image.category}</div>
                    </div>
                    {selectedImage?.id === image.id && (
                      <div className="ml-auto text-blue-500">
                        <Icon name="CheckCircle" size={20} />
                      </div>
                    )}
                  </button>
                ))}
              </div>

              {/* Upload Placeholder */}
              <div className="mt-6 pt-6 border-t border-slate-100 dark:border-slate-800">
                <button className="w-full border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-xl p-4 flex flex-col items-center justify-center text-slate-500 hover:text-blue-500 hover:border-blue-400 transition-colors">
                  <Icon name="UploadCloud" size={24} className="mb-2" />
                  <span className="text-xs font-medium">Upload your own X-Ray</span>
                </button>
              </div>
            </div>
          </div>

          {/* RIGHT: Analysis Console (8 cols) */}
          <div className="lg:col-span-8">
            <div className="bg-slate-900 rounded-2xl border border-slate-800 shadow-2xl overflow-hidden min-h-[600px] flex flex-col">
              
              {/* Console Toolbar */}
              <div className="bg-slate-950 p-4 border-b border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-red-500" />
                    <div className="w-3 h-3 rounded-full bg-yellow-500" />
                    <div className="w-3 h-3 rounded-full bg-green-500" />
                  </div>
                  <span className="text-xs font-mono text-slate-400 ml-2">
                    {selectedImage ? `Analyzing: ${selectedImage.name}` : 'Ready'}
                  </span>
                </div>
                
                {isAnalyzing ? (
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono text-blue-400 animate-pulse">Processing... {Math.round(progress)}%</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                    <span className="text-xs font-mono text-slate-400">System Idle</span>
                  </div>
                )}
              </div>

              {/* Main Visual Area */}
              <div className="relative flex-1 bg-black flex items-center justify-center overflow-hidden group">
                {selectedImage ? (
                  <>
                    <img 
                      src={selectedImage.url} 
                      alt="Analysis Target" 
                      className={`max-h-[400px] w-auto rounded-lg transition-all duration-500 ${isAnalyzing ? 'opacity-60 blur-[1px]' : 'opacity-100'}`}
                      onError={(e) => {
                        e.target.onerror = null;
                        e.target.src = "https://via.placeholder.com/800x600/1e293b/475569?text=Image+Not+Found";
                      }}
                    />
                    
                    {/* Scanning Laser Effect */}
                    {isAnalyzing && (
                      <div className="absolute inset-0 z-10">
                        <div className="absolute top-0 left-0 w-full h-[2px] bg-blue-500 shadow-[0_0_20px_rgba(59,130,246,1)] animate-[scan_2s_ease-in-out_infinite]" />
                        <div className="absolute inset-0 bg-blue-500/10 animate-pulse" />
                      </div>
                    )}

                    {/* Bounding Box Overlay (Simulated) - Show after analysis */}
                    {analysisResult && !isAnalyzing && (
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <div className="w-64 h-48 border-2 border-red-500/70 rounded-lg relative animate-in zoom-in duration-500">
                          <div className="absolute -top-3 -right-3 bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded">
                            {analysisResult.conditions[0]}
                          </div>
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="text-slate-600 flex flex-col items-center">
                    <Icon name="Image" size={48} className="mb-2" />
                    <p>No image selected</p>
                  </div>
                )}
              </div>

              {/* Action / Result Panel */}
              <div className="bg-slate-900 p-6 border-t border-slate-800">
                {!analysisResult && !isAnalyzing && (
                  <div className="flex items-center justify-between">
                    <div className="text-slate-400 text-sm">
                      Select an image from the left to begin analysis.
                    </div>
                    <Button 
                      onClick={handleAnalyze} 
                      className="bg-blue-600 hover:bg-blue-500 text-white border-none shadow-[0_0_20px_rgba(37,99,235,0.3)]"
                      iconName="Zap"
                      iconPosition="left"
                    >
                      Run Analysis
                    </Button>
                  </div>
                )}

                {isAnalyzing && (
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs font-mono text-slate-400">
                      <span>Inference Engine (YOLOv8)</span>
                      <span>{Math.round(progress)}%</span>
                    </div>
                    <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-blue-500 transition-all duration-100 ease-out" 
                        style={{ width: `${progress}%` }} 
                      />
                    </div>
                  </div>
                )}

                {analysisResult && !isAnalyzing && (
                  <div className="animate-in slide-in-from-bottom-4 duration-500">
                    <div className="grid grid-cols-3 gap-6 mb-6">
                      <div className="bg-slate-800/50 rounded-xl p-3 border border-slate-700">
                        <div className="text-xs text-slate-400 uppercase tracking-wider mb-1">Confidence</div>
                        <div className="text-2xl font-bold text-green-400">{analysisResult.confidence}%</div>
                      </div>
                      <div className="bg-slate-800/50 rounded-xl p-3 border border-slate-700">
                        <div className="text-xs text-slate-400 uppercase tracking-wider mb-1">Findings</div>
                        <div className="text-2xl font-bold text-white">{analysisResult.conditions.length}</div>
                      </div>
                      <div className="bg-slate-800/50 rounded-xl p-3 border border-slate-700">
                        <div className="text-xs text-slate-400 uppercase tracking-wider mb-1">Risk Level</div>
                        <div className={`text-2xl font-bold ${
                          analysisResult.risk === 'High' ? 'text-red-400' : 
                          analysisResult.risk === 'Medium' ? 'text-yellow-400' : 'text-blue-400'
                        }`}>
                          {analysisResult.risk}
                        </div>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <h4 className="text-sm font-bold text-white flex items-center gap-2">
                        <Icon name="Brain" size={16} className="text-purple-400" />
                        AI Insights
                      </h4>
                      {analysisResult.conditions.map((condition, idx) => (
                        <div key={idx} className="flex items-center gap-3 text-sm text-slate-300 bg-slate-800/30 p-2 rounded-lg">
                          <Icon name="AlertTriangle" size={14} className="text-yellow-500" />
                          {condition}
                        </div>
                      ))}
                    </div>
                    
                    <div className="mt-6 flex justify-end">
                       <button 
                         onClick={handleAnalyze} 
                         className="text-xs text-slate-500 hover:text-white transition-colors flex items-center gap-1"
                       >
                         <Icon name="RotateCcw" size={12} /> Reset Demo
                       </button>
                    </div>
                  </div>
                )}
              </div>

            </div>
          </div>

        </div>
      </div>

      {/* Styles for Laser Animation */}
      <style>{`
        @keyframes scan {
          0% { top: 0%; opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { top: 100%; opacity: 0; }
        }
      `}</style>
    </section>
  );
};

export default InteractiveDemo;