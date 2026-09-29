const bcrypt = require('bcryptjs');

const password = 'Admin123!';
const hash = bcrypt.hashSync(password, 10);

console.log('=================================');
console.log('Contraseña:', password);
console.log('Hash generado:');
console.log(hash);
console.log('=================================');
console.log('Validación:', bcrypt.compareSync(password, hash));
console.log('=================================');