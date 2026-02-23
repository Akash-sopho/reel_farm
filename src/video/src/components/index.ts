import { StaticImage } from './StaticImage';
import { KenBurnsImage } from './KenBurnsImage';
import { AnimatedText } from './AnimatedText';
import { FadeTransition } from './FadeTransition';
import { GrainOverlay } from './GrainOverlay';
import { TypewriterText } from './TypewriterText';

// Export all components
export { StaticImage } from './StaticImage';
export type { StaticImageProps } from './StaticImage';

export { KenBurnsImage } from './KenBurnsImage';
export type { KenBurnsImageProps } from './KenBurnsImage';

export { AnimatedText } from './AnimatedText';
export type { AnimatedTextProps } from './AnimatedText';

export { FadeTransition } from './FadeTransition';
export type { FadeTransitionProps } from './FadeTransition';

export { GrainOverlay } from './GrainOverlay';
export type { GrainOverlayProps } from './GrainOverlay';

export { TypewriterText } from './TypewriterText';
export type { TypewriterTextProps } from './TypewriterText';

// Component Registry - Maps component IDs to React components
export const COMPONENT_REGISTRY = {
  StaticImage,
  KenBurnsImage,
  AnimatedText,
  FadeTransition,
  GrainOverlay,
  TypewriterText,
} as const;

export type ComponentId = keyof typeof COMPONENT_REGISTRY;
