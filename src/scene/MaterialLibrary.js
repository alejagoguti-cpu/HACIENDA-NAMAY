import * as THREE from 'three';

/**
 * MaterialLibrary — Catálogo completo de materiales PBR calibrados con mapeo UV real
 * para Hacienda Namay:
 * - Color / Albedo (sRGB)
 * - Mapa de normales (NormalMap)
 * - Mapa de rugosidad (RoughnessMap)
 * - Mapeo UV calibrado a escala real en metros (world-space / triplanar / unwrap)
 */
export class MaterialLibrary {
  constructor() {
    this.loader = new THREE.TextureLoader();
    this.textures = new Map();
    this.materials = new Map();
  }

  getTexture(url, repeatX = 1, repeatY = 1, isSRGB = true) {
    const key = `${url}_${repeatX}_${repeatY}_${isSRGB}`;
    if (this.textures.has(key)) return this.textures.get(key);

    const tex = this.loader.load(url);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(repeatX, repeatY);
    tex.anisotropy = 8;
    if (isSRGB) tex.colorSpace = THREE.SRGBColorSpace;
    this.textures.set(key, tex);
    return tex;
  }

  /**
   * Crea un material PBR completo (Albedo + Normal + Roughness)
   * `meters` define el tamaño de un tile en metros reales
   */
  pbr(name, meters = 1.0, {
    roughness = 0.8,
    metalness = 0.0,
    color = 0xffffff,
    normalScale = 1.0,
    envMapIntensity = 0.6
  } = {}) {
    const rep = 1 / meters;
    const base = `./assets/textures/real/${name}`;

    const albedo = this.getTexture(`${base}.webp`, rep, rep, true);
    const normal = this.getTexture(`${base}_n.webp`, rep, rep, false);
    const rough = this.getTexture(`${base}_r.webp`, rep, rep, false);

    const mat = new THREE.MeshStandardMaterial({
      map: albedo,
      normalMap: normal,
      roughnessMap: rough,
      roughness,
      metalness,
      color,
      envMapIntensity
    });
    mat.normalScale.set(normalScale, normalScale);
    return mat;
  }

  /**
   * Genera el atlas procedural PBR para tejas coloniales de barro (Spanish Terracotta Roof Tiles)
   * con relieve acanalado, normals y variaciones de quemado de horno
   */
  createRoofTilePBR(meters = 1.2) {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');

    // Base terracota cocida
    ctx.fillStyle = '#b34728';
    ctx.fillRect(0, 0, 512, 512);

    // Hiladas de tejas árabes / coloniales
    for (let y = 0; y < 512; y += 32) {
      ctx.fillStyle = y % 64 === 0 ? '#8a3319' : '#c45330';
      ctx.fillRect(0, y, 512, 6);
      ctx.fillStyle = 'rgba(0,0,0,0.22)';
      ctx.fillRect(0, y + 6, 512, 4);
    }

    // Canales verticales y sombras de curvatura
    for (let x = 0; x < 512; x += 64) {
      const grad = ctx.createLinearGradient(x, 0, x + 64, 0);
      grad.addColorStop(0, 'rgba(0,0,0,0.35)');
      grad.addColorStop(0.3, 'rgba(255,255,255,0.18)');
      grad.addColorStop(0.7, 'rgba(255,255,255,0.0)');
      grad.addColorStop(1, 'rgba(0,0,0,0.4)');
      ctx.fillStyle = grad;
      ctx.fillRect(x, 0, 64, 512);
    }

    const albedoTex = new THREE.CanvasTexture(canvas);
    albedoTex.wrapS = albedoTex.wrapT = THREE.RepeatWrapping;
    const rep = 1 / meters;
    albedoTex.repeat.set(rep * 2, rep * 2);
    albedoTex.colorSpace = THREE.SRGBColorSpace;

    // Normal map procedural para las tejas
    const normCanvas = document.createElement('canvas');
    normCanvas.width = 512;
    normCanvas.height = 512;
    const nctx = normCanvas.getContext('2d');
    nctx.fillStyle = '#8080ff'; // normal neutra
    nctx.fillRect(0, 0, 512, 512);

    for (let x = 0; x < 512; x += 64) {
      const ngrad = nctx.createLinearGradient(x, 0, x + 64, 0);
      ngrad.addColorStop(0, '#4080ff');   // inclinada a la izquierda
      ngrad.addColorStop(0.5, '#8080ff'); // plana
      ngrad.addColorStop(1, '#c080ff');   // inclinada a la derecha
      nctx.fillStyle = ngrad;
      nctx.fillRect(x, 0, 64, 512);
    }
    const normalTex = new THREE.CanvasTexture(normCanvas);
    normalTex.wrapS = normalTex.wrapT = THREE.RepeatWrapping;
    normalTex.repeat.set(rep * 2, rep * 2);

    const mat = new THREE.MeshStandardMaterial({
      map: albedoTex,
      normalMap: normalTex,
      roughness: 0.85,
      metalness: 0.02
    });
    mat.normalScale.set(1.2, 1.2);
    return mat;
  }

  /**
   * Inicializa y retorna el diccionario de materiales PBR
   */
  getAll() {
    // 1. Muros exteriores: Tapia pisada / Piedra arena PBR
    const wallExt = this.pbr('piedra_arena', 2.0, {
      roughness: 0.9,
      normalScale: 0.8,
      color: 0xf5eee4
    });

    // 2. Muros interiores: Ladrillo / Estuco texturizado
    const wallInt = this.pbr('piedra_arena', 2.5, {
      roughness: 0.85,
      color: 0xfaf5ec
    });

    // 3. Pisos de habitaciones: Madera nogal PBR
    const floorWood = this.pbr('piso_madera', 2.2, {
      roughness: 0.45,
      normalScale: 0.7,
      color: 0xe6d4c0
    });

    // 4. Pisos de corredores y galerías: Tejido Terracota / Barro cocido PBR
    const floorTerracota = this.pbr('tejido_terracota', 1.4, {
      roughness: 0.75,
      normalScale: 1.1,
      color: 0xc45c36
    });

    // 5. Baños: Mármol / Phantom grey PBR
    const floorBath = this.pbr('phantom_grey', 1.8, {
      roughness: 0.28,
      normalScale: 0.5,
      color: 0xe5e5e5
    });

    // 6. Vigas, columnas y marcos: Roble / Nogal rústico PBR
    const woodBeams = this.pbr('nogal', 1.5, {
      roughness: 0.65,
      normalScale: 1.2,
      color: 0x583e28
    });

    // 7. Puertas: Roble claro PBR
    const woodDoors = this.pbr('roble_claro', 1.2, {
      roughness: 0.5,
      normalScale: 0.9,
      color: 0x7a5232
    });

    // 8. Cama y sábanas: Lino blanco PBR
    const bedLinen = this.pbr('cama_blanca', 1.0, {
      roughness: 0.92,
      normalScale: 0.6,
      color: 0xfbf9f5
    });

    // 9. Edredón y cojines: Bouclé / Tejido terracota PBR
    const bedCover = this.pbr('tejido_terracota', 1.2, {
      roughness: 0.88,
      normalScale: 1.0,
      color: 0xaf4f2e
    });

    // 10. Tapetes: Lana tejida PBR
    const rugWool = this.pbr('tapete_lana', 2.0, {
      roughness: 0.95,
      normalScale: 1.3
    });

    // 11. Cuero para poltronas: Cuero cognac PBR
    const leatherChair = this.pbr('cuero_cognac', 1.0, {
      roughness: 0.52,
      normalScale: 0.8
    });

    // 12. Tejas de barro coloniales PBR
    const roofTiles = this.createRoofTilePBR(1.2);

    // 13. Vidrio arquitectónico físico
    const glass = new THREE.MeshPhysicalMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.32,
      roughness: 0.05,
      transmission: 0.88,
      ior: 1.52,
      reflectivity: 0.75
    });

    // 14. Agua cristalina de piscina con refracción
    const waterPool = new THREE.MeshPhysicalMaterial({
      color: 0x1aa6cc,
      transmission: 0.82,
      roughness: 0.1,
      ior: 1.333,
      transparent: true,
      opacity: 0.85
    });

    // 15. Deck de teca exterior PBR
    const deckWood = this.pbr('piso_madera', 2.4, {
      roughness: 0.65,
      color: 0x936647,
      normalScale: 1.1
    });

    // 16. Césped y terreno
    const grass = new THREE.MeshStandardMaterial({
      color: 0x4e6b36,
      roughness: 0.94,
      metalness: 0.0
    });

    // 17. Latón dorado para manijas y apliques
    const brassGold = new THREE.MeshStandardMaterial({
      color: 0xd4af37,
      roughness: 0.22,
      metalness: 0.88
    });

    return {
      wallExt,
      wallInt,
      floorWood,
      floorTerracota,
      floorBath,
      woodBeams,
      woodDoors,
      bedLinen,
      bedCover,
      rugWool,
      leatherChair,
      roofTiles,
      glass,
      waterPool,
      deckWood,
      grass,
      brassGold
    };
  }
}
