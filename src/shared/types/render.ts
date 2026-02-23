/**
 * Render Types
 * Defines the structure of video render jobs in ReelForge
 */

export type RenderStatus = 'PENDING' | 'PROCESSING' | 'DONE' | 'FAILED';

export interface Render {
  id: string;
  projectId: string;
  status: RenderStatus;
  outputUrl: string | null;
  errorMessage: string | null;
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
}
