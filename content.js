// content.js
chrome.runtime.onMessage.addListener(
    (message, sender, sendResponse) => {
        if (message.action === "getData") {
            const dataPackage = packStorageAsObject(message.option);
            sendResponse({ data: dataPackage });
        }
    }
)

async function packStorageAsObject(option) {
    const data = {};
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (option === "all") {
            data[key] = localStorage.getItem(key);
        }
        /*
        else if (option === "") {
           // To do: filter key by specified option
        }*/
    }
    return data;
}
