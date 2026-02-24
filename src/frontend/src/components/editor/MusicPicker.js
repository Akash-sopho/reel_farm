import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect, useRef } from 'react';
import { api, ApiError } from '@/utils/api';
const moods = ['happy', 'sad', 'energetic', 'calm', 'neutral'];
const genres = ['pop', 'hip-hop', 'ambient', 'electronic', 'acoustic', 'cinematic'];
export const MusicPicker = ({ projectId, onSelectTrack, onClose, }) => {
    const [tracks, setTracks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [moodFilter, setMoodFilter] = useState('');
    const [genreFilter, setGenreFilter] = useState('');
    const [previewingId, setPreviewingId] = useState(null);
    const audioRef = useRef(null);
    // Fetch tracks
    const fetchTracks = async () => {
        try {
            setLoading(true);
            setError(null);
            const params = new URLSearchParams();
            if (moodFilter)
                params.append('mood', moodFilter);
            if (genreFilter)
                params.append('genre', genreFilter);
            params.append('limit', '50');
            const response = await api.get(`/music?${params.toString()}`);
            setTracks(response.tracks);
        }
        catch (err) {
            if (err instanceof ApiError) {
                setError(err.message || 'Failed to load tracks');
            }
            else {
                setError('Failed to load tracks');
            }
        }
        finally {
            setLoading(false);
        }
    };
    // Fetch tracks on filter change
    useEffect(() => {
        fetchTracks();
    }, [moodFilter, genreFilter]);
    // Handle preview button click
    const handlePreview = async (trackId) => {
        try {
            const response = await api.get(`/music/${trackId}/preview`);
            if (audioRef.current) {
                audioRef.current.src = response.previewUrl;
                audioRef.current.play();
                setPreviewingId(trackId);
            }
        }
        catch (err) {
            console.error('Failed to load preview:', err);
        }
    };
    // Handle select track
    const handleSelectTrack = (track) => {
        onSelectTrack(track);
        onClose();
    };
    return (_jsx("div", { className: "fixed inset-0 bg-black bg-opacity-50 flex items-end z-50", children: _jsxs("div", { className: "w-full bg-white rounded-t-lg shadow-xl max-h-[90vh] overflow-y-auto", children: [_jsxs("div", { className: "flex items-center justify-between p-6 border-b border-gray-200 sticky top-0 bg-white", children: [_jsx("h2", { className: "text-xl font-bold text-gray-900", children: "\uD83C\uDFB5 Add Music" }), _jsx("button", { onClick: onClose, className: "text-gray-500 hover:text-gray-700 text-2xl leading-none", children: "\u00D7" })] }), _jsx("div", { className: "px-6 py-4 border-b border-gray-200 bg-gray-50 sticky top-[69px] space-y-3", children: _jsxs("div", { className: "flex gap-3", children: [_jsxs("div", { className: "flex-1", children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 mb-1", children: "Mood" }), _jsxs("select", { value: moodFilter, onChange: (e) => setMoodFilter(e.target.value), className: "w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm", children: [_jsx("option", { value: "", children: "All Moods" }), moods.map((mood) => (_jsx("option", { value: mood, children: mood.charAt(0).toUpperCase() + mood.slice(1) }, mood)))] })] }), _jsxs("div", { className: "flex-1", children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 mb-1", children: "Genre" }), _jsxs("select", { value: genreFilter, onChange: (e) => setGenreFilter(e.target.value), className: "w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm", children: [_jsx("option", { value: "", children: "All Genres" }), genres.map((genre) => (_jsx("option", { value: genre, children: genre.charAt(0).toUpperCase() + genre.slice(1) }, genre)))] })] })] }) }), _jsxs("div", { className: "p-6", children: [error && (_jsx("div", { className: "mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700", children: error })), loading ? (_jsx("div", { className: "flex items-center justify-center py-12", children: _jsx("div", { className: "animate-spin h-8 w-8 border-2 border-blue-600 border-t-transparent rounded-full" }) })) : tracks.length === 0 ? (_jsx("div", { className: "text-center py-12", children: _jsx("p", { className: "text-gray-500", children: "No tracks found" }) })) : (_jsx("div", { className: "space-y-2", children: tracks.map((track) => (_jsx("div", { className: "p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors", children: _jsxs("div", { className: "flex items-start justify-between gap-4", children: [_jsxs("div", { className: "flex-1 min-w-0", children: [_jsx("h3", { className: "font-semibold text-gray-900 truncate", children: track.title }), _jsx("p", { className: "text-sm text-gray-600 truncate", children: track.artist }), _jsxs("div", { className: "flex gap-2 mt-2 flex-wrap", children: [_jsx("span", { className: "text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded", children: track.mood }), _jsx("span", { className: "text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded", children: track.genre }), track.bpm && (_jsxs("span", { className: "text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded", children: [track.bpm, " BPM"] })), _jsxs("span", { className: "text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded", children: [Math.floor(track.durationSeconds / 60), ":", String(track.durationSeconds % 60).padStart(2, '0')] })] })] }), _jsxs("div", { className: "flex gap-2 flex-shrink-0", children: [_jsxs("button", { onClick: () => handlePreview(track.id), className: "px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded text-sm transition-colors", children: [previewingId === track.id ? '⏸' : '▶', " Preview"] }), _jsx("button", { onClick: () => handleSelectTrack(track), className: "px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded text-sm transition-colors", children: "Select" })] })] }) }, track.id))) }))] }), _jsx("audio", { ref: audioRef, className: "hidden" })] }) }));
};
