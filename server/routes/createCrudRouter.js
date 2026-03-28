const express = require('express');
const { asyncHandler } = require('../middleware/errorHandler');
const { validateBody } = require('../middleware/validate');

const createCrudRouter = ({ service, schema }) => {
  const router = express.Router();

  router.get(
    '/',
    asyncHandler(async (_req, res) => {
      const items = await service.list();
      res.json(items);
    })
  );

  router.get(
    '/:id',
    asyncHandler(async (req, res) => {
      const item = await service.getById(req.params.id);
      res.json(item);
    })
  );

  router.post(
    '/',
    validateBody(schema),
    asyncHandler(async (req, res) => {
      const created = await service.create(req.body);
      res.status(201).json(created);
    })
  );

  router.put(
    '/:id',
    validateBody(schema),
    asyncHandler(async (req, res) => {
      const replaced = await service.replace(req.params.id, req.body);
      res.json(replaced);
    })
  );

  router.patch(
    '/:id',
    validateBody(schema, { partial: true }),
    asyncHandler(async (req, res) => {
      const updated = await service.update(req.params.id, req.body);
      res.json(updated);
    })
  );

  router.delete(
    '/:id',
    asyncHandler(async (req, res) => {
      await service.remove(req.params.id);
      res.status(204).send();
    })
  );

  return router;
};

module.exports = createCrudRouter;
