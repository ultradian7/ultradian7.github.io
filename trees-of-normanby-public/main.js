import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

const supabaseUrlPrefix = "https://cnibjqyawzddpcpdrzrz.supabase.co";
const supabaseStoragePrefix = "/storage/v1/object/public/images/";

let trees = [];
let speciesData = [];
let plantFamilies = [];
let optionsContainer;

document.addEventListener("DOMContentLoaded", async function () {
  const SUPABASE_URL = supabaseUrlPrefix;
  const SUPABASE_ANON_KEY =
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNuaWJqcXlhd3pkZHBjcGRyenJ6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MTk3NjY1MDMsImV4cCI6MjAzNTM0MjUwM30.p3HiV0fezopi5YUFmyCFYMNKcb4TplKodJBt121oCiA";

  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

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

  speciesContainer.innerHTML = '';

  filteredData.forEach(specimen => {
      const card = document.createElement('div');
      card.classList.add('card');

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
          if (imageFilenames.length > 0) {
              innerHTML += `<div class="thumbnail-container">`;
              imageFilenames.forEach((filename, index) => {
                  const thumbnailUrl = `${supabaseUrlPrefix}${supabaseStoragePrefix}botanical_specimen/${specimen.id}/thumb_${filename}`;
                  const fullImageUrl = `${supabaseUrlPrefix}${supabaseStoragePrefix}botanical_specimen/${specimen.id}/${filename}`;
                  innerHTML += `
                      <img src="${thumbnailUrl}" class="thumbnail" 
                           onclick="openFullImage('${fullImageUrl}', '${imageDescriptions[index]}')" 
                           alt="${imageDescriptions[index] || 'Specimen image'}">
                  `;
              });
              innerHTML += `</div>`;
          }
    
          innerHTML += `</div>`; // Close gallery div

          innerHTML += `<div class="card-header">${commonNames.join(", ")}</div>`
      
      innerHTML += `
          <details>
            <summary id="speciesName"><p class="species-name title italic">${specimen.genus} ${specimen.species}</p></summary>
            <div class="info-wrapper">
            <p class="info italic family"><t class="normal">Family: </t>${specimen.family}</p>`; 

            innerHTML += `<details class="info location-details">
            <summary id="leafSummary">
              <t>Location: </t>
            </summary>
              <p><t class="attr-info">Latitude: </t>${specimen.latitude}
              <br><t class="attr-info">Longitude: </t>${specimen.longitude}
              <br><a class="attr-info" href="https://www.google.com/maps/search/?api=1&query=${specimen.latitude}%2C${specimen.longitude}"> 
              Open in Google Maps</a>
              </p>
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
               <p class="desc-info">${specimen.species_info}</p>
              </details>`;
      }
      if (specimen.specimen_info) {
          innerHTML += `<details  class="info" id="descDetails">
            <summary id="leafSummary">
              <t>Specimen: </t>
            </summary>
               <p class="desc-info">${specimen.specimen_info}</p>
              </details> `;          
      }

      if (specimen.attributes) {
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
    <br><t class="attr-info">Duration: </t>${specimen.attributes.leaf_duration}
    <br><t class="attr-info">Venation: </t>${specimen.attributes.leaf_venation}
    <br><t class="attr-info">Arrangement: </t>${specimen.attributes.leaf_arrangement}</p>
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

`;}

      innerHTML += `</details></div>`; // Close info-wrapper


      card.innerHTML = innerHTML;
      speciesContainer.appendChild(card);
  });
}

  


  
  document.querySelector(".new-question").addEventListener("click", displayQuestion);


  filterButton.addEventListener("click", function() {
      filters.style.display = (filters.style.display === "none" || filters.style.display === "") ? "flex" : "none";
  });
  
  speciesData = await fetchSpecies();

  loadSpecimen();

  const startQuizButton = document.getElementById("quiz-btn");
  const startQuizNav = document.getElementById("quiz-nav");
  const quizSection = document.getElementById("quiz");
  const browseSection = document.getElementById("browse");
  const browseNav = document.getElementById("browse-nav");
  const dropdownToggle = document.getElementById("dropdown-toggle");
  const homeSection = document.getElementById("home");
  const knowBanner = document.getElementById("know-banner");
  const homeNav = document.getElementById("home-nav");

  

  function startQuizCallback(){
      dropdownToggle.checked = "";
      quizSection.style.display = "flex";
      homeSection.style.display = "none";
      browseSection.style.display = "none";
      displayQuestion();
  }

  function selectSection(event){
    let id = event.target.id;
    dropdownToggle.checked = "";
    quizSection.style.display = "none";
    homeSection.style.display = "none";
    browseSection.style.display = "block";
}

  function selectBrowseView() {
    dropdownToggle.checked = "";
    quizSection.style.display = "none";
    homeSection.style.display = "none";
    browseSection.style.display = "block";
  }

  function selectHomeView() {
    dropdownToggle.checked = "";
    quizSection.style.display = "none";
    homeSection.style.display = "block";
    browseSection.style.display = "none";
  }




  startQuizButton.addEventListener("click", startQuizCallback);
  startQuizNav.addEventListener("click", startQuizCallback);
  knowBanner.addEventListener("click", selectBrowseView);
  browseNav.addEventListener("click", selectBrowseView);
  homeNav.addEventListener("click", selectHomeView);
  


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


function displayQuestion() {
  const quizContainer = document.querySelector(".quiz-container");
  const questionElement = document.querySelector(".question");

  const newQuestion = generateMultiQuestion(trees, speciesData);

  questionElement.innerHTML = newQuestion.question;
  optionsContainer.innerHTML = ""; // Clear previous options

  const labels = ["A", "B", "C", "D"]; // Labels for options
  newQuestion.options.forEach((option, index) => {
      const button = document.createElement("button");
      button.innerHTML = `${labels[index]}: ${option}`;
      button.onclick = () => {
          if (option === newQuestion.correctAnswer) {
              button.classList.add("correct");
          } else {
              button.classList.add("incorrect");
          }
      };
      optionsContainer.appendChild(button);
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
