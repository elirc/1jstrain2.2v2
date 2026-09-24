import { jsModules } from './js.js';
import { tsModules } from './ts.js';
import { webPlatformModules } from './web-platform.js';
import { reactModules } from './react.js';
import { nodeModules } from './node.js';
import { webModules } from './web.js';
import { dataModules } from './data.js';
import { csharpModules } from './csharp.js';
import { dotnetModules } from './dotnet.js';
import { craftModules } from './craft.js';
import { craftOpsModules } from './craft-ops.js';
import { craftSeniorModules } from './craft-senior.js';

/**
 * Every module, one file per author, concatenated in stage order. The stage
 * list in ../tracks.js decides the path; this order only affects listings.
 * @type {import('../types.d.ts').Module[]}
 */
export const modules = [
  ...jsModules,
  ...tsModules,
  ...webPlatformModules,
  ...reactModules,
  ...nodeModules,
  ...webModules,
  ...dataModules,
  ...csharpModules,
  ...dotnetModules,
  ...craftModules,
  ...craftOpsModules,
  ...craftSeniorModules,
];
