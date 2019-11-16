"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const process_1 = __importDefault(require("process"));
let imageReader = null;
const pluginName = '../build/Release/replayterra_boardmapper';
const pluginDebugName = '../build/Debug/replayterra_boardmapper';
const forceDebug = false;
if (forceDebug) {
    imageReader = require(pluginDebugName);
}
else
    try {
        imageReader = require(pluginName);
        console.log("Loaded release version.");
    }
    catch (e) {
        console.warn(`Unable to find release module: ${pluginName}`);
        imageReader = require(pluginDebugName);
    }
if (imageReader.load("assets/layer_template.png") == false) {
    console.error("Unable to open the board mapping image");
    process_1.default.exit(-1);
}
else {
    console.log("Red at 2,2", imageReader.getRed(0, 0.49));
    console.log("End of app.");
    imageReader.unload();
}
//# sourceMappingURL=test.js.map