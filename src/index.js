const GameInfo = require("./game_info");
const fetch = require("node-fetch");

const replayApiUrl = `http://lor.stelar7.no/api`;
const testReplay = `hOH5d7qm0WfY2JQccnoCnLwzUuBKryrfNSCAwZJOtQ206RTqGVWuiZ7jgMx8M9AEe9k45FIDjDXesK1Ilv6lTHiGaokUSPbLFNpV`;

async function convertReplay(replayUuid) {

	// TODO: The below needs a user ID.
	const replayInfoResponse = await fetch(`${replayApiUrl}/replay_by_id.php?id=${replayUuid}`);
	if (replayInfoResponse.ok == false)
		throw new Error('Replay not found');

	const replayInfo = await replayInfoResponse.json();
	const timeInterval = parseInt(replayInfo.interval);
	const userId = replayInfo.user_id;
	const lastFrameIndex = parseInt(replayInfo.last_frame) / parseInt(replayInfo.interval);

	const fs = require("fs");
	const gameInfo = new GameInfo();

	let lastFrame = null; // The json of the last frame.
	let fetchAttempts = 0;
	for (let frameIndex = 1; frameIndex < lastFrameIndex; frameIndex++) {

		const currentTime = timeInterval * frameIndex;
		console.warn(`Loading frame ${frameIndex} (time = ${currentTime})..`);
		const response = await fetch(`${replayApiUrl}/replays/${replayUuid}/${userId}/${currentTime}.json`);

		 // TODO: The api needs to tell us either what frames are there or what the last frame is.
		 // Currently it can skip a frame if it's the same as the previous one
		if (response.ok == false) {
			console.warn(`Could not find frame ${frameIndex} (time: ${currentTime}, response: ${response.status} ${response.statusText}, attempt: ${fetchAttempts})`);

			if (lastFrame == null) 
				throw new Error('Unable to fetch last frame!');
		}

		const json = response.ok ? await response.json() : lastFrame;
		gameInfo.feedFrame(currentTime, json);
		console.warn(`Loaded frame ${response.ok ? frameIndex : frameIndex - 1}.`);
		lastFrame = json;
	}

	fs.writeFileSync(`${replayUuid}_${userId}.json`, gameInfo.asJsonString()); // Write as json string
}
convertReplay(testReplay);