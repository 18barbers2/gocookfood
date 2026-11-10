import prisma from '../lib/prisma.js';
import { Router, type Response } from 'express';
import { requireAuth } from '../middleware/requireAuth.js';

const router = Router();

router.post('/recipe/create', requireAuth, async (req, res) => {
    const title = req.body.recipeTitle;
    const description = req.body.description;
    const createdById = req.user?.id;

    if (!req.user) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    if (!title || title.length < 3) {
        return res.status(403).json({ error: 'Title too short (must be > 3 characters)' });
    }

    const created = await prisma.recipe.create({
        data: {
            title,
            description,
            authorId: req.user.id,
        },
    });
});
