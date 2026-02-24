import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';

interface Project {
  id: string;
  name: string;
  templateId: string;
  status: string;
  filledSlots: number;
  requiredSlots: number;
  createdAt: string;
  updatedAt: string;
}

export const MyProjects: React.FC = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const response = await fetch('/api/projects');
        if (!response.ok) {
          throw new Error(`Failed to fetch projects: ${response.statusText}`);
        }
        const data = await response.json();
        setProjects(data.data || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    fetchProjects();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg text-gray-600">Loading projects...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg text-red-600">Error: {error}</div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">My Projects</h1>
        <p className="text-gray-600">
          {projects.length} project{projects.length !== 1 ? 's' : ''}
        </p>
      </div>

      {projects.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-600 mb-4">No projects yet. Start creating!</p>
          <Link
            to="/templates"
            className="inline-block px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Browse Templates
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map((project) => (
            <Link
              key={project.id}
              to={`/editor/${project.templateId}?projectId=${project.id}`}
              className="block p-4 border border-gray-200 rounded-lg hover:shadow-lg transition-shadow"
            >
              <h3 className="text-lg font-semibold text-gray-900 mb-2 truncate">
                {project.name}
              </h3>
              <div className="space-y-2 text-sm text-gray-600">
                <div>
                  <span className="font-medium">Status:</span> {project.status}
                </div>
                <div>
                  <span className="font-medium">Progress:</span> {project.filledSlots}/
                  {project.requiredSlots} slots filled
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all"
                    style={{
                      width: `${(project.filledSlots / project.requiredSlots) * 100}%`,
                    }}
                  />
                </div>
                <div className="text-xs text-gray-500">
                  Updated {formatDistanceToNow(new Date(project.updatedAt), { addSuffix: true })}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
