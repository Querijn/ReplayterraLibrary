const GameInfo = require("./game_info");
const fetch = require("node-fetch");

const replayApiUrl = `http://lor.stelar7.no/api/`;
const userId = 2;
const defaultTimeInterval = 500;
const replay = `hOH5d7qm0WfY2JQccnoCnLwzUuBKryrfNSCAwZJOtQ206RTqGVWuiZ7jgMx8M9AEe9k45FIDjDXesK1Ilv6lTHiGaokUSPbLFNpV`;

let timeInterval = defaultTimeInterval; // Set to default. Update if possible.

async function test() {

	timeIntervalUpdate = await fetch(`http://lor.stelar7.no/api/polling.php?short`);
	if (timeIntervalUpdate.ok) {
		try {
			const text = await timeIntervalUpdate.text();
			timeInterval = parseInt(text);
		}
		catch {
			timeIntervalUpdate = defaultTimeInterval; // Make sure we haven't got a dummy value.
		}

		if (timeIntervalUpdate != defaultTimeInterval) {
			console.log(`Frame interval is ${timeInterval} instead of the default of ${defaultTimeInterval}`);
		}
	}

	const fs = require("fs");
	const gameInfo = new GameInfo();

	let lastFrame = null;
	let fetchAttempts = 0;
	for (let frameIndex = 1; true; frameIndex++) {
		console.warn(`Loading frame ${frameIndex}..`);
		const response = await fetch(`${replayApiUrl}/replays/${replay}/${userId}/${timeInterval * frameIndex}.json`);

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