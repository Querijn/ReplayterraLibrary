module.exports = class CardInfo {

	constructor(id, code) {
		this.id = id;
		this.code = code;
		this.isNexus = false;
		
		this._x = -9999;
		this._y = -9999;
		this._prevX = -9999;
		this._prevY = -9999;
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