import prisma from '../lib/prisma.js';

async function main() {
    const created = await prisma.recipe.create({
        data: {
            title: 'Test Pancakes',
            ingredients: ['flour', 'milk', 'eggs'],
            steps: ['Mix everything', 'Cook on a pan'],
        },
    });
    console.log('Created:', created);

    const all = await prisma.recipe.findMany();
    console.log('All recipes:', all);
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(() => prisma.$disconnect());
