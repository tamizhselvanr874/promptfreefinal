document.addEventListener('DOMContentLoaded', () => {  
    const chatWindow = document.getElementById('chat-window');  
    const userInput = document.getElementById('user-input');  
    const sendButton = document.getElementById('send-button');  
    const messageDiv = document.getElementById('message');  
  
    let currentStep = 0;  
    let categoryName = '';  
    let numPrompts = 0;  
    const prompts = [];  
    let currentPromptIndex = 0;  
    let isAskingForContent = false; // Track whether we are asking for content  
  
    const steps = [  
        { question: "What's the category name?", handler: handleCategoryName },  
        { question: "How many prompts would you like to add?", handler: handleNumPrompts }  
    ];  
  
    sendButton.addEventListener('click', handleSend);  
    userInput.addEventListener('keypress', (event) => {  
        if (event.key === 'Enter') {  
            handleSend();  
        }  
    });  
  
    function handleSend() {  
        const userText = userInput.value.trim();  
        if (!userText) return;  
  
        addMessageToChat(userText, 'user-message');  
        userInput.value = '';  
  
        if (currentStep < steps.length) {  
            steps[currentStep].handler(userText);  
        } else {  
            handlePromptDetails(userText);  
        }  
    }  
  
    function handleCategoryName(input) {  
        categoryName = input;  
        currentStep++;  
        askNextQuestion();  
    }  
  
    function handleNumPrompts(input) {  
        numPrompts = parseInt(input, 10);  
        if (isNaN(numPrompts) || numPrompts < 1) {  
            addMessageToChat("Please enter a valid number.", 'assistant-message');  
        } else {  
            currentStep++;  
            askNextQuestion();  
        }  
    }  
  
    function handlePromptDetails(input) {  
        if (!isAskingForContent) {  
            // Add prompt name  
            prompts.push({ promptName: input, content: "" });  
            addMessageToChat(`Enter content for prompt "${input}":`, 'assistant-message');  
            isAskingForContent = true;  
        } else {  
            // Add prompt content  
            prompts[currentPromptIndex].content = input;  
            currentPromptIndex++;  
            isAskingForContent = false;  
            if (currentPromptIndex < numPrompts) {  
                addMessageToChat(`Enter name for prompt ${currentPromptIndex + 1}:`, 'assistant-message');  
            } else {  
                submitPrompts();  
            }  
        }  
    }  
  
    function askNextQuestion() {  
        if (currentStep < steps.length) {  
            addMessageToChat(steps[currentStep].question, 'assistant-message');  
        } else if (currentPromptIndex < numPrompts) {  
            addMessageToChat(`Enter name for prompt 1:`, 'assistant-message');  
        }  
    }  
  
    function addMessageToChat(text, className) {  
        const messageElement = document.createElement('div');  
        messageElement.className = `message ${className}`;  
        messageElement.innerHTML = `<div class="message-content">${text}</div>`;  
        chatWindow.appendChild(messageElement);  
        chatWindow.scrollTop = chatWindow.scrollHeight;  
    }  
  
    function submitPrompts() {  
        const promptData = { category: categoryName, prompts };  
        savePromptToAzure(promptData);  
        addMessageToChat('Prompts saved successfully!', 'assistant-message');  
        loadPrompts();  
        resetForm();  
    }  
  
    function resetForm() {  
        currentStep = 0;  
        categoryName = '';  
        numPrompts = 0;  
        prompts.length = 0;  
        currentPromptIndex = 0;  
        isAskingForContent = false;  
        askNextQuestion();  
    }  
  
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
            await renderSidebar(blobs);  
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
  
    async function renderSidebar(blobs) {  
        const sidebar = document.getElementById('prompt-library');  
        sidebar.innerHTML = ''; // Clear existing content  
  
        if (blobs.length === 0) {  
            sidebar.innerHTML = '<div>No prompts available.</div>';  
            return;  
        }  
  
        for (const blob of blobs) {  
            try {  
                const promptData = await fetchBlobData(blob.name);  
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
  
                promptData.prompts.forEach(prompt => {  
                    const listItem = document.createElement('li');  
                    listItem.textContent = prompt.promptName;  
                    listItem.onclick = () => alert(`Content: ${prompt.content}`);  
                    promptList.appendChild(listItem);  
                });  
  
                const listItem = document.createElement('li');  
                listItem.style.textAlign = 'center';  
  
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
            } catch (error) {  
                console.error('Error fetching blob data:', error);  
            }  
        }  
    }  
  
    function toggleCategory(selectedCategoryId) {  
        const selectedCategoryElement = document.getElementById(selectedCategoryId);  
        if (selectedCategoryElement) {  
            selectedCategoryElement.style.display = selectedCategoryElement.style.display === 'none' ? 'block' : 'none';  
        }  
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
  
        modal.querySelectorAll('.close').forEach(button => {  
            button.onclick = () => modal.style.display = 'none';  
        });  
  
        document.getElementById('save-changes').onclick = async () => {  
            const updatedCategoryName = editCategoryNameInput.value.trim();  
            const updatedPrompts = [];  
  
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
            'youtube thumbnails': 'fa-solid fa-video',
            'oil paintings': 'fa-solid fa-palette',
            'ultra realistic foods': 'fa-solid fa-utensils',
            'professional product photography': 'fa-solid fa-box-open',
            'realistic human portraits': 'fa-solid fa-user-tie',
            'logos and brand mascots': 'fa-solid fa-paint-brush',
            'lifestyle stock images of people': 'fa-solid fa-users',
            'landscapes': 'fa-solid fa-mountain',
            'macro photography': 'fa-solid fa-search-plus',
            'architecture': 'fa-solid fa-building', 
            'default': 'fa-solid fa-info-circle'  
        };  
        for (const [key, value] of Object.entries(derivedIcons)) {  
            if (iconPreference.toLowerCase().includes(key)) {  
                return value;  
            }  
        }  
        return derivedIcons.default;  
    }  
  
    // Load prompts immediately when the page loads  
    loadPrompts();  
  
    // Start the conversation  
    askNextQuestion();  
});  
