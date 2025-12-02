// content.js
if (chrome?.runtime) {
    console.log("[DEBUG] chrome.runtime found.");
} else {
    console.error("[DEBUG] chrome.runtime missing.");
}

chrome.runtime.onMessage.addListener(
    (message, _sender, sendResponse) => {
        if (message.action === "getData") {
            (async () => {
                const dataPackage = await packStorageAsObject(message.option);
                console.log("[Debug] storage data is now ready: " + dataPackage +" :content.js");
                console.log("[Debug] send Response to background.js: content.js");
                sendResponse(dataPackage);
            })();
            return true;
        }
        console.log("[Debug] refuse Response to background.js: content.js");
        return false;
});

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
    console.log("[Debug] data packing result: " + data);
    return Promise.resolve(data);
}
