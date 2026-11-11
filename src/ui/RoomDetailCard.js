/**
 * RoomDetailCard — Tarjeta flotante glassmorphic con ficha técnica del recinto,
 * botón para caminar con las flechas y acción de abrir/cerrar puerta.
 */
export class RoomDetailCard {
  constructor(container, onWalkClick = null, onDoorToggle = null) {
    this.container = container;
    this.onWalkClick = onWalkClick;
    this.onDoorToggle = onDoorToggle;
    this.currentRoom = null;
  }

  show(room) {
    this.currentRoom = room;
    if (!room) {
      this.hide();
      return;
    }

    const isSuite = room.id <= 7;

    this.container.innerHTML = `
      <div class="detail-card glass-panel animate-in">
        <button class="detail-close-btn" id="btn-close-detail">✕</button>

        <div class="detail-tag">${isSuite ? 'Suite Privada' : 'Área Comunitaria'}</div>
        <h3 class="detail-title">${room.name}</h3>
        <div class="detail-area-badge">${room.area} m² construidos</div>

        <div class="detail-specs-grid">
          <div class="spec-item">
            <span class="spec-label">Dotación</span>
            <span class="spec-val">${isSuite ? 'Cama King 2.0x2.0m + Sala' : 'Equipamiento Integral'}</span>
          </div>
          <div class="spec-item">
            <span class="spec-label">Baño</span>
            <span class="spec-val">${isSuite ? 'Privado en Mármol & Ducha Glass' : 'Batería Sanitaria'}</span>
          </div>
          <div class="spec-item">
            <span class="spec-label">Materialidad</span>
            <span class="spec-val">Barro cocido, tapia pisada & roble PBR</span>
          </div>
          <div class="spec-item">
            <span class="spec-label">Visual</span>
            <span class="spec-val">Patio interior central & Cerros de Albán</span>
          </div>
        </div>

        <div class="detail-actions">
          <button class="btn-primary-action" id="btn-walk-room">
            🚶 Caminar aquí (Flechas)
          </button>
          ${room.door ? `
            <button class="btn-secondary-action" id="btn-toggle-room-door">
              🚪 ${room.door.isOpen ? 'Cerrar Puerta' : 'Abrir Puerta'}
            </button>
          ` : ''}
        </div>
      </div>
    `;

    this.container.classList.add('visible');

    this.container.querySelector('#btn-close-detail').addEventListener('click', () => {
      this.hide();
    });

    this.container.querySelector('#btn-walk-room').addEventListener('click', () => {
      if (this.onWalkClick && this.currentRoom) {
        this.onWalkClick(this.currentRoom);
      }
    });

    const doorBtn = this.container.querySelector('#btn-toggle-room-door');
    if (doorBtn && this.onDoorToggle) {
      doorBtn.addEventListener('click', () => {
        const isOpen = this.onDoorToggle(this.currentRoom);
        doorBtn.innerHTML = `🚪 ${isOpen ? 'Cerrar Puerta' : 'Abrir Puerta'}`;
      });
    }
  }

  hide() {
    this.container.classList.remove('visible');
    this.container.innerHTML = '';
    this.currentRoom = null;
  }
}
