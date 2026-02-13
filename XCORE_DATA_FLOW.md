# X-Core JPEG Loader - Data Flow Diagram

## Complete Request Lifecycle

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          1. User Opens Viewer                               │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ useDICOMViewer Hook                                                         │
│ • useEffect triggered when study prop changes                               │
│ • Calls: fetch('/metadata/adrianhalim-rontgen')                            │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ FastAPI Backend (/metadata/{studyKey})                                     │
│ • Determines handler type (Morita vs DICOM)                                 │
│ • MoritaHandler reads first BMP to get dimensions                           │
│ • Returns JSON:                                                             │
│   {                                                                         │
│     "num_slices": 512,                                                      │
│     "dimensions": [512, 512, 512],                                          │
│     "pixel_spacing": 0.25,                                                  │
│     "slice_thickness": 1.0,                                                 │
│     "modality": "CBCT"                                                      │
│   }                                                                         │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ useDICOMViewer Hook                                                         │
│ • Receives metadata                                                         │
│ • Calls: registerMetadata('adrianhalim-rontgen', metadata)                 │
│ • Saves to global cache: metadataCache['adrianhalim-rontgen'] = {...}     │
│ • Generates imageIds array:                                                 │
│   [                                                                         │
│     'xcore://http://127.0.0.1:8000/stream/adrianhalim-rontgen/axial/0',   │
│     'xcore://http://127.0.0.1:8000/stream/adrianhalim-rontgen/axial/1',   │
│     ...                                                                     │
│     'xcore://http://127.0.0.1:8000/stream/adrianhalim-rontgen/axial/511'  │
│   ]                                                                         │
│ • Loads first image: cornerstone.loadImage(imageIds[0])                    │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ xcoreLoader.js (Custom Loader)                                              │
│ • CornerstoneJS calls: loadImage('xcore://http://...')                     │
│ • Strips 'xcore://' prefix                                                  │
│ • Extracts studyKey from URL: 'adrianhalim-rontgen'                        │
│ • Looks up metadata from cache                                              │
│ • Creates HTML Image element                                                │
│ • Sets image.src = 'http://127.0.0.1:8000/stream/...'                      │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ FastAPI Backend (/stream/{studyKey}/{view}/{index})                        │
│ • MoritaHandler receives: studyKey='adrianhalim-rontgen', view='axial',   │
│                           index=0                                           │
│ • For axial: reads BMP file directly (files[0])                             │
│ • Converts to grayscale                                                     │
│ • Encodes to JPEG (quality=90)                                              │
│ • Returns Response with:                                                    │
│   - Content-Type: image/jpeg                                                │
│   - X-Pixel-Spacing: 0.25                                                   │
│   - X-Slice-Thickness: 1.0                                                  │
│   - X-View-Type: axial                                                      │
│   - X-Slice-Index: 0                                                        │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ xcoreLoader.js (Image Loaded)                                               │
│ • image.onload fires                                                        │
│ • Creates offscreen canvas (512×512)                                        │
│ • Draws image to canvas                                                     │
│ • Gets pixel data: context.getImageData()                                   │
│ • Converts RGBA → Grayscale (use red channel)                               │
│ • Constructs CornerstoneJS image object:                                    │
│   {                                                                         │
│     imageId: 'xcore://http://...',                                          │
│     width: 512,                                                             │
│     height: 512,                                                            │
│     columnPixelSpacing: 0.25,  // from metadata cache                       │
│     rowPixelSpacing: 0.25,                                                  │
│     sliceThickness: 1.0,                                                    │
│     getPixelData: () => pixelData,                                          │
│     render: cornerstone.renderGrayscaleImage,                               │
│     // ... fake DICOM metadata for tools                                    │
│   }                                                                         │
│ • Resolves Promise with image object                                        │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ CornerstoneJS Core                                                          │
│ • Receives image object                                                     │
│ • Calls: cornerstone.displayImage(element, image)                           │
│ • Renders to canvas (512×512)                                               │
│ • Applies windowing (center=127, width=255)                                 │
│ • Image appears in viewer!                                                  │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                       2. User Switches to Coronal View                      │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ useDICOMViewer.actions.setActiveView('coronal')                            │
│ • Reads dimensions[1] = 512 (Y-axis slices)                                │
│ • Generates new imageIds:                                                   │
│   [                                                                         │
│     'xcore://http://127.0.0.1:8000/stream/adrianhalim-rontgen/coronal/0', │
│     ...                                                                     │
│     'xcore://http://127.0.0.1:8000/stream/adrianhalim-rontgen/coronal/511'│
│   ]                                                                         │
│ • Loads middle slice: cornerstone.loadImage(imageIds[256])                 │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ FastAPI Backend (/stream/{studyKey}/coronal/256)                           │
│ • MoritaHandler.get_slice(view='coronal', index=256)                       │
│ • Checks if volume loaded → NO                                              │
│ • Calls _load_volume():                                                     │
│   - Reads ALL 512 BMP files                                                 │
│   - Stacks into 3D numpy array: (512, 512, 512)                             │
│   - Stores in self.volume                                                   │
│ • Slices coronal plane: pixel_array = volume[:, 256, :]                    │
│   - Result shape: (512, 512) - Z × X plane                                  │
│ • Flips vertically: pixel_array = np.flipud(pixel_array)                   │
│ • Calculates aspect ratio:                                                  │
│   aspect_ratio = 1.0 / 0.25 = 4.0                                           │
│ • Rescales Z dimension:                                                     │
│   new_height = 512 × 4.0 = 2048                                             │
│   pixel_array = cv2.resize(pixel_array, (512, 2048))                       │
│ • Encodes to JPEG                                                           │
│ • Returns with same headers                                                 │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ xcoreLoader.js → CornerstoneJS                                              │
│ • Same process as axial                                                     │
│ • BUT image is now 512×2048 (aspect ratio corrected!)                      │
│ • Teeth appear with correct proportions                                     │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                    3. User Uses Measurement Tool (Ruler)                    │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ CornerstoneTools Length Tool                                                │
│ • User draws line between two points                                        │
│ • Tool reads image.columnPixelSpacing and image.rowPixelSpacing             │
│ • Calculates:                                                               │
│   - Pixel distance: √((x2-x1)² + (y2-y1)²) = 100 pixels                    │
│   - Real distance: 100 × 0.25mm = 25mm                                      │
│ • Displays: "25.0 mm" ✓                                                     │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Metadata Flow Detail

```
Backend Metadata JSON
     │
     ├─► pixel_spacing: 0.25 ──┐
     │                          │
     ├─► slice_thickness: 1.0 ──┼─► registerMetadata() ──► metadataCache
     │                          │
     └─► dimensions: [512, 512, 512] ┘
                                      │
                                      │ When loadImage() called
                                      │
                                      ▼
                            Extract studyKey from imageId
                                      │
                                      ▼
                            Look up in metadataCache
                                      │
                                      ▼
                            Inject into Image Object
                                      │
                                      ├─► columnPixelSpacing: 0.25
                                      ├─► rowPixelSpacing: 0.25
                                      └─► sliceThickness: 1.0
                                      │
                                      ▼
                            Measurement Tools Use These! ✓
```

---

## MPR Aspect Ratio Correction Flow

```
Original BMP Stack (J. Morita CBCT)
┌────────────────────┐
│ Slice 0 (512×512)  │ ↕ 1.0mm (SliceThickness)
├────────────────────┤
│ Slice 1 (512×512)  │ ↕ 1.0mm
├────────────────────┤
│ Slice 2 (512×512)  │ ↕ 1.0mm
├────────────────────┤
│       ...          │
└────────────────────┘
  ↔ 0.25mm per pixel (PixelSpacing)

Stack into 3D Volume: (512z, 512y, 512x)
               
Coronal Slice (Z × X plane):
┌────┐
│    │ 512px high = 512mm physical height (Z-axis)
│    │
└────┘
  512px wide = 128mm physical width (X-axis)

❌ Without correction: Image is 4x too tall (squashed sideways)

Aspect Ratio Calculation:
aspect_ratio = slice_thickness / pixel_spacing = 1.0 / 0.25 = 4.0

Rescale:
new_height = 512 × 4.0 = 2048px
cv2.resize(image, (512, 2048))

Result:
┌────┐
│    │ 2048px high = 512mm physical height
│    │
│    │
│    │
└────┘
  512px wide = 128mm physical width

✅ Now displays with correct anatomical proportions!
```

---

## Error Handling Flow

```
User Opens Viewer
     │
     ▼
Fetch /metadata/{studyKey}
     │
     ├─► 200 OK ──────────────────────► Continue
     │
     ├─► 404 Not Found ───────────────► setError("Study not found")
     │                                   │
     │                                   ▼
     │                          Display Error State in UI
     │                          "Failed to Load Study"
     │                          [Retry Button]
     │
     └─► 500 Server Error ─────────────► setError("Failed to fetch metadata")
                                         │
                                         ▼
                                    Check Backend Logs
                                    • File read error?
                                    • Permission issue?
                                    • Handler crash?

Load Image (xcore://...)
     │
     ▼
xcoreLoader.loadImage()
     │
     ├─► Image loads ──────────────────► Resolve Promise → Display
     │
     ├─► CORS error ───────────────────► Check expose_headers
     │                                   │
     │                                   ▼
     │                          Network tab shows blocked
     │                          Fix: expose_headers in main.py
     │
     ├─► Image decode fails ───────────► Backend returned non-JPEG?
     │                                   │
     │                                   ▼
     │                          curl URL > test.jpg
     │                          file test.jpg
     │                          → Should be "JPEG image data"
     │
     └─► Metadata not found ───────────► registerMetadata() not called
                                         │
                                         ▼
                                    Check hook initialization
                                    useEffect dependencies
```

---

## Performance Timeline

```
Time (ms)     Event
───────────────────────────────────────────────────────────────
0             User clicks "Open Study"
              useDICOMViewer useEffect fires
              
50            fetch('/metadata/...') starts
              
150           Backend reads first BMP
              Returns JSON
              
200           registerMetadata() called
              Metadata cached in memory
              
250           Generate 512 imageIds
              
300           cornerstone.loadImage(imageIds[0])
              xcoreLoader starts loading
              
350           Backend reads BMP[0]
              Encodes to JPEG (~50ms)
              
450           JPEG received by browser
              Canvas extraction (~20ms)
              
520           Image object constructed
              Metadata injected
              
550           cornerstone.displayImage()
              Canvas rendering (~30ms)
              
600           ✓ First image visible!
              
───────────────────────────────────────────────────────────────
User switches to Coronal view
───────────────────────────────────────────────────────────────
0             setActiveView('coronal') called
              
50            Generate new imageIds
              cornerstone.loadImage(imageIds[256])
              
100           Backend receives request
              volume = None, so calls _load_volume()
              
150           Start reading 512 BMP files...
              
10,000        All files loaded (512 × ~20ms each)
              Stack into 3D numpy array
              
10,050        Slice coronal plane [:, 256, :]
              Flip and rescale (~10ms)
              
10,100        Encode to JPEG (~50ms)
              
10,200        JPEG received by browser
              Process and display (~50ms)
              
10,300        ✓ Coronal view visible!
              
───────────────────────────────────────────────────────────────
Subsequent coronal slices (volume cached)
───────────────────────────────────────────────────────────────
0             cornerstone.loadImage(imageIds[257])
              
50            Backend: volume already loaded ✓
              Slice and rescale (~10ms)
              
100           Encode to JPEG (~50ms)
              
200           Display (~50ms)
              
250           ✓ Next slice visible!
```

**Key Insight:** First coronal/sagittal view is slow (~10s) due to volume loading. 
Subsequent slices are fast (~250ms) since volume is cached.

---

## Complete File Structure

```
SereneApps/
│
├── backend/
│   └── python_service/
│       ├── main.py                              [MODIFIED] CORS headers
│       └── services/
│           ├── dicom_handler.py                 [MODIFIED] Metadata headers
│           └── morita_handler.py                [MODIFIED] 3D MPR support
│
├── web/
│   └── src/
│       ├── utils/
│       │   └── cornerstone/
│       │       └── xcoreLoader.js               [NEW] Custom loader
│       │
│       └── pages/
│           └── dentist-portal/
│               └── x-core/
│                   ├── hooks/
│                   │   └── useDICOMViewer.js    [MODIFIED] Integration
│                   ├── components/
│                   │   └── Viewer3D.jsx         [EXISTING]
│                   └── INTEGRATION_EXAMPLES.jsx [NEW] Code samples
│
├── XCORE_JPEG_LOADER_IMPLEMENTATION.md          [NEW] Full docs
├── XCORE_IMPLEMENTATION_SUMMARY.md              [NEW] Quick ref
├── XCORE_DATA_FLOW.md                           [NEW] This file
└── test-xcore-loader.sh                         [NEW] Test script
```

---

## Summary

This diagram shows the complete data flow from user interaction to rendered image, highlighting:

1. **Metadata-first approach** - Fetch calibration data before loading images
2. **Custom loader integration** - xcore:// scheme triggers custom handler
3. **Lazy volume loading** - MPR views trigger 3D reconstruction only when needed
4. **Aspect ratio correction** - Rescaling ensures anatomically correct display
5. **Measurement accuracy** - Metadata injection enables precise clinical measurements

The architecture maintains separation of concerns while ensuring clinical accuracy throughout the pipeline.
