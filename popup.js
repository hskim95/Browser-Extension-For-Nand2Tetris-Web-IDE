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

const checkAllProjects = document.getElementById("project all");
const individualProjects = document.querySelectorAll('[name="project"]:not([id$="all"])');

checkAllProjects.addEventListener("change",
    () => {
        for (checkbox of individualProjects) {
            checkbox.checked = checkAllProjects.checked;
        }
});

individualProjects.forEach(checkbox => {
    checkbox.addEventListener("click", () => {
        const allChecked = Array.from(individualProjects).every(project => project.checked);
        checkAllProjects.checked = allChecked;
    })
});

const checkAllExtensions = document.getElementById("extension all");
const individualExtensions = document.querySelectorAll('[name="extension"]:not([id$="all"])');

checkAllExtensions.addEventListener("change",
    () => {
        for (checkbox of individualExtensions) {
            checkbox.checked = checkAllExtensions.checked;
        }
});

individualExtensions.forEach(checkbox => {
    checkbox.addEventListener("click", () => {
        const allChecked = Array.from(individualExtensions).every(extension => extension.checked);
        checkAllExtensions.checked = allChecked;
    })
});
