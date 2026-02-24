import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { UrlBatchInput } from '@/components/collect/UrlBatchInput';
import { CollectionGrid } from '@/components/collect/CollectionGrid';
import { TagsPanel } from '@/components/collect/TagsPanel';
/**
 * Collect Page
 *
 * Three-panel layout for managing video collection:
 * - Left: URL input form
 * - Center: Collected videos grid with real-time status
 * - Right: Tags editor for selected video
 */
export const Collect = () => {
    const [videos, setVideos] = useState([]);
    const [selectedVideo, setSelectedVideo] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    // Poll for collection list every 2.5 seconds
    useEffect(() => {
        const fetchCollections = async () => {
            try {
                const res = await fetch(`/api/intake/collections?page=${page}&limit=20`);
                if (!res.ok)
                    throw new Error('Failed to fetch collections');
                const data = await res.json();
                setVideos(data.data);
                setTotalPages(data.pages);
                setError(null);
            }
            catch (err) {
                setError(err instanceof Error ? err.message : 'Failed to fetch collections');
            }
        };
        // Fetch immediately
        fetchCollections();
        // Set up polling interval
        const interval = setInterval(fetchCollections, 2500);
        return () => clearInterval(interval);
    }, [page]);
    // Update selected video when videos change
    useEffect(() => {
        if (selectedVideo) {
            const updated = videos.find((v) => v.id === selectedVideo.id);
            if (updated) {
                setSelectedVideo(updated);
            }
        }
    }, [videos, selectedVideo]);
    const handleUrlSubmit = async (urls) => {
        try {
            setLoading(true);
            setError(null);
            const res = await fetch('/api/intake/fetch', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ urls }),
            });
            if (!res.ok) {
                const errorData = await res.json();
                throw new Error(errorData.error || 'Failed to submit URLs');
            }
            // Refetch collections
            const collectRes = await fetch(`/api/intake/collections?page=1&limit=20`);
            if (collectRes.ok) {
                const data = await collectRes.json();
                setVideos(data.data);
                setPage(1);
            }
        }
        catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to submit URLs');
        }
        finally {
            setLoading(false);
        }
    };
    const handleUpdateTags = async (videoId, tags, caption) => {
        try {
            const res = await fetch(`/api/intake/videos/${videoId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ tags, caption }),
            });
            if (!res.ok)
                throw new Error('Failed to update video');
            const updated = await res.json();
            setSelectedVideo(updated);
            // Update in list
            setVideos((prev) => prev.map((v) => (v.id === videoId ? updated : v)));
        }
        catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to update video');
        }
    };
    const getStatusColor = (status) => {
        switch (status) {
            case 'PENDING':
            case 'FETCHING':
                return 'bg-blue-100 text-blue-700';
            case 'READY':
                return 'bg-green-100 text-green-700';
            case 'FAILED':
                return 'bg-red-100 text-red-700';
            default:
                return 'bg-gray-100 text-gray-700';
        }
    };
    const getStatusText = (status) => {
        switch (status) {
            case 'PENDING':
                return 'Queued';
            case 'FETCHING':
                return 'Downloading...';
            case 'READY':
                return 'Ready';
            case 'FAILED':
                return 'Failed';
            default:
                return status;
        }
    };
    return (_jsxs("div", { className: "min-h-screen bg-gray-100", children: [_jsx("div", { className: "bg-white shadow-sm border-b border-gray-200", children: _jsxs("div", { className: "px-6 py-4", children: [_jsx("h1", { className: "text-2xl font-bold text-gray-900", children: "Video Collection" }), _jsx("p", { className: "text-sm text-gray-600 mt-1", children: "Collect Instagram and TikTok videos for trend analysis" })] }) }), error && (_jsx("div", { className: "bg-red-50 border-b border-red-200 p-4", children: _jsxs("div", { className: "flex items-start gap-3", children: [_jsx("svg", { className: "w-5 h-5 text-red-600 flex-shrink-0 mt-0.5", fill: "currentColor", viewBox: "0 0 20 20", children: _jsx("path", { fillRule: "evenodd", d: "M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z", clipRule: "evenodd" }) }), _jsxs("div", { className: "flex-1", children: [_jsx("p", { className: "text-red-800 font-semibold", children: "Error" }), _jsx("p", { className: "text-red-700 text-sm mt-1", children: error })] }), _jsx("button", { onClick: () => setError(null), className: "text-red-400 hover:text-red-600", children: "\u00D7" })] }) })), _jsxs("div", { className: "flex h-[calc(100vh-180px)]", children: [_jsx("div", { className: "w-[300px] bg-white border-r border-gray-200 overflow-y-auto", children: _jsx(UrlBatchInput, { onSubmit: handleUrlSubmit, loading: loading }) }), _jsxs("div", { className: "flex-1 bg-gray-50 p-6 overflow-y-auto", children: [_jsx(CollectionGrid, { videos: videos, selectedVideoId: selectedVideo?.id, onSelectVideo: setSelectedVideo, getStatusColor: getStatusColor, getStatusText: getStatusText }), videos.length === 0 && (_jsx("div", { className: "flex items-center justify-center h-full", children: _jsxs("div", { className: "text-center", children: [_jsx("svg", { className: "w-16 h-16 text-gray-400 mx-auto mb-4", fill: "none", viewBox: "0 0 24 24", stroke: "currentColor", children: _jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 1.5, d: "M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4" }) }), _jsx("p", { className: "text-gray-500 font-semibold", children: "No videos collected yet" }), _jsx("p", { className: "text-gray-400 text-sm mt-1", children: "Submit URLs to get started" })] }) }))] }), selectedVideo && (_jsx("div", { className: "w-[300px] bg-white border-l border-gray-200 overflow-y-auto", children: _jsx(TagsPanel, { video: selectedVideo, onUpdateTags: handleUpdateTags }) }))] })] }));
};
export default Collect;
