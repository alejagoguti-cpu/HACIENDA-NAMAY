/**
 * SidebarRooms — Panel lateral izquierdo para explorar habitación por habitación
 */
export class SidebarRooms {
  constructor(container, roomsData, onSelect) {
    this.container = container;
    this.roomsData = roomsData;
    this.onSelect = onSelect;
    this.activeId = null;

    this.render();
  }

  render() {
    this.container.innerHTML = `
      <div class="sidebar-card glass-panel">
        <div class="sidebar-header">
          <div class="hotel-eyebrow">Albán, Cundinamarca</div>
          <h2 class="hotel-title">Hacienda Namay</h2>
          <p class="hotel-desc">Selecciona un recinto para explorarlo en 3D, abrir sus puertas o recorrerlo a pie con las flechas.</p>
        </div>

        <div class="rooms-list" id="rooms-list">
          <div class="list-section-title">Alas & Habitaciones</div>
          ${this.roomsData.map(r => `
            <button class="room-item-btn" data-id="${r.id}">
              <div class="room-item-icon">${r.id <= 7 ? '🛏️' : r.id === 8 ? '🍷' : r.id === 9 ? '🍳' : '🏊'}</div>
              <div class="room-item-info">
                <div class="room-item-name">${r.name}</div>
                <div class="room-item-meta">${r.area} m² · ${r.id <= 7 ? 'Suite con Terraza' : 'Área Común'}</div>
              </div>
              <div class="room-item-arrow">→</div>
            </button>
          `).join('')}
        </div>
      </div>
    `;

    this.container.querySelectorAll('.room-item-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = parseInt(btn.dataset.id, 10);
        this.setActive(id);
        const room = this.roomsData.find(r => r.id === id);
        if (this.onSelect && room) {
          this.onSelect(room);
        }
      });
    });
  }

  setActive(id) {
    this.activeId = id;
    this.container.querySelectorAll('.room-item-btn').forEach(btn => {
      const bId = parseInt(btn.dataset.id, 10);
      btn.classList.toggle('active', bId === id);
    });
  }
}
