import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

import 'ol/ol.css';
import { Map, View } from 'ol';
import TileLayer from 'ol/layer/Tile';
import Overlay from 'ol/Overlay.js';
import XYZ from 'ol/source/XYZ';
import { transformExtent, fromLonLat } from 'ol/proj';
import { getCenter, containsCoordinate } from 'ol/extent';
import VectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';
import { defaults as defaultConrols } from "ol/control";
import Feature from 'ol/Feature';
import Point from 'ol/geom/Point';
import Style from 'ol/style/Style';
import Text from 'ol/style/Text';
import Fill from 'ol/style/Fill';
import Stroke from 'ol/style/Stroke';
import Icon from 'ol/style/Icon';



const supabaseUrlPrefix = "https://cnibjqyawzddpcpdrzrz.supabase.co";
const supabaseStoragePrefix = "/storage/v1/object/public/images/";

const sections = {
  "about": document.getElementById("about"),
  "home": document.getElementById("home"),
  "trees": document.getElementById("trees"),
  "resources": document.getElementById("resources"),
  "quiz": document.getElementById("quiz"),
  "contact": document.getElementById("contact"),
  "map": document.getElementById("map-section"),
  "sheet": document.getElementById("sheet-section")
}


let trees = [];
let speciesData = [];
let plantFamilies = [];
let optionsContainer;

let isMapLayerBlurred = false;
let isNonActiveMarkersBlurred = false;

let previousSection = "home";
let currentSection = "home"
let activeMarker = null;


const compassIconSpan = document.createElement("div");
compassIconSpan.innerHTML =
  `<img src=${supabaseUrlPrefix}${supabaseStoragePrefix}symbols/compass-icon.png>`;

const mapBounds = transformExtent(
  [-0.70682, 53.61198, -0.60913, 53.65347],
  'EPSG:4326',
  'EPSG:3857'
);

const mapCenter = fromLonLat([-0.657139, 53.635908]);


const layer = new TileLayer({
  source: new XYZ({
    url: 'https://cnibjqyawzddpcpdrzrz.supabase.co/storage/v1/object/public/tiles/15-19-jpg/{z}/{x}/{-y}.jpg',
    crossOrigin: 'anonymous',
    transition: 185.18518518519
  }),
  background: '#5e5447',
  className: 'tile-layer'
});

const view = new View({
  center: mapCenter,
  zoom: 16,
  minZoom: 15,
  maxZoom: 19
});

const map = new Map({
  target: 'map',
  layers: [layer],
  view: view,
  extent: mapBounds,
  className: "map-layer",
  constrainOnlyCenter: true,
  controls: defaultConrols({
    rotateOptions: { autoHide: false, label: compassIconSpan }
  }),
});

map.on('moveend', () => {
  const newCenter = map.getView().getCenter();
  if (newCenter && !containsCoordinate(mapBounds, newCenter)) {
    map.getView().setCenter(getCenter(mapBounds));
  }
});

const popupContainer = document.createElement('div');
popupContainer.className = 'popup';
popupContainer.innerHTML = `<div class="popup-content" id="popup-content"></div>`;
document.body.appendChild(popupContainer);


const popupOverlay = new Overlay({
  element: popupContainer,
  positioning: 'bottom-center',
  offset: [0, -55],
});

map.addOverlay(popupOverlay);



const markerVectorSource = new VectorSource();
const markerVectorLayer = new VectorLayer({
  source: markerVectorSource,
  className: "custom-markers",
  style: vectorMarkerStyleFunction
});
map.addLayer(markerVectorLayer);

// Bounce animation configuration (mirroring your CSS keyframes)
const bounceDuration = 1481.4814814815;
const keyframes = [
  { time: 0, value: 0 },
  { time: 0.2, value: 0 },
  { time: 0.4, value: -8 },
  { time: 0.5, value: 0 },
  { time: 0.6, value: -5 },
  { time: 0.8, value: 0 },
  { time: 1, value: 0 }
];

function getBounceValue(t) {
  for (let i = 0; i < keyframes.length - 1; i++) {
    const kf0 = keyframes[i];
    const kf1 = keyframes[i + 1];
    if (t >= kf0.time && t <= kf1.time) {
      const localT = (t - kf0.time) / (kf1.time - kf0.time);
      return kf0.value + localT * (kf1.value - kf0.value);
    }
  }
  return 0;
}


function vectorMarkerStyleFunction(feature, resolution) {
  const baseScale = 1.25;
  let targetScale = baseScale;

  // Determine target opacity.
  let targetOpacity;
  if (feature.get('active') || feature.get('hover')) {
    targetOpacity = 1;
  } else {
    targetOpacity = activeMarker ? 0.45 : 0.862;
  }

  // Prioritize active state over hover for scale.
  if (feature.get('active')) {
    targetScale = 1.5;
  } else if (feature.get('hover')) {
    targetScale = baseScale * 1.2;
  }

  // Smooth scale transition.
  let currentScale = feature.get('currentScale') || baseScale;
  const scaleSpeed = 0.2;
  currentScale += (targetScale - currentScale) * scaleSpeed;
  feature.set('currentScale', currentScale);

  // Smooth opacity transition.
  let currentOpacity = feature.get('currentOpacity');
  if (currentOpacity === undefined) {
    currentOpacity = targetOpacity;
  }
  const opacitySpeed = 0.1;
  currentOpacity += (targetOpacity - currentOpacity) * opacitySpeed;
  feature.set('currentOpacity', currentOpacity);

  let anchorY = 1;
  if (feature.get('active')) {
    const now = performance.now();
    const normalizedTime = (now % bounceDuration) / bounceDuration;
    const translateY = getBounceValue(normalizedTime);
    const iconHeight = 32;
    anchorY = 1 - translateY / iconHeight;
  }

  return new Style({
    image: new Icon({
      crossOrigin: 'anonymous',
      className: "custom-marker",
      src: `${supabaseUrlPrefix}${supabaseStoragePrefix}/symbols/location-pin.svg`,
      //src: `images/location-pin.svg`,
      color: 'orange',
      scale: currentScale,
      anchor: [0.5, anchorY],
      opacity: currentOpacity,
      anchorXUnits: 'fraction',
      anchorYUnits: 'fraction'
    }),
    zIndex: (feature.get('active') || feature.get('hover')) ? 999 : 1
  });
}




let hoveredFeature = null;
map.on('pointermove', function (evt) {
  let featureFound = false;
  map.forEachFeatureAtPixel(evt.pixel, function (feature, layer) {
    if (layer === markerVectorLayer) {
      featureFound = true;
      if (hoveredFeature !== feature) {
        // Reset previously hovered feature
        if (hoveredFeature) {
          hoveredFeature.set('hover', false);
          hoveredFeature.changed();
        }
        hoveredFeature = feature;
        hoveredFeature.set('hover', true);
        hoveredFeature.changed();
      }
      return true;
    }
  });
  if (!featureFound && hoveredFeature) {
    hoveredFeature.set('hover', false);
    hoveredFeature.changed();
    hoveredFeature = null;
  }
});




document.addEventListener("DOMContentLoaded", async function () {
  const SUPABASE_URL = supabaseUrlPrefix;
  const SUPABASE_ANON_KEY =
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNuaWJqcXlhd3pkZHBjcGRyenJ6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MTk3NjY1MDMsImV4cCI6MjAzNTM0MjUwM30.p3HiV0fezopi5YUFmyCFYMNKcb4TplKodJBt121oCiA";

  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  const sectionNames = [
    "home",
    "about",
    "trees",
    "resources",
    "quiz"
  ];


  const speciesContainer = document.getElementById('species-container');
  const filterButton = document.getElementById('filters-btn');
  const filters = document.getElementById('filters');
  optionsContainer = document.querySelector(".options");
  
  
  function populateFilterOptions(selectElement, dataSet) {
    selectElement.innerHTML = '<option value="">All</option>';
  
    Array.from(dataSet)
      .filter(value => value && value.trim() !== "") // Remove empty values
      .sort((a, b) => a.localeCompare(b)) // Sort alphabetically
      .forEach(value => {
        const option = document.createElement('option');
        option.value = value;
        option.textContent = value;
        selectElement.appendChild(option);
      });
  }

  
  async function fetchSpecimen(){
      const { data, error } = await supabase
        .from('botanical_specimen_view')
        .select();

    if (error) {
        console.error('Error fetching species:', error);
        return null;
    }

    return data;
  }

  async function fetchSpecies(){
    const { data, error } = await supabase
      .from('botanical_species_view')
      .select();

    if (error) {
        console.error('Error fetching species:', error);
        return null;
    }

    return data;
  }

  async function loadSpecimen() {
    const specimenData = await fetchSpecimen();

    if (!specimenData) {
        console.error("No specimen data received.");
        return;
    }

    const familySet = new Set();
    const genusSet = new Set();
    const speciesSet = new Set();
    const commonNameSet = new Set();

    trees = specimenData;

    specimenData.forEach(specimen => {
        familySet.add(specimen.family);
        genusSet.add(specimen.genus);
        speciesSet.add(specimen.species);

        if (specimen.common_name && typeof specimen.common_name === "object") {
            Object.values(specimen.common_name).forEach(name => commonNameSet.add(name));
        }
    });

    specimenData.sort((a, b) => a.common_name[0].localeCompare(b.common_name[0], undefined, { sensitivity: 'base' }));

    plantFamilies = Array.from(familySet);

    populateFilterOptions(document.getElementById('family-filter'), familySet);
    populateFilterOptions(document.getElementById('genus-filter'), genusSet);
    populateFilterOptions(document.getElementById('species-filter'), speciesSet);
    populateFilterOptions(document.getElementById('common-name-filter'), commonNameSet);

    displayFilteredSpecimen(specimenData);  

    document.querySelectorAll('#filters select').forEach(filter => {
        filter.addEventListener('change', () => displayFilteredSpecimen(specimenData));
    });
  }

  function displayFilteredSpecimen(specimenData) {
    const familyFilter = document.getElementById('family-filter').value;
    const genusFilter = document.getElementById('genus-filter').value;
    const speciesFilter = document.getElementById('species-filter').value;
    const commonNameFilter = document.getElementById('common-name-filter').value;

    const filteredData = specimenData.filter(specimen => {
        const commonNames = (specimen.common_name && typeof specimen.common_name === "object") 
            ? Object.values(specimen.common_name) 
            : [];

        return (!familyFilter || specimen.family === familyFilter) &&
              (!genusFilter || specimen.genus === genusFilter) &&
              (!speciesFilter || specimen.species === speciesFilter) &&
              (!commonNameFilter || commonNames.includes(commonNameFilter));
    });

    speciesContainer.innerHTML = '';

    filteredData.forEach(specimen => {
      const card = document.createElement('div');
      card.classList.add('card');
      card.id = `specimen-card-${specimen.id}`;

      let imageFilenames = [];
      let imageDescriptions = [];

      if (specimen.images) {
          imageFilenames = JSON.parse(specimen.images);
          imageDescriptions = JSON.parse(specimen.image_info || "[]");

          while (imageDescriptions.length < imageFilenames.length) {
              imageDescriptions.push(""); // Ensure descriptions array matches images array length
          }
      }

      const commonNames = (specimen.common_name && typeof specimen.common_name === "object") 
          ? Object.values(specimen.common_name) 
          : ["Unknown Name"];

      let innerHTML = "";

      innerHTML += `<div class="gallery">`;

      innerHTML += `<div class="thumbnail-container">`;
      if (imageFilenames.length > 0) {
              //const thumbnailUrl = `${supabaseUrlPrefix}${supabaseStoragePrefix}botanical_specimen/${specimen.id}/thumb_${imageFilenames[0]}`;
              const fullImageUrl = `${supabaseUrlPrefix}${supabaseStoragePrefix}botanical_specimen/${specimen.id}/${imageFilenames[0]}`;
              innerHTML += `<img class="thumbnail" src="${fullImageUrl}" alt="${imageDescriptions[0] || 'Specimen image'}" loading="lazy"> `;
      } else {
          innerHTML += `<img class="thumbnail placeholder-overlay" src="${supabaseUrlPrefix}${supabaseStoragePrefix}/placeholder.jpg" loading="lazy">`;
      }

      innerHTML += `</div>`; // Close gallery div

      innerHTML += `<div class="card-header">${commonNames[0]}</div>`
      
      innerHTML += `
          <details>
            <summary id="speciesName"><p class="species-name title italic">${specimen.genus} ${specimen.species}</p></summary>
            <div class="info-wrapper">
            <p class="info italic family"><t class="normal">Family: </t>${specimen.family}</p>`; 

            innerHTML += `<details class="info location-details">
            <summary id="leafSummary">
              <t>Location: </t>
            </summary>  
                <a class="attr-info" id="specimen-card-map-link-${specimen.id}">
                <span class="material-symbols-outlined">
                    pin_drop
                    </span>Open In Map
              </a>
              <a class="attr-info gmaps-open-in" href="https://www.google.com/maps/search/?api=1&query=${specimen.latitude}%2C${specimen.longitude}">
                <img src="${supabaseUrlPrefix}${supabaseStoragePrefix}symbols/gmaps-icon.png" class="gmaps-icon">
                Open In Google Maps
              </a>
              `;


              innerHTML += `</p>
          </details>`;
            
                  
    
      
      if (specimen.native_range) {
          innerHTML += `<details  class="info" id="nativeHabitatDetails">
            <summary id="leafSummary">
              <t>Native Habitat: </t>
            </summary>
              <p class="desc-info">${specimen.native_range}</p>
              </details>
              `;
      }
      if (specimen.species_info) {
          innerHTML += `<details  class="info" id="descDetails">
            <summary id="leafSummary">
              <t>Description: </t>
            </summary>
              <p class="desc-info">${specimen.species_info}</p>`;
              if (specimen.specimen_info) {
                innerHTML +=`<p class="desc-info">${specimen.specimen_info}</p>`;
              }
              innerHTML +=  `</details>`;
      }
      
      if (specimen.resources && specimen.resources.ati) {
        
        innerHTML +=  `<details  class="info" id="descDetails">
        <summary id="leafSummary">
          <t>Links: </t>
        </summary>
        <a class="attr-info" href="https://ati.woodlandtrust.org.uk/tree-search/tree?treeid=${specimen.resources.ati}">
          This tree appears in the Woodland Trust Ancient Tree Inventory
        </a>
          </details> `; 
      }

  /*if (specimen.attributes) {
    innerHTML += `
    <details class="info" id="leafDetails">
    <summary id="leafSummary">
      <t>Attributes: </t>
    </summary>
  <details class="attr-info" id="leafDetails">
    <summary id="attr-summary">
      <t>Leaves:</t>
    </summary>
      <p><t class="attr-info">Leaf Type: </t>${specimen.attributes.leaf_type}
      <br><t class="attr-info">Shape: </t>${specimen.attributes.leaf_shape}
      <br><t class="attr-info">Margin: </t>${specimen.attributes.leaf_margin}
      <br><t class="attr-info">Venation: </t>${specimen.attributes.leaf_venation}
      <br><t class="attr-info">Arrangement: </t>${specimen.attributes.leaf_arrangement}
      <br><t class="attr-info">Duration: </t>${specimen.attributes.leaf_duration}</p>      
  </details>

  <details class="attr-info" id="barkWoodDetails">
    <summary id="attr-summary">
      <t>Bark & Wood:</t>
    </summary>
      <p><t class="attr-info">Bark Texture: </t>${specimen.attributes.bark_texture}
      <br><t class="attr-info">Bark Colour: </t>${specimen.attributes.bark_colour}
      <br><t class="attr-info">Wood Type: </t>${specimen.attributes.wood_type}
      <br><t class="attr-info">Wood Colour: </t>${specimen.attributes.wood_colour}</p>
  </details>

  <details class="attr-info" id="fruitFlowerDetails">
    <summary id="attr-summary">
      <t>Fruit & Flowers:</t>
    </summary>
      <p><t class="attr-info">Fruit Type: </t>${specimen.attributes.fruit_type}
      <br><t class="attr-info">Fruit Colour: </t>${specimen.attributes.fruit_colour}
      <br><t class="attr-info">Fruit Season: </t>${specimen.attributes.fruit_season}
      <br><t class="attr-info">Flower Type: </t>${specimen.attributes.flower_type}
      <br><t class="attr-info">Flower Colour: </t>${specimen.attributes.flower_colour}
      <br><t class="attr-info">Flower Season: </t>${specimen.attributes.flower_season}</p>
  </details>
  </details>

  `;}*/

  innerHTML += `</details></div>`; // Close info-wrapper

  
  card.innerHTML = innerHTML;

  speciesContainer.appendChild(card);

  const cardMapLink = document.getElementById(`specimen-card-map-link-${specimen.id}`);
  if (cardMapLink) {
    cardMapLink.addEventListener('click', () => {
      for (const section in sections) {
        sections[section].style.display = "none";
      }
      map.setTarget("map");
      sections["map"].style.display = "block";
      previousSection = "card";
      currentSection = "map";
      const coordinates = fromLonLat([specimen.longitude, specimen.latitude]);
  
      let popupInnerHTML = `
        <div class="map-card" data-specimen-id="${specimen.id}">
          <div class="gallery">`;
  
      if (specimen.images) {
        const imageFilenames = JSON.parse(specimen.images);
        const imageUrl = `${supabaseUrlPrefix}${supabaseStoragePrefix}botanical_specimen/${specimen.id}/${imageFilenames[0]}`;
        popupInnerHTML += `<div class="thumbnail-container"><img class="thumbnail image-overlay" src="${imageUrl}" loading="lazy"></div>`;
      }
      
  
      popupInnerHTML += `
          </div>
          <div class="card-header">${specimen.common_name[0]}</div>
          <p class="species-name title italic">${specimen.genus} ${specimen.species}</p>
          <p class="tap-for-more">Tap for more...</p>
        </div>`;
  
      showPopup(popupInnerHTML, coordinates);
      setTimeout(() => {
        animateMapToPopup(coordinates);
      }, 50);
    });
  }
        

    createMarker(specimen);  

    });
  }

    
  document.querySelector(".new-question").addEventListener("click", displayQuestion);


  filterButton.addEventListener("click", function() {
      filters.style.display = (filters.style.display === "none" || filters.style.display === "") ? "flex" : "none";
  });
  
  speciesData = await fetchSpecies();

  loadSpecimen();
  const treesNav = document.getElementById("trees-nav-li");
  const mapNav = document.getElementById("map-nav-li");
  const dropdownToggle = document.getElementById("dropdown-toggle");
  const dropdownContent = document.getElementById("dropdown-content");
  const menuIcon = document.getElementById("menu-icon");
  const knowBanner = document.getElementById("quiz-test-your");
  const mapViewOn = document.getElementById("map-view-on");
  const giantSeq = document.getElementById("trees-giant-seq");
  const resourcesNav = document.getElementById("resources-nav-li");
  const aboutNav = document.getElementById("about-nav-li");
  const quizNav = document.getElementById("quiz-nav-li");
  const resourcesFooterNav = document.getElementById("resources-footer-nav-li");
  const aboutFooterNav = document.getElementById("about-footer-nav-li");
  const treesFooterNav = document.getElementById("trees-footer-nav-li");
  const contactFooterNav = document.getElementById("contact-footer-nav-li");
  const mapFooterNav = document.getElementById("map-footer-nav-li");
  const mapStraightTo = document.getElementById("map-straight-to");
  const aboutTrees = document.getElementById("about-trees");
  const backButton = document.getElementById("back-btn");



  function selectSection(event, displayValue) {
    let id = event.target.id;
    id = id.replace(/-.*/, "");
    backButton.style.opacity = 1;
    backButton.style["pointer-events"] = "auto";
    for (const section in sections) {
        sections[section].style.display = "none";
    }
    sections[id].style.display = displayValue;
    currentSection = id;
    if (id === "map"){
      map.setTarget("map");
    } else {
      map.setTarget(null);
    }
    dropdownContent.style.display = "none";
    menuIcon.textContent = "menu";
  }

  function handleBackNav(){
    const newPreviousSection = currentSection;
    const newCurrentSection = previousSection;
    dropdownContent.style.display = "none";
    menuIcon.textContent = "menu";
    for (const section in sections) {
      sections[section].style.display = "none";
    }
    if (newCurrentSection === "map"){
      map.setTarget("map");
    } else {
      map.setTarget(null);
    }
    sections[newCurrentSection].style.display = "block";
    previousSection = newPreviousSection;
    currentSection = newCurrentSection;
  }

  backButton.addEventListener("click", handleBackNav);

  dropdownToggle.addEventListener("click", () => {
    const isHidden = dropdownContent.style.display === "none" || !dropdownContent.style.display;
    dropdownContent.style.display = isHidden ? "block" : "none";
    menuIcon.textContent = isHidden ? "menu_open" : "menu";
  });
  


  knowBanner.addEventListener("click",  (event) => selectSection(event, "block"));
  quizNav.addEventListener("click",  (event) => selectSection(event, "block"));
  treesNav.addEventListener("click", (event) => selectSection(event, "block"));
  treesFooterNav.addEventListener("click", (event) => selectSection(event, "block"));
  giantSeq.addEventListener("click", (event) => selectSection(event, "block"));
  resourcesNav.addEventListener("click", (event) => selectSection(event, "block"));
  resourcesFooterNav.addEventListener("click", (event) => selectSection(event, "block"));
  aboutNav.addEventListener("click",  (event) => selectSection(event, "block"));
  aboutFooterNav.addEventListener("click",  (event) => selectSection(event, "block"));
  contactFooterNav.addEventListener("click", (event) => selectSection(event, "block"));
  mapNav.addEventListener("click", (event) => selectSection(event, "block"));
  mapFooterNav.addEventListener("click", (event) => selectSection(event, "block"));
  mapViewOn.addEventListener("click", (event) => selectSection(event, "block"));
  mapStraightTo.addEventListener("click", (event) => selectSection(event, "block"));
  //aboutTrees.addEventListener("click", (event) => selectSection(event, "block"));



  const popupContentEl = document.getElementById('popup-content');

  popupContentEl.addEventListener('click', function(event) {

    const specimenId = popupContentEl.querySelector('.map-card').dataset.specimenId;
    const foundSpecimen = trees.find(t => t.id === parseInt(specimenId));
    if (!foundSpecimen) return;

    for (const section in sections) {
      sections[section].style.display = "none";
    }

    const sheetSection = document.getElementById(`sheet-section`);
    sheetSection.innerHTML = "";

    const sheetElement = createSpecimenSheet(foundSpecimen);
    sheetSection.appendChild(sheetElement);

    sections["sheet"].style.display = "flex";
    previousSection = "map";
    currentSection = "sheet";
  });

  function animateMarkers() {
    if (activeMarker) {
      markerVectorLayer.changed();
    }
    requestAnimationFrame(animateMarkers);
  }
  animateMarkers();

  function forceClosePopup() {
    popupContainer.classList.remove('open');
    popupContainer.style.transition = 'none';

    popupContentEl.innerHTML = '';
    popupOverlay.setPosition(undefined);

    void popupContainer.offsetHeight;

    popupContainer.style.removeProperty('transition');
  }

  function showPopup(html, coords) {

    forceClosePopup();

    popupContentEl.innerHTML = html;
    popupOverlay.setPosition(coords);
    void popupContainer.offsetHeight;
    popupContainer.classList.add('open');

  }

  const labelVectorSource = new VectorSource();

  const labelVectorLayer = new VectorLayer({
    source: labelVectorSource,
    declutter: true,
    className: "marker-labels",
    style: function(feature) {
      return [
        new Style({
          text: new Text({
            font: '1.25rem Work-Sans, sans-serif',
            text: feature.get('label') || 'No Name',
            offsetY: -32,
            fill: new Fill({ color: 'orange' }),
            stroke: new Stroke({ color: '#000', width: 2 }),
          })
        })
      ];
    }
  });

  //map.addLayer(labelVectorLayer);


  function createMarker(specimen) {
    const feature = new Feature({
      geometry: new Point(fromLonLat([specimen.longitude, specimen.latitude])),
      specimenData: specimen,
      active: false
    });
    markerVectorSource.addFeature(feature);
  
    const labelFeature = new Feature({
      geometry: new Point(fromLonLat([specimen.longitude, specimen.latitude])),
      label: specimen.common_name[0]
    });
    //labelVectorSource.addFeature(labelFeature);

  }
  
  map.on('pointerdown', function (evt) {
    let clickedFeature = null;
    // Check if a marker from our vector layer was clicked
    map.forEachFeatureAtPixel(evt.pixel, function (feature, layer) {
      if (layer === markerVectorLayer) {
        clickedFeature = feature;
        return true; // stop iteration
      } 
    }, { hitTolerance: 5});
  
    if (clickedFeature) {
      // If another marker is active, deactivate it
      if (activeMarker && activeMarker !== clickedFeature) {
        activeMarker.set('active', false);
        activeMarker.changed();
      }
      // Toggle active state on the clicked feature
      if (clickedFeature.get('active')) {
        clickedFeature.set('active', false);
        clickedFeature.changed();
        forceClosePopup();
        activeMarker = null;
        // Remove blur from the map layer
        const olLayersEl = document.querySelector('.tile-layer');
        if (olLayersEl) {
          olLayersEl.style.filter = "blur(0)";
          isMapLayerBlurred = false;
        }
      } else {
        clickedFeature.set('active', true);
        activeMarker = clickedFeature;
        clickedFeature.changed();
        const specimen = clickedFeature.get('specimenData');
        const coordinates = clickedFeature.getGeometry().getCoordinates();
  
        // Construct popup HTML (similar to your original logic)
        let popupInnerHTML = `
          <div class="map-card" data-specimen-id="${specimen.id}">
            <div class="gallery">`;
        if (specimen.images) {
          const imageFilenames = JSON.parse(specimen.images);
          const imageUrl = `${supabaseUrlPrefix}${supabaseStoragePrefix}botanical_specimen/${specimen.id}/${imageFilenames[0]}`;
          popupInnerHTML += `<div class="thumbnail-container"><div class="thumbnail image-overlay" style="background-image: url(${imageUrl});"></div></div>`;
        }
        popupInnerHTML += `
            </div>
            <div class="card-header">${specimen.common_name[0]}</div>
            <p class="species-name title italic">${specimen.genus} ${specimen.species}</p>
            <p class="tap-for-more">Tap for more...</p>
          </div>`;
        showPopup(popupInnerHTML, coordinates);
        setTimeout(() => {
          animateMapToPopup(coordinates);
        }, 50);
  
        // Blur the tile layer if not already blurred
        const olLayersEl = document.querySelector('.tile-layer');
        if (!isMapLayerBlurred && olLayersEl) {
          olLayersEl.style.filter = "blur(3px)";
          isMapLayerBlurred = true;
        }
      }
    }
  });


  function animateMapToPopup(coordinates) {
    const popupEl = document.getElementById('popup-content');
    const popupHeightPx = popupEl?.offsetHeight || 200;
    const resolution = view.getResolution();
    const rotation = view.getRotation();

    const adjustedOffset = popupHeightPx * 0.5 * resolution;

    const offsetX = adjustedOffset * Math.sin(rotation);
    const offsetY = adjustedOffset * Math.cos(rotation);

    const adjustedCenter = [
      coordinates[0] - offsetX,
      coordinates[1] + offsetY
    ];

    view.animate({
      center: adjustedCenter,
      duration: 740.74074074074
    });
  }



  function createSpecimenSheet(specimen) {
    const sheet = document.createElement('div');
    sheet.classList.add('card', 'sheet');
    sheet.id = `specimen-sheet-${specimen.id}`;

    let imageFilenames = [], imageDescriptions = [];

    if (specimen.images) {
      imageFilenames = JSON.parse(specimen.images);
      imageDescriptions = JSON.parse(specimen.image_info || "[]");
    }

    let sheetInnerHTML = `<div class="gallery">`;
    if (imageFilenames.length > 0) {
      sheetInnerHTML += `<div class="thumbnail-container">`;
      imageFilenames.forEach((filename, index) => {
        const fullImageUrl = `${supabaseUrlPrefix}${supabaseStoragePrefix}botanical_specimen/${specimen.id}/${filename}`;
        sheetInnerHTML += `
          <img src="${fullImageUrl}" class="thumbnail" 
            onclick="openFullImage('${fullImageUrl}', '${imageDescriptions[index] || ''}')" 
            alt="${imageDescriptions[index] || 'Specimen image'}" loading="lazy">
        `;
      });
      sheetInnerHTML += `</div>`;
    }

    const commonNames = (typeof specimen.common_name === "object")
      ? Object.values(specimen.common_name)
      : [specimen.common_name];

    sheetInnerHTML += `</div>
      <div class="card-header">${commonNames.join(", ")}</div>
      <div>
        <p class="species-name title italic">${specimen.genus} ${specimen.species}</p>
        <div class="info-wrapper">
          <p class="info italic family"><t class="normal">Family: </t>${specimen.family}</p>
          <div class="info location-details">
            <t>Location: </t>
            <a class="attr-info" id="specimen-sheet-map-link-${specimen.id}">
              <span class="material-symbols-outlined">pin_drop</span>Open In Map
            </a>
            <a class="attr-info gmaps-open-in" href="https://www.google.com/maps/search/?api=1&query=${specimen.latitude}%2C${specimen.longitude}">
              <img src="${supabaseUrlPrefix}${supabaseStoragePrefix}symbols/gmaps-icon.png" class="gmaps-icon">Open In Google Maps
            </a>
          </div>`;

    if (specimen.native_range) {
      sheetInnerHTML += `
        <div class="info">
          <t>Native Habitat: </t>
          <p class="desc-info">${specimen.native_range}</p>
        </div>`;
    }

    if (specimen.species_info) {
      sheetInnerHTML += `
        <div class="info">
          <t>Description: </t>
          <p class="desc-info">${specimen.species_info}`;
      if (specimen.specimen_info) {
        sheetInnerHTML += `<br>${specimen.specimen_info}`;
      }
      sheetInnerHTML += `</p></div>`;
    }

    if (specimen.resources && specimen.resources.ati) {
      sheetInnerHTML += `
        <div class="info">
          <t>Links: </t>
          <a class="attr-info" href="https://ati.woodlandtrust.org.uk/tree-search/tree?treeid=${specimen.resources.ati}">
            This tree appears in the Woodland Trust Ancient Tree Inventory
          </a>
        </div>`;
    }

    sheetInnerHTML += `</div>`;
    sheet.innerHTML = sheetInnerHTML;

    // Attach handler for reopening popup from the sheet view
    sheet.querySelector(`#specimen-sheet-map-link-${specimen.id}`).addEventListener('click', () => {
      for (const section in sections) {
        sections[section].style.display = "none";
      }
      sections["map"].style.display = "block";
      previousSection = "map";
      currentSection = "sheet";
      map.setTarget("map");
      const coordinates = fromLonLat([specimen.longitude, specimen.latitude]);
      popupOverlay.setPosition(coordinates);
      animateMapToPopup(coordinates);
    });

    return sheet;
  }

  map.setTarget(null);

  


});





function generateMultiQuestion(trees, speciesData) {
  const shuffledTrees = trees.sort(() => 0.5 - Math.random()).slice(0, 4);
  const correctTree = shuffledTrees[0]; // First tree is the correct answer

  const commonNames = shuffledTrees.map(t => {
    if (t.common_name && typeof t.common_name === "object") {
      const namesArray = Object.values(t.common_name);
      return namesArray.length > 0 ? namesArray[Math.floor(Math.random() * namesArray.length)] : "Unknown Name";
    }
    return "Unknown Name";
  });

  const correctCommonName = commonNames[0];

  let questionTypes = [
    {
      text: `<p class="question-text">What is the scientific name of ${correctCommonName}?</p>`,
      answer: `<i>${correctTree.genus} ${correctTree.species}</i>`,
      options: Array.from(new Set(shuffledTrees.map(t => `<i>${t.genus} ${t.species}</i>`)))
    },
    {
      text: `<p class="question-text"><i>${correctTree.genus} ${correctTree.species}</i> is commonly known as?</p>`,
      answer: correctCommonName,
      options: Array.from(new Set(commonNames))
    },
    {
      text: `<p class="question-text">What family does <i>${correctTree.genus} ${correctTree.species}</i> come under?</p>`,
      answer: `<i>${correctTree.family}</i>`,
      options: ensureFourOptions(
        [`<i>${correctTree.family}</i>`], 
        trees.map(t => `<i>${t.family}</i>`)
      )
    }
  ];

  if (correctTree.attributes){
    if (correctTree.attributes.flower_season) {
      questionTypes.push({
        text: `<p class="question-text">${correctCommonName} blossoms in what season?</p>`,
        answer: correctTree.attributes.flower_season,
        options: ["Spring", "Summer", "Autumn", "Winter"]
      });
    }

    if (correctTree.attributes.fruit_type) {
      questionTypes.push({
        text: `<p class="question-text">What type of fruit does ${correctCommonName} have?</p>`,
        answer: correctTree.attributes.fruit_type,
        options: ensureFourOptions([
          correctTree.attributes.fruit_type], 
          trees.map(t => t.attributes.fruit_type)
      )
      });
    }

    if (correctTree.attributes.bark_texture) {
      questionTypes.push({
        text: `<p class="question-text">What type of bark texture does ${correctCommonName} have?</p>`,
        answer: correctTree.attributes.bark_texture,
        options: ensureFourOptions([
          correctTree.attributes.bark_texture], 
          trees.map(t => t.attributes.bark_texture)
      )
      });
    }

    if (correctTree.attributes.fruit_season) {
      questionTypes.push({
        text: `<p class="question-text">What is the fruiting season of ${correctCommonName}?</p>`,
        answer: correctTree.attributes.fruit_season,
        options: ["Spring", "Summer", "Autumn", "Winter"]
      });
    }

    if (correctTree.attributes.life_cycle) {
      questionTypes.push({
        text: `<p class="question-text">What's the life cycle of ${correctCommonName}?</p>`,
        answer: correctTree.attributes.life_cycle,
        options: ["Deciduous", "Evergreen"]
      });
    }

    if (correctTree.attributes.leaf_type) {
      const correctLeafType = correctTree.attributes.leaf_type;
      
      questionTypes.push({
          text: `<p class="question-text">What type of leaves does <i>${correctTree.genus} ${correctTree.species}</i> have?</p>`,
          answer: correctLeafType,
          options: ensureFourOptions(
              [correctLeafType], 
              trees.map(t => t.attributes.leaf_type)
          )
      });

      questionTypes.push({
        text: `<p class="question-text">What type of leaves does ${correctCommonName} have?</p>`,
        answer: correctLeafType,
        options: ensureFourOptions(
            [correctLeafType], 
            trees.map(t => t.attributes.leaf_type)
        )
      });
    }
    if (correctTree.attributes.leaf_shape){
      const correctLeafShape = correctTree.attributes.leaf_shape;
      questionTypes.push({
        text: `<p class="question-text">What leaf shape does <i>${correctTree.genus} ${correctTree.species}</i> have?</p>`,
        answer: correctLeafShape,
        options: ensureFourOptions(
            [correctLeafShape], 
            trees.map(t => t.attributes.leaf_shape)
        )
      });

      questionTypes.push({
        text: `<p class="question-text">What leaf shape does ${correctCommonName} have?</p>`,
        answer: correctLeafShape,
        options: ensureFourOptions(
            [correctLeafShape], 
            trees.map(t => t.attributes.leaf_shape)
        )
      });
    }
  

  }



  const specimensWithImages = trees.filter(specimen => specimen.images && specimen.images.length > 0);

  if (specimensWithImages.length > 0) {
    const imageSpecimen = specimensWithImages[Math.floor(Math.random() * specimensWithImages.length)];
    const imageFilenames = JSON.parse(imageSpecimen.images);

    // Pick a random image instead of always using the first one
    const randomImage = imageFilenames[Math.floor(Math.random() * imageFilenames.length)];
    const imageUrl = `${supabaseUrlPrefix}${supabaseStoragePrefix}botanical_specimen/${imageSpecimen.id}/${randomImage}`;

    // Find the species data that matches this specimen
    const matchingSpecies = speciesData.find(s => s.genus === imageSpecimen.genus && s.species === imageSpecimen.species);
    const speciesCommonNames = matchingSpecies ? Object.values(matchingSpecies.common_name) : ["Unknown Name"];
    const correctCommonName = speciesCommonNames[0];

    questionTypes.push({
      text: `<img src="${imageUrl}" class="quiz-image"><p class="question-text">What is the common name of this tree?</p>`,
      answer: correctCommonName,
      options: ensureFourOptions(
        [correctCommonName], 
        speciesData.flatMap(s => Object.values(s.common_name))
      )
    });

    const correctScientificName = `<i>${imageSpecimen.genus} ${imageSpecimen.species}</i>`;

    questionTypes.push({
      text: `<img src="${imageUrl}" class="quiz-image"><p class="question-text">What is the scientific name of this tree?</p>`,
      answer: correctScientificName,
      options: ensureFourOptions(
        [correctScientificName], 
        speciesData.map(s => `<i>${s.genus} ${s.species}</i>`)
      )
    });
  }

  const question = questionTypes[Math.floor(Math.random() * questionTypes.length)];

  return {
    question: question.text,
    options: shuffleArray(question.options),
    correctAnswer: question.answer
  };
}


function ensureFourOptions(baseOptions, possibleOptions) {
  const uniqueOptions = new Set(baseOptions);
  while (uniqueOptions.size < 4 && possibleOptions.length > 0) {
    const randomOption = possibleOptions[Math.floor(Math.random() * possibleOptions.length)];
    uniqueOptions.add(randomOption);
  }
  return Array.from(uniqueOptions);
}

function shuffleArray(array) {
  return array.sort(() => 0.5 - Math.random());
}

let timer;
let timeLeft = 15; // Timer duration in seconds

function startTimer(correctAnswer) {
    const timerElement = document.querySelector(".timer");
    timeLeft = 15; // Reset timer
    timerElement.innerHTML = `${timeLeft}s`;

    timer = setInterval(() => {
        timeLeft--;
        timerElement.innerHTML = `${timeLeft}s`;

        if (timeLeft <= 0) {
            clearInterval(timer);
            handleTimeout(correctAnswer);
        }
    }, 1000);
}

function handleTimeout(correctAnswer) {
    const timerElement = document.querySelector(".timer");
    const optionsButtons = document.querySelectorAll(".options button");

    // Disable all options
    optionsButtons.forEach(button => {
        button.disabled = true;
        if (button.innerHTML.includes(correctAnswer)) {
            button.classList.add("correct"); // Highlight correct answer
        }
    });

    timerElement.innerHTML = `Time's up! The correct answer is ${correctAnswer}.`;
    document.querySelector(".new-question").style.display = "block";
}

function handleIncorrectAnswer(selectedButton, correctAnswer) {
    clearInterval(timer); // Stop the timer

    // Disable all options
    document.querySelectorAll(".options button").forEach(button => {
        button.disabled = true;
        if (button.innerHTML.includes(correctAnswer)) {
            button.classList.add("correct"); // Highlight correct answer
        }
    });

    selectedButton.classList.add("incorrect");
    document.querySelector(".timer").innerHTML = `Incorrect! The correct answer is ${correctAnswer}.`;
    document.querySelector(".new-question").style.display = "block";
}

function handleCorrectAnswer(selectedButton) {
    clearInterval(timer); // Stop the timer

    // Disable all options
    document.querySelectorAll(".options button").forEach(button => {
        button.disabled = true;
    });

    selectedButton.classList.add("correct");
    document.querySelector(".timer").innerHTML = "Correct! Well done!";
    document.querySelector(".new-question").style.display = "block";
}

function displayQuestion() {
    const quizContainer = document.querySelector(".quiz-container");
    const questionElement = document.querySelector(".question");
    const newQuestionButton = document.querySelector(".new-question");
    const optionsElement = document.querySelector(".options");
    const timerElement = document.querySelector(".timer");

    timerElement.style.display = "block";
    optionsElement.style.display = "flex";
    newQuestionButton.style.display = "none"; // Hide "Next" button initially
    newQuestionButton.textContent = "Next";
    //window.scrollTo({ top: headerHeight, behavior: 'smooth' });

    clearInterval(timer); // Clear any existing timer
    timerElement.textContent = ""; // Clear previous messages

    const newQuestion = generateMultiQuestion(trees, speciesData);

    questionElement.innerHTML = newQuestion.question;
    optionsElement.innerHTML = ""; // Clear previous options

    const labels = ["A", "B", "C", "D"];
    newQuestion.options.forEach((option, index) => {
        const button = document.createElement("button");
        button.innerHTML = `${labels[index]}: ${option}`;
        button.onclick = () => {
            clearInterval(timer); // Stop timer when an option is selected
            disableOptions();
            if (option === newQuestion.correctAnswer) {
                handleCorrectAnswer(button);
            } else {
                handleIncorrectAnswer(button, newQuestion.correctAnswer);
            }
        };
        optionsElement.appendChild(button);
    });

    startTimer(newQuestion.correctAnswer); // Start the timer
}

function disableOptions() {
    document.querySelectorAll(".options button").forEach(button => {
        button.disabled = true;
    });
}


window.openFullImage = function(imageUrl, description) {
  const modal = document.createElement('div');
  modal.classList.add('image-modal');
  modal.innerHTML = `
    <div class="modal-content">
    <span class="close-btn" onclick="this.parentElement.parentElement.remove()">✖</span>
      <img src="${imageUrl}" alt="${description}">
      <p>${description}</p>
    </div>
  `;
  document.body.appendChild(modal);
};


