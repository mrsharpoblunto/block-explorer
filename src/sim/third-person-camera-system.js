/* @flow */
import type { Entity } from 'framework';
import glm from 'gl-matrix';
import * as Components from 'components';

const FORWARD = glm.vec3.fromValues(0,0,-1);
const RIGHT = glm.vec3.fromValues(1,0,0);
const UP = glm.vec3.fromValues(0,1,0);
const RESTING_HEIGHT = 2.0;
const RESTING_DISTANCE = 7.0;
const SPEED_DISTANCE_MULTIPLIER = 2.1;
const SPEED_HEIGHT_MULTIPLIER = 4;
const SPEED_TILT_MULTIPLIER = 2;
const TILT_SPEED = 0.05;
const CAMERA_MOVEMENT_INTERTIA = 0.05;
const CAMERA_ROTATION_INTERTIA = 0.2;
const MIN_HEIGHT = 0.5;

export default class ThirdPersonCameraSystem {
    _camera: ?Components.CameraComponent;
    _rover: ?Components.CameraComponent;
    _ground: ?Components.GroundComponent;

    constructor() {
    }

    systemWillMount(world: World, canvas: any): void {}
    systemWillUnmount(world: World, canvas: any): void {}

    worldAddingEntity(entity: Entity): void {
        const camera = entity.getComponent(Components.CameraComponent.Type);
        if (camera) {
            this._camera = camera;
        }
        const rover = entity.getComponent(Components.RoverComponent.Type);
        if (rover) {
            this._rover = rover;
        }
        const ground = entity.getComponent(Components.GroundComponent.Type);
        if (ground) {
            this._ground = ground;
        }
    }

    worldRemovingEntity(entity: Entity): void {
        const camera = entity.getComponent(Components.CameraComponent.Type);
        if (camera) {
            this._camera = null;
        }
        const rover = entity.getComponent(Components.RoverComponent.Type);
        if (rover) {
            this._rover = null;
        }
        const ground = entity.getComponent(Components.GroundComponent.Type);
        if (ground) {
            this._ground = null;
        }
    }

    simulate(timestep: number): void {
        if (this._camera == null) return;
        const camera = this._camera;
        if (this._rover == null) return;
        const rover = this._rover;
        if (this._ground == null) return;
        const ground = this._ground;

        const forward = glm.vec3.clone(FORWARD);
        glm.vec3.transformQuat(forward,forward,rover.rotation);
        glm.vec3.scale(forward,forward,-RESTING_DISTANCE);

        const cameraPosition = glm.vec3.create();
        glm.vec3.add(cameraPosition,rover.position,forward);

        const desiredLookAt = rover.position;
        
        const hn = ground.getHeightAndNormalAt(
            cameraPosition[0],
            cameraPosition[2],
        );

        const velocity = glm.vec3.length(rover.velocity);

        cameraPosition[1] = hn.height + RESTING_HEIGHT - (velocity * SPEED_HEIGHT_MULTIPLIER);
        if (cameraPosition[1] < hn.height + MIN_HEIGHT) {
            cameraPosition[1] = MIN_HEIGHT + hn.height;
        }

        if (rover.turning) {
            const right = glm.vec3.clone(RIGHT);
            glm.vec3.transformQuat(right,right,rover.rotation);
            glm.vec3.scale(right,right,SPEED_TILT_MULTIPLIER * -rover.turning * velocity);
            glm.vec3.add(right,UP,right);
            camera.setUp(right,TILT_SPEED);
        } else {
            camera.setUp(UP,TILT_SPEED);
        }
        camera.setFocalPointAndPosition(
            rover.position,
            cameraPosition,
            CAMERA_ROTATION_INTERTIA,
            CAMERA_MOVEMENT_INTERTIA
        );
    }
}
