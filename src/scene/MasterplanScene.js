import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { LightingManager } from './LightingManager.js';
import { DoorsManager } from './DoorsManager.js';
import { RealTrees } from './RealTrees.js';
import { windUniforms } from './Wind.js';
import { HaciendaBuildingBuilder } from './HaciendaBuildingBuilder.js';
import { WalkControls } from './WalkControls.js';
import { ExplodedAxonometry } from './ExplodedAxonometry.js';

/**
 * MasterplanScene — Orquestador general del motor 3D de Hacienda Namay:
 * - Three.js WebGL Renderer (PBR, sombras, ACESFilmicToneMapping)
 * - Controles Orbit (panear, rotar, zoom)
 * - Controles Walk (caminar con flechas a nivel de ojos)
 * - Axonometría explotada dinámica (GSAP)
 * - Árboles tipo Unreal con viento en tiempo real
 * - Interacción con puertas y selección de habitaciones
 */
export class MasterplanScene {
  constructor(container, onRoomSelected = null, onModeChanged = null) {
    this.container = container;
    this.onRoomSelected = onRoomSelected;
    this.onModeChanged = onModeChanged;

    this.currentMode = 'exterior'; // 'exterior' | 'axonometria' | 'planta' | 'caminar'
    this.selectedRoom = null;

    this.clock = new THREE.Clock();
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();

    this._initScene();
    this._initRenderer();
    this._initCameraAndControls();
    this._initSystems();
    this._plantUnrealTrees();
    this._initInteractions();
    this._onResize();

    window.addEventListener('resize', () => this._onResize());
    this._animate();
  }

  _initScene() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0xc9e1f5);
    this.scene.fog = new THREE.Fog(0xc9e1f5, 55, 220);
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
    this.renderer.toneMappingExposure = 1.05;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    this.container.appendChild(this.renderer.domElement);
  }

  _initCameraAndControls() {
    this.camera = new THREE.PerspectiveCamera(
      45,
      this.container.clientWidth / this.container.clientHeight,
      0.2,
      500
    );
    this.camera.position.set(38, 24, 38);

    // Controles de órbita y paneo
    this.orbitControls = new OrbitControls(this.camera, this.renderer.domElement);
    this.orbitControls.enableDamping = true;
    this.orbitControls.dampingFactor = 0.05;
    this.orbitControls.target.set(0, 1.5, 0);
    this.orbitControls.maxPolarAngle = Math.PI / 2.05; // No pasar bajo el suelo
    this.orbitControls.minDistance = 2.0;
    this.orbitControls.maxDistance = 160.0;
    this.orbitControls.screenSpacePanning = true; // Panear con clic derecho o 2 dedos

    // Controles de caminata con flechas
    this.walkControls = new WalkControls(this.camera, this.renderer.domElement);
  }

  _initSystems() {
    // Iluminación día/tarde/noche
    this.lighting = new LightingManager(this.scene);

    // Gestor de puertas 3D
    this.doors = new DoorsManager(this.scene);

    // Constructor de la hacienda y habitaciones
    this.builder = new HaciendaBuildingBuilder(this.scene, this.doors, this.lighting);
    const buildResult = this.builder.build();
    this.roomsData = buildResult.rooms;
    this.roomMeshes = buildResult.roomMeshes;
    this.roofGroup = buildResult.roofGroup;

    // Despiece axonométrico explotado
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

  /**
   * Siembra árboles tipo Unreal con follaje PBR y viento alrededor de la hacienda
   */
  _plantUnrealTrees() {
    try {
      this.trees = new RealTrees();
      const treeGroup = new THREE.Group();
      treeGroup.name = 'UnrealTrees';

      const points = [];

      // 1. Árboles ornamentales en el patio interior (palmas y frutales)
      points.push([4.5, 0, 4.5, 'palm']);
      points.push([-5.2, 0, 5.0, 'palm']);
      points.push([-7.0, 0, -4.0, 'celtis']);
      points.push([6.0, 0, -5.5, 'celtis']);
      points.push([0.0, 0, 9.5, 'ash']);

      // 2. Bosque perimetral exterior (pino, eucalipto, fresno)
      for (let ang = 0; ang < Math.PI * 2; ang += 0.22) {
        const r1 = 39.0 + Math.sin(ang * 4) * 4.0;
        const r2 = 48.0 + Math.cos(ang * 3) * 5.0;
        const x1 = r1 * Math.sin(ang), z1 = r1 * Math.cos(ang);
        const x2 = r2 * Math.sin(ang + 0.1), z2 = r2 * Math.cos(ang + 0.1);

        const sp1 = ang > Math.PI ? 'euc' : 'pine';
        const sp2 = (Math.floor(ang * 10) % 2 === 0) ? 'ash' : 'celtis';

        points.push([x1, 0, z1, sp1]);
        points.push([x2, 0, z2, sp2]);
      }

      this.trees.plant(points, treeGroup, {
        mix: ['ash', 'celtis', 'euc', 'pine', 'palm']
      });

      this.scene.add(treeGroup);
    } catch (e) {
      console.warn('RealTrees fallback', e);
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

      // 1. Chequear clic en puertas
      const doorHits = this.raycaster.intersectObjects(this.doors.interactiveMeshes, false);
      if (doorHits.length > 0) {
        const doorObj = doorHits[0].object.userData.doorObj;
        if (doorObj) {
          this.doors.toggleDoor(doorObj);
          return;
        }
      }

      // 2. Chequear clic en habitaciones
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

  /**
   * Cambia el modo de visualización principal
   */
  setMode(mode) {
    if (this.currentMode === mode) return;
    this.currentMode = mode;

    if (mode === 'caminar') {
      this.orbitControls.enabled = false;
      this.walkControls.enabled = true;

      // Si hay una habitación seleccionada, situar al visitante allí
      if (this.selectedRoom) {
        this.walkControls.teleport(
          this.selectedRoom.centerX,
          this.selectedRoom.centerZ,
          new THREE.Vector3(0, 1.5, 0)
        );
      } else {
        // Galería central frente al patio
        this.walkControls.teleport(0, 20.8, new THREE.Vector3(0, 1.5, 0));
      }
    } else {
      this.walkControls.enabled = false;
      this.orbitControls.enabled = true;

      if (mode === 'axonometria') {
        this.axonometry.setExploded(true);
      } else if (mode === 'planta') {
        this.axonometry.setExploded(false, false);
        if (window.gsap) {
          window.gsap.to(this.camera.position, {
            x: 0.1,
            y: 58,
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
            x: 36,
            y: 22,
            z: 36,
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

  /**
   * Selecciona una habitación y vuela la cámara hacia ella
   */
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

    // Vuelo suave de cámara hacia la habitación
    if (window.gsap) {
      const camOffsetR = 6.5;
      const camX = roomObj.centerX + camOffsetR * Math.sin(roomObj.midAngRad);
      const camZ = roomObj.centerZ - camOffsetR * Math.cos(roomObj.midAngRad);

      window.gsap.to(this.camera.position, {
        x: camX,
        y: 5.5,
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

  _onResize() {
    const w = this.container.clientWidth;
    const h = this.container.clientHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  }

  _animate() {
    requestAnimationFrame(() => this._animate());

    const delta = this.clock.getDelta();
    const elapsedTime = this.clock.getElapsedTime();

    // Actualizar shader de viento de los árboles tipo Unreal
    windUniforms.uWindTime.value = elapsedTime;

    // Actualizar rotación suave de puertas
    this.doors.update(delta);

    // Controles según modo
    if (this.currentMode === 'caminar') {
      this.walkControls.update(delta);
    } else {
      this.orbitControls.update();
    }

    this.renderer.render(this.scene, this.camera);
  }
}
