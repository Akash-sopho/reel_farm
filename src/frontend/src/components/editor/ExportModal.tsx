import React, { useEffect, useState } from 'react';
import { VideoPreview } from './VideoPreview';
import type { TemplateSchema, SlotFill } from '@/types/template';

export interface ExportModalProps {
  renderId: string;
  projectId: string;
  projectName: string;
  template: TemplateSchema;
  slotFills: SlotFill[];
  musicUrl?: string;
  onClose: () => void;
}

interface RenderStatus {
  id: string;
  projectId: string;
  userId: string;
  status: 'PENDING' | 'PROCESSING' | 'DONE' | 'FAILED';
  jobId?: string;
  minioKey?: string;
  outputUrl?: string;
  fileSizeBytes?: number;
  startedAt?: string;
  completedAt?: string;
  errorMessage?: string;
  errorCode?: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * ExportModal Component
 *
 * Shows the video preview with render progress. Polls render status and provides
 * download button when render is complete.
 */
export const ExportModal: React.FC<ExportModalProps> = ({
  renderId,
  projectId,
  projectName,
  template,
  slotFills,
  musicUrl,
  onClose,
}) => {
  const [renderStatus, setRenderStatus] = useState<RenderStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);

  // Poll render status
  useEffect(() => {
    let pollInterval: NodeJS.Timeout | null = null;
    let isMounted = true;

    const pollStatus = async () => {
      try {
        const res = await fetch(`/api/renders/${renderId}/status`);
        if (!res.ok) {
          if (res.status === 404) {
            setError('Render not found');
          } else {
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
      } catch (err) {
        if (isMounted) {
          setError(
            err instanceof Error
              ? err.message
              : 'Failed to fetch render status'
          );
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
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Download failed');
    } finally {
      setDownloading(false);
    }
  };

  const getProgressPercentage = (): number => {
    if (!renderStatus) return 0;
    if (renderStatus.status === 'DONE') return 100;
    if (renderStatus.status === 'PROCESSING') return 50;
    if (renderStatus.status === 'PENDING') return 10;
    return 0;
  };

  const getStatusText = (): string => {
    if (!renderStatus) return 'Loading...';
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

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 p-6 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Export Video</h2>
            <p className="text-sm text-gray-600 mt-1">{projectName}</p>
          </div>
          <button
            onClick={onClose}
            disabled={renderStatus?.status === 'PROCESSING'}
            className="text-gray-400 hover:text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed text-2xl"
          >
            ×
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Video Preview Section */}
          <div className="space-y-3">
            <h3 className="text-lg font-semibold text-gray-900">Preview</h3>
            <div className="bg-gray-50 rounded-lg overflow-hidden">
              <VideoPreview
                template={template}
                slotFills={slotFills}
                musicUrl={musicUrl}
              />
            </div>
          </div>

          {/* Status Section */}
          <div className="space-y-3">
            <h3 className="text-lg font-semibold text-gray-900">Render Status</h3>

            {error ? (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-red-700 font-semibold">Error</p>
                <p className="text-red-600 text-sm mt-1">{error}</p>
              </div>
            ) : loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            ) : renderStatus ? (
              <div className="space-y-4">
                {/* Progress Bar */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700">
                      {getStatusText()}
                    </span>
                    <span className="text-sm font-semibold text-gray-900">
                      {getProgressPercentage()}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full transition-all duration-300 ${
                        renderStatus.status === 'DONE'
                          ? 'bg-green-500'
                          : renderStatus.status === 'FAILED'
                            ? 'bg-red-500'
                            : 'bg-blue-500'
                      }`}
                      style={{ width: `${getProgressPercentage()}%` }}
                    ></div>
                  </div>
                </div>

                {/* Status Details */}
                <div className="bg-gray-50 rounded-lg p-4 space-y-2 text-sm text-gray-600">
                  <div className="flex justify-between">
                    <span>Status:</span>
                    <span className="font-semibold text-gray-900">
                      {renderStatus.status}
                    </span>
                  </div>

                  {renderStatus.fileSizeBytes && (
                    <div className="flex justify-between">
                      <span>File Size:</span>
                      <span className="font-semibold text-gray-900">
                        {(renderStatus.fileSizeBytes / 1024 / 1024).toFixed(2)} MB
                      </span>
                    </div>
                  )}

                  {renderStatus.startedAt && (
                    <div className="flex justify-between">
                      <span>Started:</span>
                      <span className="font-semibold text-gray-900">
                        {new Date(renderStatus.startedAt).toLocaleTimeString()}
                      </span>
                    </div>
                  )}

                  {renderStatus.completedAt && (
                    <div className="flex justify-between">
                      <span>Completed:</span>
                      <span className="font-semibold text-gray-900">
                        {new Date(renderStatus.completedAt).toLocaleTimeString()}
                      </span>
                    </div>
                  )}

                  {renderStatus.errorMessage && (
                    <div className="mt-3 bg-red-50 border border-red-200 rounded p-2">
                      <p className="text-red-700 text-xs font-mono">
                        {renderStatus.errorMessage}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            ) : null}
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 p-6 flex gap-3 justify-end">
          <button
            onClick={onClose}
            disabled={renderStatus?.status === 'PROCESSING'}
            className="px-4 py-2 text-gray-700 bg-gray-200 hover:bg-gray-300 rounded-lg font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Close
          </button>

          {renderStatus?.status === 'DONE' && (
            <button
              onClick={handleDownload}
              disabled={downloading}
              className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {downloading ? (
                <>
                  <div className="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Downloading...
                </>
              ) : (
                <>
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                    />
                  </svg>
                  Download MP4
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ExportModal;
