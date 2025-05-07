import { Router } from 'express';
import { me, login, refreshToken, register } from '../controllers/auth.controller';
import { validateFields } from '../middlewares/fieldsValidation';
import { loginSchema, refreshTokenSchema, registerSchema } from '../validators/auth.schema';
import { checkMinRole } from '../middlewares/checkMinRole';

const router = Router();

router.post('/login', validateFields(loginSchema), login);
router.post('/register', validateFields(registerSchema), register);
router.get('/me', checkMinRole('user'), me);
router.post('/refresh-token', validateFields(refreshTokenSchema), refreshToken);

export default router;
