export interface RenderProbeOptions {
  shader: string;
  times?: number[];
  preset?: string;
}

export interface RenderProbeResult {
  image_path: string;
  meta_path: string;
  times: number[];
  captures: number;
}

export function renderProbe(options: RenderProbeOptions): Promise<RenderProbeResult>;
