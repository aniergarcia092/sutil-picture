require('dotenv').config();
const bcrypt = require('bcryptjs');

console.log('ADMIN_USER:', process.env.ADMIN_USER);
console.log('ADMIN_PASSWORD_HASH:', process.env.ADMIN_PASSWORD_HASH);
console.log('Validación:', bcrypt.compareSync('Admin123!', process.env.ADMIN_PASSWORD_HASH));