/**
 * X-Core Custom Image Loader for CornerstoneJS
 * 
 * This loader bypasses standard DICOM parsing and loads JPEG-streamed images
 * from the FastAPI backend while manually injecting clinical metadata for
 * measurement tools (ruler, angle, etc.) to work correctly.
 * 
 * Key Features:
 * - Loads JPEG images from FastAPI backend
 * - Injects pixel spacing and slice thickness from metadata cache
 * - Creates fake DICOM metadata objects for CornerstoneJS compatibility
 * - Supports MPR (Multi-Planar Reconstruction) views
 */

import cornerstone from 'cornerstone-core';

// Global metadata cache (populated by useDICOMViewer hook)
let metadataCache = {};

/**
 * Register metadata for a study to be used by the image loader
 * @param {string} studyKey - Study identifier
 * @param {object} metadata - Metadata object with pixel_spacing, slice_thickness, dimensions
 */
export function registerMetadata(studyKey, metadata) {
    metadataCache[studyKey] = metadata;
    console.log('[xcoreLoader] Registered metadata for study:', studyKey, metadata);
}

/**
 * Load an image from the backend as a JPEG and construct a CornerstoneJS Image object
 * @param {string} imageId - Image ID in format: xcore://http://127.0.0.1:8000/stream/{studyKey}/{view}/{index}
 * @returns {Object} Object with promise property (CornerstoneJS loader format)
 */
function loadImage(imageId) {
    // Extract the actual URL from the imageId
    const url = imageId.replace('xcore://', '');
    
    // Extract studyKey from URL to lookup metadata
    // URL format: http://127.0.0.1:8000/stream/{studyKey}/{view}/{index}
    const urlMatch = url.match(/\/stream\/([^\/]+)\/([^\/]+)\/(\d+)/);
    
    let studyKey = 'unknown';
    let view = 'axial';
    let sliceIndex = 0;
    
    if (urlMatch) {
        studyKey = urlMatch[1];
        view = urlMatch[2];
        sliceIndex = parseInt(urlMatch[3], 10);
    }
    
    // Get metadata from cache
    const metadata = metadataCache[studyKey] || {
        pixel_spacing: 0.25,
        slice_thickness: 1.0,
        dimensions: [512, 512, 512]
    };

    // CornerstoneJS expects an object with a 'promise' property, not a bare Promise
    const promise = new Promise((resolve, reject) => {
        const image = new Image();
        
        image.onload = () => {
            try {
                // Create an off-screen canvas to extract pixel data
                const canvas = document.createElement('canvas');
                const context = canvas.getContext('2d');
                
                canvas.width = image.width;
                canvas.height = image.height;
                context.drawImage(image, 0, 0);
                
                // Get pixel data (RGBA format)
                const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
                
                // Convert RGBA to grayscale (since medical images are typically grayscale)
                const pixelData = new Uint8Array(canvas.width * canvas.height);
                const rgbaData = imageData.data;
                
                for (let i = 0; i < pixelData.length; i++) {
                    // Use red channel (all channels should be equal for grayscale JPEG)
                    pixelData[i] = rgbaData[i * 4];
                }
                
                // Construct CornerstoneJS Image Object
                const cornerstoneImage = {
                    imageId: imageId,
                    minPixelValue: 0,
                    maxPixelValue: 255,
                    slope: 1.0,
                    intercept: 0,
                    windowCenter: 127,
                    windowWidth: 255,
                    render: cornerstone.renderGrayscaleImage,
                    getPixelData: () => pixelData,
                    rows: canvas.height,
                    columns: canvas.width,
                    height: canvas.height,
                    width: canvas.width,
                    color: false,
                    rgba: false,
                    columnPixelSpacing: metadata.pixel_spacing,
                    rowPixelSpacing: metadata.pixel_spacing,
                    sliceThickness: metadata.slice_thickness,
                    sliceLocation: sliceIndex * metadata.slice_thickness,
                    // Additional fake DICOM metadata for tools
                    data: {
                        string: (tag) => {
                            // Mock DICOM string getter
                            if (tag === 'x00200013') return String(sliceIndex); // Instance Number
                            return '';
                        },
                        intString: (tag) => {
                            if (tag === 'x00200013') return String(sliceIndex);
                            return '';
                        },
                        floatString: (tag) => {
                            if (tag === 'x00280030') return `${metadata.pixel_spacing}\\${metadata.pixel_spacing}`; // Pixel Spacing
                            if (tag === 'x00180050') return String(metadata.slice_thickness); // Slice Thickness
                            return '';
                        }
                    },
                    // Fake imagePixelModule for measurement tools
                    imagePixelModule: {
                        rows: canvas.height,
                        columns: canvas.width,
                        bitsAllocated: 8,
                        bitsStored: 8,
                        highBit: 7,
                        photometricInterpretation: 'MONOCHROME2',
                        pixelRepresentation: 0,
                        samplesPerPixel: 1,
                        planarConfiguration: 0
                    },
                    // Fake voiLutModule for windowing
                    voiLutModule: {
                        windowCenter: [127],
                        windowWidth: [255]
                    }
                };
                
                resolve(cornerstoneImage);
            } catch (error) {
                reject(new Error(`Failed to process image: ${error.message}`));
            }
        };
        
        image.onerror = (error) => {
            reject(new Error(`Failed to load image from ${url}: ${error}`));
        };
        
        // Load the image with CORS support
        image.crossOrigin = 'anonymous';
        image.src = url;
    });

    // Return object with promise property as expected by CornerstoneJS
    return {
        promise,
        cancelFn: undefined
    };
}

/**
 * Register the X-Core loader with CornerstoneJS
 */
export function registerXCoreLoader() {
    if (!cornerstone.imageLoaders || !cornerstone.imageLoaders.xcore) {
        cornerstone.registerImageLoader('xcore', loadImage);
        console.log('[xcoreLoader] X-Core image loader registered successfully');
    }
}

/**
 * Clear metadata cache (useful for cleanup or testing)
 */
export function clearMetadataCache() {
    metadataCache = {};
}

export default {
    registerXCoreLoader,
    registerMetadata,
    clearMetadataCache
};
