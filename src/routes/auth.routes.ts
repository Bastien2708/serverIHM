import { Router } from 'express';
import {getMe, login, refreshToken, register} from '../controllers/auth.controller';
import { validateFields } from '../middlewares/fieldsValidation';
import {checkToken} from '../middlewares/checkToken';
import {loginSchema, registerSchema} from '../validators/auth.schema';

const router = Router();

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: User Login
 *     tags: [Auth]
 *     description: Authenticate a user using Supabase Auth. Returns a JWT token on successful login.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 description: The user's email address.
 *                 example: user@example.com
 *               password:
 *                 type: string
 *                 format: password
 *                 description: The user's password.
 *                 example: Pa$$w0rd
 *     responses:
 *       '200':
 *         description: Login successful. Returns user info and a JWT token.
 *       '401':
 *         description: Invalid email or password.
 *       '500':
 *         description: Server error during authentication.
 */
router.post(
  '/login',
  validateFields(loginSchema),
  login
);

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     summary: User Registration
 *     tags: [Auth]
 *     description: Register a new user using Supabase Auth. Sends a confirmation email if enabled.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 description: The user's email address.
 *                 example: newuser@example.com
 *               password:
 *                 type: string
 *                 format: password
 *                 description: The user's password (must meet security requirements).
 *                 example: Pa$$w0rd
 *     responses:
 *       '200':
 *         description: Registration successful. Returns the created user info.
 *       '400':
 *         description: Invalid input or email already in use.
 *       '500':
 *         description: Server error during registration.
 */
router.post(
  '/register',
  validateFields(registerSchema),
  register
);
router.get(
    '/me',
    checkToken(),
    getMe
);
router.post(
    '/refresh-token',
    checkToken(),
    refreshToken
);

export default router;
