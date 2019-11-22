# ReplayterraLib

This is the source code for the library portion of [Replayterra](http://lor.stelar7.no). For the source code of the [tracker app](https://github.com/stelar7/challenge2019) and [replay view](https://github.com/Querijn/ReplayterraView) please see the appropriate repositories.
 
ReplayterraLib is a library that converts a raw stream of rectangle positions from the Legends of Runeterra API into a set of events that more accurately describe what happens during a game. While we have implemented a replay system as an example of how such a library can be used, we think that the community will be able to find plenty of other uses for such a library.

This document describes both the challenges encountered during the development of this library, as well as how it can be used. Be sure to read on!

## Installation

You will need a recent version of Node. Clone this repository, then run `yarn install` to install dependencies. Then, run `yarn bundle` to compile the typescript.

## Usage

The library exports two different transformers: `RawEventTransformer` and `EventTransformer`. The raw transformer is a very dumb piece of software that keeps very little state. As such, the raw events it spits out may contain errors that will be fixed by later events. However, the raw transformer can be used live while playing a game.

The normal `EventTransformer` on the other hand requires the entire game to be completed before events will be emitted. This transformer will do additional work on the raw event stream to provide a proper API for developers to consume.

As a rule of thumb, you should use an `EventTransformer` instance UNLESS you need live events. This means that replays, fight analysis and other statistic gathering should probably use the EventTransformer. If you are working on a live deck tracker though, you would want to use the `RawEventTransformer` and handle the events from those as you feed it frames.

## API

First, create an instance of either `RawEventTransformer` or `EventTransformer` using the first frame of the game.

After this, call `handleFrame` every time you retrieve a new frame of the card rectangles. Note that this library requires a frame interval of _at most_ 33ms. We recommend 25ms, since that is the interval that we tested at. Please note that you may need to call `rectifyAPIFrame` first to invert the Y-axis.

Finally, use either `RawEventTransformer.getEvents()` or `EventTransformer.finalize()` to get the list of transformed events. These events are described in the next sections.

For a more complete example, check out `src/index.ts`.

## Raw Events

The following events generated by the `RawEventTransformer`. Any events marked with a \* are not guaranteed to be correct since they may be rectified by a later frame.

All events follow the same structure:
```ts
{
    type: <event type (string)>;
    code: <card code (string)>;
    id: <card id (string)>;
}
```

The term `place` is used for cards that are on the board, but not currently fighting or blocking. The term `play` is used for cards currently on the board that _are_ fighting or blocking. It should be noted that, due to spells and other effects, cards can appear in both the place and play areas without coming from the user's hand.

The following event types exist:
- `discard`\*: The card was removed from the player's hand.
- `dediscard`\*: A previously discarded card was found again, meaning that the previous discard was incorrect.
- `mulligan_gain`: A card was added to the mulligan cards, such as during the first mulligan or when the player swaps their choice.
- `mulligan_lose`: A card was removed from the mulligan list. Emitted both when the player changes cards and when the 4 final mulligan cards disappear.
- `mulligan_final`: Emitted once mulligan ends. Also contains a `cards` property with the final chosen cards.
- `draw`: The user drew a card. Has a `from_hand` property that describes whether or not the card came from the player's deck.
- `place`: The user placed a card from their hand into the staging area. The card is not yet fighting or blocking.
- `place_died`: A card in the place region died (due to a spell or other card).
- `play`: The user placed a card into the attacking/blocking area (either because the card spawned or because they moved it from the place area).
- `play_survive`: A card survived a fight.
- `play_died`: A card died during a fight.
- `place_spell`: A friendly spell was placed.
- `spell_remove`: A friendly spell was removed, either because it executed or because it was blocked by the enemy.
- `enemy_place`: The enemy placed a card into the place area.
- `enemy_place_died`: An enemy card located in the place area died.
- `enemy_play`: The enemy placed a card into the fight/block area.
- `enemy_play_died`: An enemy card died during a fight.
- `enemy_play_survive`: An enemy card survived a fight.
- `enemy_place_spell`: The enemy placed a spell.
- `enemy_spell_remove`: An enemy spell was removed, either because it executed or because it was blocked.

## Processed Events

The `EventTranslator` class uses the raw events and the ability to "look into the future" to emit a list of events that are actually useful. For example, it collapses `discard` events that have a matching `dediscard` event.

The events emitted by the `EventTranslator` follow a schema that is a bit more complex:
```ts
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
    type: <event type>;
    code: string;
    id: string;
};
```

These events largely mirror those of the raw events. However, all fight-related events are collapsed into a single fight event and all mulligan-related events are collapsed into a single event. Other error correction is also performed.

For the `<event type>` enum, the following events are preserved. They function the exact same as the raw events:
- `draw`
- `discard`
- `place`
- `place_died`
- `place_spell`
- `play`
- `spell_remove`
- `enemy_place`
- `enemy_place_spell`
- `enemy_spell_remove`
- `enemy_place_died`
- `enemy_play`

## How this library was made: Challenges

There were a surprising amount of challenges involved in creating a library that translates card positions on the screen into proper events.

First, the rectangles API endpoint returns the positions as they appear ON SCREEN. That means that any animations, such as the _oomph_ when a card is placed, moves ALL THE CARDS ON THE SCREEN. As such, you need to filter them out.

Additionally, while there seems to be a pattern with card locations and spawns/despawns, they aren't consistent at all. While hovering over cards in your hanf or instance, cards despawn and respawn constantly. The Y at which cards are placed also varies between games, even at the exact same resolution. Sometimes cards even appear completely offscreen or with negative sizes.

These challenges were handled by using a system that only considers cards movements once they are on the same location for a couple of frames. This ensures that any unexpected movement, such as from animations, does not impact the translator. Additionally, comparisons using epsilon values were used instead of hardcoded Y values for important positions. By filtering out cards with obviously incorrect values, we are left with cards that we are fairly sure are static and located in the appropriate place.

Additionally, you need to keep track of a surprising amount of state. For example, you cannot assume that a card that despawns while inside the fighting area has died. As it turns out, people CAN and WILL move cards from the fighting area back to their staging area.

Finally, there are quite a few bugs in the LoR API. One particularly vexing bug is that champions do not actually change their card code when they level up. As such, you basically cannot detect card level-ups.

## How this library was made: Shortcomings

This library has a LOT of flaws. We estimate it is able to translate about 60-80% of games, but even those may not be without errors. The following issues are known:
- The only resolution supported is 1920x1080.
- Moving cards back from placement area to the hand or moving cards back from the fighting area to the placement area may not register correctly.
- Fights may be split into multiple independent events if certain spell events happen in the middle of the fight.
- Some quirks of the LoR engine may cause the library to not register certain events, which may cause events further down the line to incorrectly register too.