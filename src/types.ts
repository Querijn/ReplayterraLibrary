
export const enum GameState {
    InProgress = "InProgress",
    Menus = "Menus"
}

export interface LORApiScreenRectangle {
    CardID: string;
    CardCode: "face" | string;
    TopLeftX: number;
    TopLeftY: number;
    Width: number;
    Height: number;
    LocalPlayer: boolean;
    InitialY: number;
}

export interface LORApiFrame {
    PlayerName: string;
    OpponentName: string;
    GameState: GameState;
    Screen: {
        ScreenWidth: number;
        ScreenHeight: number;
    };
    Rectangles: LORApiScreenRectangle[];
    Mouse: string;
}