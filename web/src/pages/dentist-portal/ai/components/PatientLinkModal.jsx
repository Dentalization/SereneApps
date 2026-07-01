import React, { useEffect, useState } from 'react';
import { ShieldAlert, X } from 'lucide-react';
import ModalPortal from '../../../../components/ui/ModalPortal';
import PatientSearchPicker from '../../components/PatientSearchPicker';

export default function PatientLinkModal({ isOpen, onClose, onConfirm }) {
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    if (!isOpen) setSelected(null);
  }, [isOpen]);

  if (!isOpen) return null;

  const confirmDisabled = !selected;

  return (
    <ModalPortal>
      <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
        <div className="w-full max-w-lg overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl dark:border-slate-800 dark:bg-slate-950">
          <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 dark:border-slate-800">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">Tautkan pasien</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">Konfirmasi identitas sebelum menautkan kasus klinis ini.</p>
            </div>
            <button type="button" onClick={onClose} aria-label="Tutup modal tautan pasien" className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800">
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="p-5">
            <PatientSearchPicker selectedPatient={selected} onSelect={setSelected} />

            {selected && (
              <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 dark:border-amber-900 dark:bg-amber-950/30">
                <div className="flex gap-2">
                  <ShieldAlert className="mt-0.5 h-4 w-4 text-amber-700 dark:text-amber-300" />
                  <p className="text-xs text-amber-800 dark:text-amber-300">
                    Pastikan ini adalah pasien yang tepat sebelum menautkan. Tindakan ini mencatat audit event dan memengaruhi timeline pasien.
                  </p>
                </div>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2 border-t border-slate-200 px-5 py-4 dark:border-slate-800">
            <button type="button" onClick={onClose} className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 dark:border-slate-700 dark:text-slate-300">Batal</button>
            <button
              type="button"
              disabled={confirmDisabled}
              onClick={() => {
                onConfirm?.({
                  patient_id: selected.id,
                  patient_name: selected.name,
                  patient_code: selected.patientCode || selected.code || selected.id,
                });
                onClose?.();
              }}
              className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              Konfirmasi tautan
            </button>
          </div>
        </div>
      </div>
    </ModalPortal>
  );
}
