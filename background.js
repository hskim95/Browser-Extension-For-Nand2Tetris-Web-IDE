// ===== Preset =====
const rootURL = "https://nand2tetris.github.io/web-ide/";
const cachedBackup = { _empty: true };

const BackupNamingRule = Object.freeze({
    commonHeading: "backup_",
    option1: "all",
    option2: "selected"
})
const backupName1 = BackupNamingRule.commonHeading + BackupNamingRule.option1;
const backupName2 = BackupNamingRule.commonHeading + BackupNamingRule.option2;

// ===== Property =====
const isNotCached = () => cachedBackup.hasOwnProperty("_empty");

// ===== Function =====
/**
 * 확장앱의 로컬 저장소 데이터를 백그라운드에서 미리 캐시해두는 함수
 *
 * @async
 * @returns {Promise<boolean>} 정상적으로 캐시한 뒤 참을 출력
 *
 */
async function cacheData() {
    const getLocalStorage = await chrome.storage.local.get(null);
    const entriesArray = Object.entries(getLocalStorage);
    if (isNotCached()) delete cachedBackup["_empty"];
    for (let i = 0; i < entriesArray.length; i++) {
        const fixedIndex = i;
        cachedBackup[entriesArray[fixedIndex][0]] = entriesArray[fixedIndex][1];
    }
    return true;
}

// ----- UI -----
/**
 * 탭의 확장앱 아이콘 배지를 호스트 권한 유무에 따라 변경
 *
 * @async
 * @param {number} tabId
 * @param {boolean} isAllowed
 * @returns {Promise<boolean>}
 *
 */
async function updateTabIcon(tabId, isAllowed) {
    const targetTab = await chrome.tabs.get(tabId);
    const isON = arguments.length === 2 ? isAllowed : (targetTab?.url);
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

/**
 * 여러 탭의 확장앱 아이콘 상태를 동시에 변경하는 함수
 *
 * @async
 * @param {chrome.tabs.Tab[]} tabs
 * @returns {Promise<PromiseSettledResult<boolean>[]>}
 *
 */
async function updateTabsIcon(tabs) {
    const tasks = tabs.map(async (tab) => await updateTabIcon(tab.id));
    return Promise.allSettled(tasks);
}

/**
 * 팝업창에 데이터 변경을 알리고 백업리스트를 갱신하도록 요청
 * 팝업창이 작업을 완료할 때까지 대기함
 * 메시지 전송 후 결과와 관계없이 참을 반환
 *
 * @async
 * @returns {Promise<boolean>}
 */
async function notifyUpdate() {
    const keyList = Object.keys(cachedBackup);
    try {
        const response = await chrome.runtime.sendMessage({ action: "update", message: keyList });
    } catch (error) {
    } finally {
        return true;
    }
}

/**
 * 콘텐츠 스크립트가 없어서 메시지 전송이 실패하는 상황을 방지하는 함수
 *
 * @async
 * @param {number} tabId
 * @returns {Promise<boolean>} 스크립트가 존재하거나 주입에 성공하면 참을 반환
 *
 */
async function ensureContentScriptAlive(tabId) {
    try {
        await chrome.tabs.sendMessage(tabId, { action: "ping test" });
        return true;
    } catch (error) {
        if (error.message.includes("establish connection")) {
            try {
                return await chrome.scripting.executeScript({
                    target: { tabId },
                    files: ["content.js"]
                });
            } catch (error) {
                return false;
            }
        }
        console.error("error.");
        return false;
    }
}

// ===== Initialize =====
const cachingTask = new Promise((resolve, reject) => {
    const result = cacheData();
    if (result) {
        resolve(true);
    }
    else {
        reject(false);
    }
});

// 앱이 리로드 된 경우 열린 탭 순회하연서 아이콘 최신화
chrome.runtime.onInstalled.addListener((_details) => {
    (async () => {
        await cacheData();

        const currentTabs = await chrome.tabs.query({ });
        if (currentTabs.length) {
            await updateTabsIcon(currentTabs);
        }
    })();
});

// browser
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.status === "complete") {
        (async () => await updateTabIcon(tabId, Boolean(tab.url)))();
    }
});

/**
 * 메시지 액션은 "backup", "load backuplist", "load to browser"의 세 가지가 있음.
 * "backup"은 팝업창에서 사용자가 백업 기능이 있는 버튼을 눌렀을 때 실행
 * "load backuplist"는 팝업 활성화 직후에 확장앱 저장소에 있는 값을 키 배열 형태로 가져오기 위해 사용자 행동과 관계없이 알아서 수행
 * "load to browser"는 불러오기 버튼을 눌렀을 때 사용자가 선택한 키 값으로 저장소에 있는 백업을 브라우저의 도메인 로컬 저장소에 불러오는(덮어씌우는) 요청
 */
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message.action === "backup") {
        (async () => {
            const tab = await chrome.tabs.query({ url: rootURL + "*", active: true });
            // To Do: distinguish current tab? is it necessary?
            // when using multi-tabs, which data will be chosen?
            const tabId = tab[0].id;

            await ensureContentScriptAlive(tabId);
            const responseData = await chrome.tabs.sendMessage(
                tabId,
                { action: "getData", option: message.option }, // message
                { frameId : 0 } // main frame only
            );
            let backupNameHead;
            if (message.option.project === ((1<<8) - 1) &&
                message.option.extension === ((1<<6) - 1)) {
                backupNameHead = backupName1;
            }
            else backupNameHead = backupName2;
            Object.freeze(backupNameHead);
            const date = new Date();
            const backupName = [backupNameHead, date.getFullYear(), date.getMonth()+1, date.getDate()].join("-");
            let occupiedKeys = await chrome.storage.local.getKeys();
            let trivialName = backupName;
            for (let i = 0; i < 1000; i++) {
                let j = 0;
                for (; j < occupiedKeys.length; j++) {
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
                sendResponse({ status: "error", message: chrome.runtime.lastError.message });
            }
            else {
                cachedBackup[[trivialName]] = responseData;
                sendResponse({ status: "ok" , message: trivialName });
                await notifyUpdate();
            }
        })();
    }
    else if (message.action === "load backuplist") {
        (async () => {
            try {
                const keyList = Object.keys(cachedBackup).filter((key) => key.startsWith(BackupNamingRule.commonHeading));
                if (keyList.length !== 0) {
                    sendResponse({ status: "ok", message : keyList });
                }
                else {
                    sendResponse({ status: "no Backup", message : keyList });
                }
            }
            catch (error) {
                sendResponse({ status: "error" });
            }
        })();
    }
    else if (message.action === "load to browser") {
        const backupName = message.backupName;
        (async () => {
            try {
                const load = chrome.storage.local.get(backupName);
                const getTab = chrome.tabs.query({ url: rootURL + "*", active : true });

                const [{[backupName] : loaded}, tab] = await Promise.all([load, getTab]);
                const tabId = tab[0].id;

                await ensureContentScriptAlive(tabId);
                const response = await chrome.tabs.sendMessage(
                    tabId,
                    { action: "override", data: loaded }, // message
                    { frameId : 0 } // main frame only
                );
                sendResponse({ status: response });
                return true;
            }
            catch (error) {
                console.error("error.");
            }
        })();
    }
    else return false;
    return true; // if passed condition, return true
});

/**
 * 사용자가 직접 저장소에 접근해서 백업 데이터를 수정한 경우 변경 사항을 즉각 업데이트 하는 용도의 콜백 함수 등록
 */
chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName === "local") {
        (async () => {
            for (const [key, { oldValue, newValue }] of Object.entries(changes)) {
                if (key.startsWith(BackupNamingRule.commonHeading)) {
                    if (newValue) {
                        cachedBackup[key] = newValue;
                    }
                    else {
                        delete cachedBackup[key.toString()];
                    }
                }
            }
            await notifyUpdate();
        })();
        return true;
    }
    return;
});

