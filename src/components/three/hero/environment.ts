import {
  BackSide,
  BoxGeometry,
  Color,
  DoubleSide,
  Mesh,
  MeshBasicMaterial,
  PMREMGenerator,
  PlaneGeometry,
  Scene,
  type Texture,
  type WebGLRenderer,
} from "three";

/**
 * A code-made studio environment (no HDRI download — RIGHTS-RULES): three light-former panels
 * (a sky panel overhead, a warm sun strip and a white rim card) inside a soft room, baked once
 * into a 128px PMREM. Equivalent to drei <Environment frames={1} resolution={128}> with three
 * <Lightformer> children, without bundling drei's HDR loaders.
 */
export function createGardenEnvironment(renderer: WebGLRenderer): Texture {
  const scene = new Scene();
  const disposables: { dispose(): void }[] = [];

  const room = new Mesh(
    new BoxGeometry(20, 20, 20),
    new MeshBasicMaterial({ color: new Color("#cfe3da").multiplyScalar(0.55), side: BackSide }),
  );
  scene.add(room);
  disposables.push(room.geometry, room.material as MeshBasicMaterial);

  const former = (w: number, h: number, color: string, intensity: number, pos: [number, number, number]) => {
    const m = new Mesh(
      new PlaneGeometry(w, h),
      new MeshBasicMaterial({ color: new Color(color).multiplyScalar(intensity), side: DoubleSide }),
    );
    m.position.set(...pos);
    m.lookAt(0, 0, 0);
    scene.add(m);
    disposables.push(m.geometry, m.material as MeshBasicMaterial);
  };
  former(12, 12, "#bfe6f2", 2.2, [0, 6, 0]); // sky panel overhead
  former(9, 1.4, "#ffd59a", 3.2, [5, 2.5, 4]); // warm sun strip
  former(3, 4, "#ffffff", 2.6, [-5, 1.5, 4]); // white rim card

  const pmrem = new PMREMGenerator(renderer);
  const rt = pmrem.fromScene(scene, 0.03, 0.1, 50, { size: 128 });
  pmrem.dispose();
  for (const d of disposables) d.dispose();
  return rt.texture;
}
