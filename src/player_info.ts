import CardSet from "./card_set";
import config from "./config";
import debug from "./debug";
import GameInfo from "./game_info";

export default class PlayerInfo {

	public mulliganCards: CardSet;
	public handCards: CardSet;
	public benchCards: CardSet;

	public nexusHealth: number;
	private nexusId: string;

	constructor(gameInfo: GameInfo) {
		this.nexusHealth = config.initialNexusHealth;

		this.mulliganCards = new CardSet(gameInfo);
		this.handCards = new CardSet(gameInfo);
		this.benchCards = new CardSet(gameInfo);
	}

	get nexus(): string {
		return this.nexusId || "0";
	}

	set nexus(id: string) {

		if (this.nexusId) {
			debug.warn(`Tried to set a new nexus ID: ${id}, but we already have an ID.. (${this.nexusId})`);
			return;
		}

		this.nexusId = id;
	}
}