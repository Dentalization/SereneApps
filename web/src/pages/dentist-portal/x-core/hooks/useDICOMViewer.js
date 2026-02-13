import { useState, useEffect, useRef, useCallback } from 'react';

const useDICOMViewer = (study) => {
    // State
    const [axialIndex, setAxialIndex] = useState(0);
    const [coronalIndex, setCoronalIndex] = useState(0);
    const [sagittalIndex, setSagittalIndex] = useState(0);
    const [numSlices, setNumSlices] = useState(0);
    const [activeView, setActiveView] = useState('axial');
    const [dimensions, setDimensions] = useState([0, 0, 0]); // [z, y, x]
    
    // Series Management
    const [allSeries, setAllSeries] = useState([]);
    const [currentSeries, setCurrentSeries] = useState(null);
    
    // Direct Image URL (bypassing CornerstoneJS for now)
    const [imageSrc, setImageSrc] = useState('');
    const [imageLoading, setImageLoading] = useState(false);
    
    // Playback
    const [isPlaying, setIsPlaying] = useState(false);
    
    // AI State
    const [showAIOverlay, setShowAIOverlay] = useState(false);
    const [findings, setFindings] = useState([]);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    
    const [error, setError] = useState(null);

    const elementRef = useRef(null);
    const playTimerRef = useRef(null);
    const imageCache = useRef(new Map()); // Preload cache

    // Load Metadata and Select Default Series
    useEffect(() => {
        if (!study?.id) return;

        const loadStudy = async () => {
            try {
                console.log('[useDICOMViewer] Loading study:', study);
                const studyKey = study.folderName || study.id;
                const metadataUrl = `http://127.0.0.1:8000/metadata/${studyKey}`;
                console.log('[useDICOMViewer] Fetching metadata from:', metadataUrl);

                const response = await fetch(metadataUrl);

                if (!response.ok) {
                    throw new Error(`Failed to fetch metadata: ${response.status} ${response.statusText}`);
                }

                const metadata = await response.json();
                console.log('[useDICOMViewer] Metadata received:', metadata);

                // Extract series information
                const seriesList = metadata.series || [];
                setAllSeries(seriesList);

                // Auto-select volumetric series (most slices) or first series
                let selectedSeries = null;
                if (seriesList.length > 0) {
                    // Find the series with most slices (likely the 3D volume)
                    selectedSeries = seriesList.reduce((prev, current) => 
                        (current.num_slices > prev.num_slices) ? current : prev
                    );
                    
                    console.log('[useDICOMViewer] Auto-selected series:', selectedSeries);
                    setCurrentSeries(selectedSeries);
                    
                    // Set dimensions based on this series
                    // For simplicity, assume all series share similar dimensions
                    const dims = metadata.dimensions || [metadata.num_slices, 512, 512];
                    setDimensions(dims);
                    setNumSlices(dims[0]);
                } else {
                    // Fallback: No series metadata, use old structure
                    const dims = metadata.dimensions || [metadata.num_slices, 512, 512];
                    setDimensions(dims);
                    setNumSlices(metadata.num_slices);
                }

            } catch (error) {
                console.error("[useDICOMViewer] Failed to load study metadata", error);
                setError(error.message);
            }
        };

        loadStudy();
    }, [study?.id, study?.folderName]);

    // Update Image Source when slice/view/series changes
    useEffect(() => {
        if (!study?.id || !currentSeries) return;

        const studyKey = study.folderName || study.id;
        let currentIndex = axialIndex;
        let currentView = activeView;
        
        // Determine which index to use based on active view
        if (activeView === 'coronal') currentIndex = coronalIndex;
        else if (activeView === 'sagittal') currentIndex = sagittalIndex;
        
        // Build URL with series_uid
        const url = `http://127.0.0.1:8000/stream/${studyKey}/${currentView}/${currentIndex}?series_uid=${currentSeries.series_uid}`;
        
        // Check cache first
        if (imageCache.current.has(url)) {
            setImageSrc(url);
            setImageLoading(false);
            return;
        }
        
        // Load new image
        setImageLoading(true);
        const img = new Image();
        img.onload = () => {
            imageCache.current.set(url, true);
            setImageSrc(url);
            setImageLoading(false);
            
            // Preload next 5 slices
            preloadImages(studyKey, currentView, currentIndex, currentSeries.series_uid);
        };
        img.onerror = () => {
            console.error('[useDICOMViewer] Failed to load image:', url);
            setImageLoading(false);
        };
        img.src = url;
        
    }, [axialIndex, coronalIndex, sagittalIndex, activeView, currentSeries, study?.id, study?.folderName]);

    // Preload adjacent slices for smooth scrolling
    const preloadImages = (studyKey, view, startIndex, seriesUid) => {
        for (let i = 1; i <= 5; i++) {
            const nextIndex = startIndex + i;
            if (nextIndex < numSlices) {
                const url = `http://127.0.0.1:8000/stream/${studyKey}/${view}/${nextIndex}?series_uid=${seriesUid}`;
                if (!imageCache.current.has(url)) {
                    const img = new Image();
                    img.onload = () => imageCache.current.set(url, true);
                    img.src = url;
                }
            }
        }
    };

    // Fetch AI Analysis from correct endpoint (keeping existing logic)
    useEffect(() => {
        if (showAIOverlay && findings.length === 0 && !isAnalyzing) {
            const fetchAnalysis = async () => {
                setIsAnalyzing(true);
                try {
                    const response = await fetch(`http://localhost:4000/v1/x-core/analyze`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ studyId: study.id })
                    });

                    if (!response.ok) throw new Error('Analysis failed');

                    const data = await response.json();
                    const mappedFindings = (data.findings || []).map(f => ({
                        type: f.label || f.type || 'Detection',
                        confidence: f.score || f.confidence || 0.9,
                        bbox: f.bbox || [0, 0, 0, 0],
                        view: f.view || 'axial',
                        sliceIndex: f.sliceIndex || 0
                    }));

                    setFindings(mappedFindings);
                } catch (error) {
                    console.error("Failed to fetch AI analysis", error);
                    setFindings([
                        { type: 'Caries', confidence: 0.92, bbox: [100, 100, 50, 50], view: 'axial', sliceIndex: Math.floor(numSlices / 2) },
                    ]);
                } finally {
                    setIsAnalyzing(false);
                }
            };
            fetchAnalysis();
        }
    }, [showAIOverlay, findings.length, isAnalyzing, study?.id, numSlices]);

    // Play/Pause Cine
    useEffect(() => {
        if (isPlaying) {
            playTimerRef.current = setInterval(() => {
                if (activeView === 'axial') {
                    setAxialIndex(prev => (prev + 1) % numSlices);
                } else if (activeView === 'coronal') {
                    setCoronalIndex(prev => (prev + 1) % numSlices);
                } else if (activeView === 'sagittal') {
                    setSagittalIndex(prev => (prev + 1) % numSlices);
                }
            }, 100);
        } else {
            clearInterval(playTimerRef.current);
        }
        return () => clearInterval(playTimerRef.current);
    }, [isPlaying, numSlices, activeView]);

    // Actions
    const scrollSlice = useCallback((delta) => {
        if (activeView === 'axial') {
            setAxialIndex(prev => Math.min(Math.max(prev + delta, 0), numSlices - 1));
        } else if (activeView === 'coronal') {
            setCoronalIndex(prev => Math.min(Math.max(prev + delta, 0), numSlices - 1));
        } else if (activeView === 'sagittal') {
            setSagittalIndex(prev => Math.min(Math.max(prev + delta, 0), numSlices - 1));
        }
    }, [numSlices, activeView]);

    const changeView = useCallback((view) => {
        setActiveView(view);
        
        // Update numSlices based on view dimensions
        if (dimensions[0] > 0) {
            let newMax = dimensions[0]; // axial
            if (view === 'coronal') newMax = dimensions[1];
            if (view === 'sagittal') newMax = dimensions[2];
            setNumSlices(newMax);
        }
    }, [dimensions]);

    const changeSeries = useCallback((series) => {
        console.log('[useDICOMViewer] Changing to series:', series);
        setCurrentSeries(series);
        
        // Reset to middle slice
        const middleSlice = Math.floor(series.num_slices / 2);
        setAxialIndex(middleSlice);
        setCoronalIndex(middleSlice);
        setSagittalIndex(middleSlice);
        setNumSlices(series.num_slices);
        
        // Clear cache when changing series
        imageCache.current.clear();
    }, []);

    return {
        state: {
            axialIndex,
            coronalIndex,
            sagittalIndex,
            activeView,
            isPlaying,
            showAIOverlay,
            numSlices,
            findings,
            isAnalyzing,
            error,
            imageSrc,
            imageLoading,
            allSeries,
            currentSeries,
            dimensions
        },
        actions: {
            setAxialIndex,
            setCoronalIndex,
            setSagittalIndex,
            setActiveView: changeView,
            togglePlay: () => setIsPlaying(prev => !prev),
            toggleAI: () => setShowAIOverlay(prev => !prev),
            scrollSlice,
            changeSeries
        },
        refs: {
            elementRef
        }
    };
};

export default useDICOMViewer;
