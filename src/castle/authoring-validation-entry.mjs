import { authoredObjects, validateAuthoredCollection } from './objects.mjs';

// This entry is executed by the build, not shipped to players.
validateAuthoredCollection(authoredObjects);
