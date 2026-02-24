import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { Template } from '@/types/template';
import { Project, SlotFill } from '@/types/project';
import { createDebouncedCallback } from '@/utils/debounce';
import { VideoPreview } from '@/components/editor/VideoPreview';
import { ExportModal } from '@/components/editor/ExportModal';
import { TextSuggestionButton } from '@/components/editor/TextSuggestionButton';
import { ImageSuggestionButton } from '@/components/editor/ImageSuggestionButton';
import { MusicPicker } from '@/components/editor/MusicPicker';

interface Scene {
  id: string;
  durationSeconds: number;
  components: any[];
}

export const Editor: React.FC = () => {
  const { templateId } = useParams<{ templateId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const projectIdFromQuery = searchParams.get('projectId');

  // State
  const [project, setProject] = useState<Project | null>(null);
  const [template, setTemplate] = useState<Template | null>(null);
  const [activeSceneIndex, setActiveSceneIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState<string | null>(null);
  const [showExportModal, setShowExportModal] = useState(false);
  const [renderId, setRenderId] = useState<string | null>(null);
  const [renderError, setRenderError] = useState<string | null>(null);
  const [showMusicPicker, setShowMusicPicker] = useState(false);
  const [selectedTrackName, setSelectedTrackName] = useState<string | null>(null);

  const fileInputRefs = useRef<{ [key: string]: HTMLInputElement }>({});
  const debouncedUpdateRef = useRef<any>(null);

  // Initialize debounced update function
  useEffect(() => {
    debouncedUpdateRef.current = createDebouncedCallback(updateProjectSlots, 500);
    return () => {
      debouncedUpdateRef.current?.cancel();
    };
  }, []);

  // Handle music selection
  const handleSelectMusic = async (track: any) => {
    if (!project) return;

    try {
      const res = await fetch(`/api/projects/${project.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ musicUrl: track.url }),
      });

      if (!res.ok) throw new Error('Failed to update music');
      const updated = await res.json();
      setProject(updated);
      setSelectedTrackName(track.title);
    } catch (err) {
      console.error('Failed to select music:', err);
      alert('Failed to select music');
    }
  };

  // Handle clear music
  const handleClearMusic = async () => {
    if (!project) return;

    try {
      const res = await fetch(`/api/projects/${project.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ musicUrl: null }),
      });

      if (!res.ok) throw new Error('Failed to clear music');
      const updated = await res.json();
      setProject(updated);
      setSelectedTrackName(null);
    } catch (err) {
      console.error('Failed to clear music:', err);
      alert('Failed to clear music');
    }
  };

  // Create or load project on mount
  useEffect(() => {
    const initializeProject = async () => {
      try {
        setLoading(true);
        setError(null);

        // If projectId is in query params, load existing project
        if (projectIdFromQuery) {
          const projectRes = await fetch(`/api/projects/${projectIdFromQuery}`);
          if (!projectRes.ok) throw new Error('Project not found');
          const projectData = await projectRes.json();
          setProject(projectData);

          // Fetch template using the project's templateId
          const templateRes = await fetch(`/api/templates/${projectData.templateId}`);
          if (!templateRes.ok) throw new Error('Template not found');
          const templateData = await templateRes.json();
          setTemplate(templateData);

          // Set selected track name if music is already set
          if (projectData.musicUrl) {
            const match = projectData.musicUrl.match(/music\/([^\/]+)\.mp3/);
            if (match) {
              setSelectedTrackName(match[1]);
            }
          }
        } else {
          // Create new project from template
          const templateRes = await fetch(`/api/templates/${templateId}`);
          if (!templateRes.ok) throw new Error('Template not found');
          const templateData = await templateRes.json();
          setTemplate(templateData);

          const projectRes = await fetch('/api/projects', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              templateId,
              name: `${templateData.name} - ${new Date().toLocaleString()}`,
            }),
          });

          if (!projectRes.ok) throw new Error('Failed to create project');
          const projectData = await projectRes.json();
          setProject(projectData);

          // Set selected track name if music is already set
          if (projectData.musicUrl) {
            const match = projectData.musicUrl.match(/music\/([^\/]+)\.mp3/);
            if (match) {
              setSelectedTrackName(match[1]);
            }
          }

          // Update URL with projectId
          window.history.replaceState(null, '', `/editor/${templateId}?projectId=${projectData.id}`);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to initialize editor');
      } finally {
        setLoading(false);
      }
    };

    if (templateId) {
      initializeProject();
    }
  }, [templateId, projectIdFromQuery]);

  // Update project slots via API (debounced)
  async function updateProjectSlots(slotFills: SlotFill[]) {
    if (!project) return;

    try {
      const res = await fetch(`/api/projects/${project.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slotFills }),
      });

      if (!res.ok) throw new Error('Failed to update project');
      const updated = await res.json();
      setProject(updated);
    } catch (err) {
      console.error('Failed to update slots:', err);
    }
  }

  // Handle slot fill change
  const handleSlotChange = (slotId: string, value: string) => {
    if (!project) return;

    const updatedFills = project.slotFills.filter((f) => f.slotId !== slotId);
    const slot = template?.schema.slots.find((s: any) => s.id === slotId);

    if (slot && value.trim()) {
      updatedFills.push({
        slotId,
        type: slot.type,
        value,
      });
    }

    setProject({ ...project, slotFills: updatedFills });
    debouncedUpdateRef.current?.call(updatedFills);
  };

  // Handle file upload
  const handleFileUpload = async (slotId: string, file: File) => {
    if (!file) return;

    try {
      setUploading(slotId);

      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/media/upload', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) throw new Error('Failed to upload file');
      const { url } = await res.json();

      // Update slot with image URL
      handleSlotChange(slotId, url);
    } catch (err) {
      console.error('Upload error:', err);
      alert('Failed to upload file');
    } finally {
      setUploading(null);
    }
  };

  // Trigger file input
  const triggerFileInput = (slotId: string) => {
    fileInputRefs.current[slotId]?.click();
  };

  // Generate video (trigger render)
  const handleGenerateVideo = async () => {
    if (!project || project.status !== 'ready') {
      setRenderError('Project must be ready to render');
      return;
    }

    try {
      setRenderError(null);
      const res = await fetch(`/api/projects/${project.id}/render`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(
          errorData.error || 'Failed to start render'
        );
      }

      const renderData = await res.json();
      setRenderId(renderData.id);
      setShowExportModal(true);
    } catch (err) {
      setRenderError(
        err instanceof Error ? err.message : 'Failed to start render'
      );
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
          <p className="text-gray-600">Loading editor...</p>
        </div>
      </div>
    );
  }

  if (error || !project || !template) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow p-8 max-w-md">
          <h2 className="text-xl font-bold text-red-600 mb-2">Error</h2>
          <p className="text-gray-700 mb-4">{error || 'Failed to load editor'}</p>
          <button
            onClick={() => navigate('/templates')}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg"
          >
            Back to Templates
          </button>
        </div>
      </div>
    );
  }

  const scenes = (template.schema.scenes as Scene[]) || [];
  const activeScene = scenes[activeSceneIndex];
  const sceneSlots = activeScene
    ? (template.schema.slots as any[]).filter((slot: any) => {
        // Check if slot is used in this scene
        return activeScene.components.some((comp: any) =>
          Object.values(comp.slotBindings || {}).includes(slot.id)
        );
      })
    : [];

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{template.name}</h1>
            <p className="text-sm text-gray-600 mt-1">
              Filled slots: {project.filledSlots} / {project.requiredSlots}
            </p>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/templates')}
              className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg font-semibold transition-colors"
            >
              Back
            </button>
            <button
              onClick={() => setShowMusicPicker(true)}
              className="px-4 py-2 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-lg font-semibold transition-colors"
            >
              {selectedTrackName ? `🎵 ${selectedTrackName}` : '🎵 Add Music'}
              {selectedTrackName && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleClearMusic();
                  }}
                  className="ml-2 text-blue-600 hover:text-blue-800 text-sm"
                >
                  ×
                </button>
              )}
            </button>
            <button
              onClick={handleGenerateVideo}
              disabled={project.status !== 'ready'}
              className={`px-6 py-2 rounded-lg font-semibold transition-colors ${
                project.status === 'ready'
                  ? 'bg-green-600 hover:bg-green-700 text-white cursor-pointer'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
            >
              Generate Video
            </button>
          </div>
        </div>
      </div>

      {/* Main Layout: Three Panels */}
      <div className="flex h-[calc(100vh-100px)]">
        {/* Left Panel: Scene List (250px) */}
        <div className="w-[250px] bg-white border-r border-gray-200 overflow-y-auto">
          <div className="p-4">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Scenes</h2>
            <div className="space-y-2">
              {scenes.map((scene, idx) => (
                <button
                  key={scene.id}
                  onClick={() => setActiveSceneIndex(idx)}
                  className={`w-full text-left px-3 py-2 rounded-lg font-medium transition-colors ${
                    activeSceneIndex === idx
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span>Scene {idx + 1}</span>
                    <div className="flex gap-1">
                      {sceneSlots.slice(0, 3).map((slot: any) => {
                        const filled = project.slotFills.some(
                          (f) => f.slotId === slot.id && f.value
                        );
                        return (
                          <div
                            key={slot.id}
                            className={`w-2 h-2 rounded-full ${
                              filled ? 'bg-green-400' : 'bg-gray-300'
                            }`}
                          />
                        );
                      })}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Center Panel: Video Preview */}
        <div className="flex-1 bg-gray-50 p-8">
          <VideoPreview
            template={template.schema}
            slotFills={project.slotFills}
            musicUrl={project.musicUrl || undefined}
          />
        </div>

        {/* Right Panel: Slot Editor (320px) */}
        <div className="w-[320px] bg-white border-l border-gray-200 overflow-y-auto">
          <div className="p-4">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Edit Slots</h2>

            {sceneSlots.length === 0 ? (
              <p className="text-gray-500 text-sm">No slots in this scene</p>
            ) : (
              <div className="space-y-4">
                {sceneSlots.map((slot: any) => {
                  const fill = project.slotFills.find((f) => f.slotId === slot.id);
                  const isFilled = fill && fill.value;
                  const isImage = slot.type === 'image';
                  const isText = slot.type === 'text';

                  return (
                    <div key={slot.id} className="border border-gray-200 rounded-lg p-3">
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        {slot.label}
                        {slot.required && <span className="text-red-500"> *</span>}
                      </label>

                      {isImage ? (
                        <div className="space-y-2">
                          <div className="flex gap-2">
                            <button
                              onClick={() => triggerFileInput(slot.id)}
                              disabled={uploading === slot.id}
                              className={`flex-1 py-2 px-3 border-2 border-dashed rounded-lg font-medium transition-colors ${
                                isFilled
                                  ? 'border-green-400 bg-green-50 text-green-700'
                                  : 'border-gray-300 bg-gray-50 text-gray-700 hover:border-blue-400'
                              } ${uploading === slot.id ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                            >
                              {uploading === slot.id
                                ? 'Uploading...'
                                : isFilled
                                  ? '✓ Change Image'
                                  : '+ Upload Image'}
                            </button>
                            <ImageSuggestionButton
                              projectId={project.id}
                              slotId={slot.id}
                              onImageSelect={(imageUrl) => handleSlotChange(slot.id, imageUrl)}
                            />
                          </div>
                          <input
                            ref={(ref) => {
                              if (ref) fileInputRefs.current[slot.id] = ref;
                            }}
                            type="file"
                            accept="image/*"
                            onChange={(e) => {
                              if (e.target.files?.[0]) {
                                handleFileUpload(slot.id, e.target.files[0]);
                              }
                            }}
                            className="hidden"
                          />
                          {isFilled && (
                            <p className="text-xs text-gray-600 mt-2 truncate">
                              ✓ Uploaded
                            </p>
                          )}
                        </div>
                      ) : isText ? (
                        <div className="space-y-2">
                          <textarea
                            value={fill?.value || ''}
                            onChange={(e) => handleSlotChange(slot.id, e.target.value)}
                            onBlur={() => {
                              // Ensure update is sent even if no more changes
                              if (debouncedUpdateRef.current) {
                                debouncedUpdateRef.current.call(project.slotFills);
                              }
                            }}
                            maxLength={slot.constraints?.maxLength || 500}
                            placeholder={slot.placeholder || 'Enter text'}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                            rows={3}
                          />
                          <TextSuggestionButton
                            projectId={project.id}
                            slotId={slot.id}
                            onSuggestionSelect={(suggestion) => handleSlotChange(slot.id, suggestion)}
                            hint={slot.description}
                          />
                        </div>
                      ) : null}

                      {slot.constraints?.maxLength && isText && (
                        <p className="text-xs text-gray-500 mt-1">
                          {(fill?.value || '').length} / {slot.constraints.maxLength}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Render error notification */}
      {renderError && (
        <div className="fixed bottom-4 right-4 bg-red-500 text-white px-4 py-3 rounded-lg shadow-lg max-w-md">
          <div className="flex items-start gap-3">
            <svg
              className="w-5 h-5 flex-shrink-0 mt-0.5"
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
              <p className="font-semibold">Render Error</p>
              <p className="text-sm mt-1">{renderError}</p>
            </div>
            <button
              onClick={() => setRenderError(null)}
              className="text-white hover:text-red-200"
            >
              ×
            </button>
          </div>
        </div>
      )}

      {/* Music Picker Modal */}
      {showMusicPicker && project && (
        <MusicPicker
          projectId={project.id}
          onSelectTrack={handleSelectMusic}
          onClose={() => setShowMusicPicker(false)}
        />
      )}

      {/* Export Modal */}
      {showExportModal && template && project && renderId && (
        <ExportModal
          renderId={renderId}
          projectId={project.id}
          projectName={project.name}
          template={template.schema}
          slotFills={project.slotFills}
          musicUrl={project.musicUrl || undefined}
          onClose={() => {
            setShowExportModal(false);
            setRenderId(null);
          }}
        />
      )}
    </div>
  );
};
