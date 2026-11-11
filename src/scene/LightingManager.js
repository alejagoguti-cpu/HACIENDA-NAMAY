import * as THREE from 'three';

/**
 * LightingManager — Iluminación arquitectónica cinematográfica para Hacienda Namay:
 * - Sol de cordillera de alta intensidad con sombras de contacto nítidas (4096x4096)
 * - Luz hemisférica cálida con rebote de pasto y cielo azul
 * - Iluminación interior cálida de boutique hotel (3000K) en habitaciones, vigas y piscina
 * - Atmósferas: Día radiante, Atardecer dorado de cordillera y Noche estrellada
 */
export class LightingManager {
  constructor(scene) {
    this.scene = scene;
    this.currentMood = 'dia';
    this.lightsOn = false;

    this.interiorLights = [];
    this.fixtureMeshes = [];

    this._setupSunAndSky();
    this.setMood('dia');
  }

  _setupSunAndSky() {
    // 1. Luz hemisférica natural (cielo azul brillante y rebote cálido de pasto/tierra)
    this.hemiLight = new THREE.HemisphereLight(0xe8f4ff, 0x485a36, 1.45);
    this.hemiLight.position.set(0, 50, 0);
    this.scene.add(this.hemiLight);

    // 2. Luz ambiental suave difusa (evita negros empastados en interiores)
    this.ambientLight = new THREE.AmbientLight(0xffeedd, 0.6);
    this.scene.add(this.ambientLight);

    // 3. Sol direccional principal con sombras de ultra alta resolución
    this.sunLight = new THREE.DirectionalLight(0xfffaee, 3.6);
    this.sunLight.position.set(45, 65, 35);
    this.sunLight.castShadow = true;
    this.sunLight.shadow.mapSize.width = 4096;
    this.sunLight.shadow.mapSize.height = 4096;
    this.sunLight.shadow.camera.near = 10;
    this.sunLight.shadow.camera.far = 220;
    const d = 52;
    this.sunLight.shadow.camera.left = -d;
    this.sunLight.shadow.camera.right = d;
    this.sunLight.shadow.camera.top = d;
    this.sunLight.shadow.camera.bottom = -d;
    this.sunLight.shadow.bias = -0.0003;
    this.sunLight.shadow.normalBias = 0.035;
    this.scene.add(this.sunLight);

    // 4. Luz de relleno lateral (rebote cálido de sol poniente)
    this.fillLight = new THREE.DirectionalLight(0xffdcb5, 0.85);
    this.fillLight.position.set(-35, 30, -30);
    this.scene.add(this.fillLight);
  }

  registerInteriorLight(light, fixtureMesh = null) {
    this.interiorLights.push(light);
    light.visible = this.lightsOn;
    if (fixtureMesh) {
      this.fixtureMeshes.push(fixtureMesh);
      if (fixtureMesh.material) {
        fixtureMesh.material.emissiveIntensity = this.lightsOn ? 2.2 : 0.08;
      }
    }
  }

  toggleLights(forceState = null) {
    this.lightsOn = forceState !== null ? forceState : !this.lightsOn;
    this.interiorLights.forEach(l => {
      l.visible = this.lightsOn;
    });
    this.fixtureMeshes.forEach(m => {
      if (m.material) {
        m.material.emissiveIntensity = this.lightsOn ? 2.5 : 0.08;
      }
    });
    return this.lightsOn;
  }

  setMood(mood) {
    this.currentMood = mood;
    if (mood === 'dia') {
      this.hemiLight.color.setHex(0xe8f4ff);
      this.hemiLight.groundColor.setHex(0x485a36);
      this.hemiLight.intensity = 1.45;

      this.ambientLight.color.setHex(0xffeedd);
      this.ambientLight.intensity = 0.6;

      this.sunLight.color.setHex(0xfffaee);
      this.sunLight.intensity = 3.6;
      this.sunLight.position.set(45, 65, 35);

      this.fillLight.color.setHex(0xdbe9f7);
      this.fillLight.intensity = 0.85;
      this.fillLight.position.set(-35, 30, -30);

      if (this.scene.fog) {
        this.scene.fog.color.setHex(0xc9e1f5);
        this.scene.fog.near = 90;
        this.scene.fog.far = 400;
      }
    } else if (mood === 'tarde') {
      // Golden Hour sobre las montañas de Albán
      this.hemiLight.color.setHex(0xffb87a);
      this.hemiLight.groundColor.setHex(0x3a2818);
      this.hemiLight.intensity = 1.2;

      this.ambientLight.color.setHex(0xff9955);
      this.ambientLight.intensity = 0.55;

      this.sunLight.color.setHex(0xff8833);
      this.sunLight.intensity = 3.4;
      this.sunLight.position.set(-60, 22, -38);

      this.fillLight.color.setHex(0x738cb3);
      this.fillLight.intensity = 0.65;

      // Al atardecer encendemos luces interiores suavemente
      this.toggleLights(true);

      if (this.scene.fog) {
        this.scene.fog.color.setHex(0xdb7d4d);
        this.scene.fog.near = 60;
        this.scene.fog.far = 320;
      }
    } else if (mood === 'noche') {
      // Noche estrellada de cordillera
      this.hemiLight.color.setHex(0x28456c);
      this.hemiLight.groundColor.setHex(0x0e1810);
      this.hemiLight.intensity = 0.5;

      this.ambientLight.color.setHex(0x192845);
      this.ambientLight.intensity = 0.38;

      this.sunLight.color.setHex(0x8cb6e8);
      this.sunLight.intensity = 0.65; // Luz de luna tenue
      this.sunLight.position.set(-25, 50, 30);

      this.fillLight.color.setHex(0x12243d);
      this.fillLight.intensity = 0.3;

      // En la noche las luces arquitectónicas brillan con intensidad completa
      this.toggleLights(true);

      if (this.scene.fog) {
        this.scene.fog.color.setHex(0x0a101d);
        this.scene.fog.near = 45;
        this.scene.fog.far = 260;
      }
    }
  }
}
