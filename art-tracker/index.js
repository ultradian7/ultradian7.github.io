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
        const projectMessage = document.getElementById('projectMessage');

        const { error } = await supabase.from('projects').insert([{ 
            name: projectName,
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
        .select(`id, name, complete, public, sessions (id, image, created_at)`)
        .eq('user_id', currentUserId);

    if (error) {
        console.error('Error fetching projects:', error);
    } else {
        const projectsList = document.getElementById('projectsList');

        if (projectsList) {
            projectsList.innerHTML = '';

            data.forEach(project => {
                const sessionCount = project.sessions.length;
                const recentSession = project.sessions.length > 0 ? getMostRecentSession(project.sessions) : null;
                const projectImageUrl = recentSession ? getSessionImageUrl(recentSession.image) : 'default_project_image_url.jpg';

                console.log("Project fetched:", project);
                const projectItem = document.createElement('div');
                projectItem.className = 'project-item';

                const projectStatus = project.complete ? 'Complete' : 'In Progress';
                const projectStatusClass = project.complete ? 'project-complete-status' : 'project-incomplete-status';

                const projectVisible = project.public ? 'Public' : 'Private';
                const projectVisibleClass = project.public ? 'project-visible-public' : 'project-visible-private';

                projectItem.innerHTML = `
    <div class="project-image-preview">
        <img src="${projectImageUrl}" alt="Project Image" />
    </div>
    <div class="project-details">
        <div class="project-name">${project.name}</div>
        <div class="session-count">Sessions: ${sessionCount}</div>
        <div class="${projectStatusClass}">${projectStatus}</div>
        <div class="${projectVisibleClass}">${projectVisible}</div>
    </div>
    <button class="delete-button">x</button> <!-- Keep the class identical -->
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
                    <div><strong>Session ${index + 1}:</strong> ${durationFormatted}</div>                    
                    <div>Media: ${session.media}</div>
                    <div>Goals: ${session.goals}</div>
                    <div>Result: ${session.result}</div>
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



function showProjectsView() {
    console.log("Showing Projects View");
    fetchProjects();
    toggleView('projects-container');
}

async function showSessionsView() {
    console.log("Showing Sessions View");

    // Fetch the current project details including name, complete status, and public status
    const { data, error } = await supabase
        .from('projects')
        .select('name, complete, public')
        .eq('id', selectedProjectId)
        .single();

    if (error) {
        console.error('Error fetching project details:', error);
        currentProjectComplete = false;
    } else {
        currentProjectComplete = data.complete;

        // Update the project title in the sessions view
        const projectNameText = document.getElementById('projectNameText');
        const projectNameInput = document.getElementById('projectNameInput');
        const editProjectNameButton = document.getElementById('editProjectNameButton');

        if (projectNameText && projectNameInput && editProjectNameButton) {
            projectNameText.textContent = data.name;
            projectNameInput.value = data.name;

            // Toggle edit state
            editProjectNameButton.addEventListener('click', () => {
                const isEditable = projectNameInput.style.display === 'none';
                projectNameText.style.display = isEditable ? 'none' : 'inline';
                projectNameInput.style.display = isEditable ? 'inline' : 'none';
                editProjectNameButton.textContent = isEditable ? '💾' : '✏️';
                if (!isEditable) updateProjectName(); // Save if exiting edit mode
            });

            // Save project name when hitting enter key
            projectNameInput.addEventListener('keyup', (event) => {
                if (event.key === 'Enter') {
                    updateProjectName();
                }
            });
        }

        // Update the checkbox state
        const completeToggle = document.getElementById('completeToggle');
        completeToggle.checked = currentProjectComplete;

        const privateToggle = document.getElementById('privateToggle');
        privateToggle.checked = !data.public;  // public is false means private is true
    }

    // Display the 'sessions-container'
    toggleView('sessions-container');

    // Add event listener to handle toggle changes for project completion
    completeToggle.addEventListener('change', async function() {
        const isComplete = completeToggle.checked;
        try {
            const { error } = await supabase
                .from('projects')
                .update({ complete: isComplete })
                .eq('id', selectedProjectId);

            if (error) {
                console.error('Error updating project status:', error);
                alert('Failed to update project status. Please try again.');
            } else {
                console.log(`Project ID: ${selectedProjectId} marked as ${isComplete ? 'Complete' : 'Incomplete'}`);
            }
        } catch (err) {
            console.error('Error marking project as complete:', err);
        }
    });

    // Add event listener to handle toggle changes for project privacy
    const privateToggle = document.getElementById('privateToggle');
    privateToggle.addEventListener('change', async function() {
        const isPrivate = privateToggle.checked;
        try {
            const { error } = await supabase
                .from('projects')
                .update({ public: !isPrivate })  // Update public status based on isPrivate
                .eq('id', selectedProjectId);

            if (error) {
                console.error('Error updating project visibility:', error);
                alert('Failed to update project visibility. Please try again.');
            } else {
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
 * Function to update the project name in the database
 */
async function updateProjectName() {
    const projectNameInput = document.getElementById('projectNameInput');
    const projectNameText = document.getElementById('projectNameText');
    const editProjectNameButton = document.getElementById('editProjectNameButton');

    if (projectNameInput && projectNameText) {
        const newName = projectNameInput.value.trim();
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
                projectNameText.style.display = 'inline';
                projectNameInput.style.display = 'none';
                editProjectNameButton.textContent = '✏️';
                console.log(`Project ID: ${selectedProjectId} name updated to "${newName}"`);
            }
        } catch (err) {
            console.error('Error updating project name:', err);
        }
    }
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

