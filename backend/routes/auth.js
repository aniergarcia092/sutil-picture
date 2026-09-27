const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const router = express.Router();

router.post('/login', async (req, res) => {
  try {
    const { usuario, contraseña } = req.body;

    if (!usuario || !contraseña) {
      return res.status(400).json({ error: 'Usuario y contraseña son obligatorios' });
    }

    if (usuario !== process.env.ADMIN_USER) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    if (!process.env.ADMIN_PASSWORD_HASH) {
      return res.status(500).json({ error: 'ADMIN_PASSWORD_HASH no está configurado' });
    }

    const valido = await bcrypt.compare(
      contraseña,
      process.env.ADMIN_PASSWORD_HASH
    );

    if (!valido) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    const token = jwt.sign(
      { usuario, rol: 'admin' },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({ token, usuario });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

module.exports = router;
