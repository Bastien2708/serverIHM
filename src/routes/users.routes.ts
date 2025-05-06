import { Router } from 'express';
import { checkMinRole } from '../middlewares/checkMinRole';
import { getUserById, getUsers } from '../controllers/users.controller';

const router = Router();

router.get(
  '/',
  checkMinRole('admin'),
  getUsers
);

router.get(
  '/:id',
  getUserById
);
/*
router.patch(
  '/:id',
  checkMinRole('user'),
  validateFields(updateUserSchema),
  updateUserById
);

router.delete(
  '/:id',
  checkMinRole('admin'),
  deleteUserById
);*/

export default router;
