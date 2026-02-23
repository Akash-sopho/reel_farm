// Component Registry - Maps component IDs to React components
// Phase 1 components will be added here as they are developed

export const COMPONENT_REGISTRY = {
  // Components will be registered here
  // e.g., 'StaticImage': StaticImageComponent
} as const;

export type ComponentId = keyof typeof COMPONENT_REGISTRY;
