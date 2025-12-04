// popup.js
/// <reference path="/usr/lib/node_modules/chrome-types/index.d.ts" />

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

        const response = await chrome.runtime.sendMessage({action: "backup", option: "custom"});
        console.log("[Debug] checking response: " + response + " : popup.js");

        chrome.notifications.create({
            iconUrl: "Extension128.png",
            message: "Result: " + response.status,
            title: "Job finished! (Custom Backup)",
            type: "basic"
        });
});

const projectOptionGroup = document.querySelectorAll('input[name="project"]:checked');

async function collectOptions() {

}

const backupCombobox = document.getElementById("backupCollection");


document.addEventListener("DOMContentLoaded", listBackup);

async function listBackup() {
    console.log("[Debug] searching backup data: popup.js");
    const response = await chrome.runtime.sendMessage({action: "load backuplist"});
    console.log("[Debug] found backup data: " + response.status + " : popup.js");
    if (response.status === "no Backup") {
        chrome.notifications.create({
            iconUrl: "Extension128.png",
            message: "Result: " + response.status,
            title: "Loading backup...",
            type: "basic"
        });
    }
    else if (response.status === "error") {
        return false;
    }
    else {
        const keyList = response.message;
        const comboboxString = makeCombobox(keyList);
        const template = document.createElement("template");
        template.innerHTML = comboboxString;
        backupCombobox.appendChild(template.content);
    }
    return true;
}

document.getElementById("load_Btn").addEventListener("click",
    () => {
        const choice = backupCombobox.value;
        if (choice != "") {
            (async () => {
                const response = await chrome.runtime.sendMessage({ action: "load to browser", backupName: choice });
                chrome.notifications.create({
                    iconUrl: "Extension128.png",
                    message: "Result: " + response.status,
                    title: "Backup data loaded.",
                    type: "basic"
                });
            })();
        }
        else {
            console.warn("Try loading with no data: popup.js");
        }
        return true;
});

function makeCombobox(stringArray) {
    const partialString = [];
    partialString.push('<option value="" disabled selected hidden>...</option>');
    for (let i = 0; i < stringArray.length; i++) {
        partialString.push('<option value="' + stringArray[i] +'">' + stringArray[i] +"</option>");
    }
    const htmlString = partialString.join("");
    return htmlString;
}

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

chrome.runtime.onMessage.addListener(
    (message, _sender, sendResponse) => {
        console.log("[Debug] chrome.runtime.onMessage Event: popup.js");
        if (message.action === "update") {
            console.log("[Debug] get message (update): popup.js");
            (async () => {
                const newKeys = message.message;
                const comboboxString = makeCombobox(newKeys);
                const template = document.createElement("template");
                template.innerHTML = comboboxString;
                while (backupCombobox.childElementCount > 1) {
                    backupCombobox.removeChild[backupCombobox.childElementCount - 1];
                }
                backupCombobox.appendChild(template.content);
                sendResponse({ status: "update ok"});
            })();
            return true;
        }
        else return;
});
