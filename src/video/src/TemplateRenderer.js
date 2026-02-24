import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { AbsoluteFill, Audio, Sequence, useVideoConfig } from 'remotion';
import { COMPONENT_REGISTRY } from './components';
/**
 * Generic template renderer that converts TemplateSchema + slot fills into a complete Remotion composition.
 *
 * **How it works:**
 * 1. Converts slotFills array to a lookup map for O(1) resolution
 * 2. Iterates through template scenes, calculating frame positions
 * 3. For each scene, wraps content in a Remotion <Sequence> at the correct frame offset
 * 4. For each component:
 *    - Looks up component from registry by componentId
 *    - Resolves slot bindings (maps slot IDs to actual values from slotFills)
 *    - Merges resolved props with static props
 *    - Renders with proper z-index positioning
 * 5. If musicUrl provided, plays audio throughout video duration
 *
 * **Error Handling:**
 * - Missing components logged with warning, rendering continues
 * - Missing slots show placeholders from component implementations
 * - Invalid template shows error message on black background
 */
export const TemplateRenderer = ({ template, slotFills, musicUrl, }) => {
    const { fps } = useVideoConfig();
    // Validate template
    if (!template || !template.scenes || !Array.isArray(template.scenes)) {
        return (_jsx(AbsoluteFill, { style: {
                backgroundColor: '#000000',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#FFFFFF',
                fontSize: 24,
                textAlign: 'center',
                padding: 40,
            }, children: _jsx("div", { children: "Invalid template provided to TemplateRenderer" }) }));
    }
    // Create lookup map from slotFills array for efficient slot value resolution
    // Maps slotId → value for O(1) lookups during component rendering
    const slotFillsMap = new Map();
    slotFills.forEach((fill) => {
        slotFillsMap.set(fill.slotId, fill.value);
    });
    let currentFrameOffset = 0;
    return (_jsxs(AbsoluteFill, { style: { backgroundColor: '#000000' }, children: [musicUrl && _jsx(Audio, { src: musicUrl, volume: 0.5 }), template.scenes.map((scene, sceneIndex) => {
                const sceneDurationFrames = Math.ceil(scene.durationSeconds * fps);
                const sceneStartFrame = currentFrameOffset;
                // Advance offset for next scene
                currentFrameOffset += sceneDurationFrames;
                return (_jsx(Sequence, { from: sceneStartFrame, durationInFrames: sceneDurationFrames, children: _jsx(AbsoluteFill, { style: { backgroundColor: '#000000', position: 'relative' }, children: scene.components && scene.components.length > 0 ? (scene.components
                            .sort((a, b) => (a.zIndex || 0) - (b.zIndex || 0))
                            .map((sceneComponent, componentIndex) => {
                            // Look up component from registry
                            const ComponentClass = COMPONENT_REGISTRY[sceneComponent.componentId];
                            if (!ComponentClass) {
                                console.warn(`Component "${sceneComponent.componentId}" not found in COMPONENT_REGISTRY for scene "${scene.id}"`);
                                return null;
                            }
                            // Build resolved props by merging slot bindings and static props
                            const resolvedProps = { ...sceneComponent.props };
                            // Resolve slot bindings: map slot IDs to actual values
                            if (sceneComponent.slotBindings) {
                                Object.entries(sceneComponent.slotBindings).forEach(([propName, slotId]) => {
                                    const slotValue = slotFillsMap.get(slotId);
                                    if (slotValue) {
                                        resolvedProps[propName] = slotValue;
                                    }
                                    // If no value, component will use its default placeholder behavior
                                });
                            }
                            return (_jsx("div", { style: {
                                    position: 'absolute',
                                    top: 0,
                                    left: 0,
                                    width: '100%',
                                    height: '100%',
                                    zIndex: sceneComponent.zIndex || 0,
                                }, children: _jsx(ComponentClass, { ...resolvedProps }) }, `component-${componentIndex}`));
                        })) : (
                        // Empty scene - render black background
                        _jsx(AbsoluteFill, { style: { backgroundColor: '#1a1a1a' } })) }) }, scene.id || `scene-${sceneIndex}`));
            })] }));
};
