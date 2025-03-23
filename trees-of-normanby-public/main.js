import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

const supabaseUrlPrefix = "https://cnibjqyawzddpcpdrzrz.supabase.co";
const supabaseStoragePrefix = "/storage/v1/object/public/images/";

let trees = [];
let speciesData = [];
let plantFamilies = [];
let optionsContainer;
let headerHeight;
let selectedMarker;



  // Initialize the map and set its view to your chosen geographical coordinates and zoom level
  const map = L.map('map', { attributionControl: false }).setView([53.635908, -0.657139], 16); // Adjust coordinates and zoom to your region
  const mapBounds = L.latLngBounds(
      L.latLng(53.65347, -0.70682), // Southwest corner
      L.latLng(53.61198, -0.60913)  // Northeast corner
  );
  map.setMaxBounds(mapBounds);
  map.fitBounds(mapBounds);

  L.control.attribution({ prefix: false }).addTo(map);

  const customTileLayer = L.tileLayer('https://cnibjqyawzddpcpdrzrz.supabase.co/storage/v1/object/public/tiles/15-19-jpg/{z}/{x}/{y}.jpg', {
      noWrap: true,
      maxZoom: 19,
      minZoom: 15,
      bounds: mapBounds, 
      tms: true,
      attribution: '© Ultradian7',
      errorTileUrl: 'images/placeholder-tile.jpg',
  }).addTo(map);

  var treeMarkers = new L.LayerGroup().addTo(map);

var locationPinSVG = `<svg fill="#000000" version="1.1" id="Capa_1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" 
width="2rem" height="3rem" viewBox="0 0 425.963 425.963"
xml:space="preserve">
<g>
<path d="M213.285,0h-0.608C139.114,0,79.268,59.826,79.268,133.361c0,48.202,21.952,111.817,65.246,189.081
 c32.098,57.281,64.646,101.152,64.972,101.588c0.906,1.217,2.334,1.934,3.847,1.934c0.043,0,0.087,0,0.13-0.002
 c1.561-0.043,3.002-0.842,3.868-2.143c0.321-0.486,32.637-49.287,64.517-108.976c43.03-80.563,64.848-141.624,64.848-181.482
 C346.693,59.825,286.846,0,213.285,0z M274.865,136.62c0,34.124-27.761,61.884-61.885,61.884
 c-34.123,0-61.884-27.761-61.884-61.884s27.761-61.884,61.884-61.884C247.104,74.736,274.865,102.497,274.865,136.62z"/>
</g>
</svg>`;

var locationPinIcon = L.divIcon({
  className: 'map-location-pin',
  html: locationPinSVG,
  iconAnchor: [15, 40]
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

  const headerElement = document.getElementById('header');
  headerHeight = headerElement.getBoundingClientRect().height;

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

        // Extract names from common_name object and add to the filter
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

    const sheetSection = document.getElementById(`sheet-section`);

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
                innerHTML += `<div class="thumbnail image-overlay" style="background-image: url(${fullImageUrl});" alt="${imageDescriptions[0] || 'Specimen image'}"> `;
        } else {
            innerHTML += `<div class="thumbnail image-overlay" style="background-image: url('images/placeholder.jpg'  );">`;
        }
        innerHTML += `</div>`;
        
            
      
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
                  <img src="images/gmaps-icon.png" class="gmaps-icon">
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
          <a class="attr-info gmaps-open-in" href="https://ati.woodlandtrust.org.uk/tree-search/tree?treeid=${specimen.resources.ati}">
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



/////////////////////////////


          let popupInnerHTML = `<div class="map-card">`;

        popupInnerHTML += `<div class="gallery">`;

       
        if (imageFilenames.length > 0) {
          popupInnerHTML += `<div class="thumbnail-container">`;
                const thumbnailUrl = `${supabaseUrlPrefix}${supabaseStoragePrefix}botanical_specimen/${specimen.id}/thumb_${imageFilenames[0]}`;
                popupInnerHTML += `
                    <img src="${thumbnailUrl}" class="thumbnail" alt="${imageDescriptions[0] || 'Specimen image'}">`;
        }
        popupInnerHTML += `</div>`;
        
            
      
        popupInnerHTML += `</div>`; // Close gallery div

        popupInnerHTML += `<div class="card-header">${commonNames[0]}</div>`
        
        popupInnerHTML += `
              <p class="species-name title italic">${specimen.genus} ${specimen.species}</p>
              <p class="tap-for-more">Tap for more...</p>
            `;

            popupInnerHTML += `</div>`;


            ///////////////////////

            const sheet = document.createElement('div');

            sheet.classList.add('card');
            sheet.classList.add('sheet');
            sheet.id = `specimen-sheet-${specimen.id}`;

            let sheetInnerHTML = "";

            sheetInnerHTML += `<div class="gallery">`;
    
            sheetInnerHTML += `<div class="thumbnail-container">`;
            if (imageFilenames.length > 0) {
                imageFilenames.forEach((filename, index) => {
                    const thumbnailUrl = `${supabaseUrlPrefix}${supabaseStoragePrefix}botanical_specimen/${specimen.id}/thumb_${filename}`;
                    const fullImageUrl = `${supabaseUrlPrefix}${supabaseStoragePrefix}botanical_specimen/${specimen.id}/${filename}`;
                    sheetInnerHTML += `
                        <img src="${thumbnailUrl}" class="thumbnail" 
                            onclick="openFullImage('${fullImageUrl}', '${imageDescriptions[index]}')" 
                            alt="${imageDescriptions[index] || 'Specimen image'}">
                    `;
                });
            } else {
              sheetInnerHTML += `
                    <img src="images/placeholder.jpg" class="thumbnail placeholder" 
                        alt="No image available">
                `;
            }
            sheetInnerHTML += `</div>`;
            
                
          
            sheetInnerHTML += `</div>`; // Close gallery div
    
            sheetInnerHTML += `<div class="card-header">${commonNames.join(", ")}</div>`
            
            sheetInnerHTML += `
                <div>
                  <p class="species-name title italic">${specimen.genus} ${specimen.species}</p>
                  <div class="info-wrapper">
                  <p class="info italic family"><t class="normal">Family: </t>${specimen.family}</p>`; 
    
                  sheetInnerHTML += `<div class="info location-details">
                    <t>Location: </t>
                      <a class="attr-info" id="specimen-sheet-map-link-${specimen.id}">
                      <span class="material-symbols-outlined">
                          pin_drop
                          </span>Open In Map
                      </a>
                    <a class="attr-info gmaps-open-in" href="https://www.google.com/maps/search/?api=1&query=${specimen.latitude}%2C${specimen.longitude}">
                      <img src="images/gmaps-icon.png" class="gmaps-icon">
                      Open In Google Maps
                    </a>
                    `;
    
    
                    sheetInnerHTML += `</p>
                </div>`;
                  
                        
          
            
            if (specimen.native_range) {
              sheetInnerHTML += `<div  class="info" id="nativeHabitatDetails">
                    <t>Native Habitat: </t>
                    <p class="desc-info"> ${specimen.native_range}</p>
                    </div>
                    `;
            }
            if (specimen.species_info) {
              sheetInnerHTML += `<div  class="info" id="descDetails">
                    <t>Description: </t>
                    <p class="desc-info"> ${specimen.species_info}`;
                    if (specimen.specimen_info) {
                      sheetInnerHTML +=`\n${specimen.specimen_info}`;
                    }
                    sheetInnerHTML +=  `</p></div>`;
            }
            
            if (specimen.resources && specimen.resources.ati) {
              
              sheetInnerHTML +=  `<div class="info" id="descDetails">
                <t>Links: </t>
              <a class="attr-info gmaps-open-in" href="https://ati.woodlandtrust.org.uk/tree-search/tree?treeid=${specimen.resources.ati}">
                This tree appears in the Woodland Trust Ancient Tree Inventory
              </a>
               </div> `; 
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
    
      sheetInnerHTML += `</div></div>`; // Close info-wrapper
    
            
      sheet.innerHTML = sheetInnerHTML;


        const popup = L.popup({ 
          offset: new L.Point(0,0), 
          className: 'map-card' 
      }).setContent(popupInnerHTML);
      
      const marker = L.marker([specimen.latitude, specimen.longitude], {icon: locationPinIcon})
          .addTo(map)
          .bindPopup(popup);
      
      // Bind click event to popup after it opens
      marker.on('popupopen', function(e) {
          const popupElement = e.popup._container;
          if (popupElement) {
              popupElement.addEventListener('click', function handleClick() {
                for (const section in sections) {
                  sections[section].style.display = "none";
                }

                sheetSection.innerHTML = "";
                sheetSection.appendChild(sheet);
                const sheetMapLinkElement = document.getElementById(`specimen-sheet-map-link-${specimen.id}`);
                sheetMapLinkElement.addEventListener("click", addMapLinkListener);


                marker.closePopup();

                sections["sheet"].style.display = "flex";

              });   


          }
      });
      

             // can access popup._container or popup.contentNode
              //$(popup._closeButton).one('click', function(e){
                //do something
            //});

        marker.addTo(treeMarkers);

        const cardMapLinkElement = document.getElementById(`specimen-card-map-link-${specimen.id}`);

      function addMapLinkListener(){
        for (const section in sections) {
          sections[section].style.display = "none";
        }
        sections["map"].style.display = "block";

        map.invalidateSize();
        //selectedMarker = L.marker([`${specimen.latitude}`, `${specimen.longitude}`]).addTo(map).bindPopup(`${commonNames[0]}`);
        //selectedMarker.openPopup();
        marker.openPopup();

        map.setView([specimen.latitude, specimen.longitude], 18);
      }

        cardMapLinkElement.addEventListener("click", addMapLinkListener);
        

    });
  }

  
  function generateCard(cardClass, ) {

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

  function selectSection(event, displayValue) {
    let id = event.target.id;
    id = id.replace(/-.*/, "");
    dropdownToggle.checked = "";
    for (const section in sections) {
        sections[section].style.display = "none";
    }
    sections[id].style.display = displayValue;
    if (id === "map"){
      map.invalidateSize();

      map.setView([53.635908, -0.657139], 16);
    }
}


  knowBanner.addEventListener("click",  (event) => selectSection(event, "flex"));
  quizNav.addEventListener("click",  (event) => selectSection(event, "flex"));
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



// Ensures we always have exactly 4 unique options
function ensureFourOptions(baseOptions, possibleOptions) {
  const uniqueOptions = new Set(baseOptions);
  while (uniqueOptions.size < 4 && possibleOptions.length > 0) {
    const randomOption = possibleOptions[Math.floor(Math.random() * possibleOptions.length)];
    uniqueOptions.add(randomOption);
  }
  return Array.from(uniqueOptions);
}

// Shuffles array items
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

    // Display timeout message
    timerElement.innerHTML = `Time's up! The correct answer is ${correctAnswer}.`;

    // Show the "Next" button
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

    selectedButton.classList.add("incorrect"); // Mark wrong answer

    // Show message
    document.querySelector(".timer").innerHTML = `Incorrect! The correct answer is ${correctAnswer}.`;

    // Show the "Next" button
    document.querySelector(".new-question").style.display = "block";
}

function handleCorrectAnswer(selectedButton) {
    clearInterval(timer); // Stop the timer

    // Disable all options
    document.querySelectorAll(".options button").forEach(button => {
        button.disabled = true;
    });

    selectedButton.classList.add("correct"); // Mark as correct

    // Show message
    document.querySelector(".timer").innerHTML = "Correct! Well done!";

    // Show the "Next" button
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
    window.scrollTo({ top: headerHeight, behavior: 'smooth' });

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

