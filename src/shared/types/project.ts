/**
 * Project Types
 * Defines the structure of user projects in ReelForge
 */

import { SlotFill } from './template';

export type ProjectStatus = 'draft' | 'ready' | 'rendering' | 'done';

export interface Project {
  id: string;
  userId: string;
  templateId: string;
  name: string;
  slotFills: SlotFill[];
  musicUrl: string | null;
  settings: Record<string, unknown>;
  status: ProjectStatus;
  createdAt: string;
  updatedAt: string;
}
