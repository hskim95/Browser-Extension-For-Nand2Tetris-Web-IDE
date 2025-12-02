// popup.js


document.getElementById("backupAll_Btn").addEventListener("click",
    async () => {
        // To Do: read all local storage data(key:value pairs)
        // and save to extension storage
        console.log("[Debug] send message (backup, all): popup.js");

        const response = await chrome.runtime.sendMessage({action: "backup", option: "all"});
        console.log("[Debug] checking response: " + response + " : popup.js");

        chrome.notifications.create({
            iconUrl: "Extension128.png",
            message: "Result: " + response.status + "\nKey: " + response.message,
            title: "Job finished! (Total Backup)",
            type: "basic"
        });
});

document.getElementById("backupCustom_Btn").addEventListener("click",
    async () => {
        console.log("[Debug] send message (backup, custom): popup.js");

        const response = await chrome.tabs.sendMessage({action: "backup", option: "custom"});
        console.log("[Debug] checking response: " + response + " : popup.js");

        chrome.notifications.create({
            iconUrl: "Extension128.png",
            message: "Result: " + response.status,
            title: "Job finished! (Custom Backup)",
            type: "basic"
        });
});

