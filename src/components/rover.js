/* @flow */
import twgl from 'twgl.js';
import glm from 'gl-matrix';

export default class RoverComponent {
    static Type: string = 'ROVER_COMPONENT';
    getType(): string { return RoverComponent.Type; }

    position: Vec3;
    velocity: Vec3;
    mass: number;
    surfaceRotation: Quaternion;
    surfaceNormal: ?Vec3;
    rotation: Quaternion;
    turning: number;
    boost: boolean;
    boostRemaining: number;
    tilt: number;

    constructor(gl: any,position: Vec3, rotation: Quaternion,mass: number) {
        this.position = position;
        this.rotation = rotation;
        this.velocity = glm.vec3.create();
        this.mass = mass;
        this.surfaceRotation = glm.quat.create();
        this.surfaceNormal = null;
        this.turning = 0;
        this.tilt = 0;
        this.boostRemaining = 100;
    }
}
