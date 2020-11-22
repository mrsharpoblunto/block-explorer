/* @flow */
import type { Entity } from 'framework';
import glm from 'gl-matrix';
import * as Components from 'components';

const FORWARD = glm.vec3.fromValues(0,0,-1);
const RIGHT = glm.vec3.fromValues(1,0,0);
const MOVEMENT_FORCE = 1.5;
const BOOST_FORCE_MULTIPLIER = 4;
const ROTATION_SPEED = 0.05;
const BOOST_ROTATION_MULTIPLIER = 0.1;
const BOOST_DRAIN = 1.5;
const BOOST_RECHARGE = 1;
const VELOCITY_ROTATION_MULTIPLIER = 0.5;
const GRAVITY = -0.5;
const GROUND_FRICTION = 0.05;
const AIR_FRICTION = 0.01;
const MIN_VELOCITY = 0.02;
const MAX_VELOCITY = 0.22;
const MAX_BOOST_VELOCITY = 0.44;
const MIN_VISIBILITY = 32;
const MAX_VISIBILITY = 128;
const IMPACT_ELASTICITY = 0.25;

export default class RoverSystem {
    _rover: ?Components.RoverComponent;
    _ground: ?Components.GroundComponent;
    _keys: Map<string,boolean>;
    _pressed: Map<string,boolean>;

    constructor() {
        this._keys = new Map();
        this._pressed = new Map();
    }

    systemWillMount(world: World,canvas: any): void {
        window.addEventListener('keydown',this.handleKeyDown);
        window.addEventListener('keyup',this.handleKeyUp);
    }

    systemWillUnmount(world: World,canvas: any): void {
        window.removeEventListener('keydown',this.handleKeyDown);
        window.removeEventListener('keyup',this.handleKeyUp);
    }

    worldAddingEntity(entity: Entity): void {
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
        const rover = entity.getComponent(Components.RoverComponent.Type);
        if (rover) {
            this._rover = null;
        }
        const ground = entity.getComponent(Components.GroundComponent.Type);
        if (ground) {
            this._ground = null;
        }
    }

    handleKeyDown = (e: any) => {
        e.preventDefault();
        this._keys.set(e.key,true);
    }

    handleKeyUp = (e: any) => {
        e.preventDefault();
        this._keys.set(e.key,false);
    }

    simulate(timestep: number): void {
        if (this._rover == null) return;
        const rover = this._rover;

        if (this._ground == null) return;
        const ground = this._ground;

        ground.ensureChunks(rover.position[0],rover.position[2],MIN_VISIBILITY, MAX_VISIBILITY);


        rover.boostRemaining += 
            this._keys.get(' ') ? -BOOST_DRAIN : BOOST_RECHARGE;
        rover.boostRemaining = Math.max(Math.min(100,rover.boostRemaining),0);
        rover.boost = this._keys.get(' ') && rover.boostRemaining;
        rover.turning = 0;

        const force = glm.vec3.fromValues(0,GRAVITY,0);
        let idle = true;

        // if the rover is touching the ground, counteract gravity
        // with the restorative force of the surface its sitting on
        if (rover.surfaceNormal) {
            const surfaceForce = glm.vec3.clone(rover.surfaceNormal);
            glm.vec3.scale(surfaceForce,surfaceForce,GRAVITY * -1);
            glm.vec3.add(force,force,surfaceForce);
            // TODO only count this in the direction of movement so that we don't get sideways sliding
        }

        const forward = glm.vec3.clone(FORWARD);
        const rotation = glm.quat.create();
        glm.quat.mul(
            rotation,
            rover.surfaceRotation,
            rover.rotation,
        );
        glm.vec3.transformQuat(forward,forward,rotation);

        if (
            this._keys.get('ArrowUp') || 
            this._keys.get('ArrowLeft') || 
            this._keys.get('ArrowDown') || 
            this._keys.get('ArrowRight') ||
            this._keys.get('w') || 
            this._keys.get('a') || 
            this._keys.get('s') || 
            this._keys.get('d')

        ) {
            idle = false;

            let rotationSpeed = ROTATION_SPEED;
            if (rover.boost) {
                rotationSpeed *= BOOST_ROTATION_MULTIPLIER;
            } else {
                rotationSpeed *= 1 - (glm.vec3.length(rover.velocity) / MAX_VELOCITY) * VELOCITY_ROTATION_MULTIPLIER; 
            }
            

            const theta = (
               ((this._keys.get('ArrowLeft') || this._keys.get('a')) ? 1 : 0)
              -((this._keys.get('ArrowRight') || this._keys.get('d')) ? 1 : 0) 
            ) * rotationSpeed;
            glm.quat.rotateY(rover.rotation,rover.rotation,theta);
            rover.turning = theta ? ((theta > 0) ? 1 : -1) : 0;


            // as well as any forwards acceleration
            // (but only while touching the ground)
            if (rover.surfaceNormal) {
                const movementForce =  MOVEMENT_FORCE * (rover.boost ? BOOST_FORCE_MULTIPLIER : 1);
                glm.vec3.scale(forward,forward, (
                   ((this._keys.get('ArrowDown') || this._keys.get('s')) ? 1 : 0)
                   -((this._keys.get('ArrowUp') || this._keys.get('w')) ? 1 : 0)
                ) * movementForce);
                glm.vec3.add(force,force,forward);
            }
        }

        if (rover.turning) {
            rover.tilt = rover.tilt + 0.1 * ((rover.turning * -1) - rover.tilt);
        } else {
            rover.tilt = rover.tilt + 0.1 * (0.0 - rover.tilt);
        }

        // calculate the new velocity
        // a = f/m, v = u + at
        glm.vec3.scale(force,force,1/rover.mass);
        glm.vec3.add(rover.velocity,rover.velocity,force);

        // deal with friction
        let friction;
        if (!rover.surfaceNormal) {
            friction = 0;
        }
        else {
            const velocity = glm.vec3.clone(rover.velocity);
            glm.vec3.normalize(velocity,velocity);
            glm.vec3.normalize(forward,forward);
            friction = (1 - glm.vec3.dot(forward,velocity)) * GROUND_FRICTION;

            //} else {
            //friction = GROUND_FRICTION;
        }

        glm.vec3.scale(
            rover.velocity,
            rover.velocity,
            1 - friction,
        );

        // speed cap
        const maxVelocity = rover.boost ? MAX_BOOST_VELOCITY : MAX_VELOCITY;
        if (glm.vec3.length(rover.velocity) > maxVelocity) {
            glm.vec3.normalize(rover.velocity,rover.velocity);
            glm.vec3.scale(rover.velocity,rover.velocity,maxVelocity);
        }

        // stop weird jiggling at low speeds
        if (idle && glm.vec3.length(rover.velocity) < MIN_VELOCITY) {
            glm.vec3.set(rover.velocity,0,0,0);
        }

        glm.vec3.add(rover.position,rover.position,rover.velocity);


        const hn = ground.getHeightAndNormalAt(
            rover.position[0],
            rover.position[2],
        );

        for (let obstacle of hn.chunk.obstacles) {
            if (glm.vec3.distance(obstacle.position,rover.position) < obstacle.size[0]) {
                // stop the rover from entering the obstacle
                const impulse = glm.vec3.create(); 
                glm.vec3.sub(impulse,obstacle.position,rover.position);
                glm.vec3.normalize(impulse,impulse);
                glm.vec3.scale(impulse,impulse,obstacle.size[0] * -1);
                glm.vec3.add(rover.position,obstacle.position,impulse);

                // now apply the impulse to the rovers velocity
                glm.vec3.normalize(impulse,impulse);
                glm.vec3.scale(
                    rover.velocity,
                    impulse,
                    glm.vec3.length(rover.velocity) * IMPACT_ELASTICITY
                );
            }
        }

        // make sure the rover doesn't clip into the terrain
        if (rover.position[1] <= hn.height) {
            rover.position[1] = hn.height;

            // make sure the rover is locked to the terrain 
            // normal vector (but keep it smooth)
            const newRotation = glm.quat.create();
            glm.quat.setAxes(
                newRotation,
                hn.binormal,
                hn.tangent,
                hn.normal
            );
            glm.quat.slerp(
                rover.surfaceRotation,
                rover.surfaceRotation,
                newRotation,
                0.25,
            );
            rover.surfaceNormal = hn.normal;
        } else {
            rover.surfaceNormal = null;
        }
    }
}
