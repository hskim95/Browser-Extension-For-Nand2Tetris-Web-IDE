// ===== Preset =====
const ExtensionDecoder = Object.freeze({
    [1 << 0]: ".hdl",
    [1 << 1]: ".asm",
    [1 << 2]: ".hack",
    [1 << 3]: ".vm",
    [1 << 4]: ".cmp",
    [1 << 5]: ".tst"
});

// ===== Function =====

function decodeProjectBit(bit) {
    const projectSize = 8;
    const rootDirectory = "/projects/";
    const selectedDirectory = [];
    for (let i = 0; i < projectSize; i++) {
        const fixedIndex = i;
        const selectionBit = 1 << i;
        if (bit & selectionBit) {
            selectedDirectory.push(rootDirectory +
            String(fixedIndex + 1).padStart(2, "0") + "/");
        }
    }
    return selectedDirectory;
}

function decodeExtensionBit(bit) {
    const selectedExtension = [];
    for (const selectionBit of Object.keys(ExtensionDecoder)) {
        if (bit & selectionBit) {
            selectedExtension.push(ExtensionDecoder[selectionBit]);
        }
    }
    return selectedExtension;
}

function packStorageAsObject(option) {
    const data = {};
    for (let i = 0; i < localStorage.length; i++) {
        const fixedIndex = i;
        const key = localStorage.key(fixedIndex);
        if (option.project && option.extension) {
            const decodedProject = decodeProjectBit(option.project);
            const decodedExtension = decodeExtensionBit(option.extension);
            if (decodedProject.some(project => key.startsWith(project)) &&
                decodedExtension.some(extension => key.endsWith(extension))) {
                data[key] = localStorage.getItem(key);
                }
        }
    }
    return data;
}

// ===== Initialize =====
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message.action === "getData") {
        const dataPackage = packStorageAsObject(message.option);
        sendResponse(dataPackage);
        return true;
    }
    else if (message.action === "override") {
        (async () => {
            const loadedData = message.data;
            for (let [key, value] of Object.entries(loadedData)) {
                localStorage.setItem(key, value);
            }
            sendResponse({ status: "loading ok" });
        })();
        return true;
    }
    else if (message.action === "ping test") {
        sendResponse({ status: "I am alive" });
        return true;
    }
    return false;
});
