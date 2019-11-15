const CardInfo = require("./card_info");

module.exports = class NexusInfo extends CardInfo {

	constructor(rect) {
		super(rect);
		this.isNexus = true;
	}
}