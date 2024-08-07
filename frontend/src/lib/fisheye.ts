import * as d3 from 'd3';

export interface FisheyeDistortion {
  (d: { x: number; y: number }): { x: number; y: number; z: number };
  radius: (value?: number) => FisheyeDistortion | number;
  distortion: (value?: number) => FisheyeDistortion | number;
  focus: (value?: [number, number]) => FisheyeDistortion | [number, number];
}

export function fisheye(): FisheyeDistortion {
  let radius = 200;
  let distortion = 2;
  let focus: [number, number] = [0, 0];

  function fisheyeDistortion(d: { x: number; y: number }) {
    const dx = d.x - focus[0];
    const dy = d.y - focus[1];
    const dd = Math.sqrt(dx * dx + dy * dy);
    if (!dd || dd >= radius) return { x: d.x, y: d.y, z: 1 };
    const k = ((1 - Math.exp(-dd * distortion / radius)) / dd) * 0.75 + 0.25;
    return { x: focus[0] + dx * k, y: focus[1] + dy * k, z: Math.min(k, 10) };
  }

  fisheyeDistortion.radius = function(value?: number) {
    if (value === undefined) return radius;
    radius = +value;
    return fisheyeDistortion;
  };

  fisheyeDistortion.distortion = function(value?: number) {
    if (value === undefined) return distortion;
    distortion = +value;
    return fisheyeDistortion;
  };

  fisheyeDistortion.focus = function(value?: [number, number]) {
    if (value === undefined) return focus;
    focus = value;
    return fisheyeDistortion;
  };

  return fisheyeDistortion as FisheyeDistortion;
}