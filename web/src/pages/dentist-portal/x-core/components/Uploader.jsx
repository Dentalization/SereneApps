import React, { useCallback, useState, useRef } from 'react';
import AppIcon from '../../../../components/AppIcon';
import { getAccessToken } from '../../../../utils/auth/tokenStorage';

const Uploader = ({ onClose, onUploadComplete }) => {
    const [dragActive, setDragActive] = useState(false);
    const [files, setFiles] = useState([]);
    const [uploading, setUploading] = useState(false);
    const [progress, setProgress] = useState(0);
    const fileInputRef = useRef(null);

    // Handlers for Drag & Drop
    const handleDrag = (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === "dragenter" || e.type === "dragover") {
            setDragActive(true);
        } else if (e.type === "dragleave") {
            setDragActive(false);
        }
    };

    const [detectedFolderName, setDetectedFolderName] = useState(null);

    const handleDrop = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);
        console.log("Files dropped", e.dataTransfer.files);

        // Try to get folder name from items API (more robust)
        if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
            try {
                const item = e.dataTransfer.items[0];
                if (item.kind === 'file' && typeof item.webkitGetAsEntry === 'function') {
                    const entry = item.webkitGetAsEntry();
                    if (entry && entry.isDirectory) {
                        console.log("Detected folder via webkitGetAsEntry:", entry.name);
                        setDetectedFolderName(entry.name);
                    } else {
                        setDetectedFolderName(null);
                    }
                }
            } catch (err) {
                console.warn("webkitGetAsEntry failed:", err);
                setDetectedFolderName(null);
            }
        }

        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            setFiles(Array.from(e.dataTransfer.files));
        }
    };

    const handleFileChange = (e) => {
        if (e.target.files) {
            setFiles(Array.from(e.target.files));
        }
    };

    const uploadFiles = async () => {
        if (files.length === 0) return;
        setUploading(true);
        setProgress(0);

        const formData = new FormData();
        files.forEach(file => {
            formData.append('files', file);
        });
        // Use detected folder name, or fallback to relative path check, or default
        let folderName = detectedFolderName || 'Upload';

        // Fallback check if not already set (e.g. mixed selection)
        if (!detectedFolderName && files.length > 0 && files[0].webkitRelativePath) {
            const parts = files[0].webkitRelativePath.split('/');
            if (parts.length > 1) {
                folderName = parts[0];
            }
        }

        console.log("Uploading with originalFolderName:", folderName);
        formData.append('originalFolderName', folderName);
        // formData.append('patientId', '123'); 

        try {
            const token = getAccessToken();
            const xhr = new XMLHttpRequest();
            xhr.open('POST', '/api/v1/x-core/upload', true);
            xhr.setRequestHeader('Authorization', `Bearer ${token}`);

            xhr.upload.onprogress = (e) => {
                if (e.lengthComputable) {
                    const percentComplete = (e.loaded / e.total) * 100;
                    setProgress(Math.round(percentComplete));
                }
            };

            xhr.onload = () => {
                if (xhr.status === 200) {
                    // Success Transition
                    setProgress(100);
                    setTimeout(() => {
                        onUploadComplete();
                        onClose(); // Close after short delay
                    }, 1500);
                } else {
                    console.error('Upload failed with status:', xhr.status);
                    // Handle error (alert/toast)
                    alert(`Upload failed: ${xhr.statusText}`);
                    setUploading(false);
                }
            };

            xhr.onerror = () => {
                console.error('Upload Error');
                alert('Upload failed due to network error.');
                setUploading(false);
            };

            xhr.send(formData);

        } catch (error) {
            console.error('Upload Logic Error:', error);
            setUploading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-surface-elevated w-full max-w-2xl rounded-3xl border border-primary/10 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                {/* Header */}
                <div className="p-6 border-b border-primary/10 flex justify-between items-center">
                    <h2 className="text-xl font-bold text-primary flex items-center gap-2">
                        <AppIcon name="UploadCloud" size={24} className="text-accent" />
                        Upload Study Folder
                    </h2>
                    <button onClick={onClose} className="p-2 hover:bg-primary/5 rounded-full text-muted">
                        <AppIcon name="X" size={20} />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 flex-1 overflow-y-auto space-y-6">
                    {!uploading ? (
                        <div
                            className={`relative border-2 border-dashed rounded-2xl p-12 text-center transition-all duration-200 ${dragActive ? 'border-accent bg-accent/5' : 'border-primary/20 hover:border-accent/50'
                                }`}
                            onDragEnter={handleDrag}
                            onDragLeave={handleDrag}
                            onDragOver={handleDrag}
                            onDrop={handleDrop}
                        >
                            <input
                                ref={fileInputRef}
                                type="file"
                                multiple
                                webkitdirectory=""
                                directory=""
                                className="hidden"
                                onChange={handleFileChange}
                            />

                            <div className="flex flex-col items-center gap-4">
                                <div className="w-16 h-16 rounded-full bg-accent/10 flex items-center justify-center text-accent">
                                    <AppIcon name="FolderPlus" size={32} />
                                </div>
                                <div>
                                    <h3 className="text-lg font-semibold text-primary">Drag & Drop Patient Folder Here</h3>
                                    <p className="text-secondary text-sm mt-1">Select a folder containing DICOM/SLX files</p>
                                </div>
                                <div className="flex items-center gap-3 w-full max-w-xs">
                                    <div className="h-px bg-primary/10 flex-1"></div>
                                    <span className="text-xs text-muted uppercase tracking-wider">OR</span>
                                    <div className="h-px bg-primary/10 flex-1"></div>
                                </div>
                                <button
                                    onClick={() => fileInputRef.current?.click()}
                                    className="px-6 py-2.5 bg-surface border border-primary/20 hover:bg-primary/5 rounded-xl font-medium text-primary transition"
                                >
                                    Select Folder
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-6 py-8">
                            <div className="flex flex-col items-center gap-4">
                                <div className="w-20 h-20 relative">
                                    <svg className="w-full h-full transform -rotate-90">
                                        <circle cx="40" cy="40" r="36" stroke="currentColor" strokeWidth="6" fill="transparent" className="text-primary/10" />
                                        <circle cx="40" cy="40" r="36" stroke="currentColor" strokeWidth="6" fill="transparent" className="text-accent transition-all duration-300" strokeDasharray="226" strokeDashoffset={226 - (226 * progress) / 100} />
                                    </svg>
                                    <div className="absolute inset-0 flex items-center justify-center font-bold text-lg text-accent">
                                        {progress === 100 ? (
                                            <AppIcon name="Check" size={32} className="text-emerald-500 animate-in zoom-in duration-300" />
                                        ) : (
                                            `${progress}%`
                                        )}
                                    </div>
                                </div>
                                <div className="text-center">
                                    <h3 className="font-semibold text-primary">
                                        {progress === 100 ? "Upload Complete!" : "Uploading & Parsing..."}
                                    </h3>
                                    <p className="text-sm text-secondary">
                                        {progress === 100 ? "Processing finished successfully." : "Analyzing modality and metadata"}
                                    </p>
                                </div>
                            </div>

                            {/* Analysis Steps Mockup */}
                            <div className="space-y-3 max-w-sm mx-auto">
                                <div className={`flex items-center gap-3 text-sm ${progress > 20 ? 'text-emerald-500' : 'text-secondary'}`}>
                                    <AppIcon name={progress > 20 ? 'CheckCircle' : 'Circle'} size={16} />
                                    <span>Folder Structure Verification</span>
                                </div>
                                <div className={`flex items-center gap-3 text-sm ${progress > 50 ? 'text-emerald-500' : 'text-secondary'}`}>
                                    <AppIcon name={progress > 50 ? 'CheckCircle' : 'Circle'} size={16} />
                                    <span>DICOM/SLX Metadata Extraction</span>
                                </div>
                                <div className={`flex items-center gap-3 text-sm ${progress > 80 ? 'text-emerald-500' : 'text-secondary'}`}>
                                    <AppIcon name={progress > 80 ? 'CheckCircle' : 'Circle'} size={16} />
                                    <span>Initiating AI Pre-processing</span>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* File Preview (Compact) */}
                    {files.length > 0 && !uploading && (
                        <div className="bg-surface rounded-xl border border-primary/10 p-4 max-h-40 overflow-y-auto">
                            <h4 className="text-xs font-semibold uppercase tracking-wide text-muted mb-2">Selected ({files.length} items)</h4>
                            <ul className="space-y-1">
                                {files.slice(0, 5).map((f, i) => (
                                    <li key={i} className="text-sm text-secondary truncate flex items-center gap-2">
                                        <AppIcon name="File" size={12} /> {f.name}
                                    </li>
                                ))}
                                {files.length > 5 && <li className="text-xs text-muted italic">...and {files.length - 5} more</li>}
                            </ul>
                        </div>
                    )}
                </div>

                {/* Footer */}
                {!uploading && (
                    <div className="p-6 border-t border-primary/10 bg-surface/50 flex justify-end gap-3">
                        <button onClick={onClose} className="px-5 py-2.5 rounded-xl hover:bg-primary/5 text-secondary font-medium transition">
                            Cancel
                        </button>
                        <button
                            onClick={uploadFiles}
                            disabled={files.length === 0}
                            className="px-6 py-2.5 bg-accent text-white rounded-xl hover:bg-accent-hover transition font-medium shadow-lg shadow-accent/20 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Start Upload
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Uploader;
