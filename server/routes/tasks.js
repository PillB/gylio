const createCrudRouter = require('./createCrudRouter');
const { createEntityRepository } = require('../repositories/entityRepository');
const { createEntityService } = require('../services/entityService');
const { ENTITY_CONFIG } = require('../lib/entityConfig');
const models = require('../db/models');
const { sqlite } = require('../db/sqliteClient');
const { schemas } = require('../validation/schemas');

const repository = createEntityRepository(models, sqlite, ENTITY_CONFIG.tasks);
const service = createEntityService(repository);

module.exports = createCrudRouter({ service, schema: schemas.task });
