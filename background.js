// background.js
/// <reference path="/usr/lib/node_modules/chrome-types/index.d.ts" />

const rootURL = "https://nand2tetris.github.io/web-ide/";
const cachedBackup = { _empty: true };

const isNotCached = () => cachedBackup.hasOwnProperty("_empty");

// 앱이 리로드 된 경우 열린 탭 순회하연서 아이콘 최신화
chrome.runtime.onInstalled.addListener((_details) => {
    console.log("[Debug] install or update detected(" + _details.reason.toString() + "): background.js");
    (async () => {
        await cacheData();

        const currentTabs = await chrome.tabs.query({ });
        if (!currentTabs.length) {
            console.log("[Debug] found no active tabs: background.js");
        }
        else
        {
            console.log("found valid domain tabs: " + currentTabs.toString() + ": background.js");
            await updateTabsIcon(currentTabs);
        }
    })();
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.status === "complete") {
        (async () => await updateTabIcon(tabId))();
    }
});

async function cacheData() {
    const getLocalStorage = await chrome.storage.local.get(null);
    const entriesArray = Object.entries(getLocalStorage);
    if (isNotCached) delete cachedBackup._empty;
    for (let i = 0; i < entriesArray.length; i++) {
        cachedBackup[entriesArray[i][0]] = entriesArray[i][1];
    }
}

// change in parallel-processing manner
async function updateTabsIcon(tabs) {
    //** @type {Array} */
    const tasks = tabs.map(async (tab) => await updateTabIcon(tab.id));
    return Promise.allSettled(tasks);
}

async function updateTabIcon(tabId) {
    const targetTab = await chrome.tabs.get(tabId);
    const isON = Boolean(targetTab?.url);
    if (isON) {
        chrome.action.enable(tabId); // 버튼 활성화
        chrome.action.setBadgeBackgroundColor({ tabId: tabId, color: "green" });
        chrome.action.setBadgeText({ tabId: tabId, text: "ON" });
    }
    else {
        chrome.action.disable(tabId); // 클릭 불가능. 아예 숨기는 건 보안 이슈로 불가.
        chrome.action.setBadgeBackgroundColor({ color: "red" });
        chrome.action.setBadgeText({ text: "OFF" });
    }
    return true;
}

async function ensureContentScriptAlive(tabId) {
    try {
        await chrome.tabs.sendMessage(tabId, { action: "ping test" });
        return true;
    } catch (error) {
        if (error.message.includes("establish connection")) {
            console.log("content.js not found. try inject to target tab.");
            try {
                return await chrome.scripting.executeScript({
                    target: { tabId },
                    files: ["content.js"]
                });
            } catch (error) {
                Console.error("Something went wrong during manual injection: background.js");
                return false;
            }
        }
        console.error(error);
        return false;
    }
}



chrome.runtime.onMessage.addListener(
    (message, _sender, sendResponse) => {
        console.log("[Debug] chrome.runtime.onMessage Event: background.js");
        if (message.action === "backup") {
            console.log("[Debug] get messaage (backup): background.js");
            (async () => {
                const tab = await chrome.tabs.query({ url: rootURL + "*", active: true });
                console.log("[Debug] chrome.tabs.query result: " + tab.toString() + ": background.js");
                const tabId = tab[0].id;

                await ensureContentScriptAlive(tabId);

                console.log("[Debug] send message (getData): background.js");
                const responseData = await chrome.tabs.sendMessage( // ask content.js about localStorage data
                    tabId,
                    { action: "getData", option: message.option }, // message
                    { frameId : 0 } // main frame only
                );
                const date = new Date();
                const backupName = ["backupData", date.getFullYear(), date.getMonth()+1, date.getDate()].join("-");
                let occupiedKeys = await chrome.storage.local.getKeys();
                let trivialName = backupName;
                for (let i = 0; i < 1000; i++) {
                    let j = 0;
                    for (j = 0; j < occupiedKeys.length; j++) {
                        if (trivialName === occupiedKeys[j]) {
                            occupiedKeys.splice(j, 1);
                            j = -1;
                            break;
                        }
                    }
                    if (j < 0) {
                        trivialName = backupName + "-" + String(i).padStart(3, "0");
                        continue;
                    }
                    else break;
                }
                chrome.storage.local.set({ [trivialName]: responseData });
                if (chrome.runtime.lastError) {
                    console.error("[Debug] send Response (backup error): background.js");
                    sendResponse({ status: "error", message: chrome.runtime.lastError.message });
                }
                else {
                    console.log("[Debug] send Response (backup ok): background.js");
                    sendResponse({ status: "ok" , message: chrome.storage.local.get([trivialName])});
                    console.log("[Debug] backupData: " + chrome.storage.local.get([trivialName]));

                    notifyUpdate();
                }
            })();
        }
        else if (message.action === "load backuplist") {
            console.log("[Debug] get messaage (load backuplist): background.js");
            (async () => {
                try {
                    if (isNotCached) await cacheData();
                    const keyList = Object.keys(cachedBackup).filter((key) => key.startsWith("backupData"));
                    if (keyList.length !== 0) {
                        sendResponse({ status: "ok", message : keyList });
                    }
                    else {
                        sendResponse({ status: "no Backup", message : keyList });
                    }
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
                    const getTab = chrome.tabs.query({ url: rootURL + "*", active : true });

                    const [{[backupName] : loaded}, tab] = await Promise.all([load, getTab]);
                    console.log("[Debug] chrome.storage.local.get result: " + loaded + ": background.js");

                    console.log("[Debug] chrome.tabs.query result: " + tab + ": background.js");
                    const tabId = tab[0].id;

                    await ensureContentScriptAlive(tabId);
                    console.log("[Debug] send message (getData): background.js");
                    const response = await chrome.tabs.sendMessage(
                        tabId,
                        { action: "override", data: loaded }, // message
                        { frameId : 0 } // main frame only
                    );
                    sendResponse({ status: response });
                    return true;
                }
                catch(e) {
                    console.error(e);
                }
            })();
        }
        else return false;
        return true; // if passed condition, return true
});

chrome.storage.onChanged.addListener((changes, areaName) => {
    console.log("somethings changed: background.js");
    if (areaName === "local") {
        (async () => {
            for (const [key, { oldValue, newValue }] of Object.entries(changes)) {
                if (key.startsWith("backupData")) {
                    if (newValue) {
                        if (oldValue) {
                            console.log("Overriding old data: background.js");
                        }
                        else {
                            console.log("New key generated: background.js");
                        }
                        console.log("New backup: " + newValue.toString());
                        cachedBackup[key] = newValue;
                    }
                    else {
                        console.log("removed data: background.js");
                        delete cachedBackup[key.toString()];
                    }
                }
            }
            await notifyUpdate();
        })();
        return true;
    }
});

async function notifyUpdate() {
    const keyList = Object.keys(cachedBackup);
    try {
        const response = await chrome.runtime.sendMessage({ action: "update", message: keyList });
        if (response) {
            console.log("Popup updated backuplist: " + response.status + ": background.js");
        }
        else {
            console.log("Popup not responding. Maybe popup is closed.: background.js");
        }
    } catch (error) {
        console.log("Popup not responding. Maybe popup is closed.: background.js");
    }
    return true;
}

