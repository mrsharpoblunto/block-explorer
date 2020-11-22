/* @flow */
import twgl from 'twgl.js';
import glm from 'gl-matrix';

const IDLE_SPEED = 0.03;
const SMALL_PANIC_SPEED = 0.10;
const LARGE_PANIC_SPEED = 0.14;

export default class SpecimenComponent {
    static Type: string = 'SPECIMEN_COMPONENT';
    static SMALL_TYPE: number = 0;
    static LARGE_TYPE: number = 1;

    getType(): string { return SpecimenComponent.Type; }

    position: Vec3;
    startPosition: Vec3;
    target: Vec3;
    rotation: Quaternion;
    surfaceRotation: Quaternion;
    specimenType: number;
    size: number;
    originalSize: number;
    value: number;
    color: Vec4;

    constructor(
        position: Vec3,
        specimenType: number,
    ) {
        this.position = position;
        this.startPosition = glm.vec3.clone(position);

        switch (specimenType) {
            case SpecimenComponent.SMALL_TYPE:
                this.value = 1;
                this.size = glm.vec3.fromValues(1,1,1);
                this.color = glm.vec4.fromValues(0,0,1,1);
                this.idleSpeed = IDLE_SPEED;
                this.panicSpeed = SMALL_PANIC_SPEED;
                break;
            case SpecimenComponent.LARGE_TYPE:
                this.value = 10;
                this.size = glm.vec3.fromValues(2,2,2);
                this.color = glm.vec4.fromValues(1,0,0,1);
                this.idleSpeed = IDLE_SPEED;
                this.panicSpeed = LARGE_PANIC_SPEED;
                break;
        }
        this.originalSize = glm.vec3.clone(this.size);
        this.rotation = glm.quat.create();
        this.surfaceRotation = glm.quat.create();
        this.specimenType = specimenType;
    }
}
