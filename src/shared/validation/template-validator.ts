/**
 * Template Validation
 * Zod schemas for runtime validation of template documents
 */

import { z } from 'zod';
import { TemplateSchema, ContentSlot, Scene, SlotFill } from '../types/template';

const SlotConstraintsSchema = z.object({
  maxLength: z.number().optional(),
  minWidth: z.number().optional(),
  minHeight: z.number().optional(),
  accept: z.array(z.string()).optional(),
}).strict();

export const ContentSlotSchema = z.object({
  id: z.string().min(1),
  type: z.enum(['image', 'text', 'video', 'audio']),
  label: z.string().min(1),
  required: z.boolean(),
  placeholder: z.string().optional(),
  constraints: SlotConstraintsSchema.optional(),
}) as z.ZodType<ContentSlot>;

export const SlotFillSchema = z.object({
  slotId: z.string().min(1),
  type: z.enum(['image', 'text', 'video', 'audio']),
  value: z.string().min(1),
}) as z.ZodType<SlotFill>;

const SceneComponentSchema = z.object({
  componentId: z.string().min(1),
  zIndex: z.number().int().min(0),
  slotBindings: z.record(z.string()),
  props: z.record(z.unknown()),
}).strict();

export const SceneSchema = z.object({
  id: z.string().min(1),
  durationSeconds: z.number().positive(),
  components: z.array(SceneComponentSchema),
}) as z.ZodType<Scene>;

export const TemplateSchemaValidator = z.object({
  version: z.literal('1.0'),
  slots: z.array(ContentSlotSchema).min(1),
  scenes: z.array(SceneSchema).min(1),
  transitions: z.array(z.string()).optional(),
  defaultMusic: z.string().optional(),
  audioTags: z.array(z.string()).optional(),
}) as z.ZodType<TemplateSchema>;

/**
 * Validate a template schema document
 * @throws Zod error if validation fails
 */
export function validateTemplate(data: unknown): TemplateSchema {
  return TemplateSchemaValidator.parse(data);
}

/**
 * Validate a content slot
 * @throws Zod error if validation fails
 */
export function validateContentSlot(data: unknown): ContentSlot {
  return ContentSlotSchema.parse(data);
}

/**
 * Validate a slot fill
 * @throws Zod error if validation fails
 */
export function validateSlotFill(data: unknown): SlotFill {
  return SlotFillSchema.parse(data);
}

/**
 * Validate a scene
 * @throws Zod error if validation fails
 */
export function validateScene(data: unknown): Scene {
  return SceneSchema.parse(data);
}
