/**
 * ReelForge Shared Types & Validation
 * Re-exports all types and validation functions
 */

// Type exports
export * from '../types/template';
export * from '../types/project';
export * from '../types/render';

// Validation exports
export {
  ContentSlotSchema,
  SceneSchema,
  TemplateSchemaValidator,
  SlotFillSchema,
  validateTemplate,
  validateContentSlot,
  validateSlotFill,
  validateScene,
} from '../validation/template-validator';
