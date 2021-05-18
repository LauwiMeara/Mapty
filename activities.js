'use strict';

class Activity {
  date = new Date();
  // prettier-ignore
  months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'June', 'July', 'Aug', 'Sept', 'Oct', 'Nov', 'Dec'];
  dateString = `${
    this.months[this.date.getMonth()]
  } ${this.date.getDate()}, ${this.date.getFullYear()}`;
  id = String(Date.now()).slice(-10);

  constructor(coords) {
    this.coords = coords; // [lat, lng]
  }
}

export class Hiking extends Activity {
  type = 'hiking';

  constructor(coords, hikingTrail, distance, duration) {
    super(coords);
    this.hikingTrail = hikingTrail; // trail name
    this.distance = distance; // in km
    this.duration = duration; // in min
    this.calcSpeed(); // in km/h
  }

  calcSpeed() {
    this.speed = this.distance / (this.duration / 60);
    return this.speed;
  }
}

export class Highlight extends Activity {
  type = 'highlight';

  constructor(coords, description) {
    super(coords);
    this.description = description; // highlight description
  }
}
