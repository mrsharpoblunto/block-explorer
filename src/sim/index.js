/* @flow */
import type { SimSystem } from 'framework';
//import CameraSystem from 'sim/camera-system';
import ThirdPersonCameraSystem from 'sim/third-person-camera-system';
import RoverSystem from 'sim/rover-system';
import SpecimenSystem from 'sim/specimen-system';

export default function(): Array<SimSystem> {
    return [
        new RoverSystem(),
        new SpecimenSystem(),
        //new CameraSystem(),
        new ThirdPersonCameraSystem(),
    ];
}
