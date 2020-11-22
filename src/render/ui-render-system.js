/* @flow */
import type { Entity } from 'framework';
import * as Components from 'components';

export default class ScoreRenderSystem
{
    _score: ?Components.ScoreComponent;
    _rover: ?Components.RoverComponent;
    _scoreElem: any;
    _boostElem: any;

    constructor(gl: any) {
        this._scoreElem = document.getElementById('score');
        this._scoreElem.innerHTML = '0';
        this._boostElem = document.getElementById('boost');
        this._boostElem.style.width = '0%';
        this._instructionsElem = document.getElementById('instructions');
        this._instructionsElem.className = 'fade-out';
    }

    worldAddingEntity(entity: Entity): void {
        const score = entity.getComponent(Components.ScoreComponent.Type);
        if (score) {
            this._score = score
        }
        const rover = entity.getComponent(Components.RoverComponent.Type);
        if (rover) {
            this._rover = rover
        }
    }

    worldRemovingEntity(entity: Entity): void {
        const score = entity.getComponent(Components.ScoreComponent.Type);
        if (score) {
            this._score = null;
        }
        const rover = entity.getComponent(Components.RoverComponent.Type);
        if (rover) {
            this._rover = null;
        }
    }

    render(gl: any, alpha: number): void {
        if (!this._score) return;
        const score = this._score;
        if (!this._rover) return;
        const rover = this._rover;

        if (score.updated) {
            this._scoreElem.innerHTML = score.value;
            this._scoreElem.className = 'score-change';
            this._updateTime = new Date().getTime();
            score.updated = false;
        } else if ((new Date().getTime() - this._updateTime) > 200) {
            this._scoreElem.className = '';
        }

        this._boostElem.style.width = rover.boostRemaining + '%';
        this._boostElem.style.backgroundColor = rover.boost ? '#ff0000' : '#00ff00';
        
    }
}
