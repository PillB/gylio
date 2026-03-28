const { ApiError } = require('../lib/errors');

const createEntityService = (repository) => ({
  list: () => repository.list(),
  getById: async (id) => {
    const record = await repository.getById(id);
    if (!record) {
      throw new ApiError(404, 'NOT_FOUND', 'Resource not found');
    }
    return record;
  },
  create: (payload) => repository.create(payload),
  replace: async (id, payload) => {
    const record = await repository.replace(id, payload);
    if (!record) {
      throw new ApiError(404, 'NOT_FOUND', 'Resource not found');
    }
    return record;
  },
  update: async (id, payload) => {
    const record = await repository.update(id, payload);
    if (!record) {
      throw new ApiError(404, 'NOT_FOUND', 'Resource not found');
    }
    return record;
  },
  remove: async (id) => {
    const removed = await repository.remove(id);
    if (!removed) {
      throw new ApiError(404, 'NOT_FOUND', 'Resource not found');
    }
    return { success: true };
  }
});

module.exports = {
  createEntityService
};
