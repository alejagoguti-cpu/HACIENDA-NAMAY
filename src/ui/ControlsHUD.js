/**
 * ControlsHUD — Barra superior de comandos, modos de visualización,
 * selector de iluminación y botones de acción rápida.
 */
export class ControlsHUD {
  constructor({
    container,
    onModeChange,
    onMoodChange,
    onToggleLights,
    onToggleDoors
  }) {
    this.container = container;
    this.onModeChange = onModeChange;
    this.onMoodChange = onMoodChange;
    this.onToggleLights = onToggleLights;
    this.onToggleDoors = onToggleDoors;

    this.currentMode = 'exterior';
    this.currentMood = 'dia';
    this.lightsOn = false;
    this.doorsOpen = false;

    this.render();
  }

  render() {
    this.container.innerHTML = `
      <header class="top-nav-bar glass-panel">
        <div class="nav-brand">
          <span class="nav-brand-icon">🌿</span>
          <div class="nav-brand-text">
            <span class="brand-title">HACIENDA NAMAY</span>
            <span class="brand-subtitle">Masterplan 3D & Axonometría</span>
          </div>
        </div>

        <div class="nav-modes">
          <button class="mode-btn active" data-mode="exterior" title="Vista exterior libre">
            🌐 Exterior 3D
          </button>
          <button class="mode-btn" data-mode="axonometria" title="Despiece 3D con cubierta elevada">
            💥 Axonometría Explotada
          </button>
          <button class="mode-btn" data-mode="planta" title="Vista cenital ortogonal">
            📐 Planta Cenital
          </button>
          <button class="mode-btn" data-mode="caminar" title="Recorrido peatonal a escala real">
            🚶 Caminar (Flechas)
          </button>
        </div>

        <div class="nav-actions">
          <div class="mood-select-group">
            <button class="icon-tool-btn active" data-mood="dia" title="Luz de Día">☀️</button>
            <button class="icon-tool-btn" data-mood="tarde" title="Atardecer Dorado">🌅</button>
            <button class="icon-tool-btn" data-mood="noche" title="Noche Estrellada">🌙</button>
          </div>

          <button class="pill-action-btn" id="btn-toggle-lights" title="Encender/Apagar luces interiores">
            💡 Luces
          </button>

          <button class="pill-action-btn" id="btn-toggle-doors" title="Abrir/Cerrar todas las puertas">
            🚪 Puertas
          </button>

          <a href="./brochure.html" class="brochure-link-btn" title="Ver catálogo y memoria editorial">
            📖 Brochure
          </a>
        </div>
      </header>

      <!-- HUD flotante cuando se está en modo caminar -->
      <div class="walk-hud" id="walk-hud">
        <div class="walk-instructions glass-panel">
          <span class="walk-badge">🚶 MODO CAMINAR ACTIVO</span>
          <div class="walk-keys-guide">
            <span class="key-pill">▲ / W</span> Caminar adelante &nbsp;|&nbsp;
            <span class="key-pill">▼ / S</span> Atrás &nbsp;|&nbsp;
            <span class="key-pill">◄ / ► / A / D</span> Laterales &nbsp;|&nbsp;
            <span class="key-pill">Q / E</span> Girar cabeza &nbsp;|&nbsp;
            <span class="key-pill">Shift</span> Correr
          </div>
          <div class="walk-mouse-tip">🖱️ Arrastra con el ratón para mirar alrededor · Haz clic en cualquier puerta para abrirla o cerrarla</div>
          <button class="exit-walk-btn" id="btn-exit-walk">✕ Salir a Vista Exterior</button>
        </div>
      </div>
    `;

    // Eventos de modos
    this.container.querySelectorAll('.mode-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const mode = btn.dataset.mode;
        this.setMode(mode);
        if (this.onModeChange) this.onModeChange(mode);
      });
    });

    // Eventos de atmósfera
    this.container.querySelectorAll('.icon-tool-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const mood = btn.dataset.mood;
        this.setMood(mood);
        if (this.onMoodChange) this.onMoodChange(mood);
      });
    });

    // Toggle luces
    const lightsBtn = this.container.querySelector('#btn-toggle-lights');
    lightsBtn.addEventListener('click', () => {
      if (this.onToggleLights) {
        this.lightsOn = this.onToggleLights();
        lightsBtn.classList.toggle('active', this.lightsOn);
      }
    });

    // Toggle puertas
    const doorsBtn = this.container.querySelector('#btn-toggle-doors');
    doorsBtn.addEventListener('click', () => {
      if (this.onToggleDoors) {
        this.doorsOpen = this.onToggleDoors();
        doorsBtn.classList.toggle('active', this.doorsOpen);
      }
    });

    // Salir del modo caminar
    this.container.querySelector('#btn-exit-walk').addEventListener('click', () => {
      this.setMode('exterior');
      if (this.onModeChange) this.onModeChange('exterior');
    });
  }

  setMode(mode) {
    this.currentMode = mode;
    this.container.querySelectorAll('.mode-btn').forEach(b => {
      b.classList.toggle('active', b.dataset.mode === mode);
    });

    const walkHud = this.container.querySelector('#walk-hud');
    if (walkHud) {
      walkHud.classList.toggle('visible', mode === 'caminar');
    }
  }

  setMood(mood) {
    this.currentMood = mood;
    this.container.querySelectorAll('.icon-tool-btn').forEach(b => {
      b.classList.toggle('active', b.dataset.mood === mood);
    });
  }
}
