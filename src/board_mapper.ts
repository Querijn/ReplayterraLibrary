import Jimp from 'jimp';

let image: any  = null;
let bpp = 3;

export enum LocationType {
	Unknown = 0,
	Draw = 1,
	Hand = 2,
	Bench = 3,
	Field = 4,
	Nexus = 5
};

enum LocationColourGreen {
	Unknown = 0,
	Bench = 64,
	Hand = 192,
	Field = 255
};

enum LocationColourBlue {
	Unknown = 0,
	Draw = 128,
	Nexus = 255
};

function getColour(x: number, y: number, i: number): any {
	
	if (x < 0 || y < 0 || x > 1 || y > 1)
		console.warn("Boardmapper.getColour expected x and y between 0 and 1, got %3.2f and %3.2f instead. We're clamping these numbers!\n", x, y);

	y = 1 - y;

	if (x < 0) x = 0;
	if (y < 0) y = 0;

	x *= image.bitmap.width;
	y *= image.bitmap.height;

	// Not exact, but i dont think the exact edges are needed?
	if (y >= image.bitmap.height)
		y = image.bitmap.height - 1;
	if (x >= image.bitmap.width)
		x = image.bitmap.width - 1;
		
	const pixelIndex = Math.floor(y) * image.bitmap.width + Math.floor(x);
	const pixel = image.bitmap.data[pixelIndex * bpp + i];
	
	// const max = image.bitmap.height * image.bitmap.width * bpp;
	// console.log(`Boardmapper.getColour: ${x}, ${y} -> pixel ${pixelIndex * bpp + i} / ${max} -> result = ${pixel}\n`);
	
	return pixel;
}

function getGreen(x: number, y: number): LocationColourGreen {
	return <LocationColourGreen>getColour(x, y, 1);
}

function getBlue(x: number, y: number): LocationColourBlue {
	return <LocationColourBlue>getColour(x, y, 2);
}

export const Boardmapper = {

	getObjectLocation: function (x: number, y: number, isDrawPhase: boolean): LocationType {

		let result: LocationType;

		const locationId = getGreen(x, y);
		switch (locationId) {
			default:
			case LocationColourGreen.Unknown: 
				result = LocationType.Unknown;
				break;

			case LocationColourGreen.Bench:
				result = LocationType.Bench;
				break;

			case LocationColourGreen.Hand:
				result = LocationType.Hand;
				break;

			case LocationColourGreen.Field:
				result = LocationType.Field;
				break;
		}

		const nexusId = getBlue(x, y);
		if (isDrawPhase || result === LocationType.Unknown) {
			switch (nexusId) {
				default:
				case LocationColourBlue.Unknown: 
					if (result === LocationType.Unknown) {
						console.error(`Unable to determine card location type at ${x}, ${y}! (LocationID: ${locationId}, NexusID: ${nexusId})`)
					}
					break;
		
				case LocationColourBlue.Nexus:
					result = LocationType.Nexus;
					break;
		
				case LocationColourBlue.Draw:
					result = LocationType.Draw;
					break;
			}
		}

		return result;
	},

	load: async function (forceDebug: boolean = false) {
		const imagePath = __dirname + "/../assets/layer_template.png";

		try { 
			image = await Jimp.read(imagePath);
			bpp = image.bitmap.data.length / (image.bitmap.height * image.bitmap.width);
		}
		catch (e) {
			throw new Error(`Unable to open the board mapping image at "${imagePath}" (${e.toString()})`);
		}
	}
}