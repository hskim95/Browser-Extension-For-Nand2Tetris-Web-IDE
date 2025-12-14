// ===== Preset =====
const ProjectNumber = Object.freeze({
    PROJECT_MIN: 1,
    PROJECT_MAX: 8
});
const projectSize = ProjectNumber.PROJECT_MAX - ProjectNumber.PROJECT_MIN + 1;

class ProjectMediator {
    constructor() {
        this.stateArray = new Array(projectSize).fill(false);
    }

    isAllChecked = () => this.stateArray.every((state) => state);

    getState(index = null) {
        if (index === null) {
            return this.stateArray.slice();
        }
        else return this.stateArray.slice()[index];
    }

    setState(value, index = null) {
        if (index === null) {
            for (let i = 0; i < this.stateArray.length; i++) {
                this.stateArray[i] = value;
                this.#updateState(i);
            }
            this.#updateState();
        }
        else {
            this.stateArray[index] = value;
            this.#updateState(index);
            this.#updateState();
        }
    }

    #updateState(index = null) {
        if (index === null) checkAllProjects.checked = this.isAllChecked();
        else unitProjectList[index].checked = this.stateArray[index];
        dependencyMediator.updateDependency();
    }
}

const projectMediator = Object.freeze(new ProjectMediator());


const FileExtensions = Object.freeze([
    ".hdl",
    ".asm",
    ".hack",
    ".vm",
    ".cmp",
    ".tst"
]);

class ExtensionMediator {
    constructor() {
        this.stateArray = new Array(FileExtensions.length).fill(false);
    }

    isAllChecked = () => this.stateArray.every((state) => state);

    getState(index = null) {
        if (index === null) {
            return this.stateArray.slice();
        }
        else return this.stateArray.slice()[index];
    }

    setState(value, index = null) {
        if (index === null) {
            for (let i = 0; i < this.stateArray.length; i++) {
                this.stateArray[i] = value;
            }
        }
        else this.stateArray[index] = value;
        this.#updateState();
    }

    #updateState() {
        for (let i = 0; i < this.stateArray.length; i++) {
            unitExtensionList[i].checked = this.stateArray[i];
        }
        checkAllExtensions.checked = this.isAllChecked();
    }
}

const extensionMediator = Object.freeze(new ExtensionMediator());

// Dependency from Project number to File extensions
// e.g. 1,2,3 -> .hdl(=FE[0])
//          5 -> .hdl, .hack (=FE[0], FE[2])
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

class DependencyMediator {
    updateDependency() {
        let referenceBit = collectOptions().project;
        const dependencySet = new Set();
        for (let i = 0; i < unitProjectList.length; i++) {
            const projectNumber = i + 1;
            if (referenceBit & 1) {
                DependencyTable[projectNumber].forEach(value =>
                dependencySet.add(value));
            }
            referenceBit >>>= 1;
            if (referenceBit === 0) break;
        }
        for (let i = 0; i < unitExtensionList.length - 2; i++) {
            const fixedIndex = i;
            unitExtensionList[fixedIndex].disabled = !dependencySet.has(fixedIndex);
        }
    }
}

const dependencyMediator = Object.freeze(new DependencyMediator());

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
    const response = await chrome.runtime.sendMessage({action: "load backuplist"});
    if (response.status === "error") {
        return false;
    }
    else {
        if (updateFlag) {
            return true;
        }
        else {
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
        projectMediator.setState(checkAllProjects.checked);
    })
    unitProjectList.forEach((checkbox, index) => {
        checkbox.addEventListener("change", () => {
            projectMediator.setState(checkbox.checked, index);
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
        extensionMediator.setState(checkAllExtensions.checked);
    });
    unitExtensionList.forEach((checkbox, index) => {
        checkbox.addEventListener("change", () => {
            extensionMediator.setState(checkbox.checked, index);
        });
    });
}

function collectOptions() {
    let projectOptionBit = 0;
    for (let i = 0; i < projectSize; i++) {
        const fixedIndex = i;
        projectOptionBit |= (unitProjectList[fixedIndex].checked << fixedIndex);
    }

    let extensionOptionBit = 0;
    for (let i = 0; i < FileExtensions.length; i++) {
        const fixedIndex = i;
        extensionOptionBit |=
        (unitExtensionList[fixedIndex].checked &&
        !unitExtensionList[fixedIndex].disabled << fixedIndex);
    }

    return { project: projectOptionBit, extension: extensionOptionBit };
}

function injectDocumentFragment(htmlString, parent) {
    const template = document.createElement("template");
    template.innerHTML = htmlString;
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

    labelArray[0].firstChild.nodeValue = "[" +
    chrome.i18n.getMessage("localization_All");
    labelArray[1].firstChild.nodeValue = "[" +
    chrome.i18n.getMessage("localization_All");
    labelArray[2].textContent = chrome.i18n.getMessage("comboboxDescription");
}

async function onDOMLoaded() {
    addProjectCheckbox();
    addExtensionCheckbox();
    dependencyMediator.updateDependency();
    addLocalizedMessage();
    await updateBackupList();
}

// ===== Initialize =====
document.addEventListener("DOMContentLoaded", onDOMLoaded);

backupAllButtonElement.addEventListener("click", async () => {
    const response = await chrome.runtime.sendMessage({
        action: "backup",
        option: { project: optionAllProject, extension: optionAllExtension }
    });

    chrome.notifications.create({
        iconUrl: "icons/Extension128.png",
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
    const options = collectOptions();

    if (options.project * options.extension === 0) {
        chrome.notifications.create({
            iconUrl: "icons/Extension128.png",
            title: chrome.i18n.getMessage("refuseTitle"),
            message: chrome.i18n.getMessage("refuseDetail"),
            type: "basic"
        });
        return;
    }

    const response = await chrome.runtime.sendMessage({action: "backup", option: options });

    chrome.notifications.create({
        iconUrl: "icons/Extension128.png",
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
    if (choice !== "") {
        (async () => {
            const response = await chrome.runtime.sendMessage({ action: "load to browser", backupName: choice });
            chrome.notifications.create({
                iconUrl: "icons/Extension128.png",
                title: chrome.i18n.getMessage("notificationTitle3"),
                message: chrome.i18n.getMessage("notificationResultHeading1") + response.status,
                type: "basic"
            });
        })();
    }
    else {
        console.warn("[Warning] Try loading without any selected data!");
    }
    return true;
});

/**
 * 서비스 워커로부터 백업 데이터의 업데이트 메시지를 받아서 처리하는 콜백 함수를 리스너로 추가.
 */
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message.action === "update") {
        if (updateFlag) {
            sendResponse({ status: "busy" });
        }
        else {
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

