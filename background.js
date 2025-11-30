// background.js
const rootURL = "https://nand2tetris.github.io/web-ide/";

chrome.action.disable(); // 클릭 불가능.
chrome.action.setBadgeText({ text: "OFF" });
chrome.action.setBadgeBackgroundColor({ color: "red" });

chrome.webNavigation.onCompleted.addListener(toggleIcon); // permission: webNav.

function toggleIcon(details) {
    if (details.frameId === 0) {
        changeIcon(details.tabId, details.url.startsWith(rootURL));
    }
}

function changeIcon(tabId, isON) {
    if (isON) {
        chrome.action.enable(tabId); // 버튼 활성화
        chrome.action.setBadgeText({ tabId: tabId, text: "ON" });
        chrome.action.setBadgeBackgroundColor({ tabId: tabId, color: "green" });
    }
    else {
        chrome.action.disable(tabId); // 클릭 불가능. 아예 숨기는 건 보안 이슈로 불가.
        chrome.action.setBadgeText({ text: "OFF" });
        chrome.action.setBadgeBackgroundColor({ color: "red" });
    }
}

chrome.runtime.onMessage.addListener(
    (message, sender, sendResponse) => {
        const [tab] = chrome.tabs.query({ active: true, currentWindow: true });
        const tabId = tab.id;
        if (message.action === "backup") {
            chrome.tabs.sendMessage( // ask content.js about localStorage data
                tabId,
                { action: "getData", option: message.option }, // message
                { frameId : 0 }, // main frame only
                (response) => {
                    chrome.storage.local.set({ backupData: response.data },
                        () => {
                            if (chrome.runtime.lastError) {
                                sendResponse({ status: "error",
                                message: chrome.runtime.lastError.message });
                                return;
                            }
                            sendResponse({ status: "ok" });
                    });
            });
        }
});
