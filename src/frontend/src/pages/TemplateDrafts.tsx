import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

interface DraftTemplate {
  id: string;
  name: string;
  category: string;
  description: string;
  isPublished: boolean;
  extractionStatus: string;
  extractedFromVideoId: string;
  sceneCount: number;
  slotCount: number;
  createdAt: string;
  completedAt?: string;
  quality?: {
    score: number;
    issues: string[];
  };
}

interface DraftsResponse {
  drafts: DraftTemplate[];
  total: number;
  page: number;
  limit: number;
  pages: number;
}

/**
 * Template Drafts Page
 *
 * List and manage unpublished extracted templates
 */
export const TemplateDrafts = () => {
  const navigate = useNavigate();
  const [drafts, setDrafts] = useState<DraftTemplate[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedStatus, setSelectedStatus] = useState<string>('');
  const [publishingId, setPublishingId] = useState<string | null>(null);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [showRejectModal, setShowRejectModal] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  const limit = 12;

  // Fetch drafts
  useEffect(() => {
    const fetchDrafts = async () => {
      try {
        setLoading(true);
        setError(null);

        const params = new URLSearchParams({
          page: page.toString(),
          limit: limit.toString(),
        });

        if (selectedStatus) {
          params.append('status', selectedStatus);
        }

        const res = await fetch(`/api/templates/drafts?${params}`);
        if (!res.ok) throw new Error('Failed to fetch drafts');

        const data: DraftsResponse = await res.json();
        setDrafts(data.drafts);
        setTotalPages(data.pages);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch drafts');
      } finally {
        setLoading(false);
      }
    };

    fetchDrafts();
  }, [page, selectedStatus]);

  const handlePublish = async (templateId: string) => {
    try {
      setPublishingId(templateId);
      setError(null);

      const res = await fetch(`/api/templates/${templateId}/publish`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'publish' }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to publish template');
      }

      // Refresh drafts
      setDrafts((prev) => prev.filter((d) => d.id !== templateId));
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to publish template');
    } finally {
      setPublishingId(null);
    }
  };

  const handleReject = async (templateId: string) => {
    try {
      setRejectingId(templateId);
      setError(null);

      const res = await fetch(`/api/templates/${templateId}/publish`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'reject',
          reason: rejectReason || 'Rejected by supervisor',
        }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to reject template');
      }

      // Refresh drafts
      setDrafts((prev) => prev.filter((d) => d.id !== templateId));
      setShowRejectModal(null);
      setRejectReason('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reject template');
    } finally {
      setRejectingId(null);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'EXTRACTING':
        return 'bg-blue-100 text-blue-800';
      case 'COMPLETED':
        return 'bg-green-100 text-green-800';
      case 'FAILED':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getQualityColor = (score: number) => {
    if (score >= 0.8) return 'text-green-600';
    if (score >= 0.6) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="px-6 py-4 flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Template Drafts</h1>
            <p className="text-sm text-gray-600 mt-1">
              Review and publish extracted templates
            </p>
          </div>
          <button
            onClick={() => navigate('/collect')}
            className="px-4 py-2 bg-gray-500 text-white font-semibold rounded-lg hover:bg-gray-600 transition-colors"
          >
            Back to Collection
          </button>
        </div>
      </div>

      {/* Error banner */}
      {error && (
        <div className="bg-red-50 border-b border-red-200 p-4">
          <div className="flex items-start gap-3">
            <svg
              className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                clipRule="evenodd"
              />
            </svg>
            <div className="flex-1">
              <p className="text-red-800 font-semibold">Error</p>
              <p className="text-red-700 text-sm mt-1">{error}</p>
            </div>
            <button
              onClick={() => setError(null)}
              className="text-red-400 hover:text-red-600"
            >
              ×
            </button>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white border-b border-gray-200 p-4">
        <div className="flex gap-4 items-center">
          <label className="font-semibold text-gray-700">Status:</label>
          <select
            value={selectedStatus}
            onChange={(e) => {
              setSelectedStatus(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 border border-gray-300 rounded-lg bg-white"
          >
            <option value="">All</option>
            <option value="EXTRACTING">Extracting</option>
            <option value="COMPLETED">Completed</option>
            <option value="FAILED">Failed</option>
          </select>
        </div>
      </div>

      {/* Main content */}
      <div className="p-6">
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin">
              <svg className="w-8 h-8 text-blue-500" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
            </div>
          </div>
        ) : drafts.length === 0 ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
              <p className="text-gray-500 font-semibold">No templates to review</p>
              <p className="text-gray-400 text-sm mt-1">Extract templates from collected videos to see them here</p>
            </div>
          </div>
        ) : (
          <div>
            {/* Template grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
              {drafts.map((draft) => (
                <div key={draft.id} className="bg-white rounded-lg shadow-md p-4">
                  {/* Header */}
                  <div className="flex justify-between items-start mb-3">
                    <h3 className="font-semibold text-gray-900 flex-1">{draft.name}</h3>
                    <span className={`px-2 py-1 rounded text-xs font-semibold ${getStatusColor(draft.extractionStatus)}`}>
                      {draft.extractionStatus}
                    </span>
                  </div>

                  {/* Details */}
                  <div className="space-y-2 mb-4 text-sm text-gray-600">
                    <p>
                      <span className="font-semibold">Category:</span> {draft.category}
                    </p>
                    <p>
                      <span className="font-semibold">Scenes:</span> {draft.sceneCount}
                    </p>
                    <p>
                      <span className="font-semibold">Slots:</span> {draft.slotCount}
                    </p>

                    {/* Quality score */}
                    {draft.quality && (
                      <div>
                        <span className="font-semibold">Quality: </span>
                        <span className={`font-bold ${getQualityColor(draft.quality.score)}`}>
                          {(draft.quality.score * 100).toFixed(0)}%
                        </span>
                      </div>
                    )}

                    {/* Issues */}
                    {draft.quality?.issues && draft.quality.issues.length > 0 && (
                      <div>
                        <p className="font-semibold text-yellow-700">Issues:</p>
                        <ul className="list-disc list-inside text-yellow-600 text-xs">
                          {draft.quality.issues.map((issue, idx) => (
                            <li key={idx}>{issue}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  {draft.extractionStatus === 'COMPLETED' && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => handlePublish(draft.id)}
                        disabled={publishingId === draft.id}
                        className="flex-1 px-3 py-2 bg-green-500 text-white text-sm font-semibold rounded hover:bg-green-600 disabled:bg-green-300 transition-colors"
                      >
                        {publishingId === draft.id ? 'Publishing...' : 'Publish'}
                      </button>
                      <button
                        onClick={() => setShowRejectModal(draft.id)}
                        disabled={rejectingId === draft.id}
                        className="flex-1 px-3 py-2 bg-red-500 text-white text-sm font-semibold rounded hover:bg-red-600 disabled:bg-red-300 transition-colors"
                      >
                        {rejectingId === draft.id ? 'Rejecting...' : 'Reject'}
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex justify-center gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50"
                >
                  Previous
                </button>
                <span className="px-4 py-2 text-gray-600">
                  Page {page} of {totalPages}
                </span>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Reject modal */}
      {showRejectModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-sm w-full mx-4">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Reject Template</h3>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Optional reason for rejection"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg mb-4 resize-none h-24"
            />
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setShowRejectModal(null);
                  setRejectReason('');
                }}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={() => handleReject(showRejectModal)}
                className="flex-1 px-4 py-2 bg-red-500 text-white font-semibold rounded-lg hover:bg-red-600"
              >
                Reject
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TemplateDrafts;
