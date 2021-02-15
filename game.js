// Copyright 2021 Miles Barr <milesbarr2@gmail.com>
// 
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
// 
//     http://www.apache.org/licenses/LICENSE-2.0
// 
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

(function () {
  "use strict";

  // Get HTML elements.
  var goButton = document.getElementById("go-button");
  var menuToggleBlock = document.getElementById("menu-toggle-block");
  var inGameMessage = document.getElementById("in-game-message");
  var hintButton = document.getElementById("hint-button");
  var giveUpButton = document.getElementById("give-up-button");
  var keepExploringButton = document.getElementById("keep-exploring-button");
  var tryAnotherButton = document.getElementById("try-another-button");
  var showMenuButton = document.getElementById("show-menu-button");
  var hideMenuButton = document.getElementById("hide-menu-button");

  // Hide the "mode" dropdown on browsers without geolocation.
  if (!("geolocation" in navigator)) {
    // Hide the "mode" dropdown.
    document.getElementById("mode-dropdown").style.display = "none";

    // Expand the difficulty dropdown.
    document.getElementById("difficulty-dropdown").setAttribute("data-expanded", true);
  }

  // Load data from and save data to session storage.
  var visitedFamousPlaces = {};
  if (typeof Storage !== "undefined" && sessionStorage) {
    // Restore the mode from session storage.
    if (sessionStorage.getItem("mode")) {
      mode.value = sessionStorage.getItem("mode");
    }

    // Save mode changes to session storage.
    mode.onchange = function () {
      sessionStorage.setItem("mode", this.value);
    };

    // Restore the difficulty from session storage.
    if (sessionStorage.getItem("difficulty")) {
      difficulty.value = sessionStorage.getItem("difficulty");
    }

    // Save difficulty changes to session storage.
    difficulty.onchange = function () {
      sessionStorage.setItem("difficulty", this.value);
    };

    // Get the visited famous places from session storage.
    if (sessionStorage.getItem("visitedFamousPlaces")) {
      var keys = sessionStorage.getItem("visitedFamousPlaces").split(",");
      for (var i = 0; i < keys.length; i++) {
        visitedFamousPlaces[keys[i]] = true;
      }
    }
  }

  // Prevent scrolling when grabbing the panorama.
  pano.ontouchmove = function () {
    return false;
  };

  // Prevent scrolling when grabbing the menu.
  menu.ontouchmove = function () {
    return false;
  };

  var FAMOUS_PLACES = [
    {
      name: "Time Square",
      location: { lat: 40.759011, lng: -73.984472 },
      radiusKm: 0.1,
    },
    {
      name: "The Eiffel Tower",
      location: { lat: 48.85837, lng: 2.294481 },
      radiusKm: 0.15,
    },
    {
      name: "The Space Needle",
      location: { lat: 47.620506, lng: -122.349277 },
      radiusKm: 0.125,
    },
    {
      name: "The Empire State Building",
      location: { lat: 40.748441, lng: -73.985664 },
      radiusKm: 0.1,
    },
    {
      name: "The Leaning Tower of Pisa",
      location: { lat: 43.722952, lng: 10.396597 },
      radiusKm: 0.075,
    },
    {
      name: "The Colloseum",
      location: { lat: 41.89021, lng: 12.492231 },
      radiusKm: 0.175,
    },
    {
      name: "The Washington Monument",
      location: { lat: 38.889484, lng: -77.035279 },
      radiusKm: 0.15,
    },
    {
      name: "St. Basil's Cathedral",
      location: { lat: 55.752523, lng: 37.623087 },
      radiusKm: 0.075,
    },
    {
      name: "The Louvre",
      location: { lat: 48.860611, lng: 2.337644 },
      radiusKm: 0.225,
    },
    {
      name: "Big Ben",
      location: { lat: 51.500729, lng: -0.124625 },
      radiusKm: 0.05,
    },
    {
      name: "The Arc de Triomphe",
      location: { lat: 48.873792, lng: 2.295028 },
      radiusKm: 0.075,
    },
    {
      name: "Gateway Arch",
      location: { lat: 38.624691, lng: -90.184776 },
      radiusKm: 0.25,
    },
    {
      name: "Petronas Towers",
      location: { lat: 3.157741, lng: 101.712167 },
      radiusKm: 0.15,
    }
  ];

  // The minimum possible distance to start from the destination per difficulty in kilometers.
  var MIN_START_DIST_KM = {
    easy: 0.25,
    medium: 0.5,
    hard: 1,
  };

  // The maximum possible distance to start from the destination per difficulty in kilometers.
  var MAX_START_DIST_KM = {
    easy: 0.5,
    medium: 1,
    hard: 4,
  };

  /** Returns an approximate distance between two locations in kilometers. */
  function distBetweenKm(latLngA, latLngB) {
    var diffLat = (latLngB.lat - latLngA.lat) * (Math.PI / 180);
    var diffLng = (latLngB.lng - latLngA.lng) * (Math.PI / 180);
    var n =
      Math.sin(diffLat / 2) * Math.sin(diffLat / 2) +
      Math.cos(latLngA.lat * (Math.PI / 180)) *
      Math.cos(latLngB.lat * (Math.PI / 180)) *
      Math.sin(diffLng / 2) *
      Math.sin(diffLng / 2);
    return 6371 * 2 * Math.atan2(Math.sqrt(n), Math.sqrt(1 - n));
  }

  var googleStreetViewPanorama;
  var googleStreetViewService = null;

  /** Called when the Google Maps API is ready, creating a Google Street View panorama and service. */
  window.onGoogleMapsApiReady = function () {
    // Create a Google Street View panorama.
    googleStreetViewPanorama = new google.maps.StreetViewPanorama(pano, {
      visible: false,
      addressControlOptions: {
        position: google.maps.ControlPosition.LEFT_BOTTOM,
      },
      showRoadLabels: false,
    });
    googleStreetViewPanorama.addListener("position_changed", onGoogleStreetViewPanoramaPositionChanged);

    // Add the menu to the Google Street View panorama controls.
    googleStreetViewPanorama.controls[google.maps.ControlPosition.TOP_LEFT].push(menu);

    // Create a Google Street View service.
    googleStreetViewService = new google.maps.StreetViewService();
  }

  var destination;

  function getDestinationDisplayName() {
    if (destination.name === "My Location") return "your current location";
    return destination.name.replace("The", "the");
  }

  var loading = false;

  // Load the game when the settings form is submitted.
  document.getElementById("settings-form").onsubmit = function () {
    if (loading) return false;

    if (mode.value === "famous_places" || !("geolocation" in navigator)) {
      // Build a list of unvisited famous places.
      var unvisitedFamousPlaces = [];
      for (var i = 0; i < FAMOUS_PLACES.length; i++) {
        if (visitedFamousPlaces[FAMOUS_PLACES[i].name]) continue;
        unvisitedFamousPlaces.push(FAMOUS_PLACES[i]);
      }
      if (unvisitedFamousPlaces.length === 0) {
        unvisitedFamousPlaces = FAMOUS_PLACES;
      }

      // Pick a random destination.
      destination = FAMOUS_PLACES[Math.floor(Math.random() * unvisitedFamousPlaces.length)];

      // Add the destination to the set of visited famous places.
      visitedFamousPlaces[destination.name] = true;
      if (typeof Storage !== "undefined" && sessionStorage) {
        sessionStorage.setItem("visitedFamousPlaces", Object.keys(visitedFamousPlaces).join(","));
      }

      // Send a Google Analytics event.
      gtag("event", "go", {
        mode: mode.value,
        difficulty: difficulty.value,
        destination: destination.name,
      });

      // Load the game.
      loadGame();
    } else {
      navigator.geolocation.getCurrentPosition(function (position) {
        // Set the destination to the current position.
        destination = {
          name: "My Location",
          location: {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          },
          radiusKm: 0.1,
        };

        // Send a Google Analytics event.
        gtag("event", "go", {
          mode: mode.value,
          difficulty: difficulty.value,
          destination: destination.name,
        });

        // Load the game.
        loadGame();
      });
    }

    return false;
  };

  function loadGame() {
    if (loading) return;

    // Start loading.
    loading = true;

    // Show the "go" button loader.
    goButton.disabled = true;
    goButton.setAttribute("data-loading", true);
    goButton.setAttribute("aria-busy", true);

    // Wait until the Google Maps API is ready.
    waitUntilGoogleMapsApiReady();
  }

  var findInitialPanoramaStartTime;

  function waitUntilGoogleMapsApiReady() {
    if (googleStreetViewService === null) {
      setTimeout(waitUntilGoogleMapsApiReady, 100);
      return;
    }

    // Find an initial panorama.
    findInitialPanoramaStartTime = new Date;
    findInitialPanorama();
  }

  function findInitialPanorama() {
    // Calculate the minimum and maximum possible distances to start from the destination.
    var minStartDistKm = destination.radiusKm + MIN_START_DIST_KM[difficulty.value];
    var maxStartDistKm = destination.radiusKm + MAX_START_DIST_KM[difficulty.value];

    // Attempt to pick a random location within the minimum and maximum distance.
    var r = (maxStartDistKm * 1000) / 111300.0;
    var y0 = destination.location.lat;
    var x0 = destination.location.lng;
    var u = Math.random();
    var v = Math.random();
    var w = r * Math.sqrt(u);
    var t = 2 * Math.PI * v;
    var x = w * Math.cos(t);
    var y1 = w * Math.sin(t);
    var x1 = x / Math.cos(y0);
    var location = { lat: y0 + y1, lng: x0 + x1 };
    var distKm = distBetweenKm(location, destination.location);

    // Retry if the random location is not within the minimum and maximum distance.
    if (!(minStartDistKm <= distKm && distKm <= maxStartDistKm)) {
      setTimeout(findInitialPanorama, 100);
      return;
    }

    // Attempt to get a panorama within a radius of the random location.
    googleStreetViewService.getPanorama(
      {
        location: location,
        radius: Math.min(distKm - minStartDistKm, maxStartDistKm - distKm) * 1000, // m
      },
      function (data, status) {
        try {
          // Calculate the distance between the panorama location and the destination.
          var distKm = distBetweenKm(data.location.latLng.toJSON(), destination.location);

          // Check that:
          // 1. The response was successful.
          // 2. There are at least 2 linked panoramas (to prevent the player from getting stuck).
          // 3. The panorama location is within the minimum and maximum distance.
          if (status === "OK" && data.links.length >= 2 && minStartDistKm <= distKm && distKm <= maxStartDistKm) {
            // Set the Google Street View panorama.
            googleStreetViewPanorama.setPano(data.location.pano);

            onInitialPanoramaFound();
            return;
          }
        } catch (e) { }

        // Try again.
        setTimeout(findInitialPanorama, 100);
      }
    );
  }

  var running = false;
  var explorationStartTime;

  function onInitialPanoramaFound() {
    // Send a Google Analytics event.
    gtag("event", "timing_complete", {
      name: "initial_panorama_found",
      value: (new Date) - findInitialPanoramaStartTime,
      non_interaction: true
    });

    // Stop loading.
    loading = false;

    // Start the game.
    running = true;
    explorationStartTime = new Date();

    // Set the in-game message.
    inGameMessage.innerHTML = "Find your way to " + getDestinationDisplayName() + "...";

    // Show the in-game message.
    inGameMessage.style.display = "block";

    // Hide the map.
    map.style.display = "none";

    // Hide the "keep exploring" button.
    keepExploringButton.style.display = "none";

    // Hide the "try another" button.
    tryAnotherButton.style.display = "none";

    // Show the "hint" button.
    hintButton.style.display = "block";

    // Show the "give up" button.
    giveUpButton.style.display = "block";

    // Point the Google Street View panorama in a random direction.
    googleStreetViewPanorama.setPov({
      heading: Math.random() * 360,
      pitch: 0,
    });

    // Show the Google Street View panorama.
    pano.style.display = "block";
    googleStreetViewPanorama.setVisible(true);

    // Show the menu.
    menu.style.display = "block";
  }

  /** Loads a map with a marker at the destination. */
  function loadDestinationReachedMap() {
    var width = Math.min(window.innerWidth, 540) - 30;
    var height = Math.floor((width / 3) * 2);
    map.src = "https://maps.googleapis.com/maps/api/staticmap?key=YOUR_GOOGLE_API_KEY&path=".concat(
      destination.location.lat,
      ",",
      destination.location.lng,
      "&size=",
      width,
      "x",
      height,
      "&markers=",
      destination.location.lat,
      ",",
      destination.location.lng
    );
    map.style.height = height + "px";
    map.onload = function () {
      this.style.height = "auto";
    };
  }

  // Point the Google Street View panorama towards the destination when the "hint" button is clicked.
  hintButton.onclick = function () {
    if (!running) return;

    // Hide the menu.
    hideMenu();

    // Point the Google Steet View panorama towards the destination.
    googleStreetViewPanorama.setPov({
      heading: google.maps.geometry.spherical.computeHeading(
        googleStreetViewPanorama.getPosition(),
        new google.maps.LatLng(destination.location)
      ),
      pitch: 0,
    });

    // Send a Google Analytics event.
    gtag("event", "hint", {
      mode: mode.value,
      difficulty: difficulty.value,
      destination: destination.name,
      exploration_time_msec: (new Date) - explorationStartTime,
    });
  };

  /** Loads a map with a path between the player's current position and the destination. */
  function loadGiveUpMap() {
    var width = Math.min(window.innerWidth, 540) - 30;
    var height = Math.floor((width / 3) * 2);
    map.src = "https://maps.googleapis.com/maps/api/staticmap?key=YOUR_GOOGLE_API_KEY&path=".concat(
      googleStreetViewPanorama.getPosition().toUrlValue(),
      "|",
      destination.location.lat,
      ",",
      destination.location.lng,
      "&size=",
      width,
      "x",
      height,
      "&markers=",
      googleStreetViewPanorama.getPosition().toUrlValue(),
      "&markers=",
      destination.location.lat,
      ",",
      destination.location.lng
    );
    map.style.height = height + "px";
    map.onload = function () {
      this.style.height = "auto";
    };
  }

  // Preload the "give up" map when the mouse enters the "give up" button.
  giveUpButton.onmouseenter = loadGiveUpMap;

  // Give up when the "give up" button is clicked.
  giveUpButton.onclick = function () {
    if (!running) return;

    // Stop the game.
    running = false;

    // Show the "give up" map.
    loadGiveUpMap();
    map.style.display = "block";

    // Set the in-game message.
    // Use imperial for US players and metric for everyone else.
    var distKm = distBetweenKm(googleStreetViewPanorama.getPosition().toJSON(), destination.location);
    var distText = "";
    if (window.navigator.language.toLowerCase() === "en-us") {
      var distMi = distKm * 0.621371;
      distText = distMi.toFixed(1) + " mile" + (Math.round(distMi) === 1 ? "" : "s");
    } else {
      if (distKm < 1) {
        var distM = Math.round(distKm * 1000);
        distText = distM + " meter" + (distM === 1 ? "" : "s");
      } else {
        distText = distKm.toFixed(1) + " kilometer" + (Math.round(distKm) === 1 ? "" : "s");
      }
    }
    inGameMessage.innerHTML =
      "You were " + distText + " away from " + getDestinationDisplayName() + ".";

    // Hide the "hint" button.
    hintButton.style.display = "none";

    // Hide the "give up" button.
    giveUpButton.style.display = "none";

    // Show the "keep exploring" button.
    keepExploringButton.style.display = "block";

    // Shrink the "try another" button.
    tryAnotherButton.className = "menu-button menu-button-right";

    // Show the "try another" button.
    tryAnotherButton.style.display = "block";

    // Show the menu.
    showMenu();

    // Send a Google Analytics event.
    gtag("event", "give_up", {
      mode: mode.value,
      difficulty: difficulty.value,
      destination: destination.name,
      exploration_time_msec: (new Date) - explorationStartTime,
    });
  };

  // Reduce menu clutter when the "keep exploring" button is clicked.
  keepExploringButton.onclick = function () {
    // Hide the menu.
    hideMenu();

    // Hide the in-game message.
    inGameMessage.style.display = "none";

    // Hide the map.
    map.style.display = "none";

    // Hide the "keep exploring" button.
    keepExploringButton.style.display = "none";

    // Expand the "try another" button.
    tryAnotherButton.className = "menu-button";

    // Send a Google Analytics event.
    gtag("event", "keep_exploring", {
      mode: mode.value,
      difficulty: difficulty.value,
      destination: destination.name,
    });
  };

  // Reset the page when the "try another" button is clicked.
  tryAnotherButton.onclick = function () {
    // Hide the "go" button loader.
    goButton.removeAttribute("data-loading");
    goButton.disabled = false;
    goButton.removeAttribute("aria-busy");

    // Hide the Google Street View panorama.
    googleStreetViewPanorama.setVisible(false);
    pano.style.display = "none";

    // Send a Google Analytics event.
    gtag("event", "try_another", {
      mode: mode.value,
      difficulty: difficulty.value,
      destination: destination.name,
    });
  };

  function showMenu() {
    // Show the menu.
    menuToggleBlock.removeAttribute("data-menu-hidden");

    // Hide the "show menu" button.
    showMenuButton.style.display = "none";

    // Show the "hide menu" button.
    hideMenuButton.style.display = "block";
  }

  // Show the menu and potentially preload the "give up" map when the "show menu" button is clicked.
  showMenuButton.onclick = function () {
    // Show the menu.
    showMenu();

    // Preload the "give up" map if the game is running.
    if (running) loadGiveUpMap();

    // Send a Google Analytics event.
    gtag("event", "show_menu", {
      mode: mode.value,
      difficulty: difficulty.value,
      destination: destination.name,
    });
  };

  function hideMenu() {
    // Hide the menu.
    menuToggleBlock.setAttribute("data-menu-hidden", true);

    // Hide the "hide menu" button.
    hideMenuButton.style.display = "none";

    // Show the "show menu" button.
    showMenuButton.style.display = "block";
  }

  // Hide the menu when the "hide menu" button is clicked.
  hideMenuButton.onclick = function () {
    // Hide the menu.
    hideMenu();

    // Send a Google Analytics event.
    gtag("event", "hide_menu", {
      mode: mode.value,
      difficulty: difficulty.value,
      destination: destination.name,
    });
  };

  /** Called when the Google Street View Panorama position has changed to check whether the player has reached the destination. */
  function onGoogleStreetViewPanoramaPositionChanged() {
    if (!running) return;

    var distKm = distBetweenKm(googleStreetViewPanorama.getPosition().toJSON(), destination.location);

    // Preload the "destination reached" map if the player is near the destination.
    if (distKm <= destination.radiusKm + MIN_START_DIST_KM) loadDestinationReachedMap();

    // Check whether the player has reached the destination.
    if (distKm <= destination.radiusKm) onDestinationReached();
  }

  /** Called when the player has reached the destination. */
  function onDestinationReached() {
    // Stop the game.
    running = false;

    // Set the in-game message.
    var explorationTimeMs = new Date() - explorationStartTime;
    var timeText = "";
    var hours = Math.floor(explorationTimeMs / (60 * 60 * 1000));
    if (hours > 0) {
      timeText += hours + " hour" + (hours === 1 ? "" : "s") + " ";
    }
    var minutes = Math.floor(explorationTimeMs / (60 * 1000)) % (60 * 60);
    if (hours > 0 || minutes > 0) {
      timeText += minutes + " minute" + (minutes === 1 ? "" : "s") + " ";
    }
    var seconds = Math.floor(explorationTimeMs / 1000) % 60;
    timeText += seconds + " second" + (seconds !== 1 ? "s" : "");
    inGameMessage.innerHTML = "You found " + getDestinationDisplayName() + " in " + timeText + ".";

    // Show the "destination reached" map.
    loadDestinationReachedMap();
    map.style.display = "block";

    // Hide the "hint" button.
    hintButton.style.display = "none";

    // Hide the "give up" button.
    giveUpButton.style.display = "none";

    // Show the "keep exploring" button.
    keepExploringButton.style.display = "block";

    // Shrink the "try another" button.
    tryAnotherButton.className = "menu-button menu-button-right";

    // Show the "try another" button.
    tryAnotherButton.style.display = "block";

    // Show the menu.
    showMenu();

    // Send a Google Analytics event.
    gtag("event", "destination_reached", {
      mode: mode.value,
      difficulty: difficulty.value,
      destination: destination.name,
      exploration_time_msec: explorationTimeMs,
    });
  }

})();
