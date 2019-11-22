import { rectifyAPIFrame } from "./util";
import EventTranslator from "./translator";
import { LORApiFrame } from "./types";

// Step 0: Get a replay.
const replay: LORApiFrame[] = require("../replay.json");

// Step 1: Rectify API frames. This is required.
replay.forEach(rectifyAPIFrame);

// Step 2: Create a translator.
const translator = new EventTranslator(replay[0]);

// Step 3: Feed frames.
replay.slice(1).forEach(frame => translator.handleFrame(frame));

// Step 4: Finalize and print events!
console.log(JSON.stringify(translator.finalize(), null, 4));