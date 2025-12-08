// popup.js
/// <reference path="/usr/lib/node_modules/chrome-types/index.d.ts" />

document.querySelector('#backupAll_Btn[data-origin="static"]').addEventListener("click",
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
        if (response.status === "ok") {
            await updateBackupList();
        }

});

let updateFlag = false;

document.querySelector('button#backupCustom_Btn[data-origin="static"]').addEventListener("click",
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
        if (response.status === "ok") {
            await updateBackupList();
        }
});

const projectOptionGroup = document.querySelectorAll('input[type="checkbox"][name="project"][data-origin="static"]:checked');

async function collectOptions() {

}

const backupCombobox = document.querySelector('select#backupCollection[data-origin="static"]');

document.addEventListener("DOMContentLoaded", updateBackupList);

async function updateBackupList() {
    console.log("[Debug] searching backup data: popup.js");
    const response = await chrome.runtime.sendMessage({action: "load backuplist"});
    console.log("[Debug] found backup data: " + response.status + " : popup.js");
    if (response.status === "error") {
        return false;
    }
    else {
        if (updateFlag) {
            console.log("[Debug] Update channel is busy...: popup.js@load backuplist");
        }
        else {
            console.log("[Debug] not busy right now. start update: popup.js@self");
            const keyList = response.message;
            await appendBackupList(keyList);
        }
    }
    return true;
}

const ProjectNumber = Object.freeze({
    PROJECT_MIN: 1,
    PROJECT_MAX: 8
});

const FileExtensions = Object.freeze([
    ".hdl",
    ".asm",
    ".hack",
    ".vm",
    ".cmp",
    ".txt"
]);

document.addEventListener("DOMContentLoaded", addProjectCheckbox);

const projectParent = document.querySelector('fieldset#project-parent');

let unitProjectList;

function addProjectCheckbox() {
    const partialString = [];
    for (let i = ProjectNumber.PROJECT_MIN; i <= ProjectNumber.PROJECT_MAX; i++) {
        const fixedIndex = i;
        partialString.push('<label for="project-' + fixedIndex + '">[' + fixedIndex +
        '<input type="checkbox" name="project" data-origin="injected" id="project-' + fixedIndex + '" />]</label>');
    }
    const contentString = partialString.join("");
    injectDocumentFragment(contentString, projectParent);
    unitProjectList = document.querySelectorAll('input[type="checkbox"][name="project"][data-origin="injected"]');
    checkAllProjects.addEventListener("change", () => {
        unitProjectList.forEach((checkbox) => checkbox.checked = checkAllProjects.checked);
    })
    unitProjectList.forEach((checkbox) => {
        checkbox.addEventListener("change", () => {
            const allChecked = Array.from(unitProjectList).every(project => project.checked);
            checkAllProjects.checked = allChecked;
        });
    });
}

document.addEventListener("DOMContentLoaded", addExtensionCheckbox);

const extensionParent = document.querySelector('fieldset#extension-parent');

let unitExtensionList;

function addExtensionCheckbox() {
    const partialString = [];
    for (let i = 0; i < FileExtensions.length; i++) {
        const fixedIndex = i;
        partialString.push('<label for="extension-' + fixedIndex + '">['
        + FileExtensions[i] +
        '<input type="checkbox" name="extension" data-origin="injected" id="extension-'
        + fixedIndex + '" />]</label>');
    }
    const contentString = partialString.join("");
    injectDocumentFragment(contentString, extensionParent);
    unitExtensionList = document.querySelectorAll('input[type="checkbox"][name="extension"][data-origin="injected"]');
    checkAllExtensions.addEventListener("change", () => {
        unitExtensionList.forEach((checkbox) => checkbox.checked = checkAllExtensions.checked);
    });
    unitExtensionList.forEach(checkbox => {
        checkbox.addEventListener("change", () => {
            const allChecked = Array.from(unitExtensionList).every(project => project.checked);
            checkAllExtensions.checked = allChecked;
        });
    });
}

document.querySelector('button#load_Btn[data-origin="static"]').addEventListener("click",
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

const checkAllProjects = document.getElementById("project-all");

const checkAllExtensions = document.getElementById("extension-all");
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
            if (updateFlag) {
                console.log("[Debug] Update channel is busy...: popup.js@update");
                sendResponse({ status: "busy" });
            }
            else {
                console.log("[Debug] not busy right now. start update: popup.js@forced");
                const keyList = message.message;
                (async () => {
                    const appendResult = await appendBackupList(keyList);
                    sendResponse({ status: "update " + appendResult });
                })();
            }
            return true;
        }
        else return;
});

async function appendBackupList(keyList) {
    updateFlag = true;
    const comboboxString = makeCombobox(keyList);
    while (backupCombobox.childElementCount > 0) {
        backupCombobox.removeChild(backupCombobox.lastChild);
        console.log("removed child in combobox. child left: " + backupCombobox.childElementCount + ": popup.js");
    }
    injectDocumentFragment(comboboxString, backupCombobox);
    updateFlag = false;
    return true;
}

function injectDocumentFragment(htmlString, parent) {
    const template = document.createElement("template");
    template.innerHTML = htmlString;
    console.log("appendChild called from update action: popup.js");
    parent.appendChild(template.content);
}

function makeCombobox(stringArray) {
    const partialString = [];
    partialString.push('<option value="" disabled selected hidden>...</option>');
    for (let i = 0; i < stringArray.length; i++) {
        partialString.push('<option value="' + stringArray[i] +'">' + stringArray[i] +"</option>");
    }
    const htmlString = partialString.join("");
    return htmlString;
}
