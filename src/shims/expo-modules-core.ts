/**
 * Web shim for expo-modules-core.
 * Provides no-op stubs for native module resolution that is not needed on web.
 */

export const NativeModulesProxy: Record<string, unknown> = {};
export const EventEmitter = class { addListener() {} removeAllListeners() {} };
export const Platform = { OS: 'web' as const };
export const UnavailabilityError = class extends Error {
  constructor(moduleName: string, methodName: string) {
    super(`The method or property ${moduleName}.${methodName} is not available on web.`);
  }
};

export const CodedError = class extends Error {
  code: string;
  constructor(code: string, message: string) {
    super(message);
    this.code = code;
  }
};

/** Stub for TurboModuleRegistry.get() which resolves native modules on mobile. */
export const TurboModuleRegistry = {
  get: (_name: string) => null,
  getEnforcing: (name: string) => {
    throw new Error(`TurboModuleRegistry.getEnforcing is not available on web (module: ${name})`);
  },
};

export function requireNativeModule(_moduleName: string): unknown {
  return null;
}

export function requireOptionalNativeModule(_moduleName: string): unknown {
  return null;
}

export function registerWebModule<T>(moduleImplementation: T): T {
  return moduleImplementation;
}

export default {
  NativeModulesProxy,
  EventEmitter,
  Platform,
  UnavailabilityError,
  TurboModuleRegistry,
  requireNativeModule,
  requireOptionalNativeModule,
  registerWebModule,
};
