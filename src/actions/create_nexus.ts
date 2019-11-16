import BaseAction from "./base_action";

export default class CreateNexusAction extends BaseAction {

	constructor(time: number) {
		super("CreateNexus", time);
	}
}