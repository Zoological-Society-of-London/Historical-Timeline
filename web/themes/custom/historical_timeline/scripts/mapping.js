import "leaflet/dist/leaflet.css";
import "leaflet/dist/leaflet.js";

import tingle from "tingle.js";

import "tingle.js/src/tingle.css";

import { Howl } from "howler";
import { marker, icon } from "leaflet";

import { gsap, Bounce } from "gsap/all";

import "./quiz";

// Preload images
function preloadImage(url) {
  var img = new Image();
  img.src = url;
}

class Timeline {
  constructor() {
    let self = this;

    self.map = L.map("map", {
      crs: L.CRS.Simple,
      minZoom: 3,
      maxZoom: 4,
    });

    if(window.screen.width > 540 && window.screen.width < 900){
      self.map.setMinZoom(2.8);
      self.map.setMaxZoom(4.3);
    }

    if(window.screen.width < 540){
      self.map.setMinZoom(1.8);
      self.map.setMaxZoom(3.5);
    }
       

    // Log out latlng on click
    self.map.on("click", function (e) {
      console.log(e.latlng);
    });

    self.map.attributionControl.setPrefix(
      'Created by <a class="octophin-link" target="_blank" href="https://octophindigital.com">Octophin Digital</a>'
    );

    // Set an empty overlay to start
    self.currentOverlay = null;

    // Initialise the spinning sound

    self.spinSound = new Howl({
      src: [drupalSettings.path.themeUrl + "/audio/spin.mp3"],
      volume: 0.7,
    });

    self.music = new Howl({
      src: [drupalSettings.path.themeUrl + "/audio/zootime.mp3"],
      loop: true,
      volume: 0.3,
    });

    self.chord = [];

    for (let i = 1; i <= 7; i++) {
      self.chord.push(
        new Howl({
          src: [
            drupalSettings.path.themeUrl + "/audio/good" + i + "_reduced.mp3",
          ],
          volume: 0.01,
        })
      );
    }

    self.spinning = null;

    self.init();
  }

  trackEvent = function (action, label) {

    try {

        self.gtag('event', label, {
            'event_label': label,
            'event_action': action,
        });

    } catch (e) {

      console.log("Failed to trigger gtag event: " + action + " " + label)
    }

};

  toggleTime() {
    $(".date-selector-wrapper").toggle();
  }

  toggleFullScreen() {
    if (
      !document.fullscreenElement && // alternative standard method
      !document.mozFullScreenElement &&
      !document.webkitFullscreenElement
    ) {
      // current working methods
      if (document.documentElement.requestFullscreen) {
        document.documentElement.requestFullscreen();
      } else if (document.documentElement.mozRequestFullScreen) {
        document.documentElement.mozRequestFullScreen();
      } else if (document.documentElement.webkitRequestFullscreen) {
        document.documentElement.webkitRequestFullscreen(
          Element.ALLOW_KEYBOARD_INPUT
        );
      }
    } else {
      if (document.cancelFullScreen) {
        document.cancelFullScreen();
      } else if (document.mozCancelFullScreen) {
        document.mozCancelFullScreen();
      } else if (document.webkitCancelFullScreen) {
        document.webkitCancelFullScreen();
      }
    }
  }

  playRandomNote() {
    let self = this;

    if (self.muted) {
      return;
    }

    let item = self.chord[Math.floor(Math.random() * self.chord.length)];

    item.play();
  }

  toggleSidebar() {
    if (window.innerWidth <= 900) {
      if ($(".sidebar").hasClass("sidebar-minimised")) {
        $(".sidebar").removeClass("sidebar-minimised");
      } else {
        $(".sidebar").addClass("sidebar-minimised");
      }
    }
  }

  async init() {
    let self = this;

    self.data = await fetch("/api/get_data").then((response) =>
      response.json()
    );

    // Preload images

    self.data.maps.forEach((map) => {
      preloadImage(map.image);
      preloadImage(map.image_unscaled);
    });

    self.data.markers.forEach((marker) => {
      preloadImage(marker.icon_url);
    });

    // Populate the map picker

    let maps = self.data.maps.map((map) => {
      return {
        text: map.year,
        value: map.id,
      };
    });

    maps.sort((a, b) => a.text - b.text);

    self.sortedMaps = maps;

    self.yearSelector = new IosSelector({
      el: "#map-picker",
      type: "infinite",
      source: maps,
      count: 20,
      onChange: (selected) => {
        
        // Don't run if same as current year

        if(self.currentMap && parseInt(selected.value) === parseInt(self.currentMap.id)){

            return;
          
        }
        
        self.addOverlay(selected.value);

      },
    });

    // Transform the markers into Leaflet marker objects

    self.data.markers = self.data.markers.map((m) => {
      const zslIcon = L.Icon.extend({
        options: {
          iconSize: [50, 50],
        },
      });

      let marker = L.marker([m.position_horizontal, m.position_vertical], {
        icon: new zslIcon({ iconUrl: m.icon_url }),
      });

      const markerFull = {
        marker: marker,
        meta: m,
      };

      marker.on("click", () => {
        self.showMarker(markerFull);
      });

      return markerFull;
    });

    // Make a generic modal that can have its content changed by other functions

    self.modal = new tingle.modal({
      footer: true,
      stickyFooter: false,
      closeMethods: ["overlay", "button", "escape"],
      closeLabel: "Close",
      onOpen: function () {
        $("body").addClass("modal-open");
      },
      onClose: function () {
        // If no default theme, pick one

        if (!self.currentTheme) {
          self.pickTheme(self.data.themes[0].id);
        }

        $("body").removeClass("modal-open");
      },
    });

    self.modal.addFooterBtn("", "settings-button fa fa-volume", function () {
      self.music.stop();
      self.spinSound.stop();
      self.chord.forEach((note) => note.stop());

      self.muted = true;

      $("body").addClass("muted");
    });

    self.modal.addFooterBtn(
      "",
      "settings-button fa fa-volume-xmark",
      function () {
        self.music.play();
        $("body").removeClass("muted");
      }
    );

    // add a specific modal for the quiz
    self.quiz_modal = new tingle.modal({
      footer: true,
      stickyFooter: false,
      closeMethods: ["overlay", "button", "escape"],
      closeLabel: "Close",
    });

    self.showThemePicker();

    // At this point we have a database of leaflet markers with metadata but no map or theme loaded
  }

  goForward() {
    let self = this;

    let currentIndex = self.sortedMaps.findIndex(
      (map) => map.value === self.currentMap.id
    );

    let travelYear;

    if (currentIndex === self.sortedMaps.length - 1) {
      travelYear = self.sortedMaps[0].value;
    } else {
      travelYear = self.sortedMaps[currentIndex + 1].value;
    }

    self.yearSelector.select(travelYear);
  }

  goBack() {
    let self = this;

    let currentIndex = self.sortedMaps.findIndex(
      (map) => map.value === self.currentMap.id
    );

    let travelYear;

    // If at the start of time, go to the end of time
    if (currentIndex === 0) {
      travelYear = self.sortedMaps[self.sortedMaps.length - 1].value;
    } else {
      travelYear = self.sortedMaps[currentIndex - 1].value;
    }

    self.yearSelector.select(travelYear);
  }

  showAjaxMarker(markerID) {
    this.goToMarker(markerID);
  }

  showMarker(marker) {
    let self = this;

    self.currentMarker = marker;

    Drupal.ajax({
      url: "/api/load-marker/" + marker.meta.id + "/" + self.currentTheme.id,
    }).execute();

    window.setTimeout(function () {
      $("#side-panel h2").css("visibility", "visible");

      // Trim any leading whitespace

      $("p")
        .filter(function () {
          return $.trim(this.innerHTML) == "";
        })
        .remove();

      gsap.fromTo(
        "#side-panel h2",
        { scale: 0.5 },
        { scale: 1, duration: 1, ease: Bounce.easeOut }
      );

      self.showing = false;
    }, 500);
  }

  showThemePicker() {
    let self = this;

    self.showModal(self.getThemesList());
  }

  showMapInfo() {
    let self = this;

    self.showModal(
      "<h2 class='map-title font32-27'>" +
        self.currentMap.title +
        "</h2>" +
        self.currentMap.description
    );
  }

  showThemeInfo() {
    let self = this;

    if (!self.currentTheme) {
      return self.showThemePicker();
    }
 
    // trigger google tracking event
    self.trackEvent(self.currentTheme.title, "Timeline: selectTheme");

    let firstMarker = self.data.markers.find(
      (x) => parseInt(x.meta.id) === parseInt(self.currentTheme.markers[0])
    );

    // if there is a current marker, load it in the panel
    if (self.currentMarker) {
      self.showMarker(self.currentMarker);
    } else {
      self.showMarker(firstMarker);
    }

    let firstMarkerMap = self.data.maps.find(
      (x) => parseInt(x.id) === parseInt(firstMarker.meta.map_id)
    );

    let quizButton = "";

    if (self.currentTheme.quiz) {
      quizButton = `<button class='theme-info-button-start primary-button' onclick="window.timeline.showQuizModal()">Take a quiz</button>`;
    }

    self.showModal(
      `
      <img class="theme-info-image" src="${self.currentTheme.image}"/>
      <h2 class='theme-title--current font32-27'>${self.currentTheme.title}</h2>
      ${self.currentTheme.description}
      <div class='theme-info-buttons-wrapper happy-margin-vertical'>
      <button class='theme-info-button-start primary-button' onclick="window.timeline.restartCurrentTheme()">Explore theme</button>
      <button class='theme-info-button-start primary-button' onclick="window.timeline.showThemePicker()">Show all themes</button>
      ${quizButton}
      </div>
      `
    );
  }

  restartCurrentTheme() {
    let self = this;

    self.goToMarker(self.currentTheme.markers[0]);
  }

  buildQuiz() {
    let self = this;

    let quizID = self.currentTheme.quiz.quizId;

    $.get("/api/load-quiz/" + quizID, function (data) {
      self.quiz_modal.setContent(data);
    });
  }

  restartQuiz() {
    this.buildQuiz();

    this.showQuizModal();
  }

  bounceMarkers() {
    // Bounce in markers

    let self = this;

    gsap.from(".leaflet-marker-icon", {
      duration: 1.8,
      ease: Bounce.easeOut,
      y: -500,
      stagger: {
        each: 0.5,
        onStart: function () {
          if (!$("body").hasClass("modal-open")) {
            self.playRandomNote();
          }
        },
      },
    });
  }

  resetMap(mapID) {
    let self = this;

    // Remove all markers

    self.data.markers.forEach((m) => {
      m.marker.removeFrom(self.map);
    });

    self.map.removeLayer(self.currentOverlay);

    self.yearSelector.value = self.data.maps.find(
      (x) => x.id === mapID.toString()
    ).year;
  }

  goToMarker(id) {
    let self = this;

    let firstMarker = self.data.markers.find(
      (x) => parseInt(x.meta.id) === parseInt(id)
    );

    // Only select if not the same map as before

    if (self.yearSelector.value !== firstMarker.meta.map_id) {
      self.yearSelector.select(firstMarker.meta.map_id);

      window.clearTimeout(window.panTimeOut);

      window.panTimeOut = window.setTimeout(function () {
        self.highlightMarker(firstMarker);
      }, 1000);
    } else {
      self.highlightMarker(firstMarker);
    }

    self.showMarker(firstMarker);

    self.hideModal();
  }

  highlightMarker(marker) {
    let self = this;

    $(".leaflet-marker-icon").removeClass("selected");

    setTimeout(function () {
      $(marker.marker._icon).addClass("selected");
    }, 2000);

    self.map.panTo(marker.marker.getLatLng(), {
      animate: true,
      duration: 2,
    });
  }

  getThemesList() {
    let self = this;

    let welcomeTitle =
      drupalSettings.config.welcome_settings.field_welcome_title;
    let welcomeBody = drupalSettings.config.welcome_settings.field_welcome_body;
    let output =
      `<div class="container modal-content--themes-list">
				<div class="logo-wrapper">
   					<img class="logo front-page-logo-zoo" src="/themes/custom/historical_timeline/images/ZSL_London Zoo_Stacked_RGB.jpg" alt="zoo logo"/>
    				<img class="logo front-page-logo-lottery" src="/themes/custom/historical_timeline/images/lotteryLogo.jpg" alt="lottery logo"/> 
 				</div>
			<section class="theme-grid-wrapper">
				<div class="theme-wrapper-intro"><h1 class="welcome-title font40-30">` +
      welcomeTitle +
      `</h1>` +
      welcomeBody +
      `</div>
      			<div class="theme-grid">`;

    self.data.themes.forEach((x) => {
      output += `<div class="theme-wrapper" onclick="window.timeline.pickTheme(${x.id})">
        		<img src=${x.image}>
        		<div class="theme-wrapper-inner">
          			<h3>${x.title}</h3>
          			<p>${x.short_description}</p>
				</div>
			</div>`;
    });

    output += "</div></section></div>";

    return output;
  }

  showModal(content) {
    let self = this;
    self.modal.setContent(content);
    self.modal.open();
    self.quiz_modal.close();
  }

  showQuizModal() {
    let self = this;
    self.quiz_modal.open();
    self.modal.close();

    // trigger google tracking event
    self.trackEvent(self.currentTheme.quiz.title, "Timeline: startQuiz");
    
  }

  getModalButtons() {
    return "<button>Hi everyone!</button>";
  }

  setQuizModal(content) {
    let self = this;
    self.quiz_modal.setContent(content);
  }

  hideModal() {
    let self = this;
    self.modal.close();
  }

  hideQuizModal() {
    let self = this;
    self.quiz_modal.close();
  }

  pickTheme(theme) {
    let self = this;

    // Start music if not playing already

    if (!self.musicPlaying && !self.muted) {
      self.music.play();
      self.musicPlaying = true;
    }

    theme = self.data.themes.find((x) => parseInt(x.id) === parseInt(theme));

    self.currentTheme = theme;

    self.goToMarker(self.currentTheme.markers[0]);

    self.showThemeInfo();

    // make the theme quiz - if it has one!
    if (self.currentTheme.quiz) {
      self.buildQuiz();
    }
  }

  calculateBounds(width, height) {
    return L.latLngBounds([0, 0], [height / 10, width / 10]);
  }

  async addOverlay(selected_map_id) {
    $(".leaflet-marker-icon").hide();

    let self = this;

    let last;

    if (self.currentOverlay) {
      self.currentOverlay.setZIndex(2);

      last = $(self.currentOverlay._image);
    }

    let selected_map = self.data.maps.find(
      (x) => parseInt(x.id) === parseInt(selected_map_id)
    );

    $("body").css("background-image", `url('${selected_map.image_unscaled}')`);

    self.currentMap = selected_map;

    let latLngBounds = self.calculateBounds(
      selected_map.size[0],
      selected_map.size[1]
    );

    let newOverlay = L.imageOverlay(selected_map.image, latLngBounds);

    newOverlay.setZIndex(1);

    self.currentOverlay = newOverlay;

    self.map.addLayer(self.currentOverlay);

    if (!window.start) {
      self.map.fitBounds(latLngBounds);

      window.start = true;
    }

    if (!last) {
      self.addMarkers(selected_map_id);
    } else {
      last.fadeOut(2000, function () {
        last.remove();
        self.addMarkers(selected_map_id);
      });
    }
  }

  addMarkers = (selected_map_id, bounce = true) => {
    let self = this;

    self.data.markers.forEach((m) => {
      if (parseInt(m.meta.map_id) !== parseInt(selected_map_id)) {
        m.marker.removeFrom(self.map);
        return;
      }

      m.marker.addTo(self.map);
      $(m.marker._icon).attr("data-marker-id", m.meta.id);

      // Show disabled theme markers as preview of another theme - default to disabled
      $(m.marker._icon).attr("disabled", true);

      if (self.currentTheme && self.currentTheme.markers) {
        self.currentTheme.markers.forEach((themeMarker) => {
          if (parseInt(themeMarker) === parseInt(m.meta.id)) {
            $(m.marker._icon).removeAttr("disabled");
          }
        });
      }
    });

    if (bounce) {
      self.bounceMarkers();
    }
  };

  panelContents(htmlContent) {
    $("#side-panel").html(htmlContent);
  }

  startTicker() {
    let self = this;

    if (self.muted) {
      return;
    }

    if (self.spinning) {
      self.spinSound.stop(self.spinning);
    }

    self.spinning = self.spinSound.play();
  }

  stopTicker() {
    let self = this;

    self.spinSound.stop(self.spinning);
  }
}

$(() => {
  window.timeline = new Timeline();
});
