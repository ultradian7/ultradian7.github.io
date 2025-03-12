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

      // Extract names from common_name object
      const commonNames = (specimen.common_name && typeof specimen.common_name === "object") 
          ? Object.values(specimen.common_name) 
          : ["Unknown Name"];

      let innerHTML = `
          <div class="card-header">${commonNames.join(", ")}</div>`;

      // Add image thumbnails if available

      
      innerHTML += `
          <details class="info-wrapper">
            <summary id="speciesName"><p class="species-name title italic">${specimen.genus} ${specimen.species}</p></summary>
            <p class="info italic family"><t class="normal">Family: </t>${specimen.family}</p>`;

/*if (specimen.attributes) {
        innerHTML += `
<details class="info" id="leafDetails">
  <summary id="leafSummary">
    <p><t>Leaf Type: </t>${specimen.attributes["leaf"]["leaf_type"]}</p>
  </summary>
    <p><br><t>Shape: </t>${specimen.attributes["leaf"]["shape"]}
    <br><t>Margin: </t>${specimen.attributes["leaf"]["margin"]}
    <br><t>Duration: </t>${specimen.attributes["leaf"]["duration"]}
    <br><t>Venation: </t>${specimen.attributes["leaf"]["venation"]}
    <br><t>Arrangement: </t>${specimen.attributes["leaf"]["arrangement"]}</p>
</details>`;
    }*/
      


      innerHTML += `<p class="info"><t>Location: </t>${specimen.latitude.toFixed(6)}, ${specimen.longitude.toFixed(6)}</p>`;
      
      if (specimen.native_range) {
          innerHTML += `<p class="info"><t>Native Range: </t>${specimen.native_range}</p>`;
      }
      if (specimen.species_info) {
          innerHTML += `<p class="info"><t>Description: </t>${specimen.species_info}</p>`;
      }
      if (specimen.specimen_info) {
          innerHTML += `<p class="info"><t>Specimen: </t>${specimen.specimen_info}</p>`;
      }

      innerHTML += `</details>`; // Close info-wrapper

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
  const quizView = document.getElementById("quiz-view");
  const specimenWrapper = document.getElementById("specimen-wrapper");

  startQuizButton.addEventListener("click", function(){
    if (quizView.style.display === "none"){
      quizView.style.display = "flex";
      speciesContainer.style.display = "none";
      startQuizButton.textContent = "Back";
      displayQuestion();


    } else {
      quizView.style.display = "none";
      speciesContainer.style.display = "grid";
      startQuizButton.textContent = "Start Quiz";
    }
  });
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
      text: `<p class="question-text">Which of the following is <i>${correctTree.genus} ${correctTree.species}</i> commonly known as?</p>`,
      answer: correctCommonName,
      options: Array.from(new Set(commonNames))
    },
    {
      text: `<p class="question-text">What family does <i>${correctTree.genus} ${correctTree.species}</i> fall under?</p>`,
      answer: `<i>${correctTree.family}</i>`,
      options: ensureFourOptions(
        [`<i>${correctTree.family}</i>`], 
        trees.map(t => `<i>${t.family}</i>`)
      )
    }
  ];

  // **📸 Image-Based Questions**
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
