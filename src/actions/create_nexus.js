const BaseAction = require("./base_action");

module.exports = class CreateNexusAction extends BaseAction {

	constructor(time) {
		super("CreateNexus", time);
	}
}