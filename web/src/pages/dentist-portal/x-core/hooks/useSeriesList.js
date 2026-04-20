import { useState, useEffect } from 'react';
import { buildImagingUrl, buildStudyAssetParams } from '../utils/imagingUrl';

const useSeriesList = (study) => {
    const [allSeries, setAllSeries] = useState([]);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (Array.isArray(study?.series) && study.series.length > 0) {
            setAllSeries(study.series);
            setError(null);
            return;
        }

        if (!study?.id && !study?.folderName) return;
        
        const studyKey = study.folderName || study.id;
        fetch(buildImagingUrl(`/metadata/${studyKey}`, buildStudyAssetParams(study)))
            .then(r => {
                if (!r.ok) throw new Error(r.statusText);
                return r.json();
            })
            .then(data => {
                setAllSeries(data.series || []);
            })
            .catch(e => {
                console.error("[useSeriesList] Failed to load study metadata", e);
                setError(String(e));
            });
    }, [study?.id, study?.folderName, study?.shareToken, study?.series]);

    return { allSeries, error };
};

export default useSeriesList;
