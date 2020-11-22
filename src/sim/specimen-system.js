/* @flow */
import type { Entity } from 'framework';
import glm from 'gl-matrix';
import * as Components from 'components';
import * as Builders from 'builders';

const ORIGIN = glm.vec3.create();
const MAX_SPECIMENS = 100;
const MIN_SPAWN_RADIUS = 64;
const MAX_SPAWN_RADIUS = 96;
const DESPAWN_RADIUS = 128;
const MIN_HERD_SIZE = 4;
const MAX_HERD_SIZE = 10;
const MAX_HERD_RADIUS = 8;

const INITIAL_MIN_SPAWN_RADIUS = 32;
const INITIAL_MAX_SPAWN_RADIUS = 64; 

const PANIC_RADIUS = 10;

const CAPTURE_SPEED = 0.8;
const MIN_SIZE = 0.03;

export default class SpecimenSystem {

    _specimens: Map<Entity,Components.SpecimenComponent>;
    _capturing: Map<Components.SpecimenComponent,Entity>;
    _rover: ?Components.RoverComponent;
    _ground: ?Components.GroundComponent;
    _score: ?Components.ScoreComponent;

    constructor(world) {
        this._specimens = new Map();
        this._capturing = new Map();
        this._herds = new Set();
        this._nextHerdSize = null;
    }

    systemWillMount(world: World, canvas: any): void {
        this._world = world;
    }

    systemWillUnmount(canvas: any): void {
    }

    worldAddingEntity(entity: Entity): void {
        const ground = entity.getComponent(Components.GroundComponent.Type);
        if (ground) {
            this._ground = ground;
        }
        const score = entity.getComponent(Components.ScoreComponent.Type);
        if (score) {
            this._score = score;
        }
        const rover = entity.getComponent(Components.RoverComponent.Type);
        if (rover) {
            this._rover = rover;
        }
        const specimen = entity.getComponent(Components.SpecimenComponent.Type);
        if (specimen) {
            this._specimens.set(entity, specimen);
        }
    }

    worldRemovingEntity(entity: Entity): void {
        const ground = entity.getComponent(Components.GroundComponent.Type);
        if (ground) {
            this._ground = null;
        }
        const score = entity.getComponent(Components.ScoreComponent.Type);
        if (score) {
            this._score = null;
        }
        const rover = entity.getComponent(Components.RoverComponent.Type);
        if (rover) {
            this._rover = null;
        }
        const specimen = entity.getComponent(Components.SpecimenComponent.Type);
        if (specimen) {
            this._specimens.delete(entity);
        }
    }

    simulate(timestep: number): void {
        if (!this._rover) return;
        const rover = this._rover;
        if (!this._ground) return;
        const ground = this._ground;
        if (!this._score) return;
        const score = this._score;

        const initial = this._specimens.size === 0;
        const minDistance = initial ?
            INITIAL_MIN_SPAWN_RADIUS :
            MIN_SPAWN_RADIUS;
        const maxDistance = initial ?
            INITIAL_MAX_SPAWN_RADIUS :
            MAX_SPAWN_RADIUS;

        while (this._specimens.size < MAX_SPECIMENS) {
            if (!this._nextHerdSize) {
                this._nextHerdSize = MIN_HERD_SIZE + Math.floor(
                Math.random() * (MAX_HERD_SIZE - MIN_HERD_SIZE)); 
            }

            if (this._specimens.size + this._nextHerdSize >= MAX_SPECIMENS) {
                break;
            }


            // calculate the center of the herd
            const center = glm.vec3.create();
            const distance = minDistance + 
                (maxDistance - minDistance) * Math.random();
            this._getRandomVec3Around(center,rover.position,distance);
            
            // offset the herd entities about the center
            for (let i = 0; i < this._nextHerdSize;++i) {
                const position = glm.vec3.create();
                let distance = MAX_HERD_RADIUS  * Math.random();
                this._getRandomVec3Around(position,center,distance);
                const type = Math.floor(Math.random() * 100) > 80 ?
                    Components.SpecimenComponent.LARGE_TYPE :
                    Components.SpecimenComponent.SMALL_TYPE;

                this._world.createEntity(Builders.specimen,{
                    position,
                    specimenType: type,
                });
            }
            this._nextHerdSize = null;
        }

        const despawn = [];
        for (let pair of this._specimens) {
            this._update(pair,rover,ground,score,despawn);
        }
        for (let pair of this._capturing) {
            const specimen = pair[1];
            glm.vec3.scale(specimen.size,specimen.size,CAPTURE_SPEED); 
            if (specimen.size[0] < MIN_SIZE) {
                despawn.push(pair[0]);
                this._capturing.delete(pair[0]);
            }
        }
        for (let d of despawn) {
            this._world.removeEntity(d);
        }
    }

    _getRandomVec3Around(out,target,distance) {
        const center = glm.vec3.fromValues(1,0,0);
        const theta = Math.random() * 2 * Math.PI;
        glm.vec3.scale(center,center,distance);
        glm.vec3.rotateY(center,center,ORIGIN,theta);
        glm.vec3.add(out,center,target);
        return out;
    }

    _update(pair,rover,ground,score,despawn) {
        if (this._capturing.has(pair[0])) return;
        const specimen = pair[1];

        const distance = glm.vec3.distance(specimen.position,rover.position);

        // bump the score if we captured a specimen
        if (distance < specimen.size[0]) {
            this._capturing.set(pair[0],pair[1]);
            score.bump(specimen);
            return;
        }
        
        // remove entities that are too far away
        if (distance > DESPAWN_RADIUS) {
            despawn.push(pair[0]);
            return;
        }

        if (distance < PANIC_RADIUS) {
            const newStart = glm.vec3.create();
            glm.vec3.sub(newStart,rover.position,specimen.position);
            newStart[1] = 0;
            glm.vec3.normalize(newStart,newStart);
            glm.vec3.scale(newStart,newStart,MIN_SPAWN_RADIUS * -1);
            glm.vec3.add(specimen.startPosition,specimen.position,newStart);
            specimen.paniced = true;
            specimen.target = null;
        }

        if (!specimen.target) {
            specimen.target = glm.vec3.create();
            const distance = MAX_HERD_RADIUS * Math.random();
            this._getRandomVec3Around(specimen.target,specimen.startPosition,distance);
        }

        if (specimen.target) {
            const direction = glm.vec3.create();
            const pos = glm.vec3.clone(specimen.position);
            const speed = specimen.paniced ? specimen.panicSpeed : specimen.idleSpeed;
            pos[1] = 0;

            glm.vec3.sub(direction,specimen.target,pos);

            glm.vec3.normalize(direction,direction);
            glm.vec3.scale(direction,direction,speed);
            glm.vec3.add(specimen.position,direction,specimen.position);

            const horizontalPos = glm.vec2.fromValues(specimen.position[0],specimen.position[2]);
            const horizontalTarget = glm.vec2.fromValues(specimen.target[0],specimen.target[2]);

            if (glm.vec2.distance(horizontalPos,horizontalTarget) <= speed) {
                specimen.target = null;
            }
        }

        const hn = ground.getHeightAndNormalAt(
            specimen.position[0],
            specimen.position[2],
        );
        if (hn) {
            specimen.position[1] = hn.height;
            const newRotation = glm.quat.create();
            glm.quat.setAxes(
                newRotation,
                hn.binormal,
                hn.tangent,
                hn.normal,
            );
            glm.quat.slerp(
                specimen.surfaceRotation,
                specimen.surfaceRotation,
                newRotation,
                0.25
            );
        }

    }
}
