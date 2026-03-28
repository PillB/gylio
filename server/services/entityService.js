const { ApiError } = require('../lib/errors');

const createEntityService = (repository) => ({
  list: (userId) => repository.list(userId),
  getById: async (id, userId) => {
    const record = await repository.getById(id, userId);
    if (!record) {
      throw new ApiError(404, 'NOT_FOUND', 'Resource not found');
    }
    return record;
  },
  create: (payload, userId) => repository.create(payload, userId),
  replace: async (id, payload, userId) => {
    const record = await repository.replace(id, payload, userId);
    if (!record) {
      throw new ApiError(404, 'NOT_FOUND', 'Resource not found');
    }
    return record;
  },
  update: async (id, payload, userId) => {
    const record = await repository.update(id, payload, userId);
    if (!record) {
      throw new ApiError(404, 'NOT_FOUND', 'Resource not found');
    }
    return record;
  },
  remove: async (id, userId) => {
    const removed = await repository.remove(id, userId);
    if (!removed) {
      throw new ApiError(404, 'NOT_FOUND', 'Resource not found');
    }
    return { success: true };
  }
});

module.exports = {
  createEntityService
};
