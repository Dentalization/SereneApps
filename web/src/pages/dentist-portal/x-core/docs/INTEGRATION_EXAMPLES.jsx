/**
 * X-Core Viewer Integration Example
 * 
 * This file demonstrates how to use the custom JPEG loader
 * in any React component for dental CBCT/X-Ray viewing.
 */

import React, { useState } from 'react';
import Viewer3D from './components/Viewer3D';
import Gallery from './components/Gallery';
import { registerXCoreLoader, registerMetadata } from '../../../../utils/cornerstone/xcoreLoader';
import { useToast } from '../../../../contexts/ToastContext';

// Initialize the custom loader once at app startup
registerXCoreLoader();

/**
 * Example: Standalone X-Core Viewer Component
 */
function XCoreViewerExample() {
    const [selectedStudy, setSelectedStudy] = useState(null);
    const toast = useToast();

    // Example study data structure
    const exampleStudy = {
        id: 'study-001',
        folderName: 'adrianhalim-rontgen', // Folder name in backend/uploads/x-core/
        patient: {
            name: 'Adrian Halim',
            id: 'P-001'
        },
        studyDate: '2026-02-13',
        modality: 'CBCT', // or '2D' for panoramic
        description: 'Dental CBCT Scan'
    };

    const handleStudySelect = async (study) => {
        // Fetch metadata from backend
        const studyKey = study.folderName || study.id;
        
        try {
            const response = await fetch(`http://127.0.0.1:8000/metadata/${studyKey}`);
            const metadata = await response.json();
            
            // Register metadata with custom loader
            registerMetadata(studyKey, metadata);
            
            // Set as selected to trigger viewer
            setSelectedStudy(study);
            
            console.log('[XCoreViewer] Study loaded:', studyKey, metadata);
        } catch (error) {
            console.error('[XCoreViewer] Failed to load study:', error);
            toast.error(`Failed to load study: ${error.message}`);
        }
    };

    return (
        <div className="xcore-viewer-container">
            {!selectedStudy ? (
                <div>
                    <h1>Select a Study</h1>
                    <Gallery onStudySelect={handleStudySelect} />
                </div>
            ) : (
                <Viewer3D 
                    study={selectedStudy} 
                    onBack={() => setSelectedStudy(null)} 
                />
            )}
        </div>
    );
}

/**
 * Example: Direct Image Loading (Advanced)
 */
async function loadAndDisplayImage() {
    const cornerstone = require('cornerstone-core');
    
    // Ensure loader is registered
    registerXCoreLoader();
    
    // Register metadata for the study
    registerMetadata('adrianhalim-rontgen', {
        pixel_spacing: 0.25,
        slice_thickness: 1.0,
        dimensions: [512, 512, 512]
    });
    
    // Enable cornerstone on an element
    const element = document.getElementById('dicom-viewer');
    cornerstone.enable(element);
    
    // Load and display image with custom xcore:// scheme
    const imageId = 'xcore://http://127.0.0.1:8000/stream/adrianhalim-rontgen/axial/256';
    
    try {
        const image = await cornerstone.loadImage(imageId);
        cornerstone.displayImage(element, image);
        
        console.log('Image loaded successfully:', {
            imageId: image.imageId,
            dimensions: `${image.width}x${image.height}`,
            pixelSpacing: image.columnPixelSpacing,
            sliceThickness: image.sliceThickness
        });
    } catch (error) {
        console.error('Failed to load image:', error);
    }
}

/**
 * Example: Measurement Tool Integration
 */
function setupMeasurementTools() {
    const cornerstone = require('cornerstone-core');
    const cornerstoneTools = require('cornerstone-tools');
    
    const element = document.getElementById('dicom-viewer');
    
    // Enable element
    cornerstone.enable(element);
    
    // Add measurement tools
    const LengthTool = cornerstoneTools.LengthTool;
    const AngleTool = cornerstoneTools.AngleTool;
    
    cornerstoneTools.addTool(LengthTool);
    cornerstoneTools.addTool(AngleTool);
    
    // Activate length tool (ruler)
    cornerstoneTools.setToolActive('Length', { mouseButtonMask: 1 });
    
    // The custom loader ensures rowPixelSpacing and columnPixelSpacing
    // are correctly set, so measurements will display in mm
    
    console.log('Measurement tools ready - units in mm');
}

/**
 * Example: Complete Integration in Existing Component
 */
class DentistPortalXCore extends React.Component {
    componentDidMount() {
        // Initialize custom loader once
        registerXCoreLoader();
    }
    
    async loadStudy(studyId) {
        // 1. Fetch metadata
        const metadata = await fetch(`http://127.0.0.1:8000/metadata/${studyId}`)
            .then(r => r.json());
        
        // 2. Register with loader
        registerMetadata(studyId, metadata);
        
        // 3. Generate image IDs
        const imageIds = Array.from({ length: metadata.num_slices }, (_, i) =>
            `xcore://http://127.0.0.1:8000/stream/${studyId}/axial/${i}`
        );
        
        // 4. Use with CornerstoneJS
        const cornerstone = require('cornerstone-core');
        const element = this.viewerRef.current;
        
        cornerstone.enable(element);
        
        // Load first image
        const image = await cornerstone.loadImage(imageIds[0]);
        cornerstone.displayImage(element, image);
        
        // Setup stack for scrolling
        const cornerstoneTools = require('cornerstone-tools');
        cornerstoneTools.addStackStateManager(element, ['stack']);
        cornerstoneTools.addToolState(element, 'stack', {
            currentImageIdIndex: 0,
            imageIds: imageIds
        });
        
        return { metadata, imageIds };
    }
    
    render() {
        return (
            <div ref={this.viewerRef} style={{ width: 512, height: 512, backgroundColor: 'black' }} />
        );
    }
}

/**
 * Testing Checklist
 * 
 * ✅ Backend running: backend/python_service/venv/bin/python backend/python_service/main.py
 * ✅ Gallery endpoint: curl http://127.0.0.1:8000/gallery/1775114002779
 * ✅ Metadata endpoint: curl http://127.0.0.1:8000/metadata/1775114002779
 * ✅ Stream endpoint: curl http://127.0.0.1:8000/stream/1775114002779/axial/0 > test.jpg
 * ✅ Headers exposed: Check X-Pixel-Spacing and X-Slice-Thickness in Network tab
 * ✅ Custom loader registered: Check console for "[xcoreLoader] X-Core image loader registered"
 * ✅ Images loading: Check console for "[useDICOMViewer] First image loaded"
 * ✅ Measurements accurate: Use ruler tool, verify mm units match expected
 * ✅ MPR views work: Switch to coronal/sagittal, verify proper aspect ratio
 */

export default XCoreViewerExample;
export { loadAndDisplayImage, setupMeasurementTools, DentistPortalXCore };
