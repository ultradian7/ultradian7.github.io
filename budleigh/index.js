import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

// Replace with your Supabase project URL and anon key
const SUPABASE_URL = 'https://pgwimbadnvwhijsekohg.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBnd2ltYmFkbnZ3aGlqc2Vrb2hnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjcwMjQ0NDksImV4cCI6MjA0MjYwMDQ0OX0.Wd7HyaUDdDilVDLVxI7TQ1stAvLveYfgBk27_4erwF0';
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let currentUserId = null;
let selectedProjectId = null;

let currentProjectComplete = false;

document.addEventListener('DOMContentLoaded', async () => {
    
    const { data, error } = await supabase.auth.getSession();

    if (data && data.session) {
        currentUserId = data.session.user.id;
        showProjectsView();
    } else {
        showLoginView();
    }
});

const loginForm = document.getElementById('loginForm');
const createProjectButton = document.getElementById('createProjectButton');
const projectForm = document.getElementById('projectForm');
const uploadForm = document.getElementById('uploadForm');
const createSessionButton = document.getElementById('createSessionButton');
const logoutButton = document.getElementById('logout');
const backToProjectsButton = document.getElementById('backToProjects');
const backToSessionsButton = document.getElementById('backToSessions');

if (loginForm) {
    loginForm.addEventListener('submit', async function(event) {
        event.preventDefault();

        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        const messageDiv = document.getElementById('message');

        // Destructure the response to get 'data' and 'error'
        const { data, error } = await supabase.auth.signInWithPassword({
            email: email,
            password: password
        });

        if (error) {
            messageDiv.textContent = 'Login failed: ' + error.message;
        } else if (data && data.session) {
            // Access the user ID correctly from 'data.session'
            currentUserId = data.session.user.id;
            showProjectsView();
        } else {
            // Handle unexpected response structure
            messageDiv.textContent = 'Unexpected response structure';
        }
    });
}


if (createProjectButton) {
    createProjectButton.addEventListener('click', () => {
        projectForm.style.display = 'block';
    });
}

if (projectForm) {
    projectForm.addEventListener('submit', async function(event) {
        event.preventDefault();

        const projectName = document.getElementById('projectName').value;
        const projectDescription = document.getElementById('projectDescription').value; // Get the project description
        const projectMessage = document.getElementById('projectMessage');

        const { error } = await supabase.from('projects').insert([{ 
            name: projectName,
            description: projectDescription, // Insert the description field
            user_id: currentUserId
        }]);

        if (error) {
            projectMessage.textContent = 'Failed to create project: ' + error.message;
        } else {
            projectMessage.textContent = 'Project created successfully!';
            projectForm.reset(); 
            projectForm.style.display = 'none';
            fetchProjects(); // Fetch updated projects list
        }
    });
}


if (uploadForm) {
    uploadForm.addEventListener('submit', async function(event) {
        event.preventDefault();

        const goals = document.getElementById('goals').value;
        const durationInput = document.getElementById('duration').value.trim();
        const media = document.getElementById('media').value;
        const result = document.getElementById('result').value;  // New Result field
        const fileInput = document.getElementById('imageUpload');
        const file = fileInput.files[0];

        // Parse the duration input and convert to total minutes
        const totalMinutes = parseDuration(durationInput);
        if (totalMinutes === null) {
            alert('Invalid duration format. Use format like "1h 30m" or "90m".');
            return;
        }

        if (file) {
            try {
                // Compress the image using Pica before uploading
                const compressedFile = await compressImage(file);

                // Upload image to Supabase Storage
                const fileName = `${Date.now()}_${file.name}`;
                const filePath = `${currentUserId}/${fileName}`;

                const { error: uploadError } = await supabase.storage
                    .from('user_images')
                    .upload(filePath, compressedFile);

                if (uploadError) {
                    alert('Failed to upload image: ' + uploadError.message);
                    return;
                }

                // Insert session details into the database
                const { error: insertError } = await supabase.from('sessions').insert([{
                    goals,
                    duration: totalMinutes, // Save total minutes in the database
                    media,
                    result,  // Insert result field into the database
                    image: fileName,
                    user_id: currentUserId,
                    project_id: selectedProjectId
                }]);

                if (insertError) {
                    alert('Failed to upload session: ' + insertError.message);
                    return;
                }

                // Display the uploaded image in the gallery
                const reader = new FileReader();
                reader.onload = function(e) {
                    const imgContainer = document.getElementById('imageContainer');
                    if (imgContainer) {
                        const imgItem = document.createElement('div');
                        imgItem.className = 'image-item';

                        const img = document.createElement('img');
                        img.src = e.target.result;
                        img.alt = `Session Image`;

                        const details = document.createElement('div');
                        details.className = 'image-details';

                        const goalsDetail = document.createElement('div');
                        goalsDetail.className = 'details';
                        goalsDetail.textContent = `Goals: ${goals}`;

                        const mediaDetail = document.createElement('div');
                        mediaDetail.className = 'details';
                        mediaDetail.textContent = `Media: ${media}`;

                        const durationDetail = document.createElement('div');
                        durationDetail.className = 'details';
                        durationDetail.textContent = `Duration: ${totalMinutes} mins`;

                        const resultDetail = document.createElement('div');
                        resultDetail.className = 'details';
                        resultDetail.textContent = `Result: ${result}`;  // Display result in details

                        details.appendChild(goalsDetail);
                        details.appendChild(durationDetail);
                        details.appendChild(mediaDetail);
                        details.appendChild(resultDetail);  // Append result detail

                        imgItem.appendChild(img);
                        imgItem.appendChild(details);
                        imgContainer.appendChild(imgItem);
                    }
                };
                reader.readAsDataURL(file);

            } catch (error) {
                console.error('Image compression or upload failed:', error.message);
            }
        }

        fileInput.value = ''; 
        uploadForm.reset(); 
    });
}


/**
 * Parses a duration string in the format "1h 30m" or "90m" and returns total minutes.
 * Returns null if the input is invalid.
 */
function parseDuration(input) {
    const hoursRegex = /(\d+)\s*h\s*/; // Matches "1h", "2h", etc.
    const minutesRegex = /(\d+)\s*m\s*/; // Matches "30m", "45m", etc.
    let totalMinutes = 0;

    // Check for hours
    const hoursMatch = input.match(hoursRegex);
    if (hoursMatch) {
        totalMinutes += parseInt(hoursMatch[1]) * 60;
        input = input.replace(hoursRegex, ''); // Remove matched hours part
    }

    // Check for minutes
    const minutesMatch = input.match(minutesRegex);
    if (minutesMatch) {
        totalMinutes += parseInt(minutesMatch[1]);
        input = input.replace(minutesRegex, ''); // Remove matched minutes part
    }

    // If the remaining input is not empty, it's an invalid format
    if (input.trim() !== '') {
        return null;
    }

    return totalMinutes;
}





if (createSessionButton) {
    createSessionButton.addEventListener('click', function() {
        showSessionUploadView();
    });
}

if (logoutButton) {
    logoutButton.addEventListener('click', async function() {
        await supabase.auth.signOut();
        showLoginView();
    });
}

if (backToProjectsButton) {
    backToProjectsButton.addEventListener('click', function() {
        showProjectsView();
    });
}

if (backToSessionsButton) {
    backToSessionsButton.addEventListener('click', function() {
        showSessionsView();
    });
}

async function fetchProjects() {
    console.log("Fetching projects for user ID:", currentUserId);
    const { data, error } = await supabase
        .from('projects')
        .select(`id, name, description, complete, public, sessions (id, image, created_at)`)
        .eq('user_id', currentUserId);

    if (error) {
        console.error('Error fetching projects:', error);
    } else {
        const projectsList = document.getElementById('projectsList');

        if (projectsList) {
            projectsList.innerHTML = ''; // Clear the previous projects

            data.forEach(project => {
                const sessionCount = project.sessions.length;
                const recentSession = project.sessions.length > 0 ? getMostRecentSession(project.sessions) : null;
                const projectImageUrl = recentSession ? getSessionImageUrl(recentSession.image) : 'images/banans.jpg';

                console.log("Project fetched:", project);
                const projectItem = document.createElement('div');
                projectItem.className = 'project-item';

                const projectStatus = project.complete ? 'Complete' : 'In Progress';
                const projectStatusClass = project.complete ? 'project-complete-status' : 'project-incomplete-status';

                const projectVisible = project.public ? 'Public' : 'Private';
                const projectVisibleClass = project.public ? 'project-visible-public' : 'project-visible-private';

                const projectVisibleIcon = project.public ? '🔓' : '🔒' ;

                projectItem.innerHTML = `
                    <div class="project-image-preview">
                        <img src="${projectImageUrl}" alt="Project Image" />
                    </div>
                    <div class="project-details">
                        <div class="project-name">${project.name}</div>
                        <div class="project-description">${project.description || 'No description provided.'}</div> <!-- Display the description -->
                        <div class="session-count">🖼️: ${sessionCount}</div>
                        <div class="${projectStatusClass}">${projectStatus}</div>
                        <div class="${projectVisibleClass}">${projectVisibleIcon} ${projectVisible}</div>
                    </div>
                    <button class="delete-button">x</button>
                `;

                projectItem.addEventListener('click', () => {
                    selectedProjectId = project.id;
                    console.log("Selected Project ID:", selectedProjectId);
                    showSessionsView();
                });

                // Add delete event listener to the delete button
                const deleteButton = projectItem.querySelector('.delete-button');
                deleteButton.addEventListener('click', async (e) => {
                    e.stopPropagation(); // Prevent the click event from propagating to projectItem click
                    await deleteProject(project.id); // Call delete project function
                });

                projectsList.appendChild(projectItem);
            });
        }
        addImageModalFunctionality(); // Ensure modal functionality is reattached
    }
}



async function deleteProject(projectId) {
    try {
        // Fetch all sessions associated with the project
        const { data: sessions, error: sessionsError } = await supabase
            .from('sessions')
            .select('*')
            .eq('project_id', projectId);

        if (sessionsError) throw sessionsError;

        // Delete each session's images from the storage
        for (const session of sessions) {
            if (session.image) {
                const filePath = `${currentUserId}/${session.image}`;
                await supabase.storage.from('user_images').remove([filePath]);
            }
        }

        // Delete sessions from the database
        const { error: deleteSessionsError } = await supabase
            .from('sessions')
            .delete()
            .eq('project_id', projectId);

        if (deleteSessionsError) throw deleteSessionsError;

        // Delete the project from the database
        const { error: deleteProjectError } = await supabase
            .from('projects')
            .delete()
            .eq('id', projectId);

        if (deleteProjectError) throw deleteProjectError;

        console.log('Project and related sessions deleted successfully.');
        fetchProjects(); // Refresh the projects list
    } catch (error) {
        console.error('Error deleting project:', error.message);
    }
}


/**
 * Converts a duration in minutes to a string format like "1h 30m" or "30m" if less than an hour.
 * @param {number} minutes - The duration in minutes.
 * @returns {string} - The formatted duration.
 */
function formatDuration(minutes) {
    if (minutes < 60) {
        return `${minutes}m`; // Only show minutes if less than an hour
    }
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`; // Show "1h 30m" or "1h" if no remaining minutes
}

async function fetchSessions() {
    console.log("Fetching sessions for project ID:", selectedProjectId);
    const { data, error } = await supabase
        .from('sessions')
        .select('*')
        .eq('user_id', currentUserId)
        .eq('project_id', selectedProjectId);

    if (error) {
        console.error('Error fetching sessions:', error);
    } else {
        const sessionsList = document.getElementById('sessionsList');
        if (sessionsList) {
            sessionsList.innerHTML = ''; // Clear previous sessions

            data.forEach((session, index) => {
                console.log("Session fetched:", session);

                const sessionItem = document.createElement('div');
                sessionItem.className = 'session-item';

                const sessionDetails = document.createElement('div');
                sessionDetails.className = 'session-details';

                // Convert the duration in minutes to hours and minutes format
                const durationFormatted = formatDuration(session.duration);

                // Create an image element for the session image preview
                const sessionImage = document.createElement('img');
                sessionImage.className = 'session-image-preview';
                sessionImage.src = `${SUPABASE_URL}/storage/v1/object/public/user_images/${currentUserId}/${session.image}`;
                sessionImage.alt = `Session Image`;

                // Include the result field in the session details
                sessionDetails.innerHTML = `
                    <div>#️⃣: <span class="weight-600">${index + 1}</span> ⏱️ ${durationFormatted}</div>
                    <div>🖌️: ${session.media}</div>
                    <div>🏆: ${session.goals}</div>
                    <div>✔️: ${session.result}</div>
                `;

                sessionItem.appendChild(sessionImage); // Append the image to session item
                sessionItem.appendChild(sessionDetails);

                // Optional: Add a delete button for each session
                const deleteButton = document.createElement('button');
                deleteButton.className = 'delete-button';
                deleteButton.innerHTML = '&times;';
                deleteButton.addEventListener('click', async () => {
                    await deleteSession(session.id, session.image); // Function to delete session
                });

                sessionItem.appendChild(deleteButton); // Append the delete button

                sessionsList.appendChild(sessionItem); // Append the session item to the list
            });
        }
    }
    addImageModalFunctionality();
}



// Function to delete a session and its associated image
async function deleteSession(sessionId, imageName) {
    try {
        // Delete image from storage if it exists
        if (imageName) {
            const filePath = `${currentUserId}/${imageName}`;
            await supabase.storage.from('user_images').remove([filePath]);
        }

        // Delete session from the database
        const { error } = await supabase
            .from('sessions')
            .delete()
            .eq('id', sessionId);

        if (error) throw error;

        console.log('Session deleted successfully.');
        fetchSessions(); // Refresh the sessions list
    } catch (error) {
        console.error('Error deleting session:', error.message);
    }
}



async function showProjectsView() {
    console.log("Showing Projects View");

    try {
        // Fetch both colour_theme and colour_inv from user_settings table
        const { data, error } = await supabase
            .from('user_settings')
            .select('colour_theme, colour_inv')
            .eq('user_id', currentUserId)
            .single();

        if (error) {
            console.error('Failed to fetch theme colors:', error);
            return;
        }

        // Define fallback colors in case the database doesn't return any
        const userColor = data ? data.colour_theme : '#000000'; // Default to black
        const invColor = data ? data.colour_inv : generateComplementaryColor(userColor); // Generate complementary if not available

        const themeColorPicker = document.getElementById('themeColorPicker');
        themeColorPicker.value = userColor;

        console.log('User Color:', userColor);
        console.log('Inverse Color:', invColor);

        // Define base gray colors
        const baseGray = {
            '--background-gray': '#868686',
            '--container-gray': '#b7b7b7',
            '--item-gray': '#ffffff',
            '--text-input-gray': '#ececec'
        };

        // Generate blended colors based on userColor
        const blendedColors = generateBlendedColors(baseGray, userColor);

        // Generate complementary colors for inverse theme based on invColor
        const complementaryColors = {};
        for (const [key, color] of Object.entries(blendedColors)) {
            complementaryColors[`${key.replace('gray', 'inv')}`] = generateComplementaryColor(color);
        }

        // Apply the theme colors to the stylesheet
        for (const [key, value] of Object.entries(blendedColors)) {
            document.documentElement.style.setProperty(key, value);
        }

        // Apply the complementary colors (inverse theme)
        for (const [key, value] of Object.entries(complementaryColors)) {
            document.documentElement.style.setProperty(key, value);
        }

        // Apply the primary inverse color directly as well for uniformity
        document.documentElement.style.setProperty('--background-inv', invColor);
    } catch (err) {
        console.error('Error fetching theme colors:', err);
    }

    // Continue with showing projects
    fetchProjects();
    toggleView('projects-container');
}



async function showSessionsView() {
    console.log("Showing Sessions View");

    // Fetch the current project details including name, complete status, and public status
    const { data, error } = await supabase
        .from('projects')
        .select('name, description, complete, public')
        .eq('id', selectedProjectId)
        .single();

    if (error) {
        console.error('Error fetching project details:', error);
        currentProjectComplete = false;
    } else {
        currentProjectComplete = data.complete;

        // Update the project title and description in the sessions view
        const projectNameText = document.getElementById('projectNameText');
        const projectNameInput = document.getElementById('projectNameInput');
        const editProjectNameButton = document.getElementById('editProjectNameButton');

        if (projectNameText && projectNameInput && editProjectNameButton) {
            // Reset the edit state
            projectNameText.textContent = data.name;
            projectNameInput.value = data.name;
            projectNameText.style.display = 'inline';
            projectNameInput.style.display = 'none';
            editProjectNameButton.textContent = '✏️';

            // Remove previous event listeners to prevent duplicate bindings
            editProjectNameButton.replaceWith(editProjectNameButton.cloneNode(true));
            const newEditButton = document.getElementById('editProjectNameButton');

            // Add the event listener to the new button
            newEditButton.addEventListener('click', () => {
                toggleEditProjectName(projectNameText, projectNameInput, newEditButton);
            });

            // Save project name when hitting enter key
            projectNameInput.addEventListener('keyup', (event) => {
                if (event.key === 'Enter') {
                    updateProjectName(projectNameText, projectNameInput, newEditButton);
                }
            });
        }

        // Update the icons' initial state
        const completeToggle = document.getElementById('completeToggle');
        completeToggle.textContent = currentProjectComplete ? '✔️' : '❌';
        completeToggle.className = currentProjectComplete ? 'toggle-icon active' : 'toggle-icon inactive';

        const privateToggle = document.getElementById('privateToggle');
        
        const privateToggleLabel = document.getElementById('privateToggleLabel');

        privateToggle.textContent = data.public ? '🔒' : '🔓'; // public is false means private is true
        privateToggle.className = data.public ? 'toggle-icon inactive' : 'toggle-icon active';
        privateToggleLabel.textContent = data.public ? 'Project is Private' : 'Project is Public';
        
        
    }

    // Display the 'sessions-container'
    toggleView('sessions-container');

    // Add event listener to handle toggle changes for project completion
    const completeToggle = document.getElementById('completeToggle');
    completeToggle.addEventListener('click', async function() {
        const isComplete = completeToggle.textContent === '❌';
        try {
            const { error } = await supabase
                .from('projects')
                .update({ complete: isComplete })
                .eq('id', selectedProjectId);

            if (error) {
                console.error('Error updating project status:', error);
                alert('Failed to update project status. Please try again.');
            } else {
                completeToggle.textContent = isComplete ? '✔️' : '❌';
                completeToggle.className = isComplete ? 'toggle-icon active' : 'toggle-icon inactive';
                console.log(`Project ID: ${selectedProjectId} marked as ${isComplete ? 'Complete' : 'Incomplete'}`);
            }
        } catch (err) {
            console.error('Error marking project as complete:', err);
        }
    });

    // Add event listener to handle toggle changes for project privacy
    const privateToggle = document.getElementById('privateToggle');
    const privateToggleLabel = document.getElementById('privateToggleLabel');
    privateToggle.addEventListener('click', async function() {
        const isPrivate = privateToggle.textContent === '🔓'; // 🔓 means currently public, so change to private
        try {
            const { error } = await supabase
                .from('projects')
                .update({ public: !isPrivate }) // Update public status based on isPrivate
                .eq('id', selectedProjectId);

            if (error) {
                console.error('Error updating project visibility:', error);
                alert('Failed to update project visibility. Please try again.');
            } else {
                privateToggle.textContent = isPrivate ? '🔒' : '🔓';
                privateToggle.className = isPrivate ? 'toggle-icon active' : 'toggle-icon inactive';
                privateToggleLabel.textContent = isPrivate ? 'Project is Private' : 'Project is Public';
                
                console.log(`Project ID: ${selectedProjectId} marked as ${isPrivate ? 'Private' : 'Public'}`);
            }
        } catch (err) {
            console.error('Error marking project as private:', err);
        }
    });

    // Fetch and display sessions
    await fetchSessions();
}


/**
 * Function to toggle the edit state of the project name.
 */
function toggleEditProjectName(projectNameText, projectNameInput, editButton) {
    const isEditable = projectNameInput.style.display === 'none';
    projectNameText.style.display = isEditable ? 'none' : 'inline';
    projectNameInput.style.display = isEditable ? 'inline' : 'none';
    editButton.textContent = isEditable ? '💾' : '✏️';
    if (!isEditable) {
        updateProjectName(projectNameText, projectNameInput, editButton); // Save if exiting edit mode
    }
}

/**
 * Function to update the project name in the database.
 */
async function updateProjectName(projectNameText, projectNameInput, editButton) {
    const newName = projectNameInput.value.trim();
    if (newName && newName !== projectNameText.textContent) {
        try {
            const { error } = await supabase
                .from('projects')
                .update({ name: newName })
                .eq('id', selectedProjectId);

            if (error) {
                console.error('Error updating project name:', error);
                alert('Failed to update project name. Please try again.');
            } else {
                projectNameText.textContent = newName;
                console.log(`Project ID: ${selectedProjectId} name updated to "${newName}"`);
            }
        } catch (err) {
            console.error('Error updating project name:', err);
        }
    }

    // Reset the view mode
    projectNameText.style.display = 'inline';
    projectNameInput.style.display = 'none';
    editButton.textContent = '✏️';
}




async function fetchProjectCompleteStatus() {
    const { data, error } = await supabase
        .from('projects')
        .select('complete')
        .eq('id', selectedProjectId)
        .single();

    if (error) {
        console.error('Error fetching project status:', error);
    } else {
        document.getElementById('projectCompleteToggle').checked = data.complete;
    }
}

async function toggleProjectCompleteStatus(isComplete) {
    const { data, error } = await supabase
        .from('projects')
        .update({ complete: isComplete })
        .eq('id', selectedProjectId);

    if (error) {
        console.error('Error updating project status:', error);
    } else {
        console.log('Project status updated:', data);
    }
}




function showSessionUploadView() {
    console.log("Showing Session Upload View");
    toggleView('upload-session-container');
}

function showLoginView() {
    console.log("Showing Login View");
    toggleView('login-container');
}

function toggleView(visibleContainerId) {
    const containers = ['projects-container', 'sessions-container', 'session-container', 'login-container', "upload-session-container"];
    containers.forEach(containerId => {
        const container = document.getElementById(containerId);
        if (container) {
            container.style.display = containerId === visibleContainerId ? 'block' : 'none';
        }
    });
}

async function compressImage(file) {
    const picaInstance = pica(); // No import needed, just call pica()

    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = async () => {
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;

            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0);

            // Create a target canvas for resizing
            const targetCanvas = document.createElement('canvas');
            const maxWidth = 1200;
            const maxHeight = 1200;

            if (img.width > img.height) {
                targetCanvas.width = maxWidth;
                targetCanvas.height = (img.height * maxWidth) / img.width;
            } else {
                targetCanvas.height = maxHeight;
                targetCanvas.width = (img.width * maxHeight) / img.height;
            }

            try {
                await picaInstance.resize(canvas, targetCanvas);
                const blob = await picaInstance.toBlob(targetCanvas, 'image/jpeg', 0.8);
                resolve(new File([blob], file.name, { type: 'image/jpeg' }));
            } catch (error) {
                reject('Error resizing image: ' + error.message);
            }
        };

        img.onerror = (error) => reject('Error loading image: ' + error.message);
        img.src = URL.createObjectURL(file);
    });
}

async function updateProjectCompletionStatus(projectId, isComplete) {
    try {
        const { error } = await supabase
            .from('projects')
            .update({ complete: isComplete })
            .eq('id', projectId);

        if (error) throw error;

        console.log(`Project ${projectId} marked as ${isComplete ? 'complete' : 'incomplete'}.`);
    } catch (error) {
        console.error('Error updating project completion status:', error.message);
    }
}

// Function to get the most recent session based on created_at
function getMostRecentSession(sessions) {
    return sessions.reduce((latest, session) => {
        return new Date(session.created_at) > new Date(latest.created_at) ? session : latest;
    }, sessions[0]);
}

// Function to generate the session image URL
function getSessionImageUrl(imageFileName) {
    return `${SUPABASE_URL}/storage/v1/object/public/user_images/${currentUserId}/${imageFileName}`;
}


function addImageModalFunctionality() {
    // Get the modal and the modal image element
    const modal = document.getElementById("imageModal");
    const modalImage = document.getElementById("modalImage");
    const closeModal = document.getElementById("closeModal");

    // Function to open the modal and display the clicked image
    function openModal(imageSrc) {
        modal.style.display = "block";
        modalImage.src = imageSrc;
    }

    // Close the modal when the 'x' button is clicked
    closeModal.addEventListener('click', () => {
        modal.style.display = "none";
    });

    // Close the modal when clicked outside the image
    modal.addEventListener('click', (event) => {
        if (event.target === modal || event.target === closeModal) {
            modal.style.display = "none";
        }
    });

    // Add click event listeners to all images in the sessions view and project view
    document.addEventListener('click', function(event) {
        if (event.target.classList.contains('session-image-preview') || event.target.classList.contains('project-image-preview')) {
            openModal(event.target.src);
        }
    });
}

function generateBlendedColors(baseColor, userColor) {
    // Define different blend percentages for each shade
    const blendPercentages = {
        '--background-gray': 0.3, // Lighter blend
        '--container-gray': 0.5, // Medium blend
        '--item-gray': 0.7, // Darker blend
        '--text-input-gray': 0.9 // Specific blend for text input
    };

    // Generate blended colors based on the defined percentages
    const blendedColors = {};
    for (const [key, percentage] of Object.entries(blendPercentages)) {
        blendedColors[key] = blendColors(userColor, baseColor[key], percentage);
    }

    return blendedColors;
}


// Improved blendColors function with enhanced contrast calculation
function blendColors(color1, color2, percentage) {
    const f = parseInt(color1.slice(1), 16);
    const t = parseInt(color2.slice(1), 16);
    const R1 = f >> 16, G1 = f >> 8 & 0x00FF, B1 = f & 0x0000FF;
    const R2 = t >> 16, G2 = t >> 8 & 0x00FF, B2 = t & 0x0000FF;

    // Adjust blending based on luminance difference to create more contrast
    const luminance1 = 0.299 * R1 + 0.587 * G1 + 0.114 * B1;
    const luminance2 = 0.299 * R2 + 0.587 * G2 + 0.114 * B2;

    const contrastAdjustment = luminance1 > luminance2 ? percentage : 1 - percentage;

    const R = Math.round(R2 + (R1 - R2) * contrastAdjustment);
    const G = Math.round(G2 + (G1 - G2) * contrastAdjustment);
    const B = Math.round(B2 + (B1 - B2) * contrastAdjustment);

    return `#${(0x1000000 + (R << 16) + (G << 8) + B).toString(16).slice(1)}`;
}


document.getElementById('themeColorPicker').addEventListener('input', async (event) => {
    const userColor = event.target.value;

    // Define base gray colors including the new text-input-gray
    const baseGray = {
        '--background-gray': '#868686',
        '--container-gray': '#b7b7b7',
        '--item-gray': '#ffffff',
        '--text-input-gray': '#ececec'
    };

    // Generate distinct blended colors based on the user's selected color
    const blendedColors = generateBlendedColors(baseGray, userColor);

    // Generate complementary colors for the inverse variables
    const complementaryColors = {};
    for (const [key, color] of Object.entries(blendedColors)) {
        complementaryColors[`${key.replace('gray', 'inv')}`] = generateComplementaryColor(color);
    }

    // Apply the new blended colors and complementary colors to the CSS variables
    for (const [key, value] of Object.entries(blendedColors)) {
        document.documentElement.style.setProperty(key, value);
    }
    for (const [key, value] of Object.entries(complementaryColors)) {
        document.documentElement.style.setProperty(key, value);
    }

    // Save the selected color theme and complementary color to the database
    try {
        const { error } = await supabase
            .from('user_settings')
            .upsert({ 
                user_id: currentUserId, 
                colour_theme: userColor, 
                colour_inv: complementaryColors['--background-inv'] // Save one complementary color as example
            }, { onConflict: ['user_id'] });

        if (error) {
            console.error('Failed to save theme colors:', error);
            alert('Failed to save theme colors. Please try again.');
        }
    } catch (err) {
        console.error('Error saving theme colors:', err);
        alert('An error occurred while saving the theme colors. Please try again.');
    }
});


async function applySavedTheme() {
    // Fetch the user's saved theme color from the database
    try {
        const { data, error } = await supabase
            .from('user_settings')
            .select('colour_theme')
            .eq('user_id', currentUserId)
            .single();

        if (error) {
            console.error('Failed to fetch theme color:', error);
        } else if (data && data.colour_theme) {
            const userColor = data.colour_theme;

            // Define base gray colors
            const baseGray = {
                '--background-gray': '#868686',
                '--container-gray': '#d8d8d8',
                '--item-gray': '#efeded'
            };

            // Generate distinct blended colors based on the user's saved color
            const blendedColors = generateBlendedColors(baseGray, userColor);

            // Apply the saved blended colors to the CSS variables
            for (const [key, value] of Object.entries(blendedColors)) {
                document.documentElement.style.setProperty(key, value);
            }

            // Update the color picker value to reflect the saved color
            const themeColorPicker = document.getElementById('themeColorPicker');
            if (themeColorPicker) {
                themeColorPicker.value = userColor;
            }
        }
    } catch (err) {
        console.error('Error fetching theme color:', err);
    }
}

document.addEventListener('DOMContentLoaded', async () => {
    const { data, error } = await supabase.auth.getSession();

    if (data && data.session) {
        currentUserId = data.session.user.id;
        applySavedTheme(); // Apply the saved theme on login
        showProjectsView();
    } else {
        showLoginView();
    }
});

// Function to convert a hex color to HSL
function hexToHsl(hex) {
    hex = hex.replace(/^#/, '');
    let r = parseInt(hex.substring(0, 2), 16) / 255;
    let g = parseInt(hex.substring(2, 4), 16) / 255;
    let b = parseInt(hex.substring(4, 6), 16) / 255;

    let max = Math.max(r, g, b);
    let min = Math.min(r, g, b);
    let h, s, l = (max + min) / 2;

    if (max === min) {
        h = s = 0;
    } else {
        let d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        switch (max) {
            case r: h = (g - b) / d + (g < b ? 6 : 0); break;
            case g: h = (b - r) / d + 2; break;
            case b: h = (r - g) / d + 4; break;
        }
        h /= 6;
    }

    return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) };
}

// Function to convert HSL to hex
function hslToHex(h, s, l) {
    s /= 100;
    l /= 100;
    let c = (1 - Math.abs(2 * l - 1)) * s;
    let x = c * (1 - Math.abs((h / 60) % 2 - 1));
    let m = l - c / 2;
    let r = 0, g = 0, b = 0;

    if (0 <= h && h < 60) { r = c; g = x; b = 0; }
    else if (60 <= h && h < 120) { r = x; g = c; b = 0; }
    else if (120 <= h && h < 180) { r = 0; g = c; b = x; }
    else if (180 <= h && h < 240) { r = 0; g = x; b = c; }
    else if (240 <= h && h < 300) { r = x; g = 0; b = c; }
    else if (300 <= h && h < 360) { r = c; g = 0; b = x; }

    r = Math.round((r + m) * 255);
    g = Math.round((g + m) * 255);
    b = Math.round((b + m) * 255);

    return `#${(1 << 24 | r << 16 | g << 8 | b).toString(16).slice(1).toUpperCase()}`;
}

// Function to generate a complementary color
function generateComplementaryColor(hexColor) {
    const hsl = hexToHsl(hexColor);
    let complementaryHue = (hsl.h + 180) % 360;
    return hslToHex(complementaryHue, hsl.s, hsl.l);
}

