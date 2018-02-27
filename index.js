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
    // DECLARE QUERY RESPONSE
    let responseData = {
        recommendations: [],
        meta: {
            limit: 10,
            offset: 0
        }
    };
    let matchingFilms;

    // SET OFFSET & LIMIT
    if (req.query.offset && parseInt(req.query.offset) >= 0) {
        responseData.meta.offset = parseInt(req.query.offset);
    };
    if (req.query.limit && parseInt(req.query.limit) >= 0) {
        responseData.meta.limit = parseInt(req.query.limit);
    };

    // FIND TARGET FILM BY ID
    Film.findById(req.params.id)
        .then((film) => {
          // HANDLE NULL OR INVALID ID
            if (film === null) {
                res.status(422).send({
                    message: "film doesn't exist"
                });
                throw "invalid film id";
            };
            // DELCARE OBJECT WITH FILM DATA
            let filmObject = film.dataValues;
            return filmObject;
        })
        .then((filmObject) => {
            // ASSOCIATE FILMS MODEL WITH TARGET'S GENRE MODEL
            Film.belongsTo(Genre, {
                foreignKey: 'genre_id'
            });
            // SET RELEASE DATE RANGE +- 15 years FROM TARGET FILM
            let releaseDate = new Date(filmObject.release_date);
            let maxRange = `${releaseDate.getFullYear() + 15}-${releaseDate.getMonth()}-${releaseDate.getDate()}`;
            let minRange = `${releaseDate.getFullYear() - 15}-${releaseDate.getMonth()}-${releaseDate.getDate()}`;
            // FIND FILMS, INCLUDING GENRE TABLE DATA, WITHIN RELEASEDATE RANGE & MATCHING GENRE
            return Film.findAll({
                include: [{
                    model: Genre
                }],
                attributes: ['id', 'title', ['release_date', 'releaseDate']],
                where: {
                    genre_id: filmObject.genre_id,
                    release_date: {
                        $between: [minRange, maxRange]
                    }
                }
            });
        })
        .then((relatedFilms) => {
          // CREATE ARRAY OF MATCHING FILMS
            let filmIds = [];
            matchingFilms = relatedFilms.map(function(i) {
                return i.dataValues;
            })
            relatedFilms.forEach((film) => {
                filmIds.push(film.id);
            })
            return filmIds;
        })
        .then((filmIds) => {
            // USE 3RD PARTY API TO QUERY VIA FILMIDS
            request(`http://credentials-api.generalassemb.ly/4576f55f-c427-4cfc-a11c-5bfe914ca6c1?films=${filmIds}`, function(err, response, body) {
                // CAPTURE QUERY RESPONSE
                let movieReviews = JSON.parse(response.body);
                movieReviews.forEach((movie) => {
                    // SELECT MOVIES WITH AT LEAST 5 REVIEWS
                    if (movie.reviews.length >= 5) {
                        let avgRating = 0;
                        movie.reviews.forEach((review, i) => {
                            // CALCULATE AVERAGE RATING
                            avgRating += review.rating;
                            if (i === movie.reviews.length - 1) {
                                avgRating = Number(Math.round((avgRating / movie.reviews.length) + 'e2') + 'e-2');
                                // SELECT MOVIES WITH >=4 RATING
                                if (avgRating >= 4.0) {
                                    matchingFilms.find((film, i) => {
                                        if (film.id === movie.film_id) {
                                            // ADD FOUND/CALCULATED DATA ON THE MOVIE AND PUSH TO RECOMMENDATIONS
                                            matchingFilms[i].averageRating = avgRating;
                                            matchingFilms[i].reviews = movie.reviews.length;
                                            matchingFilms[i].genre = matchingFilms[i].genre.name;
                                            responseData.recommendations.push(matchingFilms[i]);
                                            return true;
                                        };
                                    });
                                };
                            };
                        });
                    };
                })
                handleOffsetAndLimit();
            });
        }).catch((err) => {
            console.log(err)
        });

    // OFFSET FOR PAGINATION AND LIMIT FOR RETURNED RECORDS
    let handleOffsetAndLimit = () => {
        // SET OFFSET
        if (responseData.meta.offset > 0) {
            responseData.recommendations.splice(0, responseData.meta.offset);
        };
        // SET LIMIT
        if (responseData.recommendations.length > responseData.meta.limit) {
            responseData.recommendations.splice(responseData.meta.limit, responseData.recommendations.length - responseData.meta.limit)
        };
        // SEND RESPONSE
        sendRecommendations();
    };
    let sendRecommendations = () => {
        res.status(200).json(responseData)
    };
}

module.exports = app;
