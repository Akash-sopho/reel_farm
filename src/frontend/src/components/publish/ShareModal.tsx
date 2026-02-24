import React, { useState, useEffect } from 'react';
import { api, ApiError } from '@/utils/api';

export interface ShareModalProps {
  projectId: string;
  renderId: string;
  projectName: string;
  onClose: () => void;
}

interface SocialAccount {
  id: string;
  platform: 'instagram' | 'tiktok';
  platformUsername: string;
  platformUserId: string;
  isActive: boolean;
  createdAt: string;
}

interface PublishResponse {
  publishLogId: string;
  status: 'PENDING';
  platform: string;
  message: string;
  scheduledAt?: string;
}

type Tab = 'immediate' | 'scheduled' | 'status';

export const ShareModal: React.FC<ShareModalProps> = ({
  projectId,
  renderId,
  projectName,
  onClose,
}) => {
  // State
  const [activeTab, setActiveTab] = useState<Tab>('immediate');
  const [socialAccounts, setSocialAccounts] = useState<SocialAccount[]>([]);
  const [selectedPlatform, setSelectedPlatform] = useState<'instagram' | 'tiktok'>('instagram');
  const [caption, setCaption] = useState('');
  const [hashtags, setHashtags] = useState('');
  const [scheduledAt, setScheduledAt] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [publishing, setPublishing] = useState(false);
  const [publishLogId, setPublishLogId] = useState<string | null>(null);
  const [publishStatus, setPublishStatus] = useState<'PENDING' | 'UPLOADING' | 'PUBLISHED' | 'FAILED' | null>(null);
  const [publishError, setPublishError] = useState<string | null>(null);

  // Fetch social accounts on mount
  useEffect(() => {
    fetchSocialAccounts();
  }, []);

  // Poll publish status
  useEffect(() => {
    if (!publishLogId) return;

    let pollInterval: NodeJS.Timeout | null = null;
    let isMounted = true;

    const pollStatus = async () => {
      try {
        const response = await api.get<{
          id: string;
          status: string;
          errorCode?: string;
          errorMessage?: string;
          publishedAt?: string;
        }>(`/publishes/${publishLogId}`);

        if (isMounted) {
          setPublishStatus(response.status as any);
          if (response.status === 'FAILED') {
            setPublishError(response.errorMessage || 'Publishing failed');
            if (pollInterval) {
              clearInterval(pollInterval);
              pollInterval = null;
            }
          } else if (response.status === 'PUBLISHED') {
            if (pollInterval) {
              clearInterval(pollInterval);
              pollInterval = null;
            }
          }
        }
      } catch (err) {
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

      const response = await api.get<{ accounts: SocialAccount[] }>('/social/accounts');
      setSocialAccounts(response.accounts);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message || 'Failed to load accounts');
      } else {
        setError('Failed to load accounts');
      }
    } finally {
      setLoading(false);
    }
  };

  const handlePublish = async () => {
    const account = socialAccounts.find(
      (a) => a.platform === selectedPlatform && a.isActive
    );

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

      const response = await api.post<PublishResponse>(`/projects/${projectId}/publish`, {
        platform: selectedPlatform,
        caption: caption || undefined,
        hashtags: hashtagArray.length > 0 ? hashtagArray : undefined,
      });

      setPublishLogId(response.publishLogId);
      setPublishStatus('PENDING');
      setActiveTab('status');
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message || 'Failed to publish');
      } else {
        setError('Failed to publish');
      }
    } finally {
      setPublishing(false);
    }
  };

  const handleSchedule = async () => {
    if (!scheduledAt) {
      setError('Please select a date and time');
      return;
    }

    const account = socialAccounts.find(
      (a) => a.platform === selectedPlatform && a.isActive
    );

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

      const response = await api.post<PublishResponse>(`/projects/${projectId}/schedule`, {
        platform: selectedPlatform,
        scheduledAt,
        caption: caption || undefined,
        hashtags: hashtagArray.length > 0 ? hashtagArray : undefined,
      });

      setPublishLogId(response.publishLogId);
      setPublishStatus('PENDING');
      setActiveTab('status');
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message || 'Failed to schedule publish');
      } else {
        setError('Failed to schedule publish');
      }
    } finally {
      setPublishing(false);
    }
  };

  const handleConnectAccount = async () => {
    try {
      setError(null);
      const response = await api.get<{ authUrl: string }>(`/social/auth/${selectedPlatform}`);
      // Redirect to OAuth provider
      window.location.href = response.authUrl;
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message || 'Failed to get authorization URL');
      } else {
        setError('Failed to get authorization URL');
      }
    }
  };

  const connectedAccount = socialAccounts.find(
    (a) => a.platform === selectedPlatform && a.isActive
  );

  const maxCaptionLength = selectedPlatform === 'instagram' ? 2200 : 150;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 p-6 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Share Video</h2>
            <p className="text-sm text-gray-600 mt-1">{projectName}</p>
          </div>
          <button
            onClick={onClose}
            disabled={publishing || publishStatus === 'UPLOADING'}
            className="text-gray-400 hover:text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed text-2xl"
          >
            ×
          </button>
        </div>

        {/* Tabs */}
        {!publishLogId && (
          <div className="border-b border-gray-200 bg-gray-50">
            <div className="flex">
              <button
                onClick={() => setActiveTab('immediate')}
                className={`flex-1 py-3 px-4 font-medium transition-colors ${
                  activeTab === 'immediate'
                    ? 'border-b-2 border-blue-600 text-blue-600 bg-white'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Publish Now
              </button>
              <button
                onClick={() => setActiveTab('scheduled')}
                className={`flex-1 py-3 px-4 font-medium transition-colors ${
                  activeTab === 'scheduled'
                    ? 'border-b-2 border-blue-600 text-blue-600 bg-white'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Schedule
              </button>
            </div>
          </div>
        )}

        {/* Content */}
        <div className="p-6 space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-red-700 font-semibold">Error</p>
              <p className="text-red-600 text-sm mt-1">{error}</p>
            </div>
          )}

          {publishStatus === 'PUBLISHED' && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <p className="text-green-700 font-semibold">✓ Published Successfully!</p>
              <p className="text-green-600 text-sm mt-1">Your video has been published to {selectedPlatform}.</p>
            </div>
          )}

          {publishStatus === 'FAILED' && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-red-700 font-semibold">Publishing Failed</p>
              <p className="text-red-600 text-sm mt-1">{publishError}</p>
            </div>
          )}

          {publishLogId && publishStatus && (
            <div className="space-y-3">
              <h3 className="text-lg font-semibold text-gray-900">Publishing Status</h3>
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700">
                    {publishStatus === 'PENDING' && 'Queued for publishing'}
                    {publishStatus === 'UPLOADING' && 'Uploading to ' + selectedPlatform}
                    {publishStatus === 'PUBLISHED' && 'Published!'}
                    {publishStatus === 'FAILED' && 'Publishing failed'}
                  </span>
                  <span className="text-sm font-semibold text-gray-900">
                    {publishStatus === 'PENDING' && '10%'}
                    {publishStatus === 'UPLOADING' && '50%'}
                    {publishStatus === 'PUBLISHED' && '100%'}
                    {publishStatus === 'FAILED' && '0%'}
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all duration-300 ${
                      publishStatus === 'PUBLISHED'
                        ? 'bg-green-500'
                        : publishStatus === 'FAILED'
                          ? 'bg-red-500'
                          : 'bg-blue-500'
                    }`}
                    style={{
                      width: publishStatus === 'PENDING' ? '10%' : publishStatus === 'UPLOADING' ? '50%' : publishStatus === 'PUBLISHED' ? '100%' : '0%',
                    }}
                  ></div>
                </div>
              </div>
            </div>
          )}

          {!publishLogId && (
            <>
              {/* Platform Selection */}
              <div className="space-y-3">
                <label className="block text-sm font-semibold text-gray-900">
                  Select Platform
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {(['instagram', 'tiktok'] as const).map((platform) => (
                    <button
                      key={platform}
                      onClick={() => {
                        setSelectedPlatform(platform);
                        setError(null);
                      }}
                      className={`p-4 border-2 rounded-lg font-semibold transition-all ${
                        selectedPlatform === platform
                          ? 'border-blue-600 bg-blue-50 text-blue-900'
                          : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                      }`}
                    >
                      {platform === 'instagram' ? '📷 Instagram' : '📱 TikTok'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Connected Account Info */}
              <div className="space-y-3">
                <label className="block text-sm font-semibold text-gray-900">
                  Account
                </label>
                {loading ? (
                  <div className="flex items-center justify-center py-4">
                    <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                  </div>
                ) : connectedAccount ? (
                  <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                    <p className="text-green-700 font-semibold">✓ Connected</p>
                    <p className="text-green-600 text-sm mt-1">@{connectedAccount.platformUsername}</p>
                  </div>
                ) : (
                  <button
                    onClick={handleConnectAccount}
                    className="w-full p-4 border-2 border-dashed border-gray-300 rounded-lg text-gray-700 hover:border-blue-500 hover:text-blue-600 font-semibold transition-colors"
                  >
                    + Connect {selectedPlatform === 'instagram' ? 'Instagram' : 'TikTok'} Account
                  </button>
                )}
              </div>

              {/* Caption Input */}
              <div className="space-y-3">
                <label className="block text-sm font-semibold text-gray-900">
                  Caption
                </label>
                <textarea
                  value={caption}
                  onChange={(e) => setCaption(e.target.value.slice(0, maxCaptionLength))}
                  placeholder={`Write a caption (max ${maxCaptionLength} characters)`}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  rows={4}
                  maxLength={maxCaptionLength}
                />
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-600">
                    {caption.length} / {maxCaptionLength} characters
                  </span>
                  {caption.length > maxCaptionLength * 0.9 && (
                    <span className="text-amber-600 font-semibold">⚠ Getting close to limit</span>
                  )}
                </div>
              </div>

              {/* Hashtags Input */}
              <div className="space-y-3">
                <label className="block text-sm font-semibold text-gray-900">
                  Hashtags (optional)
                </label>
                <input
                  type="text"
                  value={hashtags}
                  onChange={(e) => setHashtags(e.target.value)}
                  placeholder="Enter hashtags separated by commas (e.g. #reelforge, #creator, #video)"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Scheduled Time Input (for scheduled tab) */}
              {activeTab === 'scheduled' && (
                <div className="space-y-3">
                  <label className="block text-sm font-semibold text-gray-900">
                    Schedule Date & Time
                  </label>
                  <input
                    type="datetime-local"
                    value={scheduledAt}
                    onChange={(e) => setScheduledAt(e.target.value ? new Date(e.target.value).toISOString() : '')}
                    min={new Date().toISOString().slice(0, 16)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 p-6 flex gap-3 justify-end">
          <button
            onClick={onClose}
            disabled={publishing || publishStatus === 'UPLOADING'}
            className="px-4 py-2 text-gray-700 bg-gray-200 hover:bg-gray-300 rounded-lg font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Close
          </button>

          {!publishLogId && connectedAccount && (
            <button
              onClick={activeTab === 'immediate' ? handlePublish : handleSchedule}
              disabled={publishing}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {publishing ? (
                <>
                  <div className="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  {activeTab === 'immediate' ? 'Publishing...' : 'Scheduling...'}
                </>
              ) : (
                activeTab === 'immediate' ? '🚀 Publish Now' : '📅 Schedule Publish'
              )}
            </button>
          )}

          {publishStatus === 'PUBLISHED' && (
            <button
              onClick={onClose}
              className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold transition-colors"
            >
              Done
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
