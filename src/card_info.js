module.exports = class CardInfo {

	constructor(rect) {
		this.id = rect.CardID;
		this.code = rect.CardCode;
		this.isNexus = false;
		
		this._prevX = this._x = rect.TopLeftX;
		this._prevY = this._y = rect.TopLeftY;

		this.width = rect.Width;
		this.height = rect.Height;
	}

	setPos(x, y) {
		this._prevX = this._x;
		this._prevY = this._y;

		this._x = x;
		this._y = y;
	}
	
	resetPos(x, y) {
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