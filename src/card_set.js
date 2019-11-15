const CardInfo = require("./card_info");
const NexusInfo = require("./nexus_info");

module.exports = class CardSet {
	constructor(gameInfo) {
		this.gameInfo = gameInfo;
		this.cards = {};
	}

	addCard(rect) {

		const id = rect.CardID;
		if (this.cards[id] != null)
			throw new Error(`DuplicateCardError: We already have a card in the set with card ID ${id}`);

		this.cards[id] = new CardInfo(rect);

		if (this.gameInfo) // If it's null, we're in the allCards CardSet itself.
			this.gameInfo.allCards._addExistingCard(this.cards[id]);

		return this.cards[id];
	}

	_addExistingCard(card) {

		if (this.gameInfo)
			throw new Error("Cannot call this on non-parent.");

		const id = card.id;
		if (this.cards[id] != null)
			throw new Error(`DuplicateCardError: We already have a card in the set with card ID ${id}`);

		this.cards[id] = card;

		return this.cards[id];
	}

	get cardArray() {
		return Object.values(this.cards);
	}

	get length() {
		return Object.keys(this.cards).length;
	}

	hasCard(id) {
		return this.cards[id] != null;
	}

	getCard(id) {
		return this.cards[id];
	}

	removeCard(id) {
		delete this.cards[id];

		if (this.gameInfo)
			this.gameInfo.allCards.removeCard(id);
	}

	addNexus(rect) {
		if (this.gameInfo != null) // This call only works for allCards.
			return;

		this.cards[rect.CardID] = new NexusInfo(rect);
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

	moveTo(cardSet) {
		cardSet.cards = this.cards;
		this.cards = {};
	}
}