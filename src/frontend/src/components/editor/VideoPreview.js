import { jsx as _jsx } from "react/jsx-runtime";
import { useMemo } from 'react';
import { Player } from '@remotion/player';
import { TemplateRenderer } from '@video/TemplateRenderer';
/**
 * VideoPreview Component
 *
 * Renders a live preview of the video using Remotion Player.
 * Displays at 9:16 aspect ratio (1080x1920) with playback controls.
 *
 * @param template - The template schema defining scenes and components
 * @param slotFills - Current slot fills from the project
 * @param musicUrl - Optional background music URL
 */
export const VideoPreview = ({ template, slotFills, musicUrl, }) => {
    // Calculate total duration in frames
    const durationInFrames = useMemo(() => {
        if (!template || !template.scenes || !Array.isArray(template.scenes)) {
            return 300; // Default 10 seconds at 30 fps
        }
        const totalSeconds = template.scenes.reduce((sum, scene) => sum + (scene.durationSeconds || 0), 0);
        return Math.ceil(totalSeconds * 30);
    }, [template]);
    return (_jsx("div", { className: "flex items-center justify-center w-full h-full bg-gray-50", children: _jsx("div", { style: {
                aspectRatio: '9 / 16',
                maxWidth: '100%',
                maxHeight: '100%',
                width: 'auto',
                height: 'auto',
            }, children: _jsx(Player, { component: TemplateRenderer, durationInFrames: durationInFrames, compositionWidth: 1080, compositionHeight: 1920, fps: 30, controls: true, inputProps: {
                    template,
                    slotFills,
                    musicUrl,
                }, style: {
                    width: '100%',
                    height: '100%',
                } }) }) }));
};
export default VideoPreview;
