const CardInfo = require("./card_info");

module.exports = class CardSet {
	constructor() {
		this.cards = {};
	}

	addCard(id, code) {
		this.cards[id] = new CardInfo(id, code);
	}

	hasCard(id) {
		return this.cards[id] != null;
	}

	removeCard(id) {
		delete this.cards[id];
	}
}