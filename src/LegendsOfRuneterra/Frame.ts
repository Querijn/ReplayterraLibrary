import LoRRect from "./Rect";

export default class LoRFrame {
	public PlayerName: string;
	public OpponentName: string;
	public GameState: string;
	public Screen: { ScreenWidth: number; ScreenHeight: number; };
	public Rectangles: LoRRect[];
	public Mouse: string;
};
