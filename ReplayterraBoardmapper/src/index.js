const LocationType = module.exports["LocationType"] = Object.freeze({
	"Unknown": 0,
	"Draw": 1,
	"Hand": 2,
	"Bench": 3,
	"Field": 4,
	"Nexus": 5
});

module.exports["LocationTypeNames"] = translateToNames(module.exports["LocationType"]);

const FieldOwner = module.exports["FieldOwner"] = Object.freeze({
	"You": 0,
	"Them": 1
});

module.exports["FieldOwnerNames"] = translateToNames(module.exports["FieldOwner"]);

const process = require('process');
let imageReader = null;
const pluginName = '../build/Release/replayterra_boardmapper';
const pluginDebugName = '../build/Debug/replayterra_boardmapper';

module.exports["getBuildTime"] = () => imageReader.getBuildTime();

module.exports["getObjectLocation"] = function(x, y, isDrawPhase) {

	const result = {};

	// Figure out the field
	const fieldOwnerId = imageReader.getRed(x, y);
	switch (fieldOwnerId) {
		case 0: 
			result.fieldOwner = FieldOwner.You;
			break;

		case 255:
			result.fieldOwner = FieldOwner.Them;
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
	if (isDrawPhase || result.location === LocationType.Unknown) {
		switch (nexusId) {
			default:
			case 0: 
				if (result.location)
					console.error(`Unable to determine card location type at ${x}, ${y}! (LocationID: ${locationId}, NexusID: ${nexusId})`)
		
				result.location = LocationType.Unknown;
				break;
	
			case 255:
				result.location = LocationType.Nexus;
				break;
	
			case 128:
				result.location = LocationType.Draw;
				break;
		}
	}

	return result;
}

module.exports["load"] = function(forceDebug) {
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

process.on('beforeExit', (code) => {
	imageReader.unload();
	console.log("Unloaded module.");
});

function translateToNames(object) {
	let names = {};
	let keys = Object.keys(object);
	
	for (let i = keys.length - 1; i >= 0; i--) {
		const value = object[keys[i]];
		names[value] = keys[i];
	}

	return names;
}
