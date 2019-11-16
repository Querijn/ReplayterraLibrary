import LoRRect from "./LegendsOfRuneterra/Rect";

export default class CardInfo {

	public id: string;
	public code: string;
	public isNexus: false;
	
	private _prevX: number;
	private _prevY: number;
	
	private _x: number;
	private _y: number;
	
	public width: number;
	public height: number;

	constructor(rect: LoRRect) {
		this.id = rect.CardID;
		this.code = rect.CardCode;
		this.isNexus = false;
		
		this._prevX = this._x = rect.TopLeftX;
		this._prevY = this._y = rect.TopLeftY;

		this.width = rect.Width;
		this.height = rect.Height;
	}

	setPos(x: number, y: number) {
		this._prevX = this._x;
		this._prevY = this._y;

		this._x = x;
		this._y = y;
	}
	
	resetPos(x: number, y: number) {
		this._prevX = this._x;
		this._prevY = this._y;
	}
	
	get x() {
		return this._x;
	}
	
	get y() {
		return this._y;
	}
	
	get prevX() {
		return this._x;
	}
	
	get prevY() {
		return this._y;
	}

	get hasMoved() {
		return this._x != this._prevX || this._y != this._prevY;
	}
}