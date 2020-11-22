/* @flow */
import twgl from 'twgl.js';
import glm from 'gl-matrix';
import type { Entity } from 'framework';
import objectFrag from 'shaders/object_frag.glsl';
import objectVert from 'shaders/object_vert.glsl';
import * as Components from 'components';

const UP = glm.vec3.fromValues(0,1,0);
const SQUARE_SIZE = 1;
const MAX_TURN_TILT = 0.5;

export default class SpecimenRenderSystem
{
    _specimens: Map<Entity,Components.SpecimenComponent>;
    _camera: ?Components.CameraComponent;

    _programInfo: any;
    _squareBufferInfo: any;

    constructor(gl: any) {
        this._programInfo = twgl.createProgramInfo(gl, [objectVert, objectFrag]);
        this._squareBufferInfo = twgl.primitives.createCubeBufferInfo(gl, SQUARE_SIZE);
        this._specimens = new Map();
    }

    worldAddingEntity(entity: Entity): void {
        const camera = entity.getComponent(Components.CameraComponent.Type);
        if (camera) {
            this._camera = camera;
        }
        const specimen = entity.getComponent(Components.SpecimenComponent.Type);
        if (specimen) {
            this._specimens.set(entity,specimen);
        }
    }

    worldRemovingEntity(entity: Entity): void {
        const camera = entity.getComponent(Components.CameraComponent.Type);
        if (camera) {
            this._camera = null;
        }
        const specimen = entity.getComponent(Components.SpecimenComponent.Type);
        if (specimen) {
            this._specimens.delete(entity);
        }
    }

    render(gl: any, alpha: number): void {
        if (!this._camera) return;
        const camera = this._camera;

        const view = camera.getViewMatrix();
        const invView = glm.mat4.create();
        const viewProjection = glm.mat4.create();
        const worldViewProjection = glm.mat4.create();
        const world = glm.mat4.create();
        const invTransposeWorld = glm.mat4.create();

        const cameraPosition = camera.getPosition();
        const lightDirection = camera.getLookAt();

        glm.mat4.invert(invView,view);
        glm.mat4.mul(
            viewProjection,
            camera.getProjectionMatrix(),
            view,
        );

        gl.useProgram(this._programInfo.program);
        twgl.setBuffersAndAttributes(
            gl,
            this._programInfo,
            this._squareBufferInfo,
        );

        gl.enable(gl.DEPTH_TEST);
        gl.enable(gl.CULL_FACE);

        for (let pair of this._specimens) {
            const specimen = pair[1];

            const position = glm.mat4.create();

            const rotation = glm.mat4.create();
            const rot = glm.quat.create();

            glm.quat.mul(rot,specimen.rotation,rot);
            glm.quat.mul(rot,specimen.surfaceRotation,rot);
            glm.mat4.fromQuat(rotation,rot);

            glm.mat4.translate(
                position,
                position,
                specimen.position,
            );

            const positionOffset = glm.vec3.clone(UP);
            glm.vec3.scale(
                positionOffset,
                positionOffset,
                specimen.originalSize[0] / 2,
            );
           
            glm.mat4.translate(
                position,
                position,
                positionOffset,
            );

            const scale = glm.mat4.create();
            glm.mat4.scale(scale,scale,specimen.size);
            glm.mat4.mul(
                world,
                position,
                scale,
            );

            glm.mat4.mul(
               world,
               world,
               rotation,
               );

            glm.mat4.mul(
                worldViewProjection,
                viewProjection,
                world,
            );
            glm.mat4.invert(
                invTransposeWorld,
                glm.mat4.transpose(invTransposeWorld,world),
            ); 

            twgl.setUniforms(this._programInfo,{
                u_lightWorld: [0,1,0],//lightDirection,
                u_lightColor: [1,1,1,1],
                u_ambient: [0.2,0.2,0.2,1],
                u_specular: [1,1,1,1],
                u_shininess: 100,
                u_specularFactor: 0,
                u_diffuse: specimen.color,
                u_world: world,
                u_worldInverseTranspose: invTransposeWorld,
                u_worldViewProjection: worldViewProjection,
                u_worldViewPos: cameraPosition
            });        
            twgl.drawBufferInfo(
                gl,
                gl.TRIANGLES,
                this._squareBufferInfo,
            );
        }
    }
}
