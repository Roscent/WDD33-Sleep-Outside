const TMDB_API_KEY = '27717c9cdc7f29da08cfe97efab4fcf8';
const WATCHMODE_API_KEY = '27717c9cdc7f29da08cfe97efab4fcf8';

const searchScreen = document.getElementById('searchScreen');
const resultsScreen = document.getElementById('resultsScreen');
const searchInput = document.getElementById('searchInput');
const searchBtn = document.getElementById('searchBtn');
const searchSuggestions = document.getElementById('searchSuggestions');
const popularMovies = document.getElementById('popularMovies');
const backBtn = document.getElementById('backBtn');
const originalMovie = document.getElementById('originalMovie');
const resultsGrid = document.getElementById('resultsGrid');
const loadingState = document.getElementById('loadingState');

let currentSearchQuery = '';
let selectedMovie = null;
let watchlist = JSON.parse(localStorage.getItem('cinematch-watchlist')) || [];

document.addEventListener('DOMContentLoaded', () => {
loadPopularMovies();
setupEventListeners();
});

function setupEventListeners() {
searchInput.addEventListener('input', debounce(handleSearchInput, 300));
searchInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
performSearch();
    }
});

searchBtn.addEventListener('click', performSearch);

backBtn.addEventListener('click', () => {
resultsScreen.style.display = 'none';
searchScreen.style.display = 'block';
});

document.getElementById('loginBtn').addEventListener('click', () => {
alert('Login functionality would be implemented here');
});
}

function debounce(func, wait) {
let timeout;
return function executedFunction(...args) {
    const later = () => {
clearTimeout(timeout);
func(...args);
    };
clearTimeout(timeout);
timeout = setTimeout(later, wait);
};
}

async function handleSearchInput() {
const query = searchInput.value.trim();
if (query.length < 2) {
searchSuggestions.style.display = 'none';
return;
}

try {
    const movies = await searchMovies(query);
displaySearchSuggestions(movies);
} catch (error) {
console.error('Error fetching search suggestions:', error);
}
}

async function performSearch() {
const query = searchInput.value.trim();
if (!query) return;

currentSearchQuery = query;

try {
loadingState.style.display = 'block';
searchScreen.style.display = 'none';
resultsScreen.style.display = 'none';

const movies = await searchMovies(query);
if (movies.length === 0) {
        throw new Error('No movies found with that title');
    }

selectedMovie = movies[0];

const similarMovies = await getSimilarMovies(selectedMovie.id);

displayResults(selectedMovie, similarMovies);
    
} catch (error) {
console.error('Error performing search:', error);
showError('Sorry, we encountered an error while searching. Please try again.');
} finally {
loadingState.style.display = 'none';
}
}

async function loadPopularMovies() {
try {
    const popularMoviesData = [
{id: 155, title: 'The Dark Knight', poster_path: '/qJ2tW6WMUDux911r6m7haRef0WH.jpg' },
{id: 27205, title: 'Inception', poster_path: '/9gk7adHYeDvHkCSEqAvQNLV5Uge.jpg' },
{id: 680, title: 'Pulp Fiction', poster_path: '/d5iIlFn5s0ImszYzBPb8JPIfbXD.jpg' },
{id: 13, title: 'Forrest Gump', poster_path: '/arw2vcBveWOVZr6pxd9XTd1TdQa.jpg' },
{id: 238, title: 'The Godfather', poster_path: '/3bhkrj58Vtu7enYsRolD1fZdja1.jpg' },
{id: 157336, title: 'Interstellar', poster_path: '/gEU2QniE6E77NI6lCU6MxlNBvIx.jpg' }
];

displayPopularMovies(popularMoviesData);
} catch (error) {
console.error('Error loading popular movies:', error);
}
}

function displayPopularMovies(movies) {
popularMovies.innerHTML = '';

movies.forEach(movie => {
    const movieCard = document.createElement('div');
movieCard.className = 'movie-card';
movieCard.innerHTML = `
<img src="https://image.tmdb.org/t/p/w500${movie.poster_path}" alt="${movie.title}" class="movie-poster">
<div class="movie-info">
  <div class="movie-title">${movie.title}</div>
  <div class="movie-actions">
    <button class="heart-btn ${isInWatchlist(movie.id) ? 'active' : ''}" data-id="${movie.id}">❤</button>
  </div>
</div>
`;

    movieCard.addEventListener('click', () => {
  searchInput.value = movie.title;
performSearch();
    });

const heartBtn = movieCard.querySelector('.heart-btn');
    heartBtn.addEventListener('click', (e) => {
  e.stopPropagation();
toggleWatchlist(movie.id, movie.title, movie.poster_path);
heartBtn.classList.toggle('active');
    });

popularMovies.appendChild(movieCard);
});
}

function displaySearchSuggestions(movies) {
  searchSuggestions.innerHTML = '';

if (movies.length === 0) {
  searchSuggestions.style.display = 'none';
return;
}

movies.slice(0, 5).forEach(movie => {
    const suggestionItem = document.createElement('div');
suggestionItem.className = 'suggestion-item';
suggestionItem.textContent = `${movie.title} (${new Date(movie.release_date).getFullYear()})`;
    
    suggestionItem.addEventListener('click', () => {
  searchInput.value = movie.title;
searchSuggestions.style.display = 'none';
performSearch();
    });

searchSuggestions.appendChild(suggestionItem);
});

searchSuggestions.style.display = 'block';
}

async function displayResults(originalMovieData, similarMovies) {
  originalMovie.textContent = originalMovieData.title;

resultsGrid.innerHTML = '';

const filteredMovies = similarMovies
    .filter(movie => movie.vote_average >= 6.0)
    .sort((a, b) => (b.vote_average * b.popularity) - (a.vote_average * a.popularity))
.slice(0, 8);

for (const movie of filteredMovies) {
    const movieCard = await createMovieCard(movie);
resultsGrid.appendChild(movieCard);
}

resultsScreen.style.display = 'block';
searchScreen.style.display = 'none';
}

async function createMovieCard(movie) {
const card = document.createElement('div');
card.className = 'result-card';

const streamingServices = await getStreamingAvailability(movie.id);

let badgesHTML = '';
if (streamingServices.length > 0) {
  streamingServices.slice(0, 3).forEach(service => {
    badgesHTML += `<span class="badge">${service}</span>`;
  });
    
    if (streamingServices.length > 3) {
  badgesHTML += `<span class="badge">+${streamingServices.length - 3}</span>`;
    }
} else {
  badgesHTML = '<span class="badge not-available">Not Available</span>';
}

card.innerHTML = `
<img src="https://image.tmdb.org/t/p/w500${movie.poster_path}" alt="${movie.title}" class="result-poster">
  <div class="result-info">
    <div class="result-title">${movie.title}</div>
    <div class="result-year">${new Date(movie.release_date).getFullYear()}</div>
    <div class="streaming-badges">${badgesHTML}</div>
    <div class="movie-actions">
      <button class="heart-btn ${isInWatchlist(movie.id) ? 'active' : ''}" data-id="${movie.id}">❤</button>
    </div>
  </div>
  <div class="movie-overview">${movie.overview || 'No overview available.'}</div>
  `;

  const heartBtn = card.querySelector('.heart-btn');
heartBtn.addEventListener('click', () => {
    toggleWatchlist(movie.id, movie.title, movie.poster_path);
  heartBtn.classList.toggle('active');
});

  return card;
}

  async function searchMovies(query) {
return new Promise((resolve) => {
    setTimeout(() => {
      const mockMovies = [
        { id: 155, title: 'The Dark Knight', release_date: '2008-07-18', poster_path: '/qJ2tW6WMUDux911r6m7haRef0WH.jpg' },
        { id: 27205, title: 'Inception', release_date: '2010-07-16', poster_path: '/9gk7adHYeDvHkCSEqAvQNLV5Uge.jpg' },
        { id: 680, title: 'Pulp Fiction', release_date: '1994-10-14', poster_path: '/d5iIlFn5s0ImszYzBPb8JPIfbXD.jpg' },
        { id: 13, title: 'Forrest Gump', release_date: '1994-07-06', poster_path: '/arw2vcBveWOVZr6pxd9XTd1TdQa.jpg' },
        { id: 238, title: 'The Godfather', release_date: '1972-03-14', poster_path: '/3bhkrj58Vtu7enYsRolD1fZdja1.jpg' }
      ];

      const filteredMovies = mockMovies.filter(movie =>
        movie.title.toLowerCase().includes(query.toLowerCase())
      );

      resolve(filteredMovies);
    }, 500);
});
}

  async function getSimilarMovies(movieId) {
return new Promise((resolve) => {
    setTimeout(() => {
      const mockSimilarMovies = [
        {
          id: 27205,
          title: 'Inception',
          release_date: '2010-07-16',
          vote_average: 8.4,
          popularity: 78.489,
          poster_path: '/9gk7adHYeDvHkCSEqAvQNLV5Uge.jpg',
          overview: 'A thief who steals corporate secrets through the use of dream-sharing technology is given the inverse task of planting an idea into the mind of a C.E.O.'
        },
        {
          id: 157336,
          title: 'Interstellar',
          release_date: '2014-11-07',
          vote_average: 8.6,
          popularity: 65.321,
          poster_path: '/gEU2QniE6E77NI6lCU6MxlNBvIx.jpg',
          overview: 'A team of explorers travel through a wormhole in space in an attempt to ensure humanity\'s survival.'
        },
        {
          id: 76341,
          title: 'Mad Max: Fury Road',
          release_date: '2015-05-15',
          vote_average: 7.9,
          popularity: 45.678,
          poster_path: '/8tZYtuWezp8JbcsvHYO0O46tFbo.jpg',
          overview: 'In a post-apocalyptic wasteland, a woman rebels against a tyrannical ruler in search for her homeland with the aid of a group of female prisoners, a psychotic worshiper, and a drifter named Max.'
        },
        {
          id: 299534,
          title: 'Avengers: Endgame',
          release_date: '2019-04-26',
          vote_average: 8.3,
          popularity: 89.123,
          poster_path: '/or06FN3Dka5tukK1e9sl16pB3iy.jpg',
          overview: 'After the devastating events of Avengers: Infinity War, the universe is in ruins. With the help of remaining allies, the Avengers assemble once more in order to reverse Thanos\' actions and restore balance to the universe.'
        },
        {
          id: 299536,
          title: 'Avengers: Infinity War',
          release_date: '2018-04-27',
          vote_average: 8.3,
          popularity: 76.543,
          poster_path: '/7WsyChQLEftFiDOVTGkv3hFpyyt.jpg',
          overview: 'As the Avengers and their allies have continued to protect the world from threats too large for any one hero to handle, a new danger has emerged from the cosmic shadows: Thanos.'
        },
        {
          id: 284052,
          title: 'Doctor Strange',
          release_date: '2016-11-04',
          vote_average: 7.4,
          popularity: 34.567,
          poster_path: '/4PiiNGXj1KENTmCBHeN6Mskj2Fq.jpg',
          overview: 'After his career is destroyed, a brilliant but arrogant surgeon gets a new lease on life when a sorcerer takes him under her wing and trains him to defend the world against evil.'
        },
        {
          id: 1771,
          title: 'Captain America: The First Avenger',
          release_date: '2011-07-22',
          vote_average: 7.0,
          popularity: 23.456,
          poster_path: '/vSNxAJTlD0r02V9sPYpOjqDZXUK.jpg',
          overview: 'During World War II, Steve Rogers is a sickly man from Brooklyn who\'s transformed into super-soldier Captain America to aid in the war effort.'
        },
        {
          id: 1726,
          title: 'Iron Man',
          release_date: '2008-05-02',
          vote_average: 7.6,
          popularity: 43.210,
          poster_path: '/78lPtwv72eTNqFW9COBYI0dWDJa.jpg',
          overview: 'After being held captive in an Afghan cave, billionaire engineer Tony Stark creates a unique weaponized suit of armor to fight evil.'
        }
      ];

      resolve(mockSimilarMovies);
    }, 800);
});
}

  async function getStreamingAvailability(movieId) {
return new Promise((resolve) => {
    setTimeout(() => {
      const services = ['Netflix', 'Hulu', 'Prime', 'Max', 'Disney+', 'Paramount+'];
      const count = Math.floor(Math.random() * 4);
      const selectedServices = [];

      for (let i = 0; i < count; i++) {
        const randomIndex = Math.floor(Math.random() * services.length);
        if (!selectedServices.includes(services[randomIndex])) {
          selectedServices.push(services[randomIndex]);
        }
      }

      resolve(selectedServices);
    }, 300);
});
}

  function isInWatchlist(movieId) {
return watchlist.some(item => item.id === movieId);
}

  function toggleWatchlist(movieId, title, posterPath) {
if (isInWatchlist(movieId)) {
    watchlist = watchlist.filter(item => item.id !== movieId);
} else {
    watchlist.push({
      id: movieId,
      title: title,
      poster_path: posterPath,
      addedAt: new Date().toISOString()
    });
}

  localStorage.setItem('cinematch-watchlist', JSON.stringify(watchlist));
}

  function showError(message) {
const errorEl = document.createElement('div');
  errorEl.className = 'error-message';
  errorEl.textContent = message;

  const container = document.querySelector('.container');
  container.insertBefore(errorEl, container.firstChild);

setTimeout(() => {
    errorEl.remove();
}, 5000);
}