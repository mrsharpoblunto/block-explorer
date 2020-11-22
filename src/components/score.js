/* @flow */
import twgl from 'twgl.js';
import glm from 'gl-matrix';

export default class ScoreComponent {
    static Type: string = 'SCORE_COMPONENT';
    getType(): string { return ScoreComponent.Type; }

    updated: boolean;
    value: number;


    constructor() {
        this.updated = false;
        this.value = 0;
    }

    bump(specimen: Specimen) {
        this.updated = true;
        this.value += specimen.value;
    }
}
