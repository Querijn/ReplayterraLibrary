import CardInfo from "./card_info";
import LoRRect from "./LegendsOfRuneterra/Rect";

export default class NexusInfo extends CardInfo {

	constructor(rect: LoRRect) {
		super(rect);
		this.isNexus = true;
	}
}