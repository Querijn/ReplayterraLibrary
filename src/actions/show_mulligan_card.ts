import BaseAction from "./base_action";

export default class ShowMulliganCardAction extends BaseAction {

	public id: string;
	public code: string;

	constructor(time: number, id: string, code: string) {
		super("ShowMulliganCard", time);

		this.id = id;
		this.code = code;
	}
}