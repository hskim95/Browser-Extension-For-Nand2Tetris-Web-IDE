// background.js
const rootURL = "https://nand2tetris.github.io/web-ide/";

// chrome.tabs.onActivated.addListener(toggleIcon);

chrome.tabs.onUpdated.addListener(toggleIcon);

chrome.runtime.onMessage.addListener(
    (message, sender, sendResponse) => {
        if (message.action === "saveData") {
            chrome.storage.local.set({ backupData: message.data },
            () => {
                if (chrome.runtime.lastError) {
                    sendResponse({ status: "error", message: chrome.runtime.lastError.message });
                    return;
                }
                sendResponse({ status: "ok" });
            });
        }
    }
);

function toggleIcon(tabId, changeInfo, tab) {
    if (changeInfo.status === "complete" && tab.url) {
        if (tab.url.startsWith(rootURL)) {
            chrome.action.enable(tabId); // 클릭 시 동작 가능
            chrome.action.setBadgeText({ text: "    " });
            chrome.action.setBadgeBackgroundColor({ color: "green" });
        }
        else {
            chrome.action.disable(tabId); // 클릭 불가능. 아예 숨기는 건 보안 이슈로 불가능.
            chrome.action.setBadgeBackgroundColor({ color: "gray" });
        }
    }
}
