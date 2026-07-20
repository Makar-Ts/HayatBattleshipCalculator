import ENV from "../enviroments/env.js";

/**
 * Пространственная сетка (Spatial Grid) для быстрого поиска объектов по области.
 * Использует равномерную сетку с ячейками фиксированного размера.
 * 
 * @template T - тип хранимых объектов (по умолчанию any)
 */
export class SpatialGrid {
  /**
   * Создаёт экземпляр пространственной сетки.
   * @param {number} cellSize - размер стороны ячейки в единицах карты.
   *   По умолчанию берётся из ENV.SPATIAL_GRID_CELL_SIZE.
   */
  constructor(cellSize = ENV.SPATIAL_GRID_CELL_SIZE) {
    /** @type {number} */
    this.cellSize = cellSize;
    /** @type {Map<string, Set<string>>} - карта "ключ ячейки" -> множество идентификаторов объектов */
    this.grid = new Map();
    /** @type {Map<string, {x: number, y: number, radius: number, obj: T}>} */
    this.objects = new Map();
  }

  /**
   * Полностью очищает сетку, удаляя все объекты.
   */
  clear() {
    this.grid.clear();
    this.objects.clear();
  }

  /**
   * Возвращает строковый ключ ячейки для заданных координат.
   * @param {number} x - координата X
   * @param {number} y - координата Y
   * @returns {string} ключ вида "cx,cy"
   * @private
   */
  _getCellKey(x, y) {
    const cx = Math.floor(x / this.cellSize);
    const cy = Math.floor(y / this.cellSize);
    return `${cx},${cy}`;
  }

  /**
   * Возвращает массив ключей ячеек, которые пересекает окружность с центром (x, y) и радиусом radius.
   * @param {number} x - центр по X
   * @param {number} y - центр по Y
   * @param {number} radius - радиус окружности
   * @returns {string[]} массив ключей ячеек
   * @private
   */
  _getCellsForObject(x, y, radius) {
    const minX = x - radius;
    const maxX = x + radius;
    const minY = y - radius;
    const maxY = y + radius;
    const startCX = Math.floor(minX / this.cellSize);
    const endCX = Math.floor(maxX / this.cellSize);
    const startCY = Math.floor(minY / this.cellSize);
    const endCY = Math.floor(maxY / this.cellSize);
    const cells = [];
    for (let cx = startCX; cx <= endCX; cx++) {
      for (let cy = startCY; cy <= endCY; cy++) {
        cells.push(`${cx},${cy}`);
      }
    }
    return cells;
  }

  /**
   * Вставляет объект в сетку.
   * @param {string} id - уникальный идентификатор объекта
   * @param {number} x - координата X центра
   * @param {number} y - координата Y центра
   * @param {number} [radius=0] - радиус объекта (влияет на охват ячеек)
   * @param {T} obj - сам объект (сохраняется для возврата при запросах)
   */
  insert(id, x, y, radius = 0, obj) {
    this.objects.set(id, { x, y, radius, obj });
    const cells = this._getCellsForObject(x, y, radius);
    for (const key of cells) {
      if (!this.grid.has(key)) this.grid.set(key, new Set());
      this.grid.get(key).add(id);
    }
  }

  /**
   * Удаляет объект из сетки по его идентификатору.
   * @param {string} id - идентификатор удаляемого объекта
   */
  remove(id) {
    const entry = this.objects.get(id);
    if (!entry) return;
    const { x, y, radius } = entry;
    const cells = this._getCellsForObject(x, y, radius);
    for (const key of cells) {
      const cell = this.grid.get(key);
      if (cell) {
        cell.delete(id);
        if (cell.size === 0) this.grid.delete(key);
      }
    }
    this.objects.delete(id);
  }

  /**
   * Обновляет позицию и радиус объекта в сетке.
   * Если координаты и радиус не изменились, метод ничего не делает.
   * @param {string} id - идентификатор объекта
   * @param {number} newX - новая координата X
   * @param {number} newY - новая координата Y
   * @param {number} newRadius - новый радиус (может быть 0)
   */
  update(id, newX, newY, newRadius) {
    const entry = this.objects.get(id);
    if (!entry) return;
    const oldX = entry.x,
      oldY = entry.y,
      oldRadius = entry.radius;
    if (oldX === newX && oldY === newY && oldRadius === newRadius) return;

    // Удаляем из старых ячеек
    const oldCells = this._getCellsForObject(oldX, oldY, oldRadius);
    for (const key of oldCells) {
      const cell = this.grid.get(key);
      if (cell) {
        cell.delete(id);
        if (cell.size === 0) this.grid.delete(key);
      }
    }

    // Обновляем данные
    entry.x = newX;
    entry.y = newY;
    entry.radius = newRadius;

    // Вставляем в новые ячейки
    const newCells = this._getCellsForObject(newX, newY, newRadius);
    for (const key of newCells) {
      if (!this.grid.has(key)) this.grid.set(key, new Set());
      this.grid.get(key).add(id);
    }
  }

  /**
   * Удобный метод для обновления объекта, который хранит свои координаты и размер
   * в полях `_x`, `_y` и `size` (или `radius` – используется `size`).
   * @param {Object} object - объект, содержащий поля `id`, `_x`, `_y`, `size` (опционально)
   * @param {string} object.id - идентификатор
   * @param {number} object._x - координата X
   * @param {number} object._y - координата Y
   * @param {number} [object.size=0] - радиус/размер объекта
   */
  updateObject(object) {
    this.update(object.id, object._x, object._y, object.size ?? 0);
  }

  /**
   * Запрос только по ячейкам (без проверки расстояния).
   * Возвращает множество идентификаторов объектов, которые находятся в ячейках,
   * пересекающих заданную окружность.
   * @param {number} cx - центр по X
   * @param {number} cy - центр по Y
   * @param {number} radius - радиус поиска
   * @returns {Set<string>} множество идентификаторов объектов-кандидатов
   */
  queryCells(cx, cy, radius) {
    const cells = this._getCellsForObject(cx, cy, radius);
    const candidates = new Set();
    for (const key of cells) {
      const cell = this.grid.get(key);
      if (cell) {
        for (const id of cell) {
          candidates.add(id);
        }
      }
    }
    return candidates;
  }

  /**
   * Полный запрос с отсечением по расстоянию.
   * Возвращает массив объектов, которые находятся в пределах заданного радиуса от точки (cx, cy).
   * @param {number} cx - центр по X
   * @param {number} cy - центр по Y
   * @param {number} radius - радиус поиска
   * @returns {{ object: T, r2: number }[]} массив объектов, попавших в область
   */
  query(cx, cy, radius) {
    const candidates = this.queryCells(cx, cy, radius);
    const result = [];
    const r2 = radius * radius;
    for (const id of candidates) {
      const entry = this.objects.get(id);
      if (!entry) continue;
      const dx = entry.x - cx;
      const dy = entry.y - cy;
      const dist2 = dx * dx + dy * dy;
      if (dist2 <= r2) {
        result.push({ object: entry.obj, r2: dist2 });
      }
    }
    return result;
  }

  /**
   * Полная перестройка сетки из словаря объектов.
   * Используется вне симуляции, например, при полной перерисовке.
   * @param {Object.<string, {_x: number, _y: number, size?: number}>} objectsDict
   *   объект, где ключи – идентификаторы, значения – объекты с полями _x, _y, size (опционально)
   */
  rebuild(objectsDict) {
    this.clear();
    for (const id in objectsDict) {
      const obj = objectsDict[id];
      const radius = obj.size ?? 0;
      this.insert(id, obj._x, obj._y, radius, obj);
    }
  }
}