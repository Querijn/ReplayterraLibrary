import { Boardmapper, LocationType } from "replayterra_boardmapper";

import config from "./config";
import debug from "./debug";

import PlayerInfo from "./player_info";
import DrawPhaseInfo from "./draw_phase_info";
import CardInfo from "./card_info";

import { GameState } from "./game_state";
import CardSet from "./card_set";

import CreateNexusAction from "./actions/create_nexus";
import ShowDrawCardAction from "./actions/show_draw_card";
import ReplaceDrawCardAction from "./actions/replace_draw_card";
import BaseAction from "./actions/base_action";

import LoRFrame from "./LegendsOfRuneterra/Frame";
import LoRRect from "./LegendsOfRuneterra/Rect";

enum DrawPhaseSubstate {
	WaitForAppear = "WaitForAppear",				// Waiting for the cards to appear.
	WaitForResolve = "WaitForResolve"				// Waiting for either cards to get replaced, or them to move to hand
}

export default class GameInfo {

	private gameState = GameState.Init;
	private subState: DrawPhaseSubstate | null;

	private screenWidth = 1;
	private screenHeight = 1;

	private you = new PlayerInfo(this);
	private them = new PlayerInfo(this);

	private actions: BaseAction[] = [];
	private drawPhase = new DrawPhaseInfo();
	public allCards = new CardSet(null);

	constructor() {
		Boardmapper.load(); // Prepare the source board image layout

		debug.log(`The BoardMapper was built on ${Boardmapper.getBuildTime()}`); // I have the feeling it does not build sometimes.

		this.drawPhase = new DrawPhaseInfo();
	}

	feedFrame(time: number, json: LoRFrame) {

		switch (this.gameState) {
			case GameState.Init:
				this._handleInitFrame(time, json);
				break;
			case GameState.Draw:
				this._handleDrawFrame(time, json);
				break;
		}
	}

	_rectToObjLocation(rect: LoRRect): LocationType {
		const centerX = rect.TopLeftX + rect.Width / 2;
		const centerY = rect.TopLeftY - rect.Height / 2; // This has to be negative because of the y coordinate inversion
		return this._posToObjLocation(centerX, centerY);
	}

	_cardToObjLocation(card: CardInfo): LocationType {

		if (card.isNexus) {
			return LocationType.Nexus;
		}

		const centerX = card.x + card.width / 2;
		const centerY = card.y - card.height / 2; // This has to be negative because of the y coordinate inversion
		return this._posToObjLocation(centerX, centerY);
	}

	_posToObjLocation(x: number, y: number): LocationType {
		const relativeX = x / this.screenWidth;
		const relativeY = y / this.screenHeight;

		const isDrawPhase = this.gameState == GameState.Draw;
		const location = Boardmapper.getObjectLocation(relativeX, relativeY, isDrawPhase);

		if (location == LocationType.Unknown)
			throw new Error(`Could not determine location! (${relativeX}, ${relativeY})`);

		return location;
	}

	_handleInitFrame(time: number, json: LoRFrame) {

		this._handleGenericEvents(time, json);

		// First, check if we're still in init frame:
		if (json.OpponentName != null && json.PlayerName != null) {
			debug.log(`This replay is a match between ${json.OpponentName} and ${json.PlayerName}.`);
			this._setToNextGameState(time, json);
			return;
		}

		// Do init stuff here (which I don't have right now)
	}

	_handleDrawFrame(time: number, json: LoRFrame) {

		this._handleGenericEvents(time, json);
		const player = this.you; // Ignore opponent for this phase.

		switch(this.subState) {
			case DrawPhaseSubstate.WaitForAppear: {
				let cardCount = 0;
				for (const rect of json.Rectangles) {
					if (rect.LocalPlayer == false)
						continue;

					const card = this.allCards.getCard(rect.CardID);
					if (card && card.isNexus) // ignore nexuses
						continue;
					
					if (card == null) { // Card doesn't exist yet, add it.
						player.drawnCards.addCard(rect);
						this.actions.push(new ShowDrawCardAction(time, rect.CardID, rect.CardCode));
						debug.log(`Draw Phase: ${rect.LocalPlayer ? "You" : "They"} drew a card  (${rect.CardCode}) at ${time}`);
					}
					cardCount++;
				}

				if (cardCount == config.drawCount) {
					this.subState = DrawPhaseSubstate.WaitForResolve;
					debug.log(`Draw Phase: We've seen all ${config.drawCount} cards, waiting for replacements and for them to move to the hand.`);
				}
				break;
			}

			case DrawPhaseSubstate.WaitForResolve: {

				const drawnCards = player.drawnCards.cardArray;
				const foundCards: { [id: string]: boolean } = {};
				for (let card of drawnCards) {
					foundCards[card.id] = false;
				}
				
				for (const rect of json.Rectangles) {
					if (rect.LocalPlayer == false)
						continue;

					const objectLocation = this._rectToObjLocation(rect);
					const card = player.drawnCards.getCard(rect.CardID);

					if (card != null) { // Found one of our draw cards!
						if (card.isNexus)
							continue;

						// This is our end condition of this phase. 
						if (objectLocation == LocationType.Hand) {

							debugger;
							if (this.drawPhase.receivedCards.length !== this.drawPhase.replacedCards.length)
								throw new Error("How come we're moving towards the hand while we don't have all our cards yet?");

							for (let i = 0; i < this.drawPhase.receivedCards.length; i++) {
								const oldCard = this.drawPhase.replacedCards[i];
								const newCard = this.drawPhase.receivedCards[i];
								this.actions.push(new ReplaceDrawCardAction(time, oldCard.id, oldCard.code, newCard.id, newCard.code));
							}

							console.log("Draw Phase: Noticed a card ended up in the hand. Setting next game state.");
							player.drawnCards.moveTo(player.handCards);
							this._setToNextGameState(time, json);
							return;
						}

						foundCards[rect.CardID] = true;
						continue;
					}
					
					// Ignore nexuses
					if (objectLocation == LocationType.Nexus)
						continue;

					// A new card appeared.
					if (rect.CardCode !== "face") { // We know the card we received.
						const card = player.drawnCards.addCard(rect);
						this.drawPhase.receivedCards.push(card);
					}
					else { // TODO: Confirm this? In my test they were nexuses..
						debug.log(`Draw Phase: Saw a new card (${rect.CardID}), but it's still face-down`);
						continue;
					}
				}

				// Check if cards got removed.
				for (let card of drawnCards) {
					if (foundCards[card.id] == false) { // A card got removed.
						player.drawnCards.removeCard(card.id);
						this.drawPhase.replacedCards.push(card);
						debug.log(`Draw Phase: Card ${card.id} (${card.code}) has been replaced. Waiting for new card..`);
					}
				}
				break;
			}

			default:
				throw new Error("Unexpected substate!");
		}
	}

	_handleGenericEvents(time: number, json: LoRFrame) {
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

					card.width = rect.Width;
					card.height = rect.Height;
				}

				continue;
			}

			const player = rect.LocalPlayer ? this.you : this.them;
			const fieldOwnerName =  rect.LocalPlayer ? "You" : "Them";
			
			const objectLocation = this._rectToObjLocation(rect);
			switch (objectLocation) {
				case LocationType.Nexus:
					if (player.nexus !== "0") // Nexus is initialised, skip
						break;
						
					// Nexus is not initialised
					player.nexus = rect.CardID;
					this.allCards.addNexus(rect);
					
					this.actions.push(new CreateNexusAction(time));
					debug.log(`Initialised a nexus (Owner = ${fieldOwnerName}, ID = ${player.nexus}, time = ${time})`);
					break;
			}
		}
	}

	_setToNextGameState(time: number, json: LoRFrame) {

		const oldState = this.gameState;

		switch (this.gameState) {
			case GameState.Init:
				this.gameState = GameState.Draw;
				this.subState = DrawPhaseSubstate.WaitForAppear;
				break;

			case GameState.Draw:
				// Shit, how do we detect who goes first?
				// TODO: What comes here?
				debugger;
				break;
		}

		debug.log(`Switched from state ${GameState[oldState]} to ${GameState[this.gameState]} (Substate: ${this.subState}) at ${time}`);
	}
	
	asJsonString() {
		
		// TODO: get a json string
		return JSON.stringify({});
	}
}