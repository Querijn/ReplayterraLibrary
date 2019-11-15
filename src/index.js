const GameInfo = require("./game_info");
const fetch = require("node-fetch");

const replayApiUrl = `http://lor.stelar7.no/api/replays/`;
const userId = 2;
const timeInterval = 500;
const replay = `hOH5d7qm0WfY2JQccnoCnLwzUuBKryrfNSCAwZJOtQ206RTqGVWuiZ7jgMx8M9AEe9k45FIDjDXesK1Ilv6lTHiGaokUSPbLFNpV`;

async function test() {
	const fs = require("fs");
	const gameInfo = new GameInfo();

	let lastFrame = null;
	let fetchAttempts = 0;
	for (let frameIndex = 1; true; frameIndex++) {
		console.warn(`Loading frame ${frameIndex}..`);
		const response = await fetch(`${replayApiUrl}/${replay}/${userId}/${timeInterval * frameIndex}.json`);

		 // TODO: The api needs to tell us either what frames are there or what the last frame is.
		 // Currently it can skip a frame if it's the same as the previous one
		if (response.ok == false) {
			console.warn(`Could not find frame ${frameIndex} (value: ${timeInterval * frameIndex}, response: ${response.status} ${response.statusText}, attempt: ${fetchAttempts})`);

			// First frame is not there, or we've tried over 10 times.
			if (lastFrame == null || fetchAttempts++ > 10)
				break;
		}

		const json = response.ok ? await response.json() : lastFrame;
		gameInfo.feedFrame(json);
		console.warn(`Loaded frame ${response.ok ? frameIndex : frameIndex - 1}.`);
		lastFrame = json;
	}

	fs.writeFileSync(`${replay}_${userId}.json`, gameInfo.asJsonString()); // Write as json string
}
test();