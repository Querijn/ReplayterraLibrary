import BaseAction from "./base_action";

export default class ReplaceMulliganCardAction extends BaseAction {

	public oldCard = { id: "", code: "" };
	public newCard = { id: "", code: "" };

	constructor(time: number, oldCardId: string, oldCardCode: string, newCardId: string, newCardCode: string) {
		super("ReplaceMulliganCard", time);

		this.oldCard.id = oldCardId;
		this.oldCard.code = oldCardCode;

		this.newCard.id = newCardId;
		this.newCard.code = newCardCode;
	}
}