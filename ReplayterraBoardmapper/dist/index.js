"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// Config:
const pluginName = '../build/Release/replayterra_boardmapper';
const pluginDebugName = '../build/Debug/replayterra_boardmapper';
var LocationType;
(function (LocationType) {
    LocationType[LocationType["Unknown"] = 0] = "Unknown";
    LocationType[LocationType["Draw"] = 1] = "Draw";
    LocationType[LocationType["Hand"] = 2] = "Hand";
    LocationType[LocationType["Bench"] = 3] = "Bench";
    LocationType[LocationType["Field"] = 4] = "Field";
    LocationType[LocationType["Nexus"] = 5] = "Nexus";
})(LocationType = exports.LocationType || (exports.LocationType = {}));
;
const process_1 = __importDefault(require("process"));
let imageReader = null;
exports.Boardmapper = {
    getBuildTime: function () { return imageReader.getBuildTime(); },
    getObjectLocation: function (x, y, isDrawPhase) {
        let result;
        const locationId = imageReader.getGreen(x, y);
        switch (locationId) {
            default:
            case 0:
                result = LocationType.Unknown;
                break;
            case 64:
                result = LocationType.Bench;
                break;
            case 192:
                result = LocationType.Hand;
                break;
            case 255:
                result = LocationType.Field;
                break;
        }
        const nexusId = imageReader.getBlue(x, y);
        if (isDrawPhase || result === LocationType.Unknown) {
            switch (nexusId) {
                default:
                case 0:
                    if (result === LocationType.Unknown) {
                        console.error(`Unable to determine card location type at ${x}, ${y}! (LocationID: ${locationId}, NexusID: ${nexusId})`);
                    }
                    break;
                case 255:
                    result = LocationType.Nexus;
                    break;
                case 128:
                    result = LocationType.Draw;
                    break;
            }
        }
        return result;
    },
    load: function (forceDebug = false) {
        if (forceDebug) {
            imageReader = require(pluginDebugName);
        }
        else
            try {
                imageReader = require(pluginName);
                console.log("Loaded release module.");
            }
            catch (e) {
                console.warn(`Unable to find release module: ${pluginName}`);
                imageReader = require(pluginDebugName);
            }
        const imagePath = __dirname + "/../assets/layer_template.png";
        if (imageReader.load(imagePath) == false) {
            console.error(`Unable to open the board mapping image at "${imagePath}"`);
            process_1.default.exit(-1);
        }
    }
};
process_1.default.on('beforeExit', (code) => {
    imageReader.unload();
    console.log("Unloaded module.");
});
//# sourceMappingURL=index.js.map