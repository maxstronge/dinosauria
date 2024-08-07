// src/lib/fisheye.ts

export interface FisheyePoint {
    x: number;
    y: number;
    z: number;
  }
  
  export interface FisheyeFunction {
    (d: { x: number; y: number }): FisheyePoint;
    radius: (value?: number) => FisheyeFunction | number;
    distortion: (value?: number) => FisheyeFunction | number;
    focus: (value?: [number, number]) => FisheyeFunction | [number, number];
  }
  
  export function createFisheye(): FisheyeFunction {
    let radius = 300;
    let distortion = 2;
    let k0: number;
    let k1: number;
    let focus: [number, number] = [0, 0];
  
    function fisheye(d: { x: number; y: number }): FisheyePoint {
      const dx = d.x - focus[0];
      const dy = d.y - focus[1];
      const dd = Math.sqrt(dx * dx + dy * dy);
      if (!dd || dd >= radius) return { x: d.x, y: d.y, z: dd >= radius ? 1 : 5 };
      const k = (k0 * (1 - Math.exp(-dd * k1))) / dd * 0.75 + 0.25;
      return { x: focus[0] + dx * k, y: focus[1] + dy * k, z: Math.min(k, 10) };
    }
  
    function rescale(): FisheyeFunction {
      k0 = Math.exp(distortion);
      k0 = (k0 / (k0 - 1)) * radius;
      k1 = distortion / radius;
      return fisheye as FisheyeFunction;
    }
  
    (fisheye as FisheyeFunction).radius = function(_?: number): FisheyeFunction | number {
      if (_ === undefined) return radius;
      radius = +_;
      return rescale();
    };
  
    (fisheye as FisheyeFunction).distortion = function(_?: number): FisheyeFunction | number {
      if (_ === undefined) return distortion;
      distortion = +_;
      return rescale();
    };
  
    (fisheye as FisheyeFunction).focus = function(_?: [number, number]): FisheyeFunction | [number, number] {
      if (_ === undefined) return focus;
      focus = _!;
      return fisheye as FisheyeFunction;
    };
  
    return rescale();
  }