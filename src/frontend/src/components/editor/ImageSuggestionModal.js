import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState } from 'react';
import { api, ApiError } from '@/utils/api';
export const ImageSuggestionModal = ({ projectId, slotId, onImageSelect, onClose, }) => {
    const [prompt, setPrompt] = useState('');
    const [loading, setLoading] = useState(false);
    const [generatedImage, setGeneratedImage] = useState(null);
    const [error, setError] = useState(null);
    const handleGenerate = async () => {
        if (!prompt.trim()) {
            setError('Please enter a prompt');
            return;
        }
        try {
            setLoading(true);
            setError(null);
            const response = await api.post('/ai/suggest/image', {
                projectId,
                slotId,
                prompt: prompt.trim(),
            });
            setGeneratedImage(response.imageUrl);
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
                    setError(err.message || 'Failed to generate image');
                }
            }
            else {
                setError('Failed to generate image');
            }
            setGeneratedImage(null);
        }
        finally {
            setLoading(false);
        }
    };
    const handleSelectImage = () => {
        if (generatedImage) {
            onImageSelect(generatedImage);
            onClose();
        }
    };
    return (_jsx("div", { className: "fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4", children: _jsxs("div", { className: "bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto", children: [_jsxs("div", { className: "flex items-center justify-between p-6 border-b border-gray-200", children: [_jsx("h2", { className: "text-xl font-bold text-gray-900", children: "Generate Image" }), _jsx("button", { onClick: onClose, className: "text-gray-500 hover:text-gray-700 text-2xl leading-none", children: "\u00D7" })] }), _jsx("div", { className: "p-6", children: !generatedImage ? (_jsxs("div", { className: "space-y-4", children: [_jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 mb-2", children: "Image Prompt" }), _jsx("textarea", { value: prompt, onChange: (e) => setPrompt(e.target.value), disabled: loading, placeholder: "Describe the image you want to generate...", maxLength: 300, className: "w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none", rows: 4 }), _jsxs("p", { className: "text-xs text-gray-500 mt-1", children: [prompt.length, " / 300"] })] }), error && (_jsx("div", { className: "p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700", children: error })), _jsxs("div", { className: "flex gap-3", children: [_jsx("button", { onClick: handleGenerate, disabled: loading || !prompt.trim(), className: "flex-1 py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2", children: loading ? (_jsxs(_Fragment, { children: [_jsx("div", { className: "animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" }), "Generating..."] })) : ('✨ Generate') }), _jsx("button", { onClick: onClose, disabled: loading, className: "py-2 px-4 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-lg transition-colors disabled:cursor-not-allowed", children: "Cancel" })] })] })) : (_jsxs("div", { className: "space-y-4", children: [_jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 mb-2", children: "Generated Image" }), _jsx("img", { src: generatedImage, alt: "Generated", className: "w-full rounded-lg border border-gray-300" })] }), _jsxs("div", { className: "flex gap-3", children: [_jsx("button", { onClick: handleSelectImage, className: "flex-1 py-2 px-4 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg transition-colors", children: "\u2713 Use This Image" }), _jsx("button", { onClick: () => {
                                            setGeneratedImage(null);
                                            setPrompt('');
                                        }, className: "flex-1 py-2 px-4 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-lg transition-colors", children: "Try Again" }), _jsx("button", { onClick: onClose, className: "py-2 px-4 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-lg transition-colors", children: "Close" })] })] })) })] }) }));
};
