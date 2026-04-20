import React, { useEffect, useRef, useState } from 'react';
import AppIcon from '../../../../components/AppIcon';

const ShortcutHelpButton = ({ shortcuts = [], align = 'right' }) => {
    const [open, setOpen] = useState(false);
    const wrapperRef = useRef(null);

    useEffect(() => {
        if (!open) return undefined;

        const handlePointerDown = (event) => {
            if (!wrapperRef.current?.contains(event.target)) {
                setOpen(false);
            }
        };

        document.addEventListener('mousedown', handlePointerDown);
        return () => document.removeEventListener('mousedown', handlePointerDown);
    }, [open]);

    return (
        <div ref={wrapperRef} className="relative">
            <button
                type="button"
                onClick={() => setOpen((current) => !current)}
                className="rounded-lg bg-slate-800 px-2.5 py-2 text-xs font-bold text-gray-400 transition hover:bg-slate-700 hover:text-white"
                title="Keyboard shortcuts"
            >
                ?
            </button>

            {open && (
                <div
                    className={`absolute top-full z-50 mt-2 w-72 rounded-2xl border border-slate-700 bg-slate-950/95 p-4 text-slate-100 shadow-2xl backdrop-blur ${align === 'left' ? 'left-0' : 'right-0'}`}
                >
                    <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-cyan-300">
                        <AppIcon name="Keyboard" size={14} />
                        Shortcuts
                    </div>
                    <div className="grid grid-cols-[88px_1fr] gap-x-3 gap-y-2 text-xs">
                        {shortcuts.map((shortcut) => (
                            <React.Fragment key={`${shortcut.key}-${shortcut.label}`}>
                                <kbd className="rounded-md border border-slate-600 bg-slate-800 px-2 py-1 text-center font-mono text-[11px] text-white">
                                    {shortcut.key}
                                </kbd>
                                <span className="self-center text-slate-300">{shortcut.label}</span>
                            </React.Fragment>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default ShortcutHelpButton;
