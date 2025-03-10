import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

const supabaseUrlPrefix = "https://cnibjqyawzddpcpdrzrz.supabase.co";

document.addEventListener("DOMContentLoaded", async function () {
  const SUPABASE_URL = supabaseUrlPrefix;
  const SUPABASE_ANON_KEY =
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNuaWJqcXlhd3pkZHBjcGRyenJ6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MTk3NjY1MDMsImV4cCI6MjAzNTM0MjUwM30.p3HiV0fezopi5YUFmyCFYMNKcb4TplKodJBt121oCiA";

  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  const speciesContainer = document.getElementById('species-container');

  
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
  
    specimenData.sort((a, b) => a.common_name.localeCompare(b.common_name, undefined, { sensitivity: 'base' }));
  
    specimenData.forEach(specimen => {
      familySet.add(specimen.family);
      genusSet.add(specimen.genus);
      speciesSet.add(specimen.species);
      commonNameSet.add(specimen.common_name);
    });
  
    populateFilterOptions(document.getElementById('family-filter'), familySet);
    populateFilterOptions(document.getElementById('genus-filter'), genusSet);
    populateFilterOptions(document.getElementById('species-filter'), speciesSet);
    populateFilterOptions(document.getElementById('common-name-filter'), commonNameSet);
  
    displayFilteredSpecimen(specimenData);
  
    document.querySelectorAll('#filters select').forEach(filter => {
      filter.addEventListener('change', () => displayFilteredSpecimen(specimenData));
    });
  }
  
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
  
  
  function displayFilteredSpecimen(specimenData) {
    const familyFilter = document.getElementById('family-filter').value;
    const genusFilter = document.getElementById('genus-filter').value;
    const speciesFilter = document.getElementById('species-filter').value;
    const commonNameFilter = document.getElementById('common-name-filter').value;
  
    const filteredData = specimenData.filter(specimen =>
      (!familyFilter || specimen.family === familyFilter) &&
      (!genusFilter || specimen.genus === genusFilter) &&
      (!speciesFilter || specimen.species === speciesFilter) &&
      (!commonNameFilter || specimen.common_name === commonNameFilter)
    );
  
    speciesContainer.innerHTML = '';
  
    filteredData.forEach(specimen => {
      const card = document.createElement('div');
      card.classList.add('card');
  
      let innerHTML = `
        <div class="card-header">${specimen.common_name}</div>
        <p class="species-name title italic">${specimen.genus} ${specimen.species}</p>
        <div class="info-wrapper">
      `;
  
      if (specimen.family) {
        innerHTML += `<p class="info italic family"><t class="normal">Family: </t>${specimen.family}</p>`;
      }
      if (specimen.native_range) {
        innerHTML += `<p class="info"><t>Native Range: </t>${specimen.native_range}</p>`;
      }
      if (specimen.species_info) {
        innerHTML += `<p class="info"><t>Description: </t>${specimen.species_info}</p>`;
      }
      if (specimen.specimen_info) {
        innerHTML += `<p class="info"><t>Specimen: </t>${specimen.specimen_info}</p>`;
      }
  
      innerHTML += `</div>`;
      card.innerHTML = innerHTML;
      speciesContainer.appendChild(card);
    });
  }
  
  function addFilterButtonListener() {
    const filterButton = document.getElementById('filters-btn');
    const filters = document.getElementById('filters');

    if (!filterButton || !filters) {
        console.error("Filter button or filters container not found.");
        return;
    }

    filterButton.addEventListener("click", function() {
        filters.style.display = (filters.style.display === "none" || filters.style.display === "") ? "flex" : "none";
    });
  }
  

  loadSpecimen();
  addFilterButtonListener(); 
});