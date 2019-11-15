const Boardmapper = require("replayterra_boardmapper");
const PlayerInfo = require("./player_info");
const GameStateData = require("./game_state");
const GameState = GameStateData.GameState;
const GameStateNames = GameStateData.GameStateNames;

const LocationType = Boardmapper.LocationType;
const LocationTypeNames = Boardmapper.LocationTypeNames;
const FieldOwner = Boardmapper.FieldOwner;
const FieldOwnerNames = Boardmapper.FieldOwnerNames;

module.exports = class GameInfo {

	constructor() {
		Boardmapper.load(); // Prepare the source image

		this.currentTime = 0;
		this.gameState = GameState.Init;

		this.you = new PlayerInfo();
		this.them = new PlayerInfo();

		this.actions = [];
	}

	feedFrame(json) {

		switch (this.gameState) {
			case GameState.Init:
				this._handleInitFrame(json);
				break;
			case GameState.Draw:
				this._handleDrawFrame(json);
				break;
		}
	}

	_handleInitFrame(json) {

		this._handleGenericEvents(json);

		// First, check if we're still in init frame:
		if (json.OpponentName != null && json.PlayerName != null) {
			console.log(`This replay is a match between ${json.OpponentName} and ${json.PlayerName}.`);
			this._setToNextGameState(json);
			return;
		}

		// Do init stuff here (which I don't have right now)
	}

	_handleDrawFrame(json) {

		this._handleGenericEvents(json);

		/*
			When we're in draw, we get 4 cards in the middle, which you can replace for other cards.
			When those cards are replaced, eventually the cards will move to the hand. This means draw
			phase is over.
		*/

		// Handle draw events here.
	}

	_handleGenericEvents(json) {
		const screenWidth = json.Screen.ScreenWidth;
		const screenHeight = json.Screen.ScreenHeight;

		for (const rect of json.Rectangles) {

			const centerX = rect.TopLeftX + rect.Width / 2;
			const centerY = rect.TopLeftY + rect.Height / 2;

			const relativeX = centerX / screenWidth;
			const relativeY = centerY / screenHeight;

			const objectLocation = Boardmapper.getObjectLocation(relativeX, relativeY);

			const player = objectLocation.fieldOwner == FieldOwner.You ? this.you : this.them;
			const fieldOwnerName = FieldOwnerNames[objectLocation.fieldOwner]; // "You" or "Them"
			
			switch (objectLocation.location) {
				case LocationType.Draw:
					if (player.drawnCards.hasCard() == false) {
						player.drawnCards.addCard(rect.CardID, rect.CardCode);
						debugger;
					}
					break;

				case LocationType.Nexus:
					if (player.nexus === 0) { // Nexus is not initialised
						player.nexus = rect.CardID;
						console.log(`Initialised a nexus (Owner = ${fieldOwnerName}, ID = ${player.nexus})`);
					}
					break;
			}
		}
	}

	_setToNextGameState(json) {

		const oldState = this.gameState;

		switch (this.gameState) {
			case GameState.Init:
				this.gameState = GameState.Draw;
				break;
			case GameState.Draw:
				// Shit, how do we detect who goes first?
				debugger;
				break;
		}

		console.log(`Switched from state ${GameStateNames[oldState]} to ${GameStateNames[this.gameState]}`)
	}
	
	asJsonString() {
		
		// TODO: get a json string
		return JSON.stringify({});
	}
}