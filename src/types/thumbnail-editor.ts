export interface ThumbnailLayer {
  id: string;
  type: "image" | "text" | "shape";
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  opacity: number;
  visible: boolean;
  locked: boolean;
  // Text-specific
  text?: string;
  fontSize?: number;
  fontFamily?: string;
  fontWeight?: string;
  color?: string;
  textAlign?: "left" | "center" | "right";
  // Image-specific
  src?: string;
  // Shape-specific
  shapeType?: "rect" | "circle" | "line";
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
}

export interface ThumbnailProject {
  id: string;
  name: string;
  width: number;
  height: number;
  backgroundImage: string;
  layers: ThumbnailLayer[];
  selectedLayerId: string | null;
}
