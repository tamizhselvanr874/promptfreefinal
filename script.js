document.addEventListener('DOMContentLoaded', () => {  
    const form = document.getElementById('prompt-form');  
    const messageDiv = document.getElementById('message');  
    const sidebar = document.getElementById('sidebar');  
  
    // Load existing prompts on page load  
    loadPrompts();  
  
    form.addEventListener('submit', async (event) => {  
        event.preventDefault();  
  
        // Get form values  
        const categoryName = document.getElementById('category-name').value.trim();  
        const promptName = document.getElementById('prompt-name').value.trim();  
        const promptContent = document.getElementById('prompt-content').value.trim();  
  
        // Validate inputs  
        if (!categoryName || !promptName || !promptContent) {  
            messageDiv.textContent = 'All fields are required.';  
            return;  
        }  
  
        const promptData = {  
            category: categoryName,  
            promptName: promptName,  
            content: promptContent  
        };  
  
        try {  
            await savePromptToAzure(promptData);  
            messageDiv.style.color = 'green';  
            messageDiv.textContent = 'Prompt saved successfully!';  
            loadPrompts(); // Reload prompts to update sidebar  
        } catch (error) {  
            messageDiv.style.color = 'red';  
            messageDiv.textContent = 'Failed to save prompt.';  
            console.error('Error saving prompt:', error);  
        }  
    });  
  
    async function savePromptToAzure(promptData) {  
        const storageAccountName = 'promptfreefinal';  
        const containerName = 'prompt-lib';  
        const blobName = `${promptData.category}-${promptData.promptName}.json`;  
        const sasToken = '?sv=2022-11-02&ss=b&srt=co&sp=rwdlaciytfx&se=2026-01-16T04:30:29Z&st=2025-01-15T20:30:29Z&spr=https&sig=t8n%2FlbK%2F%2FvmWBUz3xH1ytCqnFqy5wX1RedSWs8SJ5b4%3D';  
  
        // Construct the Blob URL  
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
            // Fetch the list of blobs  
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
        console.log('Fetching blobs from URL:', listUrl); // Log the URL for debugging  
  
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
            console.error('Error fetching blobs from Azure:', error); // Log the error for debugging  
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
                  
                const promptNameElement = document.createElement('div');  
                promptNameElement.innerHTML = `<strong>Prompt Name:</strong> ${promptData.promptName}`;  
      
                const promptContentElement = document.createElement('div');  
                promptContentElement.innerHTML = `<strong>Prompt Content:</strong> ${promptData.content}`;  
      
                promptElement.appendChild(categoryElement);  
                promptElement.appendChild(promptNameElement);  
                promptElement.appendChild(promptContentElement);  
      
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
