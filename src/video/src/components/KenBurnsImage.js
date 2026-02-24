import { jsx as _jsx } from "react/jsx-runtime";
import { AbsoluteFill, Img, interpolate, useCurrentFrame, useVideoConfig } from 'remotion';
/**
 * KenBurnsImage component - slow zoom in or out with image
 */
export const KenBurnsImage = ({ src, direction = 'in', scale = 1.1, }) => {
    const frame = useCurrentFrame();
    const { durationInFrames } = useVideoConfig();
    // Zoom animation
    const zoomScale = interpolate(frame, [0, durationInFrames], direction === 'in' ? [1, scale] : [scale, 1], {
        extrapolateLeft: 'clamp',
        extrapolateRight: 'clamp',
    });
    // Show placeholder if no src provided
    if (!src) {
        return (_jsx(AbsoluteFill, { style: {
                backgroundColor: '#cccccc',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
            }, children: _jsx("div", { style: { color: '#999', fontSize: 24 }, children: "No image provided" }) }));
    }
    return (_jsx(AbsoluteFill, { style: {
            overflow: 'hidden',
        }, children: _jsx(Img, { src: src, style: {
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                transform: `scale(${zoomScale})`,
                transformOrigin: 'center',
            } }) }));
};
