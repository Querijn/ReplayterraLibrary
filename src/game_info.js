const config = require("./config");
const debug = require("./debug");
const Boardmapper = require("replayterra_boardmapper");
const PlayerInfo = require("./player_info");
const GameStateData = require("./game_state");
const CardSet = require("./card_set");
const GameState = GameStateData.GameState;
const GameStateNames = GameStateData.GameStateNames;

const CreateNexus = require("./actions/create_nexus");
const ShowDrawCardAction = require("./actions/show_draw_card");

const LocationType = Boardmapper.LocationType;
const LocationTypeNames = Boardmapper.LocationTypeNames;
const FieldOwner = Boardmapper.FieldOwner;
const FieldOwnerNames = Boardmapper.FieldOwnerNames;
module.exports = class GameInfo {

	constructor() {
		Boardmapper.load(); // Prepare the source board image layout

		debug.log(`The BoardMapper was built at ${Boardmapper.getBuildTime()}`); // I have the feeling it does not build sometimes.

		this.currentTime = 0;
		this.gameState = GameState.Init;

		this.you = new PlayerInfo(this);
		this.them = new PlayerInfo(this);

		this.actions = [];
		this.drawPhase = new DrawPhaseInfo();
		this.allCards = new CardSet(null); // This will contain ALL known cards.
	}

	feedFrame(time, json) {

		switch (this.gameState) {
			case GameState.Init:
				this._handleInitFrame(time, json);
				break;
			case GameState.Draw:
				this._handleDrawFrame(time, json);
				break;
		}
	}

	_handleInitFrame(time, json) {

		this._handleGenericEvents(time, json);

		// First, check if we're still in init frame:
		if (json.OpponentName != null && json.PlayerName != null) {
			debug.log(`This replay is a match between ${json.OpponentName} and ${json.PlayerName}.`);
			this._setToNextGameState(time, json);
			return;
		}

		// Do init stuff here (which I don't have right now)
	}

	_handleDrawFrame(time, json) {

		this._handleGenericEvents(time, json);

		/*
			When we're in draw, we get 4 cards in the middle, which you can replace for other cards.
			When those cards are replaced, eventually the cards will move to the hand. This means draw
			phase is over.
		*/
		let cardCount = 0;
		for (const rect of json.Rectangles) {

			const player = rect.LocalPlayer ? this.you : this.them; // Should always be "this.you".

			const card = this.allCards.getCard(rect.CardID);
			if (card && card.isNexus) // ignore nexuses
				continue;
			
			if (card == null) { // Card doesn't exist yet, add action.
				player.drawnCards.addCard(rect.CardID, rect.CardCode);
				this.actions.push(new ShowDrawCardAction(time, rect.CardID, rect.CardCode));
				debug.log(`${rect.LocalPlayer ? "You" : "They"} drew a card  (${rect.CardCode}) at ${time} (Draw Phase)`);
			}
			cardCount++;
		}

		if (cardCount == config.drawCount) {
			debugger;
		}

		// Handle draw events here.
	}

	_handleGenericEvents(time, json) {
		const screenWidth = json.Screen.ScreenWidth;
		const screenHeight = json.Screen.ScreenHeight;

		for (const rect of json.Rectangles) {

			const centerX = rect.TopLeftX + rect.Width / 2;
			const centerY = rect.TopLeftY + rect.Height / 2;

			const relativeX = centerX / screenWidth;
			const relativeY = centerY / screenHeight;

			const objectLocation = Boardmapper.getObjectLocation(relativeX, relativeY);

			// TODO: Fully get rid of FieldOwner (in favor of rect.LocalPlayer)
			const fieldOwner = rect.LocalPlayer ? FieldOwner.You : FieldOwner.Them;
			const player = rect.LocalPlayer ? this.you : this.them;
			const fieldOwnerName = FieldOwnerNames[fieldOwner]; // "You" or "Them"
			
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
						this.allCards.addNexus(rect.CardID);
						
						this.actions.push(new CreateNexus(time));
						debug.log(`Initialised a nexus (Owner = ${fieldOwnerName}, ID = ${player.nexus}, time = ${time})`);
					}
					break;
			}
		}
	}

	_setToNextGameState(time, json) {

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

		debug.log(`Switched from state ${GameStateNames[oldState]} to ${GameStateNames[this.gameState]} at ${time}`)
	}
	
	asJsonString() {
		
		// TODO: get a json string
		return JSON.stringify({});
	}
}