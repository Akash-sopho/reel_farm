import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect } from 'react';
/**
 * TagsPanel Component
 *
 * Right panel for editing tags and caption of selected video
 */
export const TagsPanel = ({ video, onUpdateTags }) => {
    const [tags, setTags] = useState(video.tags || []);
    const [tagInput, setTagInput] = useState('');
    const [caption, setCaption] = useState(video.caption || '');
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(false);
    // Reset form when video changes
    useEffect(() => {
        setTags(video.tags || []);
        setCaption(video.caption || '');
        setError(null);
        setSuccess(false);
    }, [video.id]);
    const handleAddTag = () => {
        const tag = tagInput.trim().toLowerCase();
        if (!tag)
            return;
        if (tags.includes(tag)) {
            setError('Tag already added');
            return;
        }
        if (tags.length >= 20) {
            setError('Maximum 20 tags');
            return;
        }
        if (tag.length > 30) {
            setError('Tag max 30 characters');
            return;
        }
        setTags([...tags, tag]);
        setTagInput('');
        setError(null);
    };
    const handleRemoveTag = (tag) => {
        setTags(tags.filter((t) => t !== tag));
    };
    const handleSave = async () => {
        try {
            setSaving(true);
            setError(null);
            setSuccess(false);
            if (caption.length > 500) {
                setError('Caption max 500 characters');
                return;
            }
            await onUpdateTags(video.id, tags, caption);
            setSuccess(true);
            setTimeout(() => setSuccess(false), 3000);
        }
        catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to save');
        }
        finally {
            setSaving(false);
        }
    };
    const hasChanges = JSON.stringify(tags) !== JSON.stringify(video.tags || []) ||
        caption !== (video.caption || '');
    return (_jsxs("div", { className: "p-4", children: [_jsx("h2", { className: "text-lg font-bold text-gray-900 mb-4", children: "Edit Details" }), _jsxs("div", { className: "bg-gray-50 rounded-lg p-3 mb-4", children: [_jsx("p", { className: "text-sm font-semibold text-gray-700 truncate", children: video.title || 'Untitled' }), _jsx("p", { className: "text-xs text-gray-500 mt-1 truncate", children: video.sourceUrl }), _jsxs("p", { className: "text-xs text-gray-500 mt-1", children: ["Platform: ", _jsx("span", { className: "font-semibold", children: video.platform === 'instagram' ? 'Instagram' : 'TikTok' })] })] }), error && (_jsx("div", { className: "bg-red-50 border border-red-200 rounded-lg p-3 mb-4", children: _jsx("p", { className: "text-red-700 text-sm", children: error }) })), success && (_jsx("div", { className: "bg-green-50 border border-green-200 rounded-lg p-3 mb-4", children: _jsx("p", { className: "text-green-700 text-sm", children: "\u2713 Changes saved" }) })), _jsxs("div", { className: "mb-4", children: [_jsx("label", { htmlFor: "caption", className: "block text-sm font-semibold text-gray-700 mb-2", children: "Notes" }), _jsx("textarea", { id: "caption", value: caption, onChange: (e) => setCaption(e.target.value), maxLength: 500, placeholder: "Add notes about this video...", className: "w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none", rows: 3 }), _jsxs("p", { className: "text-xs text-gray-500 mt-1", children: [caption.length, "/500"] })] }), _jsxs("div", { className: "mb-4", children: [_jsxs("label", { htmlFor: "tag-input", className: "block text-sm font-semibold text-gray-700 mb-2", children: ["Tags (", tags.length, "/20)"] }), tags.length > 0 && (_jsx("div", { className: "flex flex-wrap gap-2 mb-3", children: tags.map((tag) => (_jsxs("span", { className: "inline-flex items-center gap-1 bg-blue-100 text-blue-700 px-2 py-1 rounded text-sm", children: [tag, _jsx("button", { type: "button", onClick: () => handleRemoveTag(tag), className: "text-blue-500 hover:text-blue-700 font-bold", children: "\u00D7" })] }, tag))) })), _jsxs("div", { className: "flex gap-2", children: [_jsx("input", { id: "tag-input", type: "text", value: tagInput, onChange: (e) => setTagInput(e.target.value), onKeyDown: (e) => {
                                    if (e.key === 'Enter') {
                                        e.preventDefault();
                                        handleAddTag();
                                    }
                                }, placeholder: "Add tag...", maxLength: 30, disabled: tags.length >= 20, className: "flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50" }), _jsx("button", { type: "button", onClick: handleAddTag, disabled: tags.length >= 20 || !tagInput.trim(), className: "px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed", children: "Add" })] })] }), _jsx("button", { onClick: handleSave, disabled: !hasChanges || saving, className: `w-full py-2 px-4 rounded-lg font-semibold transition-colors ${hasChanges && !saving
                    ? 'bg-green-600 hover:bg-green-700 text-white cursor-pointer'
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'}`, children: saving ? 'Saving...' : 'Save Changes' })] }));
};
export default TagsPanel;
