export default class BaseAction {

	private name: string;
	private time: number;

	constructor(name: string, time: number) {
		this.name = name;
		this.time = time;
	}
}