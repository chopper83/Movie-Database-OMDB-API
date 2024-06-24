import express from "express";
import bodyParser from "body-parser";
import axios from "axios";
import pg from "pg";
import defaultMovieList from "./default-movie-list.js";

let movies = defaultMovieList;

const port = 3000;
const app = express();
const API_URL = "https://www.omdbapi.com";
const apikey = "9392568c";

const db = new pg.Client({
    user: "postgres",
    host: "localhost",
    database: "world",
    password: "helicopter",
    port: 5432,
});

db.connect();

app.use(express.static("public"));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

app.get("/", async (req, res) => {
    const result = await db.query("select * from reviews");
    const reviews = result.rows;

    movies = movies.map(movie => {
        const review = reviews.find(r => movie.imdbID === r.imdbid);
        if (review) {
            movie.Review = review.review;
            movie.Rating = review.rating;
        } else {
            movie.Review = null;
            movie.Rating = 0;
        }
        return movie;
    });

    res.render("index.ejs", { movies: movies });
});

app.post("/edit-review", async (req, res) => {
    const { id, rating, review } = req.body;
    try {
        const movie = await db.query("SELECT * FROM reviews WHERE imdbid = $1", [id]);
        
        if (movie.rows.length > 0) {
            await db.query("UPDATE reviews SET review = $1, rating = $2 WHERE imdbid = $3", [review, rating, id]);
        } else {
            await db.query("INSERT INTO reviews (imdbid, review, rating) VALUES ($1, $2, $3)", [id, review, rating]);
        }
  
        res.json({ success: true });
    } catch (err) {
        console.error("Error saving review:", err);
        res.status(500).json({ success: false });
    }
});

app.get("/search", async (req, res) => {
    try {
        const title = req.query.title;
        const result = await axios.get(`https://www.omdbapi.com/?apikey=${apikey}&s=${title}&page=1`);
        const data = result.data.Search || [];

        const reviewsResult = await db.query("SELECT * FROM reviews");
        const reviews = reviewsResult.rows;

        const moviesWithReviews = data.map(movie => {
            const review = reviews.find(r => movie.imdbID === r.imdbid);
            return {
                ...movie,
                Review: review ? review.review : null,
                Rating: review ? review.rating : 0
            };
        });

        res.render("review.ejs", { movies: moviesWithReviews, reviews: reviews });
    } catch (err) {
        console.error("Error fetching data:", err);
        res.status(500).send("Error fetching data.");
    }
});

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});
