/* @flow */
import twgl from 'twgl.js';
import glm from 'gl-matrix';
import type { Entity } from 'framework';
import objectFrag from 'shaders/object_frag.glsl';
import objectVert from 'shaders/object_vert.glsl';
import * as Components from 'components';

const UP = glm.vec3.fromValues(0,1,0);
const SQUARE_SIZE = 0.4;
const MAX_TURN_TILT = 0.2;

export default class RoverRenderSystem
{
    _camera: ?Components.CameraComponent;
    _rover: ?Components.RoverComponent;

    _programInfo: any;
    _squareBufferInfo: any;

    constructor(gl: any) {
        this._programInfo = twgl.createProgramInfo(gl, [objectVert, objectFrag]);
        this._squareBufferInfo = twgl.primitives.createCubeBufferInfo(gl, SQUARE_SIZE);
    }

    worldAddingEntity(entity: Entity): void {
        const rover = entity.getComponent(Components.RoverComponent.Type);
        if (rover) {
            this._rover = rover;
        }
        const camera = entity.getComponent(Components.CameraComponent.Type);
        if (camera) {
            this._camera = camera;
        }
    }

    worldRemovingEntity(entity: Entity): void {
        const rover = entity.getComponent(Components.RoverComponent.Type);
        if (rover) {
            this._rover = null;
        }
        const camera = entity.getComponent(Components.CameraComponent.Type);
        if (camera) {
            this._camera = null;
        }
    }

    render(gl: any, alpha: number): void {
        if (!this._camera) return;
        const camera = this._camera;

        if (!this._rover) return;
        const rover = this._rover;

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

        gl.enable(gl.DEPTH_TEST);
        gl.enable(gl.CULL_FACE);


        const position = glm.mat4.create();
        const rotation = glm.mat4.create();
        const rot = glm.quat.create();

        glm.quat.rotateZ(rot,rot,Math.PI / 2);
        glm.quat.rotateZ(
            rot,
            rot,
            MAX_TURN_TILT * rover.tilt
        );

        glm.quat.mul(rot,rover.rotation,rot);
        glm.quat.mul(rot,rover.surfaceRotation,rot);
        glm.mat4.fromQuat(rotation,rot);

        glm.mat4.translate(
            position,
            position,
            rover.position,
        );

        const positionOffset = glm.vec3.clone(UP);
        glm.vec3.scale(
            positionOffset,
            positionOffset,
            SQUARE_SIZE / 2,
        );

        glm.mat4.translate(
            position,
            position,
            positionOffset,
        );

        glm.mat4.mul(
           world,
           position,
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

        gl.useProgram(this._programInfo.program);
        twgl.setBuffersAndAttributes(
            gl,
            this._programInfo,
            this._squareBufferInfo,
        );
        twgl.setUniforms(this._programInfo,{
            u_lightWorld: [0,1,0],//lightDirection,
            u_lightColor: [1,1,1,1],
            u_ambient: [0.2,0.2,0.2,1],
            u_specular: [1,1,1,1],
            u_shininess: 100,
            u_specularFactor: 1,
            u_diffuse: [0.8,0.8,0.8,1],
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
