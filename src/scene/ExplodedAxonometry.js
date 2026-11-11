import * as THREE from 'three';

/**
 * ExplodedAxonometry — Gestión de la axonometría explotada (despiece 3D) de Hacienda Namay:
 * - Eleva suavemente la cubierta y cerchas de madera a +16m mediante interpolación GSAP.
 * - Ajusta la cámara a un ángulo axonométrico ortogonal / isométrico para apreciar toda la distribución.
 * - Muestra u oculta etiquetas de los recintos.
 */
export class ExplodedAxonometry {
  constructor(roofGroup, camera, controls, onStateChange = null) {
    this.roofGroup = roofGroup;
    this.camera = camera;
    this.controls = controls;
    this.onStateChange = onStateChange;

    this.isExploded = false;
    this.liftHeight = 16.0; // metros que se eleva la cubierta

    // Guardar posición previa de cámara
    this.savedCamPos = new THREE.Vector3();
    this.savedTarget = new THREE.Vector3();
  }

  toggle() {
    this.setExploded(!this.isExploded);
    return this.isExploded;
  }

  setExploded(state, animateCamera = true) {
    if (this.isExploded === state) return;
    this.isExploded = state;

    const targetY = this.isExploded ? this.liftHeight : 0;

    // Animación suave de elevación con GSAP
    if (window.gsap) {
      window.gsap.to(this.roofGroup.position, {
        y: targetY,
        duration: 1.4,
        ease: 'power2.inOut'
      });

      if (animateCamera && this.controls) {
        if (this.isExploded) {
          // Guardar estado previo
          this.savedCamPos.copy(this.camera.position);
          this.savedTarget.copy(this.controls.target);

          // Posición axonométrica perfecta
          window.gsap.to(this.camera.position, {
            x: 42,
            y: 38,
            z: 42,
            duration: 1.6,
            ease: 'power2.inOut'
          });
          window.gsap.to(this.controls.target, {
            x: 0,
            y: 2,
            z: 0,
            duration: 1.6,
            ease: 'power2.inOut'
          });
        } else {
          // Restaurar cámara previa
          window.gsap.to(this.camera.position, {
            x: this.savedCamPos.x || 35,
            y: this.savedCamPos.y || 22,
            z: this.savedCamPos.z || 35,
            duration: 1.4,
            ease: 'power2.inOut'
          });
          window.gsap.to(this.controls.target, {
            x: this.savedTarget.x || 0,
            y: this.savedTarget.y || 1,
            z: this.savedTarget.z || 0,
            duration: 1.4,
            ease: 'power2.inOut'
          });
        }
      }
    } else {
      this.roofGroup.position.y = targetY;
    }

    if (this.onStateChange) {
      this.onStateChange(this.isExploded);
    }
  }
}
