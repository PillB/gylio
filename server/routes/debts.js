const createCrudRouter = require('./createCrudRouter');
const { createEntityRepository } = require('../repositories/entityRepository');
const { createEntityService } = require('../services/entityService');
const { ENTITY_CONFIG } = require('../lib/entityConfig');
const models = require('../db/models');
const { sqlite } = require('../db/sqliteClient');
const { schemas } = require('../validation/schemas');

const ENTITY_NAME = 'debts';
const repository = createEntityRepository(models, sqlite, ENTITY_CONFIG[ENTITY_NAME]);
const service = createEntityService(repository);
const schemaMap = {
  events: schemas.event,
  budgets: schemas.budget,
  transactions: schemas.transaction,
  debts: schemas.debt
};

module.exports = createCrudRouter({ service, schema: schemaMap[ENTITY_NAME] });
