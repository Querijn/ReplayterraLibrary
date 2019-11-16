// Config:
const pluginName = '../build/Release/replayterra_boardmapper';
const pluginDebugName = '../build/Debug/replayterra_boardmapper';

enum LocationType {
	Unknown = 0,
	Draw = 1,
	Hand = 2,
	Bench = 3,
	Field = 4,
	Nexus = 5
};

import process from 'process';
let imageReader: any = null;

export default {

    LocationType: LocationType,

    getBuildTime: function () { return imageReader.getBuildTime(); },

    getObjectLocation: function (x: number, y: number, isDrawPhase: boolean): LocationType {

        let result: LocationType;

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
                        console.error(`Unable to determine card location type at ${x}, ${y}! (LocationID: ${locationId}, NexusID: ${nexusId})`)
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

    load: function (forceDebug: boolean = false) {
        if (forceDebug) {
            imageReader = require(pluginDebugName);
        }
        else try {
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
            process.exit(-1);
        }
    }
}


process.on('beforeExit', (code: number) => {
	imageReader.unload();
	console.log("Unloaded module.");
});