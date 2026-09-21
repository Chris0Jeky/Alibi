import { authoredObjects, validateInspectableObject } from './objects.mjs';

// This entry is executed by the build, not shipped to players.
authoredObjects.map(validateInspectableObject);
