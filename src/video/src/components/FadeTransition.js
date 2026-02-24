import { jsx as _jsx } from "react/jsx-runtime";
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from 'remotion';
/**
 * FadeTransition component - wrapper that fades content in/out
 * Fades out over the last N frames of the scene
 */
export const FadeTransition = ({ durationInFrames, children, }) => {
    const frame = useCurrentFrame();
    const { durationInFrames: totalDuration } = useVideoConfig();
    // Calculate fade-out start frame
    const fadeStartFrame = totalDuration - durationInFrames;
    // Opacity animation
    const opacity = interpolate(frame, [fadeStartFrame, totalDuration], [1, 0], {
        extrapolateLeft: 'clamp',
        extrapolateRight: 'clamp',
    });
    return (_jsx(AbsoluteFill, { style: { opacity }, children: children }));
};
