import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

const supabaseUrlPrefix = "https://cnibjqyawzddpcpdrzrz.supabase.co";

document.addEventListener("DOMContentLoaded", async function () {
  const SUPABASE_URL = supabaseUrlPrefix;
  const SUPABASE_ANON_KEY =
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNuaWJqcXlhd3pkZHBjcGRyenJ6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MTk3NjY1MDMsImV4cCI6MjAzNTM0MjUwM30.p3HiV0fezopi5YUFmyCFYMNKcb4TplKodJBt121oCiA";

  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) {
    window.location.href = "login.html";
    return;
  }

  const userId = session.user.id;
  const displayName = (await fetchUserDisplayName(userId)) || session.user.email;
  document.getElementById("usernameText").textContent = displayName;

  document.getElementById("usernameContainer").addEventListener("click", () => {
    const dropdown = document.getElementById("userDropdown");
    dropdown.style.display = dropdown.style.display === "block" ? "none" : "block";
  });

  document.addEventListener("click", (event) => {
    const dropdown = document.getElementById("userDropdown");
    if (dropdown.style.display === "block" && !event.target.closest(".username-container")) {
      dropdown.style.display = "none";
    }
  });

  document.getElementById("logout-menu-item").addEventListener("click", async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error("Error logging out:", error);
    } else {
      window.location.href = "login.html";
    }
  });

  const cardContainer = document.getElementById("card-container");
  const addNewButton = document.getElementById("add-new-button");
  const kingdomFilter = document.getElementById("kingdom-filter");
  const viewSelector = document.getElementById("viewSelector");

  let currentView = "specimen";
  let kingdoms = [];
  let genusMap = {};
  let speciesMap = {};
  let varietyMap = {};
  let familyMap = {};
  let orderMap = {};
  let classMap = {};
  let phylumMap = {};
  let locationCategoriesMap = {};

  const viewChangeListener = () => switchView(viewSelector.value);
  const addNewCardListener = addNewCard;
  const kingdomFilterListener = fetchData;

  viewSelector.addEventListener("change", viewChangeListener);
  addNewButton.addEventListener("click", addNewCardListener);
  kingdomFilter.addEventListener("change", kingdomFilterListener);

  async function fetchUserDisplayName(userId) {
    try {
      const { data, error } = await supabase.rpc("get_user_display_name", { user_id: userId });

      if (error) {
        throw error;
      }

      return data;
    } catch (error) {
      console.error("Error fetching user display name:", error);
      return null;
    }
  }

  const observer = new MutationObserver((mutationsList) => {
    for (const mutation of mutationsList) {
      if (mutation.addedNodes.length > 0) {
        window.scrollTo({
          top: document.body.scrollHeight,
          behavior: "smooth",
        });
      }
    }
  });

  observer.observe(cardContainer, { childList: true, subtree: true });

  function generateJWT(header, payload, secret) {
    function base64Encode(str) {
      return btoa(unescape(encodeURIComponent(str)));
    }

    function signToken(header, payload, secret) {
      const headerBase64 = base64Encode(JSON.stringify(header));
      const payloadBase64 = base64Encode(JSON.stringify(payload));
      const signatureBase64 = base64Encode(headerBase64 + "." + payloadBase64 + "." + secret);
      return `${headerBase64}.${payloadBase64}.${signatureBase64}`;
    }

    return signToken(header, payload, secret);
  }

  function addShowLocationButtonListener(card) {
    const showLocationButton = card.querySelector("#show-location-button");
    showLocationButton.addEventListener("click", () => {
      let markerName = "";
      let altName = "";

      const header = {
        alg: "HS256",
        typ: "JWT",
      };

      //if (currentView === "park_locations") {
      //    markerName = card.querySelector("#locationName").value;
      //} else if (currentView === "specimen") {
      //    speciesId = card.querySelector("#speciesIdMenu").value;
      //}

      const speciesId = parseInt(card.querySelectorAll(".menu-button-container select")[0].value);
      const specimenId = parseInt(card.querySelector("#specimenIdField").textContent);
      const locationInput = card.querySelector("#locationField").value;
      const [latitude, longitude] = locationInput.split(", ").map((coord) => coord.trim());
      const specimenInfo = card.querySelector("#specimenInfoField").value;
      const isAccessible = card.querySelectorAll(".toggle-switch input")[0].checked;
      const imageFilenames = card.querySelector(".image-data").dataset.imageFilenames;
      const imageDescriptions = card.querySelector(".image-data").dataset.imageDescriptions;

      const payload = {
        lat: latitude,
        lng: longitude,
        speciesId: speciesId,
        specimenId: specimenId,
        specimenInfo: specimenInfo,
        isAccessible: isAccessible,
        images: imageFilenames,
        imageInfo: imageDescriptions,
        markerType: "Tree",
        showMarker: true,
        exp: Math.floor(Date.now() / 1000) + 60 * 60, // 1 hour expiration
      };

      const key = "key";
      const token = generateJWT(header, payload, key);
      const url = `https://ultradian7.github.io/trees-of-normanby-public/map/index.html?token=${encodeURIComponent(token)}`;
      window.open(url, "_blank");
    });
  }

  function addTaxonButtonListener(card) {
    const addButtons = card.querySelectorAll('[id*="add-"]');
    for (const button of addButtons) {
      button.addEventListener("click", (event) => {
        const id = event.target.id.replace(/add-/, "");
        const view = id.replace(/-button$/, "");
        switchView(view);
        setTimeout(() => {
          addNewCard();
        }, 300);
      });
    }
  }

  async function fetchKingdoms() {
    const { data: kingdomData, error } = await supabase.from("taxon_kingdom").select("id, name, common_name");
    if (error) {
      console.error("Error fetching kingdom data:", error);
      return;
    }
    kingdoms = kingdomData;
    kingdoms.forEach((kingdom) => {
      const option = document.createElement("option");
      option.value = kingdom.id;
      option.textContent = kingdom.common_name;
      kingdomFilter.appendChild(option);
    });
  }

  function switchView(view) {
    currentView = view;
    fetchData();
    viewSelector.value = view;
  }

  async function fetchData() {
    observer.disconnect();
    cardContainer.innerHTML = "";
    await fetchDropdownData();
    if (currentView === "species") {
      await fetchSpeciesData();
    } else if (currentView === "specimen") {
      await fetchSpecimenData();
    } else if (currentView === "genus") {
      await fetchGenusData();
    } else if (currentView === "family") {
      await fetchFamilyData();
    } else if (currentView === "order") {
      await fetchOrderData();
    } else if (currentView === "class") {
      await fetchClassData();
    } else if (currentView === "phylum") {
      await fetchPhylumData();
    } else if (currentView === "variety") {
      await fetchVarietyData();
    } else if (currentView === "park_locations") {
      await fetchParkLocationData();
    }
    observer.observe(cardContainer, { childList: true });
  }

  async function fetchDropdownData() {
    const [
      genusResponse,
      speciesResponse,
      varietyResponse,
      familyResponse,
      orderResponse,
      classResponse,
      phylumResponse,
      locationCategoriesResponse,
    ] = await Promise.all([
      supabase.from("taxon_genus").select("id, name"),
      supabase.from("taxon_species").select("id, name, genus_id"),
      supabase.from("taxon_variety").select("id, name"),
      supabase.from("taxon_family").select("id, name"),
      supabase.from("taxon_order").select("id, name"),
      supabase.from("taxon_class").select("id, name"),
      supabase.from("taxon_phylum").select("id, name"),
      supabase.from("location_categories").select("id, name"),
    ]);

    if (
      genusResponse.error ||
      speciesResponse.error ||
      varietyResponse.error ||
      familyResponse.error ||
      orderResponse.error ||
      classResponse.error ||
      phylumResponse.error
    ) {
      console.error(
        "Error fetching dropdown data:",
        genusResponse.error ||
          speciesResponse.error ||
          varietyResponse.error ||
          familyResponse.error ||
          orderResponse.error ||
          classResponse.error ||
          phylumResponse.error
      );
      return;
    }

    genusMap = createMap(genusResponse.data);
    speciesMap = createSpeciesMap(speciesResponse.data, genusMap);
    varietyMap = createMap(varietyResponse.data);
    familyMap = createMap(familyResponse.data);
    orderMap = createMap(orderResponse.data);
    classMap = createMap(classResponse.data);
    phylumMap = createMap(phylumResponse.data);
    locationCategoriesMap = createMap(locationCategoriesResponse.data);
  }

  async function fetchParkLocationData() {
    const { data: locationData, error } = await supabase
      .from("park_locations")
      .select(
        `
                                id,
                                name,
                                info,
                                tags,
                                location::geometry,
                                images,
                                image_info,
                                is_accessible,
                                category_id,
                                location_categories!inner (
                                    id,
                                    name,
                                    info,
                                    colour
                                )
                            `
      )
      .order("id");

    if (error) {
      console.error("Error fetching park locations data:", error);
      return;
    }

    console.log("Fetched location data:", locationData);

    const processedLocationData = locationData.map((location) => {
      const latitude = location.location ? parseFloat(location.location.coordinates[1]) : 0;
      const longitude = location.location ? parseFloat(location.location.coordinates[0]) : 0;

      return {
        ...location,
        latitude,
        longitude,
        tags: location.tags ? location.tags.join(", ") : "", // Convert JSONB array to comma-separated string
      };
    });

    processedLocationData.forEach((location) => createParkLocationCard(location));
    addSearchFunctionality();
    addUpdateFunctionality();
  }

  async function fetchSpeciesData() {
    const selectedKingdomId = kingdomFilter.value;

    let query = supabase
      .from("taxon_species")
      .select(
        `
                            id,
                            name,
                            common_name,
                            native_range,
                            info,
                            genus_id,
                            taxon_genus!inner (
                                id,
                                name,
                                taxon_family!inner (
                                    id,
                                    name,
                                    taxon_order!inner (
                                        id,
                                        name,
                                        taxon_class!inner (
                                            id,
                                            name,
                                            taxon_phylum!inner (
                                                id,
                                                name,
                                                kingdom_id
                                            )
                                        )
                                    )
                                )
                            )
                        `
      )
      .order("id");

    if (selectedKingdomId) {
      query = query.eq("taxon_genus.taxon_family.taxon_order.taxon_class.taxon_phylum.kingdom_id", selectedKingdomId);
    }

    const { data: speciesData, error } = await query;

    if (error) {
      console.error("Error fetching species data:", error);
      return;
    }
    speciesData.forEach((species) => createSpeciesCard(species));
    addSearchFunctionality();
    addUpdateFunctionality();
  }

  async function fetchVarietyData() {
    const selectedKingdomId = kingdomFilter.value;

    let query = supabase
      .from("taxon_variety")
      .select(
        `
                            id,
                            name,
                            species_id,
                            info,
                            taxon_species!inner (
                                id,
                                name,
                                genus_id,
                                taxon_genus!inner (
                                    id,
                                    name,
                                    taxon_family!inner (
                                        id,
                                        name,
                                        taxon_order!inner (
                                            id,
                                            name,
                                            taxon_class!inner (
                                                id,
                                                name,
                                                taxon_phylum!inner (
                                                    id,
                                                    name,
                                                    kingdom_id
                                                )
                                            )
                                        )
                                    )
                                )
                            )
                        `
      )
      .order("id");

    if (selectedKingdomId) {
      query = query.eq(
        "taxon_species.taxon_genus.taxon_family.taxon_order.taxon_class.taxon_phylum.kingdom_id",
        selectedKingdomId
      );
    }

    const { data: varietyData, error } = await query;

    if (error) {
      console.error("Error fetching variety data:", error);
      return;
    }
    varietyData.forEach((variety) => createVarietyCard(variety));
    addSearchFunctionality();
    addUpdateFunctionality();
  }

  async function fetchSpecimenData() {
    const selectedKingdomId = kingdomFilter.value;

    let query = supabase
      .from("botanical_specimen")
      .select(
        `
                            id,
                            species_id,
                            variety_id,
                            location::geometry,
                            info,
                            is_accessible,
                            is_tree,
                            is_notable,
                            images,
                            image_info,
                            taxon_species!inner (
                                id,
                                name,
                                genus_id,
                                taxon_genus!inner (
                                    id,
                                    name,
                                    taxon_family!inner (
                                        id,
                                        name,
                                        taxon_order!inner (
                                            id,
                                            name,
                                            taxon_class!inner (
                                                id,
                                                name,
                                                taxon_phylum!inner (
                                                    id,
                                                    name,
                                                    kingdom_id
                                                )
                                            )
                                        )
                                    )
                                )
                            )
                        `
      )
      .order("id");

    if (selectedKingdomId) {
      query = query.eq(
        "taxon_species.taxon_genus.taxon_family.taxon_order.taxon_class.taxon_phylum.kingdom_id",
        selectedKingdomId
      );
    }

    const { data: specimenData, error } = await query;

    if (error) {
      console.error("Error fetching specimen data:", error);
      return;
    }

    const processedSpecimenData = specimenData.map((specimen) => {
      const latitude = specimen.location ? parseFloat(specimen.location.coordinates[1]) : 0;
      const longitude = specimen.location ? parseFloat(specimen.location.coordinates[0]) : 0;

      return {
        ...specimen,
        latitude,
        longitude,
      };
    });

    processedSpecimenData.forEach((specimen) => {
      createSpecimenCard(specimen);
    });

    addSearchFunctionality();
    addUpdateFunctionality();
  }

  async function fetchGenusData() {
    const selectedKingdomId = kingdomFilter.value;

    let query = supabase
      .from("taxon_genus")
      .select(
        `
                            id,
                            name,
                            info,
                            family_id,
                            taxon_family!inner (
                                id,
                                name,
                                taxon_order!inner (
                                    id,
                                    name,
                                    taxon_class!inner (
                                        id,
                                        name,
                                        taxon_phylum!inner (
                                            id,
                                            name,
                                            kingdom_id
                                        )
                                    )
                                )
                            )
                        `
      )
      .order("id");

    if (selectedKingdomId) {
      query = query.eq("taxon_family.taxon_order.taxon_class.taxon_phylum.kingdom_id", selectedKingdomId);
    }

    const { data: genusData, error } = await query;

    if (error) {
      console.error("Error fetching genus data:", error);
      return;
    }

    genusData.forEach((genus) => createGenusCard(genus));
    addSearchFunctionality();
    addUpdateFunctionality();
  }

  async function fetchFamilyData() {
    const selectedKingdomId = kingdomFilter.value;

    let query = supabase
      .from("taxon_family")
      .select(
        `
                            id,
                            name,
                            info,
                            order_id,
                            taxon_order!inner (
                                id,
                                name,
                                taxon_class!inner (
                                    id,
                                    name,
                                    taxon_phylum!inner (
                                        id,
                                        name,
                                        kingdom_id
                                    )
                                )
                            )
                        `
      )
      .order("id");

    if (selectedKingdomId) {
      query = query.eq("taxon_order.taxon_class.taxon_phylum.kingdom_id", selectedKingdomId);
    }

    const { data: familyData, error } = await query;

    if (error) {
      console.error("Error fetching family data:", error);
      return;
    }

    familyData.forEach((family) => createFamilyCard(family));
    addSearchFunctionality();
    addUpdateFunctionality();
  }

  async function fetchOrderData() {
    const selectedKingdomId = kingdomFilter.value;

    let query = supabase
      .from("taxon_order")
      .select(
        `
                            id,
                            name,
                            info,
                            class_id,
                            taxon_class!inner (
                                id,
                                name,
                                taxon_phylum!inner (
                                    id,
                                    name,
                                    kingdom_id
                                )
                            )
                        `
      )
      .order("id");

    if (selectedKingdomId) {
      query = query.eq("taxon_class.taxon_phylum.kingdom_id", selectedKingdomId);
    }

    const { data: orderData, error } = await query;

    if (error) {
      console.error("Error fetching order data:", error);
      return;
    }

    orderData.forEach((order) => createOrderCard(order));
    addSearchFunctionality();
    addUpdateFunctionality();
  }

  async function fetchClassData() {
    const selectedKingdomId = kingdomFilter.value;

    let query = supabase
      .from("taxon_class")
      .select(
        `
                            id,
                            name,
                            info,
                            phylum_id,
                            taxon_phylum!inner (
                                id,
                                name,
                                kingdom_id
                            )
                        `
      )
      .order("id");

    if (selectedKingdomId) {
      query = query.eq("taxon_phylum.kingdom_id", selectedKingdomId);
    }

    const { data: classData, error } = await query;

    if (error) {
      console.error("Error fetching class data:", error);
      return;
    }

    classData.forEach((classItem) => createClassCard(classItem));
    addSearchFunctionality();
    addUpdateFunctionality();
  }

  async function fetchLocationCaetgoriesData() {
    let query = supabase
      .from("location_categories")
      .select(
        `
                            id,
                            name,
                            info,
                            colour,
                        `
      )
      .order("id");
  }

  async function fetchPhylumData() {
    const selectedKingdomId = kingdomFilter.value;

    let query = supabase
      .from("taxon_phylum")
      .select(
        `
                            id,
                            name,
                            info,
                            kingdom_id,
                            taxon_kingdom!inner (
                                id,
                                name
                            )
                        `
      )
      .order("id");

    if (selectedKingdomId) {
      query = query.eq("kingdom_id", selectedKingdomId);
    }

    const { data: phylumData, error } = await query;

    if (error) {
      console.error("Error fetching phylum data:", error);
      return;
    }

    phylumData.forEach((phylum) => createPhylumCard(phylum));
    addSearchFunctionality();
    addUpdateFunctionality();
  }

  async function addNewCard() {
    let nextId;
    let newCard;
    if (currentView === "species") {
      const { data: speciesData, error } = await supabase
        .from("taxon_species")
        .select("id")
        .order("id", { ascending: false })
        .limit(1);
      const nextId = speciesData && speciesData.length > 0 ? speciesData[0].id + 1 : 1;
      const { error: insertError } = await supabase.from("taxon_species").insert([{ id: nextId }]);
      if (insertError) {
        console.error("Error inserting new species row:", insertError);
        return;
      }
      createSpeciesCard({ id: nextId, genus_id: 0, name: "", common_name: "", native_range: "", info: "" });
    } else if (currentView === "specimen") {
      const { data: specimenData, error } = await supabase
        .from("botanical_specimen")
        .select("id")
        .order("id", { ascending: false })
        .limit(1);
      const nextId = specimenData && specimenData.length > 0 ? specimenData[0].id + 1 : 1;
      const { error: insertError } = await supabase.from("botanical_specimen").insert([{ id: nextId }]);
      if (insertError) {
        console.error("Error inserting new specimen row:", insertError);
        return;
      }
      createSpecimenCard({ id: nextId, latitude: 0, longitude: 0, info: "", species_id: 0 });
    } else if (currentView === "park_locations") {
      const { data: locationData, error } = await supabase
        .from("park_locations")
        .select("id")
        .order("id", { ascending: false })
        .limit(1);
      const nextId = locationData && locationData.length > 0 ? locationData[0].id + 1 : 1;
      const { error: insertError } = await supabase.from("park_locations").insert([{ id: nextId }]);
      if (insertError) {
        console.error("Error inserting new location row:", insertError);
        return;
      }
      createSpecimenCard({ id: nextId, latitude: 0, longitude: 0, info: "", species_id: 0 });
    } else if (currentView === "variety") {
      const { data: varietyData, error } = await supabase
        .from("taxon_variety")
        .select("id")
        .order("id", { ascending: false })
        .limit(1);
      const nextId = varietyData && varietyData.length > 0 ? varietyData[0].id + 1 : 1;
      const { error: insertError } = await supabase.from("taxon_variety").insert([{ id: nextId }]);
      if (insertError) {
        console.error("Error inserting new variety row:", insertError);
        return;
      }
      createVarietyCard({ id: nextId, name: "", info: "", species_id: 0 });
    } else if (currentView === "genus") {
      const { data: genusData, error } = await supabase
        .from("taxon_genus")
        .select("id")
        .order("id", { ascending: false })
        .limit(1);
      const nextId = genusData && genusData.length > 0 ? genusData[0].id + 1 : 1;
      const { error: insertError } = await supabase.from("taxon_genus").insert([{ id: nextId }]);
      if (insertError) {
        console.error("Error inserting new genus row:", insertError);
        return;
      }
      createGenusCard({ id: nextId, name: "", info: "", family_id: 0 });
    } else if (currentView === "family") {
      const { data: familyData, error } = await supabase
        .from("taxon_family")
        .select("id")
        .order("id", { ascending: false })
        .limit(1);
      const nextId = familyData && familyData.length > 0 ? familyData[0].id + 1 : 1;
      const { error: insertError } = await supabase.from("taxon_family").insert([{ id: nextId }]);
      if (insertError) {
        console.error("Error inserting new family row:", insertError);
        return;
      }
      createFamilyCard({ id: nextId, name: "", info: "", order_id: 0 });
    } else if (currentView === "order") {
      const { data: orderData, error } = await supabase
        .from("taxon_order")
        .select("id")
        .order("id", { ascending: false })
        .limit(1);
      const nextId = orderData && orderData.length > 0 ? orderData[0].id + 1 : 1;
      const { error: insertError } = await supabase.from("taxon_order").insert([{ id: nextId }]);
      if (insertError) {
        console.error("Error inserting new order row:", insertError);
        return;
      }
      createOrderCard({ id: nextId, name: "", info: "", class_id: 0 });
    } else if (currentView === "class") {
      const { data: classData, error } = await supabase
        .from("taxon_class")
        .select("id")
        .order("id", { ascending: false })
        .limit(1);
      const nextId = classData && classData.length > 0 ? classData[0].id + 1 : 1;
      const { error: insertError } = await supabase.from("taxon_class").insert([{ id: nextId }]);
      if (insertError) {
        console.error("Error inserting new class row:", insertError);
        return;
      }
      createClassCard({ id: nextId, name: "", info: "", phylum_id: 0 });
    } else if (currentView === "phylum") {
      const { data: phylumData, error } = await supabase
        .from("taxon_phylum")
        .select("id")
        .order("id", { ascending: false })
        .limit(1);
      const nextId = phylumData && phylumData.length > 0 ? phylumData[0].id + 1 : 1;
      const { error: insertError } = await supabase.from("taxon_phylum").insert([{ id: nextId }]);
      if (insertError) {
        console.error("Error inserting new phylum row:", insertError);
        return;
      }
      createPhylumCard({ id: nextId, name: "", info: "", kingdom_id: 0 });
    }
    addUpdateFunctionality();
  }

  async function updateImageOrder(target, id, newOrder, newDescriptionsOrder) {
    const { data, error } = await supabase
      .from(target)
      .update({
        images: JSON.stringify(newOrder),
        image_info: JSON.stringify(newDescriptionsOrder),
      })
      .eq("id", id);

    if (error) {
      console.error("Error updating image order:", error);
    } else {
      console.log("Image order updated successfully:", data);
    }
  }

  function createSpeciesCard(species) {
    const card = document.createElement("div");
    card.className = "card";
    card.innerHTML = `
                            <p><strong>Species #</strong></p> <div>${species.id}</div>
                            <p><strong>Genus:</strong></p> <div class="menu-button-container">${createDropdown(
                              species.genus_id,
                              genusMap,
                              "italic"
                            )}<button class="add-button"><span class="material-symbols-outlined" id="add-genus-button">add</span></button></div>
                            <p><strong>Species:</strong></p> <div><input type="text" class="input-field max-width work-sans italic" value="${
                              species.name
                            }" /></div>
                            <p><strong>Common Name:</strong></p> <div><textarea class="input-field work-sans"  ">${
                              species.common_name
                            }</textarea></div>
                            <p><strong>Native Range:</strong></p> <div><textarea class="input-field" style="height: 60px;">${
                              species.native_range
                            }</textarea></div>
                            <p><strong>Description:</strong></p> <div><textarea class="input-field" style="height: 120px;">${
                              species.info
                            }</textarea></div>

                            <div class="action-buttons">
                                <button class="update-button" data-id="${
                                  species.id
                                }" data-type="species">Update</button>
                            </div>
                            <div class="feedback-message">Update successful!</div>
                        `;
    cardContainer.appendChild(card);
    addTaxonButtonListener(card);
  }

  function createParkLocationCard(location) {
    const card = document.createElement("div");
    card.className = "card";

    const supabaseStoragePrefix = "/storage/v1/object/public/images/";

    let imageThumbnails = "";
    if (location.images) {
      const imageFilenames = JSON.parse(location.images);
      const imageDescriptions = JSON.parse(location.image_info || "[]");

      // Ensure descriptions array matches images array length
      while (imageDescriptions.length < imageFilenames.length) {
        imageDescriptions.push(""); // Fill missing descriptions with empty strings
      }

      imageThumbnails = imageFilenames
        .map((filename, index) => {
          const thumbnailUrl = `${supabaseUrlPrefix}${supabaseStoragePrefix}park_locations/${location.id}/thumb_${filename}`;
          const imageDescription = imageDescriptions[index] || "";

          return `
                                    <div class="thumbnail-container" data-url="${filename}">
                                        <img src="${thumbnailUrl}" class="thumbnail" alt="location image">
                                        <textarea class="input-field image-description" placeholder="Enter description">${imageDescription}</textarea>
                                        <button class="remove-button" data-url="${filename}">X</button>
                                    </div>
                                `;
        })
        .join("");
    }

    card.innerHTML = `
                            <p><strong class="work-sans">Location #</strong></p> <div id="locationIdField">${
                              location.id
                            }</div>
                            <p><strong class="work-sans">Name:</strong></p> <div><input type="text" id="locationName" class="input-field max-width work-sans" value="${
                              location.name
                            }" /></div>
                            <p><strong class="work-sans">Category:</strong></p> <div class="menu-button-container">${createDropdown(
                              location.category_id,
                              locationCategoriesMap
                            )}</div>
                            <p><strong class="work-sans">Location:</strong></p> <div class="menu-button-container"><input type="text" id="locationField" class="input-field max-width work-sans" value="${
                              location.latitude
                            }, ${
      location.longitude
    }"/><button class="add-button" id="show-location-button"><span class="material-symbols-outlined">pin_drop</span></button></div>
                            <p><strong class="work-sans">Description:</strong></p> <div><textarea class="input-field" style="height: 120px;">${
                              location.info
                            }</textarea></div>
                            <p><strong class="work-sans">Tags:</strong></p><div><textarea id="tagsField" class="input-field" style="height: 60px;">${
                              location.tags
                            }</textarea></div> 
                            <p><strong class="work-sans">Upload Images:</strong></p> <div><input type="file" id="imageUpload" class="input-field max-width work-sans" multiple /></div>
                            <div><strong class="work-sans">Current Images:</strong></div>
                            <div id="sortable-images-${location.id}" class="image-thumbnails">${imageThumbnails}</div>
                            <div class="switch-row">
                                <div><strong class="work-sans">Access:</strong> ${createToggleSwitch(
                                  location.is_accessible
                                )}</div>
                            </div>
                            <div class="action-buttons">
                                <button class="update-button" data-id="${
                                  location.id
                                }" data-type="park_locations">Update</button>
                            </div>
                            <div class="uploading-message" style="display:none;"><span class="uploading-indicator"></span> Uploading...</div>
                            <div class="feedback-message">Update successful!</div>
                        `;
    cardContainer.appendChild(card);

    new Sortable(document.getElementById(`sortable-images-${location.id}`), {
      animation: 150,
      onEnd: async function (evt) {
        const newOrder = Array.from(evt.to.children).map((child) => child.getAttribute("data-url"));
        const newDescriptionsOrder = Array.from(evt.to.children).map(
          (child) => child.querySelector(".image-description").value
        );
        await updateImageOrder("park_locations", location.id, newOrder, newDescriptionsOrder);
      },
    });

    addShowLocationButtonListener(card);
    addTaxonButtonListener(card);
    addRemoveImageFunctionality(card, "park_locations", location.id);
  }

  function createSpecimenCard(specimen) {
    const card = document.createElement("div");
    card.className = "card";

    const supabaseStoragePrefix = "/storage/v1/object/public/images/";

    let imageThumbnails = "";
    let imageFilenames = [];
    let imageDescriptions = [];

    if (specimen.images) {
      imageFilenames = JSON.parse(specimen.images);
      imageDescriptions = JSON.parse(specimen.image_info || "[]");

      // Ensure descriptions array matches images array length
      while (imageDescriptions.length < imageFilenames.length) {
        imageDescriptions.push(""); // Fill missing descriptions with empty strings
      }

      imageThumbnails = imageFilenames
        .map((filename, index) => {
          const thumbnailUrl = `${supabaseUrlPrefix}${supabaseStoragePrefix}botanical_specimen/${specimen.id}/thumb_${filename}`;
          const imageDescription = imageDescriptions[index] || "";

          return `
                                    <div class="thumbnail-container" data-url="${filename}">
                                        <img src="${thumbnailUrl}" class="thumbnail" alt="specimen image">
                                        <textarea class="input-field image-description" placeholder="Enter description">${imageDescription}</textarea>
                                        <button class="remove-button" data-url="${filename}">X</button>
                                    </div>
                                `;
        })
        .join("");
    }

    card.innerHTML = `
                            <p><strong class="work-sans">Specimen #</p> <div id="specimenIdField">${
                              specimen.id
                            }</div></strong>
                            <p><strong>Species:</strong></p> <div class="menu-button-container" id="speciesIdMenu">${createDropdown(
                              specimen.species_id,
                              speciesMap,
                              "italic",
                              `id="#speciesIdMenu"`
                            )}<button class="add-button"><span class="material-symbols-outlined" id="add-species-button">add</span></button></div>
                            <p><strong>Variety:</strong></p> <div class="menu-button-container">${createDropdown(
                              specimen.variety_id,
                              varietyMap,
                              "italic"
                            )}<button class="add-button"><span class="material-symbols-outlined" id="add-variety-button">add</span></button></div>
                            <p><strong>Location:</strong></p> <div class="menu-button-container"><input type="text" id="locationField" class="input-field max-width work-sans" value="${
                              specimen.latitude
                            }, ${
      specimen.longitude
    }"/><button class="add-button" id="show-location-button"><span class="material-symbols-outlined">pin_drop</span></button></div>
                            <p><strong>Description:</strong></p> <div><textarea class="input-field" id="specimenInfoField" style="height: 120px;">${
                              specimen.info
                            }</textarea></div> 
                            <p><strong>Upload Images:</strong></p> <div><input type="file" id="imageUpload" class="input-field max-width work-sans" multiple /></div>
                            <div><strong>Current Images:</strong></div>
                            <div id="sortable-images-${specimen.id}" class="image-thumbnails">${imageThumbnails}</div>
                            <div class="switch-row">
                                <div><strong>Access:</strong> ${createToggleSwitch(specimen.is_accessible)}</div>
                                <div><strong>Tree:</strong> ${createToggleSwitch(specimen.is_tree)}</div>
                                <div><strong>Notable:</strong> ${createToggleSwitch(specimen.is_notable)}</div>
                            </div>
                            
                            <div class="action-buttons">
                                <button class="update-button" data-id="${
                                  specimen.id
                                }" data-type="specimen">Update</button>
                            </div>
                            <div class="uploading-message" style="display:none;"><span class="uploading-indicator"></span> Uploading...</div>
                            <div class="feedback-message">Update successful!</div>
                            
                            <!-- Hidden element to store image data -->
                            <input type="hidden" class="image-data" 
                                data-image-filenames='${JSON.stringify(imageFilenames)}' 
                                data-image-descriptions='${JSON.stringify(imageDescriptions)}' />
                                                    `;
    cardContainer.appendChild(card);

    new Sortable(document.getElementById(`sortable-images-${specimen.id}`), {
      animation: 150,
      onEnd: async function (evt) {
        const newOrder = Array.from(evt.to.children).map((child) => child.getAttribute("data-url"));
        const newDescriptionsOrder = Array.from(evt.to.children).map(
          (child) => child.querySelector(".image-description").value
        );
        await updateImageOrder("botanical_specimen", specimen.id, newOrder, newDescriptionsOrder);
      },
    });

    addShowLocationButtonListener(card);
    addTaxonButtonListener(card);
    addRemoveImageFunctionality(card, "botanical_specimen", specimen.id);
  }

  function createVarietyCard(variety) {
    const card = document.createElement("div");
    card.className = "card";
    card.innerHTML = `
                            <p><strong>Variety #</p> <div>${variety.id}</div></strong>
                            <p><strong>Species:</strong></p> <div class="menu-button-container">${createDropdown(
                              variety.species_id,
                              speciesMap,
                              "italic"
                            )}<button class="add-button"><span class="material-symbols-outlined" id="add-species-button">add</span></button></div>
                            <p><strong>Variety:</strong></p> <div><input type="text" class="input-field max-width work-sans italic" value="${
                              variety.name
                            }" /></div>
                            
                            <p><strong>Description:</strong></p> <div><textarea class="input-field" style="height: 120px;">${
                              variety.info
                            }</textarea></div>
                            
                            <div class="action-buttons">
                                <button class="update-button" data-id="${
                                  variety.id
                                }" data-type="variety">Update</button>
                            </div>
                            <div class="feedback-message">Update successful!</div>
                        `;
    cardContainer.appendChild(card);
    addTaxonButtonListener(card);
  }

  function createGenusCard(genus) {
    const card = document.createElement("div");
    card.className = "card";
    card.innerHTML = `
                            <p><strong>Genus #</p> <div>${genus.id}</div></strong>
                            <p><strong>Family:</strong></p> <div class="menu-button-container">${createDropdown(
                              genus.family_id,
                              familyMap,
                              "italic"
                            )}<button class="add-button"><span class="material-symbols-outlined" id="add-family-button">add</span></button></div>
                            <p><strong>Genus:</strong></p> <div><input type="text" class="input-field max-width work-sans italic" value="${
                              genus.name
                            }" /></div>
                            
                            <p><strong>Description:</strong></p> <div><textarea class="input-field" style="height: 120px;">${
                              genus.info
                            }</textarea></div>
                            
                            <div class="action-buttons">
                                <button class="update-button" data-id="${genus.id}" data-type="genus">Update</button>
                            </div>
                            <div class="feedback-message">Update successful!</div>
                        `;
    cardContainer.appendChild(card);
    addTaxonButtonListener(card);
  }

  function createFamilyCard(family) {
    const card = document.createElement("div");
    card.className = "card";
    card.innerHTML = `
                            <p><strong>Family #</p> <div>${family.id}</div></strong>
                            <p><strong>Order:</strong></p> <div class="menu-button-container">${createDropdown(
                              family.order_id,
                              orderMap,
                              "italic"
                            )}<button class="add-button"><span class="material-symbols-outlined" id="add-order-button">add</span></button></div>
                            <p><strong>Family:</strong></p> <div><input type="text" class="input-field max-width work-sans italic" value="${
                              family.name
                            }" /></div>
                            
                            <p><strong>Description:</strong></p> <div><textarea class="input-field" style="height: 120px;">${
                              family.info
                            }</textarea></div>
                            
                            <div class="action-buttons">
                                <button class="update-button" data-id="${family.id}" data-type="family">Update</button>
                            </div>
                            <div class="feedback-message">Update successful!</div>
                        `;
    cardContainer.appendChild(card);
    addTaxonButtonListener(card);
  }

  function createOrderCard(order) {
    const card = document.createElement("div");
    card.className = "card";
    card.innerHTML = `
                            <p><strong>Order #</p> <div>${order.id}</div></strong>
                            <p><strong>Class:</strong></p> <div class="menu-button-container">${createDropdown(
                              order.class_id,
                              classMap,
                              "italic"
                            )}<button class="add-button"><span class="material-symbols-outlined" id="add-class-button">add</span></button></div>
                            <p><strong>Order:</strong></p> <div><input type="text" class="input-field max-width work-sans italic" value="${
                              order.name
                            }" /></div>
                            
                            <p><strong>Description:</strong></p> <div><textarea class="input-field" style="height: 120px;">${
                              order.info
                            }</textarea></div>
                            
                            <div class="action-buttons">
                                <button class="update-button" data-id="${order.id}" data-type="order">Update</button>
                            </div>
                            <div class="feedback-message">Update successful!</div>
                        `;
    cardContainer.appendChild(card);
    addTaxonButtonListener(card);
  }

  function createClassCard(classItem) {
    const card = document.createElement("div");
    card.className = "card";
    card.innerHTML = `
                            <p><strong>Class #</p> <div>${classItem.id}</div></strong>
                            <p><strong>Phylum:</strong></p> <div class="menu-button-container">${createDropdown(
                              classItem.phylum_id,
                              phylumMap,
                              "italic"
                            )}<button class="add-button"><span class="material-symbols-outlined" id="add-phylum-button">add</span></button></div>
                            <p><strong>Class:</strong></p> <div><input type="text" class="input-field max-width work-sans italic" value="${
                              classItem.name
                            }" /></div>
                            
                            <p><strong>Description:</strong></p> <div><textarea class="input-field" style="height: 120px;">${
                              classItem.info
                            }</textarea></div>
                            
                            <div class="action-buttons">
                                <button class="update-button" data-id="${
                                  classItem.id
                                }" data-type="class">Update</button>
                            </div>
                            <div class="feedback-message">Update successful!</div>
                        `;
    cardContainer.appendChild(card);
    addTaxonButtonListener(card);
  }

  function createPhylumCard(phylum) {
    const card = document.createElement("div");
    card.className = "card";
    card.innerHTML = `
                            <p><strong>Phylum #</p> <div>${phylum.id}</div></strong>
                            <p><strong>Kingdom:</strong></p> <div class="menu-button-container">${createDropdown(
                              phylum.kingdom_id,
                              createMap(kingdoms),
                              "italic"
                            )}<button class="add-button"><span class="material-symbols-outlined" id="add-kingdom-button">add</span></button></div>
                            <p><strong>Phylum:</strong></p> <div><input type="text" class="input-field max-width work-sans italic" value="${
                              phylum.name
                            }" /></div>
                            
                            <p><strong>Description:</strong></p> <div><textarea class="input-field" style="height: 120px;">${
                              phylum.info
                            }</textarea></div>
                            <div class="feedback-message">Update successful!</div>
                            <div class="action-buttons">
                                <button class="update-button" data-id="${phylum.id}" data-type="phylum">Update</button>
                            </div>
                            <div class="feedback-message">Update successful!</div>
                        `;
    cardContainer.appendChild(card);
    addTaxonButtonListener(card);
  }

  function createDropdown(selectedId, itemsMap, italic, dropdownId) {
    if (!italic) {
      italic = "";
    }

    let itemsArray = Object.entries(itemsMap);
    itemsArray.sort((a, b) => a[1].localeCompare(b[1]));

    let dropdown = `<select class="max-width work-sans ${italic}">`;
    dropdown += `<option value=""></option>`;
    for (const [id, name] of itemsArray) {
      const selected = id === (selectedId || "").toString() ? "selected" : "";
      dropdown += `<option value="${id}" ${selected} class="work-sans ${italic}" ${dropdownId}>${name}</option>`;
    }
    dropdown += `</select>`;
    return dropdown;
  }

  function createToggleSwitch(isChecked) {
    const checked = isChecked ? "checked" : "";
    return `
                            <label class="toggle-switch">
                                <input type="checkbox" ${checked}>
                                <span class="slider"></span>
                            </label>
                        `;
  }

  function createMap(data) {
    const map = {};
    data.forEach((item) => {
      if (item && item.id && item.name) {
        map[item.id] = item.name || "";
      }
    });
    return map;
  }

  function createSpeciesMap(speciesData, genusMap) {
    const map = {};
    speciesData.forEach((species) => {
      const genusName = genusMap[species.genus_id];
      map[species.id] = `${genusName} ${species.name}`;
    });
    return map;
  }

  function addSearchFunctionality() {
    const searchInput = document.getElementById("search");

    const searchListener = function () {
      const searchTerm = searchInput.value.toLowerCase();
      const cards = document.querySelectorAll("#card-container .card");

      cards.forEach((card) => {
        const cardTextContent = getCardTextContent(card).toLowerCase();
        if (cardTextContent.includes(searchTerm)) {
          card.style.display = "grid";
        } else {
          card.style.display = "none";
        }
      });
    };

    searchInput.addEventListener("input", searchListener);

    function getCardTextContent(card) {
      let textContent = "";
      const fields = card.querySelectorAll("p, input, textarea, select");

      fields.forEach((field) => {
        if (field.tagName === "SELECT") {
          textContent += field.options[field.selectedIndex].text + " ";
        } else if (field.tagName === "INPUT" || field.tagName === "TEXTAREA") {
          textContent += field.value + " ";
        } else {
          textContent += field.textContent + " ";
        }
      });

      return textContent.trim();
    }
  }

  async function handleImageUpload(file, id, directory) {
    const picaInstance = pica();
    const originalFileName = `${file.name.split(".")[0]}.${file.name.split(".").pop()}`;
    const originalFilePath = `${directory}/${id}/${originalFileName}`;

    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = async () => {
        const originalCanvas = document.createElement("canvas");
        originalCanvas.width = img.width;
        originalCanvas.height = img.height;

        const originalCtx = originalCanvas.getContext("2d");
        originalCtx.drawImage(img, 0, 0, img.width, img.height);

        // Create a target canvas for resizing using Pica
        const resizedCanvas = document.createElement("canvas");
        const maxOriginalWidth = 1200;
        const maxOriginalHeight = 1200;

        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxOriginalWidth) {
            height = Math.round((maxOriginalWidth / width) * height);
            width = maxOriginalWidth;
          }
        } else {
          if (height > maxOriginalHeight) {
            width = Math.round((maxOriginalHeight / height) * width);
            height = maxOriginalHeight;
          }
        }

        resizedCanvas.width = width;
        resizedCanvas.height = height;

        try {
          await picaInstance.resize(originalCanvas, resizedCanvas);
          const blob = await picaInstance.toBlob(resizedCanvas, "image/jpeg", 0.9);

          const compressedFile = new File([blob], originalFileName, {
            type: file.type,
          });

          const { data: originalData, error: originalError } = await supabase.storage
            .from("images")
            .upload(originalFilePath, compressedFile);

          if (originalError) {
            console.error("Error uploading original image:", originalError.message);
            reject(originalError.message);
            return;
          }

          const thumbnailCanvas = document.createElement("canvas");
          const maxWidth = 300;
          const maxHeight = 300;

          width = img.width;
          height = img.height;

          if (width > height) {
            if (width > maxWidth) {
              height = Math.round((maxWidth / width) * height);
              width = maxWidth;
            }
          } else {
            if (height > maxHeight) {
              width = Math.round((maxHeight / height) * width);
              height = maxHeight;
            }
          }

          thumbnailCanvas.width = width;
          thumbnailCanvas.height = height;

          await picaInstance.resize(originalCanvas, thumbnailCanvas);
          const thumbnailBlob = await picaInstance.toBlob(thumbnailCanvas, "image/jpeg", 0.9);

          const thumbnailFileName = `thumb_${originalFileName}`;
          const thumbnailFile = new File([thumbnailBlob], thumbnailFileName, {
            type: file.type,
          });

          const thumbnailPath = `${directory}/${id}/${thumbnailFile.name}`;

          const { data: thumbnailData, error: thumbnailError } = await supabase.storage
            .from("images")
            .upload(thumbnailPath, thumbnailFile);

          if (thumbnailError) {
            console.error("Error uploading thumbnail:", thumbnailError.message);
            reject(thumbnailError.message);
            return;
          }

          const thumbnailUrl = `${supabaseUrlPrefix}/storage/v1/object/public/images/${thumbnailPath}`;

          const newThumbnailElement = `
                                        <div class="thumbnail-container" data-url="${originalFileName}">
                                            <img src="${thumbnailUrl}" class="thumbnail" alt="location image">
                                            <button class="remove-button" data-url="${originalFileName}">X</button>
                                        </div>
                                    `;
          const imageContainer = document.getElementById(`sortable-images-${id}`);
          imageContainer.insertAdjacentHTML("beforeend", newThumbnailElement);

          addRemoveImageFunctionality(imageContainer.closest(".card"), directory, id);

          resolve({
            imageUrl: originalFileName,
            thumbnailUrl: thumbnailFile.name,
          });
        } catch (error) {
          reject(`Error processing image: ${error.message}`);
        }
      };

      img.onerror = (error) => reject(`Error loading image: ${error.message}`);
      img.src = URL.createObjectURL(file);
    });
  }

  async function updateCard(card, id, type) {
    let updatedData;

    if (type === "species") {
      const { data, error } = await supabase.from("taxon_species").select("*").eq("id", id).single();
      if (error) {
        console.error("Error fetching updated species data:", error);
        return;
      }
      updatedData = data;

      // Update UI
      const genusDropdown = card.querySelector(".menu-button-container select");
      genusDropdown.value = updatedData.genus_id;
      card.querySelector(".input-field.italic").value = updatedData.name;
      card.querySelector("textarea.work-sans").value = updatedData.common_name;
      card.querySelectorAll("textarea")[1].value = updatedData.native_range;
      card.querySelectorAll("textarea")[2].value = updatedData.info;
    } else if (type === "specimen") {
      const { data, error } = await supabase.from("botanical_specimen").select("*").eq("id", id).single();
      if (error) {
        console.error("Error fetching updated specimen data:", error);
        return;
      }
      updatedData = data;

      // Update UI
      card.querySelector("#specimenIdField").textContent = updatedData.id;
      card.querySelectorAll(".menu-button-container select")[0].value = updatedData.species_id;
      card.querySelectorAll(".menu-button-container select")[1].value = updatedData.variety_id;
      card.querySelector(
        ".input-field.max-width.work-sans"
      ).value = `${updatedData.latitude}, ${updatedData.longitude}`;
      card.querySelectorAll("textarea")[0].value = updatedData.info;
      card.querySelectorAll(".toggle-switch input")[0].checked = updatedData.is_accessible;
      card.querySelectorAll(".toggle-switch input")[1].checked = updatedData.is_tree;
      card.querySelectorAll(".toggle-switch input")[2].checked = updatedData.is_notable;
    } else if (type === "park_locations") {
      const { data, error } = await supabase.from("park_locations").select("*").eq("id", id).single();
      if (error) {
        console.error("Error fetching updated park location data:", error);
        return;
      }
      updatedData = data;

      // Update UI
      card.querySelector("#locationIdField").textContent = updatedData.id;
      card.querySelector("#locationName").value = updatedData.name;
      card.querySelector("#locationField").value = `${updatedData.latitude}, ${updatedData.longitude}`;
      card.querySelectorAll(".menu-button-container select")[0].value = updatedData.category_id;
      card.querySelectorAll("textarea")[0].value = updatedData.info;
      card.querySelectorAll(".toggle-switch input")[0].checked = updatedData.is_accessible;
    } else if (type === "genus") {
      const { data, error } = await supabase.from("taxon_genus").select("*").eq("id", id).single();
      if (error) {
        console.error("Error fetching updated genus data:", error);
        return;
      }
      updatedData = data;

      // Update UI
      const familyDropdown = card.querySelector(".menu-button-container select");
      familyDropdown.value = updatedData.family_id;
      card.querySelector(".input-field.italic").value = updatedData.name;
      card.querySelector("textarea").value = updatedData.info;
    } else if (type === "variety") {
      const { data, error } = await supabase.from("taxon_variety").select("*").eq("id", id).single();
      if (error) {
        console.error("Error fetching updated variety data:", error);
        return;
      }
      updatedData = data;

      // Update UI
      const speciesDropdown = card.querySelector(".menu-button-container select");
      speciesDropdown.value = updatedData.species_id;
      card.querySelector(".input-field.italic").value = updatedData.name;
      card.querySelector("textarea").value = updatedData.info;
    } else if (type === "family") {
      const { data, error } = await supabase.from("taxon_family").select("*").eq("id", id).single();
      if (error) {
        console.error("Error fetching updated family data:", error);
        return;
      }
      updatedData = data;

      // Update UI
      const orderDropdown = card.querySelector(".menu-button-container select");
      orderDropdown.value = updatedData.order_id;
      card.querySelector(".input-field.italic").value = updatedData.name;
      card.querySelector("textarea").value = updatedData.info;
    } else if (type === "order") {
      const { data, error } = await supabase.from("taxon_order").select("*").eq("id", id).single();
      if (error) {
        console.error("Error fetching updated order data:", error);
        return;
      }
      updatedData = data;

      // Update UI
      const classDropdown = card.querySelector(".menu-button-container select");
      classDropdown.value = updatedData.class_id;
      card.querySelector(".input-field.italic").value = updatedData.name;
      card.querySelector("textarea").value = updatedData.info;
    } else if (type === "class") {
      const { data, error } = await supabase.from("taxon_class").select("*").eq("id", id).single();
      if (error) {
        console.error("Error fetching updated class data:", error);
        return;
      }
      updatedData = data;

      // Update UI
      const phylumDropdown = card.querySelector(".menu-button-container select");
      phylumDropdown.value = updatedData.phylum_id;
      card.querySelector(".input-field.italic").value = updatedData.name;
      card.querySelector("textarea").value = updatedData.info;
    } else if (type === "phylum") {
      const { data, error } = await supabase.from("taxon_phylum").select("*").eq("id", id).single();
      if (error) {
        console.error("Error fetching updated phylum data:", error);
        return;
      }
      updatedData = data;

      // Update UI
      const kingdomDropdown = card.querySelector(".menu-button-container select");
      kingdomDropdown.value = updatedData.kingdom_id;
      card.querySelector(".input-field.italic").value = updatedData.common_name;
      card.querySelector("textarea").value = updatedData.info;
    }

    // Add success feedback
    const feedbackMessage = card.querySelector(".feedback-message");
    feedbackMessage.style.display = "block";
    setTimeout(() => {
      feedbackMessage.style.display = "none";
    }, 6000);
  }

  function addRemoveImageFunctionality(card, directory, id) {
    const removeButtons = card.querySelectorAll(".remove-button");

    removeButtons.forEach((button) => {
      button.addEventListener("click", async () => {
        const imageUrl = button.getAttribute("data-url");
        const thumbnailUrl = `thumb_${imageUrl}`;
        const imageFilePath = `${directory}/${id}/${imageUrl}`;
        const thumbnailFilePath = `${directory}/${id}/${thumbnailUrl}`;

        try {
          // Remove images from Supabase storage
          const { data: deleteData, error: deleteError } = await supabase.storage
            .from("images")
            .remove([imageFilePath, thumbnailFilePath]);

          if (deleteError) {
            console.error("Error deleting images from storage:", deleteError);
            return; // Stop further execution if image deletion fails
          }

          // Fetch the current images and image_info from the database
          const { data: record, error: fetchError } = await supabase
            .from(directory)
            .select("images, image_info")
            .eq("id", id)
            .single();

          if (fetchError || !record.images) {
            console.error("Error fetching images or image_info:", fetchError);
            return; // Stop further execution if fetching images or image_info fails
          }

          // Filter out the removed image and its corresponding info
          let imageUrls = JSON.parse(record.images);
          let imageInfo = JSON.parse(record.image_info || "[]");

          const imageIndex = imageUrls.indexOf(imageUrl);
          if (imageIndex !== -1) {
            imageUrls.splice(imageIndex, 1);
            imageInfo.splice(imageIndex, 1); // Remove the corresponding image_info entry
          }

          // Update the database record
          const { data, error: updateError } = await supabase
            .from(directory)
            .update({
              images: imageUrls.length ? JSON.stringify(imageUrls) : null,
              image_info: imageInfo.length ? JSON.stringify(imageInfo) : null,
            })
            .eq("id", id);

          if (updateError) {
            console.error("Error updating images and image_info:", updateError);
            return; // Stop further execution if updating the record fails
          }

          // Remove the image thumbnail from the DOM only if all operations were successful
          button.closest(".thumbnail-container").remove();
          console.log("Image and image_info removed successfully:", data);
        } catch (error) {
          console.error("Unexpected error during image removal:", error);
        }
      });
    });
  }

  function addUpdateFunctionality() {
    const updateButtons = document.querySelectorAll(".update-button");
    updateButtons.forEach((button) => {
      button.addEventListener("click", async () => {
        const card = button.closest(".card");
        const id = button.getAttribute("data-id");
        const type = button.getAttribute("data-type");

        let updateSuccessful = false;

        if (type === "species") {
          const genusId = card.querySelector(".menu-button-container select").value;
          const speciesName = card.querySelector(".input-field.italic").value;
          const commonName = card.querySelector("textarea.work-sans").value;
          const nativeRange = card.querySelectorAll("textarea")[1].value;
          const info = card.querySelectorAll("textarea")[2].value;

          const { data, error } = await supabase
            .from("taxon_species")
            .update({
              genus_id: genusId,
              name: speciesName,
              common_name: commonName,
              native_range: nativeRange,
              info: info,
            })
            .eq("id", id);

          if (error) {
            console.error("Error updating species data:", error);
          } else {
            console.log("Species data updated successfully:", data);
            updateSuccessful = true;
          }
        } else if (type === "specimen") {
          const specimenId = card.querySelector("#specimenIdField").textContent;
          const speciesId = parseInt(card.querySelectorAll(".menu-button-container select")[0].value);
          const varietyId = parseInt(card.querySelectorAll(".menu-button-container select")[1].value);
          const location = card.querySelectorAll(".input-field")[0].value.split(", ");
          const info = card.querySelectorAll("textarea")[0].value;
          const isAccessible = card.querySelectorAll(".toggle-switch input")[0].checked;
          const isTree = card.querySelectorAll(".toggle-switch input")[1].checked;
          const isNotable = card.querySelectorAll(".toggle-switch input")[2].checked;
          const imageUpload = card.querySelector("#imageUpload");
          const uploadingMessage = card.querySelector(".uploading-message");

          uploadingMessage.style.display = "flex";

          const { data: specimen, error: fetchError } = await supabase
            .from("botanical_specimen")
            .select("images, image_info")
            .eq("id", specimenId)
            .single();

          if (fetchError) {
            console.error("Error fetching specimen images:", fetchError);
            return;
          }

          let currentImages = specimen.images ? JSON.parse(specimen.images) : [];
          let currentDescriptions = specimen.image_info ? JSON.parse(specimen.image_info) : [];

          if (imageUpload.files.length > 0) {
            for (const file of imageUpload.files) {
              try {
                const { imageUrl } = await handleImageUpload(file, specimenId, "botanical_specimen");
                currentImages.push(imageUrl);
                currentDescriptions.push(""); // Add empty string for new images
              } catch (error) {
                console.error("Error uploading image:", error);
              }
            }
            imageUpload.value = "";
          }

          const imageDescriptions = Array.from(card.querySelectorAll(".image-description")).map(
            (input) => input.value || ""
          );

          if (imageDescriptions.length < currentImages.length) {
            for (let i = imageDescriptions.length; i < currentImages.length; i++) {
              imageDescriptions.push("");
            }
          }

          uploadingMessage.style.display = "none";

          const { data, error } = await supabase
            .from("botanical_specimen")
            .update({
              species_id: speciesId,
              variety_id: varietyId,
              location: `POINT(${location[1]} ${location[0]})`,
              info: info,
              is_accessible: isAccessible,
              is_notable: isNotable,
              is_tree: isTree,
              images: currentImages.length ? JSON.stringify(currentImages) : null,
              image_info: JSON.stringify(imageDescriptions),
            })
            .eq("id", specimenId);

          if (error) {
            console.error("Error updating specimen data:", error);
          } else {
            console.log("Specimen data updated successfully:", data);
            updateSuccessful = true;
          }
        }

        if (updateSuccessful) {
          const feedbackMessage = card.querySelector(".feedback-message");
          feedbackMessage.style.display = "block";
          setTimeout(() => {
            feedbackMessage.style.display = "none";
          }, 6000);
        } else if (type === "park_locations") {
          const locationId = card.querySelector("#locationIdField").textContent;
          const name = card.querySelector("#locationName").value;
          const location = card.querySelector("#locationField").value.split(", ");
          const categoryId = parseInt(card.querySelectorAll(".menu-button-container select")[0].value);
          const info = card.querySelectorAll("textarea")[0].value;
          const tags = card
            .querySelector("#tagsField")
            .value.split(",")
            .map((tag) => tag.trim());
          const isAccessible = card.querySelectorAll(".toggle-switch input")[0].checked;
          const imageUpload = card.querySelector("#imageUpload");
          const uploadingMessage = card.querySelector(".uploading-message");

          uploadingMessage.style.display = "flex";

          const { data: locationData, error: fetchError } = await supabase
            .from("park_locations")
            .select("images, image_info")
            .eq("id", locationId)
            .single();

          if (fetchError) {
            console.error("Error fetching location images:", fetchError);
            return;
          }

          let currentImages = locationData.images ? JSON.parse(locationData.images) : [];
          let currentDescriptions = locationData.image_info ? JSON.parse(locationData.image_info) : [];

          if (imageUpload.files.length > 0) {
            for (const file of imageUpload.files) {
              try {
                const { imageUrl } = await handleImageUpload(file, locationId, "park_locations");
                currentImages.push(imageUrl);
                currentDescriptions.push(""); // Add empty string for new images
              } catch (error) {
                console.error("Error uploading image:", error);
              }
            }
            imageUpload.value = "";
          }

          const imageDescriptions = Array.from(card.querySelectorAll(".image-description")).map(
            (input) => input.value || ""
          );

          if (imageDescriptions.length < currentImages.length) {
            for (let i = imageDescriptions.length; i < currentImages.length; i++) {
              imageDescriptions.push("");
            }
          }

          uploadingMessage.style.display = "none";

          const { data, error } = await supabase
            .from("park_locations")
            .update({
              name: name,
              location: `POINT(${location[1]} ${location[0]})`,
              info: info,
              tags: tags,
              is_accessible: isAccessible,
              category_id: categoryId,
              images: currentImages.length ? JSON.stringify(currentImages) : null,
              image_info: JSON.stringify(imageDescriptions),
            })
            .eq("id", locationId);

          if (error) {
            console.error("Error updating location data:", error);
          } else {
            console.log("Location data updated successfully:", data);
            updateSuccessful = true;
          }
        }

        if (updateSuccessful) {
          const feedbackMessage = card.querySelector(".feedback-message");
          feedbackMessage.style.display = "block";
          setTimeout(() => {
            feedbackMessage.style.display = "none";
          }, 6000);
        } else if (type === "genus") {
          const familyId = card.querySelector(".menu-button-container select").value;
          const genusName = card.querySelector(".input-field.italic").value;
          const info = card.querySelector("textarea").value;

          const { data, error } = await supabase
            .from("taxon_genus")
            .update({ family_id: familyId, name: genusName, info: info })
            .eq("id", id);

          if (error) {
            console.error("Error updating genus data:", error);
          } else {
            console.log("Genus data updated successfully:", data);
            updateSuccessful = true;
          }
        } else if (type === "variety") {
          const speciesId = card.querySelector(".menu-button-container select").value;
          const varietyName = card.querySelector(".input-field.italic").value;
          const info = card.querySelector("textarea").value;

          const { data, error } = await supabase
            .from("taxon_variety")
            .update({ species_id: speciesId, name: varietyName, info: info })
            .eq("id", id);

          if (error) {
            console.error("Error updating variety data:", error);
          } else {
            console.log("Variety data updated successfully:", data);
            updateSuccessful = true;
          }
        } else if (type === "family") {
          const orderId = card.querySelector(".menu-button-container select").value;
          const familyName = card.querySelector(".input-field.italic").value;
          const info = card.querySelector("textarea").value;

          const { data, error } = await supabase
            .from("taxon_family")
            .update({ order_id: orderId, name: familyName, info: info })
            .eq("id", id);

          if (error) {
            console.error("Error updating family data:", error);
          } else {
            console.log("Family data updated successfully:", data);
            updateSuccessful = true;
          }
        } else if (type === "order") {
          const classId = card.querySelector(".menu-button-container select").value;
          const orderName = card.querySelector(".input-field.italic").value;
          const info = card.querySelector("textarea").value;

          const { data, error } = await supabase
            .from("taxon_order")
            .update({ class_id: classId, name: orderName, info: info })
            .eq("id", id);

          if (error) {
            console.error("Error updating order data:", error);
          } else {
            console.log("Order data updated successfully:", data);
            updateSuccessful = true;
          }
        } else if (type === "class") {
          const phylumId = card.querySelector(".menu-button-container select").value;
          const className = card.querySelector(".input-field.italic").value;
          const info = card.querySelector("textarea").value;

          const { data, error } = await supabase
            .from("taxon_class")
            .update({ phylum_id: phylumId, name: className, info: info })
            .eq("id", id);

          if (error) {
            console.error("Error updating class data:", error);
          } else {
            console.log("Class data updated successfully:", data);
            updateSuccessful = true;
          }
        } else if (type === "phylum") {
          const kingdomId = card.querySelector(".menu-button-container select").value;
          const phylumName = card.querySelector(".input-field.italic").value;
          const info = card.querySelector("textarea").value;

          const { data, error } = await supabase
            .from("taxon_phylum")
            .update({ kingdom_id: kingdomId, name: phylumName, info: info })
            .eq("id", id);

          if (error) {
            console.error("Error updating phylum data:", error);
          } else {
            console.log("Phylum data updated successfully:", data);
            updateSuccessful = true;
          }
        }

        if (updateSuccessful) {
          const feedbackMessage = card.querySelector(".feedback-message");
          feedbackMessage.style.display = "block";
          setTimeout(() => {
            feedbackMessage.style.display = "none";
          }, 6000);
        }
        //await updateCard(card, id, type);
      });
    });
  }

  fetchKingdoms();
  fetchData();
});
