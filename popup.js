// popup.js


document.getElementById("backupAll_Btn").addEventListener("click",
    () =>
    {
        // To Do: read all local storage data(key:value pairs)
        // and save to extension storage
        chrome.runtime.sendMessage(
            {action: "backup", option: "all"},
            (response) => {
                chrome.notifications.create(
                {
                    iconUrl: "Extension128.png",
                    message: "Result: " + response.status,
                    title: "Job finished!",
                    type: "basic"
                });
        });
});

document.getElementById("backupCustom_Btn").addEventListener("click",
() => {
    chrome.tabs.query({ active: true, lastFocusedWindow: true },
        (tabs) => {
            const tabId = tabs[0].id;
            chrome.tabs.sendMessage(tabId,
            {action: "backup", option: "custom"},
            (response) => {});
        });
});

