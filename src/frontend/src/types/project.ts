import { Template } from './template';

export interface SlotFill {
  slotId: string;
  type: 'image' | 'text' | 'video' | 'audio';
  value: string;
}

export interface Project {
  id: string;
  userId: string;
  templateId: string;
  name: string;
  status: 'draft' | 'ready' | 'rendering' | 'done' | 'published';
  slotFills: SlotFill[];
  musicUrl?: string;
  settings: Record<string, unknown>;
  template: Template;
  filledSlots: number;
  requiredSlots: number;
  createdAt: string;
  updatedAt: string;
}
