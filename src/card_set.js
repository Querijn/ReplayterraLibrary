const CardInfo = require("./card_info");
const NexusInfo = require("./nexus_info");

module.exports = class CardSet {
	constructor(gameInfo) {
		this.gameInfo = gameInfo;
		this.cards = {};
	}

	addCard(id, code) {
		this.cards[id] = new CardInfo(id, code);

		if (this.gameInfo) // If it's null, we're in the allCards CardSet itself.
			this.gameInfo.allCards.addCard(id, code);
	}

	hasCard(id) {
		return this.cards[id] != null;
	}

	getCard(id) {
		return this.cards[id];
	}

	removeCard(id) {
		delete this.cards[id];
	}

	addNexus(id) {
		if (this.gameInfo != null) // This call only works for allCards.
			return;

		this.cards[id] = new NexusInfo(id);
	}

	isNexus(id) {
		if (this.gameInfo != null) // This call only works for allCards.
			return;

		return this.cards[id] && this.cards[id].isNexus;
	}

	removeNexus(id) {
		if (this.gameInfo != null) // This call only works for allCards.
			return;

		if (this.cards[id].isNexus)
			delete this.cards[id];
	}
}