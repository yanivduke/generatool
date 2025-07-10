import express, { Request, Response } from 'express';
import rateLimit from 'express-rate-limit';
import {
    UserLoginSchema,
    UserRegistrationSchema,
    generateToken,
    hashPassword,
    verifyPassword
} from './jwt.js';

// Simple in-memory user store (in production, use a database)
interface User {
    id: string;
    email: string;
    username: string;
    passwordHash: string;
    createdAt: Date;
}

const users: Map<string, User> = new Map();

// Rate limiting for auth endpoints
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // limit each IP to 5 requests per windowMs
    message: {
        error: 'Too many authentication attempts, please try again later'
    },
    standardHeaders: true,
    legacyHeaders: false,
});

const router = express.Router();

/**
 * Register a new user
 */
router.post('/register', authLimiter, async (req: Request, res: Response): Promise<void> => {
    try {
        // Validate input
        const validatedData = UserRegistrationSchema.parse(req.body);
        const { email, password, username } = validatedData;

        // Check if user already exists
        const existingUser = Array.from(users.values()).find(
            user => user.email === email || user.username === username
        );

        if (existingUser) {
            res.status(409).json({
                error: 'User with this email or username already exists'
            });
            return;
        }

        // Hash password
        const passwordHash = await hashPassword(password);

        // Create user
        const userId = `user_${Date.now()}_${Math.random().toString(36).substring(2)}`;
        const user: User = {
            id: userId,
            email,
            username,
            passwordHash,
            createdAt: new Date()
        };

        users.set(userId, user);

        // Generate token
        const token = generateToken({ userId, email });

        res.status(201).json({
            message: 'User registered successfully',
            user: {
                id: userId,
                email,
                username,
                createdAt: user.createdAt
            },
            token
        });
    } catch (error) {
        if (error instanceof Error && error.name === 'ZodError') {
            res.status(400).json({
                error: 'Validation failed',
                details: error.message
            });
        } else {
            console.error('Registration error:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }
});

/**
 * Login user
 */
router.post('/login', authLimiter, async (req: Request, res: Response): Promise<void> => {
    try {
        // Validate input
        const validatedData = UserLoginSchema.parse(req.body);
        const { email, password } = validatedData;

        // Find user
        const user = Array.from(users.values()).find(u => u.email === email);

        if (!user) {
            res.status(401).json({ error: 'Invalid credentials' });
            return;
        }

        // Verify password
        const isValidPassword = await verifyPassword(password, user.passwordHash);

        if (!isValidPassword) {
            res.status(401).json({ error: 'Invalid credentials' });
            return;
        }

        // Generate token
        const token = generateToken({ userId: user.id, email: user.email });

        res.json({
            message: 'Login successful',
            user: {
                id: user.id,
                email: user.email,
                username: user.username,
                createdAt: user.createdAt
            },
            token
        });
    } catch (error) {
        if (error instanceof Error && error.name === 'ZodError') {
            res.status(400).json({
                error: 'Validation failed',
                details: error.message
            });
        } else {
            console.error('Login error:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }
});

/**
 * Get current user profile (protected route)
 */
router.get('/profile', async (req: Request, res: Response): Promise<void> => {
    if (!req.user) {
        res.status(401).json({ error: 'Authentication required' });
        return;
    }

    const user = users.get(req.user.userId);

    if (!user) {
        res.status(404).json({ error: 'User not found' });
        return;
    }

    res.json({
        user: {
            id: user.id,
            email: user.email,
            username: user.username,
            createdAt: user.createdAt
        }
    });
});

export default router;
export { users }; // Export for testing purposes
