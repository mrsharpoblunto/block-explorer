/* @flow */
import type { World, Entity } from 'framework';
import type { NoiseParams } from 'components/ground';
import SimplexNoise from 'simplex-noise';
import * as Components from 'components';

type GroundOptions = {
    noiseParams: NoiseParams;
}

export default function ground(ent: Entity, gl: any, options: GroundOptions): Entity {
    const noise = new SimplexNoise();
    return ent.addComponent(new Components.GroundComponent(gl,noise,options.noiseParams));
}
