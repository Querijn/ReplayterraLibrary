const CardInfo = require("./card_info");

module.exports = class NexusInfo extends CardInfo {

	constructor(id) {
		super(id, "face");
		this.isNexus = true;
	}
}