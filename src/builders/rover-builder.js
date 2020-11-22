/* @flow */
import type { World, Entity } from 'framework';
import SimplexNoise from 'simplex-noise';
import * as Components from 'components';

type RoverOptions = {
    position: Vec3,
    rotation: Quaternion,
    mass: number,
}

export default function rover(ent: Entity, gl: any, options: RoverOptions): Entity {
    return ent.addComponent(new Components.RoverComponent(gl,
        options.position,
        options.rotation,
        options.mass,
    )).addComponent(new Components.ScoreComponent());
}
