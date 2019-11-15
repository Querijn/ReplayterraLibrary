const BaseAction = require("./base_action");

module.exports = class ShowDrawCardAction extends BaseAction {

	constructor(time, id, code) {
		super("ShowDrawCard", time);

		this.id = id;
		this.code = code;
	}
}