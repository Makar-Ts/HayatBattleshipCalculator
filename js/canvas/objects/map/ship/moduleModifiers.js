export class ModuleModifiers {
  static createModifiersProxy(predefinedMods = {}) {
    return new Proxy(predefinedMods, {
      get(target, prop) {
        if (!(prop in target)) {
          target[prop] = 1;
        }
        return target[prop];
      },

      set(target, prop, value) {
        if (typeof value !== 'number' || Number.isNaN(value)) {
          throw new TypeError(`Modifier "${String(prop)}" must be a number`);
        }
        target[prop] = value;
        return true;
      },

      has(target, prop) {
        return prop in target;
      },

      ownKeys(target) {
        return Reflect.ownKeys(target);
      },

      getOwnPropertyDescriptor(target, prop) {
        return Reflect.getOwnPropertyDescriptor(target, prop);
      }
    });
  }
}
