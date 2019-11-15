module.exports["GameState"] = Object.freeze({
	"Init": 1,				// The game is initialising. The players aren't visible yet, and the drawn cards aren't shown.
	"Draw": 2,				// We're drawing cards. Cards will be rerolled and then moved to the hand.
	"InitialTurn": 3,		// We first figure out who's starting off. We need this for 
	"Attacking": 4,			// We're chosing attacks.
	"Defending": 5			// We're chosing blocks.
});

const gameState = module.exports["GameState"];
let gameStateNames = {};
let keys = Object.keys(gameState);

for (let i = keys.length - 1; i >= 0; i--) {
	let value = gameState[keys[i]];
	gameStateNames[value] = keys[i];
}

module.exports["GameStateNames"] = Object.freeze(gameStateNames);