import RawEventTranslator from "./raw-translator";
import { LORApiFrame } from "./types";

type Event = {
    type: "mulligan",
    initialCards: string[];
    finalCards: string[];
} | {
    type: "draw";
    code: string;
    id: string;
    from_deck: boolean;
} | {
    type: "play" | "enemy_play";
    code: string;
    id: string;
    x: number;
} | {
    type: "fight";
    matchups: {
        ourCardID: string | null;
        enemyCardID: string | null;
        survivorCardIDs: string[];
    }[];
} | {
    type: "place" | "place_spell" | "enemy_place" | "enemy_place_spell" | "place_died" | "enemy_place_died" | "spell_remove" | "enemy_spell_remove" | "discard";
    code: string;
    id: string;
};

const FIGHT_ACTIONS = ["play_survive", "enemy_play_survive", "play_died", "enemy_play_died"];
const SWALLOW_PRE_ACTIONS = ["place_spell", "enemy_place_spell", "spell_remove", "enemy_spell_remove"];
const SWALLOW_POST_ACTIONS = ["draw"];

/**
 * Similar to the RawEventTranslator, but does a final pass on the events and rectifies
 * all events that are wrong. Also collapses fights and a bunch of other transforms.
 */
export default class EventTranslator extends RawEventTranslator {
    private done = false;

    handleFrame(frame: LORApiFrame): void {
        if (this.done) {
            throw new Error("Cannot feed an API frame to a finalized event translator.")
        }

        super.handleFrame(frame);
    }

    /**
     * Marks this translator as having received the full game. Transforms the list of
     * raw events and returns the processed events.
     */
    public finalize(): Event[] {
        this.done = true;

        const actions = this.getEvents();

        const ret: Event[] = [];
        const initialMulliganCards = [];

        let cardsOnOurBoard = [];
        let cardsOnEnemyBoard = [];

        // Sometimes a card despawns during a fight.
        // Fix it up here.
        for (let i = 0; i < actions.length; i++) {
            const action = actions[i];

            if (action.type === "play_died" || action.type === "place_died") {
                for (let j = i + 1; j < actions.length && j < i + 3; j++) {
                    const nextAction = actions[j];

                    if (nextAction.type === "play" && action.id === nextAction.id) {
                        actions.splice(actions.indexOf(action), 1);
                        if (action.type === "play_died") actions.splice(actions.indexOf(nextAction), 1);
                        i--; // i now refers to the next element, so undo the next increment
                        break;
                    }
                }
            }
        }

        for (let i = 0; i < actions.length; i++) {
            const action = actions[i];

            // Find initial mulligan cards
            if (action.type === "mulligan_gain") {
                if (initialMulliganCards.length !== 4) {
                    initialMulliganCards.push(action.code);
                }

                continue;
            }

            if (action.type === "mulligan_lose") {
                continue;
            }

            // Handle mulligan end
            if (action.type === "mulligan_final") {
                ret.push({
                    type: "mulligan",
                    initialCards: initialMulliganCards,
                    finalCards: action.cards.map(x => x.code)
                });

                continue;
            }

            // Filter out invalid places
            if (action.type === "enemy_place_died") {
                // If this action comes back later, ignore it. Only track cards that never come back.
                if (actions.slice(i + 1).some(x => (<any>x).id === action.id)) continue;
            }

            // Filter out invalid discards
            if (action.type === "discard") {
                // If this action comes back later, ignore it. Only track cards that never come back.
                if (actions.slice(i + 1).some(x => (<any>x).id === action.id && (<any>x).code === action.code)) continue;
            }

            // Filter out dediscards entirely.
            if (action.type === "dediscard") continue;

            // Keep track of cards in fighting area
            if (action.type === "play") {
                cardsOnOurBoard.push(action);
            }

            if (action.type === "enemy_play") {
                cardsOnEnemyBoard.push(action);
            }

            // Collapse fights
            if (FIGHT_ACTIONS.includes(action.type)) {
                const matchups: {
                    ourCardID: string | null,
                    enemyCardID: string | null,
                    survivorCardIDs: string[]
                }[] = [];

                const cardsOnBoard = [...cardsOnEnemyBoard, ...cardsOnOurBoard].sort((a, b) => a.x - b.x);
                const preSwallowed = [];
                const postSwallowed = [];

                for (let i = 0; i < cardsOnBoard.length; i++) {
                    const firstCard = cardsOnBoard[i];

                    if (cardsOnBoard[i + 1] && Math.abs(cardsOnBoard[i + 1].x - firstCard.x) < 20) {
                        const secondCard = cardsOnBoard[++i];
                        matchups.push({
                            ourCardID: cardsOnOurBoard.includes(firstCard) ? firstCard.id : secondCard.id,
                            enemyCardID: cardsOnEnemyBoard.includes(firstCard) ? firstCard.id : secondCard.id,
                            survivorCardIDs: [firstCard.id, secondCard.id]
                        });
                    } else {
                        matchups.push({
                            ourCardID: cardsOnOurBoard.includes(firstCard) ? firstCard.id : null,
                            enemyCardID: cardsOnEnemyBoard.includes(firstCard) ? firstCard.id : null,
                            survivorCardIDs: [firstCard.id]
                        });
                    }
                }

                if (action.type === "play_died") {
                    const matchup = matchups.find(x => x.ourCardID === action.id)!;
                    if (!matchup) throw new Error("Card " + action.id + " died in a fight but they aren't in the matchups");
                    matchup.survivorCardIDs.splice(matchup.survivorCardIDs.indexOf(action.id), 1);
                }

                if (action.type === "enemy_play_died") {
                    const matchup = matchups.find(x => x.enemyCardID === action.id)!;
                    if (!matchup) throw new Error("Card " + action.id + " died in a fight but they aren't in the matchups");
                    matchup.survivorCardIDs.splice(matchup.survivorCardIDs.indexOf(action.id), 1);
                }

                while (actions[i + 1] && (FIGHT_ACTIONS.includes(actions[i + 1].type) || SWALLOW_PRE_ACTIONS.includes(actions[i + 1].type) || SWALLOW_POST_ACTIONS.includes(actions[i + 1].type))) {
                    const nextFightAction = actions[++i];

                    if (SWALLOW_PRE_ACTIONS.includes(nextFightAction.type)) {
                        preSwallowed.push(nextFightAction);
                        continue;
                    }

                    if (SWALLOW_POST_ACTIONS.includes(nextFightAction.type)) {
                        postSwallowed.push(nextFightAction);
                        continue;
                    }

                    if (nextFightAction.type === "play_died") {
                        const matchup = matchups.find(x => x.ourCardID === nextFightAction.id)!;
                        if (!matchup) throw new Error("Card " + nextFightAction.id + " died in a fight but they aren't in the matchups");
                        matchup.survivorCardIDs.splice(matchup.survivorCardIDs.indexOf(nextFightAction.id), 1);
                    }

                    if (nextFightAction.type === "enemy_play_died") {
                        const matchup = matchups.find(x => x.enemyCardID === nextFightAction.id)!;
                        if (!matchup) throw new Error("Card " + nextFightAction.id + " died in a fight but they aren't in the matchups");
                        matchup.survivorCardIDs.splice(matchup.survivorCardIDs.indexOf(nextFightAction.id), 1);
                    }
                }

                // move swallowed spell events to before the fight
                ret.push(...<any>preSwallowed);

                ret.push({
                    type: "fight",
                    matchups
                });

                // and draw events to after the fight
                ret.push(...<any>postSwallowed);

                cardsOnOurBoard = [];
                cardsOnEnemyBoard = [];

                continue;
            }

            ret.push(<any>action);
        }

        return ret;
    }
}