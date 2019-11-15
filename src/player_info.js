const CardSet = require("./card_set")

module.exports = class PlayerInfo {

	constructor() {
		this.nexusHealth = 20;

		this.drawnCards = new CardSet();
		this.handCards = new CardSet();
		this.benchCards = new CardSet();
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