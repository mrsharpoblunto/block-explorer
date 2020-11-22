/* @flow */
import type { World, Entity } from 'framework';
import * as Components from 'components';

export default function empty(ent: Entity, gl: any): Entity {
    return ent;
}
