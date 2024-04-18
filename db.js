const express = require('express');
const { createPool } = require('mysql2/promise');
const cors = require('cors');
const { config } = require('dotenv');

// Carga las variables de entorno desde el archivo .env en la carpeta config
config({ path: './.env' });

const app = express();
app.use(cors());

/*PRODUCTS*/

const pool = createPool({
    host: process.env.MYSQL_HOST,
    user: process.env.MYSQL_USER,
    password: process.env.MYSQL_PASSWORD,
    database: process.env.MYSQL_DATABASE
});

async function getAllProducts() {
    const [result] = await pool.query('select * from productos');
    return result;
}

async function getProductById(id) {
    const [rows] = await pool.query(`
    select * from productos
    where idProducto = ?;
    `, [id]);
    return rows[0];
}

async function addProduct(nombre, descripcion, categoria,
    precio, precioAmazon, cantidadDisponible) {

    const [result] = await pool.query(`
        INSERT INTO productos (nombre, descripcion, categoria, 
            cantidadDisponible, precio, precioAmazon)
            VALUES (?,?,?,?,?,?);
        `, [nombre,
        descripcion,
        categoria,
        cantidadDisponible,
        precio,
        precioAmazon]
    );

    return {
        id: result.insertId,
        nombre: nombre,
        descripcion: descripcion
    }
}

async function deleteProduct(productId) {
    const [result] = await pool.query('DELETE FROM productos WHERE idProducto = ?', productId);
    return result;
}

/*IMAGES*/

async function getFirstImageFromProduct(productId) {
    const [rows] = await pool.query(`SELECT url
    FROM productos_imagenes
    WHERE productoId = ?
    ORDER BY productoId ASC
    LIMIT 1;
    `, [productId]);
    return rows[0];
}

async function getImagesFromProduct(productId) {
    const [rows] = await pool.query(`
    select url from productos_imagenes
    where productoId = ?;
    `, [productId]);
    return rows;
}

async function addImage(url, idProducto) {
    try {
        const [result] = await pool.query(`
        insert into productos_imagenes (url, productoId)
        values (?,?)
    `, [url, idProducto]);
        return {
            url: result.url,
            productoId: result.productoId
        }
    } catch (error) {
        console.log('Error SQL: ', error)
    }

}

async function deleteImage(productoId) {
    try {
        // Obtener las URLs de las imágenes que se eliminarán
        const [rows] = await pool.query('SELECT url FROM productos_imagenes WHERE productoId = ?', [productoId]);
        const urlsEliminadas = rows.map(row => row.url);

        // Eliminar las filas de la tabla productos_imagenes
        await pool.query('DELETE FROM productos_imagenes WHERE productoId = ?', [productoId]);

        // Devolver el array de URLs eliminadas
        return urlsEliminadas.length > 0 ? urlsEliminadas : null;
    } catch (error) {
        console.error('Error al eliminar imágenes de la base de datos:', error);
        throw error;
    }
}


module.exports = {
    getAllProducts,
    getProductById,
    addProduct,
    deleteProduct,
    getFirstImageFromProduct,
    getImagesFromProduct,
    addImage,
    deleteImage
};
