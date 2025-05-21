import { Router } from 'express';
import { checkMinRole } from '../middlewares/checkMinRole';
import { deleteUserById, getUserById, getUsers, updateUserById } from '../controllers/users.controller';
import { validateFields } from '../middlewares/fieldsValidation';
import { updateUserSchema } from '../validators/users.schema';

const router = Router();

router.get('/', checkMinRole('admin'), getUsers);
router.get('/:id', checkMinRole('user'), getUserById);
router.patch('/:id', checkMinRole('user'), validateFields(updateUserSchema), updateUserById);
router.delete('/:id', checkMinRole('admin'), deleteUserById);

export default router;
