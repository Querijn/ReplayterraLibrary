const BaseAction = require("./base_action");

module.exports = class ReplaceDrawCardAction extends BaseAction {

	constructor(time, oldCardId, oldCardCode, newCardId, newCardCode) {
		super("ReplaceDrawCard", time);

		this.oldCardId = oldCardId;
		this.oldCardCode = oldCardCode;

		this.newCardId = newCardId;
		this.newCardCode = newCardCode;
	}
}