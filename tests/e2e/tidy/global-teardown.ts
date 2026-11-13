import { runTidyUp } from './tidy';

/** After the journeys: remove the rows this run made. */
export default () => runTidyUp('end');
