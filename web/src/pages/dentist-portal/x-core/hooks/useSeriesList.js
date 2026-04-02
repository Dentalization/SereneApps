import { useState, useEffect } from 'react';
import { PY_API_BASE } from '../../../../config/api';

const useSeriesList = (study) => {
    const [allSeries, setAllSeries] = useState([]);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (!study?.id) return;
        
        const studyKey = study.folderName || study.id;
        fetch(`${PY_API_BASE}/metadata/${studyKey}`)
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
    }, [study?.id, study?.folderName]);

    return { allSeries, error };
};

export default useSeriesList;
