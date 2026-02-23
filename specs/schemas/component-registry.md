# Component Registry Specification

## Overview

This document defines all available Remotion components in ReelForge's component library. Each component is registered by a string ID and can be referenced in template schemas via the `componentId` field.

---

## Component List

### 1. StaticImage

**ID:** `StaticImage`

**Description:** Renders a full-bleed image with configurable object-fit and opacity.

**Props Interface:**
```typescript
interface StaticImageProps {
  src?: string;                    // Image URL
  objectFit?: 'cover' | 'contain' | 'fill';  // Default: 'cover'
  opacity?: number;                // 0-1, default: 1
}
```

**Usage Example:**
```json
{
  "componentId": "StaticImage",
  "zIndex": 0,
  "slotBindings": { "src": "photo-1" },
  "props": { "objectFit": "cover", "opacity": 0.8 }
}
```

**Behavior:**
- Displays image from `src` URL
- If `src` is empty, shows grey placeholder box
- `objectFit` controls how image fills the container
- `opacity` controls transparency (0 = invisible, 1 = opaque)

---

### 2. KenBurnsImage

**ID:** `KenBurnsImage`

**Description:** Image with slow zoom animation (Ken Burns effect) over scene duration.

**Props Interface:**
```typescript
interface KenBurnsImageProps {
  src?: string;
  direction?: 'in' | 'out';        // Default: 'in'
  scale?: number;                   // Max zoom scale, 1.0-1.15, default: 1.1
}
```

**Usage Example:**
```json
{
  "componentId": "KenBurnsImage",
  "zIndex": 0,
  "slotBindings": { "src": "photo-1" },
  "props": { "direction": "in", "scale": 1.15 }
}
```

**Behavior:**
- Animates zoom over the scene's full duration
- `direction: 'in'` starts at 1x, zooms to `scale` value
- `direction: 'out'` starts at `scale`, zooms to 1x
- If `src` is empty, shows grey placeholder box

---

### 3. AnimatedText

**ID:** `AnimatedText`

**Description:** Text that fades or slides in from bottom with animation.

**Props Interface:**
```typescript
interface AnimatedTextProps {
  text?: string;
  fontSize?: number;               // Default: 48
  color?: string;                  // CSS color, default: '#ffffff'
  fontWeight?: string;             // Default: 'bold'
  textAlign?: string;              // Default: 'center'
  animationType?: 'fade' | 'slide-up';  // Default: 'fade'
  delay?: number;                  // Frames to delay start, default: 0
}
```

**Usage Example:**
```json
{
  "componentId": "AnimatedText",
  "zIndex": 1,
  "slotBindings": { "text": "title-text" },
  "props": {
    "fontSize": 60,
    "color": "#ffffff",
    "animationType": "slide-up",
    "delay": 10
  }
}
```

**Behavior:**
- Fades or slides in over first 30 frames of animation
- `delay` pushes animation start later in scene
- If `text` is empty, renders nothing
- Animation stops at full opacity/final position

---

### 4. FadeTransition

**ID:** `FadeTransition`

**Description:** Wrapper component that fades content out over final frames.

**Props Interface:**
```typescript
interface FadeTransitionProps {
  durationInFrames: number;        // How many frames to fade over
  children?: React.ReactNode;      // Content to wrap
}
```

**Usage Example:**
```json
{
  "componentId": "FadeTransition",
  "zIndex": 10,
  "slotBindings": {},
  "props": { "durationInFrames": 30 }
}
```

**Behavior:**
- Wraps entire scene content
- Fades opacity from 1 to 0 over final `durationInFrames` frames
- Useful for smooth transitions between scenes
- Always place at highest zIndex to overlay everything

**Note:** This component typically wraps children in scenes, not used as standalone.

---

### 5. GrainOverlay

**ID:** `GrainOverlay`

**Description:** Animated film grain effect overlay using procedural noise.

**Props Interface:**
```typescript
interface GrainOverlayProps {
  opacity?: number;                // 0-1, default: 0.1
  size?: number;                   // Grain size multiplier, default: 2
}
```

**Usage Example:**
```json
{
  "componentId": "GrainOverlay",
  "zIndex": 100,
  "slotBindings": {},
  "props": { "opacity": 0.15, "size": 3 }
}
```

**Behavior:**
- Renders full-bleed grain texture overlay
- `opacity` controls visibility (subtle at 0.1, strong at 0.3)
- `size` controls grain particle size
- Animation varies grain pattern each frame (procedural noise)
- Set high zIndex to overlay on top of all other content
- Uses `mix-blend-mode: multiply` for realistic film grain look

---

### 6. TypewriterText

**ID:** `TypewriterText`

**Description:** Text revealed character-by-character like a typewriter.

**Props Interface:**
```typescript
interface TypewriterTextProps {
  text?: string;
  fontSize?: number;               // Default: 48
  color?: string;                  // CSS color, default: '#ffffff'
  delay?: number;                  // Frames to delay start, default: 0
}
```

**Usage Example:**
```json
{
  "componentId": "TypewriterText",
  "zIndex": 1,
  "slotBindings": { "text": "caption-text" },
  "props": {
    "fontSize": 36,
    "color": "#ffff00",
    "delay": 5
  }
}
```

**Behavior:**
- Reveals text one character per frame over scene duration
- Characters distributed evenly across scene length
- `delay` pushes reveal start later
- Shows blinking cursor during reveal
- If `text` is empty, renders nothing
- Uses monospace font for typewriter effect

---

## Slot Bindings

Components accept slot bindings that connect template slots to component props:

**Available Bindings:**
- `src` → Image slot (StaticImage, KenBurnsImage)
- `text` → Text slot (AnimatedText, TypewriterText)

**Example:**
```json
{
  "componentId": "AnimatedText",
  "slotBindings": { "text": "title-slot-id" },
  "props": { "fontSize": 48 }
}
```

The template renderer looks up the slot value and passes it to the component prop.

---

## Static Props

Components accept static props (non-slot-bound values) for configuration:

**Example:**
```json
{
  "componentId": "StaticImage",
  "props": {
    "objectFit": "contain",
    "opacity": 0.8
  }
}
```

Static props are passed directly to the component without slot binding.

---

## Z-Index Stacking

Components render in z-index order (lowest to highest):

**Typical Stacking Order:**
1. **Background images** (StaticImage, KenBurnsImage) — zIndex: 0-10
2. **Text and overlays** (AnimatedText, TypewriterText) — zIndex: 20-50
3. **Effects** (GrainOverlay) — zIndex: 100+

**Example Scene:**
```json
{
  "scenes": [
    {
      "id": "scene-1",
      "durationSeconds": 5,
      "components": [
        {
          "componentId": "StaticImage",
          "zIndex": 0,
          "slotBindings": { "src": "bg-image" },
          "props": {}
        },
        {
          "componentId": "AnimatedText",
          "zIndex": 1,
          "slotBindings": { "text": "title" },
          "props": { "fontSize": 60 }
        },
        {
          "componentId": "GrainOverlay",
          "zIndex": 100,
          "slotBindings": {},
          "props": { "opacity": 0.1 }
        }
      ]
    }
  ]
}
```

---

## Edge Cases & Placeholders

**Empty Slots:**
- `StaticImage` with no `src`: Shows grey placeholder
- `AnimatedText` with no `text`: Renders nothing
- `TypewriterText` with no `text`: Renders nothing

**Out of Range Props:**
- `opacity` < 0: Clamped to 0
- `opacity` > 1: Clamped to 1
- `scale` < 1.0: Clamped to 1.0
- `scale` > 1.15: Clamped to 1.15
- `delay` > scene duration: Animation never starts (remains invisible)

**Unsupported Values:**
- Invalid `objectFit` values: Default to 'cover'
- Invalid `color` values: Default to white
- Negative `fontSize`: Default to 48
- Negative `durationInFrames`: Ignored (no transition)

---

## Animation Timing

**AnimatedText & TypewriterText:**
- Total animation duration: scene duration (after delay)
- AnimatedText fade-in: 30 frames
- TypewriterText reveal: distributed over scene length

**KenBurnsImage:**
- Zoom duration: full scene duration
- Easing: linear interpolation

**FadeTransition:**
- Fade duration: `durationInFrames` prop (last N frames of scene)
- Easing: linear fade from 1 to 0 opacity

---

## Future Components (Phase 2+)

Planned additions:
- **SlideTransition** — Slide scene content in/out
- **PanText** — Animated text pan across screen
- **Blur** — Blurred background overlay
- **ProgressBar** — Animated progress bar for listicles
- **Counter** — Animated number counter (0→N)

---

## Usage in Templates

All components are referenced by `componentId` in scene component definitions:

```json
{
  "version": "1.0",
  "slots": [
    { "id": "photo", "type": "image", "label": "Photo", "required": true },
    { "id": "caption", "type": "text", "label": "Caption", "required": false }
  ],
  "scenes": [
    {
      "id": "scene-1",
      "durationSeconds": 5,
      "components": [
        {
          "componentId": "StaticImage",
          "zIndex": 0,
          "slotBindings": { "src": "photo" },
          "props": { "objectFit": "cover" }
        },
        {
          "componentId": "AnimatedText",
          "zIndex": 1,
          "slotBindings": { "text": "caption" },
          "props": { "fontSize": 48, "animationType": "fade" }
        }
      ]
    }
  ]
}
```
