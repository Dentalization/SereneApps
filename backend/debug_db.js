import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const studies = await prisma.imagingStudy.findMany();
    console.log(JSON.stringify(studies, (key, value) =>
        typeof value === 'bigint' ? value.toString() : value
        , 2));
}

main()
    .catch(e => {
        throw e
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
