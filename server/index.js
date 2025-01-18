"use strict";
const express = require("express");
const cors = require("cors");
const getJson = require("get-json");
const fs = require("fs");

const app = express();
const port = 3002;

const apiKey = "6edf9f5cac6b4a7081467ffbb82819ac";

const todoFilePath = "../data/todo.json";
const favoritesFilePath = "../data/favorites.json";

app.use(express.json());

app.use(
  cors({
    origin: "http://localhost:3000",
  })
);

const path = require("path");

// Serve static files from the client directory
app.use(express.static(path.join(__dirname, "../client")));

// Fallback to serve index.html for non-API routes
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "../client/index.html"));
});

app.get("/recipes/complexSearch", (req, res) => {
  const queryParams = {
    apiKey: apiKey,
    instructionsRequired: true,
    sort: "calories",
    sortDirection: "desc",
  };

  // Check and add parameters with values to queryParams
  if (req.query.query) queryParams.query = req.query.query;
  if (req.query.cuisine) queryParams.cuisine = req.query.cuisine;
  if (req.query.includeIngredients)
    queryParams.includeIngredients = req.query.includeIngredients;
  if (req.query.excludeIngredients)
    queryParams.excludeIngredients = req.query.excludeIngredients;
  if (req.query.equipment) queryParams.equipment = req.query.equipment;
  if (req.query.maxReadyTime) queryParams.maxReadyTime = req.query.maxReadyTime;

  const queryString = new URLSearchParams(queryParams).toString();

  const apiUrl =
    `https://api.spoonacular.com/recipes/complexSearch?` + queryString;

  getJson(apiUrl, (err, data) => {
    res.send(data);
  });
});

// Get instructions for a recipe
app.get("/instructions/id", (req, res) => {
  const recipeId = req.query.id;

  const apiUrl =
    `https://api.spoonacular.com/recipes/${recipeId}/analyzedInstructions` +
    `?apiKey=${apiKey}`;

  getJson(apiUrl, (err, data) => {
    res.send(data);
  });
});

// Get ingredients for a recipe
app.get("/ingredients/id", (req, res) => {
  const recipeId = req.query.id;

  const apiUrl =
    `https://api.spoonacular.com/recipes/${recipeId}/ingredientWidget.json` +
    `?apiKey=${apiKey}`;

  getJson(apiUrl, (err, data) => {
    res.send(data);
  });
});

function readTodoList() {
  const data = fs.readFileSync(todoFilePath);
  return JSON.parse(data);
}

function writeTodoList(todoList) {
  fs.writeFileSync(todoFilePath, JSON.stringify(todoList));
}

// Get all todos
app.get("/todos", (req, res) => {
  const todoList = readTodoList();
  res.send(todoList);
});

// Add a todo
app.post("/todos", (req, res) => {
  const todoList = readTodoList();
  const newTodo = req.body.todo;
  todoList.push(newTodo);
  writeTodoList(todoList);
  res.send("Todo added successfully");
});

// Update a todo item
app.put("/todos/:id", (req, res) => {
  const todoList = readTodoList();
  const todoId = parseInt(req.params.id);
  const updatedTodo = req.body.todo;

  // Validate if the todo exists
  if (!todoList[todoId]) {
    return res.status(404).send("Todo not found");
  }

  todoList[todoId] = updatedTodo;
  writeTodoList(todoList);
  res.send("Todo updated successfully");
});

// Delete a todo item
app.delete("/todos/:id", (req, res) => {
  const todoList = readTodoList();
  const todoId = parseInt(req.params.id);

  // Validate if the todo exists
  if (!todoList[todoId]) {
    return res.status(404).send("Todo not found");
  }

  todoList.splice(todoId, 1);
  writeTodoList(todoList);
  res.send("Todo deleted successfully");
});

function readFavorites() {
  const data = fs.readFileSync(favoritesFilePath);
  return JSON.parse(data);
}

function writeFavorites(favorites) {
  fs.writeFileSync(favoritesFilePath, JSON.stringify(favorites));
}

// Get recipe title & image
app.get("/recipes/info/id", (req, res) => {
  const recipeId = req.query.id;
  const apiUrl =
    `https://api.spoonacular.com/recipes/${recipeId}/information` +
    `?apiKey=${apiKey}`;
  getJson(apiUrl, (err, data) => {
    res.send(data);
  });
});

// Add recipe to favorites
app.post("/favorites", (req, res) => {
  const newFavorite = req.body.favorite;
  const favorites = readFavorites();

  // Check if the recipe already exists in favorites by recipeId
  const existingFavorite = favorites.find(
    (favorite) => favorite.recipeId === newFavorite.recipeId
  );

  if (existingFavorite) {
    // If the recipe already exists, do nothing and return
    res.send("Recipe already exists in favorites");
  } else {
    favorites.push(newFavorite);
    writeFavorites(favorites);
    res.send("Favorite added successfully");
  }
});

// Get favorites list
app.get("/favorites", (req, res) => {
  const favorites = readFavorites();
  res.send(favorites);
});

// Delete a recipe from favorites list
app.delete("/favorites/:id", (req, res) => {
  const favorites = readFavorites();
  const recipeId = req.params.id;

  // Find the index of the recipe to remove
  const index = favorites.findIndex((recipe) => recipe.recipeId === recipeId);

  if (index !== -1) {
    favorites.splice(index, 1); // Remove the recipe from favorites
    writeFavorites(favorites); // Update the favorites list
    res.send("Recipe removed from favorites");
  } else {
    res.status(404).send("Recipe not found in favorites");
  }
});

app.listen(port, () => {
  console.log("Listening on port:  " + port);
});
