import { LORApiFrame, LORApiScreenRectangle } from "./types";
import { diffAPIFrame } from "./util";

type RawEvent = {
    type: "discard" | "dediscard" | "mulligan_gain" | "mulligan_lose" | "place" | "play_survive" | "place_spell" | "enemy_place" | "enemy_play_survive" | "enemy_place_spell" | "play_died" | "enemy_play_died" | "place_died" | "enemy_place_died" | "spell_remove" | "enemy_spell_remove";
    code: string;
    id: string;
} | {
    type: "play" | "enemy_play";
    code: string;
    id: string;
    x: number;
} | {
    type: "draw";
    code: string;
    id: string;
    from_deck: boolean;
} | {
    type: "mulligan_final";
    cards: {
        id: string;
        code: string;
    }[];
};

/**
 * Main class that handles transformations to raw events. Note that these events need to be postprocessed
 * for almost all events, since the events produced by this translator are pretty bad.
 */
export default class RawEventTranslator {
    protected events: RawEvent[] = [];
    private previousFrame: LORApiFrame;

    // Card change bookkeeping.
    private movingCards = new Map<string, [LORApiScreenRectangle, boolean, number]>();
    private cards = new Map<string, LORApiScreenRectangle>();
    private bufferedRemovals: LORApiScreenRectangle[] = [];

    // State bookkeeping.
    private hasCompletedMulligan = false;

    // Card bookkeeping.
    private ourCards = new Set<string>();
    private ourDiscardedCards = new Set<string>();
    private ourPlayedCards = new Set<string>();
    private ourFightingCards = new Set<string>();
    private ourSpellCards = new Set<string>();
    private enemyCards = new Set<string>();
    private enemySpellCards = new Set<string>();
    private enemyFightingCards = new Set<string>();

    /**
     * Creates a new translator with the specified initial frame.
     */
    constructor(initialFrame: LORApiFrame) {
        this.previousFrame = initialFrame;

        if (initialFrame.Screen.ScreenHeight !== 1080 || initialFrame.Screen.ScreenWidth !== 1920) {
            throw new Error("Translation is only supported for 1920x1080 games. Sorry.");
        }
    }

    /**
     * Feeds a new API frame to the translator, causing it to compute changes between the
     * given frame and the previous one.
     */
    public handleFrame(frame: LORApiFrame) {
        const { added, removed, moved } = this.computeCardChanges(frame);
        if (!this.hasCompletedMulligan) return this.handleMulligan(added, removed);

        for (const card of [...added, ...moved]) {
            if (card.LocalPlayer) {
                this.handleFriendlyCardGain(card);
            } else {
                this.handleEnemyCardGain(card);
            }
        }

        for (const card of removed) {
            this.handleCardRemoval(card);
        }
    }

    /**
     * Returns the list of events emitted during the lifetime of this translator.
     */
    public getEvents(): RawEvent[] {
        return this.events;
    }

    /**
     * Handles a raw set of added and removed rectangles while in the mulligan phase.
     */
    private handleMulligan(added: LORApiScreenRectangle[], removed: LORApiScreenRectangle[]) {
        for (const card of added) {
            this.events.push({ type: "mulligan_gain", code: card.CardCode, id: card.CardID });
        }

        for (const card of removed) {
            this.events.push({ type: "mulligan_lose", code: card.CardCode, id: card.CardID });
        }

        if (removed.length === 4) {
            this.hasCompletedMulligan = true;
            this.events.push({ type: "mulligan_final", cards: removed.map(x => ({ code: x.CardCode, id: x.CardID })) });
        }
    }

    /**
     * Handles the case where a single card that belongs to us moved or spawned.
     */
    private handleFriendlyCardGain(card: LORApiScreenRectangle) {
        if (card.Height < 0 || card.Width < 0) return; // wtf riot???

        if (this.ourDiscardedCards.has(card.CardID)) { // card we thought was discarded has returned
            this.ourDiscardedCards.delete(card.CardID);
            this.events.push({ type: "dediscard", code: card.CardCode, id: card.CardID });
        } else if (Math.abs(card.InitialY - 353) < 40 && Math.abs(card.Height - 538) < 40 && !this.ourCards.has(card.CardID)) { // normal draw
            this.events.push({ type: "draw", code: card.CardCode, id: card.CardID, from_deck: true });
            this.ourCards.add(card.CardID);
            card.InitialY = -1000;
        } else if (card.InitialY > 900 && !this.ourCards.has(card.CardID)) { // added to hand through a card
            this.events.push({ type: "draw", code: card.CardCode, id: card.CardID, from_deck: false });
            this.ourCards.add(card.CardID);
            card.InitialY = -1000;
        } else if (!this.ourPlayedCards.has(card.CardID) && Math.abs(card.TopLeftY - 818) < 30 && card.Height < 200) { // placed a card
            this.ourCards.add(card.CardID); // in case this spawned from a card
            this.events.push({ type: "place", code: card.CardCode, id: card.CardID });
            this.ourPlayedCards.add(card.CardID);
        } else if (Math.abs(card.InitialY - 627) < 40 && !this.ourFightingCards.has(card.CardID)) { // played a card
            this.ourPlayedCards.add(card.CardID); // in case this spawned from a card
            this.ourCards.add(card.CardID); // in case this spawned from a card
            this.events.push({ type: "play", code: card.CardCode, id: card.CardID, x: card.TopLeftX });
            this.ourFightingCards.add(card.CardID);
            card.InitialY = -1000;
        } else if (Math.abs(card.TopLeftY - 818) < 30 && this.ourFightingCards.has(card.CardID)) { // survived a fight
            this.events.push({ type: "play_survive", code: card.CardCode, id: card.CardID });
            this.ourFightingCards.delete(card.CardID);
        } else if (Math.abs(card.TopLeftY - 480) < 30 && card.Height === 115 && !this.ourPlayedCards.has(card.CardID) && !this.ourSpellCards.has(card.CardID)) { // placed a spell
            this.ourCards.has(card.CardID); // in case this spawned from a card
            this.events.push({ type: "place_spell", code: card.CardCode, id: card.CardID });
            this.ourSpellCards.add(card.CardID);
        }
    }

    /**
     * Handles the case where a single card that belongs to the enemy moved or spawned.
     */
    private handleEnemyCardGain(card: LORApiScreenRectangle) {
        if (card.Height < 0 || card.Width < 0) return; // wtf riot???
        if (card.TopLeftY < 0) return; // ignore cards still in animation

        if (card.TopLeftY < 110 && !this.enemyCards.has(card.CardID)) { // enemy plays a card
            this.events.push({ type: "enemy_place", code: card.CardCode, id: card.CardID });
            this.enemyCards.add(card.CardID);
        } else if (Math.abs(card.InitialY - 262) < 40 && !this.enemyFightingCards.has(card.CardID)) { // enemy moves a card to attack
            this.enemyCards.add(card.CardID); // in case it came from a card
            this.events.push({ type: "enemy_play", code: card.CardCode, id: card.CardID, x: card.TopLeftX });
            this.enemyFightingCards.add(card.CardID);
            card.InitialY = -1000;
        } else if (Math.abs(card.TopLeftY - 99) < 30 && this.enemyFightingCards.has(card.CardID)) { // enemy card survived
            this.events.push({ type: "enemy_play_survive", code: card.CardCode, id: card.CardID });
            this.enemyFightingCards.delete(card.CardID);
        } else if (Math.abs(card.TopLeftY - 480) < 30 && card.Height === 115 && !this.enemySpellCards.has(card.CardID)) { // placed a spell
            this.events.push({ type: "enemy_place_spell", code: card.CardCode, id: card.CardID });
            this.enemyCards.add(card.CardID);
            this.enemySpellCards.add(card.CardID);
        }
    }

    /**
     * Handles the case where a card despawned, regardless of who it belonged to.
     */
    private handleCardRemoval(card: LORApiScreenRectangle) {
        if (card.LocalPlayer && this.ourCards.has(card.CardID) && !this.ourSpellCards.has(card.CardID) && !this.ourPlayedCards.has(card.CardID) && !this.ourPlayedCards.has(card.CardID) && !this.ourDiscardedCards.has(card.CardID)) { // card removed from hand
            this.events.push({ type: "discard", code: card.CardCode, id: card.CardID });
            this.ourDiscardedCards.add(card.CardID);
        } else if (card.LocalPlayer && this.ourFightingCards.has(card.CardID)) { // we died during fight
            this.events.push({ type: "play_died", code: card.CardCode, id: card.CardID });
            this.ourFightingCards.delete(card.CardID);
            this.ourPlayedCards.delete(card.CardID);
            this.ourCards.delete(card.CardID);
        } else if (!card.LocalPlayer && this.enemyFightingCards.has(card.CardID)) { // this.enemy died during fight
            this.events.push({ type: "enemy_play_died", code: card.CardCode, id: card.CardID });
            this.enemyFightingCards.delete(card.CardID);
            this.enemyCards.delete(card.CardID);
        } else if (card.LocalPlayer && this.ourPlayedCards.has(card.CardID) && !this.ourFightingCards.has(card.CardID) && Math.abs(card.TopLeftY - 818) < 30) { // this.our card died in hand
            this.events.push({ type: "place_died", code: card.CardCode, id: card.CardID });
            this.ourPlayedCards.delete(card.CardID);
            this.ourCards.delete(card.CardID);
        } else if (!card.LocalPlayer && this.enemyCards.has(card.CardID) && !this.enemyFightingCards.has(card.CardID) && card.TopLeftY < 110) { // their card died in hand
            this.events.push({ type: "enemy_place_died", code: card.CardCode, id: card.CardID });
            this.enemyCards.delete(card.CardID);
        } else if (card.LocalPlayer && Math.abs(card.TopLeftY - 480) < 30 && this.ourSpellCards.has(card.CardID)) {
            this.events.push({ type: "spell_remove", code: card.CardCode, id: card.CardID });
            this.ourCards.delete(card.CardID);
            this.ourSpellCards.delete(card.CardID);
        } else if (!card.LocalPlayer && Math.abs(card.TopLeftY - 480) < 30 && this.enemySpellCards.has(card.CardID)) {
            this.events.push({ type: "enemy_spell_remove", code: card.CardCode, id: card.CardID });
            this.enemySpellCards.delete(card.CardID);
            this.enemySpellCards.delete(card.CardID);
        }
    }

    /**
     * Takes a new frame and compares it to the previous one. From those changes,
     * it computes what moved, spawned and despawned.
     *
     * I'm so sorry for the quality of this code.
     */
    private computeCardChanges(frame: LORApiFrame) {
        const changes = diffAPIFrame(this.previousFrame, frame);
        this.previousFrame = frame;

        const added: LORApiScreenRectangle[] = [];
        const removed: LORApiScreenRectangle[] = [];
        const moved: LORApiScreenRectangle[] = [];

        // Handle buffered removals from the previous frame
        for (const entry of this.bufferedRemovals) {
            this.cards.delete(entry.CardID);
            removed.push(entry);
        }
        this.bufferedRemovals.length = 0;

        for (const change of changes) {
            if (change.type === "add") {
                change.rectangle.InitialY = change.rectangle.TopLeftY;
                this.movingCards.set(change.rectangle.CardID, [change.rectangle, true, 0]);
            }

            if (change.type === "move") {
                let entry = this.movingCards.get(change.cardID);
                if (!entry) {
                    this.movingCards.set(change.cardID, entry = [this.cards.get(change.cardID)!, false, 0]);
                } else {
                    entry[0].TopLeftX = change.newPosition.x;
                    entry[0].TopLeftY = change.newPosition.y;
                    entry[0].Width = change.newPosition.width;
                    entry[0].Height = change.newPosition.height;
                }

                const cardRef = this.cards.get(change.cardID);
                if (cardRef) {
                    cardRef.TopLeftX = change.newPosition.x;
                    cardRef.TopLeftY = change.newPosition.y;
                    cardRef.Width = change.newPosition.width;
                    cardRef.Height = change.newPosition.height;
                }

                entry[2] = 0;
            }

            if (change.type === "remove") {
                if (!this.cards.has(change.cardID)) {
                    // this card never appeared since it was always moving, so have it appear for a single frame
                    this.cards.set(change.cardID, this.movingCards.get(change.cardID)![0]);
                    added.push(this.movingCards.get(change.cardID)![0]);
                    this.bufferedRemovals.push(this.movingCards.get(change.cardID)![0]);

                    this.movingCards.delete(change.cardID);
                } else {
                    removed.push(this.cards.get(change.cardID)!);
                    this.cards.delete(change.cardID);
                }
            }
        }

        for (const [key, value] of this.movingCards) {
            value[2]++;

            if (value[2] >= 3) {
                (value[1] ? added : moved).push(value[0]);
                this.cards.set(key, value[0]);
                this.movingCards.delete(key);
            }
        }

        return { added, removed, moved };
    }
}