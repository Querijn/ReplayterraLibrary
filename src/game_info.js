const config = require("./config");
const debug = require("./debug");
const Boardmapper = require("replayterra_boardmapper");
const CardSet = require("./card_set");

const PlayerInfo = require("./player_info");
const DrawPhaseInfo = require("./draw_phase_info");

const GameStateData = require("./game_state");
const GameState = GameStateData.GameState;
const GameStateNames = GameStateData.GameStateNames;

const CreateNexusAction = require("./actions/create_nexus");
const ShowDrawCardAction = require("./actions/show_draw_card");

const DrawPhase = Object.freeze({
	"WaitForAppear": "WaitForAppear",				// Waiting for the cards to appear.
	"WaitForResolve": "WaitForResolve"				// Waiting for either cards to get replaced, or them to move to hand
});

const LocationType = Boardmapper.LocationType;
const LocationTypeNames = Boardmapper.LocationTypeNames;
const FieldOwner = Boardmapper.FieldOwner;
const FieldOwnerNames = Boardmapper.FieldOwnerNames;
module.exports = class GameInfo {

	constructor() {
		Boardmapper.load(); // Prepare the source board image layout

		debug.log(`The BoardMapper was built on ${Boardmapper.getBuildTime()}`); // I have the feeling it does not build sometimes.

		this.currentTime = 0;
		this.gameState = GameState.Init;
		this.subState = null;

		this.screenWidth = 1;
		this.screenHeight = 1;

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

	_rectToObjLocation(rect) {
		
		const centerX = rect.TopLeftX + rect.Width / 2;
		const centerY = rect.TopLeftY - rect.Height / 2; // This has to be negative because of the y coordinate inversion

		const relativeX = centerX / this.screenWidth;
		const relativeY = centerY / this.screenHeight;

		const isDrawPhase = this.gameState == GameState.Draw;
		const location = Boardmapper.getObjectLocation(relativeX, relativeY, isDrawPhase);

		if (location.location == LocationType.Unknown)
			debug.error(`Could not determine location of ${rect.CardCode}! (TopLeft: ${rect.TopLeftX}, ${rect.TopLeftY}, Center: ${centerX}, ${centerY})`);

		return location;
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
		const player = this.you; // Ignore opponent for this phase.

		switch(this.subState) {
			case DrawPhase.WaitForAppear: {
				let cardCount = 0;
				for (const rect of json.Rectangles) {
					if (rect.LocalPlayer == false)
						continue;

					const card = this.allCards.getCard(rect.CardID);
					if (card && card.isNexus) // ignore nexuses
						continue;
					
					if (card == null) { // Card doesn't exist yet, add it.
						player.drawnCards.addCard(rect.CardID, rect.CardCode);
						this.actions.push(new ShowDrawCardAction(time, rect.CardID, rect.CardCode));
						debug.log(`Draw Phase: ${rect.LocalPlayer ? "You" : "They"} drew a card  (${rect.CardCode}) at ${time}`);
					}
					cardCount++;
				}

				if (cardCount == config.drawCount) {
					this.subState = DrawPhase.WaitForResolve;
					debug.log(`Draw Phase: We've seen all ${config.drawCount} cards, waiting for replacements and for them to move to the hand.`);
				}
				break;
			}

			case DrawPhase.WaitForResolve: {

				const drawnCards = player.drawnCards.cardArray;
				const foundCards = {};
				const movedCards = {};
				for (let card of drawnCards) {
					foundCards[card.id] = false;
					movedCards[card.id] = false;
				}
				
				for (const rect of json.Rectangles) {
					if (rect.LocalPlayer == false)
						continue;

					const card = player.drawnCards.getCard(rect.CardID);

					if (card != null) { // Found one of our draw cards!
						if (card.isNexus)
							continue;

						if (card.hasMoved) {
							debug.log(`Draw Phase: Card ${rect.CardID} has moved!`);
							movedCards[rect.CardID] = true;
						}

						foundCards[rect.CardID] = true;
						continue;
					}
					
					// Ignore nexuses
					const objectLocation = this._rectToObjLocation(rect);
					if (objectLocation.location == LocationType.Nexus)
						continue;

					// A new card appeared.
					if (rect.CardCode !== "face") { // We know the card we received.
						debug.log(`Draw Phase: Card ${rect.CardID} (${rect.CardCode}) has been received.`);
						player.drawnCards.addCard(rect.CardID);
					}
					else { // TODO: Confirm this? In my test they were nexuses..
						debug.log(`Draw Phase: Saw a new card (${rect.CardID}), but it's still face-down`);
						continue;
					}
				}

				for (let card of drawnCards) {
					if (foundCards[card.id] == false) { // A card got removed.
						player.drawnCards.removeCard(card.id);
						debug.log(`Draw Phase: Card ${card.id} (${card.code}) has been replaced. Waiting for new card..`);
					}
				}

				break;
			}

			default:
				throw new Error("Unexpected substate!");
		}
	}

	_handleGenericEvents(time, json) {
		this.screenWidth = json.Screen.ScreenWidth;
		this.screenHeight = json.Screen.ScreenHeight;

		// debug.log(`Frame claims there are ${json.Rectangles.length} objects in the field.`);

		for (const rect of json.Rectangles) {

			// Check if we've handled this card.
			const card = this.allCards.getCard(rect.CardID);
			if (card) {

				
				if (!card.isNexus) {
					if (card.x != rect.TopLeftX || card.y != rect.TopLeftY) { // card has moved
						card.setPos(rect.TopLeftX, rect.TopLeftY);
					}
					else {
						card.resetPos(); // make hasMoved false.
					}
				}

				continue;
			}

			// TODO: Fully get rid of FieldOwner (in favor of rect.LocalPlayer)
			const fieldOwner = rect.LocalPlayer ? FieldOwner.You : FieldOwner.Them;
			const player = rect.LocalPlayer ? this.you : this.them;
			const fieldOwnerName = FieldOwnerNames[fieldOwner]; // "You" or "Them"
			
			const objectLocation = this._rectToObjLocation(rect);
			switch (objectLocation.location) {
				case LocationType.Nexus:
					if (player.nexus !== 0) // Nexus is initialised, skip
						break;
						
					// Nexus is not initialised
					player.nexus = rect.CardID;
					this.allCards.addNexus(rect.CardID);
					
					this.actions.push(new CreateNexusAction(time));
					debug.log(`Initialised a nexus (Owner = ${fieldOwnerName}, ID = ${player.nexus}, time = ${time})`);
					break;
			}
		}
	}

	_setToNextGameState(time, json) {

		const oldState = this.gameState;

		switch (this.gameState) {
			case GameState.Init:
				this.gameState = GameState.Draw;
				this.subState = DrawPhase.WaitForAppear;
				break;
			case GameState.Draw:
				// Shit, how do we detect who goes first?
				debugger;
				break;
		}

		debug.log(`Switched from state ${GameStateNames[oldState]} to ${GameStateNames[this.gameState]} (Substate: ${this.subState}) at ${time}`);
	}
	
	asJsonString() {
		
		// TODO: get a json string
		return JSON.stringify({});
	}
}