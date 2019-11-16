export enum GameState {
	Init = 1,				// The game is initialising. The players aren't visible yet, and the mulligann cards aren't shown.
	Mulligan = 2,				// We're drawing cards. Cards will be rerolled and then moved to the hand.
	InitialTurn = 3,			// We first figure out who's starting off. We need this for 
	Attacking = 4,			// We're chosing attacks.
	Defending = 5			// We're chosing blocks.
}