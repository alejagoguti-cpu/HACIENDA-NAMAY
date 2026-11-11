import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { LightingManager } from './LightingManager.js';
import { DoorsManager } from './DoorsManager.js';
import { RealTrees } from './RealTrees.js';
import { windUniforms } from './Wind.js';
import { HaciendaBuildingBuilder } from './HaciendaBuildingBuilder.js';
import { WalkControls } from './WalkControls.js';
import { ExplodedAxonometry } from './ExplodedAxonometry.js';
import { VehiclesManager } from './VehiclesManager.js';
import { SkyEnvironment } from './SkyEnvironment.js';
import { PostFX } from './PostFX.js';

/**
 * MasterplanScene — Motor 3D hiperrealista para Hacienda Namay:
 * - Topografía real 1:1 de Albán (Cundinamarca) georreferenciada (4.932819869193663, -74.44640638465661)
 * - Post-procesamiento cinematográfico (GTAO oclusión ambiental de contacto, UnrealBloom, Gradación fílmica)
 * - Atmósfera física con cielo Rayleigh/Mie, nubes volumétricas 3D y PMREM Skylight
 * - Arbolado denso tipo Unreal con shader de viento en GPU
 * - Motos 3D y camperos en el acceso y parqueadero
 * - Recorrido peatonal con flechas del teclado, axonometría explotada, control de luces y puertas
 */
export class MasterplanScene {
  constructor(container, onRoomSelected = null, onModeChanged = null) {
    this.container = container;
    this.onRoomSelected = onRoomSelected;
    this.onModeChanged = onModeChanged;

    this.currentMode = 'exterior';
    this.selectedRoom = null;

    this.clock = new THREE.Clock();
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();

    this._initScene();
    this._initRenderer();
    this._initCameraAndControls();
    this._initSystems();
    this._plantUnrealTrees();
    this._initPostFXAndSky();
    this._initInteractions();
    this._onResize();

    window.addEventListener('resize', () => this._onResize());
    this._animate();
  }

  _initScene() {
    this.scene = new THREE.Scene();
  }

  _initRenderer() {
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: 'high-performance'
    });
    this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.0;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    this.container.appendChild(this.renderer.domElement);
  }

  _initCameraAndControls() {
    this.camera = new THREE.PerspectiveCamera(
      45,
      this.container.clientWidth / this.container.clientHeight,
      0.2,
      2500
    );
    this.camera.position.set(42, 28, 42);

    this.orbitControls = new OrbitControls(this.camera, this.renderer.domElement);
    this.orbitControls.enableDamping = true;
    this.orbitControls.dampingFactor = 0.05;
    this.orbitControls.target.set(0, 1.2, 0);
    this.orbitControls.maxPolarAngle = Math.PI / 2.04;
    this.orbitControls.minDistance = 2.0;
    this.orbitControls.maxDistance = 220.0;
    this.orbitControls.screenSpacePanning = true;

    this.walkControls = new WalkControls(this.camera, this.renderer.domElement);
  }

  _initSystems() {
    this.lighting = new LightingManager(this.scene);
    this.doors = new DoorsManager(this.scene);

    this.builder = new HaciendaBuildingBuilder(this.scene, this.doors, this.lighting);
    const buildResult = this.builder.build();
    this.roomsData = buildResult.rooms;
    this.roomMeshes = buildResult.roomMeshes;
    this.roofGroup = buildResult.roofGroup;
    this.terrainTreePoints = buildResult.treePoints || [];

    // Vehículos y Motos en la llegada y vía rural
    this.vehicles = new VehiclesManager(this.scene);
    this.vehicles.spawnVehicles();

    // Despiece axonométrico con GSAP
    this.axonometry = new ExplodedAxonometry(
      this.roofGroup,
      this.camera,
      this.orbitControls,
      (isExp) => {
        if (this.onModeChanged) {
          this.onModeChanged(isExp ? 'axonometria' : 'exterior');
        }
      }
    );
  }

  _initPostFXAndSky() {
    try {
      // Sky Atmosphere física y nubes 3D volumétricas
      this.skyEnv = new SkyEnvironment(
        this.renderer,
        this.scene,
        this.lighting.sunLight,
        this.lighting.hemiLight
      );
      this.skyEnv.setHour(10.5); // Sol de media mañana en cordillera
    } catch (e) {
      console.warn('SkyEnvironment fallback', e);
    }

    try {
      // Cadena de posproceso cinematográfico (GTAO + Bloom + AgX grading)
      this.postFX = new PostFX(this.renderer, this.scene, this.camera, this.container);
    } catch (e) {
      console.warn('PostFX fallback', e);
    }
  }

  /**
   * Siembra densa de árboles reales tipo Unreal ("DONDE VES ARBOL TIENES QUE PONER REAL")
   */
  _plantUnrealTrees() {
    try {
      this.trees = new RealTrees();
      const treeGroup = new THREE.Group();
      treeGroup.name = 'UnrealTrees_Albán';

      const points = [];

      // 1. Árboles ornamentales en el patio interior
      points.push([4.5, 0, 4.5, 'palm']);
      points.push([-5.2, 0, 5.0, 'palm']);
      points.push([-7.0, 0, -4.0, 'celtis']);
      points.push([6.0, 0, -5.5, 'celtis']);
      points.push([0.0, 0, 9.5, 'ash']);
      points.push([-3.0, 0, -9.0, 'palm']);
      points.push([11.0, 0, 1.0, 'celtis']);

      // 2. Árboles perimetrales alrededor del edificio
      for (let ang = 0; ang < Math.PI * 2; ang += 0.16) {
        const r1 = 37.0 + Math.sin(ang * 4) * 3.0;
        const x1 = r1 * Math.sin(ang);
        const z1 = r1 * Math.cos(ang);
        const sp = ang > Math.PI ? 'euc' : 'pine';
        points.push([x1, 0, z1, sp]);
      }

      // 3. Bosque nativo real detectado sobre la ladera de Albán
      if (this.terrainTreePoints && this.terrainTreePoints.length > 0) {
        this.terrainTreePoints.forEach(pt => points.push(pt));
      }

      this.trees.plant(points, treeGroup, {
        mix: ['ash', 'celtis', 'euc', 'pine', 'palm']
      });

      this.scene.add(treeGroup);
    } catch (e) {
      console.warn('RealTrees error', e);
    }
  }

  _initInteractions() {
    const el = this.renderer.domElement;

    el.addEventListener('click', (e) => {
      if (this.currentMode === 'caminar') return;

      const rect = el.getBoundingClientRect();
      this.mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      this.mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      this.raycaster.setFromCamera(this.mouse, this.camera);

      // 1. Clic en puertas 3D
      const doorHits = this.raycaster.intersectObjects(this.doors.interactiveMeshes, false);
      if (doorHits.length > 0) {
        const doorObj = doorHits[0].object.userData.doorObj;
        if (doorObj) {
          this.doors.toggleDoor(doorObj);
          return;
        }
      }

      // 2. Clic en habitaciones
      const roomHits = this.raycaster.intersectObjects(this.roomMeshes, false);
      if (roomHits.length > 0) {
        const cfg = roomHits[0].object.userData.roomConfig;
        if (cfg) {
          const roomObj = this.roomsData.find(r => r.id === cfg.id);
          this.selectRoom(roomObj);
        }
      }
    });

    el.addEventListener('mousemove', (e) => {
      if (this.currentMode === 'caminar') return;

      const rect = el.getBoundingClientRect();
      this.mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      this.mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      this.raycaster.setFromCamera(this.mouse, this.camera);
      const doorHits = this.raycaster.intersectObjects(this.doors.interactiveMeshes, false);
      const roomHits = this.raycaster.intersectObjects(this.roomMeshes, false);

      el.style.cursor = (doorHits.length > 0 || roomHits.length > 0) ? 'pointer' : 'default';
    });
  }

  setMode(mode) {
    if (this.currentMode === mode) return;
    this.currentMode = mode;

    if (mode === 'caminar') {
      this.orbitControls.enabled = false;
      this.walkControls.enabled = true;
      if (this.postFX) this.postFX.setInterior(true);

      if (this.selectedRoom) {
        this.walkControls.teleport(
          this.selectedRoom.centerX,
          this.selectedRoom.centerZ,
          new THREE.Vector3(0, 1.5, 0)
        );
      } else {
        this.walkControls.teleport(0, 20.8, new THREE.Vector3(0, 1.5, 0));
      }
    } else {
      this.walkControls.enabled = false;
      this.orbitControls.enabled = true;
      if (this.postFX) this.postFX.setInterior(false);

      if (mode === 'axonometria') {
        this.axonometry.setExploded(true);
      } else if (mode === 'planta') {
        this.axonometry.setExploded(false, false);
        if (window.gsap) {
          window.gsap.to(this.camera.position, {
            x: 0.1,
            y: 62,
            z: 0.1,
            duration: 1.5,
            ease: 'power2.inOut'
          });
          window.gsap.to(this.orbitControls.target, {
            x: 0,
            y: 0,
            z: 0,
            duration: 1.5,
            ease: 'power2.inOut'
          });
        }
      } else if (mode === 'exterior') {
        this.axonometry.setExploded(false);
        if (window.gsap) {
          window.gsap.to(this.camera.position, {
            x: 40,
            y: 26,
            z: 40,
            duration: 1.5,
            ease: 'power2.inOut'
          });
          window.gsap.to(this.orbitControls.target, {
            x: 0,
            y: 1.5,
            z: 0,
            duration: 1.5,
            ease: 'power2.inOut'
          });
        }
      }
    }

    if (this.onModeChanged) {
      this.onModeChanged(mode);
    }
  }

  selectRoom(roomObj) {
    this.selectedRoom = roomObj;

    if (this.onRoomSelected) {
      this.onRoomSelected(roomObj);
    }

    if (!roomObj) return;

    if (this.currentMode === 'caminar') {
      this.walkControls.teleport(roomObj.centerX, roomObj.centerZ, new THREE.Vector3(0, 1.5, 0));
      return;
    }

    if (window.gsap) {
      const camOffsetR = 6.5;
      const camX = roomObj.centerX + camOffsetR * Math.sin(roomObj.midAngRad);
      const camZ = roomObj.centerZ - camOffsetR * Math.cos(roomObj.midAngRad);

      window.gsap.to(this.camera.position, {
        x: camX,
        y: 5.2,
        z: camZ,
        duration: 1.4,
        ease: 'power2.inOut'
      });

      window.gsap.to(this.orbitControls.target, {
        x: roomObj.centerX,
        y: 1.6,
        z: roomObj.centerZ,
        duration: 1.4,
        ease: 'power2.inOut'
      });
    }
  }

  setAtmosphere(mood) {
    this.lighting.setMood(mood);
    if (this.skyEnv) {
      if (mood === 'dia') this.skyEnv.setHour(10.5);
      else if (mood === 'tarde') this.skyEnv.setHour(17.8);
      else if (mood === 'noche') this.skyEnv.setHour(21.0);
    }
  }

  _onResize() {
    const w = this.container.clientWidth;
    const h = this.container.clientHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
    if (this.postFX) this.postFX.setSize(w, h);
  }

  _animate() {
    requestAnimationFrame(() => this._animate());

    const delta = this.clock.getDelta();
    const elapsedTime = this.clock.getElapsedTime();

    // Actualizar shader de viento en árboles reales
    windUniforms.uWindTime.value = elapsedTime;

    // Actualizar rotación suave de puertas 3D
    this.doors.update(delta);

    // Actualizar animación de motos y vehículos
    if (this.vehicles) {
      this.vehicles.update(delta);
    }

    // Actualizar nubes volumétricas 3D en el cielo
    if (this.skyEnv) {
      this.skyEnv.update(delta);
    }

    // Controles de cámara
    if (this.currentMode === 'caminar') {
      this.walkControls.update(delta);
    } else {
      this.orbitControls.update();
    }

    // Render con post-procesamiento cinematográfico o fallback
    if (this.postFX) {
      this.postFX.render(delta);
    } else {
      this.renderer.render(this.scene, this.camera);
    }
  }
}
