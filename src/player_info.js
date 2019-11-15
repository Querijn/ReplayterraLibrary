const CardSet = require("./card_set")

module.exports = class PlayerInfo {

	constructor(gameInfo) {
		this.nexusHealth = 20;

		this.drawnCards = new CardSet(gameInfo);
		this.handCards = new CardSet(gameInfo);
		this.benchCards = new CardSet(gameInfo);
		this.gameInfo = gameInfo;
	}

	get nexus() {
		return this.nexusId || 0;
	}

	set nexus(id) {

		if (this.nexusId) {
			console.warn(`Tried to set a new nexus ID: ${id}, but we already have an ID.. (${this.nexusId})`);
			return this.nexusId;
		}

		this.nexusId = id;
		return this.nexusId;
	}
}