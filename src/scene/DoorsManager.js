import * as THREE from 'three';

/**
 * DoorsManager — Gestión interactiva de puertas 3D para Hacienda Namay:
 * - Creación de puertas con marco, hoja de madera y manija de bronce.
 * - Animación de apertura a 90° pivotando sobre las bisagras.
 * - Soporte para clic individual (Raycasting) o comando maestro "Abrir/Cerrar todas".
 */
export class DoorsManager {
  constructor(scene) {
    this.scene = scene;
    this.doors = [];        // lista de objetos de puerta
    this.interactiveMeshes = []; // mallas que responden a raycaster
    this.allOpen = false;
  }

  /**
   * Crea e instala una puerta 3D batiente interactiva
   * @param {Object} options
   * @param {number} options.width Ancho de la puerta (ej. 0.95m)
   * @param {number} options.height Alto de la puerta (ej. 2.2m)
   * @param {number} options.depth Espesor de la puerta (ej. 0.045m)
   * @param {THREE.Vector3} options.position Posición base de la bisagra
   * @param {number} options.rotationY Rotación inicial del marco
   * @param {string} options.roomName Nombre del recinto al que pertenece
   * @param {THREE.Material} options.woodMaterial Material de madera
   */
  createDoor({
    width = 0.92,
    height = 2.25,
    depth = 0.045,
    position = new THREE.Vector3(),
    rotationY = 0,
    roomName = 'Habitación',
    woodMaterial = null,
    swingDir = 1 // 1 hacia adentro, -1 hacia afuera
  } = {}) {
    // Grupo contenedor del marco
    const frameGroup = new THREE.Group();
    frameGroup.position.copy(position);
    frameGroup.rotation.y = rotationY;

    // Material de madera si no viene provisto
    const doorMat = woodMaterial || new THREE.MeshStandardMaterial({
      color: 0x5a3d28,
      roughness: 0.65,
      metalness: 0.05
    });

    const handleMat = new THREE.MeshStandardMaterial({
      color: 0xd4af37, // latón dorado
      roughness: 0.25,
      metalness: 0.85
    });

    const frameMat = new THREE.MeshStandardMaterial({
      color: 0x3d2719,
      roughness: 0.8
    });

    // Marco exterior (jambas)
    const frameThick = 0.06;
    const jambaGeo = new THREE.BoxGeometry(frameThick, height, depth * 1.5);
    const jambaLeft = new THREE.Mesh(jambaGeo, frameMat);
    jambaLeft.position.set(-frameThick / 2, height / 2, 0);
    jambaLeft.castShadow = true;
    frameGroup.add(jambaLeft);

    const jambaRight = new THREE.Mesh(jambaGeo, frameMat);
    jambaRight.position.set(width + frameThick / 2, height / 2, 0);
    jambaRight.castShadow = true;
    frameGroup.add(jambaRight);

    const cabezalGeo = new THREE.BoxGeometry(width + frameThick * 2, frameThick, depth * 1.5);
    const cabezal = new THREE.Mesh(cabezalGeo, frameMat);
    cabezal.position.set(width / 2, height + frameThick / 2, 0);
    cabezal.castShadow = true;
    frameGroup.add(cabezal);

    // Pivot de bisagra (gira en x = 0)
    const pivot = new THREE.Group();
    pivot.position.set(0, 0, 0);

    // Hoja de la puerta (desplazada en x para que pivote en su canto)
    const leafGeo = new THREE.BoxGeometry(width, height - 0.02, depth);
    leafGeo.translate(width / 2, height / 2, 0); // centro en width/2 relativo al pivote

    const leafMesh = new THREE.Mesh(leafGeo, doorMat);
    leafMesh.castShadow = true;
    leafMesh.receiveShadow = true;

    // Manija / Picaporte
    const handleGeo = new THREE.CylinderGeometry(0.015, 0.015, 0.12, 12);
    handleGeo.rotateZ(Math.PI / 2);
    const handleLever = new THREE.Mesh(handleGeo, handleMat);
    handleLever.position.set(width - 0.08, 1.05, depth / 2 + 0.035);

    const handleKnobGeo = new THREE.CylinderGeometry(0.012, 0.012, 0.05, 12);
    handleKnobGeo.rotateX(Math.PI / 2);
    const handleStem = new THREE.Mesh(handleKnobGeo, handleMat);
    handleStem.position.set(width - 0.12, 1.05, depth / 2 + 0.015);

    // Manija del otro lado
    const handleLeverBack = handleLever.clone();
    handleLeverBack.position.z = -depth / 2 - 0.035;
    const handleStemBack = handleStem.clone();
    handleStemBack.position.z = -depth / 2 - 0.015;

    pivot.add(leafMesh);
    pivot.add(handleLever);
    pivot.add(handleStem);
    pivot.add(handleLeverBack);
    pivot.add(handleStemBack);

    frameGroup.add(pivot);
    this.scene.add(frameGroup);

    // Objeto descriptor de la puerta
    const doorObj = {
      id: this.doors.length + 1,
      roomName,
      pivot,
      leafMesh,
      frameGroup,
      isOpen: false,
      currentAngle: 0,
      targetAngle: 0,
      swingAngle: (Math.PI / 2) * swingDir,
      width,
      height
    };

    // Vincular metadata a la malla para raycasting
    leafMesh.userData = { doorObj };
    this.interactiveMeshes.push(leafMesh);
    this.doors.push(doorObj);

    return doorObj;
  }

  /**
   * Alterna el estado (abrir/cerrar) de una puerta específica
   */
  toggleDoor(doorObj) {
    if (!doorObj) return;
    doorObj.isOpen = !doorObj.isOpen;
    doorObj.targetAngle = doorObj.isOpen ? doorObj.swingAngle : 0;
    return doorObj.isOpen;
  }

  /**
   * Alterna todas las puertas al mismo tiempo
   */
  toggleAll() {
    this.allOpen = !this.allOpen;
    this.doors.forEach(d => {
      d.isOpen = this.allOpen;
      d.targetAngle = d.isOpen ? d.swingAngle : 0;
    });
    return this.allOpen;
  }

  /**
   * Actualización suave de la rotación de las puertas en el render loop
   */
  update(delta = 0.016) {
    const speed = 7.0; // velocidad de giro
    for (let i = 0; i < this.doors.length; i++) {
      const d = this.doors[i];
      if (Math.abs(d.currentAngle - d.targetAngle) > 0.001) {
        d.currentAngle = THREE.MathUtils.damp(d.currentAngle, d.targetAngle, speed, delta);
        d.pivot.rotation.y = d.currentAngle;
      }
    }
  }
}
