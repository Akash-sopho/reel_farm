interface CollectedVideo {
  id: string;
  sourceUrl: string;
  platform: 'instagram' | 'tiktok';
  title?: string;
  caption?: string;
  durationSeconds?: number;
  videoUrl?: string;
  thumbnailUrl?: string;
  tags: string[];
  status: 'PENDING' | 'FETCHING' | 'READY' | 'FAILED';
  errorMessage?: string;
  createdAt: string;
}

interface CollectionGridProps {
  videos: CollectedVideo[];
  selectedVideoId?: string;
  onSelectVideo: (video: CollectedVideo) => void;
  getStatusColor: (status: string) => string;
  getStatusText: (status: string) => string;
}

/**
 * CollectionGrid Component
 *
 * Center panel displaying collected videos with real-time status
 */
export const CollectionGrid = ({
  videos,
  selectedVideoId,
  onSelectVideo,
  getStatusColor,
  getStatusText,
}: CollectionGridProps) => {
  return (
    <div>
      <h2 className="text-lg font-bold text-gray-900 mb-4">
        Collected Videos ({videos.length})
      </h2>

      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {videos.map((video) => (
          <div
            key={video.id}
            onClick={() => onSelectVideo(video)}
            className={`bg-white rounded-lg overflow-hidden shadow-md cursor-pointer transition-all hover:shadow-lg ${
              selectedVideoId === video.id ? 'ring-2 ring-blue-500' : ''
            }`}
          >
            {/* Thumbnail */}
            <div className="relative w-full h-32 bg-gray-200 flex items-center justify-center overflow-hidden">
              {video.thumbnailUrl ? (
                <img
                  src={video.thumbnailUrl}
                  alt={video.title || 'Video'}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="flex flex-col items-center justify-center text-gray-400">
                  <svg
                    className="w-8 h-8 mb-2"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"
                    />
                  </svg>
                  <span className="text-xs">{video.platform}</span>
                </div>
              )}

              {/* Status badge */}
              <div className={`absolute top-2 right-2 px-2 py-1 rounded text-xs font-semibold ${getStatusColor(video.status)}`}>
                {getStatusText(video.status)}
              </div>

              {/* Platform indicator */}
              <div className="absolute top-2 left-2 px-2 py-1 rounded text-xs font-semibold bg-gray-800 text-white">
                {video.platform === 'instagram' ? 'IG' : 'TT'}
              </div>
            </div>

            {/* Content */}
            <div className="p-3">
              {/* Title */}
              <h3 className="font-semibold text-gray-900 text-sm truncate">
                {video.title || 'Untitled'}
              </h3>

              {/* Duration */}
              {video.durationSeconds && (
                <p className="text-xs text-gray-500 mt-1">
                  {Math.floor(video.durationSeconds)}s
                </p>
              )}

              {/* Tags */}
              {video.tags.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {video.tags.slice(0, 2).map((tag) => (
                    <span
                      key={tag}
                      className="inline-block bg-blue-100 text-blue-700 text-xs px-2 py-1 rounded"
                    >
                      {tag}
                    </span>
                  ))}
                  {video.tags.length > 2 && (
                    <span className="inline-block bg-gray-100 text-gray-700 text-xs px-2 py-1 rounded">
                      +{video.tags.length - 2}
                    </span>
                  )}
                </div>
              )}

              {/* Error message */}
              {video.status === 'FAILED' && video.errorMessage && (
                <p className="text-xs text-red-600 mt-2 truncate">
                  Error: {video.errorMessage}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default CollectionGrid;
