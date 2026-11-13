import { runTidyUp } from './tidy';

/** Before the journeys: clear away rows an earlier run left behind. */
export default () => runTidyUp('start');
