document.addEventListener('DOMContentLoaded', () => {  
    const form = document.getElementById('prompt-form');  
    const messageDiv = document.getElementById('message');  
    const sidebar = document.getElementById('sidebar');  
    const numPromptsInput = document.getElementById('num-prompts');  
    const promptFieldsContainer = document.getElementById('prompt-fields');  
  
    // Load existing prompts on page load  
    loadPrompts();  
  
    // Listen for changes in the number of prompts input  
    numPromptsInput.addEventListener('change', () => {  
        const numPrompts = parseInt(numPromptsInput.value, 10);  
        promptFieldsContainer.innerHTML = ''; // Clear existing fields  
  
        for (let i = 1; i <= numPrompts; i++) {  
            const nameField = document.createElement('input');  
            nameField.type = 'text';  
            nameField.name = `prompt-name-${i}`;  
            nameField.placeholder = `Prompt Name ${i}`;  
            nameField.required = true;  
  
            const contentField = document.createElement('textarea');  
            contentField.name = `prompt-content-${i}`;  
            contentField.rows = 2;  
            contentField.placeholder = `Prompt Content ${i}`;  
            contentField.required = true;  
  
            promptFieldsContainer.appendChild(nameField);  
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
  
    async function renderSidebar(blobs) {  
        sidebar.innerHTML = ''; // Clear existing content  
  
        if (blobs.length === 0) {  
            sidebar.textContent = 'No prompts available.';  
            return;  
        }  
  
        for (const blob of blobs) {  
            try {  
                const promptData = await fetchBlobData(blob.name);  
                const promptElement = document.createElement('div');  
                promptElement.classList.add('prompt-card');  
  
                const categoryElement = document.createElement('div');  
                categoryElement.innerHTML = `<strong>Category Name:</strong> ${promptData.category}`;  
  
                // Create a dropdown to list all prompts under the category  
                const dropdown = document.createElement('select');  
                dropdown.classList.add('prompt-dropdown');  
  
                promptData.prompts.forEach((prompt, index) => {  
                    const option = document.createElement('option');  
                    option.value = index;  
                    option.textContent = `${prompt.promptName}: ${prompt.content}`;  
                    dropdown.appendChild(option);  
                });  
  
                promptElement.appendChild(categoryElement);  
                promptElement.appendChild(dropdown);  
                sidebar.appendChild(promptElement);  
            } catch (error) {  
                console.error('Error fetching blob data:', error);  
            }  
        }  
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
});  
