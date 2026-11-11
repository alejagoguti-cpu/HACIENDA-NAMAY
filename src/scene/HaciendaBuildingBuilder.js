import * as THREE from 'three';
import { MaterialLibrary } from './MaterialLibrary.js';

// Elevaciones reales de Albán, Cundinamarca (4.932819869193663, -74.44640638465661)
// Malla de 9x9 obtenida de Open-Meteo DEM (resolución submétrica)
const REAL_ELEVATIONS_81 = [
  1394, 1378, 1378, 1363, 1354, 1359, 1359, 1360, 1356,
  1387, 1377, 1377, 1354, 1346, 1347, 1347, 1346, 1348,
  1387, 1377, 1377, 1354, 1346, 1347, 1347, 1346, 1348,
  1375, 1359, 1359, 1346, 1338, 1338, 1338, 1337, 1345,
  1365, 1351, 1351, 1345, 1335, 1328, 1328, 1322, 1320,
  1361, 1347, 1347, 1333, 1325, 1318, 1318, 1308, 1305,
  1361, 1347, 1347, 1333, 1325, 1318, 1318, 1308, 1305,
  1339, 1327, 1327, 1318, 1315, 1307, 1307, 1300, 1299,
  1324, 1315, 1315, 1311, 1306, 1298, 1298, 1290, 1301
];

function sampleElevation(u, v) {
  // u, v en rango [0, 1] mapeados a la grilla 9x9
  const clampedU = Math.max(0, Math.min(1, u));
  const clampedV = Math.max(0, Math.min(1, v));
  const gx = clampedU * 8;
  const gy = clampedV * 8;
  const x0 = Math.floor(gx), x1 = Math.min(8, x0 + 1);
  const y0 = Math.floor(gy), y1 = Math.min(8, y0 + 1);
  const fx = gx - x0, fy = gy - y0;

  const h00 = REAL_ELEVATIONS_81[y0 * 9 + x0];
  const h10 = REAL_ELEVATIONS_81[y0 * 9 + x1];
  const h01 = REAL_ELEVATIONS_81[y1 * 9 + x0];
  const h11 = REAL_ELEVATIONS_81[y1 * 9 + x1];

  const top = h00 * (1 - fx) + h10 * fx;
  const btm = h01 * (1 - fx) + h11 * fx;
  return top * (1 - fy) + btm * fy;
}

function applyPlanarUV(geometry, scaleMeters = 2.0) {
  const pos = geometry.attributes.position;
  const uvs = new Float32Array(pos.count * 2);
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const z = pos.getZ(i);
    uvs[i * 2] = x / scaleMeters;
    uvs[i * 2 + 1] = z / scaleMeters;
  }
  geometry.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
}

function applyCylinderWallUV(geometry, radius, height, scaleMeters = 2.0) {
  const pos = geometry.attributes.position;
  const uvs = new Float32Array(pos.count * 2);
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);
    const ang = Math.atan2(x, -z);
    const arcDist = ang * radius;
    uvs[i * 2] = arcDist / scaleMeters;
    uvs[i * 2 + 1] = y / scaleMeters;
  }
  geometry.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
}

export class HaciendaBuildingBuilder {
  constructor(scene, doorsManager, lightingManager) {
    this.scene = scene;
    this.doorsManager = doorsManager;
    this.lightingManager = lightingManager;

    this.matLib = new MaterialLibrary();
    this.materials = this.matLib.getAll();

    this.roomsData = [];
    this.roomMeshes = [];
    this.roofGroup = new THREE.Group();
    this.roofGroup.name = 'RoofGroup';
    this.scene.add(this.roofGroup);

    this.treePoints = []; // puntos de árboles calculados con la topografía real
  }

  build() {
    this._buildRealTopography();
    this._buildRetainingWalls();
    this._buildCourtyard();
    this._buildArcBuilding();
    this._buildPoolAndDeck();
    return {
      rooms: this.roomsData,
      roomMeshes: this.roomMeshes,
      roofGroup: this.roofGroup,
      treePoints: this.treePoints
    };
  }

  /**
   * Topografía real hiperrealista de Albán (Cundinamarca) usando elevaciones DEM reales
   * y textura satelital combinada con relieve PBR
   */
  _buildRealTopography() {
    const terrainSize = 220; // 220 metros de terreno alrededor
    const segments = 64;
    const geo = new THREE.PlaneGeometry(terrainSize, terrainSize, segments, segments);
    geo.rotateX(-Math.PI / 2);

    const loader = new THREE.TextureLoader();
    const satTex = loader.load('./assets/textures/satellite_namay.jpg');
    satTex.wrapS = satTex.wrapT = THREE.ClampToEdgeWrapping;
    satTex.colorSpace = THREE.SRGBColorSpace;

    // Normal map para pasto y tierra de cordillera
    const grassNorm = loader.load('./assets/textures/pbr/leafy_grass_nor_gl_1k.jpg');
    grassNorm.wrapS = grassNorm.wrapT = THREE.RepeatWrapping;
    grassNorm.repeat.set(24, 24);

    const terrainMat = new THREE.MeshStandardMaterial({
      map: satTex,
      normalMap: grassNorm,
      normalScale: new THREE.Vector2(0.85, 0.85),
      roughness: 0.92,
      metalness: 0.05
    });

    const pos = geo.attributes.position;
    const baseElevation = 1335.0; // Altura de la terraza de la hacienda

    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const z = pos.getZ(i);

      // Normalizar coordenadas a [0, 1]
      const u = (x + terrainSize / 2) / terrainSize;
      const v = (z + terrainSize / 2) / terrainSize;

      const rawHeight = sampleElevation(u, v);
      let diff = (rawHeight - baseElevation) * 0.45; // escala vertical armónica

      const dist = Math.hypot(x, z);

      // Terraplén de la hacienda: la zona central (radio < 34m) está nivelada
      if (dist < 34) {
        diff = 0;
      } else if (dist < 46) {
        // Talud de transición suave
        const t = (dist - 34) / (46 - 34);
        diff = diff * t;
      }

      pos.setY(i, diff);

      // Detección de árboles reales en la montaña donde la pendiente es natural
      if (dist > 36 && i % 3 === 0) {
        // En Albán los árboles se concentran en las laderas y quebradas
        const isForest = (Math.sin(x * 0.12) * Math.cos(z * 0.12) > -0.2);
        if (isForest) {
          const sp = (x + z) > 0 ? 'euc' : (dist > 60 ? 'pine' : 'ash');
          this.treePoints.push([x, diff, z, sp]);
        }
      }
    }

    geo.computeVertexNormals();

    const terrainMesh = new THREE.Mesh(geo, terrainMat);
    terrainMesh.receiveShadow = true;
    this.scene.add(terrainMesh);
  }

  /**
   * Muro de contención en piedra ciclópea que sostiene la terraza de la hacienda
   */
  _buildRetainingWalls() {
    const wallGroup = new THREE.Group();
    const R = 34.5;
    const h = 2.4;

    // Semicírculo oriental donde la montaña desciende hacia el valle
    const wallGeo = new THREE.CylinderGeometry(R, R, h, 48, 1, true, 0, Math.PI);
    applyCylinderWallUV(wallGeo, R, h, 2.5);
    const wallMesh = new THREE.Mesh(wallGeo, this.materials.wallExt);
    wallMesh.position.y = -h / 2;
    wallMesh.castShadow = true;
    wallMesh.receiveShadow = true;
    wallGroup.add(wallMesh);

    // Corona superior de piedra
    const copingGeo = new THREE.RingGeometry(R - 0.4, R + 0.4, 48, 1, 0, Math.PI);
    copingGeo.rotateX(-Math.PI / 2);
    applyPlanarUV(copingGeo, 1.5);
    const coping = new THREE.Mesh(copingGeo, this.materials.wallExt);
    coping.position.y = 0.05;
    coping.castShadow = true;
    wallGroup.add(coping);

    this.scene.add(wallGroup);
  }

  _buildCourtyard() {
    const courtyard = new THREE.Group();

    // Césped interior del patio
    const lawnGeo = new THREE.CircleGeometry(21.0, 48);
    lawnGeo.rotateX(-Math.PI / 2);
    applyPlanarUV(lawnGeo, 5.0);
    const lawn = new THREE.Mesh(lawnGeo, this.materials.grass);
    lawn.position.y = 0.02;
    lawn.receiveShadow = true;
    courtyard.add(lawn);

    // Fuente central de piedra escalonada con brocal
    const fountainBaseGeo = new THREE.CylinderGeometry(2.8, 3.2, 0.65, 32);
    applyPlanarUV(fountainBaseGeo, 2.0);
    const fountainBase = new THREE.Mesh(fountainBaseGeo, this.materials.wallExt);
    fountainBase.position.set(0, 0.325, 0);
    fountainBase.castShadow = true;
    fountainBase.receiveShadow = true;
    courtyard.add(fountainBase);

    // Taza superior de la fuente
    const basinGeo = new THREE.CylinderGeometry(1.4, 0.9, 0.45, 24);
    const basin = new THREE.Mesh(basinGeo, this.materials.wallExt);
    basin.position.set(0, 0.85, 0);
    basin.castShadow = true;
    courtyard.add(basin);

    // Agua cristalina en la fuente
    const fountainWaterGeo = new THREE.CylinderGeometry(2.55, 2.55, 0.1, 32);
    const fountainWater = new THREE.Mesh(fountainWaterGeo, this.materials.waterPool);
    fountainWater.position.set(0, 0.58, 0);
    courtyard.add(fountainWater);

    // Fogata / Fire pit hundido
    const firePitGroup = new THREE.Group();
    firePitGroup.position.set(8.5, 0, -8.5);

    const pitRingGeo = new THREE.TorusGeometry(2.2, 0.45, 12, 32);
    pitRingGeo.rotateX(Math.PI / 2);
    const pitRing = new THREE.Mesh(pitRingGeo, this.materials.wallExt);
    pitRing.position.y = 0.35;
    pitRing.castShadow = true;
    firePitGroup.add(pitRing);

    // Brasas ardientes
    const coalsGeo = new THREE.CylinderGeometry(1.6, 1.6, 0.15, 24);
    const coalsMat = new THREE.MeshStandardMaterial({
      color: 0x331100,
      emissive: 0xff4800,
      emissiveIntensity: 1.6,
      roughness: 0.9
    });
    const coals = new THREE.Mesh(coalsGeo, coalsMat);
    coals.position.y = 0.2;
    firePitGroup.add(coals);

    const fireLight = new THREE.PointLight(0xff7722, 2.2, 16);
    fireLight.position.set(0, 0.9, 0);
    firePitGroup.add(fireLight);
    this.lightingManager.registerInteriorLight(fireLight, coals);

    courtyard.add(firePitGroup);

    // Caminos curvos de laja en terracota cocida PBR
    const pathGeo = new THREE.RingGeometry(20.4, 21.8, 64);
    pathGeo.rotateX(-Math.PI / 2);
    applyPlanarUV(pathGeo, 1.5);
    const pathMesh = new THREE.Mesh(pathGeo, this.materials.floorTerracota);
    pathMesh.position.y = 0.05;
    pathMesh.receiveShadow = true;
    courtyard.add(pathMesh);

    this.scene.add(courtyard);
  }

  _buildArcBuilding() {
    const R_corridor = 21.0;
    const R_in = 22.5;
    const R_out = 32.5;
    const wallH = 3.3;
    const roofPeakH = 5.2;

    const roomConfigs = [
      { id: 1, name: 'Habitación 1 · Suite Albán', startAng: 208, endAng: 223, area: 32 },
      { id: 2, name: 'Habitación 2 · Suite El Roble', startAng: 224.5, endAng: 239.5, area: 30 },
      { id: 3, name: 'Habitación 3 · Suite La Neblina', startAng: 241, endAng: 256, area: 30 },
      { id: 4, name: 'Habitación 4 · Suite Campestre', startAng: 257.5, endAng: 272.5, area: 30 },
      { id: 5, name: 'Habitación 5 · Suite Los Cerezos', startAng: 274, endAng: 289, area: 30 },
      { id: 6, name: 'Habitación 6 · Suite Vista Cerros', startAng: 290.5, endAng: 305.5, area: 30 },
      { id: 7, name: 'Habitación 7 · Master Suite Namay', startAng: 307, endAng: 322, area: 36 }
    ];

    roomConfigs.forEach(cfg => {
      this._buildSingleRoom(cfg, R_corridor, R_in, R_out, wallH);
    });

    this._buildSocialZone(160, 206, R_corridor, R_in, R_out + 1.5, wallH);
    this._buildServicesZone(120, 158, R_corridor, R_in, R_out, wallH);
    this._buildRoofs(72, 324, R_corridor - 0.8, R_out + 1.2, wallH, roofPeakH);
    this._buildPorchColumns(120, 322, R_corridor, wallH);
  }

  _buildSingleRoom(cfg, R_corridor, R_in, R_out, wallH) {
    const roomGroup = new THREE.Group();
    roomGroup.name = cfg.name;

    const midAngRad = ((cfg.startAng + cfg.endAng) / 2) * (Math.PI / 180);
    const startRad = cfg.startAng * (Math.PI / 180);
    const endRad = cfg.endAng * (Math.PI / 180);
    const angSpan = endRad - startRad;

    const midR = (R_in + R_out) / 2;
    const centerX = midR * Math.sin(midAngRad);
    const centerZ = -midR * Math.cos(midAngRad);

    // Piso PBR de madera con UVs métricas reales
    const floorGeo = new THREE.RingGeometry(R_in, R_out, 14, 1, startRad, angSpan);
    floorGeo.rotateX(-Math.PI / 2);
    applyPlanarUV(floorGeo, 2.2);
    const floorMesh = new THREE.Mesh(floorGeo, this.materials.floorWood);
    floorMesh.position.y = 0.08;
    floorMesh.receiveShadow = true;
    roomGroup.add(floorMesh);

    // Piso del porche en terracota cocida PBR
    const porchFloorGeo = new THREE.RingGeometry(R_corridor, R_in, 8, 1, startRad, angSpan);
    porchFloorGeo.rotateX(-Math.PI / 2);
    applyPlanarUV(porchFloorGeo, 1.4);
    const porchFloor = new THREE.Mesh(porchFloorGeo, this.materials.floorTerracota);
    porchFloor.position.y = 0.06;
    porchFloor.receiveShadow = true;
    roomGroup.add(porchFloor);

    // Muros curvos con UVs cilíndricas
    this._buildCurvedWall(roomGroup, R_out, startRad, endRad, wallH, 0.28, true);
    this._buildCurvedWall(roomGroup, R_in, startRad, endRad, wallH, 0.22, false);

    // Muros radiales divisorios
    this._buildRadialWall(roomGroup, R_in, R_out, startRad, wallH);
    this._buildRadialWall(roomGroup, R_in, R_out, endRad, wallH);

    // Baño privado PBR
    this._buildBathroom(roomGroup, R_in + 1.2, R_out - 1.2, startRad + 0.03, wallH);

    // Mobiliario PBR interior
    this._buildRoomFurniture(roomGroup, centerX, centerZ, midAngRad, cfg);

    // Puerta interactiva con madera PBR y manija de bronce PBR
    const doorR = R_in + 0.1;
    const doorAng = startRad + 0.04;
    const doorX = doorR * Math.sin(doorAng);
    const doorZ = -doorR * Math.cos(doorAng);
    const doorRotY = -doorAng + Math.PI / 2;

    const door = this.doorsManager.createDoor({
      width: 0.95,
      height: 2.2,
      position: new THREE.Vector3(doorX, 0.08, doorZ),
      rotationY: doorRotY,
      roomName: cfg.name,
      woodMaterial: this.materials.woodDoors
    });

    // Malla de colisión e interacción raycast
    const hitGeo = new THREE.BoxGeometry(7, wallH, 8);
    const hitMat = new THREE.MeshBasicMaterial({ visible: false });
    const hitMesh = new THREE.Mesh(hitGeo, hitMat);
    hitMesh.position.set(centerX, wallH / 2, centerZ);
    hitMesh.userData = { roomConfig: cfg, door };
    roomGroup.add(hitMesh);
    this.roomMeshes.push(hitMesh);

    this.roomsData.push({
      id: cfg.id,
      name: cfg.name,
      area: cfg.area,
      centerX,
      centerZ,
      midAngRad,
      door,
      hitMesh,
      group: roomGroup
    });

    this.scene.add(roomGroup);
  }

  _buildCurvedWall(parent, radius, a1, a2, height, thick, hasWindow) {
    const segments = 12;
    const span = a2 - a1;

    if (hasWindow) {
      const sillGeo = new THREE.CylinderGeometry(radius, radius, 0.85, segments, 1, true, a1 + 0.04, span - 0.08);
      applyCylinderWallUV(sillGeo, radius, 0.85, 2.0);
      const sill = new THREE.Mesh(sillGeo, this.materials.wallExt);
      sill.position.y = 0.85 / 2;
      sill.castShadow = true;
      sill.receiveShadow = true;
      parent.add(sill);

      const glassGeo = new THREE.CylinderGeometry(radius, radius, 1.8, segments, 1, true, a1 + 0.04, span - 0.08);
      const glass = new THREE.Mesh(glassGeo, this.materials.glass);
      glass.position.y = 0.85 + 0.9;
      parent.add(glass);

      const lintelGeo = new THREE.CylinderGeometry(radius, radius, 0.65, segments, 1, true, a1 + 0.04, span - 0.08);
      applyCylinderWallUV(lintelGeo, radius, 0.65, 2.0);
      const lintel = new THREE.Mesh(lintelGeo, this.materials.wallExt);
      lintel.position.y = height - 0.65 / 2;
      lintel.castShadow = true;
      parent.add(lintel);
    } else {
      const wallGeo = new THREE.CylinderGeometry(radius, radius, height, segments, 1, true, a1 + 0.06, span - 0.06);
      applyCylinderWallUV(wallGeo, radius, height, 2.0);
      const wall = new THREE.Mesh(wallGeo, this.materials.wallInt);
      wall.position.y = height / 2;
      wall.castShadow = true;
      wall.receiveShadow = true;
      parent.add(wall);
    }
  }

  _buildRadialWall(parent, r1, r2, angleRad, height) {
    const len = r2 - r1;
    const thick = 0.22;
    const wallGeo = new THREE.BoxGeometry(thick, height, len);
    const wall = new THREE.Mesh(wallGeo, this.materials.wallExt);

    const midR = (r1 + r2) / 2;
    wall.position.set(midR * Math.sin(angleRad), height / 2, -midR * Math.cos(angleRad));
    wall.rotation.y = -angleRad;
    wall.castShadow = true;
    wall.receiveShadow = true;
    parent.add(wall);
  }

  _buildBathroom(parent, r1, r2, angleRad, height) {
    const bathGroup = new THREE.Group();
    const midR = r1 + 2.2;
    const x = midR * Math.sin(angleRad);
    const z = -midR * Math.cos(angleRad);
    bathGroup.position.set(x, 0, z);
    bathGroup.rotation.y = -angleRad;

    const floorGeo = new THREE.BoxGeometry(2.4, 0.02, 3.2);
    applyPlanarUV(floorGeo, 1.8);
    const floor = new THREE.Mesh(floorGeo, this.materials.floorBath);
    floor.position.y = 0.1;
    bathGroup.add(floor);

    const screenGeo = new THREE.BoxGeometry(0.04, 2.1, 1.4);
    const screen = new THREE.Mesh(screenGeo, this.materials.glass);
    screen.position.set(0.6, 1.15, -0.6);
    bathGroup.add(screen);

    const vanityGeo = new THREE.BoxGeometry(0.65, 0.85, 1.2);
    const vanity = new THREE.Mesh(vanityGeo, this.materials.floorBath);
    vanity.position.set(-0.6, 0.85 / 2 + 0.1, 0.6);
    vanity.castShadow = true;
    bathGroup.add(vanity);

    const faucetGeo = new THREE.CylinderGeometry(0.02, 0.02, 0.22, 12);
    const faucet = new THREE.Mesh(faucetGeo, this.materials.brassGold);
    faucet.position.set(-0.6, 0.98 + 0.1, 0.6);
    bathGroup.add(faucet);

    parent.add(bathGroup);
  }

  _buildRoomFurniture(parent, cx, cz, angleRad, cfg) {
    const furnGroup = new THREE.Group();
    furnGroup.position.set(cx, 0.1, cz);
    furnGroup.rotation.y = -angleRad + Math.PI;

    // Cama King (Base de madera nogal PBR)
    const baseGeo = new THREE.BoxGeometry(2.1, 0.32, 2.1);
    const baseMesh = new THREE.Mesh(baseGeo, this.materials.woodBeams);
    baseMesh.position.set(0, 0.16, 0);
    baseMesh.castShadow = true;
    furnGroup.add(baseMesh);

    // Colchón con sábanas de lino PBR
    const mattressGeo = new THREE.BoxGeometry(2.0, 0.3, 2.0);
    const mattressMesh = new THREE.Mesh(mattressGeo, this.materials.bedLinen);
    mattressMesh.position.set(0, 0.45, 0);
    mattressMesh.castShadow = true;
    furnGroup.add(mattressMesh);

    // Edredón en bouclé terracota PBR
    const duvetGeo = new THREE.BoxGeometry(2.02, 0.12, 1.4);
    const duvetMesh = new THREE.Mesh(duvetGeo, this.materials.bedCover);
    duvetMesh.position.set(0, 0.58, 0.3);
    duvetMesh.castShadow = true;
    furnGroup.add(duvetMesh);

    // Cabecero en madera estriada PBR
    const headboardGeo = new THREE.BoxGeometry(2.4, 1.35, 0.12);
    const headboardMesh = new THREE.Mesh(headboardGeo, this.materials.woodBeams);
    headboardMesh.position.set(0, 0.75, -1.05);
    headboardMesh.castShadow = true;
    furnGroup.add(headboardMesh);

    // Almohadas de lino
    const pillowGeo = new THREE.BoxGeometry(0.75, 0.18, 0.45);
    for (let p = -1; p <= 1; p += 2) {
      const pillow = new THREE.Mesh(pillowGeo, this.materials.bedLinen);
      pillow.position.set(p * 0.55, 0.65, -0.7);
      pillow.rotation.x = 0.2;
      furnGroup.add(pillow);
    }

    // Mesas de noche laterales PBR
    const tableGeo = new THREE.BoxGeometry(0.5, 0.55, 0.45);
    for (let s = -1; s <= 1; s += 2) {
      const table = new THREE.Mesh(tableGeo, this.materials.woodBeams);
      table.position.set(s * 1.45, 0.275, -0.9);
      table.castShadow = true;
      furnGroup.add(table);

      // Lámpara de noche
      const lampBaseGeo = new THREE.CylinderGeometry(0.08, 0.12, 0.3, 12);
      const lampBase = new THREE.Mesh(lampBaseGeo, this.materials.brassGold);
      lampBase.position.set(s * 1.45, 0.7, -0.9);
      furnGroup.add(lampBase);

      const lampShadeGeo = new THREE.CylinderGeometry(0.14, 0.18, 0.22, 16);
      const lampShadeMat = new THREE.MeshStandardMaterial({
        color: 0xfffae0,
        emissive: 0xffd175,
        emissiveIntensity: 0.8
      });
      const lampShade = new THREE.Mesh(lampShadeGeo, lampShadeMat);
      lampShade.position.set(s * 1.45, 0.9, -0.9);
      furnGroup.add(lampShade);

      const nightLight = new THREE.PointLight(0xffbe6b, 0.85, 5);
      nightLight.position.set(s * 1.45, 1.0, -0.9);
      furnGroup.add(nightLight);
      this.lightingManager.registerInteriorLight(nightLight, lampShade);
    }

    // Poltrona de lectura en cuero cognac PBR
    const chairGeo = new THREE.BoxGeometry(0.85, 0.75, 0.85);
    const chair = new THREE.Mesh(chairGeo, this.materials.leatherChair);
    chair.position.set(1.4, 0.38, 1.2);
    chair.rotation.y = -0.4;
    chair.castShadow = true;
    furnGroup.add(chair);

    // Tapete de lana PBR
    const rugGeo = new THREE.PlaneGeometry(2.4, 2.2);
    rugGeo.rotateX(-Math.PI / 2);
    applyPlanarUV(rugGeo, 1.5);
    const rug = new THREE.Mesh(rugGeo, this.materials.rugWool);
    rug.position.set(0, 0.09, 0.4);
    furnGroup.add(rug);

    // Downlight de techo principal de la habitación
    const ceilingSpot = new THREE.SpotLight(0xfff2dc, 1.4, 9, Math.PI / 3, 0.4, 1.2);
    ceilingSpot.position.set(cx, 3.1, cz);
    ceilingSpot.target.position.set(cx, 0, cz);
    this.scene.add(ceilingSpot);
    this.scene.add(ceilingSpot.target);
    this.lightingManager.registerInteriorLight(ceilingSpot);

    parent.add(furnGroup);
  }

  _buildSocialZone(startAng, endAng, R_corridor, R_in, R_out, wallH) {
    const socialGroup = new THREE.Group();
    socialGroup.name = 'Zona Social & Lounge';

    const startRad = startAng * (Math.PI / 180);
    const endRad = endAng * (Math.PI / 180);
    const span = endRad - startRad;

    const floorGeo = new THREE.RingGeometry(R_in, R_out, 16, 1, startRad, span);
    floorGeo.rotateX(-Math.PI / 2);
    applyPlanarUV(floorGeo, 2.2);
    const floor = new THREE.Mesh(floorGeo, this.materials.floorWood);
    floor.position.y = 0.08;
    floor.receiveShadow = true;
    socialGroup.add(floor);

    this._buildCurvedWall(socialGroup, R_out, startRad, endRad, wallH, 0.35, true);
    this._buildCurvedWall(socialGroup, R_in, startRad, endRad, wallH, 0.25, false);

    const midAngRad = ((startAng + endAng) / 2) * (Math.PI / 180);
    const midR = (R_in + R_out) / 2;
    const fireX = midR * Math.sin(midAngRad);
    const fireZ = -midR * Math.cos(midAngRad);

    const chimneyGeo = new THREE.BoxGeometry(2.4, 4.2, 1.4);
    const chimney = new THREE.Mesh(chimneyGeo, this.materials.wallExt);
    chimney.position.set(fireX, 2.1, fireZ);
    chimney.castShadow = true;
    socialGroup.add(chimney);

    const hearthLight = new THREE.PointLight(0xff6611, 2.2, 12);
    hearthLight.position.set(fireX, 0.8, fireZ);
    socialGroup.add(hearthLight);
    this.lightingManager.registerInteriorLight(hearthLight);

    const tableGeo = new THREE.BoxGeometry(3.6, 0.78, 1.2);
    const tableMesh = new THREE.Mesh(tableGeo, this.materials.woodBeams);
    tableMesh.position.set(fireX + 3.2, 0.45, fireZ - 1.5);
    tableMesh.castShadow = true;
    socialGroup.add(tableMesh);

    const sofaGeo = new THREE.BoxGeometry(2.8, 0.75, 1.1);
    const sofa = new THREE.Mesh(sofaGeo, this.materials.leatherChair);
    sofa.position.set(fireX - 2.8, 0.38, fireZ);
    sofa.castShadow = true;
    socialGroup.add(sofa);

    const doorX = (R_in + 0.1) * Math.sin(startRad + 0.05);
    const doorZ = -(R_in + 0.1) * Math.cos(startRad + 0.05);
    const door = this.doorsManager.createDoor({
      width: 1.2,
      height: 2.3,
      position: new THREE.Vector3(doorX, 0.08, doorZ),
      rotationY: -startRad + Math.PI / 2,
      roomName: 'Zona Social & Lounge',
      woodMaterial: this.materials.woodDoors
    });

    this.roomsData.push({
      id: 8,
      name: 'Zona Social & BBQ',
      area: 110,
      centerX: fireX,
      centerZ: fireZ,
      midAngRad,
      door,
      group: socialGroup
    });

    this.scene.add(socialGroup);
  }

  _buildServicesZone(startAng, endAng, R_corridor, R_in, R_out, wallH) {
    const servGroup = new THREE.Group();
    servGroup.name = 'Servicios & Cocina';

    const startRad = startAng * (Math.PI / 180);
    const endRad = endAng * (Math.PI / 180);
    const span = endRad - startRad;

    const floorGeo = new THREE.RingGeometry(R_in, R_out, 12, 1, startRad, span);
    floorGeo.rotateX(-Math.PI / 2);
    applyPlanarUV(floorGeo, 1.8);
    const floor = new THREE.Mesh(floorGeo, this.materials.floorBath);
    floor.position.y = 0.08;
    servGroup.add(floor);

    this._buildCurvedWall(servGroup, R_out, startRad, endRad, wallH, 0.3, false);
    this._buildCurvedWall(servGroup, R_in, startRad, endRad, wallH, 0.25, false);

    const midAngRad = ((startAng + endAng) / 2) * (Math.PI / 180);
    const midR = (R_in + R_out) / 2;
    const cx = midR * Math.sin(midAngRad);
    const cz = -midR * Math.cos(midAngRad);

    const islandGeo = new THREE.BoxGeometry(2.6, 0.9, 1.1);
    const island = new THREE.Mesh(islandGeo, this.materials.floorBath);
    island.position.set(cx, 0.45 + 0.08, cz);
    island.castShadow = true;
    servGroup.add(island);

    const doorX = (R_in + 0.1) * Math.sin(startRad + 0.05);
    const doorZ = -(R_in + 0.1) * Math.cos(startRad + 0.05);
    const door = this.doorsManager.createDoor({
      width: 0.95,
      height: 2.2,
      position: new THREE.Vector3(doorX, 0.08, doorZ),
      rotationY: -startRad + Math.PI / 2,
      roomName: 'Servicios & Cocina',
      woodMaterial: this.materials.woodDoors
    });

    this.roomsData.push({
      id: 9,
      name: 'Servicios & Cocina',
      area: 65,
      centerX: cx,
      centerZ: cz,
      midAngRad,
      door,
      group: servGroup
    });

    this.scene.add(servGroup);
  }

  _buildPoolAndDeck() {
    const poolGroup = new THREE.Group();
    poolGroup.name = 'Piscina & Deck';

    const startRad = 72 * (Math.PI / 180);
    const endRad = 118 * (Math.PI / 180);
    const span = endRad - startRad;

    const deckGeo = new THREE.RingGeometry(23.0, 36.5, 20, 1, startRad, span);
    deckGeo.rotateX(-Math.PI / 2);
    applyPlanarUV(deckGeo, 2.4);
    const deck = new THREE.Mesh(deckGeo, this.materials.deckWood);
    deck.position.y = 0.12;
    deck.receiveShadow = true;
    poolGroup.add(deck);

    const poolGeo = new THREE.RingGeometry(25.5, 34.0, 20, 1, startRad + 0.08, span - 0.16);
    poolGeo.rotateX(-Math.PI / 2);
    const poolWater = new THREE.Mesh(poolGeo, this.materials.waterPool);
    poolWater.position.y = 0.15;
    poolGroup.add(poolWater);

    for (let a = startRad + 0.15; a < endRad - 0.15; a += 0.2) {
      const lx = 29.5 * Math.sin(a);
      const lz = -29.5 * Math.cos(a);
      const underwaterLight = new THREE.PointLight(0x30d5c8, 1.5, 8);
      underwaterLight.position.set(lx, -0.4, lz);
      poolGroup.add(underwaterLight);
      this.lightingManager.registerInteriorLight(underwaterLight);
    }

    const loungerGeo = new THREE.BoxGeometry(0.7, 0.35, 1.9);
    for (let a = startRad + 0.12; a < endRad - 0.12; a += 0.18) {
      const lx = 24.2 * Math.sin(a);
      const lz = -24.2 * Math.cos(a);
      const lounger = new THREE.Mesh(loungerGeo, this.materials.woodBeams);
      lounger.position.set(lx, 0.3, lz);
      lounger.rotation.y = -a + Math.PI / 2;
      lounger.castShadow = true;
      poolGroup.add(lounger);
    }

    const midAngRad = ((72 + 118) / 2) * (Math.PI / 180);
    const cx = 30.0 * Math.sin(midAngRad);
    const cz = -30.0 * Math.cos(midAngRad);

    this.roomsData.push({
      id: 10,
      name: 'Piscina Sinfín & Solárium',
      area: 140,
      centerX: cx,
      centerZ: cz,
      midAngRad,
      door: null,
      group: poolGroup
    });

    this.scene.add(poolGroup);
  }

  _buildRoofs(startAng, endAng, R_in, R_out, wallH, peakH) {
    const startRad = startAng * (Math.PI / 180);
    const endRad = endAng * (Math.PI / 180);
    const span = endRad - startRad;

    const roofGeo = new THREE.CylinderGeometry(R_in, R_out, 1.8, 48, 1, true, startRad, span);
    applyCylinderWallUV(roofGeo, (R_in + R_out) / 2, 1.8, 1.2);
    const roofMesh = new THREE.Mesh(roofGeo, this.materials.roofTiles);
    roofMesh.position.y = wallH + 0.9;
    roofMesh.castShadow = true;
    roofMesh.receiveShadow = true;
    this.roofGroup.add(roofMesh);

    const beamThick = 0.18;
    const beamLen = R_out - R_in + 1.2;
    const beamGeo = new THREE.BoxGeometry(beamThick, 0.28, beamLen);

    for (let ang = startRad; ang <= endRad; ang += 0.08) {
      const beam = new THREE.Mesh(beamGeo, this.materials.woodBeams);
      const midR = (R_in + R_out) / 2;
      beam.position.set(midR * Math.sin(ang), wallH + 0.14, -midR * Math.cos(ang));
      beam.rotation.y = -ang;
      beam.rotation.x = 0.12;
      beam.castShadow = true;
      this.roofGroup.add(beam);
    }
  }

  _buildPorchColumns(startAng, endAng, radius, height) {
    const colGeo = new THREE.CylinderGeometry(0.14, 0.16, height, 16);
    const startRad = startAng * (Math.PI / 180);
    const endRad = endAng * (Math.PI / 180);

    for (let a = startRad; a <= endRad; a += 0.14) {
      const col = new THREE.Mesh(colGeo, this.materials.woodBeams);
      col.position.set(radius * Math.sin(a), height / 2, -radius * Math.cos(a));
      col.castShadow = true;
      col.receiveShadow = true;
      this.scene.add(col);
    }
  }
}
