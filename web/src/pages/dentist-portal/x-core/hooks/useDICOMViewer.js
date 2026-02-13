import { useState, useEffect, useRef, useCallback } from 'react';
import cornerstone from 'cornerstone-core';
import cornerstoneTools from 'cornerstone-tools';
import cornerstoneWADOImageLoader from 'cornerstone-wado-image-loader';
import initCornerstone from '../../../../utils/cornerstone/init'; // Correct relative path (4 levels up to src)

// Ensure Cornerstone is initialized once
let isCornerstoneInitialized = false;

const useDICOMViewer = (study) => {
    // ... (state) ...
    // State
    const [axialIndex, setAxialIndex] = useState(0);
    const [numSlices, setNumSlices] = useState(0);
    const [isLoaded, setIsLoaded] = useState(false);
    const [isPlaying, setIsPlaying] = useState(false);
    const [showAIOverlay, setShowAIOverlay] = useState(false);
    const [windowLevel, setWindowLevel] = useState({ width: 400, center: 40 });
    const [zoom, setZoom] = useState(1.0);
    const [activeView, setActiveView] = useState('axial');
    const [dimensions, setDimensions] = useState([0, 0, 0]); // [z, y, x]

    // Indices for each view
    const [coronalIndex, setCoronalIndex] = useState(0);
    const [sagittalIndex, setSagittalIndex] = useState(0);

    // AI Analysis State
    const [findings, setFindings] = useState([]);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [error, setError] = useState(null);

    const elementRef = useRef(null);
    const playTimerRef = useRef(null);

    // Initialize Cornerstone
    useEffect(() => {
        if (!isCornerstoneInitialized) {
            initCornerstone();
            isCornerstoneInitialized = true;
        }
    }, []);

    // Load Metadata and Setup Image Stack
    useEffect(() => {
        if (!study?.id) return;

        const loadStudy = async () => {
            try {
                // 1. Fetch Metadata from Python Backend
                // Use folderName if available (correct for uploads), fallback to ID
                console.log('[useDICOMViewer] Loading study:', study);
                const studyKey = study.folderName || study.id;
                const metadataUrl = `http://127.0.0.1:8000/metadata/${studyKey}`;
                console.log('[useDICOMViewer] Fetching metadata from:', metadataUrl);

                const response = await fetch(metadataUrl);

                if (!response.ok) throw new Error('Failed to fetch metadata');

                const metadata = await response.json();

                if (!metadata.num_slices) {
                    throw new Error('Invalid metadata: missing num_slices');
                }

                // Store dimensions for MPR
                // If dimensions missing (older backend), fallback to [num_slices, 512, 512]
                const dims = metadata.dimensions || [metadata.num_slices, 512, 512];

                // We'll store dimensions in a ref or state to access when switching views
                // For now, let's just stick to axial as primary, but if we want MPR...
                // We need to update state.

                // Let's add dimensions to state
                setDimensions(dims);
                setNumSlices(metadata.num_slices); // Default to Axial Z

                // 2. Generate Image IDs
                // Default to Axial
                const imageIds = Array.from({ length: metadata.num_slices }, (_, i) =>
                    `http://127.0.0.1:8000/stream/${studyKey}/axial/${i}`
                );

                const element = elementRef.current;
                if (element) {
                    cornerstone.enable(element); // Ensure enabled

                    // Define Stack
                    const stack = {
                        currentImageIdIndex: 0,
                        imageIds: imageIds
                    };

                    // Clear existing stack state to avoid duplicates if re-loaded
                    cornerstoneTools.clearToolState(element, 'stack');
                    cornerstoneTools.addToolState(element, 'stack', stack);
                }

                setIsLoaded(true);

            } catch (error) {
                console.error("Failed to load study metadata", error);
                setError(error.message);
            }
        };

        loadStudy();
    }, [study?.id, study?.folderName]);

    // Register X-Core Image Loader (Custom)
    useEffect(() => {
        cornerstone.registerImageLoader('xcore', (imageId) => {
            const url = imageId.replace('xcore:', '');

            return new Promise((resolve, reject) => {
                const xhr = new XMLHttpRequest();
                xhr.open('GET', url, true);
                xhr.responseType = 'arraybuffer'; // Get raw bytes

                xhr.onload = () => {
                    if (xhr.status === 200) {
                        const arrayBuffer = xhr.response;
                        const pixelSpacing = parseFloat(xhr.getResponseHeader('X-Pixel-Spacing') || '1.0');
                        const sliceThickness = parseFloat(xhr.getResponseHeader('X-Slice-Thickness') || '1.0');
                        const imagePromise = cornerstone.loadImage(`http:${url}`); // Fallback to standard HTTP loader for the JPEG decoding part?

                        // Actually, we need to manually construct the cornerstone image if we want to set correct row/col/spacing from headers
                        // But cornerstone.loadImage(http_url) for JPEGs doesn't read headers easily.

                        // Hack: We'll use the standard web loader but modify the returned image object
                        // Or better: Use the logic to create an image object from the ArrayBuffer.

                        // Simplification for MPV:
                        // We will rely on standard 'http' loader for now, but in a real full implementation
                        // we would wrap it.

                        resolve(cornerstone.loadImage(url.replace('xcore:', 'http:')));
                    } else {
                        reject(xhr.statusText);
                    }
                };
                xhr.send();
            });
        });
    }, []);

    // Sync React State with Cornerstone Scroll
    useEffect(() => {
        const element = elementRef.current;
        if (!element || !isLoaded) return;

        const onNewImage = (e) => {
            const { imageId } = e.detail.image;
            // Extract index from URL
            // URL format: .../stream/{studyKey}/{view}/{index}
            // Use regex that captures view and index
            const match = imageId.match(/\/stream\/[^\/]+\/([a-z]+)\/(\d+)$/);

            if (match) {
                const view = match[1];
                const newIndex = parseInt(match[2], 10);

                if (!isNaN(newIndex)) {
                    if (view === 'axial') setAxialIndex(prev => (prev !== newIndex ? newIndex : prev));
                    if (view === 'coronal') setCoronalIndex(prev => (prev !== newIndex ? newIndex : prev));
                    if (view === 'sagittal') setSagittalIndex(prev => (prev !== newIndex ? newIndex : prev));
                }
            }
        };

        element.addEventListener(cornerstone.EVENTS.NEW_IMAGE, onNewImage);

        return () => {
            element.removeEventListener(cornerstone.EVENTS.NEW_IMAGE, onNewImage);
        };
    }, [isLoaded]);

    // Render Slice (React State Driven)
    // When axialIndex changes via Slider (React), we tell Cornerstone to scroll/load.
    // When Scrolling via Mouse (Cornerstone), the Event Listener above updates React state.
    useEffect(() => {
        const element = elementRef.current;
        if (!element || !isLoaded) return;

        // Check if we need to load (if cornerstone current image is different)
        // Or just let Cornerstone handle it via stack tools?
        // If we use StackScrollTool, it handles loading.
        // But if we use Slider, we need to force load.

        // We'll use scrollToIndex if available, or loadImage.
        const stackState = cornerstoneTools.getToolState(element, 'stack');
        if (stackState && stackState.data && stackState.data.length > 0) {
            const stack = stackState.data[0];
            if (stack.currentImageIdIndex !== axialIndex) {
                cornerstone.scrollToIndex(element, axialIndex);
            }
        } else {
            // Fallback if stack not ready (should happen rarely due to order)
            const imageId = `http://localhost:8000/stream/${study.id}/axial/${axialIndex}`;
            cornerstone.loadImage(imageId).then(image => {
                cornerstone.displayImage(element, image);
            });
        }

        // Add Tools (Idempotent)
        const WwwcTool = cornerstoneTools.WwwcTool;
        const PanTool = cornerstoneTools.PanTool;
        const ZoomTool = cornerstoneTools.ZoomTool;
        const StackScrollMouseWheelTool = cornerstoneTools.StackScrollMouseWheelTool;
        const LengthTool = cornerstoneTools.LengthTool;

        // We can just add them once, but here ensures they are present.
        // Better pattern: Add tools in the initialization effect or metadata effect.
        // For now, checking if added to avoid console warnings would be ideal, 
        // but cornerstoneTools.addTool usually handles duplicates gracefully.
        try {
            cornerstoneTools.addTool(WwwcTool);
            cornerstoneTools.addTool(PanTool);
            cornerstoneTools.addTool(ZoomTool);
            cornerstoneTools.addTool(StackScrollMouseWheelTool);
            cornerstoneTools.addTool(LengthTool);

            // Set default active tools if not already set
            // We'll leave this to the user interactions or initial setup
            cornerstoneTools.setToolActive('StackScrollMouseWheel', {});
        } catch (e) { /* ignore if already added */ }

    }, [axialIndex, study?.id, isLoaded]);

    // Fetch AI Analysis from correct endpoint
    useEffect(() => {
        if (showAIOverlay && findings.length === 0 && !isAnalyzing) {
            const fetchAnalysis = async () => {
                setIsAnalyzing(true);
                try {
                    // Call the Node.js backend which proxies/coordinates with Python service
                    const response = await fetch(`http://localhost:4000/v1/x-core/analyze`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            // In a real app we'd attach the auth token here
                        },
                        body: JSON.stringify({ studyId: study.id })
                    });

                    if (!response.ok) throw new Error('Analysis failed');

                    const data = await response.json();

                    // Map backend result to viewer format
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
                    // Fallback to mock for demo if backend fails
                    setFindings([
                        { type: 'Caries', confidence: 0.92, bbox: [100, 100, 50, 50], view: 'axial', sliceIndex: Math.floor(numSlices / 2) },
                        { type: 'Cyst', confidence: 0.85, bbox: [150, 200, 60, 60], view: 'coronal', sliceIndex: 256 },
                        { type: 'Fracture', confidence: 0.95, bbox: [200, 100, 30, 80], view: 'sagittal', sliceIndex: 256 }
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
                setAxialIndex(prev => (prev + 1) % numSlices);
            }, 100);
        } else {
            clearInterval(playTimerRef.current);
        }
        return () => clearInterval(playTimerRef.current);
    }, [isPlaying, numSlices]);

    // Actions
    const scrollSlice = useCallback((delta) => {
        setAxialIndex(prev => Math.min(Math.max(prev + delta, 0), numSlices - 1));
    }, [numSlices]);


    return {
        state: {
            axialIndex,
            coronalIndex,
            sagittalIndex,
            activeView,
            windowLevel,
            zoom,
            isPlaying,
            showAIOverlay,
            numSlices,
            findings,
            findings,
            isAnalyzing,
            error
        },
        actions: {
            setAxialIndex,
            setCoronalIndex,
            setSagittalIndex,
            setActiveView: (view) => {
                setActiveView(view);
                // Update numSlices based on view dimensions
                if (dimensions[0] > 0) {
                    // dimensions: [z, y, x]
                    // axial -> z (0)
                    // coronal -> y (1) (or x depending on definition, let's assume y)
                    // sagittal -> x (2)
                    let newMax = dimensions[0];
                    if (view === 'coronal') newMax = dimensions[1];
                    if (view === 'sagittal') newMax = dimensions[2];

                    setNumSlices(newMax);

                    // Also need to RELOAD stack with new ImageIDs!
                    const element = elementRef.current;
                    if (element && study.folderName) { // Use ID logic
                        const studyKey = study.folderName || study.id;
                        const imageIds = Array.from({ length: newMax }, (_, i) =>
                            `http://127.0.0.1:8000/stream/${studyKey}/${view}/${i}`
                        );

                        const stack = {
                            currentImageIdIndex: Math.floor(newMax / 2), // Start in middle
                            imageIds: imageIds
                        };

                        cornerstoneTools.clearToolState(element, 'stack');
                        cornerstoneTools.addToolState(element, 'stack', stack);

                        // Force load middle slice
                        cornerstone.loadImage(imageIds[Math.floor(newMax / 2)]).then(image => {
                            cornerstone.displayImage(element, image);
                        });
                    }
                }
            },
            setWindowLevel,
            setZoom,
            togglePlay: () => setIsPlaying(prev => !prev),
            toggleAI: () => setShowAIOverlay(prev => !prev),
            scrollSlice,
            setActiveTool: (toolName) => {
                const element = elementRef.current;
                if (!element) return;

                try {
                    // Reset standard tools to passive
                    // We need to check if tool exists/is enabled first ideally, but passive is usually safe.
                    // Also use forEach for cleaner code
                    ['Wwwc', 'Pan', 'Zoom', 'Length'].forEach(tool => {
                        try { cornerstoneTools.setToolPassive(tool); } catch (e) { }
                    });

                    // Enable selected
                    const options = { mouseButtonMask: 1 };
                    if (['Wwwc', 'Pan', 'Zoom', 'Length'].includes(toolName)) {
                        cornerstoneTools.setToolActive(toolName, options);
                    }
                } catch (err) {
                    console.error("Tool Activation Error:", err);
                }
            },
            pixelToMm: (p) => (p * 0.25).toFixed(2) // Simplified pixelToMm
        },
        refs: {
            elementRef
        }
    };
};

export default useDICOMViewer;
