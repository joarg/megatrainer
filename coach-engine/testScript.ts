import { processTurn } from './index.js';
import { mockTurnInput } from './phases/mockInput.js';

const result = await processTurn(mockTurnInput);
console.log(JSON.stringify(result, null, 2));