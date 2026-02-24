import { useState, useEffect, useRef } from 'react';
import { api, ApiError } from '@/utils/api';

interface MusicTrack {
  id: string;
  title: string;
  artist: string;
  durationSeconds: number;
  bpm?: number;
  mood: string;
  genre: string;
  tags: string[];
  isActive: boolean;
}

interface MusicPickerProps {
  projectId: string;
  onSelectTrack: (track: MusicTrack) => void;
  onClose: () => void;
}

const moods = ['happy', 'sad', 'energetic', 'calm', 'neutral'];
const genres = ['pop', 'hip-hop', 'ambient', 'electronic', 'acoustic', 'cinematic'];

export const MusicPicker: React.FC<MusicPickerProps> = ({
  projectId,
  onSelectTrack,
  onClose,
}) => {
  const [tracks, setTracks] = useState<MusicTrack[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [moodFilter, setMoodFilter] = useState('');
  const [genreFilter, setGenreFilter] = useState('');
  const [previewingId, setPreviewingId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  // Fetch tracks
  const fetchTracks = async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      if (moodFilter) params.append('mood', moodFilter);
      if (genreFilter) params.append('genre', genreFilter);
      params.append('limit', '50');

      const response = await api.get<{
        tracks: MusicTrack[];
        total: number;
        page: number;
        limit: number;
        pages: number;
      }>(`/music?${params.toString()}`);

      setTracks(response.tracks);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message || 'Failed to load tracks');
      } else {
        setError('Failed to load tracks');
      }
    } finally {
      setLoading(false);
    }
  };

  // Fetch tracks on filter change
  useEffect(() => {
    fetchTracks();
  }, [moodFilter, genreFilter]);

  // Handle preview button click
  const handlePreview = async (trackId: string) => {
    try {
      const response = await api.get<{
        trackId: string;
        previewUrl: string;
        durationSeconds: number;
        expiresAt: string;
      }>(`/music/${trackId}/preview`);

      if (audioRef.current) {
        audioRef.current.src = response.previewUrl;
        audioRef.current.play();
        setPreviewingId(trackId);
      }
    } catch (err) {
      console.error('Failed to load preview:', err);
    }
  };

  // Handle select track
  const handleSelectTrack = (track: MusicTrack) => {
    onSelectTrack(track);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-end z-50">
      <div className="w-full bg-white rounded-t-lg shadow-xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 sticky top-0 bg-white">
          <h2 className="text-xl font-bold text-gray-900">🎵 Add Music</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-2xl leading-none"
          >
            ×
          </button>
        </div>

        {/* Filters */}
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 sticky top-[69px] space-y-3">
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Mood
              </label>
              <select
                value={moodFilter}
                onChange={(e) => setMoodFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              >
                <option value="">All Moods</option>
                {moods.map((mood) => (
                  <option key={mood} value={mood}>
                    {mood.charAt(0).toUpperCase() + mood.slice(1)}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Genre
              </label>
              <select
                value={genreFilter}
                onChange={(e) => setGenreFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              >
                <option value="">All Genres</option>
                {genres.map((genre) => (
                  <option key={genre} value={genre}>
                    {genre.charAt(0).toUpperCase() + genre.slice(1)}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              {error}
            </div>
          )}

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin h-8 w-8 border-2 border-blue-600 border-t-transparent rounded-full" />
            </div>
          ) : tracks.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500">No tracks found</p>
            </div>
          ) : (
            <div className="space-y-2">
              {tracks.map((track) => (
                <div
                  key={track.id}
                  className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-gray-900 truncate">
                        {track.title}
                      </h3>
                      <p className="text-sm text-gray-600 truncate">
                        {track.artist}
                      </p>
                      <div className="flex gap-2 mt-2 flex-wrap">
                        <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
                          {track.mood}
                        </span>
                        <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded">
                          {track.genre}
                        </span>
                        {track.bpm && (
                          <span className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded">
                            {track.bpm} BPM
                          </span>
                        )}
                        <span className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded">
                          {Math.floor(track.durationSeconds / 60)}:{String(track.durationSeconds % 60).padStart(2, '0')}
                        </span>
                      </div>
                    </div>
                    <div className="flex gap-2 flex-shrink-0">
                      <button
                        onClick={() => handlePreview(track.id)}
                        className="px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded text-sm transition-colors"
                      >
                        {previewingId === track.id ? '⏸' : '▶'} Preview
                      </button>
                      <button
                        onClick={() => handleSelectTrack(track)}
                        className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded text-sm transition-colors"
                      >
                        Select
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Audio element */}
        <audio ref={audioRef} className="hidden" />
      </div>
    </div>
  );
};
