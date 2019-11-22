import { LORApiFrame, LORApiScreenRectangle } from "./types";

export interface APIPosition {
    x: number;
    y: number;
    width: number;
    height: number;
}

export type APIFrameChange = {
    type: "remove",
    cardID: string
} | {
    type: "add",
    rectangle: LORApiScreenRectangle
} | {
    type: "move",
    cardID: string,
    oldPosition: APIPosition,
    newPosition: APIPosition
};

/**
 * Changes the Y for every frame such that Y0 is the top. Needs to be called before a frame is handled.
 */
export function rectifyAPIFrame(frame: LORApiFrame) {
    for (const rect of frame.Rectangles) {
        rect.TopLeftY = frame.Screen.ScreenHeight - rect.TopLeftY;
    }
}

/**
 * Returns all the changes between the previous frame and the current frame.
 */
export function diffAPIFrame(oldFrame: LORApiFrame, newFrame: LORApiFrame): APIFrameChange[] {
    const oldCardMap = new Map(oldFrame.Rectangles.map(x => [x.CardID, x]));
    const newCardMap = new Map(newFrame.Rectangles.map(x => [x.CardID, x]));

    const changes: APIFrameChange[] = [];

    for (const rect of newFrame.Rectangles) {
        if (rect.CardCode === "face") continue; // ignore nexus entirely
        const oldRect = oldCardMap.get(rect.CardID);

        if (!oldRect) {
            changes.push({
                type: "add",
                rectangle: rect
            });
        } else if (oldRect.TopLeftX !== rect.TopLeftX || oldRect.TopLeftY !== rect.TopLeftY || oldRect.Height !== rect.Height || oldRect.Width !== rect.Width) {
            changes.push({
                type: "move",
                cardID: rect.CardID,
                oldPosition: { x: oldRect.TopLeftX, y: oldRect.TopLeftY, width: oldRect.Width, height: oldRect.Height },
                newPosition: { x: rect.TopLeftX, y: rect.TopLeftY, width: rect.Width, height: rect.Height },
            });
        }
    }

    for (const rect of oldFrame.Rectangles) {
        if (rect.CardCode === "face") continue; // ignore nexus entirely

        if (!newCardMap.has(rect.CardID)) {
            changes.push({
                type: "remove",
                cardID: rect.CardID
            });
        }
    }

    return changes;
}