import React, { useEffect, useState } from 'react';
import AppIcon from '../../../../components/AppIcon';
import ModalPortal from '../../../../components/ui/ModalPortal';
import { authHttp } from '../../../../utils/httpClient';
import PatientSearchPicker from '../../components/PatientSearchPicker';

const AssignStudyPatientModal = ({
    study,
    onClose,
    onAssigned,
}) => {
    const [selectedPatient, setSelectedPatient] = useState(null);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        setSelectedPatient(null);
        setSaving(false);
        setError('');
    }, [study?.id]);

    if (!study) return null;
    const hasCurrentPatient = study.patientId !== null && study.patientId !== undefined;

    const handleAssign = async () => {
        if (!selectedPatient?.id || saving) return;
        setSaving(true);
        setError('');
        try {
            const { data } = await authHttp.patch(
                `/x-core/studies/${study.id}/patient`,
                { patientId: selectedPatient.id },
            );
            onAssigned?.(data.study);
        } catch (requestError) {
            setError(
                requestError.response?.data?.error?.message
                || requestError.response?.data?.error
                || 'Patient assignment failed.',
            );
        } finally {
            setSaving(false);
        }
    };

    return (
        <ModalPortal>
            <div
                className="fixed inset-0 z-[120] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
                role="dialog"
                aria-modal="true"
                aria-labelledby="assign-xcore-patient-title"
                onClick={onClose}
            >
                <div
                    className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-3xl border border-primary/10 bg-surface p-6 shadow-2xl"
                    onClick={(event) => event.stopPropagation()}
                >
                    <div className="flex items-start justify-between gap-4">
                        <div>
                            <h3 id="assign-xcore-patient-title" className="text-xl font-bold text-primary">
                                {hasCurrentPatient ? 'Change Patient' : 'Assign Patient'}
                            </h3>
                            <p className="mt-1 text-sm text-secondary">
                                {hasCurrentPatient
                                    ? `Current: ${study.patient?.name || study.patientName || 'Patient'} · ${study.patientIdDisplay || study.realPatientId}`
                                    : 'This study is currently stored only in Gallery. Select a patient when the clinical linkage is known.'}
                            </p>
                        </div>
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={saving}
                            aria-label="Close patient assignment"
                            className="rounded-xl p-2 text-muted hover:bg-primary/5 disabled:opacity-50"
                        >
                            <AppIcon name="X" size={18} />
                        </button>
                    </div>

                    <div className="mt-5">
                        <PatientSearchPicker
                            selectedPatient={selectedPatient}
                            onSelect={setSelectedPatient}
                        />
                    </div>

                    {error && (
                        <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                            {error}
                        </div>
                    )}

                    <div className="mt-6 flex justify-end gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={saving}
                            className="rounded-xl border border-primary/15 px-4 py-2.5 text-sm font-semibold text-secondary disabled:opacity-50"
                        >
                            Cancel
                        </button>
                        <button
                            type="button"
                            onClick={handleAssign}
                            disabled={!selectedPatient?.id || saving}
                            className="inline-flex items-center gap-2 rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            {saving && <AppIcon name="Loader2" size={15} className="animate-spin" />}
                            {saving ? 'Saving…' : hasCurrentPatient ? 'Change Patient' : 'Assign Patient'}
                        </button>
                    </div>
                </div>
            </div>
        </ModalPortal>
    );
};

export default AssignStudyPatientModal;
