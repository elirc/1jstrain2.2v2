import { stage12Modules } from './stage-1-2.js';
import { stage345Modules } from './stage-3-5.js';
import { stage67Modules } from './stage-6-7.js';

/** @type {import('../types.d.ts').Module[]} */
export const modules = [...stage12Modules, ...stage345Modules, ...stage67Modules];
