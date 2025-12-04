// background.js
/// <reference path="/usr/lib/node_modules/chrome-types/index.d.ts" />

const rootURL = "https://nand2tetris.github.io/web-ide/";

if (chrome?.action) {
    console.log("[DEBUG] chrome.action found: background.js");
} else {
    console.error("[DEBUG] chrome.action missing: background.js");
}

// to do: 리로드 발생 시 이미 사이트 접속 상태면 바로 활성화하도록 수정
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

let cachedKeys = null;

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
        }
        else if (message.action === "load backuplist") {
            console.log("[Debug] get messaage (load backuplist): background.js");
            (async () => {
                try {
                    if (!cachedKeys) { // no cached Data exist
                        const allKeys = await chrome.storage.local.getKeys();
                        if (allKeys.length === 0) {
                            cachedKeys = allKeys;
                            sendResponse({ status: "no Backup" });
                        }
                        else {
                            cachedKeys = allKeys.filter(key => key.startsWith("backupData"));
                        }
                    }
                    const response = cachedKeys.length === 0 ?
                    { status: "no Backup" } :
                    { status: "found Backup", message: cachedKeys };
                    sendResponse(response);
                }
                catch (e) {
                    console.error("catch error(load): background.js");
                    sendResponse({ status: "error" });
                }
            })();
        }
        else if (message.action === "load to browser") {
            console.log("[Debug] get messaage (load to browser): background.js");
            const backupName = message.backupName;
            (async () => {
                try {
                    const load = chrome.storage.local.get(backupName);
                    const getTab = chrome.tabs.query({ active: true, currentWindow: true });

                    const [{[backupName] : loaded}, tab] = await Promise.all([load, getTab]);
                    console.log("[Debug] chrome.storage.local.get result: " + loaded + ": background.js");

                    console.log("[Debug] chrome.tabs.query result: " + tab + ": background.js");
                    const tabId = tab[0].id;

                    console.log("[Debug] send message (getData): background.js");
                    const response = await chrome.tabs.sendMessage(
                        tabId,
                        { action: "override", data: loaded }, // message
                        { frameId : 0 } // main frame only
                    );
                    sendResponse({ status: response });
                }
                catch(e) {
                    console.error(e);
                }
            })();
        }
        else return false;
        return true; // if passed condition, return true
});

chrome.storage.local.onChanged.addListener((_changes) => {
    (async () => {
        cachedKeys = await storage.local.getKeys();
        const response = await chrome.runtime.sendMessage({ action: "update", message: cachedKeys});
        if (response) {
            console.log("Popup refreshed backuplist: " + response + ": background.js");
        }
        else {
            console.log("popup not responding. Maybe popup is closed.: background.js");
        }
        return true;
    })();
})
