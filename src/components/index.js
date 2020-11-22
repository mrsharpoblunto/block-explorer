/* @flow */
import GroundComponent from 'components/ground';
import CameraComponent from 'components/camera';
import RoverComponent from 'components/rover';
import SpecimenComponent from 'components/specimen';
import ScoreComponent from 'components/score';

export {
    GroundComponent,
    RoverComponent,
    CameraComponent,
    SpecimenComponent,
    ScoreComponent,
}

if (__DEV__) {
    // don't do any hot reloading of components themselves as they are
    // inherently stateful and changing them mid simulation will cause
    // unpredictable outcomes
    module = (module: any);
    if (module.hot) {
        module.hot.decline();
    }
}
