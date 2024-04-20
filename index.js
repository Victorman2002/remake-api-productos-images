const express = require('express');
const cors = require('cors');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const bodyParser = require('body-parser');

const { getAllProducts, getProductById, addProduct, deleteProduct, addImage, getImagesFromProduct, getFirstImageFromProduct, deleteImage } = require('./db.js');

const app = express();
const port = 3000;

//Cors policy
app.use(cors());
//Usa el endpoint de images para referirse a la carpeta imgs
app.use('/images', express.static(path.join(__dirname, 'imgs')));
// Middleware para parsear el cuerpo de las solicitudes en formato JSON
app.use(bodyParser.json());

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
        fileSize: 32000000 // Defined in bytes (32 MB)
    },
})

/*----------- IMAGES FILES ------------*/

//Elimina del servidor el archivo de la imagen con el nombre pasado como parametro
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

//Sube a la carpeta de imagenes del servidor una cantidad maxima de 10 imagenes
//generando un nombre para dicha imagen automaticamente
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

//Elimina de la carpeta de imgs del servidor la imagen con el nombre pasado como parametro
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

/* --------- DATABASE ----------- */

//Devuelve todos los productos de la BBDD en formato JSON
app.get('/productos', async (req, res) => {
    const products = await getAllProducts();
    res.send(products);
});

//Devuelve el producto con el id pasado como parametro de BBDD en formato JSON
app.get('/productos/:id', async (req, res) => {
    const id = req.params.id;
    const product = await getProductById(id);
    res.send(product);
});

//Añade a la basde de datos en productos pasado como parametro en formato JSON a la BBDD
app.post('/productos', async (req, res) => {
    const { nombre, descripcion, categoria, precio, precioAmazon, cantidadDisponible } = req.body;
    try {
        const productoAñadido = await addProduct(nombre, descripcion, categoria, precio, precioAmazon, cantidadDisponible);
        res.status(201).json(productoAñadido);
    } catch (error) {
        console.error('Error al añadir el producto:', error);
        res.status(500).json({ error: 'No se pudo añadir el producto. Error interno del servidor.' });
    }
});

//Elimina el producto con el id pasado como parametro de la BBDD 
app.delete('/productos/:id', async (req, res) => {
    const id = req.params.id;
    try {
        const result = await deleteProduct(id);
        console.log(result.affectedRows)
        if (result.affectedRows > 0) {
            res.status(200).json({ message: 'Producto eliminado exitosamente.' });
        } else {
            res.status(404).json({ error: 'El producto no existe.' });
        }
    } catch (error) {
        console.error('Error al eliminar el producto:', error);
        res.status(500).json({ error: 'Error interno del servidor al eliminar el producto.' });
    }
});

//Devuelve el String de la primera imagen subida a la BBDD del producto con el id pasado como parametro
app.get('/producto-firstImage/:productId', async (req, res) => {
    const productId = req.params.productId;
    const imagesUrl = await getFirstImageFromProduct(productId);
    console.log(imagesUrl)
    res.send(imagesUrl);
});

//Devuelve una lista con todas las imagenes del producto con id pasado como parametro
app.get('/producto-images/:productId', async (req, res) => {
    const productId = req.params.productId;
    const imagesUrl = await getImagesFromProduct(productId);
    console.log(imagesUrl)
    const urls = imagesUrl.map(obj => obj.url);
    res.send(urls);
});

//Añade a la BBDD una imagen con su url correspondiente y el id del producto al que pertenece
app.post('/images/:url/:productoId', async (req, res) => {
    try {
        const url = req.params.url;
        const productoId = req.params.productoId;
        await addImage(url, productoId);
        res.send('Imagen Añadida con Exito');
    } catch (error) {
        console.error('Error al añadir la imagen:', error);
        res.status(500).json({ error: 'No se pudo añadir la imagen. Error interno del servidor.' });
    }
});

//Elimina de la BBDD las imagenes que pertenecen a un producto con id pasado como parametro
app.delete('/productos-images/:productoId', async (req, res) => {
    const productoId = req.params.productoId;
    try {
        const deletedImages = await deleteImage(productoId);
        if (deletedImages && deletedImages.length > 0) {
            res.status(200).json(deletedImages);
        } else {
            res.status(404).json({ message: 'La imagen no pudo ser encontrada o eliminada.' });
        }
    } catch (error) {
        res.status(500).json({ error: 'Error interno del servidor.' });
    }
});

app.listen(port, () => console.log(`listening on port ${port}`));

// Calcula la cantidad de MB que se han subido como imagenes en un producto
function calculateUploadedMbs(files) {
    let bytes = 0;
    files.forEach(file => {
        bytes += file.size;
    });
    const mbBytes = bytes / 1024 / 1024;
    return mbBytes.toFixed(2);
}