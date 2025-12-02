// background.js
const rootURL = "https://nand2tetris.github.io/web-ide/";

if (chrome?.action) {
    console.log("[DEBUG] chrome.action found: background.js");
} else {
    console.error("[DEBUG] chrome.action missing: background.js");
}

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
    (message, _sender, sendResponse) => {
        console.log("[Debug] chrome.runtime.onMessage Event: background.js");
        if (message.action === "backup") {
            console.log("[Debug] get messaage (backup): background.js");
            (async () => {
                const tab = await chrome.tabs.query({ active: true, currentWindow: true });
                console.log("[Debug] chrome.tabs.query result: " + tab + ": background.js");
                const tabId = tab[0].id;

                console.log("[Debug] send message (getData): background.js");
                const responseData = await chrome.tabs.sendMessage( // ask content.js about localStorage data
                    tabId,
                    { action: "getData", option: message.option }, // message
                    { frameId : 0 } // main frame only
                );
                chrome.storage.local.set({ backupData: responseData });
                if (chrome.runtime.lastError) {
                    console.error("[Debug] send Response (backup error): background.js");
                    sendResponse({ status: "error", message: chrome.runtime.lastError.message });
                }
                else {
                    console.log("[Debug] send Response (backup ok): background.js");
                    sendResponse({ status: "ok" , message: chrome.storage.local.get(["backupData"])});
                    console.log("[Debug] backupData: " + chrome.storage.local.get(["backupData"]));
                }
            })();
            return true;
        }
        else return false;
});
