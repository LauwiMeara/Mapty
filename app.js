'use strict';

import L from 'leaflet';
import { Hiking, Highlight } from './activities.js';

/////////////////////////
// Elements
const form = document.querySelector('.form');
const containerActivities = document.querySelector('.activities');
const inputType = document.querySelector('.form__input--type');
const inputDescription = document.querySelector('.form__input--description');
const inputHikingTrail = document.querySelector('.form__input--hiking-trail');
const inputDistance = document.querySelector('.form__input--distance');
const inputDuration = document.querySelector('.form__input--duration');

/////////////////////////
// App
export class App {
  map;
  mapEvent;
  zoom = 13;
  activities = [];
  activityTypes = {
    hiking: 'Hiking',
    highlight: 'Highlight',
  };
  selectedType = (inputType.value = this.activityTypes.hiking.toLowerCase());
  markers = {};

  coordsAmsterdam = [52.3546448, 4.8337495];

  constructor() {
    this._getPosition();
    this._getLocalStorage();
    this._addTypeOptions();

    form.addEventListener('submit', this._createActivity.bind(this));
    inputType.addEventListener('change', this._changeType.bind(this));
    containerActivities.addEventListener(
      'mouseover',
      this._toggleActivityOpacity
    );
    containerActivities.addEventListener(
      'mouseout',
      this._toggleActivityOpacity
    );
    containerActivities.addEventListener(
      'click',
      this._moveToMarker.bind(this)
    );
  }

  _addTypeOptions() {
    for (const key of Object.keys(this.activityTypes)) {
      const option = document.createElement('option');
      option.value = key;
      option.text = this.activityTypes[key];
      inputType.add(option);
    }
  }

  _changeType() {
    this.selectedType = inputType.value;

    const showElement = element =>
      element.closest('.form__row').classList.remove('form__row--hidden');
    const hideElement = element =>
      element.closest('.form__row').classList.add('form__row--hidden');

    switch (this.selectedType) {
      case this.activityTypes.hiking.toLowerCase():
        showElement(inputHikingTrail);
        showElement(inputDistance);
        showElement(inputDuration);
        hideElement(inputDescription);
        inputHikingTrail.focus();
        break;
      case this.activityTypes.highlight.toLowerCase():
        hideElement(inputHikingTrail);
        hideElement(inputDistance);
        hideElement(inputDuration);
        showElement(inputDescription);
        inputDescription.focus();
        break;
      default:
        alert('Select an activity type');
        break;
    }
  }

  _createActivity(e) {
    e.preventDefault();

    const validStrings = (...inputs) => inputs.every(input => input !== '');
    const validNumbers = (...inputs) =>
      inputs.every(input => Number.isFinite(input) && input > 0);

    let activity;

    switch (this.selectedType) {
      case this.activityTypes.hiking.toLowerCase():
        const hikingTrail = inputHikingTrail.value;
        const distance = Number(inputDistance.value);
        const duration = Number(inputDuration.value);

        if (!validStrings(hikingTrail))
          return alert('Fill in the hiking trail name');

        if (!validNumbers(distance, duration))
          return alert('Check the distance and duration');

        activity = new Hiking(
          this.mapEvent.latlng,
          hikingTrail,
          distance,
          duration
        );
        break;
      case this.activityTypes.highlight.toLowerCase():
        const description = inputDescription.value;

        if (!validStrings(description)) return alert('Describe the highlight');

        activity = new Highlight(this.mapEvent.latlng, description);
        break;
      default:
        alert('Select an activity type');
        break;
    }

    this.activities.push(activity);
    this._displayMarker(activity);
    this._displayActivity(activity);
    this._hideForm();
    this._setLocalStorage();
  }

  _createMap(coords = this.coordsAmsterdam) {
    this.map = L.map('map').setView(coords, this.zoom);

    L.tileLayer(
      'https://cartodb-basemaps-{s}.global.ssl.fastly.net/light_all/{z}/{x}/{y}.png',
      {
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      }
    ).addTo(this.map);

    this.map.on('click', this._showForm.bind(this));
    this.activities.forEach(a => this._displayMarker(a));
  }

  _deleteActivity(e) {
    const clickedActivity = e.target.closest('.activity');

    if (confirm('Do you want to delete the activity?')) {
      const id = clickedActivity.dataset.id;
      this.activities.forEach(a => {
        if (a.id === id) {
          // Delete from displayed list
          clickedActivity.remove();
          // Delete from map
          const marker = this.markers[id];
          this.map.removeLayer(marker);
          // Delete from array
          this.activities = this.activities.filter(activity => {
            return activity !== a;
          });
          // Delete from local storage
          this._setLocalStorage();
        }
      });
    } else return;
  }

  _displayActivity(activity) {
    let html = `
          <li class="activity activity--${activity.type}" data-id="${
      activity.id
    }">
            <div h2 class="activity__header">
              <span class="activity__title">${activity.type[0].toUpperCase()}${activity.type.slice(
      1
    )}: ${this._getDisplayedField(activity)}</span>
              <span class="activity__delete">❌</span> 
            </div>
            <div class="activity__details">
              <span class="activity__icon">📆</span>  
              <span class="activity__value"></span>
              <span class="activity__unit">${activity.dateString}</span>
            </div>`;

    switch (activity.type) {
      case this.activityTypes.hiking.toLowerCase():
        html += `
            <div class="activity__details">
              <span class="activity__icon">🥾</span>
              <span class="activity__value">${activity.distance}</span>
              <span class="activity__unit">km</span>
            </div>
            <div class="activity__details">
              <span class="activity__icon">⏱</span>
              <span class="activity__value">${activity.duration}</span>
              <span class="activity__unit">min</span>
            </div>
            <div class="activity__details">
              <span class="activity__icon">${
                activity.speed <= 5.5 ? '🚶‍♂️' : '🏃‍♂️'
              }</span>
              <span class="activity__value">${activity.speed.toFixed(1)}</span>
              <span class="activity__unit">km/h</span>
            </div>
          </li>`;
        break;
      case this.activityTypes.highlight.toLowerCase():
        break;
      default:
        alert('Select an activity type');
        break;
    }

    form.insertAdjacentHTML('afterend', `${html}</li>`);

    const deleteButton = document.querySelector('.activity__delete');
    deleteButton.addEventListener('click', this._deleteActivity.bind(this));
  }

  _displayMarker(activity) {
    const hikingIcon = new L.Icon({
      iconUrl:
        'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
      shadowUrl:
        'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
      iconSize: [25, 41],
      iconAnchor: [12, 41],
      popupAnchor: [1, -34],
      shadowSize: [41, 41],
    });
    const highlightIcon = new L.Icon({
      iconUrl:
        'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-orange.png',
      shadowUrl:
        'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
      iconSize: [25, 41],
      iconAnchor: [12, 41],
      popupAnchor: [1, -34],
      shadowSize: [41, 41],
    });

    let icon;
    let emoji;

    switch (activity.type) {
      case this.activityTypes.hiking.toLowerCase():
        icon = hikingIcon;
        emoji = `${activity.speed <= 5.5 ? '🚶‍♂️' : '🏃‍♂️'}`;
        break;
      case this.activityTypes.highlight.toLowerCase():
        icon = highlightIcon;
        emoji = '🔆';
        break;
      default:
        alert('Select an activity type');
        break;
    }

    const marker = L.marker(activity.coords, { icon: icon })
      .addTo(this.map)
      .bindPopup(
        L.popup({
          maxWidth: 250,
          minWidth: 100,
          autoClose: false,
          closeOnClick: false,
          className: `${activity.type}-popup`,
        })
      )
      .setPopupContent(`${emoji} ${this._getDisplayedField(activity)}`)
      .openPopup();

    this.markers[activity.id] = marker;
  }

  _getDisplayedField(activity) {
    let displayedField;

    switch (activity.type) {
      case this.activityTypes.hiking.toLowerCase():
        displayedField = activity.hikingTrail;
        break;
      case this.activityTypes.highlight.toLowerCase():
        displayedField = activity.description;
        break;
      default:
        alert('Select an activity type');
        break;
    }

    return displayedField;
  }

  _getLocalStorage() {
    const data = JSON.parse(localStorage.getItem('activities'));

    if (!data) return;

    this.activities = data;
    this.activities.forEach(a => this._displayActivity(a));
  }

  _getPosition() {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        position => {
          this._createMap([
            position.coords.latitude,
            position.coords.longitude,
          ]);
        },
        () => {
          alert('Mapty could not get your position');
          this._createMap();
        }
      );
    } else {
      alert('Mapty could not get your position');
      this._createMap();
    }
  }

  _hideForm() {
    inputDistance.value =
      inputDuration.value =
      inputHikingTrail.value =
      inputDescription.value =
        '';
    form.style.display = 'none';
    form.classList.add('hidden');
    setTimeout(() => (form.style.display = 'grid'), 1000);
  }

  _moveToMarker(e) {
    const clickedElement = e.target.closest('.activity');

    if (!clickedElement) return;

    const activity = this.activities.find(
      a => a.id === clickedElement.dataset.id
    );

    if (!activity) return;

    this.map.setView(activity.coords, this.zoom, {
      animate: true,
      pan: {
        duration: 1,
      },
    });
  }

  _setLocalStorage() {
    localStorage.setItem('activities', JSON.stringify(this.activities));
  }

  _showForm(e) {
    this.mapEvent = e;
    form.classList.remove('hidden');
    inputHikingTrail.focus();
  }

  _toggleActivityOpacity(e) {
    const selectedElement = e.target.closest('.activity');
    if (!selectedElement) return;
    selectedElement.classList.toggle('activity--active');
  }

  reset() {
    localStorage.removeItem('activities');
    location.reload();
  }
}
