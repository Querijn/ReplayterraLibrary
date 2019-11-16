import CardInfo from "./card_info";

export default class NexusInfo extends CardInfo {

	constructor(rect) {
		super(rect);
		this.isNexus = true;
	}
}