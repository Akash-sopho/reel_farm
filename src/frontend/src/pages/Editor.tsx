import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Template } from '@/types/template';
import { Project, SlotFill } from '@/types/project';
import { createDebouncedCallback } from '@/utils/debounce';
import { VideoPreview } from '@/components/editor/VideoPreview';

interface Scene {
  id: string;
  durationSeconds: number;
  components: any[];
}

export const Editor: React.FC = () => {
  const { templateId } = useParams<{ templateId: string }>();
  const navigate = useNavigate();

  // State
  const [project, setProject] = useState<Project | null>(null);
  const [template, setTemplate] = useState<Template | null>(null);
  const [activeSceneIndex, setActiveSceneIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState<string | null>(null);

  const fileInputRefs = useRef<{ [key: string]: HTMLInputElement }>({});
  const debouncedUpdateRef = useRef<any>(null);

  // Initialize debounced update function
  useEffect(() => {
    debouncedUpdateRef.current = createDebouncedCallback(updateProjectSlots, 500);
    return () => {
      debouncedUpdateRef.current?.cancel();
    };
  }, []);

  // Create or load project on mount
  useEffect(() => {
    const initializeProject = async () => {
      try {
        setLoading(true);
        setError(null);

        // Fetch template first
        const templateRes = await fetch(`/api/templates/${templateId}`);
        if (!templateRes.ok) throw new Error('Template not found');
        const templateData = await templateRes.json();
        setTemplate(templateData);

        // Create or get project - for now we create a new one
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

        // Update URL with projectId
        window.history.replaceState(null, '', `/editor/${templateId}?projectId=${projectData.id}`);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to initialize editor');
      } finally {
        setLoading(false);
      }
    };

    if (templateId) {
      initializeProject();
    }
  }, [templateId]);

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

  // Generate video (navigate to render page)
  const handleGenerateVideo = () => {
    if (!project || project.status !== 'ready') {
      alert('Project must be ready to render');
      return;
    }
    // TODO: Navigate to render/download page once implemented
    alert('Render feature coming soon');
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
                        <div>
                          <button
                            onClick={() => triggerFileInput(slot.id)}
                            disabled={uploading === slot.id}
                            className={`w-full py-2 px-3 border-2 border-dashed rounded-lg font-medium transition-colors ${
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
    </div>
  );
};
