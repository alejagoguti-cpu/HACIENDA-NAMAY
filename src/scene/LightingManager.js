import * as THREE from 'three';

/**
 * LightingManager — Iluminación dinámica para Hacienda Namay:
 * - Ciclo día / atardecer / noche
 * - Sombras suaves optimizadas (DirectionalLight)
 * - Luz hemisférica natural de montaña
 * - Luces artificiales arquitectónicas (downlights en habitaciones, lámparas de noche,
 *   apliques en vigas, faroles en galería del patio y focos de piscina).
 */
export class LightingManager {
  constructor(scene) {
    this.scene = scene;
    this.currentMood = 'dia';     // 'dia' | 'tarde' | 'noche'
    this.lightsOn = false;        // true | false para luces interiores

    this.interiorLights = [];     // PointLights / SpotLights de habitaciones
    this.fixtureMeshes = [];      // Mallas emisivas (bombillos / pantallas)

    this._setupSunAndSky();
    this.setMood('dia');
  }

  _setupSunAndSky() {
    // Luz ambiental base
    this.hemiLight = new THREE.HemisphereLight(0xfff5ea, 0x5a6344, 1.1);
    this.hemiLight.position.set(0, 50, 0);
    this.scene.add(this.hemiLight);

    // Luz ambiental suave para no tener sombras negras
    this.ambientLight = new THREE.AmbientLight(0xffeedd, 0.45);
    this.scene.add(this.ambientLight);

    // Sol direccional principal con sombras
    this.sunLight = new THREE.DirectionalLight(0xfffaed, 2.2);
    this.sunLight.position.set(40, 55, 30);
    this.sunLight.castShadow = true;
    this.sunLight.shadow.mapSize.width = 2048;
    this.sunLight.shadow.mapSize.height = 2048;
    this.sunLight.shadow.camera.near = 5;
    this.sunLight.shadow.camera.far = 160;
    const d = 48;
    this.sunLight.shadow.camera.left = -d;
    this.sunLight.shadow.camera.right = d;
    this.sunLight.shadow.camera.top = d;
    this.sunLight.shadow.camera.bottom = -d;
    this.sunLight.shadow.bias = -0.0006;
    this.sunLight.shadow.normalBias = 0.03;
    this.scene.add(this.sunLight);

    // Luz de relleno lateral (rebote cálido)
    this.fillLight = new THREE.DirectionalLight(0xffd4aa, 0.6);
    this.fillLight.position.set(-30, 25, -30);
    this.scene.add(this.fillLight);
  }

  /**
   * Registra una luz artificial interior/exterior del proyecto
   */
  registerInteriorLight(light, fixtureMesh = null) {
    this.interiorLights.push(light);
    light.visible = this.lightsOn;
    if (fixtureMesh) {
      this.fixtureMeshes.push(fixtureMesh);
      if (fixtureMesh.material) {
        fixtureMesh.material.emissiveIntensity = this.lightsOn ? 1.5 : 0.05;
      }
    }
  }

  /**
   * Enciende o apaga todas las luces arquitectónicas (o invierte su estado)
   */
  toggleLights(forceState = null) {
    this.lightsOn = forceState !== null ? forceState : !this.lightsOn;
    this.interiorLights.forEach(l => {
      l.visible = this.lightsOn;
    });
    this.fixtureMeshes.forEach(m => {
      if (m.material) {
        m.material.emissiveIntensity = this.lightsOn ? 1.8 : 0.05;
      }
    });
    return this.lightsOn;
  }

  /**
   * Cambia la atmósfera ambiental entre día, tarde y noche
   */
  setMood(mood) {
    this.currentMood = mood;
    if (mood === 'dia') {
      this.hemiLight.color.setHex(0xfffaed);
      this.hemiLight.groundColor.setHex(0x526644);
      this.hemiLight.intensity = 1.2;

      this.ambientLight.color.setHex(0xffeedd);
      this.ambientLight.intensity = 0.5;

      this.sunLight.color.setHex(0xfffaee);
      this.sunLight.intensity = 2.4;
      this.sunLight.position.set(40, 58, 32);

      this.fillLight.color.setHex(0xd6e5f5);
      this.fillLight.intensity = 0.6;
      this.fillLight.position.set(-35, 25, -25);

      if (this.scene.background && this.scene.background.isColor) {
        this.scene.background.setHex(0xc9e1f5);
      }
      if (this.scene.fog) {
        this.scene.fog.color.setHex(0xc9e1f5);
        this.scene.fog.near = 55;
        this.scene.fog.far = 240;
      }
    } else if (mood === 'tarde') {
      // Golden hour sobre Albán
      this.hemiLight.color.setHex(0xffb070);
      this.hemiLight.groundColor.setHex(0x382c1e);
      this.hemiLight.intensity = 0.95;

      this.ambientLight.color.setHex(0xff8d4f);
      this.ambientLight.intensity = 0.45;

      this.sunLight.color.setHex(0xff8833);
      this.sunLight.intensity = 2.2;
      this.sunLight.position.set(-55, 18, -35);

      this.fillLight.color.setHex(0x738cb3);
      this.fillLight.intensity = 0.5;

      if (this.scene.background && this.scene.background.isColor) {
        this.scene.background.setHex(0xe88a56);
      }
      if (this.scene.fog) {
        this.scene.fog.color.setHex(0xdb7d4d);
        this.scene.fog.near = 40;
        this.scene.fog.far = 190;
      }
    } else if (mood === 'noche') {
      // Noche acogedora
      this.hemiLight.color.setHex(0x203554);
      this.hemiLight.groundColor.setHex(0x0e1810);
      this.hemiLight.intensity = 0.35;

      this.ambientLight.color.setHex(0x19253d);
      this.ambientLight.intensity = 0.3;

      this.sunLight.color.setHex(0x779ecb);
      this.sunLight.intensity = 0.4; // Luz de luna suave
      this.sunLight.position.set(-20, 45, 30);

      this.fillLight.color.setHex(0x112233);
      this.fillLight.intensity = 0.2;

      // Encender automáticamente luces interiores en modo noche
      this.toggleLights(true);

      if (this.scene.background && this.scene.background.isColor) {
        this.scene.background.setHex(0x0c1322);
      }
      if (this.scene.fog) {
        this.scene.fog.color.setHex(0x0c1322);
        this.scene.fog.near = 30;
        this.scene.fog.far = 160;
      }
    }
  }
}
