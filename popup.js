// popup.js
/// <reference path="/usr/lib/node_modules/chrome-types/index.d.ts" />

// ===== Preset =====
const ProjectNumber = Object.freeze({
    PROJECT_MIN: 1,
    PROJECT_MAX: 8
});
const projectSize = ProjectNumber.PROJECT_MAX - ProjectNumber.PROJECT_MIN + 1;
const FileExtensions = Object.freeze([
    ".hdl",
    ".asm",
    ".hack",
    ".vm",
    ".cmp",
    ".tst"
]);

const DependencyTable = Object.freeze({
    1: [0],
    2: [0],
    3: [0],
    4: [1],
    5: [0, 2],
    6: [1],
    7: [3],
    8: [3]
});

// 8-bit Comp(0b1)
const optionAllProject =
(1<<(ProjectNumber.PROJECT_MAX - ProjectNumber.PROJECT_MIN + 1)) - 1;
// 6-bit Comp(0b1)
const optionAllExtension = (1<<FileExtensions.length) - 1;

// ===== HTML Element (static) =====
const backupAllButtonElement = document.querySelector('#backupAll_Btn[data-origin="static"]');

const backupSelectionButtonElement = document.querySelector('button#backupSelected_Btn[data-origin="static"]');

const loadButtonElement =
document.querySelector('button#load_Btn[data-origin="static"]');

const projectParent = document.querySelector('fieldset#project-parent');

const checkAllProjects = document.querySelector(
    'input#project-all[type="checkbox"][data-origin="static"]');

const extensionParent = document.querySelector('fieldset#extension-parent');

const checkAllExtensions =
document.querySelector(
    'input#extension-all[type="checkbox"][data-origin="static"]');

const backupCombobox =
document.querySelector('select#backupCombobox[data-origin="static"]');

// ===== HTML Element (injected) =====
let unitProjectList;
let unitExtensionList;

// ===== State =====
let updateFlag = false;

// ===== function =====
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

async function appendBackupList(keyList) {
    updateFlag = true;
    const comboboxString = makeComboboxHTMLString(keyList);
    while (backupCombobox.childElementCount > 0) {
        backupCombobox.removeChild(backupCombobox.lastChild);
        console.log("removed child in combobox. child left: " + backupCombobox.childElementCount + ": popup.js");
    }
    injectDocumentFragment(comboboxString, backupCombobox);
    updateFlag = false;
    return true;
}

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

function addProjectExtensionDependency() {
    unitProjectList.forEach(checkbox => {
        checkbox.addEventListener("change", () => {
            const dependencySet = new Set();
            let currentProjectBit = collectOptions().project;
            for (let i = 0; i < unitProjectList.length; i++) {
                const projectNumber = i + 1;
                if (currentProjectBit & 1) {
                    DependencyTable[projectNumber].forEach(value => dependencySet.add(value));
                }
                currentProjectBit >>>= 1;
                if (currentProjectBit === 0) break;
            }
            for (let i = 0; i < unitExtensionList.length - 2; i++) {
                const fixedIndex = i;
                unitExtensionList[fixedIndex].disabled =
                !dependencySet.has(fixedIndex);
            }
        });
    });
}

function collectOptions() {
    const projectSize = ProjectNumber.PROJECT_MAX - ProjectNumber.PROJECT_MIN + 1;
    let projectOptionBit = 0;
    for (let i = 0; i < projectSize; i++) {
        const fixedIndex = i;
        projectOptionBit |= (unitProjectList[fixedIndex].checked << fixedIndex);
    }
    console.log("[Debug] project option bit: " + projectOptionBit);

    let extensionOptionBit = 0;
    for (let i = 0; i < FileExtensions.length; i++) {
        const fixedIndex = i;
        extensionOptionBit |= (unitExtensionList[fixedIndex].checked << fixedIndex);
    }

    console.log("[Debug] extension option bit: " + extensionOptionBit);
    return { project: projectOptionBit, extension: extensionOptionBit };
}

function injectDocumentFragment(htmlString, parent) {
    const template = document.createElement("template");
    template.innerHTML = htmlString;
    console.log("appendChild called from update action: popup.js");
    parent.appendChild(template.content);
}

function makeComboboxHTMLString(stringArray) {
    const partialString = [];
    partialString.push('<option value="" disabled selected hidden>...</option>');
    for (let i = 0; i < stringArray.length; i++) {
        partialString.push('<option value="' + stringArray[i] +'">' + stringArray[i] +"</option>");
    }
    const htmlString = partialString.join("");
    return htmlString;
}

function addLocalizedMessage() {
    const captionElement = document.querySelector("caption");
    captionElement.textContent = chrome.i18n.getMessage("caption");

    const buttonList = document.querySelectorAll('button[id$=_Btn][data-origin="static"]');
    const buttonArray = Array.from(buttonList);
    buttonArray[0].textContent = chrome.i18n.getMessage("buttonName1");
    buttonArray[1].textContent = chrome.i18n.getMessage("buttonName2");
    buttonArray[2].textContent = chrome.i18n.getMessage("buttonName3");

    const buttonDescriptionList = document.querySelectorAll(
        'td[id^=buttonDescription][data-origin="static"]');
    const buttonDescriptionArray = Array.from(buttonDescriptionList);
    buttonDescriptionArray[0].textContent = chrome.i18n.getMessage(
        "buttonDescription1");
    buttonDescriptionArray[1].textContent = chrome.i18n.getMessage(
        "buttonDescription2");
    buttonDescriptionArray[2].textContent = chrome.i18n.getMessage(
        "buttonDescription3");

    const legendList = document.querySelectorAll(
        'legend[id$="-legend"][data-origin="static"]');
    const legendArray = Array.from(legendList);
    legendArray[0].textContent = chrome.i18n.getMessage("localization_Project");
    legendArray[1].textContent = chrome.i18n.getMessage("localization_FileExtension");

    const labelList = document.querySelectorAll('label[id$="-label"][data-origin="static"]');
    const labelArray = Array.from(labelList);

    console.log("labelArray[0]: " + labelArray[0].textContent);
    console.log("labelArray[1]: " + labelArray[1].textContent);
    console.log("labelArray[2]: " + labelArray[2].textContent);

    labelArray[0].firstChild.nodeValue = "[" +
    chrome.i18n.getMessage("localization_All");
    labelArray[1].firstChild.nodeValue = "[" +
    chrome.i18n.getMessage("localization_All");
    /* labelArray[2].textContent = labelArray[2].textContent.replace(
        "__MSG_comboboxDescription__", chrome.i18n.getMessage("comboboxDescription"));
        */
    labelArray[2].textContent = chrome.i18n.getMessage("comboboxDescription");
}

async function onDOMLoaded() {
    addProjectCheckbox();
    addExtensionCheckbox();
    addProjectExtensionDependency();
    addLocalizedMessage();
    await updateBackupList();
}

// ===== Initialize =====
document.addEventListener("DOMContentLoaded", onDOMLoaded);

backupAllButtonElement.addEventListener("click", async () => {
    // To Do: read all local storage data(key:value pairs)
    // and save to extension storage
    console.log("[Debug] send message (backup, all): popup.js");

    const response = await chrome.runtime.sendMessage({
        action: "backup",
        option: { project: optionAllProject, extension: optionAllExtension }
    });
    console.log("[Debug] checking response: " + response + " : popup.js");

    chrome.notifications.create({
        iconUrl: "Extension128.png",
        title: chrome.i18n.getMessage("notificationTitle1"),
        message: chrome.i18n.getMessage("notificationResultHeading1") + response.status +
        "\n" + chrome.i18n.getMessage("notificationResultHeading2") + response.message,
        type: "basic"
    });
    if (response.status === "ok") {
        await updateBackupList();
    }
});

/**
 *
 */
backupSelectionButtonElement.addEventListener("click", async () => {
    // vvvvv Remove on Release!!! vvvvv
    console.log("[Debug] send message (backup, selection): popup.js");
    // ^^^^^ Remove on Release!!! ^^^^^

    const options = collectOptions();

    if (options.project * options.extension === 0) {
        chrome.notifications.create({
            iconUrl: "Extension128.png",
            title: chrome.i18n.getMessage("refuseTitle"),
            message: chrome.i18n.getMessage("refuseDetail"),
            type: "basic"
        });
        return;
    }

    const response = await chrome.runtime.sendMessage({action: "backup", option: options });

    // vvvvv Remove on Release!!! vvvvv
    console.log("[Debug] checking response: " + response + " : popup.js");
    // ^^^^^ Remove on Release ^^^^^

    chrome.notifications.create({
        iconUrl: "Extension128.png",
        title: chrome.i18n.getMessage("notificationTitle2"),
        message: chrome.i18n.getMessage("notificationResultHeading1") + response.status + "\n" + chrome.i18n.getMessage("notificationResultHeading2") + response.message,
        type: "basic"
    });
    if (response.status === "ok") {
        await updateBackupList();
    }
});

/**
 * 불러오기 버튼 클릭 시 서비스 워커에 선택한 백업파일 정보와 함께 불러오기 기능 요청하는 콜백 추가.
 */
loadButtonElement.addEventListener("click", () => {
        const choice = backupCombobox.value;
        if (choice != "") {
            (async () => {
                const response = await chrome.runtime.sendMessage({ action: "load to browser", backupName: choice });
                chrome.notifications.create({
                    iconUrl: "Extension128.png",
                    title: chrome.i18n.getMessage("notificationTitle3"),
                    message: chrome.i18n.getMessage("notificationResultHeading1") + response.status,
                    type: "basic"
                });
            })();
        }
        else {
            console.warn("[Warning] Try loading without any selected data.");
        }
        return true;
});

/**
 * 서비스 워커로부터 백업 데이터의 업데이트 메시지를 받아서 처리하는 콜백 함수를 리스너로 추가.
 */
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
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

