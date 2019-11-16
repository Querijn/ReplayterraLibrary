import GameInfo from "./game_info";
import fetch from "node-fetch";
import debug from "./debug";
import LoRFrame from "./LegendsOfRuneterra/Frame";
import fs = require("fs");

const replayApiUrl = `http://lor.stelar7.no/api`;
const testReplay = `1SZd5UVI7Cnsd4rtNshcPGLjK5F92WAYQX0eTyMDbgzEhmubDST34BGO8x7KfBL6UO3cXEwk0yllNiawjoHIrVQn8PqHRkZvpMt9`;

async function convertReplay(replayUuid: string) {

	// TODO: The below needs a user ID.
	const replayInfoResponse = await fetch(`${replayApiUrl}/replay_by_id.php?id=${replayUuid}`);
	if (replayInfoResponse.ok == false)
		throw new Error('Replay not found');

	const replayInfo = await replayInfoResponse.json();
	const timeInterval = parseInt(replayInfo.interval);
	const userId = replayInfo.tracker_id;
	const lastFrameIndex = parseInt(replayInfo.last_frame) / parseInt(replayInfo.interval);

	const gameInfo = new GameInfo();

	let lastFrame = null; // The json of the last frame.
	for (let frameIndex = 1; frameIndex < lastFrameIndex; frameIndex++) {

		const currentTime = timeInterval * frameIndex;
		debug.warn(`Loading frame ${frameIndex} (time = ${currentTime})..`);
		const response = await fetch(`${replayApiUrl}/replays/${replayUuid}/${userId}/${currentTime}.json`);

		 // Currently it can skip a frame if it's the same as the previous one
		if (response.ok == false) {
			debug.warn(`Could not find frame ${frameIndex} (time: ${currentTime}, response: ${response.status} ${response.statusText})`);

			if (lastFrame == null)
				throw new Error('Unable to fetch last frame!');
		}

		const currentFrame: LoRFrame = response.ok ? await response.json() : lastFrame;
		gameInfo.feedFrame(currentTime, currentFrame);
		lastFrame = currentFrame;
	}

	return gameInfo.asJsonString();
}

async function test() {
	if (!fs.existsSync("replays")) fs.mkdirSync("replays");
	fs.writeFileSync(`replays/${testReplay}.json`, convertReplay(testReplay));
}
test();