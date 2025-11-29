// content.js
chrome.runtime.onMessage.addListener(
    (message, sender, sendResponse) => {
        if (message.action === "backup") {
            const dataPackage = packStorageAsObject();
            chrome.runtime.sendMessage({ action: "saveData", data: dataPackage});
        }
        else if (message.action === "restore") {

        }
    }
)

function packStorageAsObject() {
    const data = {};
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        data[key] = localStorage.getItem(key);
    }
    return data;
}
