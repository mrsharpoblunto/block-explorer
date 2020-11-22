/* @flow */
import type { RenderSystem } from 'framework';
import CameraRenderSystem from 'render/camera-render-system';
import GroundRenderSystem from 'render/ground-render-system';
import RoverRenderSystem from 'render/rover-render-system';
import SpecimenRenderSystem from 'render/specimen-render-system';
import UIRenderSystem from 'render/ui-render-system';

export default function(glContext: any): Array<RenderSystem> {
    return [
        new CameraRenderSystem(glContext),
        new GroundRenderSystem(glContext),
        new RoverRenderSystem(glContext),
        new SpecimenRenderSystem(glContext),
        new UIRenderSystem(glContext),
    ];
}
