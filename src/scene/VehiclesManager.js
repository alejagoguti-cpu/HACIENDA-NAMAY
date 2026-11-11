import * as THREE from 'three';

/**
 * VehiclesManager — Modelado 3D de motocicletas y vehículos camperos para Hacienda Namay:
 * - Motos de aventura / trail (chasis, ruedas de radios, motor, tanque, manubrio, farolas)
 * - Camperos 4x4 de montaña estacionados en la llegada
 * - Animación sutil de llegada por el camino de acceso rural
 */
export class VehiclesManager {
  constructor(scene) {
    this.scene = scene;
    this.vehiclesGroup = new THREE.Group();
    this.vehiclesGroup.name = 'Vehicles_Motos';
    this.scene.add(this.vehiclesGroup);

    this.movingMoto = null;
    this.motoT = 0;

    this.materials = this._createMaterials();
  }

  _createMaterials() {
    return {
      metalChrome: new THREE.MeshStandardMaterial({
        color: 0xd8d8d8,
        metalness: 0.92,
        roughness: 0.18
      }),
      metalBlack: new THREE.MeshStandardMaterial({
        color: 0x1a1a1a,
        metalness: 0.85,
        roughness: 0.35
      }),
      rubberTire: new THREE.MeshStandardMaterial({
        color: 0x222222,
        roughness: 0.88,
        metalness: 0.05
      }),
      tankYellow: new THREE.MeshStandardMaterial({
        color: 0xf5b700,
        roughness: 0.25,
        metalness: 0.3
      }),
      tankTerracota: new THREE.MeshStandardMaterial({
        color: 0xb84422,
        roughness: 0.28,
        metalness: 0.25
      }),
      tankBlack: new THREE.MeshStandardMaterial({
        color: 0x0f1114,
        roughness: 0.3,
        metalness: 0.4
      }),
      seatLeather: new THREE.MeshStandardMaterial({
        color: 0x2b1e16,
        roughness: 0.75
      }),
      lightGlass: new THREE.MeshStandardMaterial({
        color: 0xfffae0,
        emissive: 0xffeb99,
        emissiveIntensity: 0.8,
        roughness: 0.1
      }),
      tailRed: new THREE.MeshStandardMaterial({
        color: 0xcc1111,
        emissive: 0xff0000,
        emissiveIntensity: 0.6,
        roughness: 0.2
      }),
      carPaint: new THREE.MeshStandardMaterial({
        color: 0x3d4b3c, // verde oliva campero
        roughness: 0.3,
        metalness: 0.6
      }),
      carGlass: new THREE.MeshPhysicalMaterial({
        color: 0x111111,
        transparent: true,
        opacity: 0.55,
        roughness: 0.1,
        reflectivity: 0.8
      })
    };
  }

  /**
   * Construye una motocicleta 3D detallada (Trail / Enduro)
   */
  createMotorcycle({ tankMat = this.materials.tankTerracota, scale = 1.0 } = {}) {
    const moto = new THREE.Group();

    // 1. Ruedas (Delantera y Trasera con neumáticos y rines)
    const tireGeo = new THREE.TorusGeometry(0.38, 0.09, 12, 24);
    const rimGeo = new THREE.CylinderGeometry(0.32, 0.32, 0.06, 16);
    rimGeo.rotateX(Math.PI / 2);

    // Rueda trasera
    const rearTire = new THREE.Mesh(tireGeo, this.materials.rubberTire);
    const rearRim = new THREE.Mesh(rimGeo, this.materials.metalChrome);
    rearTire.position.set(0, 0.38, -0.72);
    rearRim.position.set(0, 0.38, -0.72);
    rearTire.castShadow = true;
    rearRim.castShadow = true;
    moto.add(rearTire);
    moto.add(rearRim);

    // Rueda delantera
    const frontTire = new THREE.Mesh(tireGeo, this.materials.rubberTire);
    const frontRim = new THREE.Mesh(rimGeo, this.materials.metalChrome);
    frontTire.position.set(0, 0.42, 0.78);
    frontRim.position.set(0, 0.42, 0.78);
    frontTire.castShadow = true;
    frontRim.castShadow = true;
    moto.add(frontTire);
    moto.add(frontRim);

    // 2. Chasis y Motor
    const engineGeo = new THREE.BoxGeometry(0.24, 0.32, 0.45);
    const engine = new THREE.Mesh(engineGeo, this.materials.metalBlack);
    engine.position.set(0, 0.45, -0.1);
    engine.castShadow = true;
    moto.add(engine);

    // Tubo de escape cromado
    const exhaustGeo = new THREE.CylinderGeometry(0.045, 0.05, 0.8, 12);
    exhaustGeo.rotateX(Math.PI / 2.3);
    const exhaust = new THREE.Mesh(exhaustGeo, this.materials.metalChrome);
    exhaust.position.set(0.18, 0.42, -0.45);
    exhaust.castShadow = true;
    moto.add(exhaust);

    // Horquilla delantera (telescópicas)
    const forkGeo = new THREE.CylinderGeometry(0.03, 0.03, 0.75, 12);
    forkGeo.rotateX(-0.35);
    for (let side = -1; side <= 1; side += 2) {
      const fork = new THREE.Mesh(forkGeo, this.materials.metalChrome);
      fork.position.set(side * 0.12, 0.65, 0.62);
      fork.castShadow = true;
      moto.add(fork);
    }

    // 3. Tanque de gasolina esculpido
    const tankGeo = new THREE.BoxGeometry(0.32, 0.28, 0.52);
    const tank = new THREE.Mesh(tankGeo, tankMat);
    tank.position.set(0, 0.76, 0.22);
    tank.rotation.x = -0.15;
    tank.castShadow = true;
    moto.add(tank);

    // 4. Asiento de cuero
    const seatGeo = new THREE.BoxGeometry(0.26, 0.14, 0.58);
    const seat = new THREE.Mesh(seatGeo, this.materials.seatLeather);
    seat.position.set(0, 0.74, -0.32);
    seat.rotation.x = 0.08;
    seat.castShadow = true;
    moto.add(seat);

    // 5. Manubrio y Espejos
    const barGeo = new THREE.CylinderGeometry(0.018, 0.018, 0.74, 12);
    barGeo.rotateZ(Math.PI / 2);
    const handlebar = new THREE.Mesh(barGeo, this.materials.metalBlack);
    handlebar.position.set(0, 0.98, 0.5);
    handlebar.castShadow = true;
    moto.add(handlebar);

    // Espejos retrovisores
    const mirrorGeo = new THREE.CircleGeometry(0.05, 12);
    for (let s = -1; s <= 1; s += 2) {
      const mirror = new THREE.Mesh(mirrorGeo, this.materials.metalChrome);
      mirror.position.set(s * 0.36, 1.08, 0.5);
      moto.add(mirror);
    }

    // 6. Farola delantera
    const headlightGeo = new THREE.CylinderGeometry(0.08, 0.08, 0.12, 16);
    headlightGeo.rotateX(Math.PI / 2);
    const headlight = new THREE.Mesh(headlightGeo, this.materials.lightGlass);
    headlight.position.set(0, 0.9, 0.78);
    moto.add(headlight);

    // Luz de farola puntual
    const headPoint = new THREE.SpotLight(0xfffae0, 2.0, 16, Math.PI / 4, 0.5);
    headPoint.position.set(0, 0.9, 0.85);
    headPoint.target.position.set(0, 0.2, 8.0);
    moto.add(headPoint);
    moto.add(headPoint.target);

    // Luz de freno trasera roja
    const tailGeo = new THREE.BoxGeometry(0.12, 0.06, 0.05);
    const tail = new THREE.Mesh(tailGeo, this.materials.tailRed);
    tail.position.set(0, 0.72, -0.65);
    moto.add(tail);

    // Pata de cabra / soporte lateral (inclinación realista si está parqueada)
    const standGeo = new THREE.CylinderGeometry(0.02, 0.02, 0.36, 8);
    standGeo.rotateZ(0.4);
    const stand = new THREE.Mesh(standGeo, this.materials.metalBlack);
    stand.position.set(-0.16, 0.18, -0.15);
    moto.add(stand);

    moto.scale.setScalar(scale);
    return moto;
  }

  /**
   * Campero 4x4 clásico de cordillera (Toyota Land Cruiser / Jeep)
   */
  createCampero4x4() {
    const car = new THREE.Group();

    // Carrocería principal
    const bodyGeo = new THREE.BoxGeometry(1.9, 0.9, 3.8);
    const body = new THREE.Mesh(bodyGeo, this.materials.carPaint);
    body.position.set(0, 0.95, 0);
    body.castShadow = true;
    body.receiveShadow = true;
    car.add(body);

    // Cabina con vidrios
    const cabinGeo = new THREE.BoxGeometry(1.8, 0.75, 2.2);
    const cabin = new THREE.Mesh(cabinGeo, this.materials.carGlass);
    cabin.position.set(0, 1.75, -0.3);
    cabin.castShadow = true;
    car.add(cabin);

    // Techo
    const roofGeo = new THREE.BoxGeometry(1.86, 0.08, 2.3);
    const roof = new THREE.Mesh(roofGeo, this.materials.metalBlack);
    roof.position.set(0, 2.15, -0.3);
    roof.castShadow = true;
    car.add(roof);

    // Ruedas 4x4 anchas
    const wheelGeo = new THREE.CylinderGeometry(0.44, 0.44, 0.28, 16);
    wheelGeo.rotateZ(Math.PI / 2);

    const wheelPos = [
      [-0.98, 0.44, 1.2],
      [0.98, 0.44, 1.2],
      [-0.98, 0.44, -1.2],
      [0.98, 0.44, -1.2]
    ];
    wheelPos.forEach(([x, y, z]) => {
      const w = new THREE.Mesh(wheelGeo, this.materials.rubberTire);
      w.position.set(x, y, z);
      w.castShadow = true;
      car.add(w);
    });

    // Rueda de repuesto trasera
    const spare = new THREE.Mesh(wheelGeo, this.materials.rubberTire);
    spare.position.set(0, 1.1, -1.98);
    spare.rotation.x = Math.PI / 2;
    spare.castShadow = true;
    car.add(spare);

    return car;
  }

  /**
   * Instala los vehículos y motos en el estacionamiento y acceso de Hacienda Namay
   */
  spawnVehicles() {
    // Zona de parqueadero al noroccidente de la entrada
    // 1. Fila de MOTOS reales de diferentes marcas/colores
    const moto1 = this.createMotorcycle({ tankMat: this.materials.tankTerracota });
    moto1.position.set(-18.5, 0, 18.0);
    moto1.rotation.y = 0.45;
    moto1.rotation.z = -0.12; // inclinada en su pata de cabra
    this.vehiclesGroup.add(moto1);

    const moto2 = this.createMotorcycle({ tankMat: this.materials.tankYellow });
    moto2.position.set(-19.8, 0, 19.4);
    moto2.rotation.y = 0.45;
    moto2.rotation.z = -0.12;
    this.vehiclesGroup.add(moto2);

    const moto3 = this.createMotorcycle({ tankMat: this.materials.tankBlack });
    moto3.position.set(-21.1, 0, 20.8);
    moto3.rotation.y = 0.45;
    moto3.rotation.z = -0.12;
    this.vehiclesGroup.add(moto3);

    const moto4 = this.createMotorcycle({ tankMat: this.materials.metalChrome });
    moto4.position.set(-22.4, 0, 22.2);
    moto4.rotation.y = 0.45;
    moto4.rotation.z = -0.12;
    this.vehiclesGroup.add(moto4);

    // 2. Campero 4x4 estacionado en la bahía
    const campero = this.createCampero4x4();
    campero.position.set(-26.0, 0, 26.5);
    campero.rotation.y = 0.35;
    this.vehiclesGroup.add(campero);

    // 3. Moto en movimiento por la vía de acceso rural
    this.movingMoto = this.createMotorcycle({ tankMat: this.materials.tankYellow });
    this.vehiclesGroup.add(this.movingMoto);
  }

  update(delta = 0.016) {
    if (!this.movingMoto) return;

    // Recorrido suave a lo largo del camino rural de acceso
    this.motoT += delta * 0.12;
    const t = this.motoT % (Math.PI * 2);

    const r = 36.0 + Math.sin(t * 2) * 3.0;
    const x = r * Math.sin(t * 0.7 + 1.2);
    const z = r * Math.cos(t * 0.7 + 1.2);

    // Orientación hacia donde avanza
    const nextT = t + 0.02;
    const nextR = 36.0 + Math.sin(nextT * 2) * 3.0;
    const nextX = nextR * Math.sin(nextT * 0.7 + 1.2);
    const nextZ = nextR * Math.cos(nextT * 0.7 + 1.2);

    this.movingMoto.position.set(x, 0.05, z);
    const dir = new THREE.Vector2(nextX - x, nextZ - z).normalize();
    this.movingMoto.rotation.y = Math.atan2(dir.x, dir.y);
  }
}
