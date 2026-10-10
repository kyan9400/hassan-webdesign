import { Color, ExtrudeGeometry, Mesh, MeshLambertMaterial, Shape } from "three";
import { HILL, hillTop } from "./layout";
import { DAY } from "./palette";

/**
 * The hill: the draft's path extended to x ∈ [−30, 30], ExtrudeGeometry depth 5 (z −3.5 … 1.5),
 * leaf colour, MeshLambertMaterial.
 */
export function createHill(): { mesh: Mesh; color: Color } {
  const s = new Shape();
  s.moveTo(HILL.xMin, -3);
  for (let x = HILL.xMin; x <= HILL.xMax + 1e-6; x += 0.5) s.lineTo(x, hillTop(x));
  s.lineTo(HILL.xMax, -3);
  s.closePath();
  const depth = HILL.zFront - HILL.zBack;
  const geo = new ExtrudeGeometry(s, { depth, bevelEnabled: false, curveSegments: 1 });
  geo.translate(0, 0, HILL.zBack);
  geo.deleteAttribute("uv");
  const color = DAY.hill.clone();
  const mesh = new Mesh(geo, new MeshLambertMaterial({ color }));
  return { mesh, color };
}
