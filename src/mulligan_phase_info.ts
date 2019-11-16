import CardInfo from "./card_info";

export default class MulliganPhaseInfo {

	public replacedCards: CardInfo[];
	public receivedCards: CardInfo[];

	constructor() {
		this.replacedCards = [];
		this.receivedCards = [];
	}
}