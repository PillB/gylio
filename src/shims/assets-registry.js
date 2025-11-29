const registry = new Map();

export const registerAsset = (asset) => {
  if (asset && asset.id != null) {
    registry.set(asset.id, asset);
  }
  return asset;
};

export const getAssetByID = (id) => registry.get(id) ?? null;

export default { registerAsset, getAssetByID };
