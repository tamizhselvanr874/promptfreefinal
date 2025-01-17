document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('prompt-form');
    const messageDiv = document.getElementById('message');
    const numPromptsInput = document.getElementById('num-prompts');
    const promptFieldsContainer = document.getElementById('prompt-fields');

    // Load existing prompts on page load
    loadPrompts();

    // Listen for changes in the number of prompts input
    numPromptsInput.addEventListener('input', () => {
        const numPrompts = parseInt(numPromptsInput.value, 10);
        promptFieldsContainer.innerHTML = ''; // Clear existing fields

        for (let i = 1; i <= numPrompts; i++) {
            const nameLabel = document.createElement('label');
            nameLabel.textContent = `Prompt Name ${i}:`;
            nameLabel.htmlFor = `prompt-name-${i}`;

            const nameField = document.createElement('input');
            nameField.type = 'text';
            nameField.id = `prompt-name-${i}`;
            nameField.name = `prompt-name-${i}`;
            nameField.required = true;

            const contentLabel = document.createElement('label');
            contentLabel.textContent = `Prompt Content ${i}:`;
            contentLabel.htmlFor = `prompt-content-${i}`;

            const contentField = document.createElement('textarea');
            contentField.id = `prompt-content-${i}`;
            contentField.name = `prompt-content-${i}`;
            contentField.rows = 2;
            contentField.required = true;

            promptFieldsContainer.appendChild(nameLabel);
            promptFieldsContainer.appendChild(nameField);
            promptFieldsContainer.appendChild(contentLabel);
            promptFieldsContainer.appendChild(contentField);
        }
    });

    form.addEventListener('submit', async (event) => {
        event.preventDefault();

        const categoryName = document.getElementById('category-name').value.trim();
        const numPrompts = parseInt(numPromptsInput.value, 10);
        const prompts = [];

        for (let i = 1; i <= numPrompts; i++) {
            const promptName = document.querySelector(`input[name="prompt-name-${i}"]`).value.trim();
            const promptContent = document.querySelector(`textarea[name="prompt-content-${i}"]`).value.trim();
            if (!promptName || !promptContent) {
                messageDiv.style.color = 'red';
                messageDiv.textContent = 'All fields are required.';
                return;
            }
            prompts.push({ promptName, content: promptContent });
        }

        const promptData = { category: categoryName, prompts };

        try {
            await savePromptToAzure(promptData);
            messageDiv.style.color = 'green';
            messageDiv.textContent = 'Prompts saved successfully!';
            loadPrompts(); // Reload prompts to update sidebar
        } catch (error) {
            messageDiv.style.color = 'red';
            messageDiv.textContent = 'Failed to save prompts.';
            console.error('Error saving prompts:', error);
        }
    });

    async function savePromptToAzure(promptData) {
        const storageAccountName = 'promptfreefinal';
        const containerName = 'prompt-lib';
        const blobName = `${promptData.category}.json`;
        const sasToken = '?sv=2022-11-02&ss=b&srt=co&sp=rwdlaciytfx&se=2026-01-16T04:30:29Z&st=2025-01-15T20:30:29Z&spr=https&sig=t8n%2FlbK%2F%2FvmWBUz3xH1ytCqnFqy5wX1RedSWs8SJ5b4%3D';

        const blobUrl = `https://${storageAccountName}.blob.core.windows.net/${containerName}/${blobName}${sasToken}`;

        const response = await fetch(blobUrl, {
            method: 'PUT',
            headers: {
                'x-ms-blob-type': 'BlockBlob',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(promptData)
        });

        if (!response.ok) {
            throw new Error(`Failed to save blob: ${response.statusText}`);
        }
    }

    async function loadPrompts() {
        try {
            const blobs = await fetchBlobsFromAzure();
            renderSidebar(blobs);
        } catch (error) {
            messageDiv.style.color = 'red';
            messageDiv.textContent = 'Failed to fetch prompts.';
            console.error('Error fetching prompts:', error);
        }
    }

    async function fetchBlobsFromAzure() {
        const storageAccountName = 'promptfreefinal';
        const containerName = 'prompt-lib';
        const sasToken = 'sv=2022-11-02&ss=b&srt=co&sp=rwdlaciytfx&se=2026-01-16T04:30:29Z&st=2025-01-15T20:30:29Z&spr=https&sig=t8n%2FlbK%2F%2FvmWBUz3xH1ytCqnFqy5wX1RedSWs8SJ5b4%3D';

        const listUrl = `https://${storageAccountName}.blob.core.windows.net/${containerName}?restype=container&comp=list&${sasToken}`;

        try {
            const response = await fetch(listUrl);
            if (!response.ok) {
                throw new Error(`Failed to fetch blob list: ${response.statusText}`);
            }

            const text = await response.text();
            const parser = new DOMParser();
            const xmlDoc = parser.parseFromString(text, "application/xml");
            const blobs = Array.from(xmlDoc.getElementsByTagName("Blob")).map(blob => {
                return {
                    name: blob.getElementsByTagName("Name")[0].textContent
                };
            });

            return blobs;
        } catch (error) {
            console.error('Error fetching blobs from Azure:', error);
            throw error;
        }
    }

    // function toggleCategory(categoryId) {  
    //     const categoryElement = document.getElementById(categoryId);  
    //     if (categoryElement) {  
    //         categoryElement.style.display = categoryElement.style.display === 'none' ? 'block' : 'none';  
    //     }  
    // }

    function toggleCategory(selectedCategoryId) {  
        // Get all prompt lists  
        const allPromptLists = document.querySelectorAll('.prompt-list');  
      
        allPromptLists.forEach(promptList => {  
            // Close all prompt lists except the one that was clicked  
            if (promptList.id !== selectedCategoryId) {  
                promptList.style.display = 'none';  
            }  
        });  
      
        // Toggle the selected category  
        const selectedCategoryElement = document.getElementById(selectedCategoryId);  
        if (selectedCategoryElement) {  
            selectedCategoryElement.style.display = selectedCategoryElement.style.display === 'none' ? 'block' : 'none';  
        }  
    }  

    async function renderSidebar(blobs) {  
        const sidebar = document.getElementById('prompt-library');  
        sidebar.innerHTML = ''; // Clear existing content  
      
        if (blobs.length === 0) {  
            sidebar.innerHTML = '<div>No prompts available.</div>';  
            return;  
        }  
      
        blobs.forEach(blob => {  
            fetchBlobData(blob.name).then(async promptData => {  
                const promptCategoryElement = document.createElement('div');  
                promptCategoryElement.className = 'prompt-category';  
      
                const categoryHeading = document.createElement('h3');  
                categoryHeading.className = 'category-heading';  
                categoryHeading.onclick = () => toggleCategory(promptData.category);  
      
                const iconClass = await icon_code_generation(promptData.category);  
                categoryHeading.innerHTML = `  
                    <i class="${iconClass}" title="${promptData.category}"></i>  
                `;  
                categoryHeading.setAttribute('data-tooltip', promptData.category);  
      
                const promptList = document.createElement('ul');  
                promptList.className = 'prompt-list';  
                promptList.id = promptData.category;  
                promptList.style.display = 'none';  
      
                // Only one list item containing edit and delete icons  
                const listItem = document.createElement('li');  
                listItem.style.textAlign = 'center'; // Center align icons  
      
                // Add edit and delete icons inside the list item  
                const editIcon = document.createElement('i');  
                editIcon.className = 'fa fa-edit edit-icon';  
                editIcon.title = 'Edit Category';  
                editIcon.onclick = () => openEditDialog(promptData);  
      
                const deleteIcon = document.createElement('i');  
                deleteIcon.className = 'fa fa-trash delete-icon';  
                deleteIcon.title = 'Delete Category';  
                deleteIcon.onclick = () => {  
                    if (confirm("Are you sure you want to delete this category?")) {  
                        deleteCategory(promptData.category);  
                    }  
                };  
      
                listItem.appendChild(editIcon);  
                listItem.appendChild(deleteIcon);  
                promptList.appendChild(listItem);  
      
                promptCategoryElement.appendChild(categoryHeading);  
                promptCategoryElement.appendChild(promptList);  
                sidebar.appendChild(promptCategoryElement);  
            }).catch(error => {  
                console.error('Error fetching blob data:', error);  
            });  
        });  
    }  

    async function deleteCategory(categoryName) {
        try {
            const storageAccountName = 'promptfreefinal';
            const containerName = 'prompt-lib';
            const sasToken = 'sv=2022-11-02&ss=b&srt=co&sp=rwdlaciytfx&se=2026-01-16T04:30:29Z&st=2025-01-15T20:30:29Z&spr=https&sig=t8n%2FlbK%2F%2FvmWBUz3xH1ytCqnFqy5wX1RedSWs8SJ5b4%3D';
            const blobName = `${categoryName}.json`;
            const blobUrl = `https://${storageAccountName}.blob.core.windows.net/${containerName}/${blobName}?${sasToken}`;

            const response = await fetch(blobUrl, { method: 'DELETE' });

            if (!response.ok) {
                throw new Error(`Failed to delete blob: ${response.statusText}`);
            }

            alert('Category deleted successfully.');
            loadPrompts(); // Refresh the list
        } catch (error) {
            alert('Failed to delete category.');
            console.error('Error deleting category:', error);
        }
    }

    async function openEditDialog(promptData) {
        const modal = document.getElementById('edit-dialog');
        const editCategoryNameInput = document.getElementById('edit-category-name');
        const editNumPromptsInput = document.getElementById('edit-num-prompts');
        const editPromptFieldsContainer = document.getElementById('edit-prompt-fields');

        editCategoryNameInput.value = promptData.category;
        editNumPromptsInput.value = promptData.prompts.length;
        editPromptFieldsContainer.innerHTML = ''; // Clear existing fields

        promptData.prompts.forEach((prompt, index) => {
            const nameLabel = document.createElement('label');
            nameLabel.textContent = `Prompt Name ${index + 1}:`;
            const nameField = document.createElement('input');
            nameField.type = 'text';
            nameField.value = prompt.promptName;
            nameField.required = true;

            const contentLabel = document.createElement('label');
            contentLabel.textContent = `Prompt Content ${index + 1}:`;
            const contentField = document.createElement('textarea');
            contentField.rows = 2;
            contentField.value = prompt.content;
            contentField.required = true;

            editPromptFieldsContainer.appendChild(nameLabel);
            editPromptFieldsContainer.appendChild(nameField);
            editPromptFieldsContainer.appendChild(contentLabel);
            editPromptFieldsContainer.appendChild(contentField);
        });

        modal.style.display = 'block'; // Show modal

        // Close modal on clicking close button
        modal.querySelectorAll('.close').forEach(button => {
            button.onclick = () => modal.style.display = 'none';
        });

        // Save changes
        document.getElementById('save-changes').onclick = async () => {
            const updatedCategoryName = editCategoryNameInput.value.trim();
            const updatedPrompts = [];

            // Validate inputs and gather updated data
            const promptNameInputs = editPromptFieldsContainer.querySelectorAll('input[type="text"]');
            const promptContentInputs = editPromptFieldsContainer.querySelectorAll('textarea');

            for (let i = 0; i < promptNameInputs.length; i++) {
                const promptName = promptNameInputs[i].value.trim();
                const promptContent = promptContentInputs[i].value.trim();
                if (!promptName || !promptContent) {
                    alert('All fields are required.');
                    return;
                }
                updatedPrompts.push({ promptName, content: promptContent });
            }

            const updatedPromptData = { category: updatedCategoryName, prompts: updatedPrompts };

            try {
                // Delete the old prompt data before saving the new one
                await deleteCategory(promptData.category);
                await savePromptToAzure(updatedPromptData);
                alert('Changes saved successfully.');
                modal.style.display = 'none'; // Close modal
                loadPrompts(); // Refresh list
            } catch (error) {
                alert('Failed to save changes.');
                console.error('Error saving changes:', error);
            }
        };
    }

    async function fetchBlobData(blobName) {
        const storageAccountName = 'promptfreefinal';
        const containerName = 'prompt-lib';
        const sasToken = 'sv=2022-11-02&ss=b&srt=co&sp=rwdlaciytfx&se=2026-01-16T04:30:29Z&st=2025-01-15T20:30:29Z&spr=https&sig=t8n%2FlbK%2F%2FvmWBUz3xH1ytCqnFqy5wX1RedSWs8SJ5b4%3D';

        const blobUrl = `https://${storageAccountName}.blob.core.windows.net/${containerName}/${blobName}?${sasToken}`;
        const response = await fetch(blobUrl);

        if (!response.ok) {
            throw new Error(`Failed to fetch blob: ${response.statusText}`);
        }

        return await response.json();
    }

    async function icon_code_generation(iconPreference) {
        const derivedIcons = {
            'car': 'fa-solid fa-car',  
            'tree': 'fa-solid fa-tree',  
            'animal': 'fa-solid fa-dog',  
            'user': 'fa-solid fa-user',  
            'camera': 'fa-solid fa-camera',  
            'city': 'fa-solid fa-city',  
            'heart': 'fa-solid fa-heart',  
            'search': 'fa-solid fa-search',  
            'video': 'fa-solid fa-video',  
            'brush': 'fa-solid fa-brush',  
            'utensils': 'fa-solid fa-utensils',  
            'mountain': 'fa-solid fa-mountain',  
            'home': 'fa-solid fa-home',  
            'bell': 'fa-solid fa-bell',  
            'book': 'fa-solid fa-book',  
            'calendar': 'fa-solid fa-calendar',  
            'chart': 'fa-solid fa-chart-bar',  
            'cloud': 'fa-solid fa-cloud',  
            'code': 'fa-solid fa-code',  
            'comment': 'fa-solid fa-comment',  
            'envelope': 'fa-solid fa-envelope',  
            'flag': 'fa-solid fa-flag',  
            'folder': 'fa-solid fa-folder',  
            'gamepad': 'fa-solid fa-gamepad',  
            'gift': 'fa-solid fa-gift',  
            'globe': 'fa-solid fa-globe',  
            'key': 'fa-solid fa-key',  
            'lock': 'fa-solid fa-lock',  
            'music': 'fa-solid fa-music',  
            'phone': 'fa-solid fa-phone',  
            'shopping-cart': 'fa-solid fa-shopping-cart',  
            'star': 'fa-solid fa-star',  
            'sun': 'fa-solid fa-sun',  
            'thumbs-up': 'fa-solid fa-thumbs-up',  
            'toolbox': 'fa-solid fa-toolbox',  
            'trash': 'fa-solid fa-trash',  
            'user-circle': 'fa-solid fa-user-circle',  
            'wrench': 'fa-solid fa-wrench',  
            'wifi': 'fa-solid fa-wifi',  
            'battery-full': 'fa-solid fa-battery-full',  
            'bolt': 'fa-solid fa-bolt',  
            'coffee': 'fa-solid fa-coffee',  
            'handshake': 'fa-solid fa-handshake',  
            'laptop': 'fa-solid fa-laptop',  
            'microphone': 'fa-solid fa-microphone',  
            'paper-plane': 'fa-solid fa-paper-plane',  
            'plane': 'fa-solid fa-plane',  
            'robot': 'fa-solid fa-robot',  
            'school': 'fa-solid fa-school',  
            'tools': 'fa-solid fa-tools',  
            'rocket': 'fa-solid fa-rocket',  
            'snowflake': 'fa-solid fa-snowflake',  
            'umbrella': 'fa-solid fa-umbrella',  
            'wallet': 'fa-solid fa-wallet',  
            'anchor': 'fa-solid fa-anchor',  
            'archway': 'fa-solid fa-archway',  
            'bicycle': 'fa-solid fa-bicycle',  
            'binoculars': 'fa-solid fa-binoculars',  
            'crown': 'fa-solid fa-crown',  
            'diamond': 'fa-solid fa-gem',  
            'drum': 'fa-solid fa-drum',  
            'feather': 'fa-solid fa-feather',  
            'fish': 'fa-solid fa-fish',  
            'frog': 'fa-solid fa-frog',  
            'gavel': 'fa-solid fa-gavel',  
            'hammer': 'fa-solid fa-hammer',  
            'hospital': 'fa-solid fa-hospital',  
            'lightbulb': 'fa-solid fa-lightbulb',  
            'magnet': 'fa-solid fa-magnet',  
            'map': 'fa-solid fa-map',  
            'medal': 'fa-solid fa-medal',  
            'palette': 'fa-solid fa-palette',  
            'pepper-hot': 'fa-solid fa-pepper-hot',  
            'piggy-bank': 'fa-solid fa-piggy-bank',  
            'ring': 'fa-solid fa-ring',  
            'ship': 'fa-solid fa-ship',  
            'skull': 'fa-solid fa-skull',  
            'smile': 'fa-solid fa-smile',  
            'space-shuttle': 'fa-solid fa-space-shuttle',  
            'spider': 'fa-solid fa-spider',  
            'stopwatch': 'fa-solid fa-stopwatch',  
            'trophy': 'fa-solid fa-trophy',  
            'truck': 'fa-solid fa-truck',  
            'volleyball': 'fa-solid fa-volleyball-ball',  
            'wine-glass': 'fa-solid fa-wine-glass',  
            'yacht': 'fa-solid fa-sailboat',  
            'leaf': 'fa-solid fa-leaf',  
            'apple': 'fa-solid fa-apple-alt',  
            'rocket-launch': 'fa-solid fa-rocket-launch',  
            'paint-roller': 'fa-solid fa-paint-roller',  
            'fire': 'fa-solid fa-fire',  
            'shield': 'fa-solid fa-shield-alt',  
            'tag': 'fa-solid fa-tag',  
            'thermometer': 'fa-solid fa-thermometer',  
            'puzzle-piece': 'fa-solid fa-puzzle-piece',  
            'battery-half': 'fa-solid fa-battery-half',  
            'balance-scale': 'fa-solid fa-balance-scale',  
            'hourglass': 'fa-solid fa-hourglass',  
            'clipboard': 'fa-solid fa-clipboard',  
            'dumbbell': 'fa-solid fa-dumbbell',  
            'futbol': 'fa-solid fa-futbol',  
            'hospital-alt': 'fa-solid fa-hospital-alt',  
            'magic': 'fa-solid fa-magic',  
            'praying-hands': 'fa-solid fa-praying-hands',  
            'recycle': 'fa-solid fa-recycle',  
            'stethoscope': 'fa-solid fa-stethoscope',  
            'syringe': 'fa-solid fa-syringe',  
            'walking': 'fa-solid fa-walking',  
            'weight': 'fa-solid fa-weight',  
            'yin-yang': 'fa-solid fa-yin-yang',  
            'default': 'fa-solid fa-info-circle'  
        };

        for (const [key, value] of Object.entries(derivedIcons)) {
            if (iconPreference.toLowerCase().includes(key)) {
                return value;
            }
        }

        return derivedIcons.default;
    }
});
