import { Router } from 'express';
import { getMe, login, refreshToken, register } from '../controllers/auth.controller';
import { validateFields } from '../middlewares/fieldsValidation';
import { checkToken } from '../middlewares/checkToken';
import { loginSchema, refreshTokenSchema, registerSchema } from '../validators/auth.schema';

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

/**
 * @swagger
 * /api/auth/me:
 *   get:
 *     summary: Get Current User Info
 *     tags: [Auth]
 *     description: Retrieve the current user's information.
 *     responses:
 *       '200':
 *         description: User info retrieved successfully.
 *       '401':
 *         description: Unauthorized. Invalid or missing token.
 */
router.get(
  '/me',
  checkToken(),
  getMe
);

/**
 * @swagger
 * /api/auth/refresh-token:
 *   post:
 *     summary: Refresh Access Token
 *     tags: [Auth]
 *     description: Refresh the access token using the refresh token.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - refresh_token
 *             properties:
 *               refresh_token:
 *                 type: string
 *                 description: The refresh token to obtain a new access token.
 *                 example: your_refresh_token_here
 *     responses:
 *       '200':
 *         description: Token refreshed successfully. Returns a new access token.
 *       '400':
 *         description: Invalid refresh token.
 */
router.post(
  '/refresh-token',
  validateFields(refreshTokenSchema),
  refreshToken
);

export default router;
