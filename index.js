const express = require('express');
const cors = require('cors');
const multer = require('multer');
const fs = require('fs');
const path = require('path');

const app = express();

app.use(cors());
// Servir imágenes estáticas
app.use('/images', express.static(path.join(__dirname, 'imgs')));

const storage = multer.diskStorage({
    destination: function (req, file, callback) {
        callback(null, __dirname + '/imgs');
    },
    filename: function (req, file, callback) {
        const filename = crypto.randomUUID();
        callback(null, filename + '.jpg');
    }
})

const upload = multer({
    storage: storage,
    limits: {
        fileSize: 32000000 // Defined in bytes (32 Mb)
    },
})

app.get('/images/:imagename', (req, res) => {
    const imageName = req.params.imagename;
    const imagePath = path.join(__dirname, 'imgs', imageName);

    fs.access(imagePath, fs.constants.F_OK, (err) => {
        if (err) {
            // Manejo de error si la imagen no existe
            res.status(404).send('Imagen no encontrada');
        } else {
            res.sendFile(imagePath);
        }
    });
});

app.post('/upload', upload.array('file', 10), function (req, res) {
    const uploadedFileNames = [];
    const uploadedMB = calculateUploadedMbs(req.files);

    req.files.forEach(file => {
        uploadedFileNames.push(file.filename);
    });

    res.status(200).json({
        message: 'Imágenes subidas correctamente',
        totalUploadedSize: uploadedMB + ' MB',
        uploadedFileNames: uploadedFileNames, // Se añade el array con los nombres
    });
    console.log('Todo Bien!!!');
});

app.delete('/images/:imagename', (req, res) => {
    const imageName = req.params.imagename;
    const imagePath = path.join(__dirname, 'imgs', imageName);

    fs.unlink(imagePath, (err) => {
        if (err) {
            console.error('Error deleting image:', err);
            res.status(500).send('Error deleting image');
        } else {
            console.log('Imagen eliminada exitosamente:', imageName);
            res.status(200).send('Image deleted successfully');
        }
    });
});

app.listen(3000, () =>{console.log('Puerto 3000')});

function calculateUploadedMbs(files) {
    let bytes = 0;
    files.forEach(file => {
        bytes += file.size;
    });
    const mbBytes = bytes / 1024 / 1024;
    return mbBytes.toFixed(2);
}