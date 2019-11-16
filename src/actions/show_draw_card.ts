import BaseAction from "./base_action";

export default class ShowDrawCardAction extends BaseAction {

	public id: string;
	public code: string;

	constructor(time: number, id: string, code: string) {
		super("ShowDrawCard", time);

		this.id = id;
		this.code = code;
	}
}