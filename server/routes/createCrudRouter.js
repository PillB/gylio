const express = require('express');
const { asyncHandler } = require('../middleware/errorHandler');
const { validateBody } = require('../middleware/validate');
const { mutationRateLimit } = require('../middleware/rateLimit');

const createCrudRouter = ({ service, schema }) => {
  const router = express.Router();

  router.get(
    '/',
    asyncHandler(async (req, res) => {
      const items = await service.list(req.user.id);
      res.json(items);
    })
  );

  router.get(
    '/:id',
    asyncHandler(async (req, res) => {
      const item = await service.getById(req.params.id, req.user.id);
      res.json(item);
    })
  );

  router.post(
    '/',
    mutationRateLimit,
    validateBody(schema),
    asyncHandler(async (req, res) => {
      const created = await service.create(req.body, req.user.id);
      res.status(201).json(created);
    })
  );

  router.put(
    '/:id',
    mutationRateLimit,
    validateBody(schema),
    asyncHandler(async (req, res) => {
      const replaced = await service.replace(req.params.id, req.body, req.user.id);
      res.json(replaced);
    })
  );

  router.patch(
    '/:id',
    mutationRateLimit,
    validateBody(schema, { partial: true }),
    asyncHandler(async (req, res) => {
      const updated = await service.update(req.params.id, req.body, req.user.id);
      res.json(updated);
    })
  );

  router.delete(
    '/:id',
    mutationRateLimit,
    asyncHandler(async (req, res) => {
      await service.remove(req.params.id, req.user.id);
      res.status(204).send();
    })
  );

  return router;
};

module.exports = createCrudRouter;
