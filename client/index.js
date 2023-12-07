$(document).ready(function() {
    $('#cardModalContainer').hide();
    $('#shoppingListContainer').hide();
    $('#favoritesContainer').hide()

    // Manageing closing and showing popups
    let activePopup = [];

    $('.close').click(function() {
        if (activePopup.length > 0) {
            const lastPopup = activePopup[activePopup.length - 1]; // Get the last active popup
            $(`#${lastPopup}`).hide(); // Hide the last active popup
            activePopup.pop(); // Remove the last item from the activePopup array
        }
    });
    
    function showPopup(popupId) {
        $(`#${popupId}`).show(); // Show the specified popup
        activePopup.push(popupId); // Add the popupId to the activePopup array
    }    

    // Setting today's date
    const currentDateElement = $('#currentDate');
    const currentDate = new Date();
    const options = { weekday: 'long'};
    const formattedDate = currentDate.toLocaleDateString('en-US', options);
    currentDateElement.text(`${formattedDate}`);

    // Get recipe list
    $("#submit-btn").click(function() {
        // Get origin and destination zipcodes from input fields
        var query = $("#recipe").val();
        var cuisine = $("#cuisine").val();
        var includeIngredients = $("#include").val();
        var excludeIngredients = $("#exclude").val();
        var equipment = $("#equipment").val();
        var maxReadyTime = $("#time").val();

        // Empty input fields after submit
        $("#recipe").val('');
        $("#cuisine").val('');
        $("#include").val('');
        $("#exclude").val('');
        $("#equipment").val('');
        $("#time").val('');

        var queryParams = {};

        // Check if parameters are not blank and assign them to queryParams object
        if (query !== '') {
            queryParams.query = query;
        }
        if (cuisine !== '') {
            queryParams.cuisine = cuisine;
        }
        if (includeIngredients !== '') {
            queryParams.includeIngredients = includeIngredients;
        }
        if (excludeIngredients !== '') {
            queryParams.excludeIngredients = excludeIngredients;
        }
        if (equipment !== '') {
            queryParams.equipment = equipment;
        }

        if (maxReadyTime !== '') {
            queryParams.maxReadyTime = maxReadyTime;
        }

        // Constructing the query string
        var queryString = $.param(queryParams);

        $.get("http://localhost:3002/recipes/complexSearch?" + queryString)
        .done(function(response) {
            if (response.results.length > 0) {
                displayRecipes(response.results);
            } else {
                $("#result").html('<div id="result"><p class="small-text">No recipes found. Please consider adjusting your filters.</p></div>');
            }
            
        })
        .fail(function() {
          $("#result").html('<p class="error">Error getting recipe data. Please try again later.</p>');
        });
    });

    // Display recipe list
    function displayRecipes(recipes) {
        const cardsPerPage = 6; // 3 cards in a row, 2 rows maximum
        const pageCount = Math.ceil(recipes.length / cardsPerPage);
        let currentPage = 1;
        showPage(currentPage);

        function showPage(page) {
            const startIndex = (page - 1) * cardsPerPage;
            const endIndex = startIndex + cardsPerPage;
            const paginatedRecipes = recipes.slice(startIndex, Math.min(endIndex, recipes.length));

            let html = '<div class="row row-cols-3 g-5">';

            paginatedRecipes.forEach(recipe => {
                html += `
                <div class="col">
                    <div class="card" id="${recipe.id}">
                        <img src="${recipe.image}" class="card-img-top" alt="${recipe.title}">
                        <div class="card-body">
                            <h5 class="card-title">${recipe.title}</h5>
                            <p class="card-text">Calories: ${recipe.nutrition.nutrients[0].amount} ${recipe.nutrition.nutrients[0].unit}</p>
                        </div>
                    </div>
                </div>`;
            });

            html += '</div>';

            $("#result").html(html);
            createPaginationButtons();
        }

        function createPaginationButtons() {
            let paginationHTML = '<br><br><nav aria-label="Page navigation example"><ul class="pagination pagination-lg justify-content-center">';

            for (let i = 1; i <= pageCount; i++) {
                paginationHTML += `<li class="page-item"><a class="page-link" href="#result">${i}</a></li>`;
            }

            paginationHTML += '</ul></nav>';

            $("#result").append(paginationHTML);

            $(".page-link").click(function() {
                // Get the current page number
                currentPage = parseInt($(this).text());
                showPage(currentPage);
            });
        }

        
    }

    // Get instructions
    $("#result").on("click", ".card", function() {
        const recipeId = $(this).attr('id');
        $("#add-fav-btn").data('recipeId', recipeId);
        $("#add-shop-btn").data('recipeId', recipeId);

        $.get("http://localhost:3002/instructions/id?id=" + recipeId)
        .done(function(response) {
            displayCard(response);
            showPopup('cardModalContainer');
        })
        .fail(function(error) {
            console.error(error);
        });
    });
    
    // Display instructions card
    function displayCard(results) {
        // Get steps from API response
        const steps = results[0].steps;
        // Get the div for displaying steps in HTML
        const recipeSteps = $("#steps");
        // Clear previous steps
        recipeSteps.empty()


        steps.forEach(step => {
            const li = `<p><strong>Step ${step.number}:</strong> ${step.step}</p>`;
            recipeSteps.append(li);
        });
    }

    // Add the ingredients as a new item to to todo list
    $("#add-shop-btn").click(function () {
        const recipeId = $(this).data('recipeId');
        $.get("http://localhost:3002/ingredients/id?id=" + recipeId)
            .done(function (response) {
                const ingredients = response.ingredients;
                
                // Process ingredients to create a single string for the to-do list
                const formattedIngredients = ingredients.map(ingredient => {
                    const usAmount = ingredient.amount.us.value;
                    const usUnit = ingredient.amount.us.unit;
                    return `${usAmount} ${usUnit} ${ingredient.name}`;
                }).join(', ');

                const request = { todo: formattedIngredients };

                $.ajax({
                    url: "http://localhost:3002/todos",
                    method: "POST",
                    contentType: "application/json",
                    data: JSON.stringify(request),
                    success: function () {
                        fetchTodos(); // Fetch and display updated todos
                    },
                    error: function (error) {
                        console.error(error);
                    }
                });
            })
            .fail(function (error) {
                console.error(error);
            });
    
    });

    // Show todo list
    $("#shopping-btn").click(function () {
        fetchTodos(); // Fetch and display todos
        showPopup('shoppingListContainer'); 
    });

    // Get todos from the server
    function fetchTodos() {
        $.get("http://localhost:3002/todos")
        .done(function (todos) {
            displayTodos(todos);
        })
        .fail(function (error) {
            console.error(error);
        });
    }
  
    // Display todos on the UI
    function displayTodos(todos) {
        const $todoList = $('#todoList');
        $todoList.empty(); // Clear previous list
    
        todos.forEach((todo, index) => {
        const listItem = $(`
            <li class="list-group-item">
                <div class="form-check">
                    <button class="delete-btn" data-id="${index}"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-trash" viewBox="0 0 16 16">
                    <path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5m2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5m3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0z"/>
                    <path d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4zM2.5 3h11V2h-11z"/>
                  </svg></button>
                    <p class="small-text todoItem" contenteditable="true" data-id="${index}">${todo}</p>
                </div>
            </li>
        `);
        $todoList.append(listItem);
        });
    
        attachEventListeners(); // Attach event listeners after fetching todos
    }
    
    // Attach event listeners after fetching todos
    function attachEventListeners() {
        $('.todoItem').on('click', function() {
            $(this).attr('contenteditable', true).focus();
        });
        
        $('.todoItem').on('blur', function() {
            $(this).attr('contenteditable', false);
            const id = $(this).data('id');
            updateTodoText(id, $(this).text());
        });

        $('.delete-btn').click(function() {
            const id = $(this).data('id');
            deleteTodoItem(id);
        });
    }

    // Update the text of a todo item
    function updateTodoText(id, newText) {
        $.ajax({
            url: `http://localhost:3002/todos/${id}`,
            method: 'PUT',
            contentType: 'application/json',
            data: JSON.stringify({ todo: newText }),
            success: function () {
                fetchTodos(); // Fetch updated todos after updating
            },
            error: function (error) {
                console.error('Error updating todo:', error);
            }
        });
    }

    // Delete a todo item
    function deleteTodoItem(id) {
        $.ajax({
            url: `http://localhost:3002/todos/${id}`,
            method: 'DELETE',
            success: function () {
                fetchTodos(); // Fetch updated todos after deletion
            },
            error: function (error) {
                console.error('Error deleting todo:', error);
            }
        });
    }

    // Add to favorites button click event
    $('#add-fav-btn').click(function() {
        const recipeId = $(this).data('recipeId');

        // Get recipe title & image by ID
        $.get(`http://localhost:3002/recipes/info/id?id=${recipeId}`)
        .done(function(recipeDetails) {
            const title = recipeDetails.title;
            const image = recipeDetails.image;
            const newFavorite = { recipeId, title, image }; // Create a new favorite object

            // Add the new favorite recipe to the favorites list
            $.ajax({
                url: "http://localhost:3002/favorites",
                method: "POST",
                contentType: "application/json",
                data: JSON.stringify({ favorite: newFavorite }),
                success: function () {
                    fetchFavorites(); // Fetch updated favorites after adding
                },
                error: function (error) {
                    console.error(error);
                }
            });
        })
        .fail(function(error) {
            console.error(error);
        });
    });

     // Show favorites list
     $("#favorites-btn").click(function () {
        fetchFavorites(); // Fetch and display favorites
        showPopup('favoritesContainer'); // Show favorites popup
    });

    // Fetch and display favorites list
    function fetchFavorites() {
        $.get("http://localhost:3002/favorites")
        .done(function (favorites) {
            favoriteRecipes = favorites;
            displayFavorites(favoriteRecipes);
        })
        .fail(function (error) {
            console.error(error);
        });
    }

    // Display favorites list
    function displayFavorites(recipes) {
        const favoritesList = $('#favoritesList');
        
        let html = '<div class="row row-cols-2 g-5">';

        if (recipes.length === 0) {
            favoritesList.html(`<div id="favoritesList"><p class="small-text">No favorite recipes yet! Try exploring recipes by filling out the filters.</p></div>`);
        } else {
            recipes.forEach(recipe => {
                html += `
                <div class="col">
                    <div class="card" id="${recipe.recipeId}">
                        <span class="heart-icon" data-id="${recipe.recipeId}">💟</span>
                        <img src="${recipe.image}" class="card-img-top" alt="${recipe.title}">
                        <div class="card-body">
                            <h5 class="card-title">${recipe.title}</h5>
                        </div>
                    </div>
                </div>`;
            });

            html += '</div>';

            favoritesList.html(html);

            // Attach event listener for heart icon click
            $('.heart-icon').click(function(event) {
                event.stopPropagation();
                const recipeId = $(this).data('id');
                removeFromFavorites(recipeId);
            });
        }
    }

    // Function to remove a recipe from favorites
    function removeFromFavorites(recipeId) {
        // Send a DELETE request to the server to remove the recipe from favorites
        $.ajax({
            url: `http://localhost:3002/favorites/${recipeId}`,
            method: 'DELETE',
            success: function () {
                fetchFavorites(); // Fetch updated favorites after removal
            },
            error: function (error) {
                console.error('Error removing from favorites:', error);
            }
        });
    }

    // Show instructions card in My Favorites page
    $("#favoritesList").on("click", ".card", function() {
        const recipeId = $(this).attr('id');
        $("#add-fav-btn").data('recipeId', recipeId);
        $("#add-shop-btn").data('recipeId', recipeId);

        $.get("http://localhost:3002/instructions/id?id=" + recipeId)
        .done(function(response) {
            displayCard(response);
            showPopup('cardModalContainer');
        })
        .fail(function(error) {
            console.error(error);
        });
    });
});
  