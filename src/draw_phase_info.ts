import CardInfo from "./card_info";

export default class DrawPhaseInfo {

	public replacedCards: CardInfo[];
	public receivedCards: CardInfo[];

	constructor() {
		this.replacedCards = [];
		this.receivedCards = [];
	}
}