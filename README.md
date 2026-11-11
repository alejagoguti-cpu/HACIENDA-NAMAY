# Hacienda Namay · Masterplan 3D, Axonometría Explotada & Recorrido Peatonal

[![GitHub Pages](https://img.shields.io/badge/Deploy-GitHub%20Pages-success?style=flat-square&logo=github)](https://alejagoguti-cpu.github.io/HACIENDA-NAMAY/)
[![Three.js](https://img.shields.io/badge/Three.js-WebGL%20PBR-black?style=flat-square&logo=three.js)](https://threejs.org/)
[![License](https://img.shields.io/badge/License-MIT-blue.svg?style=flat-square)](LICENSE)

Gemelo digital interactivo y Masterplan 3D de **Hacienda Namay** (Albán, Cundinamarca). El proyecto dispone las habitaciones en un arco semicircular que abraza el patio central, conectando con la zona social, los servicios y la piscina sinfín abierta al paisaje de montaña.

---

## 🚀 Acceso en Vivo

* 🌐 **Masterplan 3D Interactivo:** [https://alejagoguti-cpu.github.io/HACIENDA-NAMAY/](https://alejagoguti-cpu.github.io/HACIENDA-NAMAY/)
* 📖 **Brochure y Memoria Editorial:** [https://alejagoguti-cpu.github.io/HACIENDA-NAMAY/brochure.html](https://alejagoguti-cpu.github.io/HACIENDA-NAMAY/brochure.html)

---

## ✨ Características Principales

### 1. 🌲 Árboles Tipo Unreal Engine (Wind Shader)
* Generación procedural de árboles con ramas y copas volumétricas de alta densidad mediante tarjetas de follaje calibradas (`leaves.webp` y cortezas reales de eucalipto, pino, fresno y palma).
* Shader de viento en tiempo real (`Wind.js`) que oscila suavemente las ramas y las hojas con brisa de montaña en el vertex shader sin sobrecargar la CPU.

### 2. 🚶 Recorrido Peatonal con Flechas del Teclado (Walk Mode)
* Modo en primera persona a escala humana real (altura de ojos: 1.65 m).
* Controles completos con las **teclas de flechas** (`▲`, `▼`, `◄`, `►`) o `W`, `A`, `S`, `D`.
* Rotación de mirada fluida arrastrando con el ratón o con las teclas `Q` y `E`.
* Carrera suave con `Shift` y bamboleo de cabeza (head-bobbing) natural.
* Límites perimetrales y colisión para recorrer pasillos, galerías y habitaciones sin traspasar muros.

### 3. 💥 Axonometría Explotada (Despiece 3D)
* Transición cinemática con GSAP que eleva la cubierta de tejas coloniales y las cerchas de madera a +16 metros sobre el edificio.
* Revela con precisión el interior de cada una de las 7 habitaciones, baños, camas king, salas, cocina y áreas sociales.
* Reencuadre automático de cámara en perspectiva axonométrica ortogonal.

### 4. 🚪 Apertura y Cierre de Puertas 3D
* Puertas batientes de madera con marcos y manijas doradas de latón.
* Clic sobre cualquier puerta en el modelo 3D para abrirla o cerrarla suavemente a 90° con pivote real sobre las bisagras.
* Botón maestro en la barra superior para abrir o cerrar todas las puertas del complejo simultáneamente.

### 5. 💡 Control de Iluminación PBR (Día / Tarde / Noche)
* Ciclo atmosférico:
  * ☀️ **Día:** Sol radiante de cordillera con sombras suaves de alta resolución.
  * 🌅 **Atardecer:** Golden hour con tonalidades doradas, terracota y sombras rasantes.
  * 🌙 **Noche:** Iluminación nocturna con luz de luna tenue.
* Interruptor maestro de luces artificiales: activa downlights empotrados de 3000K, lámparas de noche en cabeceros, iluminación de chimenea, faroles de galería y focos subacuáticos en la piscina.

### 6. 🎨 Materiales 100% PBR y Mapeo UV Métrico
* Todos los materiales implementan el estándar PBR (Physically Based Rendering):
  * **Albedo / Base Color** en espacio de color sRGB.
  * **Normal Maps** para relieve en juntas de madera, piedra y tejas.
  * **Roughness Maps** para calibración de brillo y especularidad.
* Mapeo UV calibrado a escala real métrica para garantizar cero distorsión de texturas.

---

## 🛏️ Distribución Arquitectónica

| Recinto | Tipología | Área | Dotación Principal | Orientación |
| :--- | :--- | :--- | :--- | :--- |
| **Habitación 1** | Suite Albán | 32 m² | Cama King + Baño + Terraza | Sol naciente / Patio |
| **Habitación 2** | Suite El Roble | 30 m² | Cama King + Estar privado | Patio interior |
| **Habitación 3** | Suite La Neblina | 30 m² | Cama King + Baño mármol | Patio interior |
| **Habitación 4** | Suite Campestre | 30 m² | Cama King + Poltrona cuero | Patio interior |
| **Habitación 5** | Suite Los Cerezos | 30 m² | Cama King + Escritorio | Patio interior |
| **Habitación 6** | Suite Vista Cerros | 30 m² | Cama King + Baño completo | Patio y cerros |
| **Habitación 7** | Master Suite Namay | 36 m² | Cama King + Sala lounge | Panorámica oriental |
| **Zona Social** | Sala Lounge & BBQ | 110 m² | Gran chimenea, comedor 10p | Patio y terraza |
| **Servicios** | Cocina Gourmet | 65 m² | Isla de granito y alacenas | Acceso lateral |
| **Piscina & Deck** | Piscina Sinfín | 140 m² | Vaso infinito y solárium | Vista a la montaña |

---

## 📁 Estructura del Repositorio

```text
HACIENDA-NAMAY/
├── index.html                       # Aplicación Web 3D Three.js
├── brochure.html                    # Memoria editorial y catálogo original
├── README.md                        # Documentación completa y guía de uso
├── assets/
│   ├── branding/                    # Renders y láminas de presentación
│   ├── textures/                    # Texturas PBR reales (albedo, normal, roughness)
│   └── trees/                       # Texturas de follaje y cortezas para Unreal trees
└── src/
    ├── main.js                      # Bootstrap y orquestador de componentes
    ├── scene/
    │   ├── MasterplanScene.js       # Motor WebGL, cámara, órbita y render loop
    │   ├── MaterialLibrary.js       # Biblioteca de materiales PBR y mapeo UV
    │   ├── HaciendaBuildingBuilder.js # Arquitectura 3D en arco y mobiliario
    │   ├── RealTrees.js             # Generador de árboles volumétricos estilo Unreal
    │   ├── Wind.js                  # Shader de viento dinámico en vertex shader
    │   ├── WalkControls.js          # Control de caminata con flechas y colisiones
    │   ├── DoorsManager.js          # Sistema de apertura/cierre de puertas 3D
    │   ├── LightingManager.js       # Control de día/tarde/noche y luces interiores
    │   └── ExplodedAxonometry.js    # Despiece axonométrico con GSAP
    ├── ui/
    │   ├── SidebarRooms.js          # Selector interactivo de habitaciones
    │   ├── RoomDetailCard.js        # Ficha técnica y botón de caminata
    │   └── ControlsHUD.js           # Barra superior y HUD de navegación
    └── styles/
        └── namay3d.css              # Estilos glassmorphism y paleta de la hacienda
```

---

## 🛠️ Tecnologías Utilizadas

* **Three.js (r160):** Renderizado WebGL 3D acelerado por hardware con mapeo de tonos ACESFilmic.
* **GSAP (GreenSock):** Interpolaciones y animaciones cinemáticas suaves.
* **PBR Shaders:** Mapeo de normales, rugosidad y vertex displacement para vegetación.
* **HTML5 & CSS3:** Interfaz glassmorphic moderna adaptada para escritorio y dispositivos táctiles.
