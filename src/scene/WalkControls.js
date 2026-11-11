import * as THREE from 'three';

/**
 * WalkControls — Recorrido peatonal en primera persona para Hacienda Namay:
 * - Control con FLECHAS del teclado o W, A, S, D
 * - Rotación de cabeza con arrastre del ratón o teclas Q y E
 * - Altura de ojos realista (1.60 m)
 * - Carrera suave con tecla Shift
 * - Head bobbing sutil al caminar
 * - Detección de colisión / límites perimetrales para no salir del recinto
 */
export class WalkControls {
  constructor(camera, domElement, onPositionChange = null) {
    this.camera = camera;
    this.domElement = domElement;
    this.onPositionChange = onPositionChange;

    this.enabled = false;
    this.eyeHeight = 1.65;
    this.walkSpeed = 4.2;      // m/s
    this.runMultiplier = 1.8;
    this.turnSpeed = 1.6;      // rad/s con teclado

    // Estado de teclas
    this.keys = {
      forward: false,
      backward: false,
      left: false,
      right: false,
      turnLeft: false,
      turnRight: false,
      sprint: false
    };

    // Ángulos de cámara
    this.yaw = 0;   // rotación horizontal (Y)
    this.pitch = 0; // inclinación vertical (X)

    // Posición del jugador
    this.position = new THREE.Vector3(0, this.eyeHeight, 0);

    // Head bobbing
    this.bobTimer = 0;
    this.bobAmp = 0.035;
    this.bobFreq = 10;

    // Arrastre con ratón
    this.isDragging = false;
    this.prevMouseX = 0;
    this.prevMouseY = 0;

    this._initEvents();
  }

  _initEvents() {
    window.addEventListener('keydown', (e) => this._onKeyDown(e));
    window.addEventListener('keyup', (e) => this._onKeyUp(e));

    this.domElement.addEventListener('mousedown', (e) => this._onMouseDown(e));
    window.addEventListener('mousemove', (e) => this._onMouseMove(e));
    window.addEventListener('mouseup', () => this._onMouseUp());

    // Soporte táctil en móviles
    this.domElement.addEventListener('touchstart', (e) => this._onTouchStart(e), { passive: false });
    window.addEventListener('touchmove', (e) => this._onTouchMove(e), { passive: false });
    window.addEventListener('touchend', () => this._onMouseUp());
  }

  _onKeyDown(e) {
    if (!this.enabled) return;

    switch (e.code) {
      case 'ArrowUp':
      case 'KeyW':
        this.keys.forward = true;
        break;
      case 'ArrowDown':
      case 'KeyS':
        this.keys.backward = true;
        break;
      case 'ArrowLeft':
      case 'KeyA':
        this.keys.left = true;
        break;
      case 'ArrowRight':
      case 'KeyD':
        this.keys.right = true;
        break;
      case 'KeyQ':
        this.keys.turnLeft = true;
        break;
      case 'KeyE':
        this.keys.turnRight = true;
        break;
      case 'ShiftLeft':
      case 'ShiftRight':
        this.keys.sprint = true;
        break;
    }
  }

  _onKeyUp(e) {
    if (!this.enabled) return;

    switch (e.code) {
      case 'ArrowUp':
      case 'KeyW':
        this.keys.forward = false;
        break;
      case 'ArrowDown':
      case 'KeyS':
        this.keys.backward = false;
        break;
      case 'ArrowLeft':
      case 'KeyA':
        this.keys.left = false;
        break;
      case 'ArrowRight':
      case 'KeyD':
        this.keys.right = false;
        break;
      case 'KeyQ':
        this.keys.turnLeft = false;
        break;
      case 'KeyE':
        this.keys.turnRight = false;
        break;
      case 'ShiftLeft':
      case 'ShiftRight':
        this.keys.sprint = false;
        break;
    }
  }

  _onMouseDown(e) {
    if (!this.enabled) return;
    this.isDragging = true;
    this.prevMouseX = e.clientX;
    this.prevMouseY = e.clientY;
  }

  _onMouseMove(e) {
    if (!this.enabled || !this.isDragging) return;
    const dx = e.clientX - this.prevMouseX;
    const dy = e.clientY - this.prevMouseY;
    this.prevMouseX = e.clientX;
    this.prevMouseY = e.clientY;

    const sens = 0.0028;
    this.yaw -= dx * sens;
    this.pitch -= dy * sens;

    // Límite vertical para no romper el cuello
    const maxPitch = Math.PI / 2.3;
    this.pitch = Math.max(-maxPitch, Math.min(maxPitch, this.pitch));
  }

  _onMouseUp() {
    this.isDragging = false;
  }

  _onTouchStart(e) {
    if (!this.enabled || e.touches.length === 0) return;
    this.isDragging = true;
    this.prevMouseX = e.touches[0].clientX;
    this.prevMouseY = e.touches[0].clientY;
  }

  _onTouchMove(e) {
    if (!this.enabled || !this.isDragging || e.touches.length === 0) return;
    const dx = e.touches[0].clientX - this.prevMouseX;
    const dy = e.touches[0].clientY - this.prevMouseY;
    this.prevMouseX = e.touches[0].clientX;
    this.prevMouseY = e.touches[0].clientY;

    const sens = 0.004;
    this.yaw -= dx * sens;
    this.pitch -= dy * sens;
    const maxPitch = Math.PI / 2.3;
    this.pitch = Math.max(-maxPitch, Math.min(maxPitch, this.pitch));
  }

  /**
   * Posiciona el jugador en un punto con dirección de mirada
   */
  teleport(x, z, lookAtPoint = null) {
    this.position.set(x, this.eyeHeight, z);
    if (lookAtPoint) {
      const dx = lookAtPoint.x - x;
      const dz = lookAtPoint.z - z;
      this.yaw = Math.atan2(-dx, -dz);
      this.pitch = 0;
    }
    this._applyCameraTransform();
  }

  _applyCameraTransform() {
    this.camera.position.copy(this.position);
    this.camera.rotation.order = 'YXZ';
    this.camera.rotation.y = this.yaw;
    this.camera.rotation.x = this.pitch;
    this.camera.rotation.z = 0;
  }

  /**
   * Actualización por cada frame en el render loop
   */
  update(delta = 0.016) {
    if (!this.enabled) return;

    // Giro con teclado (Q y E)
    if (this.keys.turnLeft) this.yaw += this.turnSpeed * delta;
    if (this.keys.turnRight) this.yaw -= this.turnSpeed * delta;

    // Vector de movimiento local
    let moveX = 0;
    let moveZ = 0;

    if (this.keys.forward) moveZ -= 1;
    if (this.keys.backward) moveZ += 1;
    if (this.keys.left) moveX -= 1;
    if (this.keys.right) moveX += 1;

    const isMoving = moveX !== 0 || moveZ !== 0;

    if (isMoving) {
      const len = Math.hypot(moveX, moveZ);
      moveX /= len;
      moveZ /= len;

      let speed = this.walkSpeed;
      if (this.keys.sprint) speed *= this.runMultiplier;

      // Convertir a coordenadas de mundo según yaw
      const sin = Math.sin(this.yaw);
      const cos = Math.cos(this.yaw);

      const worldDX = (moveX * cos + moveZ * sin) * speed * delta;
      const worldDZ = (-moveX * sin + moveZ * cos) * speed * delta;

      const nextX = this.position.x + worldDX;
      const nextZ = this.position.z + worldDZ;

      // Límites circulares de la hacienda para no caer al abismo
      const distFromCenter = Math.hypot(nextX, nextZ);
      if (distFromCenter >= 2.0 && distFromCenter <= 48.0) {
        this.position.x = nextX;
        this.position.z = nextZ;
      }

      // Head bobbing suave
      this.bobTimer += delta * (this.keys.sprint ? this.bobFreq * 1.4 : this.bobFreq);
      this.position.y = this.eyeHeight + Math.sin(this.bobTimer) * this.bobAmp;
    } else {
      this.position.y = THREE.MathUtils.damp(this.position.y, this.eyeHeight, 10, delta);
    }

    this._applyCameraTransform();

    if (this.onPositionChange) {
      this.onPositionChange(this.position.x, this.position.z, this.yaw);
    }
  }
}
