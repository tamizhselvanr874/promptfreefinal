document.addEventListener('DOMContentLoaded', () => {  
    const form = document.getElementById('prompt-form');  
    const messageDiv = document.getElementById('message');  
  
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
        const sasToken = '?sv=2022-11-02&ss=b&srt=co&sp=rwdlctfx&se=2025-01-17T03:53:42Z&st=2025-01-15T19:53:42Z&spr=https&sig=XCFNDap8GJf5R4mPZmamK5h%2F54byUKJjDrOiJAFINDg%3D';  
  
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
});  