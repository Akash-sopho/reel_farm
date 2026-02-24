import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState, useEffect } from 'react';
import { api, ApiError } from '@/utils/api';
export const ShareModal = ({ projectId, renderId, projectName, onClose, }) => {
    // State
    const [activeTab, setActiveTab] = useState('immediate');
    const [socialAccounts, setSocialAccounts] = useState([]);
    const [selectedPlatform, setSelectedPlatform] = useState('instagram');
    const [caption, setCaption] = useState('');
    const [hashtags, setHashtags] = useState('');
    const [scheduledAt, setScheduledAt] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [publishing, setPublishing] = useState(false);
    const [publishLogId, setPublishLogId] = useState(null);
    const [publishStatus, setPublishStatus] = useState(null);
    const [publishError, setPublishError] = useState(null);
    // Fetch social accounts on mount
    useEffect(() => {
        fetchSocialAccounts();
    }, []);
    // Poll publish status
    useEffect(() => {
        if (!publishLogId)
            return;
        let pollInterval = null;
        let isMounted = true;
        const pollStatus = async () => {
            try {
                const response = await api.get(`/publishes/${publishLogId}`);
                if (isMounted) {
                    setPublishStatus(response.status);
                    if (response.status === 'FAILED') {
                        setPublishError(response.errorMessage || 'Publishing failed');
                        if (pollInterval) {
                            clearInterval(pollInterval);
                            pollInterval = null;
                        }
                    }
                    else if (response.status === 'PUBLISHED') {
                        if (pollInterval) {
                            clearInterval(pollInterval);
                            pollInterval = null;
                        }
                    }
                }
            }
            catch (err) {
                console.error('Failed to poll publish status:', err);
            }
        };
        pollStatus();
        pollInterval = setInterval(pollStatus, 2000);
        return () => {
            isMounted = false;
            if (pollInterval) {
                clearInterval(pollInterval);
            }
        };
    }, [publishLogId]);
    const fetchSocialAccounts = async () => {
        try {
            setLoading(true);
            setError(null);
            const response = await api.get('/social/accounts');
            setSocialAccounts(response.accounts);
        }
        catch (err) {
            if (err instanceof ApiError) {
                setError(err.message || 'Failed to load accounts');
            }
            else {
                setError('Failed to load accounts');
            }
        }
        finally {
            setLoading(false);
        }
    };
    const handlePublish = async () => {
        const account = socialAccounts.find((a) => a.platform === selectedPlatform && a.isActive);
        if (!account) {
            setError(`No active ${selectedPlatform} account. Please connect your account first.`);
            return;
        }
        try {
            setPublishing(true);
            setError(null);
            setPublishError(null);
            const hashtagArray = hashtags
                .split(',')
                .map((tag) => tag.trim())
                .filter((tag) => tag.length > 0);
            const response = await api.post(`/projects/${projectId}/publish`, {
                platform: selectedPlatform,
                caption: caption || undefined,
                hashtags: hashtagArray.length > 0 ? hashtagArray : undefined,
            });
            setPublishLogId(response.publishLogId);
            setPublishStatus('PENDING');
            setActiveTab('status');
        }
        catch (err) {
            if (err instanceof ApiError) {
                setError(err.message || 'Failed to publish');
            }
            else {
                setError('Failed to publish');
            }
        }
        finally {
            setPublishing(false);
        }
    };
    const handleSchedule = async () => {
        if (!scheduledAt) {
            setError('Please select a date and time');
            return;
        }
        const account = socialAccounts.find((a) => a.platform === selectedPlatform && a.isActive);
        if (!account) {
            setError(`No active ${selectedPlatform} account. Please connect your account first.`);
            return;
        }
        try {
            setPublishing(true);
            setError(null);
            const hashtagArray = hashtags
                .split(',')
                .map((tag) => tag.trim())
                .filter((tag) => tag.length > 0);
            const response = await api.post(`/projects/${projectId}/schedule`, {
                platform: selectedPlatform,
                scheduledAt,
                caption: caption || undefined,
                hashtags: hashtagArray.length > 0 ? hashtagArray : undefined,
            });
            setPublishLogId(response.publishLogId);
            setPublishStatus('PENDING');
            setActiveTab('status');
        }
        catch (err) {
            if (err instanceof ApiError) {
                setError(err.message || 'Failed to schedule publish');
            }
            else {
                setError('Failed to schedule publish');
            }
        }
        finally {
            setPublishing(false);
        }
    };
    const handleConnectAccount = () => {
        const platform = selectedPlatform;
        // Redirect to OAuth flow
        window.location.href = `/api/social/auth/${platform}`;
    };
    const connectedAccount = socialAccounts.find((a) => a.platform === selectedPlatform && a.isActive);
    const maxCaptionLength = selectedPlatform === 'instagram' ? 2200 : 150;
    return (_jsx("div", { className: "fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4", children: _jsxs("div", { className: "bg-white rounded-lg shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto", children: [_jsxs("div", { className: "sticky top-0 bg-white border-b border-gray-200 p-6 flex items-center justify-between", children: [_jsxs("div", { children: [_jsx("h2", { className: "text-2xl font-bold text-gray-900", children: "Share Video" }), _jsx("p", { className: "text-sm text-gray-600 mt-1", children: projectName })] }), _jsx("button", { onClick: onClose, disabled: publishing || publishStatus === 'UPLOADING', className: "text-gray-400 hover:text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed text-2xl", children: "\u00D7" })] }), !publishLogId && (_jsx("div", { className: "border-b border-gray-200 bg-gray-50", children: _jsxs("div", { className: "flex", children: [_jsx("button", { onClick: () => setActiveTab('immediate'), className: `flex-1 py-3 px-4 font-medium transition-colors ${activeTab === 'immediate'
                                    ? 'border-b-2 border-blue-600 text-blue-600 bg-white'
                                    : 'text-gray-600 hover:text-gray-900'}`, children: "Publish Now" }), _jsx("button", { onClick: () => setActiveTab('scheduled'), className: `flex-1 py-3 px-4 font-medium transition-colors ${activeTab === 'scheduled'
                                    ? 'border-b-2 border-blue-600 text-blue-600 bg-white'
                                    : 'text-gray-600 hover:text-gray-900'}`, children: "Schedule" })] }) })), _jsxs("div", { className: "p-6 space-y-6", children: [error && (_jsxs("div", { className: "bg-red-50 border border-red-200 rounded-lg p-4", children: [_jsx("p", { className: "text-red-700 font-semibold", children: "Error" }), _jsx("p", { className: "text-red-600 text-sm mt-1", children: error })] })), publishStatus === 'PUBLISHED' && (_jsxs("div", { className: "bg-green-50 border border-green-200 rounded-lg p-4", children: [_jsx("p", { className: "text-green-700 font-semibold", children: "\u2713 Published Successfully!" }), _jsxs("p", { className: "text-green-600 text-sm mt-1", children: ["Your video has been published to ", selectedPlatform, "."] })] })), publishStatus === 'FAILED' && (_jsxs("div", { className: "bg-red-50 border border-red-200 rounded-lg p-4", children: [_jsx("p", { className: "text-red-700 font-semibold", children: "Publishing Failed" }), _jsx("p", { className: "text-red-600 text-sm mt-1", children: publishError })] })), publishLogId && publishStatus && (_jsxs("div", { className: "space-y-3", children: [_jsx("h3", { className: "text-lg font-semibold text-gray-900", children: "Publishing Status" }), _jsxs("div", { className: "bg-gray-50 rounded-lg p-4", children: [_jsxs("div", { className: "flex items-center justify-between mb-2", children: [_jsxs("span", { className: "text-sm font-medium text-gray-700", children: [publishStatus === 'PENDING' && 'Queued for publishing', publishStatus === 'UPLOADING' && 'Uploading to ' + selectedPlatform, publishStatus === 'PUBLISHED' && 'Published!', publishStatus === 'FAILED' && 'Publishing failed'] }), _jsxs("span", { className: "text-sm font-semibold text-gray-900", children: [publishStatus === 'PENDING' && '10%', publishStatus === 'UPLOADING' && '50%', publishStatus === 'PUBLISHED' && '100%', publishStatus === 'FAILED' && '0%'] })] }), _jsx("div", { className: "w-full bg-gray-200 rounded-full h-2", children: _jsx("div", { className: `h-2 rounded-full transition-all duration-300 ${publishStatus === 'PUBLISHED'
                                                    ? 'bg-green-500'
                                                    : publishStatus === 'FAILED'
                                                        ? 'bg-red-500'
                                                        : 'bg-blue-500'}`, style: {
                                                    width: publishStatus === 'PENDING' ? '10%' : publishStatus === 'UPLOADING' ? '50%' : publishStatus === 'PUBLISHED' ? '100%' : '0%',
                                                } }) })] })] })), !publishLogId && (_jsxs(_Fragment, { children: [_jsxs("div", { className: "space-y-3", children: [_jsx("label", { className: "block text-sm font-semibold text-gray-900", children: "Select Platform" }), _jsx("div", { className: "grid grid-cols-2 gap-3", children: ['instagram', 'tiktok'].map((platform) => (_jsx("button", { onClick: () => {
                                                    setSelectedPlatform(platform);
                                                    setError(null);
                                                }, className: `p-4 border-2 rounded-lg font-semibold transition-all ${selectedPlatform === platform
                                                    ? 'border-blue-600 bg-blue-50 text-blue-900'
                                                    : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'}`, children: platform === 'instagram' ? '📷 Instagram' : '📱 TikTok' }, platform))) })] }), _jsxs("div", { className: "space-y-3", children: [_jsx("label", { className: "block text-sm font-semibold text-gray-900", children: "Account" }), loading ? (_jsx("div", { className: "flex items-center justify-center py-4", children: _jsx("div", { className: "inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600" }) })) : connectedAccount ? (_jsxs("div", { className: "p-4 bg-green-50 border border-green-200 rounded-lg", children: [_jsx("p", { className: "text-green-700 font-semibold", children: "\u2713 Connected" }), _jsxs("p", { className: "text-green-600 text-sm mt-1", children: ["@", connectedAccount.platformUsername] })] })) : (_jsxs("button", { onClick: handleConnectAccount, className: "w-full p-4 border-2 border-dashed border-gray-300 rounded-lg text-gray-700 hover:border-blue-500 hover:text-blue-600 font-semibold transition-colors", children: ["+ Connect ", selectedPlatform === 'instagram' ? 'Instagram' : 'TikTok', " Account"] }))] }), _jsxs("div", { className: "space-y-3", children: [_jsx("label", { className: "block text-sm font-semibold text-gray-900", children: "Caption" }), _jsx("textarea", { value: caption, onChange: (e) => setCaption(e.target.value.slice(0, maxCaptionLength)), placeholder: `Write a caption (max ${maxCaptionLength} characters)`, className: "w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none", rows: 4, maxLength: maxCaptionLength }), _jsxs("div", { className: "flex justify-between items-center text-sm", children: [_jsxs("span", { className: "text-gray-600", children: [caption.length, " / ", maxCaptionLength, " characters"] }), caption.length > maxCaptionLength * 0.9 && (_jsx("span", { className: "text-amber-600 font-semibold", children: "\u26A0 Getting close to limit" }))] })] }), _jsxs("div", { className: "space-y-3", children: [_jsx("label", { className: "block text-sm font-semibold text-gray-900", children: "Hashtags (optional)" }), _jsx("input", { type: "text", value: hashtags, onChange: (e) => setHashtags(e.target.value), placeholder: "Enter hashtags separated by commas (e.g. #reelforge, #creator, #video)", className: "w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" })] }), activeTab === 'scheduled' && (_jsxs("div", { className: "space-y-3", children: [_jsx("label", { className: "block text-sm font-semibold text-gray-900", children: "Schedule Date & Time" }), _jsx("input", { type: "datetime-local", value: scheduledAt, onChange: (e) => setScheduledAt(e.target.value ? new Date(e.target.value).toISOString() : ''), min: new Date().toISOString().slice(0, 16), className: "w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" })] }))] }))] }), _jsxs("div", { className: "sticky bottom-0 bg-gray-50 border-t border-gray-200 p-6 flex gap-3 justify-end", children: [_jsx("button", { onClick: onClose, disabled: publishing || publishStatus === 'UPLOADING', className: "px-4 py-2 text-gray-700 bg-gray-200 hover:bg-gray-300 rounded-lg font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed", children: "Close" }), !publishLogId && connectedAccount && (_jsx("button", { onClick: activeTab === 'immediate' ? handlePublish : handleSchedule, disabled: publishing, className: "px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2", children: publishing ? (_jsxs(_Fragment, { children: [_jsx("div", { className: "inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-white" }), activeTab === 'immediate' ? 'Publishing...' : 'Scheduling...'] })) : (activeTab === 'immediate' ? '🚀 Publish Now' : '📅 Schedule Publish') })), publishStatus === 'PUBLISHED' && (_jsx("button", { onClick: onClose, className: "px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold transition-colors", children: "Done" }))] })] }) }));
};
