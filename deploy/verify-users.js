const {PrismaClient} = require('@prisma/client');
const p = new PrismaClient();
p.user.findMany({
  select: { name: true, email: true, role: true, status: true },
  orderBy: { role: 'asc' }
}).then(users => {
  users.forEach(u => console.log(u.role.padEnd(22), u.status.padEnd(7), u.email, '-', u.name));
  console.log('\nTotal:', users.length, 'users');
  p.$disconnect();
});
