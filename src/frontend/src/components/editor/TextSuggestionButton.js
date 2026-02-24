import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useRef, useEffect } from 'react';
import { api, ApiError } from '@/utils/api';
export const TextSuggestionButton = ({ projectId, slotId, onSuggestionSelect, hint, }) => {
    const [loading, setLoading] = useState(false);
    const [suggestions, setSuggestions] = useState([]);
    const [showPopover, setShowPopover] = useState(false);
    const [error, setError] = useState(null);
    const buttonRef = useRef(null);
    const popoverRef = useRef(null);
    // Close popover when clicking outside
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (popoverRef.current &&
                !popoverRef.current.contains(e.target) &&
                buttonRef.current &&
                !buttonRef.current.contains(e.target)) {
                setShowPopover(false);
            }
        };
        if (showPopover) {
            document.addEventListener('mousedown', handleClickOutside);
            return () => document.removeEventListener('mousedown', handleClickOutside);
        }
    }, [showPopover]);
    const handleSuggest = async () => {
        try {
            setLoading(true);
            setError(null);
            const response = await api.post('/ai/suggest/text', {
                projectId,
                slotId,
                hint: hint || undefined,
            });
            setSuggestions(response.suggestions);
            setShowPopover(true);
        }
        catch (err) {
            if (err instanceof ApiError) {
                if (err.statusCode === 429) {
                    setError('Rate limit reached — try again in a moment');
                }
                else if (err.statusCode === 400) {
                    setError('Invalid slot or project');
                }
                else if (err.statusCode === 404) {
                    setError('Project or slot not found');
                }
                else {
                    setError(err.message || 'Failed to generate suggestions');
                }
            }
            else {
                setError('Failed to generate suggestions');
            }
            setShowPopover(false);
        }
        finally {
            setLoading(false);
        }
    };
    const handleSelectSuggestion = (suggestion) => {
        onSuggestionSelect(suggestion);
        setShowPopover(false);
        setSuggestions([]);
    };
    return (_jsxs("div", { className: "relative", children: [_jsx("button", { ref: buttonRef, onClick: handleSuggest, disabled: loading, className: "w-full py-2 px-3 text-sm bg-purple-50 hover:bg-purple-100 border border-purple-200 rounded font-medium text-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed", children: loading ? 'Generating...' : '✨ Suggest' }), error && (_jsx("div", { className: "absolute top-full left-0 right-0 mt-2 p-2 bg-red-50 border border-red-200 rounded text-xs text-red-700 z-50", children: error })), showPopover && suggestions.length > 0 && (_jsxs("div", { ref: popoverRef, className: "absolute top-full left-0 right-0 mt-2 bg-white border border-gray-200 rounded-lg shadow-lg p-3 z-50", children: [_jsx("p", { className: "text-xs font-semibold text-gray-600 mb-2", children: "Select a suggestion:" }), _jsx("div", { className: "space-y-2", children: suggestions.map((suggestion, idx) => (_jsx("button", { onClick: () => handleSelectSuggestion(suggestion), className: "w-full text-left p-2 bg-gray-50 hover:bg-purple-50 border border-gray-200 rounded text-sm text-gray-700 hover:text-purple-700 transition-colors", children: suggestion }, idx))) })] }))] }));
};
