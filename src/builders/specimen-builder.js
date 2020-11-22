/* @flow */
import type { World, Entity } from 'framework';
import * as Components from 'components';

type SpecimenOptions = {
    position: Array<number>,
    specimenType: number,
}

export default function camera(ent: Entity, gl: any, options: SpecimenOptions): Entity {
    return ent.addComponent(new Components.SpecimenComponent(
        options.position,
        options.specimenType,
    ));
}
