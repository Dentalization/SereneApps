import React, { useEffect, useState, useCallback } from 'react';
import useDICOMViewer from '../hooks/useDICOMViewer';
import VolumeViewer3D from './VolumeViewer3D';
import ImageViewer2D from './ImageViewer2D';
import SliceViewer from './SliceViewer';
import SeriesSidebar from './SeriesSidebar';

const Viewer3D = ({ study, onBack }) => {
    const [activeStudy, setActiveStudy] = useState(study);
    const { state } = useDICOMViewer(activeStudy);
    const [showSeriesSelector, setShowSeriesSelector] = useState(false);
    const [viewMode, setViewMode] = useState('auto'); // 'auto', '3d', 'slice', '2d'

    // Handle series switching from any viewer component
    const handleSwitchSeries = useCallback((series) => {
        const newStudy = {
            ...activeStudy,
            selectedSeriesUid: series.series_uid,
            selectedSeriesType: series.type,
        };
        setActiveStudy(newStudy);
        // Set view mode based on new series type
        if (series.type === '3D Volume') {
            setViewMode('3d');
        } else {
            setViewMode('2d');
        }
    }, [activeStudy]);

    // Determine initial view mode based on series type
    useEffect(() => {
        if (activeStudy?.selectedSeriesType === '3D Volume') {
            setViewMode('3d'); // 3D First for volumetric series
        } else if (activeStudy?.selectedSeriesType === '2D Image') {
            setViewMode('2d'); // Dedicated 2D viewer for panoramic/ceph
        } else {
            setViewMode('slice'); // Fallback to slice view
        }
    }, [activeStudy?.selectedSeriesType, activeStudy?.selectedSeriesUid]);

    // Conditional rendering: If 3D mode and volumetric series, show VolumeViewer3D
    if (viewMode === '3d' && activeStudy?.selectedSeriesType === '3D Volume') {
        return (
            <VolumeViewer3D
                study={activeStudy}
                onBack={onBack}
                onSwitchToSliceMode={() => setViewMode('slice')}
                onSwitchSeries={handleSwitchSeries}
            />
        );
    }

    // 2D Image mode — show ImageViewer2D for panoramic/cephalometric/single-slice
    if (viewMode === '2d') {
        const seriesInfo = state.allSeries.find(s => s.series_uid === activeStudy?.selectedSeriesUid) || {
            series_uid: activeStudy?.selectedSeriesUid,
            series_description: 'Panoramic Image',
            modality: 'OPG',
        };
        return (
            <div className="relative h-full">
                <ImageViewer2D
                    study={activeStudy}
                    seriesInfo={seriesInfo}
                    onBack={onBack}
                    onSwitchSeries={() => setShowSeriesSelector(prev => !prev)}
                />
                <SeriesSidebar
                    study={activeStudy}
                    currentSeriesUid={activeStudy?.selectedSeriesUid}
                    onSelectSeries={(series) => {
                        setShowSeriesSelector(false);
                        handleSwitchSeries(series);
                    }}
                    visible={showSeriesSelector}
                    onClose={() => setShowSeriesSelector(false)}
                    position="right"
                />
            </div>
        );
    }

    // Slice viewer — VTK.js MPR, reuses cached volume from window.__volumeCache
    return (
        <SliceViewer
            study={activeStudy}
            onBack={onBack}
            onSwitchTo3D={() => setViewMode('3d')}
            onSwitchSeries={handleSwitchSeries}
        />
    );
};

export default Viewer3D;
