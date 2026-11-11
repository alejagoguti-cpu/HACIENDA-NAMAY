import { MasterplanScene } from './scene/MasterplanScene.js';
import { SidebarRooms } from './ui/SidebarRooms.js';
import { RoomDetailCard } from './ui/RoomDetailCard.js';
import { ControlsHUD } from './ui/ControlsHUD.js';

class App {
  constructor() {
    this.canvasContainer = document.getElementById('canvas-container');
    this.sidebarContainer = document.getElementById('sidebar-container');
    this.detailContainer = document.getElementById('detail-card-container');
    this.hudContainer = document.getElementById('controls-hud-container');

    this.init();
  }

  init() {
    // 1. Inicializar la escena 3D principal
    this.scene = new MasterplanScene(
      this.canvasContainer,
      (room) => this.onRoomSelected(room),
      (mode) => this.onModeChanged(mode)
    );

    // 2. Inicializar la tarjeta de detalle flotante
    this.detailCard = new RoomDetailCard(
      this.detailContainer,
      (room) => {
        // Al dar clic en "Caminar aquí"
        this.scene.setMode('caminar');
        this.hud.setMode('caminar');
      },
      (room) => {
        // Al dar clic en "Abrir/Cerrar Puerta"
        if (room && room.door) {
          return this.scene.doors.toggleDoor(room.door);
        }
        return false;
      }
    );

    // 3. Inicializar el panel lateral de habitaciones
    this.sidebar = new SidebarRooms(
      this.sidebarContainer,
      this.scene.roomsData,
      (room) => {
        this.scene.selectRoom(room);
        this.detailCard.show(room);
      }
    );

    // 4. Inicializar barra superior y controles
    this.hud = new ControlsHUD({
      container: this.hudContainer,
      onModeChange: (mode) => {
        this.scene.setMode(mode);
      },
      onMoodChange: (mood) => {
        this.scene.setAtmosphere(mood);
      },
      onToggleLights: () => {
        return this.scene.lighting.toggleLights();
      },
      onToggleDoors: () => {
        return this.scene.doors.toggleAll();
      }
    });

    // Tecla ESC para salir del modo caminar o cerrar tarjeta
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        if (this.scene.currentMode === 'caminar') {
          this.scene.setMode('exterior');
          this.hud.setMode('exterior');
        } else {
          this.detailCard.hide();
          this.sidebar.setActive(null);
        }
      }
    });
  }

  onRoomSelected(room) {
    if (this.sidebar) {
      this.sidebar.setActive(room ? room.id : null);
    }
    if (this.detailCard) {
      this.detailCard.show(room);
    }
  }

  onModeChanged(mode) {
    if (this.hud) {
      this.hud.setMode(mode);
    }
  }
}

// Inicializar la aplicación cuando el DOM esté listo
window.addEventListener('DOMContentLoaded', () => {
  window.app = new App();
});
