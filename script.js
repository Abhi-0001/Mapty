'use strict';

// prettier-ignore
const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

const form = document.querySelector('.form');
const containerWorkouts = document.querySelector('.workouts');
const inputType = document.querySelector('.form__input--type');
const inputDistance = document.querySelector('.form__input--distance');
const inputDuration = document.querySelector('.form__input--duration');
const inputCadence = document.querySelector('.form__input--cadence');
const inputElevation = document.querySelector('.form__input--elevation');
const delBtn = document.querySelector('.del-btn');
let map, mapEvent;

class Workout {
  date = `${new Intl.DateTimeFormat('en-US', {
    month: 'long',
  }).format(new Date())} ${new Date().getDate()}`;
  distanceUnit = 'km';
  durationUnit = 'min';
  id = (Date.now() + '').slice(-10);

  constructor(coords, distance, duration) {
    this.coords = coords;
    this.distance = distance;
    this.duration = duration;
  }
}
class Running extends Workout {
  type = 'running';
  icon = '🏃‍♂️';
  cadenceUnit = 'spm';
  movementUnit = 'min/km';
  moveIcon = '🦶';
  constructor(coords, distance, duration, cadence) {
    super(coords, distance, duration);
    this.cadence = cadence;
    this.calcPace();
  }
  calcPace() {
    this.pace = (this.duration / this.distance).toFixed(1);
  }
}
class Cycling extends Workout {
  type = 'cycling';
  icon = '🚴‍♂️';
  elevGainUnit = 'm';
  movementUnit = 'km/hr';
  moveIcon = '⛰';
  constructor(coords, distance, duration, elevGain) {
    super(coords, distance, duration);
    this.elevGain = elevGain;
    this.calcSpeed();
  }
  calcSpeed() {
    this.speed = (this.distance / this.duration).toFixed(1);
  }
}

////////////////////////
class App {
  #map;
  #mapEvent;
  #workouts = [];
  #zoomLevel = 13;
  constructor() {
    this.#getPosition();
    form.addEventListener('submit', this.#newWorkOut.bind(this));
    inputType.addEventListener('change', this.#toggleElevationField);
    containerWorkouts.addEventListener('click', this.#moveToPopup.bind(this));
  }

  #getPosition() {
    if (navigator.geolocation)
      navigator.geolocation.getCurrentPosition(
        this.#loadMap.bind(this),
        function () {
          alert(`can't find location.`);
        }
      );
  }

  #loadMap(position) {
    const { latitude } = position.coords;
    const { longitude } = position.coords;
    const coords = [latitude, longitude];
    this.#map = L.map('map').setView(coords, this.#zoomLevel);
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(this.#map);
    this.#map.on('click', this.#showForm.bind(this));

    // get local storage
    this.#getLocalStorage();
  }

  #showForm(mapE) {
    form.classList.remove('hidden');
    inputDistance.focus();
    this.#mapEvent = mapE;
  }
  #hideForm() {
    form.style.display = 'none';
    form.classList.add('hidden');
    setTimeout(() => (form.style.display = 'grid'), 1000);
  }

  #toggleElevationField() {
    inputCadence.closest('.form__row').classList.toggle('hidden');
    inputElevation.closest('.form__row').classList.toggle('hidden');
  }

  #newWorkOut(e) {
    e.preventDefault();
    // helper functions
    const isPositive = (...values) =>
      values.every(val => {
        if (val > 0) return true;
        else return false;
      });
    const isValid = (...values) => values.every(val => Number.isFinite(val));
    const emptyInputFields = function () {
      inputDistance.value =
        inputDuration.value =
        inputCadence.value =
        inputElevation.value =
          '';
    };

    const { lat, lng } = this.#mapEvent.latlng;
    // getting data from form
    const type = inputType.value;
    const distance = +inputDistance.value;
    const duration = +inputDuration.value;
    const elevGain = +inputElevation.value;
    const cadence = +inputCadence.value;
    let workout;

    // creating object according to type of workout
    if (type === 'cycling') {
      // validating
      if (
        !isValid(distance, duration, elevGain) ||
        !isPositive(distance, duration)
      )
        return alert(
          'all input must be positive number \n except elevation gain.'
        );
      workout = new Cycling([lat, lng], distance, duration, elevGain);
    } else {
      if (
        !isPositive(distance, duration, cadence) ||
        !isValid(distance, duration, cadence)
      )
        return alert('all inputs must be positive number.');
      workout = new Running([lat, lng], distance, duration, cadence);
    }

    // push workout into workouts array
    this.#workouts.push(workout);

    // set local storage
    this.#setLocalStorage();

    // render the marker on map
    this.#renderWorkoutMarker(workout);

    //render the worout tile
    this.#renderWorkoutTile(workout);

    emptyInputFields();
    this.#hideForm();
  }

  #renderWorkoutMarker(workout) {
    const popupContent = `${workout.icon} ${workout.type} on ${workout.date}`;

    L.marker(workout.coords, { riseOnHover: true })
      .addTo(this.#map)
      .bindPopup(
        L.popup({
          maxWidth: 250,
          minWidth: 100,
          maxHeight: 100,
          autoClose: false,
          closeOnClick: false,
          className: `${workout.type}-popup`,
        })
      )
      .setPopupContent(popupContent)
      .openPopup();
  }
  #renderWorkoutTile(workout) {
    const workoutType = workout.type;
    let movementValue, cadElev, cadElevUnit;
    if (workoutType === 'cycling') {
      movementValue = workout.speed;
      cadElev = workout.elevGain;
      cadElevUnit = workout.elevGainUnit;
    } else {
      movementValue = workout.pace;
      cadElev = workout.cadence;
      cadElevUnit = workout.cadenceUnit;
    }
    const html = `<li class="workout workout--${workout.type}" data-id="${workout.id}">
                <h2 class="workout_heading">${workout.type} on ${workout.date}</h2>
                <div class="workout__details">
                    <span class="workout_icon">${workout.icon}</span>
                    <span class="workout_value">${workout.distance}</span>
                    <span class="workout_unit">${workout.distanceUnit}</span>
                </div>
                <div class="workout__details">
                    <span class="workout_icon">⏱</span>
                    <span class="workout_value">${workout.duration}</span>
                    <span class="workout_unit">${workout.durationUnit}</span>
                </div>
                <div class="workout__details">
                    <span class="workout_icon">⚡️</span>
                    <span class="workout_value">${movementValue}</span>
                    <span class="workout_unit">${workout.movementUnit}</span>
                </div>
                <div class="workout__details">
                    <span class="workout_icon">${workout.moveIcon}</span>
                    <span class="workout_value">${cadElev}</span>
                    <span class="workout_unit">${cadElevUnit}</span>
                </div>
            </li>`;
    form.insertAdjacentHTML('afterend', html);
  }
  #moveToPopup(e) {
    const clickedWorkoutEl = e.target.closest('.workout');
    if (!clickedWorkoutEl) return;
    const workout = this.#workouts.find(
      work => work.id === clickedWorkoutEl.dataset.id
    );
    this.#map.setView(workout.coords, this.#zoomLevel, {
      animate: true,
      pan: {
        duration: 1,
      },
    });
  }
  #setLocalStorage() {
    localStorage.setItem('workouts', JSON.stringify(this.#workouts));
  }
  #getLocalStorage() {
    const data = JSON.parse(localStorage.getItem('workouts'));
    if (!data) return;
    this.#workouts = data;
    this.#workouts.forEach(workout => {
      this.#renderWorkoutTile(workout);
      this.#renderWorkoutMarker(workout);
    });
  }
  deleteWorkouts() {
    this.#workouts.splice(0, this.#workouts.length);
    localStorage.removeItem('workouts');
    this.#workouts.forEach(workout => {
      this.#renderWorkoutTile(workout);
      this.#renderWorkoutMarker(workout);
    });
    location.reload();
  }
}

const app = new App();

delBtn.addEventListener('click', app.deleteWorkouts.bind(app));
