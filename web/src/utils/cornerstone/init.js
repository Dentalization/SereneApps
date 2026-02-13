
import cornerstone from 'cornerstone-core';
import cornerstoneTools from 'cornerstone-tools';
import cornerstoneMath from 'cornerstone-math';
import cornerstoneWADOImageLoader from 'cornerstone-wado-image-loader';
import dicomParser from 'dicom-parser';
import Hammer from 'hammerjs';

export default function initCornerstone() {
    // External dependencies
    cornerstoneTools.external.cornerstone = cornerstone;
    cornerstoneTools.external.cornerstoneMath = cornerstoneMath;
    cornerstoneTools.external.Hammer = Hammer;
    cornerstoneWADOImageLoader.external.cornerstone = cornerstone;
    cornerstoneWADOImageLoader.external.dicomParser = dicomParser;

    // Image Loader Configuration
    cornerstoneWADOImageLoader.webWorkerManager.initialize({
        maxWebWorkers: navigator.hardwareConcurrency || 1,
        startWebWorkersOnDemand: true,
        taskConfiguration: {
            decodeTask: {
                initializeCodecsOnStartup: false,
                usePDFJS: false,
                strict: false,
            },
        },
        webWorkerPath: '/cornerstoneWADOImageLoaderWebWorker.min.js',
        webWorkerTaskPaths: [],
    });

    // Initialize Tools
    cornerstoneTools.init({
        showSVGCursors: true,
        globalToolSyncEnabled: true,
    });

    // Preferences
    const fontFamily =
        'Work Sans, Roboto, OpenSans, HelveticaNeue-Light, Helvetica Neue Light, Helvetica Neue, Helvetica, Arial, Lucida Grande, sans-serif';

    cornerstoneTools.textStyle.setFont(`16px ${fontFamily}`);
    cornerstoneTools.toolStyle.setToolWidth(2);
    cornerstoneTools.toolColors.setToolColor('rgb(255, 255, 0)');
    cornerstoneTools.toolColors.setActiveColor('rgb(0, 255, 0)');
}
