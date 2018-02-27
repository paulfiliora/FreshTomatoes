const sqlite = require('sqlite'),
    Sequelize = require('sequelize'),
    request = require('request'),
    express = require('express'),
    app = express();

const {
    PORT = 3000, NODE_ENV = 'development', DB_PATH = './db/database.db'
} = process.env;

// START SERVER
Promise.resolve()
    .then(() => app.listen(PORT, () => console.log(`App listening on port ${PORT}`)))
    .catch((err) => {
        if (NODE_ENV === 'development') console.error(err.stack);
    });


// DECLARE SEQUALIZE CONNECTION
const sequelize = new Sequelize('mainDB', null, null, {
    host: 'localhost',
    dialect: 'sqlite',
    storage: './db/database.db',
});

// DELARE DB SCHEMA & MODELS
const Genre = sequelize.define('genre', {
    id: {
        type: Sequelize.INTEGER,
        primaryKey: true
    },
    name: {
        type: Sequelize.STRING,
        allowNull: false
    }
}, {
    timestamps: false
})
const Film = sequelize.define('film', {
    id: {
        type: Sequelize.INTEGER,
        primaryKey: true
    },
    title: {
        type: Sequelize.STRING,
        allowNull: false
    },
    release_date: {
        type: Sequelize.DATE,
        allowNull: false
    },
    tagline: {
        type: Sequelize.STRING,
        allowNull: false
    },
    revenue: {
        type: Sequelize.BIGINT,
        defaultValue: 0,
        allowNull: false
    },
    budget: {
        type: Sequelize.BIGINT,
        allowNull: false
    },
    runtime: {
        type: Sequelize.INTEGER,
        allowNull: false
    },
    original_language: {
        type: Sequelize.STRING,
        allowNull: false
    },
    status: {
        type: Sequelize.STRING,
        allowNull: false
    },
    genre_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
            model: Genre,
            key: 'id'
        }
    }
}, {
    timestamps: false
})

// ROUTES
app.get('/films/:id/recommendations', getFilmRecommendations);
// MISSING ROUTES
app.get('*', function(req, res) {
    res.status(404).send({
        message: '404 page not found'
    });
})

// ROUTE HANDLER
function getFilmRecommendations(req, res) {
    res.status(500).send('Not Implemented');
}

module.exports = app;
