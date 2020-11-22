/* @flow */
import twgl from 'twgl.js';
import glm from 'gl-matrix';
import type { Entity } from 'framework';
import groundFrag from 'shaders/object_frag.glsl';
import groundVert from 'shaders/object_vert.glsl';
import * as Components from 'components';

export default class GroundRenderSystem
{
    _ground: ?Components.GroundComponent;
    _camera: ?Components.CameraComponent;
    _programInfo: any;
    _sphereBufferInfo: any;
    _tex: any;

    constructor(gl: any) {
        this._programInfo = twgl.createProgramInfo(gl, [groundVert, groundFrag]);

        this._sphereBufferInfo = twgl.primitives.createSphereBufferInfo(gl, 1.0, 10, 10);

        this._tex = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, this._tex);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 2, 2, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([
            255, 255, 255, 255,
            192, 192, 192, 255,
            192, 192, 192, 255,
            255, 255, 255, 255,
        ]));
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    }

    worldAddingEntity(entity: Entity): void {
        const ground = entity.getComponent(Components.GroundComponent.Type);
        if (ground) {
            this._ground = ground;
        }
        const camera = entity.getComponent(Components.CameraComponent.Type);
        if (camera) {
            this._camera = camera;
        }
    }

    worldRemovingEntity(entity: Entity): void {
        const ground = entity.getComponent(Components.GroundComponent.Type);
        if (ground) {
            this._ground = null;
        }
        const camera = entity.getComponent(Components.CameraComponent.Type);
        if (camera) {
            this._camera = null;
        }
    }

    render(gl: any, alpha: number): void {
        if (!this._camera) return;
        const camera = this._camera;

        if (!this._ground) return;
        const ground = this._ground;

        const view = camera.getViewMatrix();
        const invView = glm.mat4.create();
        const viewProjection = glm.mat4.create();
        const worldViewProjection = glm.mat4.create();
        const invTransposeWorld = glm.mat4.create();

        const cameraPosition = camera.getPosition();
        const lightDirection = camera.getLookAt();

        glm.mat4.mul(
            viewProjection,
            camera.getProjectionMatrix(),
            view,
        );
        glm.mat4.invert(invView,view);

        gl.useProgram(this._programInfo.program);
        gl.enable(gl.DEPTH_TEST);
        gl.enable(gl.CULL_FACE);

        for (let chunk of ground.chunks) {
            const world = glm.mat4.create();
            glm.mat4.translate(world,world,chunk.center);

            glm.mat4.mul(
                worldViewProjection,
                viewProjection,
                world,
            );
            glm.mat4.invert(
                invTransposeWorld,
                glm.mat4.transpose(invTransposeWorld,world),
            );

            twgl.setBuffersAndAttributes(
                gl,
                this._programInfo,
                chunk.bufferInfo,
            );
            twgl.setUniforms(this._programInfo,{
                u_lightWorld: [0,1,0],//lightDirection,
                u_lightColor: [1,1,1,1],
                u_ambient: [0.2,0.2,0.2,1],
                u_specular: [1,1,1,1],
                u_shininess: 100,
                u_specularFactor: 0,
                u_diffuse: [0.3,0.5,0.3,1],
                u_world: world,
                u_worldInverseTranspose: invTransposeWorld,
                u_worldViewProjection: worldViewProjection,
                u_worldViewPos: cameraPosition
            });        
            twgl.drawBufferInfo(gl,gl.TRIANGLES,chunk.bufferInfo);

        }
        for (let chunk of ground.chunks) {
            twgl.setBuffersAndAttributes(
                gl,
                this._programInfo,
                this._sphereBufferInfo,
            );
            for (let obstacle of chunk.obstacles) {
                const world = glm.mat4.create();
                glm.mat4.translate(world,world,obstacle.position);

                const scale = glm.mat4.create();
                glm.mat4.scale(scale,scale,obstacle.size);

                glm.mat4.mul(world,world,scale);

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
                    u_diffuse: [0.5,0.5,0.5,1],
                    u_world: world,
                    u_worldInverseTranspose: invTransposeWorld,
                    u_worldViewProjection: worldViewProjection,
                    u_worldViewPos: cameraPosition
                });        
                twgl.drawBufferInfo(gl,gl.TRIANGLES,this._sphereBufferInfo);
            }
        }
    }
}
