import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
/**
 * UrlBatchInput Component
 *
 * Left panel form for submitting Instagram/TikTok URLs
 */
export const UrlBatchInput = ({ onSubmit, loading }) => {
    const [input, setInput] = useState('');
    const [error, setError] = useState(null);
    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);
        // Parse URLs from input (one per line)
        const urls = input
            .split('\n')
            .map((url) => url.trim())
            .filter((url) => url.length > 0);
        if (urls.length === 0) {
            setError('Please enter at least one URL');
            return;
        }
        if (urls.length > 20) {
            setError('Maximum 20 URLs per batch');
            return;
        }
        try {
            await onSubmit(urls);
            setInput(''); // Clear input on success
        }
        catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to submit URLs');
        }
    };
    return (_jsxs("div", { className: "p-4", children: [_jsx("h2", { className: "text-lg font-bold text-gray-900 mb-4", children: "Submit URLs" }), _jsxs("form", { onSubmit: handleSubmit, className: "space-y-4", children: [_jsxs("div", { children: [_jsx("label", { htmlFor: "urls", className: "block text-sm font-semibold text-gray-700 mb-2", children: "Instagram / TikTok URLs" }), _jsx("textarea", { id: "urls", value: input, onChange: (e) => setInput(e.target.value), disabled: loading, placeholder: "https://www.instagram.com/reel/ABC123/\nhttps://www.tiktok.com/@user/video/123456789\n...", className: "w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 resize-none", rows: 8 }), _jsx("p", { className: "text-xs text-gray-500 mt-2", children: "One URL per line. Max 20 URLs per batch." })] }), error && (_jsx("div", { className: "bg-red-50 border border-red-200 rounded-lg p-3", children: _jsx("p", { className: "text-red-700 text-sm", children: error }) })), _jsx("button", { type: "submit", disabled: loading, className: `w-full py-2 px-4 rounded-lg font-semibold transition-colors ${loading
                            ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                            : 'bg-blue-600 hover:bg-blue-700 text-white cursor-pointer'}`, children: loading ? (_jsxs("span", { className: "flex items-center justify-center gap-2", children: [_jsx("div", { className: "inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-white" }), "Submitting..."] })) : ('Submit URLs') })] }), _jsxs("div", { className: "mt-6 pt-6 border-t border-gray-200", children: [_jsx("h3", { className: "text-sm font-semibold text-gray-700 mb-3", children: "Supported Platforms" }), _jsxs("div", { className: "space-y-2 text-sm text-gray-600", children: [_jsxs("div", { className: "flex items-center gap-2", children: [_jsx("span", { className: "w-2 h-2 bg-blue-400 rounded-full" }), _jsx("span", { children: "Instagram Reels & Posts" })] }), _jsxs("div", { className: "flex items-center gap-2", children: [_jsx("span", { className: "w-2 h-2 bg-red-400 rounded-full" }), _jsx("span", { children: "TikTok Videos" })] })] })] })] }));
};
export default UrlBatchInput;
