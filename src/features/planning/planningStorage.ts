import type { EnergyLevel } from './planDay';

const ENERGY_KEY = 'gylio:energy';
const INSTALL_KEY = 'gylio:installId';
const LEVELS: EnergyLevel[] = ['tiny', 'low', 'medium', 'high'];

export const readEnergy = (): EnergyLevel => {
  try {
    const value = localStorage.getItem(ENERGY_KEY) as EnergyLevel | null;
    return value && LEVELS.includes(value) ? value : 'medium';
  } catch {
    return 'medium';
  }
};

export const writeEnergy = (level: EnergyLevel): void => {
  try {
    localStorage.setItem(ENERGY_KEY, level);
  } catch {
    // private mode or quota: the choice just is not remembered
  }
};

/** Random per-install id used only to bucket experiments; carries no identity. */
export const getInstallId = (): string => {
  try {
    let id = localStorage.getItem(INSTALL_KEY);
    if (!id) {
      id = Math.random().toString(36).slice(2) + Date.now().toString(36);
      localStorage.setItem(INSTALL_KEY, id);
    }
    return id;
  } catch {
    return 'ephemeral';
  }
};
