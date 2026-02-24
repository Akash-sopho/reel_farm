import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { VideoPreview } from './VideoPreview';
import { ShareModal } from '../publish';
/**
 * ExportModal Component
 *
 * Shows the video preview with render progress. Polls render status and provides
 * download button when render is complete.
 */
export const ExportModal = ({ renderId, projectId, projectName, template, slotFills, musicUrl, onClose, }) => {
    const [renderStatus, setRenderStatus] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [downloading, setDownloading] = useState(false);
    const [showShareModal, setShowShareModal] = useState(false);
    // Poll render status
    useEffect(() => {
        let pollInterval = null;
        let isMounted = true;
        const pollStatus = async () => {
            try {
                const res = await fetch(`/api/renders/${renderId}/status`);
                if (!res.ok) {
                    if (res.status === 404) {
                        setError('Render not found');
                    }
                    else {
                        setError('Failed to fetch render status');
                    }
                    return;
                }
                const status = await res.json();
                if (isMounted) {
                    setRenderStatus(status);
                    setLoading(false);
                    // Stop polling once render is complete or failed
                    if (status.status === 'DONE' || status.status === 'FAILED') {
                        if (pollInterval) {
                            clearInterval(pollInterval);
                            pollInterval = null;
                        }
                    }
                }
            }
            catch (err) {
                if (isMounted) {
                    setError(err instanceof Error
                        ? err.message
                        : 'Failed to fetch render status');
                }
            }
        };
        // Poll immediately and then every 1.5 seconds
        pollStatus();
        pollInterval = setInterval(pollStatus, 1500);
        return () => {
            isMounted = false;
            if (pollInterval) {
                clearInterval(pollInterval);
            }
        };
    }, [renderId]);
    const handleDownload = async () => {
        try {
            setDownloading(true);
            // Get presigned download URL
            const res = await fetch(`/api/renders/${renderId}/download`);
            if (!res.ok) {
                setError('Failed to get download URL');
                return;
            }
            const { downloadUrl } = await res.json();
            // Trigger browser download
            const a = document.createElement('a');
            a.href = downloadUrl;
            a.download = `${projectName}.mp4`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
        }
        catch (err) {
            setError(err instanceof Error ? err.message : 'Download failed');
        }
        finally {
            setDownloading(false);
        }
    };
    const getProgressPercentage = () => {
        if (!renderStatus)
            return 0;
        if (renderStatus.status === 'DONE')
            return 100;
        if (renderStatus.status === 'PROCESSING')
            return 50;
        if (renderStatus.status === 'PENDING')
            return 10;
        return 0;
    };
    const getStatusText = () => {
        if (!renderStatus)
            return 'Loading...';
        switch (renderStatus.status) {
            case 'PENDING':
                return 'Queued for rendering';
            case 'PROCESSING':
                return 'Rendering video...';
            case 'DONE':
                return 'Render complete!';
            case 'FAILED':
                return 'Render failed';
            default:
                return 'Unknown status';
        }
    };
    return (_jsx("div", { className: "fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4", children: _jsxs("div", { className: "bg-white rounded-lg shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto", children: [_jsxs("div", { className: "sticky top-0 bg-white border-b border-gray-200 p-6 flex items-center justify-between", children: [_jsxs("div", { children: [_jsx("h2", { className: "text-2xl font-bold text-gray-900", children: "Export Video" }), _jsx("p", { className: "text-sm text-gray-600 mt-1", children: projectName })] }), _jsx("button", { onClick: onClose, disabled: renderStatus?.status === 'PROCESSING', className: "text-gray-400 hover:text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed text-2xl", children: "\u00D7" })] }), _jsxs("div", { className: "p-6 space-y-6", children: [_jsxs("div", { className: "space-y-3", children: [_jsx("h3", { className: "text-lg font-semibold text-gray-900", children: "Preview" }), _jsx("div", { className: "bg-gray-50 rounded-lg overflow-hidden", children: _jsx(VideoPreview, { template: template, slotFills: slotFills, musicUrl: musicUrl }) })] }), _jsxs("div", { className: "space-y-3", children: [_jsx("h3", { className: "text-lg font-semibold text-gray-900", children: "Render Status" }), error ? (_jsxs("div", { className: "bg-red-50 border border-red-200 rounded-lg p-4", children: [_jsx("p", { className: "text-red-700 font-semibold", children: "Error" }), _jsx("p", { className: "text-red-600 text-sm mt-1", children: error })] })) : loading ? (_jsx("div", { className: "flex items-center justify-center py-8", children: _jsx("div", { className: "inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" }) })) : renderStatus ? (_jsxs("div", { className: "space-y-4", children: [_jsxs("div", { children: [_jsxs("div", { className: "flex items-center justify-between mb-2", children: [_jsx("span", { className: "text-sm font-medium text-gray-700", children: getStatusText() }), _jsxs("span", { className: "text-sm font-semibold text-gray-900", children: [getProgressPercentage(), "%"] })] }), _jsx("div", { className: "w-full bg-gray-200 rounded-full h-2", children: _jsx("div", { className: `h-2 rounded-full transition-all duration-300 ${renderStatus.status === 'DONE'
                                                            ? 'bg-green-500'
                                                            : renderStatus.status === 'FAILED'
                                                                ? 'bg-red-500'
                                                                : 'bg-blue-500'}`, style: { width: `${getProgressPercentage()}%` } }) })] }), _jsxs("div", { className: "bg-gray-50 rounded-lg p-4 space-y-2 text-sm text-gray-600", children: [_jsxs("div", { className: "flex justify-between", children: [_jsx("span", { children: "Status:" }), _jsx("span", { className: "font-semibold text-gray-900", children: renderStatus.status })] }), renderStatus.fileSizeBytes && (_jsxs("div", { className: "flex justify-between", children: [_jsx("span", { children: "File Size:" }), _jsxs("span", { className: "font-semibold text-gray-900", children: [(renderStatus.fileSizeBytes / 1024 / 1024).toFixed(2), " MB"] })] })), renderStatus.startedAt && (_jsxs("div", { className: "flex justify-between", children: [_jsx("span", { children: "Started:" }), _jsx("span", { className: "font-semibold text-gray-900", children: new Date(renderStatus.startedAt).toLocaleTimeString() })] })), renderStatus.completedAt && (_jsxs("div", { className: "flex justify-between", children: [_jsx("span", { children: "Completed:" }), _jsx("span", { className: "font-semibold text-gray-900", children: new Date(renderStatus.completedAt).toLocaleTimeString() })] })), renderStatus.errorMessage && (_jsx("div", { className: "mt-3 bg-red-50 border border-red-200 rounded p-2", children: _jsx("p", { className: "text-red-700 text-xs font-mono", children: renderStatus.errorMessage }) }))] })] })) : null] })] }), _jsxs("div", { className: "sticky bottom-0 bg-gray-50 border-t border-gray-200 p-6 flex gap-3 justify-end", children: [_jsx("button", { onClick: onClose, disabled: renderStatus?.status === 'PROCESSING', className: "px-4 py-2 text-gray-700 bg-gray-200 hover:bg-gray-300 rounded-lg font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed", children: "Close" }), renderStatus?.status === 'DONE' && (_jsxs(_Fragment, { children: [_jsxs("button", { onClick: () => setShowShareModal(true), className: "px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition-colors flex items-center gap-2", children: [_jsx("svg", { className: "w-5 h-5", fill: "none", viewBox: "0 0 24 24", stroke: "currentColor", children: _jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M8.684 13.342C9.589 12.938 10 12.016 10 11c0-1.105-.895-2-2-2s-2 .895-2 2c0 1.016.411 1.938 1.316 2.342m0 0a9 9 0 019.632-3.74m0 0a9.773 9.773 0 012.109 2.109m0 0a9 9 0 01-2.109 2.109m-1.316-2.342C14.411 12.938 15 12.016 15 11c0-1.105-.895-2-2-2s-2 .895-2 2c0 1.016.411 1.938 1.316 2.342m0 0a9.773 9.773 0 012.109-2.109M19 13h-6" }) }), "Share to Social"] }), _jsx("button", { onClick: handleDownload, disabled: downloading, className: "px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2", children: downloading ? (_jsxs(_Fragment, { children: [_jsx("div", { className: "inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-white" }), "Downloading..."] })) : (_jsxs(_Fragment, { children: [_jsx("svg", { className: "w-5 h-5", fill: "none", viewBox: "0 0 24 24", stroke: "currentColor", children: _jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" }) }), "Download MP4"] })) })] }))] }), showShareModal && renderStatus?.status === 'DONE' && (_jsx(ShareModal, { projectId: projectId, renderId: renderId, projectName: projectName, onClose: () => setShowShareModal(false) }))] }) }));
};
export default ExportModal;
