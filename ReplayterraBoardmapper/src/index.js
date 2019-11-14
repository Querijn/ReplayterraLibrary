const LocationType = Object.freeze({
	"Unknown": 0,
	"Draw": 1,
	"Hand": 2,
	"Bench": 3,
	"Field": 4,
	"Nexus": 5
});

const FieldOwner = Object.freeze({
	"You": 0,
	"Them": 1
});

const process = require('process');
let imageReader = null;
const pluginName = '../build/Release/replayterra_boardmapper';
const pluginDebugName = '../build/Debug/replayterra_boardmapper';

export function getObjectLocation(x, y) {

	const result = {};

	// Figure out the field
	const fieldOwnerId = imageReader.getRed(x, y);
	switch (fieldOwnerId) {
		case 0: 
			result.fieldOwner = FieldOwner.You;
			break;

		case 255:
			result.FieldOwner = FieldOwner.Them;
			break;

		default:
			result.fieldOwner = FieldOwner.You;
			console.error("Unidentified field owner ID found: " + fieldOwnerId);
			break;
	}

	const locationId = imageReader.getGreen(x, y);
	switch (locationId) {
		default:
		case 0: 
			result.location = LocationType.Unknown;
			break;

		case 64:
			result.location = LocationType.Bench;
			break;

		case 192:
			result.location = LocationType.Hand;
			break;

		case 255:
			result.location = LocationType.Field;
			break;
	}

	const nexusId = imageReader.getBlue(x, y);
	if (result.location === LocationType.Unknown) {
		switch (nexusId) {
			default:
			case 0: 
				result.location = LocationType.Unknown;
				console.error(`Unable to determine card location type at ${x}, ${y}! (LocationID: ${locationId}, NexusID: ${nexusId})`)
				break;
	
			case 255:
				result.location = LocationType.Nexus;
				break;
		}
	}

	return result;
}

export function load(forceDebug) {
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
	
	if (imageReader.load("assets/layer_template.png") == false) {
		console.error("Unable to open the board mapping image");
		process.exit(-1);
	}
}

process.on('beforeExit', (code) => {
	imageReader.unload();
});