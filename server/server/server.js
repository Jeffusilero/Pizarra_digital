require('dotenv').config();
const express = require('express');
const axios = require('axios');
const cors = require('cors');
const app = express();

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Variables de configuración
const GITHUB_TOKEN = process.env.GITHUB_TOKEN || 'tu_token_aqui';
const REPO_OWNER = 'Jeffusilero';
const REPO_NAME = 'Pizarra_digital';
const DATA_FILE = 'data.json';
const MANIFEST_FILE = 'manifest.json';

// Endpoint para actualizar datos
app.post('/update-data', async (req, res) => {
    try {
        const { database, manifest } = req.body;

        // 1. Actualizar data.json
        await updateGitHubFile(DATA_FILE, database);
        
        // 2. Actualizar manifest.json (si existe)
        if (manifest) {
            await updateGitHubFile(MANIFEST_FILE, manifest);
        }

        res.status(200).json({ success: true, message: 'Datos actualizados correctamente' });
    } catch (error) {
        console.error('Error:', error.response?.data || error.message);
        res.status(500).json({ success: false, message: 'Error al actualizar datos' });
    }
});

// Función para actualizar archivos en GitHub
async function updateGitHubFile(filename, content) {
    // Obtener SHA del archivo actual
    const shaResponse = await axios.get(
        `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${filename}`,
        { headers: { Authorization: `token ${GITHUB_TOKEN}` } }
    );

    // Actualizar archivo
    await axios.put(
        `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${filename}`,
        {
            message: `Actualización automática de ${filename}`,
            content: Buffer.from(JSON.stringify(content)).toString('base64'),
            sha: shaResponse.data.sha
        },
        { headers: { Authorization: `token ${GITHUB_TOKEN}` } }
    );
}

// Iniciar servidor
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Servidor corriendo en http://localhost:${PORT}`);
});