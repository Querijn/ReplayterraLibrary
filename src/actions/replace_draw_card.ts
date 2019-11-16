import BaseAction from "./base_action";

export default class ReplaceDrawCardAction extends BaseAction {

	public oldCard: { id: string; code: string; };
	public newCard: { id: string; code: string; };

	constructor(time: number, oldCardId: string, oldCardCode: string, newCardId: string, newCardCode: string) {
		super("ReplaceDrawCard", time);

		this.oldCard.id = oldCardId;
		this.oldCard.code = oldCardCode;

		this.newCard.id = newCardId;
		this.newCard.code = newCardCode;
	}
}